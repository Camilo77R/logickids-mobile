# Contrato tecnico de shell visual para juegos mobile

## Objetivo

Definir un shell visual comun para los minijuegos sin mezclar:

- logica de juego
- adaptabilidad
- persistencia
- audio
- integracion backend

La idea es separar:

- **presentacion compartida**
- de
- **comportamiento especifico por juego**

## Principio de arquitectura

Cada juego sigue siendo dueño de su mecanica, pero deja de ser dueño de todas
las piezas repetidas de interfaz.

### Lo que cada juego mantiene

- escena
- interaccion principal
- assets propios
- reglas internas
- metricas oficiales

### Lo que el shell puede compartir

- loading
- intro
- HUD base
- cards de resultado
- botoneria principal/secundaria
- grid de metricas
- bloque de logros
- copy de progreso guardado

## Componentes propuestos

### `GameShellLoading`

Responsabilidad:

- mostrar estado de apertura o preparacion

Props minimas:

- `title`
- `description?`
- `backgroundVariant`
- `showSpinner`

No debe saber:

- nada de backend
- nada de sesion
- nada de siguiente nivel

### `GameShellIntro`

Responsabilidad:

- presentar el juego antes de iniciar

Props minimas:

- `title`
- `subtitle?`
- `instructions`
- `ctaLabel`
- `loading`
- `onStart`

No debe saber:

- como se prepara el juego por dentro

### `GameShellHud`

Responsabilidad:

- presentar el estado principal del juego

Props minimas:

- `gameTitle`
- `progressLabel`
- `progressValue`
- `skillLabel?`
- `secondaryMetric?`
- `onExit`
- `exitDisabled?`

Slots opcionales:

- `leftPanel`
- `rightPanel`
- `bottomPanel`

### `GameShellMetricGrid`

Responsabilidad:

- mostrar metricas con formato comun

Props minimas:

- `items`

Contrato por item:

- `label`
- `value`
- `tone?`
- `icon?`

### `GameShellResult`

Responsabilidad:

- mostrar resultado intermedio o final

Props minimas:

- `variant`
- `ribbon`
- `title`
- `subtitle?`
- `rewardLabel?`
- `rewardText?`
- `metrics`
- `achievements?`
- `primaryAction?`
- `secondaryAction?`
- `celebration?`
- `progressMessage?`

Reglas:

- `variant = intermediate | final`
- si es intermedio, el CTA principal tiende a `Continuar`
- si es final, el CTA principal tiende a `Volver al tablero`

### `GameShellAchievements`

Responsabilidad:

- pintar logros desbloqueados en un formato consistente

Props minimas:

- `items`

Contrato por item:

- `id`
- `title`
- `description?`
- `icon`

## Tokens que deben gobernar el shell

Tomar siempre de `theme/tokens` o de una extension formal.

### Tipografia

- titulo hero
- titulo card
- etiqueta pequeña
- valor metrico
- boton principal

### Espaciado

- padding overlay
- gap entre bloques
- separacion metricas

### Radios

- card principal
- card de metrica
- CTA primario
- CTA secundario

### Colores semanticos

- fondo shell claro
- fondo shell oscuro
- panel neutro
- panel exito
- CTA primario
- CTA secundario
- texto fuerte
- texto suave

## Mapeo inicial por juego

### Mercado

- actua como referencia
- no se migra
- se observa para alinear el shell

### Robot

Puede adoptar primero:

- `GameShellIntro`
- `GameShellResult`
- `GameShellMetricGrid`

Debe dejar intacto:

- `EscenaEnsamblaje`
- `QuizOverlay`
- `MathChallengeModal`

### Objeto Perdido

Puede adoptar primero:

- `GameShellLoading`
- `GameShellHud`
- `GameShellResult`

Debe dejar intacto:

- `ViroARScene`
- seleccion de objetos

### Tren

Puede adoptar luego:

- `GameShellLoading`
- `GameShellIntro`
- `GameShellResult`

Debe dejar intacto:

- `Tren3DVistaWebView`
- motor Babylon
- audio

### Camino AR

Solo fase cosmetica minima:

- posible alineacion de botoneria o metricas

Debe dejar intacto:

- escena AR
- logica
- posicionamiento

## Antipatrones prohibidos

- meter logica de sesion dentro del shell visual
- meter logica de adaptabilidad dentro del shell visual
- acoplar componentes visuales al nombre concreto de un juego
- duplicar botones compartidos por “ir mas rapido”
- tocar audio dentro de esta linea

## Orden recomendado de implementacion

1. crear primitivas visuales compartidas
2. integrar `Robot`
3. integrar `Objeto Perdido`
4. integrar `Tren`
5. evaluar si `Camino AR` necesita un ajuste minimo

## Resultado esperado

Cuando esto quede bien:

- cada juego seguira teniendo su identidad
- pero el usuario sentira la misma app
- el mantenimiento sera mas barato
- la UI sera mas predecible
- se reducira la percepcion de proyecto fragmentado
