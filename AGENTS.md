# Logickids Mobile - Reglas obligatorias para agentes y equipo

Este repo contiene la app movil de estudiantes. No es portal de tutores, no es
panel admin y no debe mezclar reglas de adultos dentro del flujo infantil.

## Regla critica de propiedad

Camino AR es propiedad funcional de Camilo en esta rama. No se debe tocar bajo
ningun parametro salvo una de estas condiciones:

1. Camilo lo pide explicitamente.
2. Hay un bug real reproducible dentro de Camino AR.
3. El cambio es estrictamente necesario para compilar y no modifica logica,
   posicionamiento AR, motor, persistencia ni UX del juego.

Si el trabajo es integrar QR, onboarding, dashboard, configuracion de API,
assets visuales o navegacion, no se modifica Camino AR.

Rutas protegidas:

- `src/features/games/camino-ar/**`
- `tests/juegos/caminoAr.nucleo.test.cjs`
- configuracion AR/Viro en `app.json`

## Integracion aprobada

La integracion visual de onboarding, QR, scanner y dashboard fue aceptada por
profesores/equipo. No se borra para "simplificar".

Se puede refactorizar si:

- conserva la intencion visual aprobada
- respeta el contrato real del backend
- elimina duplicacion o codigo obsoleto
- no reemplaza datos reales por mocks

No se puede:

- borrar pantallas aprobadas por comodidad
- copiar servicios viejos que contradigan el backend
- inventar porcentajes, logros, rachas o estados
- bajar versiones de Expo, React Native o Viro sin decision tecnica explicita

## Build nativa y Expo

`npx expo start` actualiza JavaScript. No instala codigo nativo nuevo dentro de
una app ya instalada.

Requiere nueva development build, APK o EAS build cuando se cambia:

- `expo-camera`
- `expo-video`
- `@react-native-async-storage/async-storage`
- `@reactvision/react-viro`
- plugins de `app.json`
- permisos nativos
- carpeta `android/` o `ios/`

No se debe eliminar una dependencia nativa aprobada solo porque la app instalada
no la trae. La solucion correcta es generar una build compatible.

## Contratos de backend

La DB y el backend son la verdad de negocio.

Endpoints base del estudiante:

- `POST /api/estudiantes/login`
- `GET /api/estudiantes/mi-perfil`
- `GET /api/logros/mis-logros`
- `GET /api/estadisticas/mis-estadisticas`
- `POST /api/sesiones/iniciar`
- `POST /api/sesiones/:id/eventos`
- `POST /api/sesiones/:id/finalizar`

Todo endpoint protegido de estudiante usa:

```text
Authorization: Bearer <student_jwt>
```

## Reglas de acceso del estudiante

- QR invalido: no entra.
- Estudiante inactivo: no entra.
- Institucion inactiva: no entra.
- QR valido pero sin grupo activo: no ve dashboard normal; ve pantalla bloqueada.
- QR valido pero grupo archivado: no ve dashboard normal; ve pantalla bloqueada.
- Grupo activo sin sesion de clase: ve dashboard, pero no puede jugar.
- Sesion de clase activa para otro juego: Camino AR y Robot Lógico
  quedan bloqueados para ese estudiante.
- Participante completado/cerrado/abandonado: no puede repetir esa actividad.

## Juegos infantiles y sus slugs de backend

- `camino-ar` → Camino AR → habilidad `Memoria` (no tocar, ver seccion
  "Regla critica de propiedad").
- `robot-logico` → Robot Lógico → habilidad `Lógica` (modulo aislado en
  `src/features/games/robot-taller/**`, protegido por
  `tests/juegos/robotTaller.nucleo.test.cjs`).

Los slugs anteriores deben venir tal cual de la tabla `minijuegos` del
backend. Si el backend no tiene el slug del juego, la app no debe mostrar la
card como activa.

## Reglas de datos

No usar datos hardcodeados para simular producto real.

Permitido:

- placeholders visuales marcados como proximamente
- copy de estado vacio
- valores fallback como "Sin datos"

Prohibido:

- porcentajes falsos
- logros falsos
- ranking falso
- rachas falsas
- avatar externo no controlado
- IPs hardcodeadas en codigo

## Configuracion de API

La app debe servir en distintas redes Wi-Fi.

Prioridad:

1. `EXPO_PUBLIC_API_URL`
2. URL guardada en el dispositivo
3. fallback local de desarrollo

Si la URL queda en `localhost`, la app no debe escanear QR; debe pedir configurar
la conexion del colegio.

## Validacion minima antes de PR

Ejecutar:

```bash
npm run test:juegos
npx expo export --platform android --output-dir C:\tmp\logickids-mobile-check
```

Si se agrego dependencia nativa, avisar en la PR que se necesita nueva build.

