# Guia para integrar el juego Tren 3D / Patrones

## Objetivo

Esta guia es para integrar el juego del tren 3D, asociado a la habilidad
`Patrones`, sobre la base actual del mobile de estudiantes sin romper:

- login con QR
- onboarding aprobado
- dashboard aprobado
- contrato real del backend
- sesiones de clase
- sesiones de juego
- Camino AR

La base antigua `feature/camino-ar-react-vision-upgrade` ya no es suficiente
como punto de integracion directa, porque desde ahi se agregaron reglas nuevas
de QR, dashboard, API por red, perfil infantil y reglas de negocio.

## Mensaje clave

No se debe mergear a ciegas una rama vieja encima de esta base.

La integracion correcta es traer el juego del tren como modulo aislado y
conectarlo al flujo real actual.

## Rama base recomendada

Usar como base:

```bash
git fetch origin
git checkout -b feature/integracion-tren-3d-patrones origin/feature/integracion-mobile-estudiante-qr-dashboard
```

Si esta rama ya fue mergeada a `develop`, entonces crear la rama desde
`origin/develop`.

## Que NO se debe tocar

### Camino AR

No tocar:

- `src/features/games/camino-ar/**`
- `tests/juegos/caminoAr.nucleo.test.cjs`
- configuracion AR/Viro en `app.json`

Camino AR solo lo corrige Camilo, salvo bug real reproducible y aprobado.

### Flujo QR/Dashboard

No reemplazar:

- `App.js`
- `src/screens/OnboardingScreen.jsx`
- `src/screens/LoginQrScreen.jsx`
- `src/screens/QrScannerScreen.jsx`
- `src/screens/DashboardScreen.jsx`
- `src/services/studentAccess.service.js`
- `src/services/studentDashboard.service.js`
- `src/services/apiSettings.service.js`
- `src/config/apiContract.js`

Si se necesita conectar el tren al dashboard, se hace con cambios puntuales y
revisados, no reemplazando pantallas completas.

### Package y versiones

No bajar versiones de:

- Expo
- React Native
- React
- `@reactvision/react-viro`

Si la rama vieja trae otro `package.json`, no copiarlo completo.

## Donde debe vivir el juego

Crear un modulo propio:

```text
src/features/games/tren-3d/
  aplicacion/
  presentacion/
  tren3d.constants.js
  tren3dConfiguracion.js
  tren3dMotor.js
  Tren3DScreen.jsx
```

La idea es que el juego tenga su propia logica y su propia presentacion.
No debe importar archivos internos de `camino-ar`.

Si necesita usar algo comun, debe salir de:

```text
src/features/games/core/
```

Por ejemplo:

- `clienteSesionesJuego.js`
- `resolverAccesoJuego.js`
- contratos compartidos de resultado/sesion

## Como conectar el juego al backend

El backend es la verdad. El juego no decide solo si puede abrirse.

El dashboard debe leer `GET /api/estudiantes/mi-perfil` y revisar:

- `sesion_activa`
- `sesion_minijuego_id`
- `sesion_minijuego_slug`
- `sesion_minijuego_titulo`
- `sesion_participante_estado`
- `sesion_paso_actual`

Para que el juego de Patrones se active, el backend debe abrir una sesion de
clase cuyo paso actual tenga el minijuego del tren.

Ejemplo conceptual:

```text
sesion_minijuego_slug = "tren-3d"
habilidad = "Patrones"
```

El slug exacto debe venir de la tabla `minijuegos`, no inventarse en mobile.

## Flujo correcto del juego

1. El estudiante entra con QR.
2. El backend devuelve JWT de estudiante.
3. El dashboard llama `mi-perfil`.
4. Si el estudiante no tiene grupo activo, no entra al dashboard normal.
5. Si hay grupo activo, el dashboard revisa que juego esta habilitado.
6. Si el tutor habilito `tren-3d`, la card de `Patrones` puede entrar al juego.
7. El juego llama `POST /api/sesiones/iniciar`.
8. El juego registra eventos en `POST /api/sesiones/:id/eventos`.
9. El juego finaliza con `POST /api/sesiones/:id/finalizar`.
10. El backend actualiza estadisticas, logros y progreso de clase.
11. Al volver al dashboard, se recarga `mi-perfil`.

## Diferencia entre las sesiones

No mezclar estos conceptos:

| Concepto | Que es | Quien lo crea |
| --- | --- | --- |
| Login del estudiante | Entrada por QR y JWT infantil | Mobile + backend |
| Sesion de clase | Actividad abierta para el grupo | Tutor desde web |
| Participacion | Estado del estudiante en esa clase | Backend |
| Sesion de juego | Partida/nivel individual | Juego mobile + backend |

El tren no debe abrir una sesion de clase. Eso lo hace el tutor.

## Reglas de negocio que debe respetar

- QR invalido: no entra.
- Estudiante inactivo: no entra.
- Institucion inactiva: no entra.
- Sin grupo activo: no ve dashboard normal.
- Grupo archivado: no ve dashboard normal.
- Grupo activo sin sesion de clase: ve dashboard, pero no juega.
- Sesion activa para otro juego: Patrones queda bloqueado.
- Participante completado/cerrado/abandonado: no repite esa actividad.
- El resumen oficial lo calcula backend desde eventos persistidos.

## Eventos de sesion

El juego debe registrar eventos reales, no resultados inventados al final.

Usar eventos como:

- `acierto`
- `error`
- `ayuda`
- `combo`

La habilidad esperada para este juego debe ser `Patrones`, siempre que esa
habilidad exista igual en backend.

Ejemplo conceptual:

```js
await cliente.registrarEvento({
  tokenEstudiante,
  sesionId,
  evento: {
    tipo_evento: 'acierto',
    habilidad: 'Patrones',
    tiempo_reaccion_ms: 1200,
    puntos: 10,
    combo_en_evento: 2,
    metadata: {
      patron: 'color-forma-color',
      nivel: 1,
    },
  },
});
```

## Dependencias nativas y Expo

`npx expo start` actualiza JavaScript, pero no agrega codigo nativo a una app
ya instalada.

Si el tren usa Babylon con librerias nativas, sensores, GL nativo, camara,
audio nativo avanzado, plugins o cambios en `app.json`, se necesita nueva
development build o APK.

Esto no es un error. Es el flujo normal.

### Cuando basta con `npx expo start`

- Cambios de estilos.
- Cambios de React/JS.
- Cambios de logica.
- Nuevas pantallas sin modulos nativos.

### Cuando toca nueva build

- Nueva dependencia nativa.
- Cambio de permisos.
- Cambio de plugins Expo.
- Cambios en `android/` o `ios/`.
- Cambios relacionados con Viro/Babylon nativo.

## Como integrar sin romper la base

### Paso 1: crear rama limpia

```bash
git fetch origin
git checkout -b feature/integracion-tren-3d-patrones origin/feature/integracion-mobile-estudiante-qr-dashboard
```

### Paso 2: traer solo archivos del juego

Traer desde la rama vieja solo:

- modulo del tren
- assets propios del tren
- utilidades propias necesarias

No traer:

- `App.js` completo
- `DashboardScreen.jsx` completo
- `package.json` completo
- `app.json` completo
- carpetas de Camino AR

### Paso 3: declarar dependencias con cuidado

Instalar solo lo necesario:

```bash
npx expo install <paquete-compatible>
```

Si el paquete no es de Expo, revisar compatibilidad antes de instalar.

### Paso 4: conectar al dashboard

La card `Patrones` debe activarse solo cuando `mi-perfil` diga que el minijuego
actual corresponde al slug del tren.

No activar la card por nombre visual.

### Paso 5: conectar persistencia

Usar `src/features/games/core/clienteSesionesJuego.js` para iniciar, registrar
eventos y finalizar.

No crear otro cliente HTTP duplicado si el contrato es el mismo.

### Paso 6: validar

Antes de PR:

```bash
npm run test:juegos
npx expo export --platform android --output-dir C:\tmp\logickids-mobile-tren-check
```

Si se agregaron dependencias nativas, avisar en la PR:

```text
Requiere nueva development build/APK por dependencias nativas.
```

## Sockets

Los sockets se integraran despues.

No meter sockets todavia si:

- el flujo de sesion de clase no esta cerrado
- la sesion de juego no registra eventos correctamente
- el dashboard no refleja el estado real desde backend

Primero flujo correcto. Despues tiempo real.

## Checklist de PR

- No toca Camino AR.
- No borra tests.
- No reemplaza QR/dashboard aprobado.
- No mete datos falsos.
- No hardcodea IPs.
- Usa `mi-perfil` como verdad del estado.
- Usa JWT de estudiante.
- Usa `clienteSesionesJuego` o contrato equivalente.
- Si agrega nativo, documenta nueva build.
- Explica slug del minijuego y habilidad asociada.
- Explica como se probo.

## Resumen corto para el equipo

El tren 3D debe entrar como juego nuevo y aislado de `Patrones`.
La base actual ya maneja QR, token de estudiante, dashboard, API por Wi-Fi,
sesiones de clase y Camino AR. No se debe traer una rama vieja encima ni
reemplazar pantallas completas.

La integracion correcta es: modulo propio + contrato real de backend + card de
Patrones activada por `mi-perfil` + nueva build si hay nativo.

