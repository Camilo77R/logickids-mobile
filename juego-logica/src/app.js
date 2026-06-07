 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * App - Clase Principal de la Aplicación
 * Orquesta todos los módulos y gestiona el ciclo de vida del juego.
 */


import { StoryIntro } from './ui/StoryIntro';

import { HandTracker } from './shared/HandTracker';
import { DebugComponent } from './ui/DebugComponent';
import { Footer } from './ui/Footer';
import { HintComponent } from './ui/HintComponent';
import { LandingPage } from './ui/LandingPage';
import { ModeIndicator } from './ui/ModeIndicator';
import { StatusIndicator } from './ui/StatusIndicator';
import { DeviceBanner } from './ui/DeviceBanner';

// Lazy-loadable: the WorkshopController pulls in @babylonjs/core
// (~1.5MB gzipped). Importing it statically would block the landing
// page on a 6.9MB JS download, even though the user might not pick
// the workshop mode at all. Loaded on demand via _loadWorkshop().
//
// The promise is cached, so multiple callers share the same in-flight
// download. A 45-second race timeout protects against the dev server
// hanging while bundling Babylon on the fly (which is what happens on
// mobile when Vite hasn't pre-bundled the dependency yet).
const WORKSHOP_LOAD_TIMEOUT_MS = 45000;
let _workshopModulePromise = null;
function _loadWorkshop() {
  if (!_workshopModulePromise) {
    const download = import('./iron-man-workshop/WorkshopController');
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(
        'La descarga del taller 3D tardó demasiado. ' +
        'Si estás en modo desarrollo, reinicia el servidor (Ctrl+C, ' +
        'borra node_modules/.vite, npm run dev) para que Vite ' +
        'pre-bundlee Babylon. En producción este aviso no debería salir.'
      )), WORKSHOP_LOAD_TIMEOUT_MS);
    });
    _workshopModulePromise = Promise.race([download, timeout]);
  }
  return _workshopModulePromise;
}

/**
 * Show a full-screen "loading 3D workshop" overlay. Returned function
 * hides it. Used between the story intro and the workshop being
 * ready, so the user has a clear visual signal that the app is still
 * working (especially on mobile where a blank screen looks like a
 * crash).
 */
function _showLoadingOverlay(message) {
  const existing = document.getElementById('app-loading-3d');
  if (existing) existing.remove();
  const root = document.createElement('div');
  root.id = 'app-loading-3d';
  root.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:999998',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'padding:24px', 'text-align:center',
    'background:rgba(8,0,20,0.85)',
    'color:#fff', 'font-family:Nunito,system-ui,sans-serif',
  ].join(';');
  root.innerHTML = `
    <div style="width:60px;height:60px;border:4px solid rgba(0,255,255,0.2);border-top-color:#00ffff;border-radius:50%;animation:alf-spin 1s linear infinite;margin-bottom:20px;"></div>
    <div style="font-size:18px;font-weight:700;color:#00ffff;letter-spacing:1px;">${message || 'Cargando taller 3D…'}</div>
    <div style="font-size:13px;opacity:0.7;margin-top:8px;max-width:300px;">Esto puede tardar unos segundos la primera vez.</div>
  `;
  // Inject keyframes once.
  if (!document.getElementById('app-loading-styles')) {
    const s = document.createElement('style');
    s.id = 'app-loading-styles';
    s.textContent = '@keyframes alf-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
  document.body.appendChild(root);
  return () => {
    const el = document.getElementById('app-loading-3d');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  };
}

/**
 * Show a full-screen error overlay (mobile-friendly, since the
 * console is not visible on phones). Tapping the button returns to
 * the landing page so the user is never stuck.
 */
function _showFatalError(err, context) {
  console.error(`[App] FATAL (${context}):`, err);
  // Mark this error as "we already handled it" so the global error
  // listener doesn't also try to display the same error.
  window.__cwErrorHandled = true;
  const existing = document.getElementById('app-fatal-error');
  if (existing) existing.remove();
  const root = document.createElement('div');
  root.id = 'app-fatal-error';
  root.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:999999',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'padding:24px', 'text-align:center',
    'background:rgba(8,0,20,0.95)',
    'color:#fff', 'font-family:Nunito,system-ui,sans-serif',
  ].join(';');
  const msg = (err && (err.message || err.toString())) || 'Error desconocido';
  root.innerHTML = `
    <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
    <div style="font-size:20px;font-weight:800;color:#ff8866;margin-bottom:8px;">Algo falló al abrir el taller</div>
    <div style="font-size:14px;opacity:0.85;max-width:480px;line-height:1.4;margin-bottom:8px;">${context}</div>
    <div style="font-size:12px;opacity:0.6;max-width:480px;line-height:1.4;font-family:monospace;background:rgba(0,0,0,0.4);padding:8px;border-radius:6px;margin-bottom:20px;word-break:break-word;">${msg}</div>
    <button id="app-fatal-back" style="background:linear-gradient(135deg,#00ffff,#0088ff);color:#000;border:none;border-radius:14px;padding:14px 28px;font-weight:800;font-size:16px;font-family:inherit;cursor:pointer;min-width:200px;">Volver al menú</button>
  `;
  document.body.appendChild(root);
  root.querySelector('#app-fatal-back').addEventListener('click', () => {
    root.remove();
    if (typeof window !== 'undefined' && window.app) {
      try { window.app.returnToMainMenu(); } catch (e) { location.reload(); }
    } else {
      location.reload();
    }
  });
}

// Global error capture: any uncaught error anywhere in the app surfaces
// the same fatal-error overlay (critical on mobile, where the JS console
// is not visible). Only fires after the first user interaction (so we
// don't drown the user in overlay-on-page-load for harmless 3rd-party
// noise). Errors that we ALREADY handle (e.g. via _showFatalError) set
// window.__cwErrorHandled = true to suppress this global fallback.
//
// KNOWN-NON-FATAL: Babylon's async IBL / BRDF pipeline can fire its
// `executeWhenCompiled` callback AFTER engine.dispose() returns (e.g.
// user navigates away mid-load, or a new PBR material triggers a
// re-prefilter that races with the previous scene). The callback tries
// to bind samplers on a null WebGL program and throws. We swallow the
// specific known shapes so the user doesn't see a fatal overlay for a
// post-dispose ghost. These errors are non-actionable: the app is
// already being torn down or rebuilt.
const _isKnownBabylonDisposeRace = (msg) => {
  if (!msg || typeof msg !== 'string') return false;
  return (
    msg.includes("reading 'program'") ||
    msg.includes("reading 'resize'") ||
    msg.includes("bindSamplers") ||
    msg.includes("enableEffect") ||
    msg.includes("_createEnvTextureAsync") ||
    msg.includes("rgbdTextureTools")
  );
};
window.addEventListener('error', (event) => {
  if (window.__cwErrorHandled) return;
  // Swallow known Babylon dispose races — they're post-dispose ghosts.
  const msg = (event && (event.message || (event.error && event.error.message))) || '';
  if (_isKnownBabylonDisposeRace(msg)) {
    if (window.__cwDebug) console.warn('[App] suppressed known Babylon dispose race:', msg);
    event.preventDefault();
    event.stopImmediatePropagation && event.stopImmediatePropagation();
    return false;
  }
  // Only show the overlay for errors that are clearly our code, not
  // extension noise or 3rd-party scripts.
  const src = event.filename || '';
  if (src && !src.includes(window.location.host) && !src.startsWith('/') && !src.startsWith('./') && !src.startsWith('blob:')) {
    return;
  }
  window.__cwErrorHandled = true;
  _showFatalError(event.error || event.message, 'Error inesperado en la app.');
});
window.addEventListener('unhandledrejection', (event) => {
  if (window.__cwErrorHandled) return;
  const reason = event.reason || 'Promesa rechazada';
  const reasonMsg = (reason && (reason.message || (typeof reason === 'string' ? reason : ''))) || '';
  if (_isKnownBabylonDisposeRace(reasonMsg)) {
    if (window.__cwDebug) console.warn('[App] suppressed known Babylon dispose race (promise):', reasonMsg);
    event.preventDefault();
    return false;
  }
  window.__cwErrorHandled = true;
  _showFatalError(reason, 'Error inesperado en la app.');
});
import { CameraPermissionBanner } from './ui/CameraPermissionBanner';

/**
 * Estado de la aplicación
 */










const DEFAULT_APP_CONFIG = {
  debug: false,
};

export class App {
   __init() {this.workshopController = null}
  
   __init3() {this.currentMode = null}

  // Componentes de interfaz de usuario (UI)
   __init4() {this.landingPage = null}
   __init5() {this.footer = null}
   __init6() {this.hintComponent = null}
   __init7() {this.modeIndicator = null}
   __init8() {this.statusIndicator = null}
   __init9() {this.debugComponent = null}
   __init10() {this.deviceBanner = null}
   __init11() {this.cameraPermissionBanner = null}

  // Elementos del DOM
  
   __init12() {this.videoElement = null}

  // Estado del ciclo de vida
   __init13() {this.state = 'uninitialized'}
   __init14() {this.animationFrameId = null}
  

  constructor(container, config = {}) {;App.prototype.__init.call(this);App.prototype.__init3.call(this);App.prototype.__init4.call(this);App.prototype.__init5.call(this);App.prototype.__init6.call(this);App.prototype.__init7.call(this);App.prototype.__init8.call(this);App.prototype.__init9.call(this);App.prototype.__init10.call(this);App.prototype.__init11.call(this);App.prototype.__init12.call(this);App.prototype.__init13.call(this);App.prototype.__init14.call(this);
    this.container = container;
    this.config = { ...DEFAULT_APP_CONFIG, ...config };
    // Detect mobile here so the HandTracker can pick a lighter
    // numHands config (1 hand on mobile vs 2 on desktop). The
    // detection only ever needs one hand for the pinch grab.
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.handTracker = new HandTracker(isMobile ? { numHands: 1 } : undefined);
    this.fpsCounter = new FpsCounter();
  }

  /**
   * Inicializa e inicia la aplicación
   */
  async start() {
    if (this.state !== 'uninitialized') {
      console.warn('[App] Ya está inicializada');
      return;
    }

    this.state = 'initializing';

    try {
      // Crear estructura del DOM
      this.createDOMStructure();

      // Inicializar componentes de interfaz de usuario
      this.initializeUI();

      // Actualizar estado en pantalla
      this.updateStatus('Inicializando...', 'loading');

      // Verificar compatibilidad del navegador
      this.checkBrowserSupport();

      // Inicializar el detector de manos (precarga del modelo)
      this.updateStatus('Cargando modelo de seguimiento de manos...', 'loading');
      await this.handTracker.initialize(this.videoElement);

      // Cámara se activará cuando el usuario haga clic en un botón (user gesture)
      // No forzar aquí porque getUserMedia requiere interacción del usuario

      // Mostrar el menú de inicio
      this.showLandingPage();

      // Speculative preload of the workshop bundle (Babylon.js, ~1.5MB
      // gzipped). We start the dynamic import the moment the landing
      // page is on screen, so by the time the user has read the story
      // intro and clicked "Comenzar", the bundle is already cached and
      // the workshop opens with no visible delay.
      //
      // On mobile this is *critical* — Vite's dev server bundles deps
      // on first request, and a phone connection can take 60+s for
      // Babylon. Preloading avoids the "stuck on Cargando taller 3D"
      // symptom the user reported.
      this._preloadWorkshop();

      console.log('[App] Iniciada correctamente');
    } catch (error) {
      this.state = 'error';
      this.handleError(error);
    }
  }

  /**
   * Fire-and-forget preload of the workshop module. Safe to call
   * multiple times — the underlying promise is cached.
   */
  _preloadWorkshop() {
    if (this._preloadStarted) return;
    this._preloadStarted = true;
    _loadWorkshop().then(
      () => console.log('[App] Workshop bundle preloaded'),
      (err) => console.warn('[App] Workshop preload failed (will retry on enter):', err),
    );
  }

  /**
   * Crea la estructura de elementos HTML requeridos
   */
   createDOMStructure() {
    this.container.innerHTML = '';

    // Crear elemento de video para la cámara web
    this.videoElement = document.createElement('video');
    this.videoElement.id = 'webcam-video';
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
      opacity: 0;
      transition: opacity 0.5s ease;
    `;
    this.container.appendChild(this.videoElement);

    // Ajustar estilos del contenedor principal
    this.container.style.cssText = `
      position: relative;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background: #000;
    `;
  }

   initializeUI() {
    // Menú principal (Landing Page)
    this.landingPage = new LandingPage(this.container, (mode) => {
      if (mode === 'iron-man-workshop') {
        this.switchToWorkshopMode();
      } else if (mode === 'story-mode') {
        this.startStoryFlow();
      }
    });

    // Footer desactivado (removido para la exposición)
    this.footer = null;

    // Panel de sugerencias y controles (Hint Component)
    this.hintComponent = new HintComponent(this.container);

    // Indicador del modo de juego actual (Mode Indicator)
    this.modeIndicator = new ModeIndicator(this.container);
    this.modeIndicator.onClick(() => {
      this.returnToMainMenu();
    });

    // Indicador del estado de seguimiento de manos (Status Indicator)
    this.statusIndicator = new StatusIndicator(this.container);
    this.statusIndicator.onClick(() => {
      this.toggleDebug();
    });

    // Componente de depuración técnica (Debug Component)
    this.debugComponent = new DebugComponent(this.container);

    // Banner de dispositivo recomendado (Device Banner)
    this.deviceBanner = new DeviceBanner();
    this.deviceBanner.show();

    // Banner de permiso de cámara (Camera Permission Banner)
    this.cameraPermissionBanner = new CameraPermissionBanner();

    // Evento personalizado para cambiar de modo de juego desde otros controladores
    window.addEventListener('switch-game-mode', (event) => {
      const mode = event.detail;
      if (mode === 'iron-man-workshop') {
        this.switchToWorkshopMode();
      }
    });

    // Configurar listeners de teclas globales
    this.setupGlobalInputListeners();
  }

   setupGlobalInputListeners() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();

      // Atajos de teclado globales
      if (key === 'd') {
        this.toggleDebug();
        return;
      } else if (key === 'h') {
        this.toggleControls();
        return;
      } else if (key === 'm') {
        this.returnToMainMenu();
        return;
      }

      // Atajos para cambio de modo
      if (key === 'i') {
        this.switchToWorkshopMode();
        return;
      }

      // Acciones específicas del modo activo
      if (key === 'r') {
        if (this.currentMode === 'iron-man-workshop') {
          _optionalChain([this, 'access', _ => _.workshopController, 'optionalAccess', _2 => _2.reset, 'call', _3 => _3()]);
        }
        return;
      }
    });
  }

   showLandingPage() {
    this.state = 'landing';
    this.currentMode = null;

    _optionalChain([this, 'access', _7 => _7.statusIndicator, 'optionalAccess', _8 => _8.hide, 'call', _9 => _9()]);
    // Footer desactivado
    if (this.videoElement) this.videoElement.style.opacity = '0';
    _optionalChain([this, 'access', _13 => _13.hintComponent, 'optionalAccess', _14 => _14.hide, 'call', _15 => _15()]);

    _optionalChain([this, 'access', _16 => _16.landingPage, 'optionalAccess', _17 => _17.show, 'call', _18 => _18()]);
  }

  /**
   * Detiene y libera los recursos del controlador de juego activo
   */
    stopCurrentMode() {
    if (this.workshopController) {
      this.workshopController.stop();
      this.workshopController.disableDebug();
      this.workshopController.dispose();
      this.workshopController = null;
    }
  }

   returnToMainMenu() {
    if (this.state === 'landing') {
      this.showLandingPage();
      return;
    }

    this.stopCurrentMode();
    _optionalChain([this, 'access', _19 => _19.cameraPermissionBanner, 'optionalAccess', _20 => _20.hide, 'call', _21 => _21()]);
    this.showLandingPage();
  }

       updateHandStatus(handCount) {
    if (this.currentMode === null) return;

    const isDebug = _nullishCoalesce(_optionalChain([this, 'access', _22 => _22.debugComponent, 'optionalAccess', _23 => _23.isVisibleState, 'call', _24 => _24()]), () => ( false));
    if (!isDebug) {
      _optionalChain([this, 'access', _25 => _25.statusIndicator, 'optionalAccess', _26 => _26.hide, 'call', _27 => _27()]);
      return;
    }

    if (handCount <= 0) {
      this.updateStatus('No se detectan manos', 'ready');
      return;
    }
    if (handCount === 1) {
      this.updateStatus('1 mano detectada', 'active');
      return;
    }
    this.updateStatus(`${handCount} manos detectadas`, 'active');
  }

  /**
   * Verifica compatibilidad de características técnicas del navegador
   */
   checkBrowserSupport() {
    const issues = [];

    // Validar WebGL 2.0
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      issues.push('WebGL 2.0 no está soportado');
    }

    // Validar WebAssembly
    if (typeof WebAssembly !== 'object') {
      issues.push('WebAssembly no está soportado');
    }

    // Validar acceso a la cámara
    if (!_optionalChain([navigator, 'access', _28 => _28.mediaDevices, 'optionalAccess', _29 => _29.getUserMedia])) {
      issues.push('El acceso a la cámara no está soportado');
    }

    if (issues.length > 0) {
      throw new Error(`Navegador no compatible: ${issues.join(', ')}`);
    }
  }

   updateStatus(message, state) {
    _optionalChain([this, 'access', _30 => _30.statusIndicator, 'optionalAccess', _31 => _31.update, 'call', _32 => _32(message, state)]);
  }

  /**
   * Activa el modo de depuración
   */
   enableDebug() {
    if (!this.debugComponent) return;

    this.debugComponent.show();

    if (this.currentMode === 'iron-man-workshop' && this.workshopController) {
      this.workshopController.enableDebug((info) => this.updateWorkshopDebugPanel(info));
    }
  }

  /**
   * Actualiza el panel de depuración del Taller de Iron Man
   */
   updateWorkshopDebugPanel(info) {
    if (!this.debugComponent) return;

    this.debugComponent.update(`
      <div style="margin-bottom: 8px; color: #fff; font-weight: bold;">Depuración - Taller Iron Man</div>
      <div>FPS: ${info.fps.toFixed(1)}</div>
      <div>Manos: ${info.handsDetected}</div>
      <div>Agarrando Pieza: ${info.isGrabbing ? '<span style="color: #0ff;">SÍ</span>' : 'No'}</div>
      <div>Elementos Activos: ${info.activeElements}</div>
      <div>Efecto Brillo: ${info.bloomEnabled ? 'ACTIVADO' : 'DESACTIVADO'}</div>
    `);
  }

  /**
   * Inicia el bucle de renderizado y animación principal
   */
   startAnimationLoop() {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      if (this.state !== 'running') {
        this.animationFrameId = null;
        return;
      }

      this.fpsCounter.update();

      if (this.currentMode === 'iron-man-workshop') {
        const handCount = _nullishCoalesce(_optionalChain([this, 'access', _36 => _36.workshopController, 'optionalAccess', _37 => _37.getHandCount, 'call', _38 => _38()]), () => ( 0));
        this.updateHandStatus(handCount);
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

   handleError(error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[App] Error:', message);
    this.updateStatus(`Error: ${message}`, 'error');
  }

  toggleDebug() {
    if (!this.debugComponent) return;

    const isVisible = this.debugComponent.toggle();

    if (!isVisible) {
      _optionalChain([this, 'access', _ => _.workshopController, 'optionalAccess', _2 => _2.disableDebug, 'call', _3 => _3()]);
    } else {
      if (this.currentMode === 'iron-man-workshop' && this.workshopController) {
        this.workshopController.enableDebug((info) => this.updateWorkshopDebugPanel(info));
      }
    }
  }

  toggleControls() {
    _optionalChain([this, 'access', _45 => _45.hintComponent, 'optionalAccess', _46 => _46.toggle, 'call', _47 => _47()]);
  }

  /**
   * Ajusta los filtros visuales de la webcam dependiendo del juego activo
   */
   applyVideoStyles(mode) {
    if (!this.videoElement) return;

    const baseStyles = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
      transition: opacity 0.5s ease;
      opacity: 1;
    `;

    if (mode === 'iron-man-workshop') {
      this.videoElement.style.cssText =
        baseStyles + 'filter: brightness(0.4) contrast(0.9) saturate(0.8);';
    } else {
      this.videoElement.style.cssText = baseStyles + 'filter: none;';
    }
  }

  /**
   * Centralizes camera permission request to ensure getUserMedia
   * runs within a synchronous user gesture context (required on iOS/mobile).
   * Uses CameraPermissionBanner which calls getUserMedia from its own
   * synchronous click handler, preserving the gesture.
   */
  _requestCameraViaBanner(mode) {
    if (this.handTracker.isCameraEnabled()) return Promise.resolve();

    return new Promise((resolve) => {
      this.cameraPermissionBanner.show(mode, async () => {
        // Permission granted by banner's getUserMedia call (sync user gesture)
        await this.handTracker.enableCamera().catch(err => {
          console.error('[App] No se pudo activar la cámara:', err);
        });
        resolve();
      });

      // If banner didn't show (already dismissed this session),
      // try enabling camera directly
      if (!this.cameraPermissionBanner.element) {
        this.handTracker.enableCamera().catch(err => {
          console.error('[App] No se pudo activar la cámara:', err);
        }).finally(resolve);
      }
    });
  }

  /**
   * Flujo de historia: Intro cinemática → Taller (montar robot con retos matemáticos)
   */
  async startStoryFlow() {
    console.log('[App] Iniciando flujo de historia...');

    _optionalChain([this, 'access', _ => _.landingPage, 'optionalAccess', _2 => _2.hide, 'call', _3 => _3()]);
    this.stopCurrentMode();

    try {
      // Activar cámara antes de la cinemática (usa banner para preservar user gesture en iOS)
      await this._requestCameraViaBanner('iron-man-workshop');

      // Mostrar introducción cinemática
      const storyIntro = new StoryIntro(this.container);
      await storyIntro.play();
      storyIntro.dispose();

      console.log('[App] Intro completada, abriendo taller...');

      // Lazy-load the workshop module (Babylon.js is ~1.5MB gzipped).
      // Show a full-screen spinner so the user knows the app is
      // working (the brief black gap between the intro and the
      // workshop is what was making it look like a crash on mobile).
      const hideLoading = _showLoadingOverlay('Cargando taller 3D…');
      this.updateStatus('Cargando taller 3D...', 'loading');
      try {
        const { WorkshopController } = await _loadWorkshop();
        // Stash the assembly callback so switchToWorkshopMode can wire
        // it up when it creates the controller. Previously we created
        // the controller here, but switchToWorkshopMode disposes any
        // existing controller (line 714 stopCurrentMode), which meant
        // the callback was lost and the workshop rendered without it.
        this._assemblyResolve = null;
        this._pendingAssemblyCb = (robotLevel) => {
          console.log('[App] Robot ensamblado en taller, continuando flujo...');
          if (this._assemblyResolve) {
            this._assemblyResolve(robotLevel);
            this._assemblyResolve = null;
          }
        };
        // switchToWorkshopMode will create + initialize + start the
        // workshopController. It checks this._pendingAssemblyCb and
        // wires it into the controller config.
        await this.switchToWorkshopMode();
      } finally {
        hideLoading();
      }
    } catch (err) {
      _showFatalError(err, 'No se pudo cargar el taller 3D. Esto suele pasar por conexión lenta o caché vieja del navegador.');
      // Reset the workshop controller so a retry starts clean.
      if (this.workshopController) {
        try { this.workshopController.stop(); this.workshopController.dispose(); } catch (e) { /* ignore */ }
        this.workshopController = null;
      }
      return;
    }

    // Esperar a que el robot sea ensamblado
    console.log('[App] Esperando ensamblaje del robot...');
    await new Promise((resolve) => {
      this._assemblyResolve = resolve;
    });

    console.log('[App] Robot ensamblado! Misión completa.');
    // Breve pausa para que el usuario vea el robot completo en el escenario
    // antes de volver al menú (exitAssemblyMode ya limpió el modo assembly,
    // pero el robot sigue visible en la cámara).
    await new Promise((r) => setTimeout(r, 800));
    this.returnToMainMenu();
  }

  /**
   * Cambia al juego del Taller de Iron Man (Workshop)
   */
  async switchToWorkshopMode() {
    if (this.currentMode === 'iron-man-workshop') return;

    console.log('[App] Cambiando a modo Taller de Iron Man');

    _optionalChain([this, 'access', _69 => _69.landingPage, 'optionalAccess', _70 => _70.hide, 'call', _71 => _71()]);
    this.stopCurrentMode();

    try {
      if (!this.workshopController) {
        this.updateStatus('Cargando Taller 3D...', 'loading');
        // Lazy-load Babylon + workshop on first entry. The initial page
        // load is small; the heavy 3D engine only downloads when the
        // user actually picks the workshop mode.
        const { WorkshopController } = await _loadWorkshop();
        const wsConfig = { debug: this.config.debug };
        // Wire the pending assembly callback (set by startStoryFlow) so
        // the "begin adventure" flow can resume after assembly completes.
        if (this._pendingAssemblyCb) {
          wsConfig.onAssemblyExternal = this._pendingAssemblyCb;
          this._pendingAssemblyCb = null;
        } else {
          // Direct workshop entry (no story flow): always return to the
          // menu when the user clicks CONTINUAR on the victory overlay.
          // Without this, clicking CONTINUAR just closes the overlay
          // and the user is stuck on an empty workshop screen.
          wsConfig.onAssemblyExternal = () => {
            console.log('[App] Misión completada (modo directo), volviendo al menú...');
            this.returnToMainMenu();
          };
        }
        this.workshopController = new WorkshopController(this.handTracker, this.container, wsConfig);
        this.workshopController.initialize();
      }

      this.workshopController.start();

      this.applyVideoStyles('iron-man-workshop');
      this.currentMode = 'iron-man-workshop';
      this.state = 'running';
      this.updateHandStatus(0);

      // Footer desactivado
      _optionalChain([this, 'access', _75 => _75.hintComponent, 'optionalAccess', _76 => _76.update, 'call', _77 => _77('iron-man-workshop')]);
      _optionalChain([this, 'access', _78 => _78.hintComponent, 'optionalAccess', _79 => _79.show, 'call', _80 => _80()]);
      _optionalChain([this, 'access', _81 => _81.modeIndicator, 'optionalAccess', _82 => _82.update, 'call', _83 => _83('iron-man-workshop')]);

      this.startAnimationLoop();

      // Camera via permission banner (preserves user gesture on iOS/mobile)
      await this._requestCameraViaBanner('iron-man-workshop');

      if (_optionalChain([this, 'access', _87 => _87.debugComponent, 'optionalAccess', _88 => _88.isVisibleState, 'call', _89 => _89()])) {
        this.workshopController.enableDebug((info) => this.updateWorkshopDebugPanel(info));
      }
    } catch (err) {
      _showFatalError(err, 'No se pudo iniciar el taller 3D.');
      if (this.workshopController) {
        try { this.workshopController.stop(); this.workshopController.dispose(); } catch (e) { /* ignore */ }
        this.workshopController = null;
      }
    }
  }

  dispose() {
    if (this.state === 'disposed') return;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    _optionalChain([this, 'access', _ => _.workshopController, 'optionalAccess', _2 => _2.dispose, 'call', _3 => _3()]);
    this.handTracker.dispose();
    _optionalChain([this, 'access', _96 => _96.deviceBanner, 'optionalAccess', _97 => _97.dispose, 'call', _98 => _98()]);
    _optionalChain([this, 'access', _99 => _99.cameraPermissionBanner, 'optionalAccess', _100 => _100.dispose, 'call', _101 => _101()]);

    this.container.innerHTML = '';
    this.state = 'disposed';
    console.log('[App] Liberado');
  }
}

/**
 * Contador de Fotogramas por Segundo (FPS)
 */
class FpsCounter {constructor() { FpsCounter.prototype.__init15.call(this);FpsCounter.prototype.__init16.call(this);FpsCounter.prototype.__init17.call(this); }
   __init15() {this.frames = 0}
   __init16() {this.lastTime = performance.now()}
   __init17() {this.fps = 0}

  update() {
    this.frames++;
    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= 1000) {
      this.fps = (this.frames * 1000) / delta;
      this.frames = 0;
      this.lastTime = now;
    }
  }

  getFps() {
    return this.fps;
  }
}
