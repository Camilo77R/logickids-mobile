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

## Actualizacion Tren - cierre parcial del 2026-06-28

Despues de la siguiente ronda de ajustes en `Tren` se confirmo esto:

- ya no se reproduce el bug grave donde una actividad `single` de 2 intentos
  terminaba dejando entrar a otra corrida completa adicional
- el backend ya esta reflejando mejor las metricas por nivel:
  - `Nivel 1` llego a verse con `1` error
  - `Nivel 2` llego a verse con `2` errores
- eso indica que la persistencia oficial por intento mejoro y ya no parece
  clonar exactamente el mismo resultado entre ambos niveles como antes

### Ajuste tecnico aplicado

Se agrego un bloqueo visual local en `Tren` para el resultado intermedio y el
resultado final:

- el juego marca `guardandoResultado` apenas arranca la finalizacion del nivel
- mientras ese estado este activo no debe aparecer `Continuar`
- mientras ese estado este activo no debe aparecer `Volver al tablero`
- la accion solo debe verse cuando el cierre ya convergio

### Lo pendiente de validar manualmente

- confirmar que ya no aparezca primero `Continuar` y luego cambie a mensaje de guardado
- confirmar que en el ultimo intento ya no aparezca `Volver al tablero` antes de terminar el guardado
- confirmar que el flujo se siente igual de limpio que `Mercado` y `Camino AR`

### Lectura actual

`Tren single` ya no esta en estado critico.

Ahora mismo el riesgo principal ya no es duplicar la actividad completa, sino
pulir la experiencia visual del guardado y terminar de asegurar que la
presentacion del cierre sea infantilmente clara y determinista.

## Actualizacion Robot - reto matematico y checkpoint del 2026-06-28

Despues de la siguiente ronda de ajustes en `Robot Lógico` se confirmo esto:

- los errores reales por nivel ya dejaron de verse clonados completamente
- el flujo general de `single` con 3 intentos ya cierra bien la sesion
- aparecio un bug fino de reanudacion:
  - si una pieza quedaba bloqueada
  - el estudiante fallaba varias veces
  - salia al dashboard o reabria la app
  - al volver, la cuenta podia aparecer un instante y desaparecer
  - la pieza quedaba atrapada en el mismo punto sin posibilidad real de continuar

### Causa tecnica encontrada

El modal del reto matematico estaba reseteando su estado visual con una firma
demasiado fragil.

La identidad del reto dependia de `timestamp`, pero al restaurar desde
checkpoint ese dato no siempre estaba presente.

Eso abria una grieta:

- el backend/logica si podia tener un reto nuevo
- pero la UI podia seguir tratandolo como si fuera el mismo
- resultado:
  - feedback viejo pegado
  - intentos viejos pegados
  - flash del modal
  - sensacion de pieza bloqueada para siempre

### Ajuste tecnico aplicado

Se rehizo la identidad visual del reto matematico para que dependa del
contenido real del problema:

- pieza
- operador
- operando A
- operando B
- respuesta esperada

Con eso el modal ya no depende de un dato efimero para saber si realmente
cambio de reto.

### Validacion automatica despues del ajuste

- `npm run test:juegos` → `92/92`
- `npm run test:app` → `20/20`

### Validacion manual pendiente

Probar especificamente este caso:

1. entrar a `Robot Lógico`
2. fallar varias veces una cuenta de la misma pieza
3. salir al dashboard
4. volver a entrar
5. tocar la pieza bloqueada otra vez

Resultado esperado:

- el modal debe quedarse visible de forma estable
- debe mostrar una cuenta utilizable
- no debe cerrarse solo
- la pieza no debe quedar atrapada sin salida

## Actualizacion integral - ronda completa de pruebas del 2026-06-28

Despues de seguir probando todos los juegos en `single` y revisar de nuevo el
flujo de `Robot Lógico`, la lectura actual del sistema cambia asi:

- el flujo funcional general ya esta mucho mas estable que al inicio de la ronda
- los cierres por nivel en `single` ya se comportan mejor en todos los juegos
- la persistencia oficial por nivel ya refleja mejor lo que realmente se jugo
- el problema dominante ya no es "se rompio la sesion", sino:
  - lentitud percibida
  - polish visual
  - deuda de UX infantil en algunos juegos

## Regresion manual por juego

### Tren de Figuras

#### Caso probado: 3 intentos en `single`

Resultado observado:

- funciono correctamente con 3 intentos
- cada nivel quedo guardado como su propio resultado oficial
- ya no reaparecio el bug donde una sesion de 2 o 3 intentos terminaba
  habilitando otra corrida completa adicional

Evidencia reportada:

- `Nivel 1 de 3` con puntaje y errores propios
- `Nivel 2 de 3` con puntaje y errores propios
- `Nivel 3 de 3` con puntaje y errores propios

Lectura actual:

- `Tren single` ya puede considerarse funcionalmente estable
- el punto pendiente sigue siendo UX:
  - la espera de guardado se siente lenta
  - el copy del estado de guardado se siente "duro"

### Mercado Inteligente

#### Caso probado: 3 intentos en `single`

Resultado observado:

- funciono correctamente
- se cerraron bien los 3 niveles
- las metricas finales quedaron consistentes con los errores hechos a proposito
  en el ultimo nivel
- el regreso al dashboard fue correcto

Lectura actual:

- `Mercado` esta bien a nivel de flujo y persistencia
- sigue sintiendose lento en cierres/transiciones
- UX visual mas madura que `Robot`, pero todavia dependiente de la latencia del guardado

### Camino AR

#### Caso probado: 3 intentos en `single`

Resultado observado:

- funciono correctamente
- los 3 niveles se guardaron bien
- cerro bien la sesion
- marco bien en web

Observacion de producto:

- si el estudiante falla una secuencia, hoy el nivel se corta y pasa al
  resultado
- esto no necesariamente es un bug tecnico
- queda como decision pedagogica pendiente:
  - si debe cortar inmediatamente al primer error
  - o si deberia dejar terminar toda la secuencia para contabilizar mas errores

Lectura actual:

- `Camino AR` esta funcionalmente bien
- la duda restante es de diseño pedagogico, no de persistencia

### Robot Lógico

#### Casos probados

- `single` con 2 intentos
- `single` con 3 intentos
- errores reales dentro del reto matematico
- reingreso tras checkpoint
- piezas bloqueadas y desbloqueadas

#### Problemas que se detectaron en la ronda

1. Las metricas por nivel se clonaban o quedaban incoherentes.
2. El reto matematico podia aceptar entradas no numericas.
3. Despues de varios intentos fallidos, el modal podia quedar en estado roto.
4. La UI podia quedarse con una pieza bloqueada sin salida clara.
5. El juego podia mezclar piezas y retos:
   - se desbloqueaba una pieza y aparecia otra como siguiente
   - podia parecer que otra pieza ya estaba lista para arrastrar
   - la pregunta podia cambiar de pieza fuera de tiempo
   - incluso se podia disparar un cierre final antes de que la ultima pieza
     estuviera realmente resuelta

#### Ajustes aplicados

- se corrigio la captura de errores reales por nivel para que la finalizacion
  use el acumulado oficial en vez de inferir errores por piezas faltantes
- el reto matematico ahora rechaza input no numerico
- el modal ya no depende de `timestamp` para reconocer que el reto cambio
- se elimino el auto-desbloqueo implicito despues de varios fallos
- la escena dejo de bloquear el toque antes de que el controlador decidiera
  si correspondia abrir reto o permitir arrastre
- se forzo una regla mas segura:
  - solo puede existir una pieza desbloqueada pendiente a la vez
  - primero se desbloquea
  - luego se coloca
  - solo despues nace la siguiente pregunta

#### Resultado observado al final de la ronda

- el flujo ya funciona bien
- las metricas por nivel quedaron razonables y separadas
- la sesion cierra bien
- el dashboard y web reflejan mejor los intentos reales

Evidencia manual final compartida por Camilo:

- `Nivel 1 de 3` guardado con sus errores
- `Nivel 2 de 3` guardado con sus errores
- `Nivel 3 de 3` guardado como completado

#### Deuda abierta en Robot

- sigue sintiendose lento
- no comparte el mismo polish visual de respuestas/transiciones que otros juegos
- la silueta/guia visual del robot y las piezas reales no estan del todo
  alineadas, lo que puede ser engañoso para el niño

Lectura actual:

- `Robot Lógico` ya quedo mucho mejor a nivel funcional
- no conviene reabrir ahora su logica central
- lo que queda es:
  - rendimiento percibido
  - feedback visual
  - alineacion 3D

### Objeto Perdido

#### Caso probado: 2 intentos en `single`

Resultado observado:

- la sesion se activo rapido
- los resultados aparecieron algo lento
- mostro bien el siguiente reto
- al final dejo volver y la sesion ya estaba cerrada correctamente

Lectura actual:

- funcionalmente estable
- pendiente menor:
  - copy final en `ruta` si es el ultimo juego
  - lentitud de resultado mientras guarda

## Cambios de lectura tecnica frente al inicio

Al inicio de la ronda, los riesgos principales eran:

- duplicacion de sesiones
- reapertura indebida
- resultados clonados
- checkpoints que reaparecian mal

Al cierre de esta ronda, los riesgos principales pasan a ser:

- latencia percibida
- polish de guardado/cierre
- consistencia visual entre juegos
- deuda visual especifica en `Robot`

## Estado actual por prioridad

### Resuelto o casi resuelto

- `Tren single` ya no duplica la actividad
- `Mercado single` cierra bien
- `Camino AR single` cierra bien
- `Robot` ya no mezcla piezas/retos como antes y guarda mejor sus metricas
- `Objeto Perdido single` cierra bien

### Pendiente funcional menor

- revisar si el copy final de `Objeto Perdido` en `ruta` cambia cuando es el ultimo juego
- confirmar si `Camino AR` debe cortar al primer error o dejar terminar la secuencia

### Pendiente de experiencia / performance

- latencia general del guardado al volver al dashboard
- `Robot` especialmente lento en sensacion de runtime
- `Robot` con deuda visual:
  - feedback menos pulido
  - assets/transiciones mas crudos
  - desalineacion entre guia visual y piezas reales

## Conclusión actual

La ronda ya no deja el proyecto en estado critico de logica de sesion.

Lo que se gano de verdad en esta fecha fue:

- `single` mucho mas estable
- cierres mas deterministas
- mejor correspondencia entre lo jugado y lo persistido
- `Robot Lógico` rescatado de varios bugs graves de orquestacion

La siguiente fase recomendable ya no es "seguir metiendo logica", sino:

1. documentar y cerrar estos fixes funcionales
2. si hay tiempo, atacar performance percibida
3. despues, hacer polish visual puntual por juego

## Actualizacion complementaria - ronda de validacion del 2026-06-30

Durante una ronda posterior de pruebas manuales, Camilo confirmo una mejora
clara en rendimiento percibido y cierre de sesion en varios juegos, incluso
sin haber movido la logica pedagogica.

### Lectura global

- el guardado y el retorno al dashboard se sintieron mucho mas rapidos
- varias sesiones cerraron casi de inmediato y quedaron reflejadas correctamente
  en web
- la mejora ya no parece depender de comprar mas infraestructura primero
- el foco actual se mueve de "persistencia rota" a:
  - pulido visual
  - tactilidad
  - micro-latencias de UX

### Camino AR - 2 intentos en `single`

Resultado observado:

- el flujo funcional fue correcto
- en un momento, al mover el tablero, este desaparecio visualmente
- luego sono audio del juego y parecio un bug fuerte
- despues aparecio `Volver`, se pulso, regreso al tablero y el flujo continuo
  bien
- el siguiente reto aparecio correctamente
- en el segundo intento, al fallar, salio `Volver al tablero`
- aproximadamente un segundo despues se cerro la sesion en dashboard

Lectura actual:

- el cierre de sesion de `Camino AR` esta funcionando bien
- existe un detalle visual potencial relacionado con movimiento del tablero o
  render temporal, pero no dejo la sesion corrupta
- esto ya no se ve como bug de persistencia, sino como posible glitch visual o
  de escena

### Mercado Inteligente - 2 intentos en `single`

Resultado observado:

- todo funciono bien
- el flujo se sintio rapido
- el guardado y la salida al dashboard fueron inmediatos
- la sesion se cerro de una
- en web quedo bien marcada

Lectura actual:

- `Mercado` queda confirmado como estable en flujo y persistencia
- ya no aparece como candidato principal a problemas de latencia

### Tren de Figuras - 2 intentos en `single`

Resultado observado:

- el flujo general estuvo bien
- `Continuar` aparece de inmediato
- `Volver al tablero` aparece de inmediato
- luego el dashboard tarda alrededor de 3 segundos en reflejar el cierre final
- al abrir el juego se ve por unos segundos una pantalla negra con elementos
  sueltos antes de que cargue la escena del tren
- el tacto del tren sigue sintiendose menos responsivo que otros juegos

Lectura actual:

- `Tren` ya no esta fallando en cierre de sesion
- el problema dominante cambia a UX:
  - pantalla negra inicial con carga fea
  - percepcion de tacto lento
  - transicion visual de entrada menos infantilmente pulida

### Objeto Perdido - 2 intentos en `single`

Resultado observado:

- muy rapido en guardado
- transicion a resultado rapida
- cierre de sesion rapido
- web reflejo correctamente el estado final

Lectura actual:

- `Objeto Perdido` queda mejor posicionado de lo que parecia en rondas previas
- ya no destaca por problema funcional, sino por polish menor

## Cambio de lectura del sistema

Esta ronda cambia de nuevo la prioridad tecnica:

- el proyecto ya no esta dominado por errores graves de cierre
- la persistencia y sincronizacion general estan mucho mas sanas
- la infraestructura actual puede seguir sirviendo para pruebas y presentacion
  mientras no reaparezca latencia anomala sostenida

### Pendientes que ahora si quedan como prioridad real

1. `Tren`
   - mejorar la pantalla de entrada
   - evitar el flash/negro inicial con elementos sueltos
   - revisar sensibilidad tactil

2. `Camino AR`
   - revisar el evento donde el tablero desaparece temporalmente al moverlo
   - confirmar si fue glitch puntual o reproducible

3. `Robot Lógico`
   - seguir atacando la experiencia visual y tactil
   - mantener vigilancia sobre pieza antena y alineacion de la guia

## Conclusion de esta ronda

La evidencia manual mas reciente ya no justifica hablar de crisis funcional en
los cierres de `single`.

La foto actual es esta:

- `Camino`, `Mercado` y `Objeto Perdido` ya cierran rapido y marcan bien
- `Tren` funciona, pero necesita pulido visual y mejor respuesta tactil
- el sistema en general se siente mas confiable
- los siguientes cambios deben ser pequenos y quirurgicos, enfocados en UX y no
  en reescribir flujos ya estabilizados
