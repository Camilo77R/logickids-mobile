# Reglas de negocio - Mobile estudiante

## Objetivo

Este documento define las reglas oficiales del flujo movil de estudiantes para
evitar integraciones improvisadas entre QR, dashboard, sesiones de clase,
sesiones de juego y Camino AR.

La app movil es solo para estudiantes.

## Mapa mental del sistema

| Concepto | Imagen mental | Tabla/contrato |
| --- | --- | --- |
| Login del estudiante | El QR es el carnet del nino | `POST /api/estudiantes/login` |
| Token del estudiante | La manilla temporal de acceso | `JWT_STUDENT_SECRET` |
| Perfil infantil | El estado vivo del estudiante | `GET /api/estudiantes/mi-perfil` |
| Sesion de clase | El salon abierto por el tutor | `sesiones_clase` |
| Participacion | El estado del nino dentro del salon | `sesion_clase_participantes` |
| Sesion de juego | La partida o nivel jugado | `sesiones_juego` |
| Eventos | La hoja del arbitro | `eventos_sesion` |

## 1. Login QR

### Regla

El QR autentica identidad, no garantiza permiso para jugar.

### Endpoint

```text
POST /api/estudiantes/login
```

### Debe permitir

- QR existente.
- Estudiante activo.
- Institucion activa.

### Debe rechazar

- QR inexistente.
- Estudiante inactivo.
- Institucion inactiva.

### Resultado esperado

El backend devuelve:

- `token`: JWT infantil.
- `estudiante`: datos base y snapshot de sesion activa.

El mobile guarda el token en memoria de la sesion actual y lo manda como
`Authorization: Bearer <token>` en rutas protegidas.

## 2. Acceso al dashboard

### Regla

Un estudiante sin grupo activo no debe ver el dashboard normal.

### Casos

| Caso | QR valido | Dashboard normal | Juego |
| --- | --- | --- | --- |
| Estudiante activo + grupo activo | Si | Si | Depende de sesion de clase |
| Estudiante activo + sin grupo | Si | No | No |
| Estudiante activo + grupo archivado | Si | No | No |
| Estudiante inactivo | No | No | No |
| Institucion inactiva | No | No | No |

### UX esperada

Si el QR es valido pero no hay grupo activo:

- no decir "QR invalido"
- mostrar pantalla bloqueada
- explicar que necesita grupo activo
- permitir `Actualizar estado`
- permitir `Escanear otro QR`
- no mostrar mapa, juegos ni barra inferior

## 3. Perfil infantil

### Endpoint

```text
GET /api/estudiantes/mi-perfil
```

### Fuente de verdad

El dashboard debe leer desde `mi-perfil`:

- `grupo_id`
- `grupo_activo`
- `sesion_activa`
- `sesion_clase_id`
- `sesion_modo`
- `sesion_minijuego_id`
- `sesion_minijuego_slug`
- `sesion_minijuego_titulo`
- `sesion_participante_estado`
- `sesion_paso_actual`

No se debe decidir disponibilidad del juego desde texto, botones o estados
visuales.

## 4. Logros y estadisticas

### Endpoints

```text
GET /api/logros/mis-logros
GET /api/estadisticas/mis-estadisticas
```

### Regla

El mobile no inventa progreso.

Permitido:

- `Sin datos`
- `Pendiente`
- `Proximamente`

Prohibido:

- porcentajes falsos
- logros falsos
- rachas falsas
- ranking falso

## 5. Sesion de clase

### Regla

La sesion de clase la abre el tutor desde web. El estudiante no la crea.

### Tablas

- `sesiones_clase`
- `sesion_clase_pasos`
- `sesion_clase_participantes`

### Estados de participante

- `pendiente`
- `en_progreso`
- `completado`
- `abandonado`
- `cerrado`

### Reglas

- Solo puede haber una sesion de clase activa por grupo.
- La sesion puede ser `single` o `path`.
- En `single`, varios niveles son varios pasos dentro de la misma sesion de
  clase.
- En `path`, los pasos vienen de una ruta pedagogica.
- El estudiante solo juega el paso actual.

## 6. Sesion de juego

### Regla

Una sesion de juego es una partida/nivel del estudiante dentro de una sesion de
clase.

### Endpoints

```text
POST /api/sesiones/iniciar
POST /api/sesiones/:id/eventos
POST /api/sesiones/:id/finalizar
```

### Reglas

- Requiere JWT de estudiante.
- Requiere estudiante activo.
- Requiere institucion activa.
- Requiere grupo activo.
- Requiere sesion de clase activa.
- Requiere que el participante no este en estado terminal.
- Si el grupo fue abierto para otro minijuego, Camino AR no inicia.
- Si el paso actual es Camino AR, se puede iniciar.
- El backend calcula el resumen oficial desde eventos persistidos.
- Las estrellas son oficiales: mobile las muestra desde
  `resumen_oficial.estrellas_obtenidas`, no las calcula ni las hardcodea.

## 7. Camino AR

### Regla critica

Camino AR no se toca en integraciones de QR, onboarding o dashboard.

Rutas protegidas:

- `src/features/games/camino-ar/**`
- `tests/juegos/caminoAr.nucleo.test.cjs`

### Flujo actual

1. El dashboard verifica `mi-perfil`.
2. Si el juego activo es `camino-ar`, se habilita Memoria/Camino AR.
3. Camino AR llama `POST /api/sesiones/iniciar`.
4. Camino AR registra eventos.
5. Camino AR finaliza la sesion de juego.
6. El backend calcula puntaje, aciertos, errores, combo y estrellas oficiales.
7. El backend avanza o cierra la participacion.
8. Al volver al dashboard se recarga `mi-perfil`.

### Regla de propiedad

Solo Camilo corrige la base AR, salvo bug real reproducible y aprobado.

## 8. Configuracion de API

### Regla

No hardcodear IPs.

Prioridad:

1. `EXPO_PUBLIC_API_URL`
2. URL guardada en dispositivo
3. fallback de desarrollo

Si la URL es `localhost`, la app debe pedir configurar la conexion antes de
escanear QR.

## 9. Dependencias nativas

### Regla

Agregar o quitar codigo nativo requiere nueva build.

Ejemplos:

- `expo-camera`
- `expo-video`
- `@react-native-async-storage/async-storage`
- `@reactvision/react-viro`
- cambios en plugins de `app.json`
- permisos de camara o AR

`npx expo start` no mete codigo nativo nuevo dentro de una app instalada.

## 10. Checklist antes de integrar PRs

- No borra Camino AR.
- No borra tests de Camino AR.
- No cambia Viro sin justificar.
- No baja Expo/React Native.
- No reemplaza servicios reales por mocks.
- No mete datos falsos.
- No mete IPs hardcodeadas.
- Mantiene visual aprobado de QR/dashboard.
- Usa endpoints reales.
- Valida con `npm run test:juegos`.
- Valida bundle con `npx expo export --platform android`.
