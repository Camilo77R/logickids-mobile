# Auditoria de consistencia visual mobile - 2026-06-30

## Objetivo

Unificar la percepcion de producto entre los juegos mobile sin romper:

- flujo `single`
- flujo `ruta`
- adaptabilidad ya integrada
- cierre de sesion
- persistencia y checkpoints
- audio actual

`Mercado Inteligente` queda como referencia visual principal y no se toca en esta fase.

## Regla base

La meta no es redisenar todo. La meta es llevar `Tren`, `Robot Lógico`,
`Camino AR` y `Objeto Perdido` a un contrato visual comun para que la profesora
perciba una sola app y no cinco minijuegos armados por separado.

## Referencia canonica

### Mercado Inteligente

`Mercado` hoy es la referencia porque ya tiene:

- fondo infantil claro y consistente
- capa de carga limpia
- guia inicial separada del juego
- botones primario/secundario coherentes
- resultado visible sin ruido
- copy simple
- estados bien diferenciados
- colorimetria amigable y estable

No se modifica. Se usa como patron de comparacion.

## Contrato visual propuesto

Todos los juegos deberian converger a estas mismas piezas, aunque cada uno
mantenga sus assets y mecanica propia.

### 1. Estado de carga

Debe responder siempre estas preguntas:

- que juego estoy abriendo
- que esta pasando
- si debo esperar o tocar algo

Regla:

- fondo del propio juego
- overlay suave
- spinner o indicador simple
- copy corto

No debe pasar:

- pantallas negras sin contexto
- HUD visible mientras aun no arranca la experiencia
- varios mensajes compitiendo al mismo tiempo

### 2. Guia inicial

Todos los juegos deben tener una entrada equivalente:

- titulo
- una frase de que hara el nino
- CTA de inicio

Regla:

- misma jerarquia
- mismo concepto de CTA
- misma sensacion de "arranca cuando yo decido"

### 3. HUD de juego

Todos los juegos deberian compartir la misma estructura logica:

- nombre del juego
- progreso actual
- salida
- metrica principal
- habilidad o modo

No significa copiar colores exactos, sino mantener:

- misma prioridad visual
- misma posicion relativa
- mismo lenguaje de contenedores

### 4. Pantalla de resultado intermedio

Cuando hay siguiente nivel o siguiente reto:

- el resultado debe verse como resultado
- el CTA principal debe ser `Continuar`
- no debe mezclarse con salida final

### 5. Pantalla de resultado final

Cuando ya no hay siguiente paso:

- el CTA principal debe ser `Volver al tablero`
- puede existir celebracion
- las metricas deben mantener el mismo patron de lectura
- logros deben verse como logros reales, no placeholders

### 6. Copy

El sistema hoy mezcla tonos distintos:

- `Mercado` es claro e infantil
- `Tren` es funcional
- `Robot` es neon/arcade
- `Objeto Perdido` es mas utilitario
- `Camino AR` ya esta mejor trabajado en resultado

Regla:

- mismo tono infantil
- frases cortas
- verbos concretos
- una sola idea por bloque

## Estado actual por juego

### Mercado Inteligente

Fortalezas:

- mejor referencia de shell completa
- mejor cohesión entre carga, juego y resultado
- botones consistentes
- lectura clara del estado

Debilidades:

- ninguna prioritaria para esta fase

Decision:

- no tocar

### Tren Patrones

Fortalezas:

- ya quedo estable en flujo
- resultado final funciona
- carga del motor ya es mas robusta
- tactil mejoro

Inconsistencias:

- shell visual distinta a `Mercado`
- capa de inicio y capa de juego aun se sienten de otro producto
- HUD usa otro lenguaje de paneles
- resultado usa otra familia visual

Riesgo:

- alto si se toca motor, Babylon, tactil o audio

Decision:

- solo unificar shell visual externa
- no tocar audio
- no tocar motor si no es estrictamente necesario

### Robot Logico

Fortalezas:

- flujo actual ya funciona mucho mejor
- cierre de sesion estable
- quiz y resultado ya respetan mejor el flujo

Inconsistencias:

- visual arcade/neon rompe la familia del resto
- guia inicial, HUD y resultado no comparten lenguaje con `Mercado`
- CTA principal no se siente del mismo sistema
- las piezas y el holograma aun generan percepcion de juego distinto

Riesgo:

- medio/alto por interaccion 3D y desbloqueo de piezas

Decision:

- primero unificar shell, overlays y resultado
- no tocar audio
- no tocar mecanica de piezas en esta fase visual

### Camino AR

Fortalezas:

- el resultado ya esta bastante mas cuidado
- logica infantil y estructura estan mejor encaminadas
- flujo `single` y `ruta` ya se comportan bien

Inconsistencias:

- HUD y resultado aun no hablan el mismo idioma que `Mercado`
- algunos paneles siguen siendo propios del modulo AR
- el estilo visual es mas premium que el resto

Riesgo:

- muy alto por regla de propiedad y por complejidad AR

Decision:

- no tocar logica ni escena AR
- solo considerar ajustes de shell externa si son estrictamente cosméticos

### Objeto Perdido

Fortalezas:

- flujo estable
- resultado y rondas funcionan bien
- CTA ya es claro

Inconsistencias:

- usa otro lenguaje de cards y metricas
- visualmente no conversa con `Mercado`
- guide bubble, HUD y resultado parecen de otro sistema

Riesgo:

- medio por AR pero menor que `Camino`

Decision:

- candidato fuerte para unificar shell y resultado antes que `Camino`

## Hallazgo principal

El problema no es solo "colores distintos".

El problema real es que cada juego hoy trae su propio:

- sistema de overlays
- sistema de tarjetas
- sistema de botones
- sistema de metricas
- sistema de copy

Eso hace que el producto se sienta ensamblado por modulos y no diseñado como
una experiencia unica.

## Estrategia correcta

No conviene modificar juego por juego a ojo.

Conviene extraer primero un contrato visual comun:

- `GameShellLoading`
- `GameShellIntro`
- `GameShellHud`
- `GameShellResult`
- `GameShellMetricGrid`
- `GameShellPrimaryAction`
- `GameShellSecondaryAction`

No significa mover toda la UI de una vez. Significa tener el mapa comun antes
de tocar implementaciones.

## Fases recomendadas

### Fase 1. Contrato visual y tokens

Objetivo:

- definir piezas compartidas
- alinear tipografia, radios, espaciado y jerarquia
- no tocar audio
- no tocar adaptabilidad

Salida esperada:

- documento de contrato
- lista de componentes compartibles
- lista de props por componente

### Fase 2. Shell externa de Robot y Objeto Perdido

Objetivo:

- unificar overlays, CTA y resultado
- mantener intacta la logica interna

Por que empezar aqui:

- alto impacto visual
- menor riesgo que tocar `Camino`
- permite validar el patron

### Fase 3. Shell externa de Tren

Objetivo:

- unificar carga, intro, HUD y resultado sin tocar sonido ni motor

### Fase 4. Shell cosmetica minima de Camino AR

Objetivo:

- solo si hace falta
- no tocar escena AR ni logica

## Lo que no se debe hacer

- tocar `Mercado`
- mezclar esta fase con audio
- rehacer motores 3D o AR
- cambiar contratos backend
- mezclar consistencia visual con performance profunda
- romper las pantallas que hoy ya funcionan por "homogeneizar rapido"

## Siguiente movimiento recomendado

Crear una rama hija dedicada solo a contrato visual:

- `refactor/mobile-game-ui-consistency-contract`

Y ahi hacer:

1. documento de contrato visual compartido
2. mapa de componentes reutilizables
3. primer aterrizaje en `Robot` y `Objeto Perdido`

## Criterio de aceptacion de esta linea

Se considerara bien encaminado cuando:

- la profesora vea los juegos y sienta una misma familia de producto
- el nino reconozca el mismo tipo de botones y resultados en todos
- no se rompa ninguna mecanica actual
- `Mercado` siga intacto
- audio siga intacto
