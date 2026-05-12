import { useState, useRef, useCallback } from 'react';
import { sesionesService } from '../../../services/sesiones.service';

function buildGameHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Cazador de Estrellas</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body,html{width:100%;height:100%;overflow:hidden;background:#000;font-family:Arial,sans-serif}
#renderCanvas{width:100%;height:100%;touch-action:none;display:block}
#ui{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}

/* HUD top bar */
#hud-top{position:absolute;top:0;left:0;right:0;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}
#score-box,#timer-box{background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:6px 14px;text-align:center;backdrop-filter:blur(8px)}
#score-label,#timer-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5);display:block}
#score-val{font-size:28px;font-weight:900;color:#FFD700;display:block;transition:transform .12s}
#score-val.bump{transform:scale(1.5)}
#timer-svg{display:block}
#timer-ring{stroke:#FFD700;transition:stroke .4s}
#timer-ring.red{stroke:#FF3B3B;filter:drop-shadow(0 0 6px #FF3B3B)}
#timer-num{font:900 14px Arial;fill:#fff}

/* Condicion */
#cond{position:absolute;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.18);border-radius:20px;padding:8px 22px;color:#fff;font-size:15px;font-weight:700;white-space:nowrap;backdrop-filter:blur(8px)}

/* Combo */
#combo{position:absolute;bottom:100px;left:50%;transform:translateX(-50%);font-size:32px;font-weight:900;color:#00FFAA;text-shadow:0 0 20px rgba(0,255,170,.9);opacity:0;transition:opacity .3s;text-align:center}
#combo.show{opacity:1}

/* Flash */
#flash{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .05s}
#flash.red{background:rgba(255,30,30,.35);opacity:1}
#flash.green{background:rgba(0,255,100,.15);opacity:1}

/* Countdown */
#countdown{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,10,.7)}
#countdown-num{font-size:100px;font-weight:900;color:#FFD700;text-shadow:0 0 40px rgba(255,215,0,.8);animation:pop .5s ease}
@keyframes pop{0%{transform:scale(2);opacity:0}100%{transform:scale(1);opacity:1}}

/* Resultado */
#resultado{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,15,.88);backdrop-filter:blur(12px)}
#resultado.show{display:flex}
#res-title{font-size:28px;font-weight:900;color:#FFD700;margin-bottom:8px;text-shadow:0 0 20px rgba(255,215,0,.8)}
#res-score{font-size:56px;font-weight:900;color:#00FFAA;text-shadow:0 0 20px rgba(0,255,170,.8);margin-bottom:20px}
.res-row{font-size:15px;color:rgba(255,255,255,.7);margin:3px 0}
.res-row b{color:#fff}

/* Texto flotante */
.float-txt{position:absolute;pointer-events:none;font-weight:900;animation:floatUp 1s ease-out forwards}
@keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(.8)}30%{transform:translateY(-30px) scale(1.3)}100%{opacity:0;transform:translateY(-110px) scale(.9)}}

/* Sacudida en error */
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.shake{animation:shake .35s ease}

/* Estrellas especiales (golden) - via JS */
</style>
</head>
<body>
<canvas id="renderCanvas"></canvas>
<div id="ui">
  <div id="hud-top">
    <div id="score-box"><span id="score-label">PUNTOS</span><span id="score-val">0</span></div>
    <div id="timer-box">
      <span id="timer-label">TIEMPO</span>
      <svg id="timer-svg" viewBox="0 0 54 54" width="54" height="54">
        <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/>
        <circle id="timer-ring" cx="27" cy="27" r="22" fill="none" stroke="#FFD700"
          stroke-width="4" stroke-linecap="round" stroke-dasharray="138.23"
          stroke-dashoffset="0" transform="rotate(-90 27 27)"/>
        <text id="timer-num" x="27" y="32" text-anchor="middle">15</text>
      </svg>
    </div>
  </div>
  <div id="cond">Cargando...</div>
  <div id="combo"></div>
  <div id="flash"></div>
  <div id="countdown"><div id="countdown-num">3</div></div>
  <div id="resultado">
    <div id="res-title">¡Ronda terminada!</div>
    <div id="res-score">0</div>
    <div class="res-row">✅ Aciertos: <b id="ra">0</b></div>
    <div class="res-row">❌ Errores: <b id="re">0</b></div>
    <div class="res-row">💨 Omisiones: <b id="ro">0</b></div>
  </div>
</div>
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<script>
'use strict';
// ── CONFIG ─────────────────────────────────────────────────
const CIRC=138.23, DUR_DEF=15000, UMBRAL_URG=5000;
const VEL={1:.022,2:.038,3:.055,4:.075};
const MAX_P={1:3,2:5,3:6,4:8};
const INT_S={1:2000,2:1500,3:1200,4:800};
const COLORES={rojo:[1,.15,.15],azul:[.2,.45,1],amarillo:[1,.92,.05],verde:[.1,.95,.3],morado:[.75,.1,1]};

// ── ESTADO ─────────────────────────────────────────────────
let E={activo:false,config:null,pts:0,ok:0,err:0,omit:0,
  eventos:[],estrellas:[],t0:0,durMs:DUR_DEF,spawnT:null,reacciones:[],
  combo:0,mult:1};

// ── BABYLON ─────────────────────────────────────────────────
const canvas=document.getElementById('renderCanvas');
const engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});
const scene=new BABYLON.Scene(engine);
scene.clearColor=new BABYLON.Color4(.01,.01,.06,1);
const cam=new BABYLON.FreeCamera('c',new BABYLON.Vector3(0,0,-11),scene);
cam.setTarget(BABYLON.Vector3.Zero());cam.minZ=.1;
const luz=new BABYLON.HemisphericLight('l',new BABYLON.Vector3(0,1,0),scene);
luz.intensity=.5;
try{const gl=new BABYLON.GlowLayer('g',scene);gl.intensity=1.4;}catch(e){}

// ── FONDO: estrellas titilantes ─────────────────────────────
const bgMat=new BABYLON.StandardMaterial('bm',scene);
bgMat.emissiveColor=new BABYLON.Color3(1,1,1);bgMat.disableLighting=true;
const bgStars=[];
for(let i=0;i<150;i++){
  const s=BABYLON.MeshBuilder.CreateSphere('b'+i,{diameter:.06+Math.random()*.09,segments:3},scene);
  s.position.set((Math.random()-.5)*18,(Math.random()-.5)*16,Math.random()*5+2);
  s.material=bgMat;s.isPickable=false;
  bgStars.push({m:s,base:s.position.y,spd:.003+Math.random()*.005,phase:Math.random()*Math.PI*2});
}

// ── DOM refs ────────────────────────────────────────────────
const elPts=document.getElementById('score-val');
const elRing=document.getElementById('timer-ring');
const elNum=document.getElementById('timer-num');
const elCond=document.getElementById('cond');
const elCombo=document.getElementById('combo');
const elFlash=document.getElementById('flash');
const elRes=document.getElementById('resultado');
const elCd=document.getElementById('countdown');
const ui=document.getElementById('ui');

// ── HELPERS UI ─────────────────────────────────────────────
function flash(tipo){
  elFlash.className='';
  void elFlash.offsetWidth;
  elFlash.className=tipo;
  setTimeout(()=>elFlash.className='',tipo==='red'?220:350);
}
function shake(){
  canvas.classList.add('shake');
  setTimeout(()=>canvas.classList.remove('shake'),350);
}
function floatTxt(txt,color,size,pos3d){
  const v=BABYLON.Vector3.Project(pos3d,BABYLON.Matrix.Identity(),
    scene.getTransformMatrix(),
    cam.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight()));
  const d=document.createElement('div');
  d.className='float-txt';
  d.style.cssText='left:'+(v.x-30)+'px;top:'+(v.y-20)+'px;color:'+color+';font-size:'+size+'px;text-shadow:0 0 10px '+color;
  d.textContent=txt;
  ui.appendChild(d);
  setTimeout(()=>d.remove(),1000);
}
function actualizarCombo(){
  if(E.combo>=3){
    const emojis=['','','','🔥','🔥🔥','🔥🔥🔥'];
    const e=emojis[Math.min(E.combo,5)]||'⚡';
    elCombo.textContent=e+' x'+E.mult+' COMBO '+(E.combo>=10?'¡INCREÍBLE!':'');
    elCombo.classList.add('show');
  }else{
    elCombo.classList.remove('show');
  }
}
function bumpScore(){
  elPts.classList.remove('bump');
  void elPts.offsetWidth;
  elPts.classList.add('bump');
  setTimeout(()=>elPts.classList.remove('bump'),200);
}

// ── EVALUACIÓN ─────────────────────────────────────────────
function esCorrecta(obj,cond){
  if(cond.atributo==='color')return obj.color===cond.valor;
  if(cond.atributo==='puntas')return obj.puntas===cond.valor;
  if(cond.atributo==='color_y_puntas')return obj.color===cond.valor.color&&obj.puntas===cond.valor.puntas;
  return false;
}

// ── FÁBRICA DE ESTRELLAS ────────────────────────────────────
function spawnStar(datos){
  const uid='s'+Date.now()+Math.random().toString(36).slice(2,5);
  const golden=Math.random()<.08; // 8% estrella dorada → variable reward
  const diam=golden?1.6:(1.0+Math.random()*.35);
  const mesh=BABYLON.MeshBuilder.CreateSphere(uid,{diameter:diam,segments:12},scene);
  mesh.position.set((Math.random()-.5)*8,8,0);

  const rgb=golden?[1,.9,.1]:COLORES[datos.color]||COLORES.rojo;
  const mat=new BABYLON.StandardMaterial(uid+'m',scene);
  mat.emissiveColor=new BABYLON.Color3(...rgb);
  mat.diffuseColor=new BABYLON.Color3(...rgb);
  mat.specularColor=new BABYLON.Color3(.8,.8,.8);
  mesh.material=mat;

  const correcto=esCorrecta(datos,E.config.condicion);

  // Pulso solo en estrellas correctas → señal saliente
  let t=0,pulseObs=null;
  if(correcto){
    pulseObs=scene.onBeforeRenderObservable.add(()=>{
      t+=.12;const s=1+Math.sin(t)*.12;mesh.scaling.setAll(s);
    });
  }

  const reg={mesh,datos,uid,t0:Date.now(),correcto,activa:true,golden,pulseObs};
  mesh.actionManager=new BABYLON.ActionManager(scene);
  mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnPickTrigger,()=>tap(reg)));
  E.estrellas.push(reg);
}

// ── TAP ─────────────────────────────────────────────────────
function tap(reg){
  if(!E.activo||!reg.activa)return;
  const reac=Date.now()-reg.t0;
  reg.activa=false;
  if(reg.pulseObs)scene.onBeforeRenderObservable.remove(reg.pulseObs);
  const pos=reg.mesh.position.clone();

  E.eventos.push({objeto_id:reg.datos.id,correcto:reg.correcto,tiempo_ms:reac,tipo_accion:'tocado'});

  if(reg.correcto){
    E.ok++;E.reacciones.push(reac);E.combo++;
    E.mult=E.combo>=10?5:E.combo>=5?3:E.combo>=3?2:1;
    const pts=(reg.golden?50:10)*E.mult;
    E.pts+=pts;
    elPts.textContent=E.pts;bumpScore();
    flash('green');
    floatTxt(reg.golden?'⭐ x5 +'+pts:'+'+pts+(E.mult>1?' x'+E.mult:''),'#FFD700',E.mult>=3?38:28,pos);
    if(E.combo===10)floatTxt('¡INCREÍBLE!','#00FFAA',42,new BABYLON.Vector3(0,1,0));
    actualizarCombo();
    explotar(pos,mat3color(reg.mesh.material));
  }else{
    E.err++;E.combo=0;E.mult=1;E.pts=Math.max(0,E.pts-5);
    elPts.textContent=E.pts;
    flash('red');shake();
    floatTxt('-5','#FF3B3B',28,pos);
    actualizarCombo();
  }
  if(!reg.mesh.isDisposed())reg.mesh.dispose();
}
function mat3color(m){return m.emissiveColor.clone();}

// ── EXPLOSIÓN ───────────────────────────────────────────────
function explotar(pos,col){
  for(let i=0;i<14;i++){
    const p=BABYLON.MeshBuilder.CreateSphere('fx'+i+Date.now(),{diameter:.15,segments:3},scene);
    p.position.copyFrom(pos);p.isPickable=false;
    const pm=new BABYLON.StandardMaterial('pm'+i+Date.now(),scene);pm.emissiveColor=col;p.material=pm;
    const vx=(Math.random()-.5)*.4,vy=Math.random()*.35+.1,vz=(Math.random()-.5)*.15;
    let v=20;
    const o=scene.onBeforeRenderObservable.add(()=>{
      p.position.x+=vx;p.position.y+=vy;p.position.z+=vz;
      p.scaling.scaleInPlace(.93);v--;
      if(v<=0){p.dispose();scene.onBeforeRenderObservable.remove(o);}
    });
  }
}

// ── SPAWN LOOP ──────────────────────────────────────────────
function iniciarSpawn(){
  const nv=E.config.nivel;
  const ms=INT_S[nv]||2000,mx=MAX_P[nv]||3;
  function ciclo(){
    if(!E.activo)return;
    if(E.estrellas.filter(s=>s.activa).length<mx){
      const ob=E.config.objetos;
      spawnStar(ob[Math.floor(Math.random()*ob.length)]);
    }
    E.spawnT=setTimeout(ciclo,ms);
  }ciclo();
}
function stopSpawn(){clearTimeout(E.spawnT);E.spawnT=null;}

// ── CAÍDA ─────────────────────────────────────────────────
function caida(){
  if(!E.activo)return;
  const vel=VEL[E.config?.nivel]||.022;
  for(const r of E.estrellas){
    if(!r.activa)continue;
    r.mesh.rotation.x+=.02;r.mesh.rotation.y+=.015;
    r.mesh.position.y-=vel;
    // Urgencia visual: estrellas correctas parpadan al bajar
    if(r.correcto&&r.mesh.position.y<-3){
      r.mesh.visibility=.5+.5*Math.sin(Date.now()*.015);
    }
    if(r.mesh.position.y<-8){
      r.activa=false;
      if(r.pulseObs)scene.onBeforeRenderObservable.remove(r.pulseObs);
      if(r.correcto){
        E.omit++;E.pts=Math.max(0,E.pts-3);elPts.textContent=E.pts;
        E.combo=0;E.mult=1;actualizarCombo();
        E.eventos.push({objeto_id:r.datos.id,correcto:true,tiempo_ms:null,tipo_accion:'omitido'});
      }
      if(!r.mesh.isDisposed())r.mesh.dispose();
    }
  }
  E.estrellas=E.estrellas.filter(s=>s.activa);
}

// ── TIMER ──────────────────────────────────────────────────
function tickTimer(){
  if(!E.activo)return;
  const ms=Math.max(0,E.durMs-(Date.now()-E.t0));
  const seg=Math.ceil(ms/1000);
  elNum.textContent=seg;
  elRing.style.strokeDashoffset=CIRC*(1-ms/E.durMs);
  if(ms<=UMBRAL_URG)elRing.classList.add('red');else elRing.classList.remove('red');
  if(ms<=0)terminar();
}

// ── GAME START / END ────────────────────────────────────────
function iniciar(config){
  E.estrellas.forEach(s=>{if(!s.mesh.isDisposed())s.mesh.dispose();});
  E={activo:false,config,pts:0,ok:0,err:0,omit:0,
    eventos:[],estrellas:[],t0:0,durMs:config.duracion_ms||DUR_DEF,
    spawnT:null,reacciones:[],combo:0,mult:1};
  elCond.textContent=config.condicion.texto;
  elPts.textContent='0';elCombo.classList.remove('show');
  elRes.classList.remove('show');
  elRing.classList.remove('red');
  conteo(()=>{
    E.activo=true;E.t0=Date.now();
    iniciarSpawn();
  });
}

function conteo(cb){
  elCd.style.display='flex';
  const nums=['3','2','1','¡GO!'];let i=0;
  const tick=()=>{
    const el=document.getElementById('countdown-num');
    el.textContent=nums[i];
    el.style.animation='none';void el.offsetWidth;el.style.animation='pop .5s ease';
    i++;
    if(i<nums.length)setTimeout(tick,800);
    else setTimeout(()=>{elCd.style.display='none';cb();},600);
  };tick();
}

function terminar(){
  if(!E.activo)return;E.activo=false;stopSpawn();
  E.estrellas.forEach(s=>{if(!s.mesh.isDisposed())s.mesh.dispose();});E.estrellas=[];
  const prom=E.reacciones.length?Math.round(E.reacciones.reduce((a,b)=>a+b,0)/E.reacciones.length):null;
  document.getElementById('res-score').textContent=E.pts+' pts';
  document.getElementById('ra').textContent=E.ok;
  document.getElementById('re').textContent=E.err;
  document.getElementById('ro').textContent=E.omit;
  elRes.classList.add('show');
  const payload={tipo:'ronda_terminada',resultados:{puntaje:E.pts,aciertos:E.ok,errores:E.err,
    omisiones:E.omit,tiempo_reaccion_promedio_ms:prom,eventos:E.eventos}};
  try{
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }catch(e){}
}

// ── COMUNICACIÓN RN ─────────────────────────────────────────
window.addEventListener('message',ev=>{
  try{const m=JSON.parse(ev.data);if(m.tipo==='init')iniciar(m.config);}catch(e){}
});

// ── LOOP ────────────────────────────────────────────────────
engine.runRenderLoop(()=>{
  // Fondo: estrellas titilantes
  const t=performance.now()*.001;
  bgStars.forEach(s=>{s.m.scaling.setAll(.8+.2*Math.sin(t*s.spd*10+s.phase));});
  caida();tickTimer();scene.render();
});
window.addEventListener('resize',()=>engine.resize());

// AUTO-INICIO: si RN no manda init en 2s, arranca demo
setTimeout(()=>{
  if(!E.activo)iniciar({
    nivel:1,duracion_ms:15000,
    condicion:{atributo:'color',valor:'rojo',texto:'¡Atrapa las estrellas ROJAS!'},
    objetos:[
      {id:'o1',color:'rojo',puntas:5},{id:'o2',color:'azul',puntas:4},
      {id:'o3',color:'amarillo',puntas:6},{id:'o4',color:'rojo',puntas:3},
      {id:'o5',color:'verde',puntas:5},{id:'o6',color:'morado',puntas:5}
    ]
  });
},2000);
</script>
</body>
</html>`;
}

export function useCazadorEstrellas() {
  const [puntaje, setPuntaje]     = useState(0);
  const [estado, setEstado]       = useState('idle');
  const [resultado, setResultado] = useState(null);
  const webViewRef                = useRef(null);
  const htmlContent               = buildGameHtml();

  const iniciarJuego = useCallback((config) => {
    setEstado('jugando'); setPuntaje(0);
    const cfg = config ?? {
      nivel:1, duracion_ms:15000,
      condicion:{atributo:'color',valor:'rojo',texto:'¡Atrapa las estrellas ROJAS!'},
      objetos:[
        {id:'o1',color:'rojo',puntas:5},{id:'o2',color:'azul',puntas:4},
        {id:'o3',color:'amarillo',puntas:6},{id:'o4',color:'rojo',puntas:3},
        {id:'o5',color:'verde',puntas:5},{id:'o6',color:'morado',puntas:5}
      ],
    };
    const msg = JSON.stringify({tipo:'init',config:cfg});
    webViewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(msg)}}));true;`
    );
  }, []);

  const onMessage = useCallback(async (event) => {
    try {
      const p = JSON.parse(event.nativeEvent.data);
      if (p.tipo === 'ronda_terminada') {
        setEstado('terminado'); setPuntaje(p.resultados.puntaje); setResultado(p.resultados);
        await sesionesService.registrarSesion(p.resultados);
      }
    } catch(e) {}
  }, []);

  return { htmlContent, webViewRef, puntaje, estado, resultado, iniciarJuego, onMessage };
}
