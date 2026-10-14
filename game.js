/* Игровая логика: сохранение, бой, инвентарь, карта и Telegram Mini App. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const STORAGE="ash_kingdom_rpg_v1";
  const races={
    human:{name:"Человек",hp:100,mp:30,str:12,def:4,desc:"Человек: универсальный герой, готовый к любым испытаниям."},
    elf:{name:"Эльф",hp:90,mp:38,str:10,def:3,desc:"Эльф: больше маны и сильная магия, но меньше здоровья."},
    dwarf:{name:"Гном",hp:115,mp:25,str:11,def:7,desc:"Гном: крепкий воин с повышенным запасом здоровья и защитой."},
    orc:{name:"Орк",hp:105,mp:26,str:16,def:3,desc:"Орк: наносит больше физического урона, но полагается на силу."}
  };
  const locations={
    forest:{name:"Забытый лес",desc:"Среди древних деревьев скрываются тайны.",level:1},
    village:{name:"Серая деревня",desc:"Торговцы готовы обменять находки на золото.",level:1},
    cave:{name:"Шепчущая пещера",desc:"В темноте слышен звон древних жил.",level:2},
    castle:{name:"Чёрный замок",desc:"За стенами дремлет сила старого королевства.",level:3}
  };
  const itemDefs={
    potion:{name:"Малое зелье",type:"consumable",desc:"Восстанавливает 35 здоровья.",value:12,heal:35},
    ether:{name:"Эфир маны",type:"consumable",desc:"Восстанавливает 18 маны.",value:15,mana:18},
    ironSword:{name:"Железный меч",type:"weapon",slot:"weapon",desc:"+5 к силе атаки.",value:35,str:5},
    leatherArmor:{name:"Кожаный доспех",type:"armor",slot:"armor",desc:"+3 к защите.",value:30,def:3},
    ironHelmet:{name:"Железный шлем",type:"helmet",slot:"helmet",desc:"+2 к защите.",value:25,def:2},
    moonAmulet:{name:"Лунный амулет",type:"amulet",slot:"amulet",desc:"+8 к максимальной мане.",value:40,mp:8}
  };
  const clone=o=>JSON.parse(JSON.stringify(o));
  const baseState=()=>({
    created:false,name:"Эдран",race:"human",level:1,xp:0,gold:25,hp:100,maxHp:100,mp:30,maxMp:30,energy:100,
    baseStr:12,baseDef:4,location:"forest",inventory:["potion","potion","potion","ironSword","leatherArmor"],equipment:{helmet:null,armor:null,weapon:null,amulet:null},
    battle:null,stats:{kills:0,deaths:0,escapes:0,itemsFound:0,travels:0,damageDealt:0,damageTaken:0},settings:{sound:true,music:false,haptic:true},worldLog:["Ты вступил на тропу приключений."]
  });
  let state=loadState()||baseState(),selectedRace="human",selectedDestination=null,confirmAction=null,toastTimer=null,turnBusy=false;
  window.RPGState=state;window.RPGSelectedLocation=null;

  function loadState(){try{const raw=localStorage.getItem(STORAGE);if(!raw)return null;const s=JSON.parse(raw);return s&&s.settings&&s.stats?s:null;}catch(e){return null;}}
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(e){}}
  function haptic(kind="light"){if(!state.settings.haptic)return;try{const t=window.Telegram?.WebApp;if(t?.HapticFeedback){if(kind==="heavy")t.HapticFeedback.impactOccurred("heavy");else if(kind==="success")t.HapticFeedback.notificationOccurred("success");else if(kind==="error")t.HapticFeedback.notificationOccurred("error");else t.HapticFeedback.impactOccurred("light");}}catch(e){}}
  function sound(name="click"){window.AudioEngine?.play(name);}
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2100);}
  function logWorld(msg,kind=""){state.worldLog.unshift({msg,kind});state.worldLog=state.worldLog.slice(0,5);renderWorldLog();save();}
  function renderWorldLog(){const el=$("worldLog");el.innerHTML="";state.worldLog.forEach(entry=>{const div=document.createElement("div");div.className="log-entry "+(typeof entry==="string"?"":entry.kind||"");div.textContent=typeof entry==="string"?entry:entry.msg;el.append(div);});}
  function combatLog(msg,kind="muted"){const el=$("combatLog"),div=document.createElement("div");div.className=kind;div.textContent=msg;el.prepend(div);while(el.children.length>12)el.lastChild.remove();}
  function showFloat(msg,kind="damage"){const wrap=$("combatNumbers"),el=document.createElement("span");el.className="float-number "+kind;el.textContent=msg;el.style.left=(35+Math.random()*30)+"%";el.style.top=(25+Math.random()*20)+"%";wrap.append(el);setTimeout(()=>el.remove(),950);}
  function transition(fn){const el=$("transition");el.classList.add("active");setTimeout(()=>{fn();setTimeout(()=>el.classList.remove("active"),40);},230);}
  function switchTab(tab){if(tab==="battle"&&!state.battle){toast("Сначала найди противника в мире.");haptic("error");return;}
    document.querySelectorAll(".tab-page").forEach(p=>p.classList.toggle("active",p.id==="tab-"+tab));
    document.querySelectorAll(".nav-button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
    sound("click");haptic();if(tab==="inventory")renderInventory();if(tab==="more")renderStats();
  }
  function effective(stat){let value=state[stat]||0;for(const id of Object.values(state.equipment)){if(id&&itemDefs[id])value+=itemDefs[id][stat]||0;}return value;}
  function raceStats(race){const r=races[race]||races.human;state.maxHp=r.hp;state.maxMp=r.mp;state.hp=r.hp;state.mp=r.mp;state.baseStr=r.str;state.baseDef=r.def;}
  function render(){
    window.RPGState=state;
    $("headerName").textContent=state.name;$("headerLocation").textContent=locations[state.location].name;$("levelValue").textContent=state.level;
    $("hpText").textContent=`${Math.max(0,state.hp)} / ${state.maxHp}`;$("mpText").textContent=`${state.mp} / ${state.maxMp}`;$("xpText").textContent=`${state.xp} / ${state.level*100}`;
    $("hpBar").style.width=Math.max(0,state.hp/state.maxHp*100)+"%";$("mpBar").style.width=Math.max(0,state.mp/state.maxMp*100)+"%";$("xpBar").style.width=Math.min(100,state.xp/(state.level*100)*100)+"%";
    $("goldValue").textContent=state.gold;$("energyValue").textContent=state.energy;
    $("worldLocationTitle").textContent=locations[state.location].name;$("worldLocationDescription").textContent=locations[state.location].desc;
    $("battleNav").classList.toggle("battle-ready",!!state.battle);
    $("battleLocked").classList.toggle("hidden",!!state.battle);$("battleContent").classList.toggle("hidden",!state.battle);
    if(state.battle){$("enemyName").textContent=state.battle.enemy.name;$("enemyHpText").textContent=`${Math.max(0,state.battle.enemy.hp)} / ${state.battle.enemy.maxHp}`;$("enemyHpBar").style.width=Math.max(0,state.battle.enemy.hp/state.battle.enemy.maxHp*100)+"%";$("potionCount").textContent=state.inventory.filter(id=>id==="potion").length;}
    renderWorldLog();renderInventory();renderStats();save();
  }
  function beginGame(){
    sound("start");haptic("success");
    const name=$("heroName").value.trim().slice(0,18)||"Эдран";state=baseState();state.created=true;state.name=name;state.race=selectedRace;raceStats(selectedRace);
    if(selectedRace==="elf")state.inventory.push("ether");
    window.RPGState=state;transition(()=>{$("creation").classList.add("hidden");$("gameScreen").classList.remove("hidden");render();switchTab("world");});
  }
  function enemyForLocation(){
    const level=locations[state.location].level,roll=Math.random();
    let type="bandit",name="Лесной разбойник",hp=36+level*13,str=7+level*3,xp=30+level*14,gold=9+level*6;
    if(state.location==="village"){type="beast";name="Бешеный волк";hp=30+level*10;str=8+level*2;xp=26;gold=7;}
    if(state.location==="cave"){type="beast";name="Пещерный тролль";hp=54+level*16;str=11+level*3;xp=42;gold=17;}
    if(state.location==="castle"||roll>.88){type="boss";name=state.location==="castle"?"Рыцарь Пепла":"Древний страж";hp=75+level*20;str=14+level*3;xp=65;gold=32;}
    if(roll>.65&&type==="bandit"){type="mage";name="Изгнанный колдун";hp=32+level*12;str=9+level*2;xp=38;gold=15;}
    return {type,name,hp,maxHp:hp,str,xp,gold};
  }
  function findEnemy(){if(state.battle){toast("Сражение уже идёт.");return;}if(state.energy<8){toast("Недостаточно энергии. Разбей лагерь.");return;}
    state.energy-=8;state.battle={enemy:enemyForLocation(),turn:"player",hit:false};$("combatLog").innerHTML="";$("battleResult").classList.add("hidden");$("battleActions").classList.remove("hidden");
    combatLog(`На пути появился противник: ${state.battle.enemy.name}.`,"bad");logWorld(`Ты встретил: ${state.battle.enemy.name}.`,"bad");sound("attack");haptic("heavy");render();switchTab("battle");
  }
  function playerAction(action){
    if(turnBusy||!state.battle||state.battle.turn!=="player")return;turnBusy=true;
    const b=state.battle,e=b.enemy;let damage=0;
    if(action==="attack"){damage=Math.max(1,Math.floor(effective("baseStr")*0.8+Math.random()*7));sound("attack");combatLog(`Ты наносишь ${damage} урона.`, "good");}
    else if(action==="spell"){if(state.mp<8){toast("Недостаточно маны.");turnBusy=false;return;}state.mp-=8;damage=Math.floor(15+state.level*4+Math.random()*9);sound("spell");combatLog(`Магический импульс наносит ${damage} урона.`,`magic`);showFloat("-"+damage,"magic");}
    else if(action==="potion"){const i=state.inventory.indexOf("potion");if(i<0){toast("Зелий не осталось.");turnBusy=false;return;}if(state.hp>=state.maxHp){toast("Здоровье уже полное.");turnBusy=false;return;}state.inventory.splice(i,1);const heal=Math.min(35,state.maxHp-state.hp);state.hp+=heal;sound("potion");showFloat("+"+heal,"heal");combatLog(`Зелье восстановило ${heal} здоровья.`,"good");render();turnBusy=false;enemyTurn();return;}
    else if(action==="flee"){if(Math.random()<.65){state.stats.escapes++;state.battle=null;sound("travel");haptic("success");logWorld("Ты успешно покинул сражение.");toast("Ты сбежал из боя.");render();switchTab("world");turnBusy=false;return;}combatLog("Побег не удался!","bad");sound("hit");}
    if(action==="attack")showFloat("-"+damage,"damage");
    if(action==="spell"){}else if(action!=="flee")showFloat("-"+damage,"damage");
    e.hp-=damage;state.stats.damageDealt+=damage;b.hit=true;setTimeout(()=>{b.hit=false;},250);
    if(e.hp<=0){winBattle();turnBusy=false;return;}
    render();setTimeout(()=>{enemyTurn();turnBusy=false;},450);
  }
  function enemyTurn(){if(!state.battle)return;const e=state.battle.enemy;let damage=Math.max(1,e.str-effective("baseDef")+Math.floor(Math.random()*5));state.hp=Math.max(0,state.hp-damage);state.stats.damageTaken+=damage;
    sound("hit");haptic("heavy");showFloat("-"+damage,"damage");$("battleArena").classList.remove("shake");void $("battleArena").offsetWidth;$("battleArena").classList.add("shake");combatLog(`${e.name} наносит ${damage} урона.`,"bad");
    if(state.hp<=0){state.stats.deaths++;state.hp=Math.max(1,Math.floor(state.maxHp*.35));state.gold=Math.max(0,state.gold- Math.min(10,state.gold));state.battle=null;sound("defeat");haptic("error");$("battleActions").classList.add("hidden");$("battleResult").classList.remove("hidden");$("battleResult").textContent="Поражение. Ты очнулся у лагеря с частью здоровья.";logWorld("Ты потерпел поражение и отступил к лагерю.","bad");render();return;}
    if(state.battle)state.battle.turn="player";render();
  }
  function winBattle(){const e=state.battle.enemy;state.gold+=e.gold;state.xp+=e.xp;state.stats.kills++;sound("victory");haptic("success");combatLog(`Победа! +${e.xp} опыта, +${e.gold} золота.`,"good");logWorld(`Победа над ${e.name}: +${e.gold} золота.`,"good");state.battle=null;$("battleActions").classList.add("hidden");$("battleResult").classList.remove("hidden");$("battleResult").textContent=`Победа! Получено ${e.xp} опыта и ${e.gold} золота.`;levelUp();render();setTimeout(()=>switchTab("world"),1400);}
  function levelUp(){while(state.xp>=state.level*100){state.xp-=state.level*100;state.level++;state.maxHp+=12;state.maxMp+=5;state.baseStr+=2;state.baseDef+=1;state.hp=state.maxHp;state.mp=state.maxMp;toast(`Новый уровень: ${state.level}!`);}}
  function findLoot(){if(state.battle){toast("Сначала заверши бой.");return;}if(state.energy<5){toast("Недостаточно энергии.");return;}state.energy-=5;
    const r=Math.random();if(r<.38){state.gold+=8+Math.floor(Math.random()*18);sound("loot");logWorld("Ты нашёл тайник с золотом.","gold");toast("Найдено золото!");}
    else if(r<.72){const pool=["potion","ether","ironHelmet","moonAmulet"];const id=pool[Math.floor(Math.random()*pool.length)];state.inventory.push(id);state.stats.itemsFound++;sound("loot");logWorld(`Найден предмет: ${itemDefs[id].name}.`,"good");toast(`Найдено: ${itemDefs[id].name}`);}
    else{sound("hit");logWorld("В зарослях никого нет, но ты потратил силы.");toast("Ничего не найдено.");}
    render();
  }
  function camp(){if(state.battle){toast("Нельзя разбить лагерь во время боя.");return;}sound("camp");haptic("success");const heal=Math.min(state.maxHp-state.hp,Math.ceil(state.maxHp*.35));state.hp+=heal;state.mp=Math.min(state.maxMp,state.mp+12);state.energy=Math.min(100,state.energy+35);logWorld(`Отдых у костра: +${heal} здоровья, восстановлены мана и энергия.`,"good");toast("Ты отдохнул у костра.");render();}
  function openMap(){if(state.battle){toast("Карта недоступна во время боя.");return;}selectedDestination=null;window.RPGSelectedLocation=null;renderMapOptions();$("mapModal").classList.remove("hidden");$("travelButton").disabled=true;sound("click");haptic();}
  function renderMapOptions(){const wrap=$("mapLocations");wrap.innerHTML="";Object.entries(locations).forEach(([id,l])=>{const p=window.Graphics.places.find(x=>x.id===id);const btn=document.createElement("button");btn.className="map-location"+(selectedDestination===id?" selected":"");btn.innerHTML=`<strong>${l.name}</strong><small>${id===state.location?"Текущая локация":`Энергия: ${p.cost}`}</small>`;btn.addEventListener("click",()=>{selectedDestination=id;window.RPGSelectedLocation=id;renderMapOptions();$("travelButton").disabled=id===state.location||state.energy<p.cost; $("mapHint").textContent=id===state.location?"Ты уже здесь.":state.energy<p.cost?"Недостаточно энергии для путешествия.":`Путь займёт ${p.cost} энергии.`;sound("click");haptic();});wrap.append(btn);});}
  function travel(){if(!selectedDestination||selectedDestination===state.location)return;const p=window.Graphics.places.find(x=>x.id===selectedDestination);if(state.energy<p.cost){toast("Недостаточно энергии.");return;}state.energy-=p.cost;state.location=selectedDestination;state.stats.travels++;$("mapModal").classList.add("hidden");sound("travel");haptic("success");logWorld(`Ты прибыл: ${locations[state.location].name}.`,"good");render();switchTab("world");}
  function renderInventory(){
    const grid=$("inventoryGrid");if(!grid)return;grid.innerHTML="";
    state.inventory.forEach((id,index)=>{const item=itemDefs[id];if(!item)return;const card=document.createElement("div");card.className="item-card";const title=document.createElement("strong");title.textContent=item.name;const desc=document.createElement("p");desc.textContent=item.desc;const value=document.createElement("div");value.className="item-value";value.textContent=`Цена: ${item.value} золота`;const actions=document.createElement("div");actions.className="item-actions";
      if(item.slot){const b=document.createElement("button");b.textContent="Надеть";b.addEventListener("click",()=>equip(index,id));actions.append(b);}
      if(item.type==="consumable"){const b=document.createElement("button");b.textContent="Использовать";b.addEventListener("click",()=>useItem(index,id));actions.append(b);}
      const sell=document.createElement("button");sell.textContent="Продать";sell.addEventListener("click",()=>sellItem(index,id));actions.append(sell);
      card.append(title,desc,value,actions);grid.append(card);
    });
    if(!state.inventory.length)grid.innerHTML='<p class="muted">Сумка пуста. Ищи предметы в мире.</p>';
    document.querySelectorAll(".equipment-slot").forEach(btn=>{const id=state.equipment[btn.dataset.slot];btn.querySelector("strong").textContent=id?itemDefs[id].name:"Пусто";btn.classList.toggle("equipped",!!id);});
    $("characterStats").innerHTML=`Сила: <b>${effective("baseStr")}</b><br>Защита: <b>${effective("baseDef")}</b><br>Уровень: <b>${state.level}</b>`;
  }
  function equip(index,id){const item=itemDefs[id],old=state.equipment[item.slot];state.equipment[item.slot]=id;state.inventory.splice(index,1);if(old)state.inventory.push(old);sound("loot");haptic("success");toast(`${item.name}: экипировано`);render();}
  function useItem(index,id){const item=itemDefs[id];if(item.heal){if(state.hp>=state.maxHp){toast("Здоровье уже полное.");return;}state.hp=Math.min(state.maxHp,state.hp+item.heal);}if(item.mana){if(state.mp>=state.maxMp){toast("Мана уже полная.");return;}state.mp=Math.min(state.maxMp,state.mp+item.mana);}state.inventory.splice(index,1);sound("potion");haptic("success");toast(`${item.name} использовано`);render();}
  function sellItem(index,id){const item=itemDefs[id];state.gold+=Math.max(1,Math.floor(item.value*.55));state.inventory.splice(index,1);sound("loot");haptic();toast(`${item.name} продан`);render();}
  function renderStats(){const el=$("statistics");if(!el)return;const vals=[["Уровень",state.level],["Победы",state.stats.kills],["Поражения",state.stats.deaths],["Побеги",state.stats.escapes],["Предметы найдены",state.stats.itemsFound],["Путешествия",state.stats.travels],["Урон нанесён",state.stats.damageDealt],["Урон получен",state.stats.damageTaken]];el.innerHTML="";vals.forEach(([k,v])=>{const d=document.createElement("div");d.className="stat";const s=document.createElement("span"),b=document.createElement("strong");s.textContent=k;b.textContent=v;d.append(s,b);el.append(d);});}
  function confirm(title,message,action){$("confirmTitle").textContent=title;$("confirmMessage").textContent=message;confirmAction=action;$("confirmModal").classList.remove("hidden");}
  function reset(){state=baseState();window.RPGState=state;selectedRace="human";$("confirmModal").classList.add("hidden");$("gameScreen").classList.add("hidden");$("creation").classList.remove("hidden");document.querySelectorAll(".race-card").forEach(b=>b.classList.toggle("selected",b.dataset.race==="human"));$("raceDescription").textContent=races.human.desc;save();toast("Прогресс сброшен.");}
  function initTelegram(){try{const tg=window.Telegram?.WebApp;if(!tg)return;tg.ready();tg.expand();if(tg.setHeaderColor)tg.setHeaderColor("#111016");if(tg.setBackgroundColor)tg.setBackgroundColor("#111016");if(tg.requestFullscreen)tg.requestFullscreen();}catch(e){}}
  function bind(){
    document.querySelectorAll("[data-race]").forEach(btn=>btn.addEventListener("click",()=>{selectedRace=btn.dataset.race;document.querySelectorAll(".race-card").forEach(b=>b.classList.toggle("selected",b===btn));$("raceDescription").textContent=races[selectedRace].desc;sound("click");haptic();}));
    $("startGame").addEventListener("click",()=>{if(state.created){confirm("Начать заново?","Это заменит текущий прогресс.",beginGame);return;}beginGame();});
    document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.tab)));
    $("openMap").addEventListener("click",openMap);$("findEnemy").addEventListener("click",findEnemy);$("findLoot").addEventListener("click",findLoot);$("makeCamp").addEventListener("click",camp);
    $("attackButton").addEventListener("click",()=>playerAction("attack"));$("spellButton").addEventListener("click",()=>playerAction("spell"));$("potionButton").addEventListener("click",()=>playerAction("potion"));$("fleeButton").addEventListener("click",()=>playerAction("flee"));
    $("travelButton").addEventListener("click",travel);document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).classList.add("hidden")));
    $("confirmCancel").addEventListener("click",()=>{$("confirmModal").classList.add("hidden");confirmAction=null;sound("click");});
    $("confirmAccept").addEventListener("click",()=>{const fn=confirmAction;confirmAction=null;$("confirmModal").classList.add("hidden");sound("click");if(fn)fn();});
    $("resetGame").addEventListener("click",()=>confirm("Сбросить прогресс?","Герой, предметы и статистика будут удалены.",reset));
    $("soundToggle").addEventListener("change",e=>{state.settings.sound=e.target.checked;window.AudioEngine.setEnabled(e.target.checked);save();if(e.target.checked)sound("click");});
    $("musicToggle").addEventListener("change",e=>{state.settings.music=e.target.checked;window.AudioEngine.setMusic(e.target.checked);save();sound("click");});
    $("hapticToggle").addEventListener("change",e=>{state.settings.haptic=e.target.checked;save();haptic();});
    // Любая интерактивная кнопка получает мягкий звук, если обработчик не сделал это сам.
    document.addEventListener("click",e=>{if(e.target.closest("button")&&!e.target.closest("#attackButton,#spellButton,#potionButton,#fleeButton,#startGame,#findEnemy,#findLoot,#makeCamp,#openMap,#travelButton")){if(state.settings.sound)sound("click");}});
  }
  function start(){
    initTelegram();bind();
    $("soundToggle").checked=state.settings.sound;$("musicToggle").checked=state.settings.music;$("hapticToggle").checked=state.settings.haptic;
    window.AudioEngine.setEnabled(state.settings.sound);window.AudioEngine.setMusic(state.settings.music);
    if(state.created){selectedRace=state.race;$("creation").classList.add("hidden");$("gameScreen").classList.remove("hidden");render();switchTab("world");}
    else{state=baseState();window.RPGState=state;renderWorldLog();}
    // Кнопка начала при наличии сохранения создаёт нового героя только после подтверждения.
    $("startGame").textContent=state.created?"Начать нового героя":"Начать путешествие";
  }
  document.addEventListener("DOMContentLoaded",start);
})();