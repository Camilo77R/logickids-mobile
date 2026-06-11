const serializar = (valor) => JSON.stringify(valor).replace(/</g, '\\u003c');
const escaparHtml = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const construirEtiquetasProductoHtml = (productos = []) => {
  const claseCantidad = productos.length > 3 ? 'labels-4' : 'labels-3';

  const tarjetas = productos
    .map(
      (producto) => `
        <div class="product-label-card" id="label-${escaparHtml(producto.id)}">
          <div class="product-label-name">${escaparHtml(producto.nombre.toUpperCase())}</div>
          <div class="product-label-price">
            <span class="coin-dot"></span>
            ${escaparHtml(producto.precio)} monedas
          </div>
        </div>
      `,
    )
    .join('');

  return `<div id="productLabels" class="${claseCantidad}">${tarjetas}</div>`;
};

export const generarHtmlMercado3D = ({
  ronda,
  assetsPorProducto = {},
  assetsDecoracion = {},
}) => {
  const parametros = serializar({
    productos: ronda.oferta.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      categoria: producto.categoria,
    })),
    objetivo: ronda.objetivo,
    assetsPorProducto,
    assetsDecoracion,
  });
  const etiquetasProductoHtml = construirEtiquetasProductoHtml(ronda.oferta);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
    />

    <script>
      window.onerror = function (message, source, line, column, error) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'WEBVIEW_JS_ERROR',
            message: String(message),
            line: line,
            column: column,
            stack: error && error.stack ? String(error.stack) : null
          }));
        }
      };

      window.onunhandledrejection = function (event) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'WEBVIEW_PROMISE_ERROR',
            message: String(event.reason && event.reason.message ? event.reason.message : event.reason),
            stack: event.reason && event.reason.stack ? String(event.reason.stack) : null
          }));
        }
      };
    </script>

    <script src="https://cdn.babylonjs.com/babylon.js"></script>
    <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>

    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        touch-action: none;
        background: #efc188;
      }

      body {
        position: relative;
        font-family: Arial, sans-serif;
      }

      #sceneRoot {
        position: fixed;
        inset: 0;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 18%, rgba(255,244,195,0.85), transparent 26%),
          linear-gradient(180deg, #df9d5f 0%, #efc188 24%, #f3cfac 55%, #b96e38 56%, #9b5828 100%);
      }

      #roomBackdrop {
        position: absolute;
        inset: 0;
        z-index: 0;
      }

      .back-wall {
        position: absolute;
        left: 8%;
        right: 8%;
        top: 11%;
        bottom: 22%;
        border-radius: 28px;
        background: linear-gradient(180deg, #f8e8cf 0%, #f6ddba 100%);
        box-shadow: inset 0 0 0 6px rgba(140, 77, 29, 0.08);
      }

      .window-frame {
        position: absolute;
        left: 4%;
        top: 24%;
        width: 11%;
        height: 32%;
        border-radius: 28px;
        background: linear-gradient(180deg, #f7c785 0%, #f4b15f 100%);
        box-shadow: inset 0 0 0 5px #8a4a1f;
      }

      .window-glass {
        position: absolute;
        inset: 10px;
        border-radius: 20px;
        background: linear-gradient(180deg, #fff9d9 0%, #d4ffd8 100%);
      }

      .shelf {
        position: absolute;
        width: 17%;
        height: 22%;
        border-radius: 20px;
        background: linear-gradient(180deg, #a8632b 0%, #8a4d20 100%);
        box-shadow: inset 0 0 0 4px rgba(92, 46, 15, 0.45);
      }

      .shelf-left {
        left: 17%;
        top: 29%;
      }

      .shelf-right {
        right: 19%;
        top: 26%;
      }

      .shelf-row {
        position: absolute;
        left: 10%;
        right: 10%;
        height: 16px;
        border-radius: 10px;
        background: #76411d;
      }

      .shelf-row.top {
        top: 38%;
      }

      .shelf-row.bottom {
        top: 70%;
      }

      .shelf-item {
        position: absolute;
        bottom: 22%;
        width: 18%;
        aspect-ratio: 1 / 1;
        border-radius: 999px;
        box-shadow: inset 0 -6px 0 rgba(0,0,0,0.08);
      }

      .shelf-item.apple {
        left: 15%;
        background: #d95447;
      }

      .shelf-item.pear {
        left: 41%;
        background: #c3d84e;
      }

      .shelf-item.tomato {
        left: 67%;
        background: #f06e57;
      }

      .shelf-box {
        position: absolute;
        bottom: 18%;
        width: 20%;
        height: 20%;
        border-radius: 10px;
        background: #d8b36b;
      }

      .shelf-box.one { left: 16%; }
      .shelf-box.two { left: 40%; }
      .shelf-box.three { left: 64%; }

      .cash-register {
        position: absolute;
        left: 28%;
        bottom: 28%;
        width: 8%;
        height: 12%;
        border-radius: 14px;
        background: linear-gradient(180deg, #b9b6bf 0%, #8a8892 100%);
        box-shadow: inset 0 0 0 4px rgba(88, 78, 78, 0.32);
      }

      .monitor {
        position: absolute;
        right: 14%;
        bottom: 27%;
        width: 14%;
        height: 16%;
        border-radius: 18px;
        background: #6a84a6;
      }

      .monitor::after {
        content: '';
        position: absolute;
        left: 14%;
        right: 14%;
        top: 16%;
        bottom: 24%;
        border-radius: 10px;
        background: #83c99f;
      }

      .crate {
        position: absolute;
        right: 9%;
        bottom: 14%;
        width: 13%;
        height: 16%;
        border-radius: 18px;
        background: linear-gradient(180deg, #7193a4 0%, #517687 100%);
      }

      .floor-rug {
        position: absolute;
        left: 34%;
        right: 34%;
        bottom: 4%;
        height: 16%;
        border-radius: 999px;
        background: radial-gradient(circle at 50% 50%, #a7d76e 0%, #80b84d 65%, rgba(0,0,0,0) 68%);
        opacity: 0.92;
      }

      #renderCanvas {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: block;
        width: 100%;
        height: 100%;
        background: transparent;
      }

      #productLabels {
        position: absolute;
        left: 20%;
        right: 20%;
        bottom: 30%;
        z-index: 3;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        gap: 18px;
        pointer-events: none;
      }

      #productLabels.labels-4 {
        left: 16%;
        right: 16%;
        gap: 12px;
      }

      .product-label-card {
        min-width: 136px;
        padding: 10px 12px;
        border-radius: 18px;
        background: #fff8eb;
        box-shadow:
          0 5px 0 #8a4a1f,
          inset 0 0 0 3px rgba(138, 74, 31, 0.24);
        text-align: center;
        transform: translateY(0);
        transition: transform 120ms ease, filter 120ms ease;
      }

      #productLabels.labels-4 .product-label-card {
        min-width: 120px;
        padding: 10px 8px;
      }

      .product-label-card.selected {
        transform: translateY(-5px) scale(1.03);
        filter: drop-shadow(0 0 10px rgba(96, 213, 102, 0.36));
      }

      .product-label-name {
        color: #4a2504;
        font: 900 14px/1.05 Arial, sans-serif;
      }

      .product-label-price {
        margin-top: 6px;
        color: #7b542b;
        font: 900 12px/1 Arial, sans-serif;
      }

      .coin-dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-right: 6px;
        vertical-align: -1px;
        border-radius: 999px;
        background: linear-gradient(180deg, #ffd34d 0%, #e28a11 100%);
      }

      #fallback {
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        color: #2d1903;
        font: 900 16px system-ui;
        text-align: center;
        background: #eaf9ff;
      }
    </style>
  </head>

  <body>
    <div id="sceneRoot">
      <div id="roomBackdrop">
        <div class="back-wall"></div>
        <div class="window-frame"><div class="window-glass"></div></div>
        <div class="shelf shelf-left">
          <div class="shelf-row top"></div>
          <div class="shelf-item pear"></div>
          <div class="shelf-item apple"></div>
          <div class="shelf-item tomato"></div>
        </div>
        <div class="shelf shelf-right">
          <div class="shelf-row top"></div>
          <div class="shelf-box one"></div>
          <div class="shelf-box two"></div>
          <div class="shelf-box three"></div>
        </div>
        <div class="cash-register"></div>
        <div class="monitor"></div>
        <div class="crate"></div>
        <div class="floor-rug"></div>
      </div>
      <canvas id="renderCanvas"></canvas>
      ${etiquetasProductoHtml}
    </div>
    <div id="fallback">Preparando el mercadito.</div>

    <script>
      (function () {
        var parametros = ${parametros};
        var canvas = document.getElementById('renderCanvas');
        var fallback = document.getElementById('fallback');
        var engine = null;
        var scene = null;
        var productos = {};
        var seleccionados = {};
        var particulas = [];
        var ultimoToqueProducto = { id: null, tiempo: 0 };

        var PALETA = {
          cielo: '#8EE6FF',
          pared: '#F7FFFF',
          suelo: '#74D890',
          mesa: '#F4A64E',
          mesaBrillo: '#FFE6A8',
          frente: '#D6752F',
          madera: '#7C3D18',
          crema: '#FFFAF1',
          sombra: '#2D1903',
          oro: '#FFD166',
          exito: '#32C766',
          alerta: '#F97059'
        };

        var PRODUCTOS_EQUIVALENTES = {
          manzana: 'manzana',
          tomate: 'tomate',
          zanahoria: 'zanahoria',
          carrot: 'zanahoria',
          banano: 'banano',
          banana: 'banano',
          pan: 'pan',
          galleta: 'galleta',
          cookie: 'galleta',
          lechuga: 'lechuga',
          pera: 'pera',
          muffin: 'muffin',
          leche: 'leche',
          queso: 'queso'
        };

        function enviar(payload) {
          if (!window.ReactNativeWebView) return;
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }

        function actualizarEtiquetasSeleccion() {
          parametros.productos.forEach(function (producto) {
            var etiqueta = document.getElementById('label-' + producto.id);

            if (!etiqueta) return;

            if (seleccionados[producto.id]) {
              etiqueta.classList.add('selected');
            } else {
              etiqueta.classList.remove('selected');
            }
          });
        }

        function color(hex) {
          return BABYLON.Color3.FromHexString(hex || '#ffffff');
        }

        function material(nombre, hex, options) {
          var mat = new BABYLON.StandardMaterial(nombre, scene);
          mat.diffuseColor = color(hex);
          mat.specularColor = color((options && options.specular) || '#ffffff').scale(0.22);

          if (options && options.emissive) {
            mat.emissiveColor = color(options.emissive).scale(options.emissiveScale || 0.10);
          }

          if (options && typeof options.alpha === 'number') {
            mat.alpha = options.alpha;
          }

          return mat;
        }

        function normalizarProducto(id) {
          return PRODUCTOS_EQUIVALENTES[id] || id;
        }

        function crearSombra(nombre, radio) {
          var sombra = BABYLON.MeshBuilder.CreateDisc(nombre, {
            radius: radio,
            tessellation: 56
          }, scene);

          sombra.rotation.x = Math.PI / 2;
          sombra.material = material(nombre + '-mat', PALETA.sombra, { alpha: 0.10 });
          return sombra;
        }

        function crearHoja(nombre, x, y, z) {
          var hoja = BABYLON.MeshBuilder.CreateSphere(nombre, {
            diameter: 0.13,
            segments: 12
          }, scene);

          hoja.scaling = new BABYLON.Vector3(1.45, 0.42, 0.75);
          hoja.position = new BABYLON.Vector3(x, y, z);
          hoja.material = material(nombre + '-mat', '#58C65D', {
            emissive: '#58C65D',
            emissiveScale: 0.05
          });

          return hoja;
        }

        function crearCapsula(nombre, opciones) {
          if (BABYLON.MeshBuilder.CreateCapsule) {
            return BABYLON.MeshBuilder.CreateCapsule(nombre, opciones, scene);
          }

          return BABYLON.MeshBuilder.CreateCylinder(nombre, {
            diameter: (opciones.radius || 0.14) * 2,
            height: opciones.height || 0.62,
            tessellation: opciones.tessellation || 24
          }, scene);
        }

        function asignarProducto(meshes, productoId) {
          meshes.forEach(function (mesh) {
            mesh.metadata = { tipo: 'producto', productoId: productoId };
            mesh.isPickable = true;
          });
        }

        function calcularLimitesModelo(meshes) {
          var minimo = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
          var maximo = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
          var encontroLimites = false;

          meshes.forEach(function (mesh) {
            if (!mesh.getBoundingInfo) return;

            mesh.computeWorldMatrix(true);

            var caja = mesh.getBoundingInfo().boundingBox;
            minimo = BABYLON.Vector3.Minimize(minimo, caja.minimumWorld);
            maximo = BABYLON.Vector3.Maximize(maximo, caja.maximumWorld);
            encontroLimites = true;
          });

          return encontroLimites ? { minimo: minimo, maximo: maximo } : null;
        }

        function prepararModeloImportado(resultado, grupo, opciones) {
          var meshes = resultado.meshes.filter(function (mesh) {
            return !!mesh.getBoundingInfo;
          });
          var limites = calcularLimitesModelo(meshes);
          var identificador = opciones.identificador;

          if (!limites || meshes.length === 0) {
            throw new Error('El modelo ' + identificador + ' no contiene meshes visibles.');
          }

          var raizVisual = new BABYLON.TransformNode('modelo-' + identificador, scene);
          var raices = resultado.meshes.filter(function (mesh) {
            return !mesh.parent;
          });

          raices.forEach(function (mesh) {
            mesh.parent = raizVisual;
          });

          var dimensiones = limites.maximo.subtract(limites.minimo);
          var dimensionMayor = Math.max(dimensiones.x, dimensiones.y, dimensiones.z);
          var escala = dimensionMayor > 0 ? opciones.dimensionObjetivo / dimensionMayor : 1;
          var centro = limites.minimo.add(limites.maximo).scale(0.5);

          raizVisual.scaling = new BABYLON.Vector3(escala, escala, escala);
          raizVisual.position = new BABYLON.Vector3(
            -centro.x * escala,
            -limites.minimo.y * escala + opciones.baseY,
            -centro.z * escala
          );
          raizVisual.parent = grupo;

          if (opciones.productoId) {
            asignarProducto(meshes, opciones.productoId);
          }

          return meshes;
        }

        function obtenerFuentesModelo(mapaFuentes, identificador) {
          var fuentes = mapaFuentes && mapaFuentes[identificador];

          if (!fuentes) {
            return [];
          }

          return Array.isArray(fuentes) ? fuentes.filter(Boolean) : [fuentes];
        }

        function desecharImportacionFallida(resultado) {
          if (!resultado || !Array.isArray(resultado.meshes)) {
            return;
          }

          resultado.meshes.forEach(function (mesh) {
            if (mesh && mesh.dispose) {
              mesh.dispose(false, true);
            }
          });
        }

        async function cargarPrimeraFuenteValida({
          fuentes,
          identificador,
          tipo,
          preparar
        }) {
          if (fuentes.length === 0) {
            throw new Error('No existe un GLB preparado para ' + identificador + '.');
          }

          var errores = [];

          for (var indiceFuente = 0; indiceFuente < fuentes.length; indiceFuente += 1) {
            var resultado = null;

            try {
              resultado = await BABYLON.SceneLoader.ImportMeshAsync(
                null,
                '',
                fuentes[indiceFuente],
                scene,
                undefined,
                '.glb'
              );

              preparar(resultado);
              enviar({
                type: 'MODEL_LOADED',
                modelType: tipo,
                modelId: identificador,
                sourceIndex: indiceFuente
              });
              return;
            } catch (error) {
              desecharImportacionFallida(resultado);

              var mensaje = String(error && error.message ? error.message : error);
              errores.push('fuente ' + indiceFuente + ': ' + mensaje);
              enviar({
                type: 'MODEL_SOURCE_FAILED',
                modelType: tipo,
                modelId: identificador,
                sourceIndex: indiceFuente,
                message: mensaje
              });
            }
          }

          throw new Error(errores.join(' | '));
        }

        async function cargarModeloProducto(producto, grupo) {
          var fuentes = obtenerFuentesModelo(parametros.assetsPorProducto, producto.id);

          return cargarPrimeraFuenteValida({
            fuentes: fuentes,
            identificador: producto.id,
            tipo: 'producto',
            preparar: function (resultado) {
              prepararModeloImportado(resultado, grupo, {
                identificador: producto.id,
                productoId: producto.id,
                dimensionObjetivo: 0.76,
                baseY: -0.28
              });
            }
          });
        }

        async function crearDecoracion({
          clave,
          nombreNodo,
          posicion,
          rotacionY,
          dimensionObjetivo
        }) {
          var grupo = new BABYLON.TransformNode(nombreNodo, scene);
          grupo.position = posicion;
          grupo.rotation.y = rotacionY;

          try {
            await cargarPrimeraFuenteValida({
              fuentes: obtenerFuentesModelo(parametros.assetsDecoracion, clave),
              identificador: clave,
              tipo: 'decoracion',
              preparar: function (resultado) {
                prepararModeloImportado(resultado, grupo, {
                  identificador: clave + '-deco',
                  productoId: null,
                  dimensionObjetivo: dimensionObjetivo,
                  baseY: 0
                });
              }
            });
          } catch (error) {
            grupo.dispose();
            enviar({
              type: 'DECORATION_SKIPPED',
              modelId: clave,
              message: String(error && error.message ? error.message : error)
            });
          }
        }

        function obtenerProductoIdDesdeMesh(mesh) {
          var actual = mesh;

          while (actual) {
            if (actual.metadata && actual.metadata.tipo === 'producto') {
              return actual.metadata.productoId;
            }

            actual = actual.parent;
          }

          return null;
        }

        function crearProductoFallback(producto, posicion) {
          var id = normalizarProducto(producto.id);
          var meshes = [];
          var principal = null;

          if (id === 'banano') {
            principal = crearCapsula('producto-' + producto.id, {
              radius: 0.11,
              height: 0.66,
              tessellation: 28
            });
            principal.rotation.z = Math.PI / 2.65;
            principal.rotation.y = -0.42;
            principal.material = material('mat-' + producto.id, '#FFD34D', {
              emissive: '#FFD34D',
              emissiveScale: 0.06
            });
            meshes.push(principal);
          } else if (id === 'galleta') {
            principal = BABYLON.MeshBuilder.CreateCylinder('producto-' + producto.id, {
              diameter: 0.48,
              height: 0.11,
              tessellation: 40
            }, scene);
            principal.rotation.x = Math.PI / 2;
            principal.material = material('mat-' + producto.id, '#C9874F');
            meshes.push(principal);

            for (var i = 0; i < 6; i += 1) {
              var chip = BABYLON.MeshBuilder.CreateSphere('chip-' + producto.id + '-' + i, {
                diameter: 0.048,
                segments: 8
              }, scene);
              chip.position = new BABYLON.Vector3(-0.13 + (i % 3) * 0.13, 0.072, -0.065 + Math.floor(i / 3) * 0.13);
              chip.material = material('chip-mat-' + producto.id + '-' + i, '#5D341D');
              meshes.push(chip);
            }
          } else if (id === 'zanahoria') {
            principal = BABYLON.MeshBuilder.CreateCylinder('producto-' + producto.id, {
              diameterTop: 0.065,
              diameterBottom: 0.23,
              height: 0.66,
              tessellation: 28
            }, scene);
            principal.rotation.z = Math.PI / 5;
            principal.material = material('mat-' + producto.id, '#FF8D2E', {
              emissive: '#FF8D2E',
              emissiveScale: 0.05
            });
            meshes.push(principal);
            meshes.push(crearHoja('hoja-' + producto.id + '-1', -0.15, 0.33, 0));
            meshes.push(crearHoja('hoja-' + producto.id + '-2', -0.08, 0.35, 0));
          } else if (id === 'pan') {
            principal = crearCapsula('producto-' + producto.id, {
              radius: 0.17,
              height: 0.64,
              tessellation: 28
            });
            principal.rotation.z = Math.PI / 2;
            principal.material = material('mat-' + producto.id, '#D99143', {
              emissive: '#D99143',
              emissiveScale: 0.04
            });
            meshes.push(principal);
          } else if (id === 'lechuga') {
            principal = BABYLON.MeshBuilder.CreateSphere('producto-' + producto.id, {
              diameter: 0.48,
              segments: 24
            }, scene);
            principal.scaling = new BABYLON.Vector3(1.05, 0.72, 1);
            principal.material = material('mat-' + producto.id, '#79D65E', {
              emissive: '#79D65E',
              emissiveScale: 0.06
            });
            meshes.push(principal);
          } else if (id === 'leche') {
            principal = BABYLON.MeshBuilder.CreateBox('producto-' + producto.id, {
              width: 0.35,
              height: 0.54,
              depth: 0.28
            }, scene);
            principal.material = material('mat-' + producto.id, '#FFFFFF', {
              emissive: '#FFFFFF',
              emissiveScale: 0.03
            });
            meshes.push(principal);
          } else {
            principal = BABYLON.MeshBuilder.CreateSphere('producto-' + producto.id, {
              diameter: id === 'pera' ? 0.46 : 0.48,
              segments: 32
            }, scene);

            var colores = {
              tomate: '#EF4D3D',
              manzana: '#F95757',
              pera: '#C7DA50',
              muffin: '#C57952',
              queso: '#FFD45A'
            };

            principal.material = material('mat-' + producto.id, colores[id] || '#FFB000', {
              emissive: colores[id] || '#FFB000',
              emissiveScale: 0.045
            });
            meshes.push(principal);

            if (id === 'tomate' || id === 'manzana' || id === 'pera') {
              meshes.push(crearHoja('hoja-' + producto.id, 0.02, 0.30, 0));
            }
          }

          meshes.forEach(function (mesh) {
            mesh.position.addInPlace(posicion);
            mesh.scaling.multiplyInPlace(new BABYLON.Vector3(1.02, 1.02, 1.02));
          });

          asignarProducto(meshes, producto.id);

          return meshes;
        }

        function animarToque(grupo) {
          if (!grupo) return;

          var inicio = grupo.scaling.clone();
          var arriba = inicio.scale(1.08);

          BABYLON.Animation.CreateAndStartAnimation(
            'tap-' + grupo.name,
            grupo,
            'scaling',
            60,
            8,
            inicio,
            arriba,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            null,
            function () {
              BABYLON.Animation.CreateAndStartAnimation(
                'tap-back-' + grupo.name,
                grupo,
                'scaling',
                60,
                8,
                arriba,
                inicio,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
              );
            }
          );
        }

        function actualizarSeleccion(payload) {
          seleccionados = {};

          (payload.selectedProductIds || []).forEach(function (id) {
            seleccionados[id] = true;
          });

          Object.keys(productos).forEach(function (id) {
            var registro = productos[id];
            var activo = !!seleccionados[id];

            registro.halo.visibility = activo ? 1 : 0;
            registro.base.material = activo ? registro.materialActivo : registro.materialBase;
            registro.grupo.scaling = activo
              ? new BABYLON.Vector3(1.04, 1.04, 1.04)
              : new BABYLON.Vector3(1, 1, 1);
          });

          actualizarEtiquetasSeleccion();
        }

        function mostrarResultado(payload) {
          var estado = payload && payload.state;

          if (estado === 'success') {
            emitirChispas();
          }
        }

        function emitirChispas() {
          var colores = [PALETA.oro, PALETA.exito, '#FFFFFF'];

          for (var i = 0; i < 24; i += 1) {
            var chispa = BABYLON.MeshBuilder.CreateSphere('chispa-' + Date.now() + '-' + i, {
              diameter: 0.04 + Math.random() * 0.035,
              segments: 10
            }, scene);

            chispa.position = new BABYLON.Vector3(-0.45 + Math.random() * 0.9, 1.22 + Math.random() * 0.38, -0.22 + Math.random() * 0.44);
            chispa.material = material('chispa-mat-' + i + '-' + Date.now(), colores[i % colores.length], {
              emissive: colores[i % colores.length],
              emissiveScale: 0.52
            });
            chispa.metadata = {
              velocidad: new BABYLON.Vector3(-0.02 + Math.random() * 0.04, 0.018 + Math.random() * 0.035, -0.018 + Math.random() * 0.036),
              vida: 70
            };

            particulas.push(chispa);
          }
        }

        function crearEscenario() {
          var pared = BABYLON.MeshBuilder.CreatePlane('pared', {
            width: 8.8,
            height: 4.6
          }, scene);
          pared.position = new BABYLON.Vector3(0, 1.62, 1.48);
          pared.material = material('pared-mat', PALETA.pared, {
            emissive: PALETA.pared,
            emissiveScale: 0.04
          });

          var suelo = BABYLON.MeshBuilder.CreateGround('suelo', {
            width: 8.8,
            height: 5.8
          }, scene);
          suelo.position.y = -0.06;
          suelo.material = material('suelo-mat', PALETA.suelo, {
            emissive: PALETA.suelo,
            emissiveScale: 0.02
          });

          var mesa = BABYLON.MeshBuilder.CreateBox('mesa', {
            width: 4.95,
            height: 0.24,
            depth: 1.12
          }, scene);
          mesa.position = new BABYLON.Vector3(0, 0.28, 0.05);
          mesa.material = material('mesa-mat', PALETA.mesa, {
            emissive: PALETA.mesa,
            emissiveScale: 0.035
          });

          var brillo = BABYLON.MeshBuilder.CreateBox('mesa-brillo', {
            width: 4.58,
            height: 0.018,
            depth: 0.98
          }, scene);
          brillo.position = new BABYLON.Vector3(0, 0.42, 0.05);
          brillo.material = material('brillo-mat', PALETA.mesaBrillo, {
            emissive: PALETA.mesaBrillo,
            emissiveScale: 0.06,
            alpha: 0.70
          });

          var frente = BABYLON.MeshBuilder.CreateBox('frente-mesa', {
            width: 5.08,
            height: 0.44,
            depth: 0.13
          }, scene);
          frente.position = new BABYLON.Vector3(0, 0.07, -0.54);
          frente.material = material('frente-mat', PALETA.frente);

          [-2.38, 2.38].forEach(function (x, i) {
            var poste = BABYLON.MeshBuilder.CreateBox('poste-' + i, {
              width: 0.11,
              height: 1.66,
              depth: 0.11
            }, scene);
            poste.position = new BABYLON.Vector3(x, 0.94, 0.08);
            poste.material = material('poste-mat-' + i, PALETA.madera);
          });

          var logo = BABYLON.MeshBuilder.CreateBox('logo-simple', {
            width: 1.20,
            height: 0.10,
            depth: 0.06
          }, scene);
          logo.position = new BABYLON.Vector3(0, 1.68, 0.04);
          logo.material = material('logo-mat', '#35C9D0', {
            emissive: '#35C9D0',
            emissiveScale: 0.08
          });
        }

        function posicionProducto(index, total) {
          var posicionesTres = [
            new BABYLON.Vector3(-1.22, 0.80, -0.18),
            new BABYLON.Vector3(0, 0.80, -0.03),
            new BABYLON.Vector3(1.22, 0.80, -0.18)
          ];

          var posicionesCuatro = [
            new BABYLON.Vector3(-1.42, 0.80, -0.22),
            new BABYLON.Vector3(-0.48, 0.80, 0.10),
            new BABYLON.Vector3(0.48, 0.80, 0.10),
            new BABYLON.Vector3(1.42, 0.80, -0.22)
          ];

          return total > 3 ? posicionesCuatro[index] : posicionesTres[index] || posicionesTres[1];
        }

        async function crearProducto(producto, index) {
          var posicion = posicionProducto(index, parametros.productos.length);
          var grupo = new BABYLON.TransformNode('producto-grupo-' + producto.id, scene);

          grupo.position = posicion.clone();

          var base = BABYLON.MeshBuilder.CreateCylinder('base-' + producto.id, {
            diameter: 0.88,
            height: 0.055,
            tessellation: 48
          }, scene);
          base.position = new BABYLON.Vector3(0, -0.32, 0);
          base.parent = grupo;

          var materialBase = material('base-mat-' + producto.id, PALETA.crema);
          var materialActivo = material('base-activa-' + producto.id, '#E9FFF4', {
            emissive: PALETA.exito,
            emissiveScale: 0.12
          });

          base.material = materialBase;
          base.metadata = { tipo: 'producto', productoId: producto.id };

          var halo = BABYLON.MeshBuilder.CreateTorus('halo-' + producto.id, {
            diameter: 1.0,
            thickness: 0.045,
            tessellation: 48
          }, scene);
          halo.rotation.x = Math.PI / 2;
          halo.position = new BABYLON.Vector3(0, -0.286, 0);
          halo.parent = grupo;
          halo.material = material('halo-mat-' + producto.id, PALETA.exito, {
            emissive: PALETA.exito,
            emissiveScale: 0.35
          });
          halo.visibility = 0;

          var sombra = crearSombra('sombra-' + producto.id, 0.43);
          sombra.parent = grupo;
          sombra.position = new BABYLON.Vector3(0, -0.33, 0);

          try {
            await cargarModeloProducto(producto, grupo);
          } catch (error) {
            var meshes = crearProductoFallback(producto, new BABYLON.Vector3(0, -0.02, 0));

            meshes.forEach(function (mesh) {
              mesh.parent = grupo;
            });

            enviar({
              type: 'MODEL_FALLBACK_USED',
              productId: producto.id,
              message: String(error && error.message ? error.message : error)
            });
          }

          productos[producto.id] = {
            grupo: grupo,
            base: base,
            halo: halo,
            materialBase: materialBase,
            materialActivo: materialActivo
          };
        }

        window.recibirMercado = function (mensaje) {
          if (!mensaje || !mensaje.type) return;

          if (mensaje.type === 'SET_CART') {
            actualizarSeleccion(mensaje.payload || {});
          }

          if (mensaje.type === 'SHOW_RESULT') {
            mostrarResultado(mensaje.payload || {});
          }
        };

        async function iniciar() {
          if (!window.BABYLON) {
            fallback.style.display = 'flex';
            enviar({
              type: 'SCENE_ERROR',
              message: 'Babylon no cargó desde CDN'
            });
            return;
          }

          engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            premultipliedAlpha: false
          });

          scene = new BABYLON.Scene(engine);
          scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

          var camera = new BABYLON.ArcRotateCamera(
            'camara',
            Math.PI / 2,
            Math.PI / 3.26,
            4.08,
            new BABYLON.Vector3(0, 0.84, -0.06),
            scene
          );

          camera.attachControl(canvas, true);
          camera.lowerRadiusLimit = 3.98;
          camera.upperRadiusLimit = 4.18;
          camera.lowerBetaLimit = Math.PI / 3.34;
          camera.upperBetaLimit = Math.PI / 3.16;
          camera.lowerAlphaLimit = Math.PI / 2 - 0.03;
          camera.upperAlphaLimit = Math.PI / 2 + 0.03;
          camera.wheelPrecision = 120;
          camera.pinchPrecision = 140;

          var ambiente = new BABYLON.HemisphericLight('ambiente', new BABYLON.Vector3(0.2, 1, 0.5), scene);
          ambiente.intensity = 1.15;

          var foco = new BABYLON.DirectionalLight('foco', new BABYLON.Vector3(-0.35, -1, -0.45), scene);
          foco.position = new BABYLON.Vector3(2.4, 4.2, -2.8);
          foco.intensity = 1.25;

          crearEscenario();
          await Promise.all([
            crearDecoracion({
              clave: 'carrito',
              nombreNodo: 'carrito-deco',
              posicion: new BABYLON.Vector3(1.88, 0.34, 0.62),
              rotacionY: -0.38,
              dimensionObjetivo: 1.02
            }),
            crearDecoracion({
              clave: 'caja',
              nombreNodo: 'caja-deco',
              posicion: new BABYLON.Vector3(-1.92, 0.43, 0.55),
              rotacionY: 0.34,
              dimensionObjetivo: 0.72
            }),
            Promise.all(parametros.productos.map(crearProducto))
          ]);

          scene.onPointerObservable.add(function (info) {
            if (info.type !== BABYLON.PointerEventTypes.POINTERDOWN) return;

            var pick = scene.pick(scene.pointerX, scene.pointerY, function (mesh) {
              return !!obtenerProductoIdDesdeMesh(mesh);
            });

            var productId = obtenerProductoIdDesdeMesh(pick && pick.hit ? pick.pickedMesh : null);

            if (!productId) return;

            var ahora = Date.now();

            if (
              ultimoToqueProducto.id === productId &&
              ahora - ultimoToqueProducto.tiempo < 260
            ) {
              return;
            }

            ultimoToqueProducto = { id: productId, tiempo: ahora };

            animarToque(productos[productId] && productos[productId].grupo);
            enviar({
              type: 'PRODUCT_TOGGLED',
              productId: productId
            });
          });

          engine.runRenderLoop(function () {
            var t = performance.now() * 0.001;

            Object.keys(productos).forEach(function (id, index) {
              var registro = productos[id];
              registro.grupo.rotation.y = Math.sin(t + index) * 0.012;
              registro.grupo.position.y =
                posicionProducto(index, parametros.productos.length).y +
                Math.sin(t * 1.25 + index) * 0.010;
            });

            for (var i = particulas.length - 1; i >= 0; i -= 1) {
              var p = particulas[i];
              p.position.addInPlace(p.metadata.velocidad);
              p.metadata.vida -= 1;
              p.material.alpha = Math.max(0, p.metadata.vida / 70);

              if (p.metadata.vida <= 0) {
                p.dispose();
                particulas.splice(i, 1);
              }
            }

            scene.render();
          });

          window.addEventListener('resize', function () {
            engine.resize();
          });

          enviar({ type: 'SCENE_READY' });
        }

        setTimeout(iniciar, 80);
      })();
    </script>
  </body>
</html>`;
};
