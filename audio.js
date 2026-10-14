/* Синтез звука без аудиофайлов. Контекст запускается после действия пользователя. */
(() => {
  const A=window.AudioEngine={enabled:true,musicEnabled:false,ctx:null,master:null,oscillators:[],musicTimer:null};
  function context(){
    if(!A.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;A.ctx=new C();A.master=A.ctx.createGain();A.master.gain.value=.24;A.master.connect(A.ctx.destination);}
    if(A.ctx.state==="suspended")A.ctx.resume();return A.ctx;
  }
  function tone(freq,duration=.12,type="sine",volume=.2,when=0,endFreq=null){
    if(!A.enabled)return;const c=context();if(!c)return;
    const t=c.currentTime+when,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),t);
    if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(A.master);o.start(t);o.stop(t+duration+.03);
  }
  function noise(duration=.15,volume=.08,filterFreq=900){
    if(!A.enabled)return;const c=context();if(!c)return;const n=Math.floor(c.sampleRate*duration),buf=c.createBuffer(1,n,c.sampleRate),data=buf.getChannelData(0);
    for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);
    const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();src.buffer=buf;filter.type="lowpass";filter.frequency.value=filterFreq;g.gain.value=volume;src.connect(filter);filter.connect(g);g.connect(A.master);src.start();
  }
  A.play=(name)=>{
    if(!A.enabled)return;context();
    switch(name){
      case "click":tone(580,.045,"triangle",.08,0,390);break;
      case "start":tone(220,.22,"sine",.15,0,440);tone(330,.3,"triangle",.12,.12,660);tone(440,.4,"sine",.1,.25,880);break;
      case "attack":noise(.13,.12,1600);tone(170,.12,"sawtooth",.12,0,70);break;
      case "hit":noise(.11,.13,650);tone(95,.16,"triangle",.12,0,55);break;
      case "spell":tone(440,.25,"sine",.12,0,880);tone(660,.3,"triangle",.1,.05,330);noise(.2,.04,2200);break;
      case "potion":tone(360,.18,"sine",.1,0,540);tone(540,.25,"sine",.08,.12,760);break;
      case "camp":tone(120,.22,"triangle",.05,0,170);noise(.28,.035,600);tone(520,.25,"sine",.07,.1,680);break;
      case "victory":[392,494,587,784].forEach((f,i)=>tone(f,.38,"triangle",.11,i*.13));break;
      case "defeat":[330,277,220,165].forEach((f,i)=>tone(f,.32,"sawtooth",.08,i*.16));break;
      case "loot":tone(660,.12,"sine",.09);tone(880,.2,"triangle",.08,.1);break;
      case "travel":noise(.18,.045,400);tone(260,.18,"triangle",.07,0,390);break;
      default:tone(440,.07,"sine",.06);
    }
  };
  A.setEnabled=v=>{A.enabled=!!v;if(!v)A.stopMusic();};
  A.setMusic=v=>{A.musicEnabled=!!v;if(v)A.startMusic();else A.stopMusic();};
  A.startMusic=()=>{
    if(!A.musicEnabled||!A.enabled||A.musicTimer)return;
    const notes=[110,146.83,164.81,146.83,98,130.81,146.83,130.81];let i=0;
    A.musicTimer=setInterval(()=>{if(A.musicEnabled&&A.enabled){tone(notes[i%notes.length],.65,"sine",.018);tone(notes[(i+3)%notes.length]*2,.4,"triangle",.009,.16);i++;}},720);
  };
  A.stopMusic=()=>{if(A.musicTimer){clearInterval(A.musicTimer);A.musicTimer=null;}};
})();