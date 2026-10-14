/* Процедурная графика: портреты, мир, карта, экипировка и противники. */
(() => {
  const G = window.Graphics = {};
  const palette = {
    human:{skin:"#c88d67",hair:"#49302b",cloth:"#586b82",accent:"#d8b66d"},
    elf:{skin:"#d6b49b",hair:"#b9c7a0",cloth:"#3c706c",accent:"#9dd9c3"},
    dwarf:{skin:"#c78f69",hair:"#8b482d",cloth:"#7d573b",accent:"#d9a65b"},
    orc:{skin:"#78a56d",hair:"#242a23",cloth:"#5a3b35",accent:"#d16d52"}
  };
  const $ = id => document.getElementById(id);
  function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width*dpr), h = Math.round(rect.height*dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; }
    const ctx=canvas.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx,w:rect.width,h:rect.height};
  }
  function rounded(ctx,x,y,w,h,r,fill,stroke) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
  }
  function drawPortrait(ctx,w,h,race,t=0) {
    const p=palette[race]||palette.human, s=Math.min(w/150,h/145);
    ctx.save();ctx.scale(w/150,h/145);
    const grad=ctx.createLinearGradient(0,0,150,145);grad.addColorStop(0,"#34303a");grad.addColorStop(1,"#15141b");
    rounded(ctx,1,1,148,143,12,grad,"#574737");
    for(let i=0;i<13;i++){const x=(i*37+12)%150,y=(i*53+18)%140;ctx.fillStyle=`rgba(220,177,100,${.08+.06*Math.sin(t*2+i)})`;ctx.beginPath();ctx.arc(x,y,1.2+(i%3),0,Math.PI*2);ctx.fill();}
    ctx.translate(0,Math.sin(t*2)*1.5);
    // плечи и плащ
    ctx.fillStyle=p.cloth;ctx.beginPath();ctx.moveTo(36,139);ctx.lineTo(43,94);ctx.quadraticCurveTo(75,78,107,94);ctx.lineTo(119,139);ctx.closePath();ctx.fill();
    ctx.fillStyle="#17161c";ctx.beginPath();ctx.moveTo(66,96);ctx.lineTo(75,117);ctx.lineTo(84,96);ctx.fill();
    // уши эльфа/орка
    if(race==="elf"||race==="orc"){ctx.fillStyle=p.skin;ctx.beginPath();ctx.moveTo(48,49);ctx.lineTo(race==="elf"?25:36,35);ctx.lineTo(42,65);ctx.fill();ctx.beginPath();ctx.moveTo(102,49);ctx.lineTo(race==="elf"?125:114,35);ctx.lineTo(108,65);ctx.fill();}
    // шея и лицо
    ctx.fillStyle=p.skin;rounded(ctx,62,72,27,30,8,p.skin);
    ctx.beginPath();ctx.ellipse(75,54,31,36,0,0,Math.PI*2);ctx.fill();
    // волосы
    ctx.fillStyle=p.hair;ctx.beginPath();ctx.moveTo(44,53);ctx.quadraticCurveTo(37,15,74,16);ctx.quadraticCurveTo(111,12,107,53);ctx.lineTo(98,42);ctx.lineTo(91,30);ctx.quadraticCurveTo(70,43,49,34);ctx.closePath();ctx.fill();
    if(race==="dwarf"){ctx.fillStyle=p.hair;ctx.beginPath();ctx.moveTo(48,58);ctx.quadraticCurveTo(39,80,59,93);ctx.lineTo(68,77);ctx.lineTo(82,77);ctx.lineTo(93,94);ctx.quadraticCurveTo(112,76,101,57);ctx.fill();}
    if(race==="orc"){ctx.fillStyle="#f1e2c6";ctx.beginPath();ctx.moveTo(53,69);ctx.lineTo(60,69);ctx.lineTo(58,82);ctx.fill();ctx.beginPath();ctx.moveTo(96,69);ctx.lineTo(103,69);ctx.lineTo(101,82);ctx.fill();}
    // брови, глаза, нос
    ctx.fillStyle="#282127";ctx.fillRect(54,50,15,3);ctx.fillRect(82,50,15,3);
    ctx.fillStyle="#f1dfc1";ctx.fillRect(57,55,10,4);ctx.fillRect(84,55,10,4);
    ctx.fillStyle="#29212a";ctx.fillRect(61,55,4,4);ctx.fillRect(87,55,4,4);
    ctx.strokeStyle="#885e50";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(75,56);ctx.lineTo(72,67);ctx.lineTo(78,68);ctx.stroke();
    ctx.strokeStyle="#6b3e3a";ctx.beginPath();ctx.moveTo(65,77);ctx.quadraticCurveTo(75,82,85,77);ctx.stroke();
    // металлическая окантовка и амулет
    ctx.strokeStyle=p.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(45,100);ctx.lineTo(75,119);ctx.lineTo(105,100);ctx.stroke();
    ctx.fillStyle=p.accent;ctx.beginPath();ctx.arc(75,119,4,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  G.drawRacePortrait=(canvas,race,time=0)=>{const a=fitCanvas(canvas);if(a)drawPortrait(a.ctx,a.w,a.h,race,time);};
  G.drawAvatar=(canvas,state,time=0)=>{const a=fitCanvas(canvas);if(a)drawPortrait(a.ctx,a.w,a.h,state?.race||"human",time);};

  const places=[
    {id:"forest",name:"Забытый лес",x:.22,y:.28,cost:0,desc:"Сумрачные тропы и старые руины."},
    {id:"village",name:"Серая деревня",x:.72,y:.22,cost:12,desc:"Торговцы, слухи и тёплый очаг."},
    {id:"cave",name:"Шепчущая пещера",x:.25,y:.72,cost:20,desc:"В глубине мерцают древние жилы."},
    {id:"castle",name:"Чёрный замок",x:.76,y:.72,cost:30,desc:"Каменные стены хранят мрачные тайны."}
  ];
  G.places=places;
  G.drawWorld=(canvas,location,time=0)=>{
    const a=fitCanvas(canvas);if(!a)return;const {ctx,w,h}=a;
    const skies={forest:["#182b2a","#53664a"],village:["#33303a","#8b7650"],cave:["#111923","#344b57"],castle:["#1c1c2c","#51404b"]};
    const colors=skies[location]||skies.forest,gr=ctx.createLinearGradient(0,0,0,h);gr.addColorStop(0,colors[0]);gr.addColorStop(1,colors[1]);ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);
    // луна/солнце
    ctx.fillStyle="#e8d9a766";ctx.beginPath();ctx.arc(w*.78,h*.25,Math.min(w,h)*.09,0,Math.PI*2);ctx.fill();
    // дальние холмы
    ctx.fillStyle="#17201f88";ctx.beginPath();ctx.moveTo(0,h*.67);for(let x=0;x<=w;x+=w/5)ctx.lineTo(x,h*(.43+Math.sin(x*.03+1)*.1));ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
    if(location==="forest"){
      for(let i=0;i<12;i++){let x=(i*73+13)%w,y=h*(.25+(i%4)*.09),r=12+(i%4)*4;ctx.fillStyle=i%2?"#1c3b31":"#254638";ctx.beginPath();ctx.moveTo(x,y-r*1.7);ctx.lineTo(x-r,y+r);ctx.lineTo(x+r,y+r);ctx.closePath();ctx.fill();ctx.fillStyle="#392c22";ctx.fillRect(x-3,y+r,6,h-y-r);}
    }else if(location==="castle"){
      ctx.fillStyle="#272431";ctx.fillRect(w*.31,h*.35,w*.4,h*.55);ctx.fillRect(w*.24,h*.25,w*.12,h*.65);ctx.fillRect(w*.66,h*.22,w*.12,h*.68);ctx.fillStyle="#16151e";for(let x=w*.33;x<w*.7;x+=w*.09)ctx.fillRect(x,h*.45,8,13);
    }else if(location==="village"){
      for(let i=0;i<4;i++){let x=w*(.13+i*.2),y=h*(.53+(i%2)*.08);ctx.fillStyle="#6b4b36";ctx.fillRect(x,y,30,28);ctx.fillStyle="#3c2a28";ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+15,y-18);ctx.lineTo(x+35,y);ctx.fill();ctx.fillStyle="#d8a45c";ctx.fillRect(x+12,y+10,6,10);}
    }else{
      ctx.fillStyle="#343d48";ctx.beginPath();ctx.moveTo(w*.15,h);ctx.lineTo(w*.28,h*.3);ctx.lineTo(w*.42,h*.55);ctx.lineTo(w*.57,h*.23);ctx.lineTo(w*.8,h);ctx.fill();ctx.fillStyle="#090d14";ctx.beginPath();ctx.ellipse(w*.51,h*.72,w*.14,h*.22,0,0,Math.PI*2);ctx.fill();
    }
    // туман с движущимися полосами
    for(let i=0;i<4;i++){let x=((time*8+i*w*.34)%(w+100))-50;ctx.fillStyle=`rgba(195,205,190,${.045+i*.012})`;ctx.beginPath();ctx.ellipse(x,h*(.68+i*.05),w*.25,9+i*3,0,0,Math.PI*2);ctx.fill();}
  };
  G.drawMap=(canvas,current,selected,time=0)=>{
    const a=fitCanvas(canvas);if(!a)return;const {ctx,w,h}=a;
    ctx.fillStyle="#192923";ctx.fillRect(0,0,w,h);
    // рельефные контуры
    for(let i=0;i<15;i++){ctx.strokeStyle=`rgba(135,161,112,${.08+i*.004})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(w*.5,h*.5,70+i*18,35+i*12,Math.sin(i)*.2,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle="#283d30";ctx.beginPath();ctx.moveTo(0,h*.25);ctx.lineTo(w*.35,h*.05);ctx.lineTo(w*.48,h*.35);ctx.lineTo(w*.2,h*.5);ctx.fill();
    ctx.fillStyle="#39443b";ctx.beginPath();ctx.moveTo(w*.48,h*.3);ctx.lineTo(w*.9,h*.15);ctx.lineTo(w,h*.48);ctx.lineTo(w*.72,h*.65);ctx.fill();
    // дороги
    ctx.strokeStyle="#a18b61";ctx.lineWidth=4;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(w*.22,h*.28);ctx.lineTo(w*.72,h*.22);ctx.lineTo(w*.76,h*.72);ctx.lineTo(w*.25,h*.72);ctx.closePath();ctx.stroke();ctx.setLineDash([]);
    places.forEach(p=>{const x=p.x*w,y=p.y*h;const isCurrent=p.id===current,isSel=p.id===selected;
      if(isCurrent||isSel){ctx.strokeStyle=isCurrent?"#e7c875":"#8fc9ee";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,15+Math.sin(time*3)*2,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle=p.id==="castle"?"#a5a1bd":p.id==="cave"?"#86a7b2":p.id==="village"?"#dfb86e":"#78b68b";ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#f4e8d1";ctx.font="bold 17px sans-serif";ctx.textAlign="center";ctx.fillText(p.name,x,y+28);
    });
    for(let i=0;i<16;i++){let x=(i*83+time*3)%(w+10),y=(i*47)%h;ctx.fillStyle=`rgba(210,220,205,${.025+(i%3)*.012})`;ctx.beginPath();ctx.ellipse(x,y,30,5,0,0,Math.PI*2);ctx.fill();}
  };
  G.drawEquipment=(canvas,state,time=0)=>{
    const a=fitCanvas(canvas);if(!a)return;const {ctx,w,h}=a;
    ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2,h*.48);ctx.scale(Math.min(w/240,h/280),Math.min(w/240,h/280));
    ctx.fillStyle=`rgba(218,177,90,${.04+.025*Math.sin(time*2)})`;ctx.beginPath();ctx.ellipse(0,0,75,110,0,0,Math.PI*2);ctx.fill();
    const race=palette[state?.race||"human"];ctx.fillStyle=race.cloth;ctx.beginPath();ctx.moveTo(-40,-22);ctx.lineTo(-62,83);ctx.lineTo(62,83);ctx.lineTo(40,-22);ctx.closePath();ctx.fill();
    ctx.fillStyle=race.skin;ctx.beginPath();ctx.ellipse(0,-48,26,32,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=race.hair;ctx.beginPath();ctx.arc(0,-57,27,Math.PI,Math.PI*2);ctx.fill();
    if(state?.equipment?.helmet){ctx.fillStyle="#9a9a9e";ctx.beginPath();ctx.arc(0,-55,30,Math.PI,Math.PI*2);ctx.lineTo(29,-48);ctx.lineTo(-29,-48);ctx.fill();}
    if(state?.equipment?.armor){ctx.strokeStyle="#a9a6a2";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-37,-14);ctx.lineTo(0,25);ctx.lineTo(37,-14);ctx.stroke();}
    if(state?.equipment?.weapon){ctx.strokeStyle="#d8d7ce";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(42,-10);ctx.lineTo(70,45);ctx.stroke();ctx.strokeStyle="#9b7442";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(49,8);ctx.lineTo(61,2);ctx.stroke();}
    if(state?.equipment?.amulet){ctx.fillStyle="#75c8e2";ctx.shadowColor="#75c8e2";ctx.shadowBlur=14;ctx.beginPath();ctx.arc(0,24,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    ctx.strokeStyle="#d9b66d";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-40,83);ctx.lineTo(40,83);ctx.stroke();ctx.restore();
  };
  G.drawEnemy=(canvas,enemy,time=0,hit=false)=>{
    const a=fitCanvas(canvas);if(!a)return;const {ctx,w,h}=a;ctx.clearRect(0,0,w,h);
    const x=w/2,y=h*.56,scale=Math.min(w/300,h/230);
    ctx.save();ctx.translate(x,y+Math.sin(time*2)*2);ctx.scale(scale*(hit?.94:1),scale*(hit?1.05:1));
    ctx.shadowColor=enemy?.type==="mage"?"#9b78ff":"#d05a4b";ctx.shadowBlur=16;
    const c=enemy?.type==="beast"?"#617b50":enemy?.type==="mage"?"#6d578d":enemy?.type==="boss"?"#7d3b45":"#80614d";
    ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,20,39,52,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#29232c";ctx.beginPath();ctx.ellipse(0,-28,30,34,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#e66b58";ctx.fillRect(-18,-31,9,5);ctx.fillRect(9,-31,9,5);
    ctx.fillStyle="#c3b29a";ctx.beginPath();ctx.moveTo(-15,-48);ctx.lineTo(-24,-64);ctx.lineTo(-5,-53);ctx.fill();ctx.beginPath();ctx.moveTo(15,-48);ctx.lineTo(24,-64);ctx.lineTo(5,-53);ctx.fill();
    ctx.strokeStyle="#30232b";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-28,0);ctx.lineTo(-48,37);ctx.moveTo(28,0);ctx.lineTo(47,33);ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle="#4b3532";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-18,62);ctx.lineTo(-22,88);ctx.moveTo(18,62);ctx.lineTo(22,88);ctx.stroke();
    if(enemy?.type==="boss"){ctx.strokeStyle="#b89b68";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-27,-50);ctx.lineTo(-36,-72);ctx.lineTo(-10,-58);ctx.moveTo(27,-50);ctx.lineTo(36,-72);ctx.lineTo(10,-58);ctx.stroke();}
    ctx.restore();
  };
  let clock=0;
  function animate(){clock+=.016;
    document.querySelectorAll("canvas[data-portrait]").forEach(c=>G.drawRacePortrait(c,c.dataset.portrait,clock));
    const avatar=$("headerAvatar");if(avatar&&window.RPGState)G.drawAvatar(avatar,window.RPGState,clock);
    const scene=$("worldScene");if(scene&&window.RPGState)G.drawWorld(scene,window.RPGState.location,clock);
    const map=$("mapCanvas");if(map&&$("mapModal")&&!$("mapModal").classList.contains("hidden"))G.drawMap(map,window.RPGState?.location,window.RPGSelectedLocation,clock);
    const eq=$("equipmentCanvas");if(eq&&window.RPGState)G.drawEquipment(eq,window.RPGState,clock);
    const enemy=$("enemyCanvas");if(enemy&&window.RPGState?.battle)G.drawEnemy(enemy,window.RPGState.battle.enemy,clock,!!window.RPGState.battle.hit);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();