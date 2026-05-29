const serializar = (valor) => JSON.stringify(valor).replace(/</g, '\\u003c');

export const generarHtmlMotorBabylon = (parametrosIniciales) => {
  const parametros = serializar(parametrosIniciales);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
    <script src="https://cdn.babylonjs.com/babylon.js"></script>
    <style>
      html, body, #renderCanvas { width: 100%; height: 100%; margin: 0; overflow: hidden; touch-action: none; background: linear-gradient(#8fd7ff 0%, #d8f5ff 48%, #72c66a 49%, #3fa55a 100%); }
      #fallback {
        position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
        padding: 24px; color: #fff; font: 700 16px system-ui; text-align: center; background: #06131f;
      }
    </style>
  </head>
  <body>
    <canvas id="renderCanvas"></canvas>
    <div id="fallback">No fue posible cargar el motor 3D. Revisa la conexion a internet y vuelve a entrar.</div>
    <script>
      (function () {
        var parametros = ${parametros};
        var canvas = document.getElementById('renderCanvas');
        var fallback = document.getElementById('fallback');
        var engine = null;
        var scene = null;
        var vagones = [];
        var opciones = [];
        var grupoTren = null;
        var estadoTren = 'estacionado'; // 'entrando' | 'saliendo' | 'estacionado'
        var estado = {
          patron: [],
          dificultad: 1,
          velocidadTren: 1,
          indiceActual: 0,
          aciertos: 0,
          errores: 0,
          combo: 0,
          comboMaximo: 0,
          inicioNivelMs: Date.now(),
          ultimaJugadaMs: Date.now(),
          seleccion: null
        };

        function enviar(payload) {
          if (!window.ReactNativeWebView) return;
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }

        function color3(hex) {
          return BABYLON.Color3.FromHexString(hex || '#ffffff');
        }

        function material(nombre, hex, emissive) {
          var mat = new BABYLON.StandardMaterial(nombre, scene);
          mat.diffuseColor = color3(hex);
          mat.specularColor = new BABYLON.Color3(0.28, 0.28, 0.28);
          if (emissive) mat.emissiveColor = color3(hex).scale(0.18);
          return mat;
        }

        function crearNube(nombre, x, y, z, escala) {
          var partes = [];
          [[0, 0, 0], [0.32, 0.08, 0], [-0.32, 0.05, 0], [0.08, 0.2, 0]].forEach(function (p, i) {
            var esfera = BABYLON.MeshBuilder.CreateSphere(nombre + '-' + i, { diameter: escala * (i === 3 ? 0.42 : 0.52), segments: 14 }, scene);
            esfera.position = new BABYLON.Vector3(x + p[0], y + p[1], z + p[2]);
            esfera.material = material(nombre + '-mat-' + i, '#ffffff');
            partes.push(esfera);
          });
          vagones.push.apply(vagones, partes);
        }

        function limpiarEscena() {
          vagones.forEach(function (m) { m.dispose(); });
          opciones.forEach(function (m) { m.dispose(); });
          vagones = [];
          opciones = [];
          if (grupoTren) {
            grupoTren.position.x = 0;
          }
        }

        function crearFigura(tipo, nombre, posicion, escala, hex) {
          var mesh;
          if (tipo === 'circulo') {
            mesh = BABYLON.MeshBuilder.CreateSphere(nombre, { diameter: 0.72 * escala, segments: 24 }, scene);
          } else if (tipo === 'cuadrado') {
            mesh = BABYLON.MeshBuilder.CreateBox(nombre, { size: 0.72 * escala }, scene);
          } else if (tipo === 'triangulo') {
            mesh = BABYLON.MeshBuilder.CreatePolyhedron(nombre, { type: 0, size: 0.58 * escala }, scene);
          } else {
            mesh = BABYLON.MeshBuilder.CreateCylinder(nombre, { diameterTop: 0, diameterBottom: 0.8 * escala, height: 0.7 * escala, tessellation: 5 }, scene);
          }
          mesh.position = posicion;
          mesh.material = material(nombre + '-mat', hex, true);
          return mesh;
        }

        function crearVagon(paso, indice) {
          var x = -4.05 + indice * 0.86;
          var base = BABYLON.MeshBuilder.CreateBox('vagon-' + indice, { width: 0.74, height: 0.44, depth: 0.72 }, scene);
          base.position = new BABYLON.Vector3(x, 0, 0);
          base.material = material('vagon-mat-' + indice, indice === estado.indiceActual ? '#ffd85f' : '#4bb2e6');
          base.metadata = { tipo: 'vagon', indice: indice, paso: paso };

          var ruedaA = BABYLON.MeshBuilder.CreateCylinder('rueda-a-' + indice, { diameter: 0.18, height: 0.1, tessellation: 18 }, scene);
          ruedaA.rotation.z = Math.PI / 2;
          ruedaA.position = new BABYLON.Vector3(x - 0.2, -0.32, 0.38);
          ruedaA.material = material('rueda-mat-a-' + indice, '#263348');

          var ruedaB = ruedaA.clone('rueda-b-' + indice);
          ruedaB.position.x = x + 0.2;

          var esperado = crearFigura(paso.figuraId, 'objetivo-' + indice, new BABYLON.Vector3(x, 0.43, 0), 0.42, indice < estado.indiceActual ? paso.colorHex : '#e9f2fb');
          esperado.visibility = indice < estado.indiceActual ? 1 : 0.28;
          esperado.metadata = { decoracion: true, indice: indice };

          base.parent = grupoTren;
          ruedaA.parent = grupoTren;
          ruedaB.parent = grupoTren;
          esperado.parent = grupoTren;

          vagones.push(base, ruedaA, ruedaB, esperado);
        }

        function crearLocomotora() {
          var cuerpo = BABYLON.MeshBuilder.CreateBox('locomotora', { width: 0.96, height: 0.7, depth: 0.82 }, scene);
          cuerpo.position = new BABYLON.Vector3(-5.05, 0.05, 0);
          cuerpo.material = material('locomotora-mat', '#ff6b6b');
          var chimenea = BABYLON.MeshBuilder.CreateCylinder('chimenea', { diameter: 0.24, height: 0.45, tessellation: 18 }, scene);
          chimenea.position = new BABYLON.Vector3(-5.22, 0.65, 0);
          chimenea.material = material('chimenea-mat', '#273548');
          
          cuerpo.parent = grupoTren;
          chimenea.parent = grupoTren;

          vagones.push(cuerpo, chimenea);
        }

        function opcionesUnicas() {
          var mapa = {};
          estado.patron.forEach(function (paso) { mapa[paso.clave] = paso; });
          return Object.keys(mapa).map(function (clave) { return mapa[clave]; });
        }

        function crearOpciones() {
          opcionesUnicas().forEach(function (paso, indice) {
            var x = -2.0 + indice * 1.35;
            var mesh = crearFigura(paso.figuraId, 'opcion-' + paso.clave, new BABYLON.Vector3(x, -0.3, 1.8), 1.1, paso.colorHex);
            mesh.metadata = { tipo: 'opcion', paso: paso, xStart: x, yStart: -0.3, zStart: 1.8 };
            
            // PointerDragBehavior Setup
            var dragBehavior = new BABYLON.PointerDragBehavior({ dragPlaneNormal: new BABYLON.Vector3(0, 0, 1) });
            dragBehavior.useObjectOrientationForDragging = false;
            
            var hasDragged = false;
            
            dragBehavior.onDragStartObservable.add(function() {
              hasDragged = false;
              marcarSeleccion(mesh);
              if (scene.activeCamera && canvas) {
                scene.activeCamera.detachControl(canvas);
              }
            });
            
            dragBehavior.onDragObservable.add(function() {
              hasDragged = true;
              // Interpolate Z from 1.8 to 0 as Y goes from -0.3 to 0.43 (wagon height)
              var progress = (mesh.position.y - (-0.3)) / (0.43 - (-0.3));
              progress = Math.max(0, Math.min(1, progress));
              mesh.position.z = 1.8 + (0 - 1.8) * progress;
            });
            
            dragBehavior.onDragEndObservable.add(function() {
              if (scene.activeCamera && canvas) {
                scene.activeCamera.attachControl(canvas, true);
              }
              
              var xWagon = -4.05 + estado.indiceActual * 0.86;
              var yWagon = 0.43;
              
              var dx = mesh.position.x - xWagon;
              var dy = mesh.position.y - yWagon;
              var dist = Math.sqrt(dx * dx + dy * dy);
              
              if (hasDragged && dist < 1.0) {
                resolverJugada();
              } else {
                // Snap back to starting position
                BABYLON.Animation.CreateAndStartAnimation(
                  'snapBack', mesh, 'position', 60, 12,
                  mesh.position, new BABYLON.Vector3(mesh.metadata.xStart, mesh.metadata.yStart, mesh.metadata.zStart),
                  BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                // Reset mesh scale just in case
                mesh.scaling = new BABYLON.Vector3(1, 1, 1);
              }
            });
            
            mesh.addBehavior(dragBehavior);
            opciones.push(mesh);
          });
        }

        function marcarSeleccion(mesh) {
          opciones.forEach(function (opcion) { opcion.scaling = new BABYLON.Vector3(1, 1, 1); });
          estado.seleccion = mesh.metadata.paso;
          mesh.scaling = new BABYLON.Vector3(1.22, 1.22, 1.22);
        }

        function resolverJugada() {
          if (!estado.seleccion || estado.indiceActual >= estado.patron.length || estadoTren !== 'estacionado') return;
          var esperado = estado.patron[estado.indiceActual];
          var acierto = estado.seleccion.clave === esperado.clave;
          var ahora = Date.now();
          var tiempoReaccionMs = ahora - estado.ultimaJugadaMs;
          estado.ultimaJugadaMs = ahora;

          if (acierto) {
            estado.aciertos += 1;
            estado.combo += 1;
            estado.comboMaximo = Math.max(estado.comboMaximo, estado.combo);
            estado.indiceActual += 1;
          } else {
            estado.errores += 1;
            estado.combo = 0;
          }

          enviar({
            tipo: acierto ? 'acierto' : 'error',
            tiempoReaccionMs: tiempoReaccionMs,
            puntos: acierto ? 10 : 0,
            comboEnEvento: estado.combo,
            vagonIndex: estado.indiceActual,
            figuraSolicitada: esperado.figuraId,
            colorSolicitado: esperado.colorId,
            figuraIngresada: estado.seleccion.figuraId,
            colorIngresado: estado.seleccion.colorId
          });

          estado.seleccion = null;
          dibujarNivel();

          if (estado.indiceActual >= estado.patron.length) {
            estadoTren = 'saliendo';
          }
        }

        function dibujarNivel() {
          limpiarEscena();
          crearLocomotora();
          estado.patron.forEach(crearVagon);
          crearOpciones();
          crearNube('nube-a', -3.8, 2.15, 1.8, 0.85);
          crearNube('nube-b', 2.9, 2.35, 1.9, 0.75);
        }

        window.iniciarNuevoNivel = function (params) {
          estado.patron = params.patron || [];
          estado.dificultad = params.dificultad || 1;
          estado.velocidadTren = params.velocidadTren || 1;
          estado.indiceActual = 0;
          estado.aciertos = 0;
          estado.errores = 0;
          estado.combo = 0;
          estado.comboMaximo = 0;
          estado.inicioNivelMs = Date.now();
          estado.ultimaJugadaMs = Date.now();
          estado.seleccion = null;
          dibujarNivel();
          
          if (grupoTren) {
            grupoTren.position.x = -12.0;
            estadoTren = 'entrando';
          }
        };

        function iniciar() {
          if (!window.BABYLON) {
            fallback.style.display = 'flex';
            enviar({ tipo: 'errorMotor', mensaje: 'Babylon.js no cargo desde CDN' });
            return;
          }

          engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
          scene = new BABYLON.Scene(engine);
          scene.clearColor = new BABYLON.Color4(0.57, 0.86, 1, 1);

          var camera = new BABYLON.ArcRotateCamera('camara', Math.PI / 2, Math.PI / 2.52, 9.9, new BABYLON.Vector3(-0.75, -0.05, 0), scene);
          camera.attachControl(canvas, true);
          camera.lowerRadiusLimit = 6.8;
          camera.upperRadiusLimit = 13;
          camera.wheelPrecision = 36;
          camera.pinchPrecision = 52;
          if (camera.inputs.attached.pointers) {
            camera.inputs.attached.pointers.buttons = [0];
          }

          new BABYLON.HemisphericLight('luz', new BABYLON.Vector3(0.2, 1, 0.4), scene).intensity = 1.3;
          var sol = BABYLON.MeshBuilder.CreateSphere('sol', { diameter: 0.72, segments: 18 }, scene);
          sol.position = new BABYLON.Vector3(4.4, 2.8, 2.4);
          sol.material = material('sol-mat', '#ffd85f', true);
          var suelo = BABYLON.MeshBuilder.CreateGround('suelo', { width: 13, height: 5.2 }, scene);
          suelo.position.y = -0.66;
          suelo.material = material('suelo-mat', '#52b86a');
          var rielA = BABYLON.MeshBuilder.CreateBox('riel-a', { width: 11.5, height: 0.06, depth: 0.06 }, scene);
          rielA.position = new BABYLON.Vector3(-0.7, -0.44, 0.42);
          rielA.material = material('riel-a-mat', '#59677c');
          var rielB = rielA.clone('riel-b');
          rielB.position.z = -0.42;
          for (var i = 0; i < 18; i += 1) {
            var durmiente = BABYLON.MeshBuilder.CreateBox('durmiente-' + i, { width: 0.08, height: 0.08, depth: 1.1 }, scene);
            durmiente.position = new BABYLON.Vector3(-5.7 + i * 0.62, -0.5, 0);
            durmiente.material = material('durmiente-mat-' + i, '#8b6748');
          }

          grupoTren = new BABYLON.TransformNode('grupoTren', scene);

          // Tunnels (Left and Right)
          var tunelMat = material('tunel-mat', '#b87c4c');
          var fondoMat = material('fondo-mat', '#000000');

          var tunelIzq = BABYLON.MeshBuilder.CreateCylinder('tunel-izq', { diameter: 2.2, height: 2.2, tessellation: 16 }, scene);
          tunelIzq.rotation.z = Math.PI / 2;
          tunelIzq.position = new BABYLON.Vector3(-7.5, 0.3, 0);
          tunelIzq.material = tunelMat;

          var fondoIzq = BABYLON.MeshBuilder.CreatePlane('fondo-izq', { size: 2.2 }, scene);
          fondoIzq.rotation.y = Math.PI / 2;
          fondoIzq.position = new BABYLON.Vector3(-8.5, 0.3, 0);
          fondoIzq.material = fondoMat;

          var tunelDer = BABYLON.MeshBuilder.CreateCylinder('tunel-der', { diameter: 2.2, height: 2.2, tessellation: 16 }, scene);
          tunelDer.rotation.z = Math.PI / 2;
          tunelDer.position = new BABYLON.Vector3(7.5, 0.3, 0);
          tunelDer.material = tunelMat;

          var fondoDer = BABYLON.MeshBuilder.CreatePlane('fondo-der', { size: 2.2 }, scene);
          fondoDer.rotation.y = Math.PI / 2;
          fondoDer.position = new BABYLON.Vector3(8.5, 0.3, 0);
          fondoDer.material = fondoMat;

          scene.onPointerObservable.add(function (info) {
            if (estadoTren !== 'estacionado') return;
            if (info.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
            var picked = info.pickInfo && info.pickInfo.pickedMesh;
            if (!picked || !picked.metadata) return;
            if (picked.metadata.tipo === 'opcion') marcarSeleccion(picked);
            if (picked.metadata.tipo === 'vagon') {
              if (picked.metadata.indice === estado.indiceActual) {
                resolverJugada();
              }
            }
          });

          window.establecerSeleccion = function (clave) {
            if (estadoTren !== 'estacionado') return;
            var picked = opciones.find(function (op) { return op.metadata && op.metadata.paso.clave === clave; });
            if (picked) {
              marcarSeleccion(picked);
              resolverJugada();
            }
          };

          window.iniciarNuevoNivel(parametros);
          
          engine.runRenderLoop(function () {
            var t = performance.now() * 0.001 * estado.velocidadTren;
            
            if (grupoTren) {
              if (estadoTren === 'entrando') {
                grupoTren.position.x += 0.08 * estado.velocidadTren;
                if (grupoTren.position.x >= 0) {
                  grupoTren.position.x = 0;
                  estadoTren = 'estacionado';
                }
              } else if (estadoTren === 'saliendo') {
                grupoTren.position.x += 0.08 * estado.velocidadTren;
                if (grupoTren.position.x >= 12.0) {
                  grupoTren.position.x = 12.0;
                  estadoTren = 'estacionado';
                  
                  enviar({
                    tipo: 'nivelCompletado',
                    aciertos: estado.aciertos,
                    errores: estado.errores,
                    comboMaximo: estado.comboMaximo,
                    tiempoNivelMs: Date.now() - estado.inicioNivelMs
                  });
                }
              }
            }

            vagones.forEach(function (mesh) {
              if (mesh.metadata && mesh.metadata.decoracion) {
                mesh.rotation.y += 0.01;
              }
              if (mesh.name.indexOf('rueda') === 0) {
                if (estadoTren !== 'estacionado') {
                  mesh.rotation.x += 0.15 * estado.velocidadTren;
                }
              }
              
              var globalX = mesh.absolutePosition.x;
              if (globalX > 7.0 || globalX < -7.0) {
                mesh.visibility = 0;
              } else {
                if (mesh.metadata && mesh.metadata.decoracion) {
                  mesh.visibility = mesh.metadata.indice < estado.indiceActual ? 1 : 0.28;
                } else {
                  mesh.visibility = 1;
                }
              }
            });
            scene.render();
          });
          window.addEventListener('resize', function () { engine.resize(); });
          enviar({ tipo: 'motorListo' });
        }

        setTimeout(iniciar, 50);
      })();
    </script>
  </body>
</html>`;
};
