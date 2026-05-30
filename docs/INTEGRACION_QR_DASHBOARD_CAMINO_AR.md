# Integracion QR + Dashboard visual + Camino AR

## Objetivo

Integrar la PR visual aprobada por los profesores sobre la base estable de Camino AR, sin romper el flujo real de backend, sesiones, logros, estadisticas ni reglas de acceso.

## Documentos obligatorios relacionados

Antes de tocar esta integracion, leer:

- `AGENTS.md`: reglas duras para IA y equipo.
- `docs/REGLAS_NEGOCIO_MOBILE_ESTUDIANTE.md`: reglas de negocio por modulo.
- `docs/PLAYTEST_CAMINO_AR.md`: alcance de pruebas de Camino AR.

## Reglas oficiales de integracion

1. Camino AR es intocable salvo bug real comprobado.
2. La PR visual no se mergea directo si borra juego, tests, servicios reales o baja versiones del stack.
3. Lo visual aprobado se conserva: onboarding, login QR, scanner, dashboard, assets, tema y componentes.
4. Lo que venga con contrato viejo se adapta, no se copia a ciegas.
5. La DB y el backend son la verdad de negocio.
6. El login infantil usa `POST /api/estudiantes/login`.
7. El estado real del estudiante usa `GET /api/estudiantes/mi-perfil`.
8. Logros y estadisticas salen de servicios reales, no de numeros inventados.
9. Las cards visuales de habilidades deben leer el acceso real del juego activo.
10. El boton de Camino AR solo entra al juego si `resolverAccesoJuegoDesdePerfil` lo permite.
11. Si una dependencia nativa es necesaria para una pantalla aprobada, se integra correctamente; no se borra por comodidad.
12. Si se agrega una dependencia nativa, se debe generar una nueva development build o APK compatible.

## Decision sobre dependencias nativas

`expo-camera`, `expo-video` y `@react-native-async-storage/async-storage` son dependencias nativas. Segun la documentacion oficial de Expo, `npx expo start` actualiza el bundle JavaScript, pero no agrega codigo nativo nuevo a una app ya instalada.

Por eso:

- Cambios de UI, estilos, servicios y logica JS: basta con `npx expo start`.
- Nuevas librerias nativas o plugins: se debe reconstruir la app/dev-client una vez.
- Despues de instalar esa app/dev-client, el equipo vuelve a trabajar con `npx expo start`.

## Estrategia tecnica

1. Crear rama de integracion desde `feature/camino-ar-e2e-demo`.
2. Traer assets y componentes visuales de la PR.
3. Instalar dependencias compatibles con Expo 55, no aceptar el `package.json` viejo de la PR.
4. Mantener `@reactvision/react-viro`, `newArchEnabled` y configuracion AR.
5. Reescribir `App.js` como orquestador de pantallas, usando servicios reales.
6. Adaptar dashboard visual para consumir `useStudentDashboard`.
7. Mantener tests de Camino AR.
8. Validar con `npm run test:juegos`.
9. Validar bundle con `npx expo export --platform android`.
10. Documentar si una nueva build nativa es obligatoria.

## Configuracion de API por entorno

La app movil es para estudiantes. No debe tener IPs hardcodeadas en codigo.

Prioridad oficial:

1. `EXPO_PUBLIC_API_URL` para produccion, preview o demo formal.
2. URL guardada en el dispositivo para pruebas locales/colegio cuando cambia la red Wi-Fi.
3. URL local detectada por Metro como fallback de desarrollo.

La pantalla de login muestra un acceso de conexion para soporte. El niño no debe tener que entender servidores; un tutor, tester o desarrollador configura la URL cuando cambia la red.

## Antipatrones prohibidos

- Borrar visual aprobado para evitar un error nativo.
- Copiar servicios de la PR si duplican o contradicen contratos reales.
- Usar porcentajes, rachas o estrellas hardcodeadas como si fueran datos reales.
- Mergear una PR que elimine Camino AR o sus tests.
- Cambiar Expo/Viro sin justificar compatibilidad.
- Tocar carpetas nativas manualmente sin necesidad y sin documentar.
