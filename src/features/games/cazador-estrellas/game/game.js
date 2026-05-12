'use strict';

// ═══════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN — constantes nombradas, sin números mágicos
// ═══════════════════════════════════════════════════════════

const DEBUG = false;

const PUNTOS_ACIERTO        = 10;
const PUNTOS_ERROR          = -5;
const PUNTOS_OMISION        = -3;
const TIEMPO_FLASH_MS       = 200;
const TIEMPO_RESULTADO_MS   = 3000;
const LIMITE_INFERIOR_Y     = -11;
const POSICION_SPAWN_Y      = 11;
const RANGO_X               = 7.5;
const CIRCUNFERENCIA_TIMER  = 2 * Math.PI * 23; // ≈ 144.51
const DURACION_DEFECTO_MS   = 15000;
const UMBRAL_URGENCIA_MS    = 5000; // últimos 5 s → timer rojo

const VELOCIDAD_POR_NIVEL = { 1: 0.020, 2: 0.035, 3: 0.050, 4: 0.070 };
const MAX_EN_PANTALLA     = { 1: 3,     2: 5,     3: 6,     4: 8     };
const INTERVALO_SPAWN_MS  = { 1: 2000,  2: 1500,  3: 1200,  4: 800   };

// Colores Babylon que corresponden a cada atributo de color
const MAPA_COLORES = {
  rojo:     new BABYLON.Color3(1.0, 0.20, 0.20),
  azul:     new BABYLON.Color3(0.2, 0.40, 1.00),
  amarillo: new BABYLON.Color3(1.0, 0.90, 0.10),
  verde:    new BABYLON.Color3(0.2, 0.90, 0.30),
  morado:   new BABYLON.Color3(0.7, 0.20, 1.00),
};

function log(...args) { if (DEBUG) console.log('[Cazador]', ...args); }

// ═══════════════════════════════════════════════════════════
// 2. ESTADO DEL JUEGO — único objeto mutable centralizado
// ═══════════════════════════════════════════════════════════

function crearEstadoInicial() {
  return {
    activo:          false,
    pausado:         false,
    config:          null,
    puntaje:         0,
    aciertos:        0,
    errores:         0,
    omisiones:       0,
    eventos:         [],
    estrellas:       [],   // { mesh, datos, tiempoSpawn, esCorrecta, activa }
    tiempoInicio:    0,
    duracionMs:      DURACION_DEFECTO_MS,
    spawnTimer:      null,
    tiempoReacciones: [],
  };
}

let estado = crearEstadoInicial();

// ═══════════════════════════════════════════════════════════
// 3. INICIALIZACIÓN DE BABYLON — engine, scene, cámara, luz
// ═══════════════════════════════════════════════════════════

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
});

const scene = new BABYLON.Scene(engine);
// Transparente: la nebulosa CSS se ve a través del canvas
scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

// Cámara fija mirando al origen — vista 2D de las estrellas que caen
const camara = new BABYLON.FreeCamera('camara', new BABYLON.Vector3(0, 0, -20), scene);
camara.setTarget(BABYLON.Vector3.Zero());
camara.minZ = 0.1;

const luzAmbiental = new BABYLON.HemisphericLight('luz', new BABYLON.Vector3(0, 1, 0), scene);
luzAmbiental.intensity = 0.25;

// GlowLayer hace que las estrellas brillen sin texturas externas
const capaResplandor = new BABYLON.GlowLayer('resplandor', scene);
capaResplandor.intensity = 1.1;

// ═══════════════════════════════════════════════════════════
// 4. FONDO — campo de 200 estrellas lejanas estáticas
// ═══════════════════════════════════════════════════════════

(function crearCampoEstelar() {
  // Un solo material compartido para todas las estrellas del fondo
  const mat = new BABYLON.StandardMaterial('matFondo', scene);
  mat.emissiveColor   = new BABYLON.Color3(1, 1, 1);
  mat.disableLighting = true;

  for (let i = 0; i < 200; i++) {
    const s = BABYLON.MeshBuilder.CreateSphere(`fondo_${i}`, {
      diameter: 0.04 + Math.random() * 0.07,
      segments: 3,
    }, scene);
    s.position.set(
      (Math.random() - 0.5) * 38,
      (Math.random() - 0.5) * 30,
      Math.random() * 10 + 3,
    );
    s.material    = mat;
    s.isPickable  = false;
  }
})();

// ═══════════════════════════════════════════════════════════
// 5. FÁBRICA DE ESTRELLAS — crea un mesh con sus atributos
// ═══════════════════════════════════════════════════════════

function fabricarEstrella(datos) {
  const uid  = `${datos.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  // Dodecaedro (type 3) → aspecto facetado de estrella 3D
  const mesh = BABYLON.MeshBuilder.CreatePolyhedron(uid, { type: 3, size: 0.45 }, scene);

  mesh.position.set(
    (Math.random() - 0.5) * RANGO_X * 2,
    POSICION_SPAWN_Y,
    0,
  );

  const colorBabylon = MAPA_COLORES[datos.color] ?? MAPA_COLORES.rojo;
  const material     = new BABYLON.StandardMaterial(`${uid}_mat`, scene);
  material.emissiveColor = colorBabylon;
  material.diffuseColor  = colorBabylon;
  mesh.material = material;

  const esCorrecta = evaluarCondicion(datos, estado.config.condicion);

  const registro = { mesh, datos, uid, tiempoSpawn: Date.now(), esCorrecta, activa: true };

  registrarDeteccionTap(mesh, registro);
  estado.estrellas.push(registro);
  return registro;
}

// ═══════════════════════════════════════════════════════════
// 6. SISTEMA DE SPAWN — controla cuántas estrellas hay en pantalla
// ═══════════════════════════════════════════════════════════

function iniciarSpawn() {
  const nivel        = estado.config.nivel;
  const intervaloMs  = INTERVALO_SPAWN_MS[nivel]  ?? INTERVALO_SPAWN_MS[1];
  const maxSimultaneos = MAX_EN_PANTALLA[nivel]   ?? MAX_EN_PANTALLA[1];

  function ciclo() {
    if (!estado.activo || estado.pausado) return;

    const enPantalla = estado.estrellas.filter(e => e.activa).length;
    if (enPantalla < maxSimultaneos) {
      const objetos = estado.config.objetos;
      const datos   = objetos[Math.floor(Math.random() * objetos.length)];
      fabricarEstrella(datos);
    }
    estado.spawnTimer = setTimeout(ciclo, intervaloMs);
  }
  ciclo();
}

function detenerSpawn() {
  clearTimeout(estado.spawnTimer);
  estado.spawnTimer = null;
}

// ═══════════════════════════════════════════════════════════
// 7. SISTEMA DE CAÍDA — mueve estrellas frame a frame
// ═══════════════════════════════════════════════════════════

function actualizarCaida() {
  if (!estado.activo || estado.pausado) return;

  const velocidad = VELOCIDAD_POR_NIVEL[estado.config?.nivel] ?? VELOCIDAD_POR_NIVEL[1];

  for (const reg of estado.estrellas) {
    if (!reg.activa) continue;
    reg.mesh.position.y -= velocidad;
    reg.mesh.rotation.x += 0.018;
    reg.mesh.rotation.y += 0.013;

    if (reg.mesh.position.y < LIMITE_INFERIOR_Y) {
      manejarEstrellaSaliente(reg);
    }
  }
  // Purgar del array las que ya no están activas
  estado.estrellas = estado.estrellas.filter(e => e.activa);
}

function manejarEstrellaSaliente(reg) {
  reg.activa = false;
  if (reg.esCorrecta) aplicarOmision(reg);
  // Estrella incorrecta que llega al fondo → sin penalización
  if (!reg.mesh.isDisposed()) reg.mesh.dispose();
}

// ═══════════════════════════════════════════════════════════
// 8. DETECCIÓN DE TAP — ActionManager de Babylon
// ═══════════════════════════════════════════════════════════

function registrarDeteccionTap(mesh, registro) {
  mesh.actionManager = new BABYLON.ActionManager(scene);
  mesh.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(
      BABYLON.ActionManager.OnPickTrigger,
      () => handleTap(registro),
    )
  );
}

function handleTap(registro) {
  if (!estado.activo || estado.pausado || !registro.activa) return;

  const tiempoReaccionMs = Date.now() - registro.tiempoSpawn;
  registro.activa = false;

  estado.eventos.push({
    objeto_id:    registro.datos.id,
    correcto:     registro.esCorrecta,
    tiempo_ms:    tiempoReaccionMs,
    tipo_accion:  'tocado',
  });

  if (registro.esCorrecta) {
    aplicarAcierto(registro, tiempoReaccionMs);
  } else {
    aplicarError(registro);
  }

  if (!registro.mesh.isDisposed()) registro.mesh.dispose();
}

// ═══════════════════════════════════════════════════════════
// 9. EVALUACIÓN DE CONDICIÓN — función pura sin efectos
// ═══════════════════════════════════════════════════════════

function evaluarCondicion(objeto, condicion) {
  switch (condicion.atributo) {
    case 'color':
      return objeto.color === condicion.valor;
    case 'puntas':
      return objeto.puntas === condicion.valor;
    case 'color_y_puntas':
      return objeto.color === condicion.valor.color
          && objeto.puntas === condicion.valor.puntas;
    default:
      log('Atributo de condición desconocido:', condicion.atributo);
      return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 10. SISTEMA DE PUNTUACIÓN — aplica reglas y actualiza estado
// ═══════════════════════════════════════════════════════════

function aplicarAcierto(registro, tiempoReaccionMs) {
  estado.aciertos++;
  estado.tiempoReacciones.push(tiempoReaccionMs);
  estado.puntaje += PUNTOS_ACIERTO;
  animarPuntaje(true);
  actualizarPuntajeUI();
  efectoExplosionAcierto(
    registro.mesh.position.clone(),
    registro.mesh.material.emissiveColor.clone(),
  );
}

function aplicarError(registro) {
  estado.errores++;
  estado.puntaje += PUNTOS_ERROR;
  animarPuntaje(false);
  actualizarPuntajeUI();
  efectoFlashError();
}

function aplicarOmision(registro) {
  estado.omisiones++;
  estado.puntaje += PUNTOS_OMISION;
  actualizarPuntajeUI();
  estado.eventos.push({
    objeto_id:   registro.datos.id,
    correcto:    true,
    tiempo_ms:   null,
    tipo_accion: 'omitido',
  });
}

// ═══════════════════════════════════════════════════════════
// 11. EFECTOS VISUALES — explosión de partículas y flash
// ═══════════════════════════════════════════════════════════

function efectoExplosionAcierto(posicion, color) {
  const CANTIDAD    = 9;
  const VIDA_FRAMES = 24;

  for (let i = 0; i < CANTIDAD; i++) {
    const p = BABYLON.MeshBuilder.CreateSphere(`fx_${i}_${Date.now()}`, {
      diameter: 0.12, segments: 3,
    }, scene);
    p.position.copyFrom(posicion);
    p.isPickable = false;

    const mat = new BABYLON.StandardMaterial(`fxm_${i}_${Date.now()}`, scene);
    mat.emissiveColor = color;
    p.material = mat;

    const vx = (Math.random() - 0.5) * 0.30;
    const vy = (Math.random() - 0.5) * 0.30;
    let vida = VIDA_FRAMES;

    const obs = scene.onBeforeRenderObservable.add(() => {
      p.position.x += vx;
      p.position.y += vy;
      vida--;
      if (vida <= 0) {
        p.dispose();
        scene.onBeforeRenderObservable.remove(obs);
      }
    });
  }
}

function efectoFlashError() {
  const flash = document.getElementById('flash-error');
  flash.classList.add('visible');
  setTimeout(() => flash.classList.remove('visible'), TIEMPO_FLASH_MS);
}

// ═══════════════════════════════════════════════════════════
// 12. ACTUALIZACIÓN DE UI — sincroniza el DOM con el estado
// ═══════════════════════════════════════════════════════════

const elPuntajeValor = document.getElementById('puntaje-valor');
const elTimerRing    = document.getElementById('timer-ring');
const elTimerTexto   = document.getElementById('timer-texto');
const elCondicion    = document.getElementById('condicion-texto');
const elResultado    = document.getElementById('resultado-ronda');

function actualizarPuntajeUI() {
  elPuntajeValor.textContent = estado.puntaje;
}

function animarPuntaje(esAcierto) {
  const clase = esAcierto ? 'animar-suma' : 'animar-resta';
  elPuntajeValor.classList.add(clase);
  setTimeout(() => elPuntajeValor.classList.remove(clase), 300);
}

function actualizarTimerUI(msRestantes) {
  const segundos   = Math.ceil(msRestantes / 1000);
  const progreso   = msRestantes / estado.duracionMs;         // 1 → 0
  const dashOffset = CIRCUNFERENCIA_TIMER * (1 - progreso);   // 0 → 144.51

  elTimerTexto.textContent           = segundos;
  elTimerRing.style.strokeDashoffset = dashOffset;

  if (msRestantes <= UMBRAL_URGENCIA_MS) {
    elTimerRing.classList.add('urgente');
  } else {
    elTimerRing.classList.remove('urgente');
  }
}

function mostrarResultadoRonda() {
  document.getElementById('res-aciertos').textContent  = estado.aciertos;
  document.getElementById('res-errores').textContent   = estado.errores;
  document.getElementById('res-omisiones').textContent = estado.omisiones;
  document.getElementById('res-puntaje').textContent   = estado.puntaje;
  elResultado.classList.add('visible');
  setTimeout(() => elResultado.classList.remove('visible'), TIEMPO_RESULTADO_MS);
}

// ═══════════════════════════════════════════════════════════
// 13. TIMER — controla la duración exacta de cada ronda
// ═══════════════════════════════════════════════════════════

function actualizarTimer() {
  if (!estado.activo || estado.pausado) return;

  const msTranscurridos = Date.now() - estado.tiempoInicio;
  const msRestantes     = Math.max(0, estado.duracionMs - msTranscurridos);

  actualizarTimerUI(msRestantes);

  if (msRestantes <= 0) terminarRonda();
}

// ═══════════════════════════════════════════════════════════
// 14. COMUNICACIÓN — escucha RN, envía resultado al terminar
// ═══════════════════════════════════════════════════════════

function iniciarRonda(config) {
  // Limpiar cualquier estrella residual de la ronda anterior
  estado.estrellas.forEach(e => { if (!e.mesh.isDisposed()) e.mesh.dispose(); });

  estado              = crearEstadoInicial();
  estado.config       = config;
  estado.duracionMs   = config.duracion_ms ?? DURACION_DEFECTO_MS;
  estado.activo       = true;
  estado.tiempoInicio = Date.now();

  elCondicion.textContent = config.condicion.texto;
  actualizarPuntajeUI();
  actualizarTimerUI(estado.duracionMs);

  iniciarSpawn();
  log('Ronda iniciada:', config);
}

function terminarRonda() {
  if (!estado.activo) return;
  estado.activo = false;
  detenerSpawn();

  estado.estrellas.forEach(e => { if (!e.mesh.isDisposed()) e.mesh.dispose(); });
  estado.estrellas = [];

  const tiempoReaccionPromedio = estado.tiempoReacciones.length > 0
    ? Math.round(estado.tiempoReacciones.reduce((a, b) => a + b, 0) / estado.tiempoReacciones.length)
    : null;

  const payload = {
    tipo: 'ronda_terminada',
    resultados: {
      puntaje:                     estado.puntaje,
      aciertos:                    estado.aciertos,
      errores:                     estado.errores,
      omisiones:                   estado.omisiones,
      tiempo_reaccion_promedio_ms: tiempoReaccionPromedio,
      eventos:                     estado.eventos,
    },
  };

  mostrarResultadoRonda();

  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } else {
      log('postMessage (mock):', payload);
    }
  } catch (err) {
    log('Error al enviar resultado a RN:', err);
  }
}

// Escucha mensajes provenientes de React Native
window.addEventListener('message', (event) => {
  try {
    const mensaje = JSON.parse(event.data);
    if (mensaje.tipo === 'init') {
      iniciarRonda(mensaje.config);
    } else {
      log('Tipo de mensaje desconocido:', mensaje.tipo);
    }
  } catch (err) {
    log('Error al parsear mensaje de RN:', err);
  }
});

// ═══════════════════════════════════════════════════════════
// 15. LOOP PRINCIPAL — render loop con todas las actualizaciones
// ═══════════════════════════════════════════════════════════

engine.runRenderLoop(() => {
  actualizarCaida();
  actualizarTimer();
  scene.render();
});

window.addEventListener('resize', () => engine.resize());

// MODO DESARROLLO ACTIVO
// ═══════════════════════════════════════════════════════════
// MODO DESARROLLO — descomentar para probar en navegador
// Simula el mensaje que enviaría React Native
// ═══════════════════════════════════════════════════════════
window.addEventListener('load', () => {
  window.dispatchEvent(new MessageEvent('message', {
    data: JSON.stringify({
      tipo: "init",
      config: {
        nivel: 1,
        duracion_ms: 15000,
        condicion: {
          atributo: "color",
          valor: "rojo",
          texto: "¡Atrapa solo las estrellas ROJAS!"
        },
        objetos: [
          { id: "obj_1", color: "rojo",     puntas: 5 },
          { id: "obj_2", color: "azul",     puntas: 4 },
          { id: "obj_3", color: "amarillo", puntas: 6 },
          { id: "obj_4", color: "rojo",     puntas: 3 },
          { id: "obj_5", color: "verde",    puntas: 5 },
          { id: "obj_6", color: "azul",     puntas: 5 }
        ]
      }
    })
  }));
});
// FIN MODO DESARROLLO
