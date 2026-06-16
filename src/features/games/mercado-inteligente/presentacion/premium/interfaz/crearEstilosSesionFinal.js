export function crearEstilosSesionFinal() {
  return `
    .mercado-sesion-final{position:fixed;inset:0;z-index:35;display:block;overflow:hidden;pointer-events:none;color:#5a2f17;font-family:"Arial Rounded MT Bold","Cooper Black","Trebuchet MS",sans-serif;--safe-left:max(22px,env(safe-area-inset-left));--safe-right:max(22px,env(safe-area-inset-right));--safe-y:max(8px,env(safe-area-inset-top),env(safe-area-inset-bottom));background:#f4c46a}
    .mercado-sesion-final__stage{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;background:#f7ca72 var(--mercado-escenario-fondo) center/cover no-repeat;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
    .mercado-sesion-final__velo{position:absolute;inset:0;z-index:0;background:linear-gradient(180deg,rgba(69,30,6,.08),rgba(58,27,8,.28));backdrop-filter:blur(2.8px);pointer-events:none}
    .mercado-sesion-final__velo::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 25%,rgba(255,233,94,.34),transparent 34%),radial-gradient(ellipse at 50% 82%,rgba(65,154,38,.18),transparent 30%)}
    .mercado-sesion-final .mercado-resultado__confeti-capa{z-index:11;opacity:.96}

    .mercado-sesion-final__banner{position:absolute;z-index:10;top:calc(var(--safe-y) + 1.2%);left:20%;right:20%;height:13.8%;display:grid;place-items:center;padding:0 3.2%;text-align:center;color:#fff;background:linear-gradient(180deg,#baff6e 0%,#58d64b 48%,#1f8d31 100%);border:5px solid #2a8230;border-radius:0 0 32px 32px;box-shadow:0 8px 0 #176322,0 14px 24px rgba(42,24,7,.34),inset 0 4px 0 rgba(255,255,255,.5),inset 0 -7px 0 rgba(25,117,36,.26);pointer-events:auto;animation:mercado-sesion-caida .44s cubic-bezier(.2,1.2,.35,1) both}
    .mercado-sesion-final__banner::before,.mercado-sesion-final__banner::after{content:"";position:absolute;top:16%;width:17%;height:46%;background:linear-gradient(180deg,#b86d2e,#774117);border:4px solid #6a3515;border-radius:5px;box-shadow:0 7px 0 rgba(78,36,13,.26);z-index:-1}
    .mercado-sesion-final__banner::before{left:-15%;transform:skewY(-12deg)}
    .mercado-sesion-final__banner::after{right:-15%;transform:skewY(12deg)}
    .mercado-sesion-final__banner h1{max-width:100%;margin:0;overflow:hidden;font-size:clamp(22px,3vw,44px);font-weight:900;line-height:.92;text-transform:uppercase;letter-spacing:-.035em;text-shadow:0 4px 0 #276b25,0 0 10px rgba(50,117,31,.45);text-wrap:balance}

    .mercado-sesion-final__jugador{position:absolute;z-index:12;top:calc(var(--safe-y) + 4.4%);left:calc(var(--safe-left) + 3.5%);width:11.4%;min-width:104px;max-width:156px;height:25.5%;min-height:112px;display:grid;grid-template-rows:1fr auto auto;justify-items:center;align-content:center;padding:6px;color:#5a3018;background:transparent;border:0;border-radius:23px;box-shadow:none;pointer-events:auto;isolation:isolate;overflow:visible}
    .mercado-sesion-final__avatar{display:grid;place-items:center;width:76%;height:74%;min-height:58px}
    .mercado-sesion-final__avatar-svg{display:block;width:100%;height:100%;filter:drop-shadow(0 4px 0 rgba(91,49,20,.16))}
    .mercado-sesion-final__jugador-nombre{position:relative;z-index:2;display:block;width:100%;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-size:clamp(8px,.9vw,13px);font-weight:1000;line-height:.95;text-shadow:0 2px 0 rgba(255,246,212,.72)}
    .mercado-sesion-final__jugador>span{position:relative;z-index:2;font-size:clamp(10px,1.05vw,15px);font-weight:1000;line-height:.9;text-shadow:0 2px 0 rgba(255,246,212,.72)}
    .mercado-sesion-final__jugador>i{position:absolute;right:-12px;top:-13px;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#ffd03e;color:#fff6b8;border:4px solid #995619;box-shadow:0 4px 0 rgba(91,49,20,.28);font-size:23px;font-style:normal}

    .mercado-sesion-final__celebracion{position:absolute;z-index:8;top:14.2%;left:18%;right:12%;height:37.8%;display:grid;grid-template-columns:27% 42% 31%;align-items:center;justify-items:center;pointer-events:none}
    .mercado-sesion-final__diploma{position:relative;width:94%;height:78%;transform:rotate(-8deg) translateY(6%);filter:drop-shadow(0 9px 0 rgba(70,35,13,.22));animation:mercado-sesion-entrada-izq .54s cubic-bezier(.2,1.1,.35,1) .12s both}
    .mercado-sesion-final__medallon{position:absolute;left:-7%;top:11%;z-index:2;width:42%;aspect-ratio:1;border-radius:50%;background:#91ecff;border:6px solid #3286a5;box-shadow:0 5px 0 rgba(74,38,14,.25);display:grid;place-items:center}
    .mercado-sesion-final__medallon .mercado-sesion-final__avatar-svg{width:86%;height:86%}
    .mercado-sesion-final__medallon span{position:absolute;left:-6%;top:-18%;font-size:clamp(16px,2vw,31px);color:#ffc93b;text-shadow:0 3px 0 #9a5416}
    .mercado-sesion-final__diploma-svg,.mercado-sesion-final__diploma-asset{position:absolute;inset:4% -4% -2% -10%;width:118%;height:100%;object-fit:contain;filter:drop-shadow(0 9px 0 rgba(56,28,9,.18)) drop-shadow(0 12px 18px rgba(56,28,9,.18))}
    .mercado-sesion-final__diploma strong{display:none}
    .mercado-sesion-final__trofeo{position:relative;width:92%;height:100%;display:grid;place-items:center;animation:mercado-sesion-pop .66s cubic-bezier(.18,1.25,.32,1) .22s both}
    .mercado-sesion-final__trofeo-svg,.mercado-sesion-final__trofeo-asset{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 12px 0 rgba(74,38,14,.24)) drop-shadow(0 0 24px rgba(255,221,54,.34))}
    .mercado-sesion-final__trofeo-nivel{position:absolute;left:50%;top:73%;display:grid;place-items:center;transform:translate(-50%,-50%);color:#fff4c8;font-size:clamp(18px,2.7vw,40px);font-weight:900;text-shadow:0 4px 0 #9b5716,0 0 8px rgba(255,224,73,.4)}
    .mercado-sesion-final__estrellas{display:flex;align-items:center;justify-content:center;gap:3%;width:100%;height:72%;transform:translateX(-2%) rotate(5deg);animation:mercado-sesion-entrada-der .5s cubic-bezier(.2,1.1,.35,1) .28s both}
    .mercado-sesion-final__estrella{display:block;width:32%;aspect-ratio:1;filter:drop-shadow(0 7px 0 rgba(77,39,13,.22)) drop-shadow(0 0 12px rgba(255,216,57,.38))}
    .mercado-sesion-final__estrella-svg{width:100%;height:100%}
    .mercado-sesion-final__estrella--activa{animation:mercado-sesion-estrella 1.55s ease-in-out infinite}
    .mercado-sesion-final__estrella:nth-child(2){transform:scale(1.12) translateY(-5%)}
    .mercado-sesion-final__estrella:nth-child(3){transform:rotate(9deg) translateY(7%)}

    .mercado-sesion-final__resumen{position:absolute;z-index:10;left:22.4%;right:auto;top:53.8%;width:55.2%;height:21%;min-height:0;display:grid;grid-template-columns:1fr 1fr 1.18fr;padding:1.15% 1.55%;color:#5b3019;background:linear-gradient(180deg,#fff7d8 0%,#ffd99a 100%);border:5px solid #7a431f;border-radius:26px;box-shadow:0 8px 0 #5a2d16,0 14px 22px rgba(55,28,8,.28),inset 0 4px 0 rgba(255,255,255,.58);pointer-events:auto;animation:mercado-sesion-subir .48s ease-out .16s both}
    .mercado-sesion-final__resumen article{display:grid;grid-template-columns:43px 1fr;align-content:center;padding:0 14px;border-right:2px solid rgba(112,62,27,.22)}
    .mercado-sesion-final__resumen article:last-child{border-right:0}
    .mercado-sesion-final__resumen-icono{grid-row:1/4;align-self:center;display:grid;place-items:center;width:39px;height:39px;border-radius:50%;background:transparent;color:#fff;border:0;font-size:25px;font-weight:900;box-shadow:0 3px 0 rgba(63,35,12,.12)}
    .mercado-sesion-final__resumen-icono svg{display:block;width:100%;height:100%;filter:drop-shadow(0 3px 0 rgba(63,35,12,.18))}
    .mercado-sesion-final__resumen strong{font-size:clamp(10px,1.16vw,17px);text-transform:uppercase;line-height:1.02}
    .mercado-sesion-final__resumen b{font-size:clamp(26px,3.2vw,43px);line-height:.95}
    .mercado-sesion-final__resumen small{font-size:clamp(8px,.78vw,12px);font-weight:900;text-transform:uppercase}
    .mercado-sesion-final__resumen article:nth-child(2) .mercado-sesion-final__resumen-icono{background:transparent;border-color:transparent;color:#fff8c6}
    .mercado-sesion-final__estadisticas{display:flex!important;flex-direction:column;justify-content:center;gap:2px}
    .mercado-sesion-final__estadisticas span{font-size:clamp(9px,1.02vw,15px);font-weight:900;text-transform:uppercase}

    .mercado-sesion-final__mensaje{position:absolute;z-index:12;left:31.5%;right:auto;top:80.1%;width:37%;height:9.5%;min-height:0;display:grid;place-items:center;margin:0;padding:0 2.8%;color:#5b3019;background:#fff9e7;border:4px solid #8a4a20;border-radius:20px;box-shadow:0 6px 0 #623117;text-align:center;font-size:clamp(11px,1.18vw,18px);font-weight:900;line-height:1.08;pointer-events:auto}
    .mercado-sesion-final__mensaje::after{content:"";position:absolute;right:-21px;top:38%;border-left:23px solid #fff9e7;border-top:15px solid transparent;border-bottom:15px solid transparent;filter:drop-shadow(4px 2px 0 #8a4a20)}
    .mercado-sesion-final__mensaje small{display:none}

    .mercado-sesion-final__historial,.mercado-sesion-final__tablero{position:absolute;z-index:13;bottom:auto;display:flex;align-items:center;justify-content:center;gap:8px;border:5px solid rgba(65,44,18,.34);font-weight:900;text-transform:uppercase;cursor:pointer;pointer-events:auto;text-shadow:0 3px 0 rgba(29,83,30,.38)}
    .mercado-sesion-final__historial{left:calc(var(--safe-left) + 3%);top:76.3%;width:22%;min-width:150px;height:16.5%;min-height:72px;padding:7px;color:#fff;background:linear-gradient(180deg,#8add65,#37ab46);border-radius:22px;box-shadow:0 8px 0 #1f6e35,0 12px 18px rgba(38,24,8,.24);font-size:clamp(15px,1.62vw,24px);line-height:.86;letter-spacing:-.055em;-webkit-text-stroke:.85px rgba(34,86,35,.55)}
    .mercado-sesion-final__historial span{display:grid;place-items:center;width:30px;height:30px;font-size:29px;flex:0 0 auto}
    .mercado-sesion-final__historial svg{display:block;width:100%;height:100%;filter:drop-shadow(0 2px 0 rgba(25,89,40,.28))}
    .mercado-sesion-final__historial:disabled{cursor:default;filter:saturate(.78);opacity:.92}
    .mercado-sesion-final__tablero{right:calc(var(--safe-right) + 3%);top:76.1%;width:27%;min-width:190px;height:17%;min-height:78px;padding:8px;color:#fff;background:linear-gradient(180deg,#61dff9,#168bd6 66%,#0e6fb2);border-radius:24px;box-shadow:0 8px 0 #075785,0 12px 20px rgba(38,24,8,.28);font-size:clamp(18px,2.08vw,31px);line-height:.84;letter-spacing:-.065em;text-shadow:0 4px 0 rgba(15,78,120,.72),0 0 8px rgba(255,255,255,.45);-webkit-text-stroke:.7px rgba(7,84,130,.6);animation:mercado-tablero-respirar 1.9s ease-in-out infinite}
    .mercado-sesion-final__tablero span,.mercado-sesion-final__tablero i{display:grid;place-items:center;width:31px;height:31px;font-size:28px;font-style:normal;flex:0 0 auto}
    .mercado-sesion-final__tablero svg{display:block;width:100%;height:100%;filter:drop-shadow(0 2px 0 rgba(13,77,119,.32))}
    .mercado-sesion-final__tablero:disabled{animation:none;filter:grayscale(.15);opacity:.78}
    .mercado-sesion-final__tablero:active{transform:translateY(5px)}


    .mercado-sesion-final__banner,
    .mercado-sesion-final__resumen,
    .mercado-sesion-final__mensaje,
    .mercado-sesion-final__historial,
    .mercado-sesion-final__tablero{isolation:isolate;overflow:visible}
    .mercado-sesion-final__jugador-asset,
    .mercado-sesion-final__banner-asset,
    .mercado-sesion-final__resumen-asset,
    .mercado-sesion-final__mensaje-asset,
    .mercado-sesion-final__boton-asset,
    .mercado-sesion-final__confeti-premium{position:absolute;pointer-events:none;user-select:none;-webkit-user-drag:none}
    .mercado-sesion-final__jugador-asset{z-index:0;inset:-10% -10% -10%;width:120%;height:120%;object-fit:contain;filter:drop-shadow(0 8px 0 rgba(73,38,16,.28)) drop-shadow(0 12px 18px rgba(54,27,8,.2))}
    .mercado-sesion-final__banner{background:transparent;border-color:transparent;box-shadow:none}
    .mercado-sesion-final__banner::before,.mercado-sesion-final__banner::after{display:none}
    .mercado-sesion-final__banner-asset{z-index:0;inset:-18% -12% -24%;width:124%;height:142%;object-fit:fill;filter:drop-shadow(0 14px 14px rgba(54,28,10,.26))}
    .mercado-sesion-final__banner h1{position:relative;z-index:1}
    .mercado-sesion-final__resumen{background:transparent;border-color:transparent;box-shadow:none}
    .mercado-sesion-final__resumen-asset{z-index:-1;inset:-13% -4% -16%;width:108%;height:129%;object-fit:fill;filter:drop-shadow(0 10px 0 rgba(90,45,22,.42)) drop-shadow(0 14px 18px rgba(55,28,8,.2))}
    .mercado-sesion-final__mensaje{background:transparent;border-color:transparent;box-shadow:none}
    .mercado-sesion-final__mensaje-asset{z-index:-1;inset:-26% -7% -34%;width:114%;height:160%;object-fit:fill;filter:drop-shadow(0 7px 0 rgba(98,49,23,.38))}
    .mercado-sesion-final__mensaje>span{position:relative;z-index:1}
    .mercado-sesion-final__historial,.mercado-sesion-final__tablero{background:transparent;border-color:transparent;box-shadow:none;text-shadow:0 3px 0 rgba(37,74,31,.42)}
    .mercado-sesion-final__boton-asset{z-index:0;inset:-12% -7% -18%;width:114%;height:130%;object-fit:fill;filter:drop-shadow(0 8px 0 rgba(31,63,34,.35)) drop-shadow(0 13px 18px rgba(38,24,8,.22))}
    .mercado-sesion-final__historial>span,.mercado-sesion-final__historial>strong,.mercado-sesion-final__tablero>span,.mercado-sesion-final__tablero>strong,.mercado-sesion-final__tablero>i{position:relative;z-index:1}
    .mercado-sesion-final__icono-asset,.mercado-sesion-final__boton-icono-asset{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 3px 0 rgba(63,35,12,.16))}
    .mercado-sesion-final__historial strong,.mercado-sesion-final__tablero strong{max-width:78%;font-weight:1000;text-align:center;text-wrap:balance;letter-spacing:inherit}
    .mercado-sesion-final__estrella-asset{display:block;width:100%;height:100%;object-fit:contain}
    .mercado-sesion-final__confeti-premium{z-index:12;inset:0;width:100%;height:100%;object-fit:cover;opacity:.84;animation:mercado-sesion-confeti-premium 2.6s ease-in-out infinite alternate}
    @keyframes mercado-sesion-caida{from{transform:translateY(-42%) scale(.96);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    @keyframes mercado-sesion-pop{0%{transform:scale(.58);opacity:0}72%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
    @keyframes mercado-sesion-subir{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes mercado-sesion-entrada-izq{from{transform:translateX(-28px) rotate(-12deg);opacity:0}to{transform:translateX(0) rotate(-8deg) translateY(6%);opacity:1}}
    @keyframes mercado-sesion-entrada-der{from{transform:translateX(28px) rotate(9deg);opacity:0}to{transform:translateX(-2%) rotate(5deg);opacity:1}}
    @keyframes mercado-sesion-estrella{50%{filter:drop-shadow(0 7px 0 rgba(77,39,13,.22)) drop-shadow(0 0 18px rgba(255,221,60,.75));transform:translateY(-3%) scale(1.04)}}
    @keyframes mercado-tablero-respirar{50%{filter:brightness(1.1) drop-shadow(0 0 14px rgba(89,221,255,.44))}}
    @keyframes mercado-sesion-confeti-premium{from{transform:translate3d(0,-1.2%,0) scale(1);opacity:.7}to{transform:translate3d(0,1.2%,0) scale(1.02);opacity:.96}}

    @media(max-height:540px){.mercado-sesion-final{--safe-left:max(12px,env(safe-area-inset-left));--safe-right:max(12px,env(safe-area-inset-right));--safe-y:max(5px,env(safe-area-inset-top),env(safe-area-inset-bottom))}.mercado-sesion-final__banner{left:24%;right:24%;height:12%;padding:0 10px;border-width:4px;border-radius:0 0 18px 18px}.mercado-sesion-final__banner h1{font-size:clamp(15px,2.55vw,26px)}.mercado-sesion-final__jugador{top:calc(var(--safe-y) + 3.6%);left:calc(var(--safe-left) + 2.4%);width:10.8%;min-width:84px;height:23%;min-height:82px;padding:4px;border-width:3px;border-radius:17px}.mercado-sesion-final__avatar{min-height:50px}.mercado-sesion-final__jugador>span{font-size:8px}.mercado-sesion-final__jugador>i{width:26px;height:26px;right:-8px;top:-8px;border-width:3px;font-size:14px}.mercado-sesion-final__celebracion{top:14%;left:20%;right:13%;height:34%;grid-template-columns:29% 40% 31%}.mercado-sesion-final__trofeo-nivel{top:73%;font-size:clamp(14px,2.2vw,24px)}.mercado-sesion-final__resumen{left:24.1%;top:53.5%;width:51.6%;height:20.5%;padding:.7% 1.2%;border-width:3px;border-radius:16px;box-shadow:0 5px 0 #5a2d16}.mercado-sesion-final__resumen article{grid-template-columns:26px 1fr;padding:0 8px}.mercado-sesion-final__resumen-icono{width:25px;height:25px;border-width:3px;font-size:15px}.mercado-sesion-final__resumen strong,.mercado-sesion-final__estadisticas span{font-size:8px}.mercado-sesion-final__resumen b{font-size:20px}.mercado-sesion-final__resumen small{font-size:7px}.mercado-sesion-final__mensaje{left:31%;top:80.4%;width:38%;height:8.7%;padding:0 1.8%;font-size:8px;border-width:3px;border-radius:12px;box-shadow:0 4px 0 #623117}.mercado-sesion-final__historial{left:calc(var(--safe-left) + 3%);top:76.1%;width:22%;min-width:96px;height:16%;min-height:46px;font-size:clamp(13px,1.75vw,18px);line-height:.84;border-width:3px;border-radius:14px}.mercado-sesion-final__historial span{width:18px;height:18px;font-size:16px}.mercado-sesion-final__tablero{right:calc(var(--safe-right) + 3%);top:75.8%;width:24%;min-width:112px;height:17%;min-height:50px;font-size:clamp(14px,1.9vw,20px);line-height:.82;border-width:3px;border-radius:14px}.mercado-sesion-final__tablero span,.mercado-sesion-final__tablero i{width:19px;height:19px;font-size:17px}}
    @media(max-width:760px) and (max-height:430px){.mercado-sesion-final{--safe-left:max(24px,env(safe-area-inset-left));--safe-right:max(24px,env(safe-area-inset-right))}.mercado-sesion-final__banner{left:25%;right:25%}.mercado-sesion-final__jugador{min-width:80px}.mercado-sesion-final__celebracion{left:20%;right:17%}.mercado-sesion-final__resumen{left:23%;width:54%}.mercado-sesion-final__mensaje{left:29%;width:42%}.mercado-sesion-final__historial{min-width:92px}.mercado-sesion-final__tablero{min-width:108px;animation:none}}
  `;
}





