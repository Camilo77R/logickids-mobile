const serializar = (valor) => JSON.stringify(valor).replace(/</g, '\\u003c');
export const generarHtmlMotorBabylon = (parametrosIniciales, opciones = {}) => {
  const parametros = serializar(parametrosIniciales);
  const babylonScriptUri = opciones.babylonScriptUri ?? '';
  const fondoTrenUri = opciones.fondoTrenUri ?? '';
  const fondoTren = fondoTrenUri
    ? `url(${serializar(fondoTrenUri)}) center center / cover no-repeat,`
    : '';
  const babylonScriptTag = babylonScriptUri
    ? `<script src=${serializar(babylonScriptUri)}></script>`
    : '<script src="https://cdn.babylonjs.com/babylon.js"></script>';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
    ${babylonScriptTag}
    <style>
      html, body, #renderCanvas { width: 100%; height: 100%; margin: 0; overflow: hidden; touch-action: none; }
      body {
        background:
          linear-gradient(rgba(143, 215, 255, 0.38), rgba(114, 198, 106, 0.18)),
          ${fondoTren}
          linear-gradient(#8fd7ff 0%, #d8f5ff 48%, #72c66a 49%, #3fa55a 100%);
      }
      #renderCanvas { display: block; background: transparent; }
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
        var grupoTren = null;
        var estadoTren = 'entrando'; // 'entrando' | 'jugando' | 'saliendo' | 'nivelCompletado' | 'nivelFallido'
        var inicioRecorridoX = -12.0;
        var finRecorridoX = 12.0;
        var estado = {
          patron: [],
          dificultad: 1,
          velocidadTren: 1,
          vueltasMaximas: 6,
          vueltasConsumidas: 0,
          opacidadFiguraGuia: 0.86,
          completados: {},
          totalCompletados: 0,
          aciertos: 0,
          errores: 0,
          combo: 0,
          comboMaximo: 0,
          inicioNivelMs: Date.now(),
          ultimaJugadaMs: Date.now(),
          nivelReportado: false,
          seleccion: null,
          jugadaPendiente: null
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
          mat.backFaceCulling = false;
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
          vagones = [];
        }

        function crearMallaPlana(nombre, puntos, posicion, escala, hex) {
          var mesh = new BABYLON.Mesh(nombre, scene);
          var posiciones = [];
          var indices = [];
          var normales = [];

          puntos.forEach(function (p) {
            posiciones.push(p[0] * escala, p[1] * escala, 0);
          });

          for (var i = 1; i < puntos.length - 1; i += 1) {
            indices.push(0, i, i + 1);
          }

          mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, posiciones);
          mesh.setIndices(indices);
          BABYLON.VertexData.ComputeNormals(posiciones, indices, normales);
          mesh.position = posicion;
          mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normales);
          mesh.material = material(nombre + '-mat', hex, true);
          return mesh;
        }

        function crearEstrella(nombre, posicion, escala, hex) {
          var puntos = [];
          for (var i = 0; i < 10; i += 1) {
            var radio = i % 2 === 0 ? 0.48 : 0.22;
            var angulo = -Math.PI / 2 + i * Math.PI / 5;
            puntos.push([Math.cos(angulo) * radio, Math.sin(angulo) * radio]);
          }

          return crearMallaPlana(nombre, puntos, posicion, escala, hex);
        }

        function crearFigura(tipo, nombre, posicion, escala, hex) {
          var mesh;
          if (tipo === 'circulo') {
            mesh = BABYLON.MeshBuilder.CreateSphere(nombre, { diameter: 0.72 * escala, segments: 24 }, scene);
          } else if (tipo === 'cuadrado') {
            mesh = BABYLON.MeshBuilder.CreateBox(nombre, { size: 0.72 * escala }, scene);
          } else if (tipo === 'triangulo') {
            mesh = crearMallaPlana(nombre, [[0, 0.48], [-0.46, -0.34], [0.46, -0.34]], posicion, escala, hex);
          } else {
            mesh = crearEstrella(nombre, posicion, escala, hex);
          }
          if (!mesh.position.equals(posicion)) {
            mesh.position = posicion;
          }
          if (!mesh.material) {
            mesh.material = material(nombre + '-mat', hex, true);
          }
          return mesh;
        }

        function obtenerXvagon(indice) {
          return -5.25 + indice * 1.02;
        }

        function obtenerXLocomotora() {
          return obtenerXvagon(Math.max(estado.patron.length, 1)) + 0.12;
        }

        function crearVagon(paso, indice) {
          var x = obtenerXvagon(indice);
          var completado = !!estado.completados[indice];
          var seleccionado = estado.seleccion && estado.seleccion.clave === paso.clave;
          var base = BABYLON.MeshBuilder.CreateBox('vagon-' + indice, { width: 0.9, height: 0.56, depth: 0.82 }, scene);
          base.position = new BABYLON.Vector3(x, 0, 0);
          base.material = material('vagon-mat-' + indice, completado ? '#64d28a' : seleccionado ? '#ffd85f' : '#4bb2e6');
          base.isPickable = true;
          base.metadata = { tipo: 'vagon', indice: indice, paso: paso };

          var ruedaA = BABYLON.MeshBuilder.CreateCylinder('rueda-a-' + indice, { diameter: 0.18, height: 0.1, tessellation: 18 }, scene);
          ruedaA.rotation.z = Math.PI / 2;
          ruedaA.position = new BABYLON.Vector3(x - 0.25, -0.38, 0.43);
          ruedaA.material = material('rueda-mat-a-' + indice, '#263348');
          ruedaA.isPickable = true;
          ruedaA.metadata = { tipo: 'vagon', indice: indice, paso: paso };

          var ruedaB = ruedaA.clone('rueda-b-' + indice);
          ruedaB.position.x = x + 0.2;
          ruedaB.isPickable = true;
          ruedaB.metadata = { tipo: 'vagon', indice: indice, paso: paso };

          var esperado = crearFigura(paso.figuraId, 'objetivo-' + indice, new BABYLON.Vector3(x, 0.56, 0), 0.58, paso.colorHex);
          esperado.visibility = completado ? 1 : estado.opacidadFiguraGuia;
          esperado.renderOutline = true;
          esperado.outlineColor = color3('#17324d');
          esperado.outlineWidth = 0.045;
          esperado.isPickable = true;
          esperado.metadata = { tipo: 'vagon', decoracion: true, indice: indice, paso: paso };

          var hitbox = BABYLON.MeshBuilder.CreateBox(
            'hitbox-vagon-' + indice,
            { width: 1.34, height: 1.52, depth: 1.28 },
            scene
          );
          hitbox.position = new BABYLON.Vector3(x, 0.22, 0);
          hitbox.material = material('hitbox-vagon-mat-' + indice, '#ffffff');
          hitbox.material.alpha = 0.01;
          hitbox.isPickable = true;
          hitbox.metadata = { tipo: 'vagon', hitbox: true, indice: indice, paso: paso };

          base.parent = grupoTren;
          ruedaA.parent = grupoTren;
          ruedaB.parent = grupoTren;
          esperado.parent = grupoTren;
          hitbox.parent = grupoTren;

          vagones.push(base, ruedaA, ruedaB, esperado, hitbox);
        }

        function crearLocomotora() {
          var x = obtenerXLocomotora();

          var cuerpo = BABYLON.MeshBuilder.CreateBox('locomotora', { width: 1.26, height: 0.78, depth: 0.92 }, scene);
          cuerpo.position = new BABYLON.Vector3(x, 0.08, 0);
          cuerpo.material = material('locomotora-mat', '#ff6b6b');

          var cabina = BABYLON.MeshBuilder.CreateBox('cabina-locomotora', { width: 0.48, height: 0.58, depth: 0.78 }, scene);
          cabina.position = new BABYLON.Vector3(x - 0.28, 0.62, 0);
          cabina.material = material('cabina-locomotora-mat', '#4bb2e6');

          var chimenea = BABYLON.MeshBuilder.CreateCylinder('chimenea', { diameter: 0.3, height: 0.5, tessellation: 18 }, scene);
          chimenea.position = new BABYLON.Vector3(x + 0.28, 0.76, 0);
          chimenea.material = material('chimenea-mat', '#273548');

          var faro = BABYLON.MeshBuilder.CreateSphere('faro-locomotora', { diameter: 0.22, segments: 16 }, scene);
          faro.position = new BABYLON.Vector3(x + 0.66, 0.2, 0);
          faro.material = material('faro-locomotora-mat', '#fff2a8', true);

          var ruedaLocomotoraA = BABYLON.MeshBuilder.CreateCylinder('rueda-locomotora-a', { diameter: 0.26, height: 0.12, tessellation: 20 }, scene);
          ruedaLocomotoraA.rotation.z = Math.PI / 2;
          ruedaLocomotoraA.position = new BABYLON.Vector3(x - 0.36, -0.38, 0.43);
          ruedaLocomotoraA.material = material('rueda-locomotora-a-mat', '#263348');

          var ruedaLocomotoraB = ruedaLocomotoraA.clone('rueda-locomotora-b');
          ruedaLocomotoraB.position.x = x + 0.34;

          cuerpo.parent = grupoTren;
          cabina.parent = grupoTren;
          chimenea.parent = grupoTren;
          faro.parent = grupoTren;
          ruedaLocomotoraA.parent = grupoTren;
          ruedaLocomotoraB.parent = grupoTren;

          vagones.push(cuerpo, cabina, chimenea, faro, ruedaLocomotoraA, ruedaLocomotoraB);
        }

        function marcarSeleccion(paso) {
          estado.seleccion = paso;
          enviar({
            tipo: 'seleccionActualizada',
            clave: paso ? paso.clave : null
          });
          actualizarVisualesNivel();
        }

        function reportarNivelCompletado() {
          if (estado.nivelReportado) return;
          estado.nivelReportado = true;
          enviar({
            tipo: 'nivelCompletado',
            motivo: 'patron_completado',
            aciertos: estado.aciertos,
            errores: estado.errores,
            comboMaximo: estado.comboMaximo,
            tiempoNivelMs: Date.now() - estado.inicioNivelMs,
            vueltasMaximas: estado.vueltasMaximas,
            vueltasConsumidas: estado.vueltasConsumidas,
            vagonesPendientes: 0
          });
        }

        function reportarVuelta(trenDisponible) {
          enviar({
            tipo: 'vueltaActualizada',
            vueltasMaximas: estado.vueltasMaximas,
            vueltasConsumidas: estado.vueltasConsumidas,
            vueltasRestantes: Math.max(0, estado.vueltasMaximas - estado.vueltasConsumidas),
            trenDisponible: trenDisponible === true
          });
        }

        function reportarNivelFallido() {
          if (estado.nivelReportado) return;
          estado.nivelReportado = true;
          enviar({
            tipo: 'nivelFallido',
            motivo: 'vueltas_agotadas',
            aciertos: estado.aciertos,
            errores: estado.errores,
            comboMaximo: estado.comboMaximo,
            tiempoNivelMs: Date.now() - estado.inicioNivelMs,
            vueltasMaximas: estado.vueltasMaximas,
            vueltasConsumidas: estado.vueltasConsumidas,
            vagonesPendientes: Math.max(0, estado.patron.length - estado.totalCompletados)
          });
        }

        function agendarJugadaPendiente(indiceVagon) {
          if (!estado.seleccion || indiceVagon == null || estado.completados[indiceVagon]) {
            return;
          }

          estado.jugadaPendiente = {
            indiceVagon: indiceVagon,
            claveSeleccion: estado.seleccion.clave
          };
        }

        function intentarResolverJugadaPendiente() {
          if (!estado.jugadaPendiente || estadoTren !== 'jugando') {
            return;
          }

          var jugadaPendiente = estado.jugadaPendiente;
          estado.jugadaPendiente = null;

          if (!estado.seleccion || estado.seleccion.clave !== jugadaPendiente.claveSeleccion) {
            return;
          }

          resolverJugada(jugadaPendiente.indiceVagon);
        }

        function resolverJugada(indiceVagon) {
          if (!estado.seleccion || indiceVagon == null || estado.completados[indiceVagon]) return;
          if (estadoTren !== 'jugando') {
            if (estadoTren === 'entrando') {
              agendarJugadaPendiente(indiceVagon);
            }
            return;
          }
          var esperado = estado.patron[indiceVagon];
          if (!esperado) return;
          var acierto = estado.seleccion.clave === esperado.clave;
          var ahora = Date.now();
          var tiempoReaccionMs = ahora - estado.ultimaJugadaMs;
          estado.ultimaJugadaMs = ahora;

          if (acierto) {
            estado.aciertos += 1;
            estado.combo += 1;
            estado.comboMaximo = Math.max(estado.comboMaximo, estado.combo);
            estado.completados[indiceVagon] = true;
            estado.totalCompletados += 1;
          } else {
            estado.errores += 1;
            estado.combo = 0;
          }

          var nivelCompletado = acierto && estado.totalCompletados >= estado.patron.length;

          enviar({
            tipo: acierto ? 'acierto' : 'error',
            tiempoReaccionMs: tiempoReaccionMs,
            puntos: acierto ? 10 : 0,
            comboEnEvento: estado.combo,
            vagonIndex: indiceVagon,
            figuraSolicitada: esperado.figuraId,
            colorSolicitado: esperado.colorId,
            figuraIngresada: estado.seleccion.figuraId,
            colorIngresado: estado.seleccion.colorId,
            nivelCompletado: nivelCompletado
          });

          marcarSeleccion(null);
          actualizarVisualesNivel();

          if (nivelCompletado) {
            estadoTren = 'saliendo';
            reportarNivelCompletado();
          }
        }

        function dibujarNivel() {
          limpiarEscena();
          crearLocomotora();
          estado.patron.forEach(crearVagon);
          crearNube('nube-a', -3.8, 2.15, 1.8, 0.85);
          crearNube('nube-b', 2.9, 2.35, 1.9, 0.75);
        }

        function actualizarVisualesNivel() {
          vagones.forEach(function (mesh) {
            if (!mesh || !mesh.metadata || mesh.metadata.tipo !== 'vagon') {
              return;
            }

            var indice = mesh.metadata.indice;
            var paso = mesh.metadata.paso;

            if (indice == null || !paso) {
              return;
            }

            var completado = !!estado.completados[indice];
            var seleccionado = estado.seleccion && estado.seleccion.clave === paso.clave;

            if (mesh.metadata.decoracion) {
              mesh.visibility = completado ? 1 : estado.opacidadFiguraGuia;
              return;
            }

            if (mesh.name.indexOf('vagon-') === 0 && mesh.material) {
              mesh.material.diffuseColor = color3(
                completado
                  ? '#64d28a'
                  : seleccionado
                    ? '#ffd85f'
                    : '#4bb2e6'
              );
            }
          });
        }

        window.iniciarNuevoNivel = function (params) {
          estado.patron = params.patron || [];
          estado.dificultad = params.dificultad || 1;
          estado.velocidadTren = params.velocidadTren || 1;
          estado.vueltasMaximas = Math.max(1, Math.round(params.vueltasMaximas || 6));
          estado.vueltasConsumidas = 0;
          estado.opacidadFiguraGuia = Math.max(0.5, Math.min(1, params.opacidadFiguraGuia || 0.86));
          estado.completados = {};
          estado.totalCompletados = 0;
          estado.aciertos = 0;
          estado.errores = 0;
          estado.combo = 0;
          estado.comboMaximo = 0;
          estado.inicioNivelMs = Date.now();
          estado.ultimaJugadaMs = Date.now();
          estado.nivelReportado = false;
          estado.seleccion = null;
          estado.jugadaPendiente = null;
          dibujarNivel();

          if (grupoTren) {
            grupoTren.position.x = inicioRecorridoX;
            estadoTren = 'entrando';
          }
        };

        window.restaurarNivel = function (params) {
          params = params || {};
          window.iniciarNuevoNivel(params);

          var vagonesResueltos = Array.isArray(params.vagonesResueltos)
            ? params.vagonesResueltos
            : [];
          estado.completados = {};
          vagonesResueltos.forEach(function (indice) {
            if (Number.isInteger(indice) && indice >= 0 && indice < estado.patron.length) {
              estado.completados[indice] = true;
            }
          });
          estado.totalCompletados = Object.keys(estado.completados).length;
          estado.aciertos = Math.max(0, Math.round(params.aciertos || estado.totalCompletados || 0));
          estado.errores = Math.max(0, Math.round(params.errores || 0));
          estado.combo = Math.max(0, Math.round(params.combo || 0));
          estado.comboMaximo = Math.max(estado.combo, Math.round(params.comboMaximo || 0));
          estado.vueltasConsumidas = Math.max(0, Math.round(params.vueltasConsumidas || 0));
          estado.inicioNivelMs = Date.now() - Math.max(0, Math.round(params.tiempoNivelMs || 0));
          estado.ultimaJugadaMs = Date.now();
          estado.nivelReportado = !!params.nivelReportado;
          estado.seleccion = null;
          estado.jugadaPendiente = null;
          dibujarNivel();
        };

        function iniciar() {
          if (!window.BABYLON) {
            fallback.style.display = 'flex';
            enviar({ tipo: 'errorMotor', mensaje: 'Babylon.js no cargo desde CDN' });
            return;
          }

          engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, premultipliedAlpha: false });
          scene = new BABYLON.Scene(engine);
          scene.clearColor = new BABYLON.Color4(0.57, 0.86, 1, 0.18);

          var camera = new BABYLON.ArcRotateCamera('camara', Math.PI / 2, Math.PI / 2.36, 9.3, new BABYLON.Vector3(-0.55, 0.05, 0), scene);
          camera.lowerRadiusLimit = 7.2;
          camera.upperRadiusLimit = 11.2;
          camera.wheelPrecision = 36;
          camera.pinchPrecision = 52;

          new BABYLON.HemisphericLight('luz', new BABYLON.Vector3(0.2, 1, 0.4), scene).intensity = 1.3;
          var sol = BABYLON.MeshBuilder.CreateSphere('sol', { diameter: 0.72, segments: 18 }, scene);
          sol.position = new BABYLON.Vector3(4.4, 2.8, 2.4);
          sol.material = material('sol-mat', '#ffd85f', true);
          var suelo = BABYLON.MeshBuilder.CreateGround('suelo', { width: 16.5, height: 7.4 }, scene);
          suelo.position.y = -0.72;
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
          grupoTren.scaling = new BABYLON.Vector3(1.12, 1.12, 1.12);

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
            if (estadoTren !== 'jugando') return;
            if (info.type !== BABYLON.PointerEventTypes.POINTERDOWN) return;
            var picked = info.pickInfo && info.pickInfo.pickedMesh;
            if (!picked || !picked.metadata) return;
            if (picked.metadata.tipo === 'vagon') {
              resolverJugada(picked.metadata.indice);
            }
          });

          window.establecerSeleccion = function (entrada) {
            if (estadoTren !== 'entrando' && estadoTren !== 'jugando') return;
            var clave = typeof entrada === 'string' ? entrada : entrada && entrada.clave;
            var paso = estado.patron.find(function (item) { return item.clave === clave; });
            if (paso) marcarSeleccion(paso);
          };

          window.iniciarNuevoNivel(parametros);
          
          engine.runRenderLoop(function () {
            var t = performance.now() * 0.001 * estado.velocidadTren;
            var deltaSegundos = Math.min(engine.getDeltaTime() / 1000, 0.05);
            
            if (grupoTren && estadoTren !== 'nivelCompletado' && estadoTren !== 'nivelFallido') {
              var avance = 1.68 * estado.velocidadTren * deltaSegundos;
              grupoTren.position.x += avance;

              if (estadoTren === 'entrando' && grupoTren.position.x >= -5.8) {
                estadoTren = 'jugando';
                reportarVuelta(true);
                intentarResolverJugadaPendiente();
              }

              if (estadoTren === 'jugando' && grupoTren.position.x >= finRecorridoX) {
                estado.vueltasConsumidas += 1;

                if (estado.vueltasConsumidas >= estado.vueltasMaximas) {
                  grupoTren.position.x = finRecorridoX;
                  estadoTren = 'nivelFallido';
                  reportarNivelFallido();
                } else {
                  grupoTren.position.x = inicioRecorridoX;
                  estadoTren = 'entrando';
                  reportarVuelta(false);
                }
              }

              if (estadoTren === 'saliendo' && grupoTren.position.x >= finRecorridoX) {
                  grupoTren.position.x = finRecorridoX;
                  estadoTren = 'nivelCompletado';
                  reportarNivelCompletado();
              }
            }

            vagones.forEach(function (mesh) {
              if (mesh.metadata && mesh.metadata.decoracion) {
                mesh.rotation.y += 0.01;
              }
              if (mesh.name.indexOf('rueda') === 0) {
                mesh.rotation.x += 4.8 * estado.velocidadTren * deltaSegundos;
              }
              
              var globalX = mesh.absolutePosition.x;
              if (globalX > 7.0 || globalX < -7.0) {
                mesh.visibility = 0;
              } else {
                if (mesh.metadata && mesh.metadata.decoracion) {
                  mesh.visibility = estado.completados[mesh.metadata.indice]
                    ? 1
                    : estado.opacidadFiguraGuia;
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
