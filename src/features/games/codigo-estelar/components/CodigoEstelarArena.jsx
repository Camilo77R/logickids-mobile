import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import CodigoEstelarResultsSheet from './CodigoEstelarResultsSheet';

// ─── ESTRELLAS ────────────────────────────────────────────────────────────────
const buildStars = () =>
  Array.from({ length: 56 }, (_, i) => {
    const top      = Math.round((i * 19) % 100);
    const left     = Math.round((i * 27) % 100);
    const size     = i % 4 === 0 ? 3 : 2;
    const opacity  = i % 5 === 0 ? 0.9 : 0.5;
    const duration = 2 + (i % 8) * 0.5;
    return `<span class="star" style="top:${top}%;left:${left}%;width:${size}px;height:${size}px;opacity:${opacity};animation-duration:${duration}s"></span>`;
  }).join('');

// ─── HTML ─────────────────────────────────────────────────────────────────────
const buildArenaHtml = () => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>Código Estelar</title>
<style>
:root{--bg:#050915;--blue:#6bd5ff;--green:#37d79f;--amber:#ffbf5b;--danger:#ff7e72;--text:#f8fbff;--muted:rgba(234,244,255,.64);--card:rgba(10,20,38,.92);--borde:rgba(107,213,255,.14)}
*{box-sizing:border-box;user-select:none;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:radial-gradient(ellipse at top,rgba(107,213,255,.12),transparent 42%),radial-gradient(ellipse at bottom right,rgba(55,215,159,.09),transparent 38%),var(--bg);font-family:"Trebuchet MS",Arial,sans-serif;color:var(--text)}
#app{position:relative;width:100%;height:100%;overflow:hidden;display:flex;flex-direction:column;padding:10px 12px 12px}
.stars{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}.star{position:absolute;border-radius:999px;background:rgba(234,247,255,.9);animation:twinkle ease-in-out infinite alternate}.nebula{position:absolute;border-radius:999px;pointer-events:none;filter:blur(22px)}.nebula.a{top:-40px;right:-20px;width:160px;height:160px;background:rgba(107,213,255,.14)}.nebula.b{bottom:-40px;left:-30px;width:150px;height:150px;background:rgba(55,215,159,.10)}
#top-bar{position:relative;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 4px;flex-shrink:0}.tb-pill{background:var(--card);border:1px solid var(--borde);border-radius:16px;padding:8px 12px;display:flex;flex-direction:column;gap:2px}.tb-label{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-weight:900}.tb-value{font-size:16px;font-weight:900;color:var(--text)}.tb-value.gold{color:#fff1a8}#status-dot{width:9px;height:9px;border-radius:999px;background:var(--green);box-shadow:0 0 10px rgba(55,215,159,.9);display:inline-block;margin-right:6px;animation:blink 1.8s ease-in-out infinite}#tb-sala{flex:1;text-align:center}#tb-sala .tb-value{font-size:13px}
#objetivo-wrap{position:relative;z-index:4;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;padding:14px 0 8px;flex-shrink:0}.obj-label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--blue);font-weight:900;margin-bottom:6px}#objetivo-num{font-size:clamp(72px,20vw,100px);font-weight:900;line-height:1;color:#fff1a8;text-shadow:0 0 40px rgba(255,241,168,.35);animation:objPulse 3s ease-in-out infinite}.obj-hint{font-size:12px;color:var(--muted);margin-top:6px;text-align:center}
#meteorito-wrap{position:relative;z-index:4;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;padding:4px 0;flex-shrink:0}.met-label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--amber);font-weight:900;margin-bottom:4px}#meteorito-card{background:rgba(255,191,91,.10);border:1.5px solid rgba(255,191,91,.28);border-radius:24px;padding:10px 32px;animation:drift 2.6s ease-in-out infinite}#meteorito-num{font-size:clamp(52px,15vw,72px);font-weight:900;line-height:1;color:var(--amber);text-shadow:0 0 24px rgba(255,191,91,.4)}
#portales{position:relative;z-index:5;flex:0 0 auto;display:flex;gap:10px;padding:8px 0;flex-shrink:0}.portal{flex:1;min-height:100px;border:0;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:22px;padding:12px 6px;gap:4px;cursor:pointer;transition:transform 140ms ease,opacity 140ms ease,box-shadow 140ms ease}.portal:active{transform:scale(.93)}.portal.disabled{opacity:.22;pointer-events:none}.portal[data-z="menor"]{background:rgba(107,213,255,.10);border:1.5px solid rgba(107,213,255,.28)}.portal[data-z="igual"]{background:rgba(55,215,159,.10);border:1.5px solid rgba(55,215,159,.28)}.portal[data-z="mayor"]{background:rgba(255,191,91,.10);border:1.5px solid rgba(255,191,91,.28)}.portal[data-z="menor"]:active{box-shadow:0 0 28px rgba(107,213,255,.6)}.portal[data-z="igual"]:active{box-shadow:0 0 28px rgba(55,215,159,.6)}.portal[data-z="mayor"]:active{box-shadow:0 0 28px rgba(255,191,91,.6)}.portal-symbol{font-size:clamp(32px,9vw,44px);font-weight:900;line-height:1}.portal[data-z="menor"] .portal-symbol{color:var(--blue)}.portal[data-z="igual"] .portal-symbol{color:var(--green)}.portal[data-z="mayor"] .portal-symbol{color:var(--amber)}.portal-label{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--text)}
#ranking{position:relative;z-index:4;flex:1;display:flex;gap:8px;align-items:stretch;min-height:0;padding-top:4px}.rank-card{flex:1;background:var(--card);border:1px solid var(--borde);border-radius:18px;padding:10px 8px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;min-height:80px}.rank-card.self{border-color:rgba(107,213,255,.36);box-shadow:0 0 0 1px rgba(107,213,255,.10) inset}.rank-pos{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:900}.rank-name{font-size:13px;font-weight:900;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rank-score{font-size:20px;font-weight:900;color:#fff1a8;margin-top:auto}.rank-combo{font-size:10px;color:var(--muted)}.rank-empty{flex:1;background:var(--card);border:1px dashed rgba(255,255,255,.10);border-radius:18px;display:flex;align-items:center;justify-content:center;padding:12px}.rank-empty-txt{color:var(--muted);font-size:12px;text-align:center}
#feedback{position:absolute;top:10px;left:50%;transform:translateX(-50%) translateY(-20px);min-width:200px;max-width:280px;opacity:0;pointer-events:none;transition:opacity 180ms ease,transform 180ms ease;z-index:20;text-align:center}#feedback.show{opacity:1;transform:translateX(-50%) translateY(0)}#feedback-card{border-radius:16px;padding:10px 16px;border:1px solid transparent;backdrop-filter:blur(10px)}#feedback-card.ok{background:rgba(9,45,31,.9);border-color:rgba(55,215,159,.3)}#feedback-card.err{background:rgba(56,18,18,.9);border-color:rgba(255,126,114,.3)}#feedback-title{font-size:15px;font-weight:900}#feedback-card.ok #feedback-title{color:#d7ffe9}#feedback-card.err #feedback-title{color:#ffd6d2}#feedback-sub{font-size:12px;color:rgba(255,255,255,.75);margin-top:3px}
#game-over{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(2,6,14,.78);backdrop-filter:blur(12px);z-index:30}#game-over.show{display:flex}#go-card{width:100%;max-width:320px;border-radius:28px;padding:24px 20px;text-align:center;background:linear-gradient(180deg,rgba(15,29,51,.98),rgba(8,16,28,.98));border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 48px rgba(0,0,0,.4)}#go-emoji{font-size:52px;margin-bottom:8px}#go-titulo{font-size:28px;font-weight:900;margin-bottom:4px}#go-titulo.win{color:#d8ffe9}#go-titulo.lose{color:#fff1a8}#go-ganador{color:var(--muted);font-size:14px;margin-bottom:16px}.go-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}.go-stat{background:rgba(255,255,255,.05);border-radius:14px;padding:10px}.go-stat-val{font-size:24px;font-weight:900;color:#fff1a8}.go-stat-lbl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:2px}
@keyframes twinkle{from{opacity:.2}to{opacity:1}}@keyframes drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes objPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}@keyframes fadeIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}#go-card{animation:fadeIn .32s ease}
</style>
</head>
<body>
<div id="app">
  <div class="stars">${buildStars()}<div class="nebula a"></div><div class="nebula b"></div></div>
  <div id="top-bar">
    <div class="tb-pill"><span class="tb-label">Piloto</span><span class="tb-value gold" id="tb-piloto">—</span></div>
    <div class="tb-pill" id="tb-sala" style="flex:1;text-align:center"><span class="tb-label">Sala</span><span class="tb-value" id="tb-room">Cargando...</span></div>
    <div class="tb-pill"><span class="tb-label">Pts</span><span class="tb-value gold" id="tb-pts">0</span></div>
    <div class="tb-pill" style="flex-direction:row;align-items:center;gap:4px"><span id="status-dot"></span><span class="tb-value" id="tb-status" style="font-size:11px">En línea</span></div>
  </div>
  <div id="objetivo-wrap"><span class="obj-label">⭐ OBJETIVO</span><span id="objetivo-num">?</span><span class="obj-hint">¿El meteorito es menor, igual o mayor?</span></div>
  <div id="meteorito-wrap"><span class="met-label">☄️ METEORITO</span><div id="meteorito-card"><span id="meteorito-num">...</span></div></div>
  <div id="portales">
    <button class="portal disabled" data-z="menor" id="portal-menor"><span class="portal-symbol">&lt;</span><span class="portal-label">Menor</span></button>
    <button class="portal disabled" data-z="igual" id="portal-igual"><span class="portal-symbol">=</span><span class="portal-label">Igual</span></button>
    <button class="portal disabled" data-z="mayor" id="portal-mayor"><span class="portal-symbol">&gt;</span><span class="portal-label">Mayor</span></button>
  </div>
  <div id="ranking"><div class="rank-empty"><span class="rank-empty-txt">Esperando rivales...</span></div></div>
  <div id="feedback"><div id="feedback-card"><div id="feedback-title"></div><div id="feedback-sub"></div></div></div>
  <div id="game-over"><div id="go-card"><div id="go-emoji">🏆</div><div id="go-titulo" class="win">¡Misión completada!</div><div id="go-ganador"></div><div class="go-grid"><div class="go-stat"><div class="go-stat-val" id="go-pts">0</div><div class="go-stat-lbl">Puntos</div></div><div class="go-stat"><div class="go-stat-val" id="go-pos">#?</div><div class="go-stat-lbl">Posición</div></div><div class="go-stat"><div class="go-stat-val" id="go-ok">0</div><div class="go-stat-lbl">Aciertos</div></div><div class="go-stat"><div class="go-stat-val" id="go-err">0</div><div class="go-stat-lbl">Errores</div></div></div></div></div>
</div>
<script>
'use strict';
let _state = { piloto:null, room:null, objetivo:null, meteorito:null, canAnswer:false, leaderboard:[], selfId:null };
const $piloto=document.getElementById('tb-piloto');const $room=document.getElementById('tb-room');const $pts=document.getElementById('tb-pts');const $statusDot=document.getElementById('status-dot');const $statusTxt=document.getElementById('tb-status');const $objNum=document.getElementById('objetivo-num');const $metNum=document.getElementById('meteorito-num');const $metCard=document.getElementById('meteorito-card');const $ranking=document.getElementById('ranking');const $feedback=document.getElementById('feedback');const $fbCard=document.getElementById('feedback-card');const $fbTitle=document.getElementById('feedback-title');const $fbSub=document.getElementById('feedback-sub');const $gameOver=document.getElementById('game-over');const portals=document.querySelectorAll('.portal');
function renderPilot(p,pts){if(!p)return;$piloto.textContent=p.nombre?p.nombre.split(' ')[0]:'—';$pts.textContent=pts??0;}
function renderRoom(roomKey){if(!roomKey)return;const m=/grupo_(\d+)/.exec(roomKey);$room.textContent=m?'Grupo '+m[1]:roomKey;}
function renderObjetivo(num){$objNum.textContent=num!=null?num:'?';}
function renderMeteorito(num,canAnswer){if(!canAnswer||num==null){$metNum.textContent='...';$metCard.style.opacity='0.35';}else{$metNum.textContent=num;$metCard.style.opacity='1';}}
function applyZoneState(canAnswer,permiteIgual){portals.forEach(function(p){var zona=p.dataset.z;var bloqueado=!canAnswer||(zona==='igual'&&!permiteIgual);p.classList.toggle('disabled',bloqueado);});}
function renderLeaderboard(board,selfId,myPts){var medals=['🥇','🥈','🥉'];var lista=(board&&board.length>0)?board:[];if(lista.length===0&&_state.piloto&&_state.piloto.nombre){lista=[{estudianteId:selfId,nombre:_state.piloto.nombre,puntaje:myPts||0,combo:0}];}if(lista.length===0){$ranking.innerHTML='<div class="rank-empty"><span class="rank-empty-txt">🚀 Esperando rivales...</span></div>';return;} $ranking.innerHTML=lista.slice(0,3).map(function(item,i){var isSelf=item.estudianteId===selfId;var pts=isSelf&&myPts!=null?myPts:(item.puntaje||0);var selfCls=isSelf?' self':'';var medal=medals[i]||('#'+(i+1));var nombre=item.nombre||'Piloto';var combo=item.combo!=null?item.combo:0;return '<div class="rank-card'+selfCls+'"><div class="rank-pos">'+medal+'</div><div class="rank-name">'+nombre+'</div><div class="rank-score">'+pts+'</div><div class="rank-combo">Combo '+combo+'</div></div>';}).join('');}
let _fbTimer=null;function showFeedback(ok,delta,combo,pts){clearTimeout(_fbTimer);$fbCard.className=ok?'ok':'err';$fbTitle.textContent=ok?(delta>0?'+'+delta+' pts':'¡Correcto!'):(delta<0?delta+' pts':'❌ Error');$fbSub.textContent=ok?('Combo '+combo+'  ·  Total '+pts):('Total '+pts);$feedback.classList.add('show');_fbTimer=setTimeout(function(){ $feedback.classList.remove('show'); },1600);}
function applyGameOver(payload,selfId){applyZoneState(false,false);const board=payload.rankingFinal??[];const myPos=board.findIndex(function(r){return r.estudianteId===selfId;});const myData=myPos>=0?board[myPos]:null;const winner=payload.ganador;const ganamos=winner&&winner.estudianteId===selfId;document.getElementById('go-emoji').textContent=ganamos?'🏆':'🚀';const goTit=document.getElementById('go-titulo');goTit.textContent=ganamos?'¡Ganaste la carrera!':'¡Misión terminada!';goTit.className=ganamos?'win':'lose';document.getElementById('go-ganador').textContent=winner?'🥇 '+winner.nombre+' · '+winner.puntaje+' pts':'';document.getElementById('go-pts').textContent=myData?.puntaje??0;document.getElementById('go-pos').textContent=myPos>=0?'#'+(myPos+1):'—';document.getElementById('go-ok').textContent=myData?.aciertos??0;document.getElementById('go-err').textContent=myData?.errores??0;$gameOver.classList.add('show');}
window.__applyGameState=function(state){_state={..._state,...state};if(state.piloto!==undefined||state.puntaje!==undefined){renderPilot(state.piloto??_state.piloto,state.puntaje??_state.puntaje);}if(state.roomKey!==undefined)renderRoom(state.roomKey);if(state.objetivo!==undefined)renderObjetivo(state.objetivo);if(state.meteorito!==undefined||state.canAnswer!==undefined){renderMeteorito(state.meteorito??_state.meteorito,state.canAnswer??_state.canAnswer);applyZoneState(state.canAnswer??_state.canAnswer,state.permiteIgual??true);}if(state.leaderboard!==undefined){renderLeaderboard(state.leaderboard,_state.selfId,_state.puntaje);}if(state.feedback){const f=state.feedback;showFeedback(f.esCorrecto,f.deltaPuntos,f.comboActual,f.puntajeActual);$pts.textContent=f.puntajeActual??_state.puntaje??0;}if(state.gameOver){applyGameOver(state.gameOver,_state.selfId);}if(state.selfId!==undefined)_state.selfId=state.selfId;if(state.status==='connected'){$statusDot.style.background='var(--green)';$statusTxt.textContent='En línea';}else if(state.status==='disconnected'){$statusDot.style.background='var(--danger)';$statusTxt.textContent='Sin señal';}};
portals.forEach(function(portal){portal.addEventListener('click',function(){const value=portal.dataset.z;try{if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'answer',value}));}}catch(_){}});});
</script>
</body>
</html>`;

export const buildArenaState = ({ piloto, selfId, roomKey, objetivo, meteorito, canAnswer, permiteIgual, leaderboard, puntaje, feedback, gameOver, status }) => JSON.stringify({ piloto, selfId, roomKey, objetivo, meteorito, canAnswer, permiteIgual, leaderboard, puntaje, feedback, gameOver, status });

export default function CodigoEstelarArena({
  runtime,
  status,
  onAnswer,
  roomLabel,
  finalization,
  errorMessage,
  isFinalizing,
  onRetryFinalization,
  onReturnToDashboard,
}) {
  const webViewRef = useRef(null);
  const officialFinalization = finalization ?? runtime.finalization ?? null;

  const inject = (payload) => {
    if (!webViewRef.current) return;
    const json = JSON.stringify(payload);
    webViewRef.current.injectJavaScript(
      `window.__applyGameState && window.__applyGameState(${json}); true;`
    );
  };

  useEffect(() => {
    inject({
      piloto: runtime.studentProfile,
      selfId: runtime.studentProfile?.id,
      roomKey: runtime.realtime?.room_key ?? roomLabel,
      objetivo: runtime.gameConfig?.numero_objetivo,
      meteorito: runtime.currentMeteor,
      canAnswer: status === 'playing' && runtime.currentMeteor != null,
      permiteIgual: runtime.gameConfig?.permite_igual ?? true,
      leaderboard: runtime.leaderboard,
      puntaje: runtime.lastFeedback?.puntajeActual,
      feedback: runtime.lastFeedback,
      gameOver: runtime.gameOver ?? null,
      status: 'connected',
    });
  }, [
    runtime.studentProfile,
    runtime.realtime,
    runtime.gameConfig,
    runtime.currentMeteor,
    runtime.leaderboard,
    runtime.lastFeedback,
    runtime.gameOver,
    status,
    roomLabel,
  ]);

  const onMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'answer' && onAnswer) {
        onAnswer(msg.value);
      }
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: buildArenaHtml() }}
        style={styles.webview}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
      />

      {status === 'finished' ? (
        <CodigoEstelarResultsSheet
          runtime={runtime}
          finalization={officialFinalization}
          errorMessage={errorMessage}
          isFinalizing={isFinalizing}
          onRetryFinalization={onRetryFinalization}
          onReturnToDashboard={onReturnToDashboard}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050915' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
