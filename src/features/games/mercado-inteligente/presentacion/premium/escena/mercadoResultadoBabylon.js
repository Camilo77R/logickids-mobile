const BABYLON_CDN_URL = 'https://cdn.babylonjs.com/babylon.js';

const PANTALLAS_RESULTADO = new Set(['result', 'resultado']);

const esPantallaResultado = (estadoUi) =>
  PANTALLAS_RESULTADO.has(String(estadoUi?.screen ?? '').toLowerCase());

const crearScriptDestruirCelebracion = () => `
  window.MercadoResultadoCelebracion?.destroy?.();
`;

const crearScriptIniciarCelebracion = () => `
  (function () {
    if (!document.querySelector('[data-mercado-screen="result"],[data-mercado-screen="resultado"]')) {
      window.MercadoResultadoCelebracion?.destroy?.();
      return;
    }

    if (window.MercadoResultadoCelebracion?.active) {
      return;
    }

    if (window.MercadoResultadoCelebracion?.loading) {
      return;
    }

    const CANVAS_ID = 'mercado-resultado-babylon';
    const SCRIPT_ID = 'mercado-resultado-babylon-cdn';
    const COLORES_CONFETI = ['#ffca28', '#ff7043', '#66bb6a', '#42a5f5', '#ab47bc'];

    const obtenerBabylon = () => {
      if (window.BABYLON) {
        return Promise.resolve(window.BABYLON);
      }

      if (window.__mercadoBabylonPromise) {
        return window.__mercadoBabylonPromise;
      }

      window.__mercadoBabylonPromise = new Promise((resolve, reject) => {
        const existente = document.getElementById(SCRIPT_ID);
        if (existente) {
          existente.addEventListener('load', () => resolve(window.BABYLON), { once: true });
          existente.addEventListener('error', reject, { once: true });
          return;
        }

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = '${BABYLON_CDN_URL}';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve(window.BABYLON);
        script.onerror = reject;
        document.head.appendChild(script);
      });

      return window.__mercadoBabylonPromise;
    };

    const eliminarCanvas = () => {
      document.getElementById(CANVAS_ID)?.remove();
    };

    const crearCanvas = () => {
      eliminarCanvas();
      const canvas = document.createElement('canvas');
      canvas.id = CANVAS_ID;
      canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        zIndex: '70',
        pointerEvents: 'none',
        touchAction: 'none',
        background: 'transparent',
      });
      document.body.appendChild(canvas);
      return canvas;
    };

    const iniciar = (BABYLON) => {
      if (!BABYLON || !document.querySelector('[data-mercado-screen="result"],[data-mercado-screen="resultado"]')) {
        window.MercadoResultadoCelebracion = null;
        return;
      }

      const canvas = crearCanvas();
      const engine = new BABYLON.Engine(canvas, true, {
        alpha: true,
        preserveDrawingBuffer: false,
        stencil: false,
      });
      const scene = new BABYLON.Scene(engine);
      scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
      scene.autoClear = true;

      const camera = new BABYLON.FreeCamera(
        'mercado-resultado-camera',
        new BABYLON.Vector3(0, 0, -10),
        scene,
      );
      camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
      camera.orthoLeft = -5;
      camera.orthoRight = 5;
      camera.orthoTop = 3;
      camera.orthoBottom = -3;

      const luz = new BABYLON.HemisphericLight(
        'mercado-resultado-luz',
        new BABYLON.Vector3(0, 1, -1),
        scene,
      );
      luz.intensity = 1.15;

      const materialesConfeti = COLORES_CONFETI.map((color, indice) => {
        const material = new BABYLON.StandardMaterial('confeti-' + indice, scene);
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.emissiveColor = BABYLON.Color3.FromHexString(color).scale(0.32);
        material.disableLighting = false;
        material.backFaceCulling = false;
        return material;
      });

      const materialMoneda = new BABYLON.StandardMaterial('moneda-celebracion', scene);
      materialMoneda.diffuseColor = BABYLON.Color3.FromHexString('#f5a910');
      materialMoneda.emissiveColor = BABYLON.Color3.FromHexString('#ffca28').scale(0.22);
      materialMoneda.specularColor = BABYLON.Color3.FromHexString('#fff2a8');

      const texturaEstrella = new BABYLON.DynamicTexture(
        'estrella-celebracion-textura',
        { width: 128, height: 128 },
        scene,
        false,
      );
      texturaEstrella.hasAlpha = true;
      texturaEstrella.drawText('★', 11, 104, 'bold 104px Arial', '#ffca28', 'transparent', true);

      const materialEstrella = new BABYLON.StandardMaterial('estrella-celebracion', scene);
      materialEstrella.diffuseTexture = texturaEstrella;
      materialEstrella.opacityTexture = texturaEstrella;
      materialEstrella.emissiveTexture = texturaEstrella;
      materialEstrella.disableLighting = true;
      materialEstrella.backFaceCulling = false;

      const particulas = [];
      const prepararParticula = (mesh, indice, tipo) => {
        const lado = indice % 2 === 0 ? -1 : 1;
        mesh.position = new BABYLON.Vector3(
          lado * (2.8 + Math.random() * 2),
          2.7 + Math.random() * 4.5,
          Math.random() * 1.6,
        );
        mesh.rotation = new BABYLON.Vector3(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        );
        mesh.metadata = {
          tipo,
          velocidad: 0.008 + Math.random() * 0.012,
          deriva: lado * (0.001 + Math.random() * 0.003),
          giro: 0.012 + Math.random() * 0.026,
        };
        particulas.push(mesh);
      };

      for (let indice = 0; indice < 24; indice += 1) {
        const confeti = BABYLON.MeshBuilder.CreatePlane(
          'confeti-' + indice,
          { width: 0.08 + Math.random() * 0.08, height: 0.2 + Math.random() * 0.16 },
          scene,
        );
        confeti.material = materialesConfeti[indice % materialesConfeti.length];
        prepararParticula(confeti, indice, 'confeti');
      }

      for (let indice = 0; indice < 6; indice += 1) {
        const moneda = BABYLON.MeshBuilder.CreateCylinder(
          'moneda-' + indice,
          { diameter: 0.28, height: 0.055, tessellation: 20 },
          scene,
        );
        moneda.material = materialMoneda;
        prepararParticula(moneda, indice + 24, 'moneda');
      }

      for (let indice = 0; indice < 5; indice += 1) {
        const estrella = BABYLON.MeshBuilder.CreatePlane(
          'estrella-' + indice,
          { size: 0.38 },
          scene,
        );
        estrella.material = materialEstrella;
        prepararParticula(estrella, indice + 30, 'estrella');
      }

      const reiniciarParticula = (particula) => {
        const lado = Math.random() > 0.5 ? -1 : 1;
        particula.position.x = lado * (2.7 + Math.random() * 2.2);
        particula.position.y = 3.1 + Math.random() * 2;
        particula.position.z = Math.random() * 1.6;
        particula.metadata.deriva = lado * (0.001 + Math.random() * 0.003);
      };

      scene.onBeforeRenderObservable.add(() => {
        particulas.forEach((particula) => {
          particula.position.y -= particula.metadata.velocidad;
          particula.position.x += particula.metadata.deriva;
          particula.rotation.x += particula.metadata.giro;
          particula.rotation.y += particula.metadata.giro * 0.72;
          particula.rotation.z += particula.metadata.giro * 0.45;

          if (particula.position.y < -3.3) {
            reiniciarParticula(particula);
          }
        });
      });

      const ajustarCanvas = () => engine.resize();
      window.addEventListener('resize', ajustarCanvas);
      engine.runRenderLoop(() => scene.render());

      window.MercadoResultadoCelebracion = {
        active: true,
        loading: false,
        destroy() {
          if (!this.active) return;
          this.active = false;
          window.removeEventListener('resize', ajustarCanvas);
          engine.stopRenderLoop();
          scene.dispose();
          engine.dispose();
          eliminarCanvas();
        },
      };
    };

    window.MercadoResultadoCelebracion = {
      active: false,
      loading: true,
      destroy() {
        eliminarCanvas();
      },
    };

    obtenerBabylon()
      .then(iniciar)
      .catch(() => {
        eliminarCanvas();
        window.MercadoResultadoCelebracion = {
          active: false,
          loading: false,
          destroy: eliminarCanvas,
        };
      });
  })();
`;

export const crearScriptSincronizarCelebracionResultado = (estadoUi) =>
  esPantallaResultado(estadoUi)
    ? crearScriptIniciarCelebracion()
    : crearScriptDestruirCelebracion();
