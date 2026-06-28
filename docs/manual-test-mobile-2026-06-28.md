# Prueba manual mobile - 2026-06-28

## Contexto

Prueba manual realizada por Camilo sobre mobile en local, validando:

- activacion de sesion de clase
- flujo `ruta`
- flujo `single`
- cierre de sesion de juego
- cierre de sesion de clase para el estudiante
- sincronizacion dashboard mobile <-> backend/web
- comportamiento post-resultado

## Contexto inicial antes de esta ronda

Objetivo declarado por Camilo antes de la prueba:

- no afectar la adaptabilidad de juegos ya integrada
- corregir problemas de cierre, transiciones y sincronizacion
- soportar correctamente `single` cuando el tutor escoge 1, 2, 10 o mas intentos
- evitar cuelgues visuales donde el juego termina, vuelve al dashboard, luego sincroniza y solo despues habilita el siguiente juego o cierra la sesion
- mantener buenas practicas reales:
  - backend como verdad
  - realtime como invalidador, no como verdad de negocio
  - cero hardcodeo
  - bajo acoplamiento
  - clean code
  - SOLID cuando aplica
  - flujo infantil determinista

Pregunta raiz planteada:

- que esta pasando cuando la sesion termina, vuelve al dashboard, se actualiza y solo despues sincroniza y da acceso al siguiente juego o cierra la sesion

Respuesta tecnica actual:

- el modelo vigente es `socket invalida + HTTP confirma`
- eso es correcto a nivel arquitectura
- el problema real no es "falta de realtime", sino:
  - latencia de convergencia
  - reglas de cierre no unificadas entre juegos
  - ventanas cortas donde mobile aun no converge al estado oficial ya guardado en backend

## Ajuste tecnico ya aplicado en esta ronda

### Endurecimiento de transiciones y cierre

Se aplico una primera fase de endurecimiento en mobile:

- se creo un resolvedor comun de post-resultado
- el dashboard ya no debe auto-cerrar una pantalla final solo porque backend marque la sesion como inactiva
- la pantalla final debe mantenerse visible hasta que el niño tome la accion
- se alineo mejor la logica de `continuar` vs `volver al tablero`
- `Tren` ahora toma el numero real de intentos desde el contexto de sesion en vez de depender solo del default local

Archivos clave tocados:

- `src/features/games/core/postGameFlow.js`
- `src/features/games/core/activeGameLifecycle.js`

### Error de video resuelto

Se detecto y corrigio este error:

```text
Cannot set prop 'player' on view 'class expo.modules.video.TextureVideoView'
Caused by: Cannot use shared object that was already released
```

Diagnostico:

- la vista del onboarding podia intentar reutilizar un `player` de `expo-video` que ya habia sido liberado durante la navegacion

Solucion aplicada:

- se dejo de usar el flujo automatico del hook en onboarding
- se paso a controlar el ciclo de vida manualmente con `createVideoPlayer`
- antes de navegar se desactiva el video
- en el desmontaje se hace limpieza defensiva:
  - dejar de pasar el `player` a la vista
  - `pause()`
  - `release()`

Archivo:

- `src/screens/OnboardingScreen.jsx`

## Hallazgos generales

### Lo que si funciona bien

- La activacion inicial de la sesion de clase suele verse inmediata en mobile.
- `Camino AR` en `single` cierra bien y marca bien en web.
- `Camino AR` con 2 intentos en `single` ya respeta el flujo correcto:
  - primer intento -> muestra resultado -> permite siguiente nivel
  - segundo intento -> muestra resultado final -> volver al tablero
  - cierra bien sesion de juego y sesion de clase para ese estudiante
- `Mercado` en `single` cierra bien la sesion al final y actualiza rapido.
- `Robot Lógico` ahora espera el cierre y luego vuelve al tablero sin quedarse pegado.
- `Objeto Perdido` con 2 intentos en `single` logra cerrar bien la sesion al final.

### Lo que sigue lento o inconsistente

- La sincronizacion al volver al dashboard sigue teniendo latencia perceptible.
- En varios juegos el realtime parece funcionar como:
  - evento rapido para invalidar
  - confirmacion real por HTTP unos segundos despues
- Eso hace que la clase o el juego a veces sigan viendose activos unos segundos antes de converger.
- `Robot Lógico` sigue sintiendose lento en la sincronizacion post-partida.
- En `Camino AR`, `Mercado` y `Objeto Perdido` a veces el resultado tarda en mostrarse mientras guarda.
- En `ruta`, `Objeto Perdido` no deberia decir "preparando el siguiente juego" si ya es el ultimo juego.
- En `Tren` sigue habiendo una ventana donde puede reingresarse antes del cierre final.
- En `Robot` hay evidencia de inconsistencia entre lo jugado y las metricas finales persistidas.

## Ruta

### Observaciones

- La sesion de clase se activa en mobile de forma aparentemente inmediata.
- Al terminar juegos, el dashboard a veces tarda en reflejar el siguiente paso.
- El mensaje de "preparando el siguiente juego" gusta y debe conservarse.
- Ajuste pendiente:
  - si `Objeto Perdido` es el ultimo juego de la ruta, el copy debe cambiar para reflejar cierre real y no preparacion del siguiente juego.

## Single por juego

### Tren de Figuras

- Caso probado: 1 intento
  - deja jugar
  - muestra cierre correcto
- Caso probado: 2 intentos
  - primer intento:
    - deja jugar
    - muestra `Continuar`
    - paso intermedio rapido
  - segundo intento:
    - muestra salida al tablero
  - problema:
    - al volver al dashboard no cierra de inmediato
    - tarda cerca de 20 segundos en sincronizar
    - durante ese tiempo deja volver a entrar
    - al reingresar puede permitir otra corrida completa
- Riesgo detectado:
  - una actividad `single` de 2 intentos podria terminar ejecutandose como 2 sesiones completas de 2 niveles cada una
  - eso haria que el estudiante juegue 4 veces cuando debia jugar 2
- Comportamiento correcto esperado:
  - una sola actividad `single`
  - 2 intentos internos
  - cada intento con sus metricas
  - luego cierre definitivo y no reingreso

### Camino AR

- Caso probado: 1 intento
  - correcto
  - cierra bien
  - marca bien en web
- Caso probado: 2 intentos
  - correcto
  - primer intento permite continuar
  - segundo intento permite volver al tablero
  - cierre correcto en mobile y web
- Observacion:
  - el guardado de resultados se siente lento
  - posible influencia de latencia de Railway gratis o persistencia remota

### Robot Lógico

- Caso probado: 2 intentos
  - primer intento:
    - inicia bien
    - termina bien
    - muestra siguiente nivel
  - segundo intento:
    - se detecto una inconsistencia puntual en una resta (`19 - 3`)
    - primer input correcto percibido por el usuario no fue aceptado al primer intento
    - luego deja continuar
  - cierre final:
    - vuelve al dashboard
    - cierra bien
- Bug detectado en metricas web:
  - aparecen dos metricas identicas para nivel 1 y nivel 2
  - ambas muestran `105 / 7 / 0`
  - eso contradice la prueba manual, donde hubo equivocacion en el segundo nivel
- Hipotesis:
  - el resultado o los eventos del segundo intento se estan duplicando o sobrescribiendo con estadisticas del primero

### Mercado

- Caso probado: 1 intento
  - funciona
  - una vez hubo que pulsar `Comprar` dos veces para obtener resultado final
- Caso probado: 2 intentos
  - primer intento:
    - correcto
    - muestra siguiente nivel
  - segundo intento:
    - al pulsar `Comprar` tarda un poco en cerrar
    - muestra resultado
    - salir al tablero
    - sesion queda cerrada correctamente

### Objeto Perdido

- Caso probado: 2 intentos
  - activacion de sesion inmediata
  - primer intento:
    - correcto
    - resultado tarda en aparecer
    - muestra siguiente reto
  - segundo intento:
    - correcto
    - resultado tarda en aparecer mientras guarda
    - luego deja volver
    - al salir, la sesion ya estaba cerrada correctamente

## Conclusiones tecnicas

### Endurecimiento ya visible

- Ya existe una mejora real en transiciones:
  - las pantallas finales ya no deberian auto-salir por backend-truth prematura
  - los juegos integrados principales respetan mejor `continuar` vs `volver`
- El realtime actual no es "socket como verdad".
- El modelo real hoy es:
  - socket invalida
  - HTTP confirma
- Eso esta bien como practica profesional, pero todavia necesita optimizacion de latencia percibida.

### Pendientes prioritarios

1. Corregir `Tren` en `single` para impedir reingreso durante la ventana de sincronizacion final.
2. Revisar por que `Robot Lógico` duplica o clona metricas entre intentos.
3. Ajustar copy final de `Objeto Perdido` en `ruta` cuando es ultimo paso.
4. Reducir latencia percibida del dashboard al salir de cualquier juego.
5. Revisar por que en `Mercado` a veces el cierre requiere doble accion en `Comprar`.

## Estrategia de trabajo recomendada desde aqui

Esto no conviene seguirlo en una sola rama gigante.

### Ramas recomendadas

1. `fix/mobile-tren-single-close-deterministic`
   - objetivo:
     - impedir reingreso indebido
     - cerrar la actividad `single` en Tren de forma determinista
     - garantizar que una actividad de 2 intentos no se convierta en 4 jugadas

2. `fix/mobile-robot-single-result-consistency`
   - objetivo:
     - revisar por que nivel 1 y nivel 2 terminan con metricas identicas en web
     - validar si el bug esta en eventos, resumen final o identidad de intento

3. `fix/mobile-route-final-copy-last-game`
   - objetivo:
     - ajustar copy de `Objeto Perdido` cuando es ultimo juego de la ruta
     - no tocar logica adaptativa ni persistencia

4. `perf/mobile-dashboard-realtime-convergence`
   - objetivo:
     - bajar latencia percibida al salir de juego
     - mantener principio actual:
       - socket invalida
       - HTTP confirma

### Orden recomendado

1. `Tren single`
2. `Robot metricas`
3. `Objeto Perdido copy final`
4. `Dashboard convergence`

### Regla de seguridad

La adaptabilidad actual queda protegida:

- no se reescribe
- no se toca si no afecta directamente cierre, transicion o copy
- cualquier ajuste debe envolver la adaptabilidad, no mezclarla con la navegacion

## Nota de criterio

El sistema ya esta mejor en flujo y cierre que antes, pero todavia no puede considerarse "cerrado" a nivel producto por:

- latencia visible en dashboard
- inconsistencia de metricas en Robot
- reingreso indebido en Tren `single`
- copy final no afinado en ultimo juego de ruta
