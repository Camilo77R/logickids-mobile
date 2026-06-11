# Mercado Inteligente - Plan Visual V2

## Objetivo

Reconstruir toda la capa visual del juego `mercado-inteligente` para que se
sienta como un juego infantil premium, cercano a las referencias entregadas e
idealmente reconocible pantalla por pantalla,
sin tocar la logica de negocio, sesiones, eventos ni evaluacion.

## Restriccion principal

No tocar logica.

Eso significa:

- no cambiar `mercadoMotor.js`
- no cambiar reglas de puntaje
- no cambiar eventos de sesion
- no cambiar integracion con backend
- no cambiar flujo de persistencia

Solo se puede intervenir:

- layout
- tokens visuales
- copies visuales
- jerarquia de paneles
- estilos
- overlays
- composicion de HUD

## Resultado esperado

El juego debe parecerse a las referencias en estos puntos:

- cabecera grande y redondeada tipo banner verde
- paneles de madera/crema con borde grueso
- avatar infantil persistente en HUD
- moneda y estrellas como elementos protagonistas
- canasta/mochila visible como objeto central
- tarjetas con tipografia fuerte y legible
- overlays de resultado con tono de premio, diploma y trofeo

## Referencias obligatorias

### Gameplay

- banner verde superior muy ancho
- panel `TAREA` en madera arriba izquierda
- avatar y monedas arriba derecha
- mochila abajo izquierda
- canasta central abajo
- CTA grande `COMPRAR` en columna derecha
- tabs inferiores decorativos

### Nivel completado

- banner verde `MISION DE NIVEL COMPLETADA`
- saco o bloque de monedas en esquina superior derecha
- tarjeta central crema
- 3 estrellas gigantes
- resumen de 4 metricas
- CTA verde a siguiente nivel

### Cierre final

- banner verde `SESION DE CLASE FINALIZADA`
- trofeo protagonista
- diploma decorativo
- panel de metricas globales
- CTA azul para volver al tablero

## Mapa de pantallas

### 1. Pantalla de juego

Inspiracion principal:

- imagen de mision con banner verde
- panel izquierdo de tarea
- panel derecho de perfil y monedas
- boton grande de comprar
- canasta central

### 2. Pantalla de nivel completado

Inspiracion principal:

- banner verde con titulo del logro
- panel central crema
- estrellas gigantes
- resumen corto
- boton verde de siguiente nivel

### 3. Pantalla de cierre final

Inspiracion principal:

- trofeo central
- diploma / celebracion
- panel con metricas globales
- boton azul de volver al tablero

## Reglas de composicion

### Jerarquia

1. Banner superior
2. Objetivo y estado del jugador
3. Zona de juego
4. CTA principal
5. Feedback o resumen

### Lenguaje de formas

- esquinas muy redondeadas
- bordes gruesos
- sombras suaves pero visibles
- bloques separados por color y volumen

### Color

- verde vivo para CTA de avance
- amarillo/oro para monedas y estrellas
- crema para tarjetas informativas
- azul para informacion secundaria y retorno
- madera/calidos para fondo del mercado

## Componentes a rehacer

### MercadoHudSuperior

Debe convertirse en:

- panel izquierdo `TAREA`
- card de avatar/nivel a la derecha
- card de monedas
- estado de estrellas y combo
- boton de salida pequeno y discreto

### MercadoMisionCard

Debe convertirse en:

- banner superior grande
- copy en mayusculas
- enfasis visual en numero de objetos y monedas

### MercadoPanelInferior

Debe convertirse en:

- mochila abajo izquierda
- canasta visual central
- total grande al centro
- mensaje tipo burbuja
- CTA principal `COMPRAR`
- CTA secundaria `PISTA`
- CTA terciaria `MENU`
- tabs decorativos inferiores

### MercadoResultadoOverlay

Debe soportar dos modos:

- `nivel_completado`
- `sesion_finalizada`

Y cambiar automaticamente segun el estado ya resuelto por la logica actual.

## Regla de implementation

La implementacion visual debe apoyarse en:

- `mercadoUiTokens.js` como fuente central
- subcomponentes pequenos y legibles
- estilos claros, sin meter logica dentro de la vista

## No hacer

- no meter estados nuevos de juego
- no meter reglas nuevas de progresion
- no tocar data model
- no rehacer el motor Babylon en esta iteracion

## Orden de ejecucion

1. rehacer tokens visuales
2. rehacer HUD superior con panel tarea
3. rehacer banner de mision
4. rehacer panel inferior con mochila y acciones
5. rehacer overlay de resultado parcial
6. rehacer overlay de cierre final
7. pulir loading y bloqueado
8. validar que no se rompa la interaccion actual

## Estado de avance

- hecho: documento base de direccion visual
- hecho: nueva paleta y volumenes principales
- hecho: nueva composicion HUD superior
- hecho: nuevo banner de mision
- hecho: nuevo panel inferior
- hecho: nuevo overlay de nivel completado
- hecho: nuevo overlay de cierre final
- pendiente: prueba visual fina en dispositivo
- pendiente: ajuste de proporciones segun screenshot real
- pendiente: validacion de export y tests minimos

## Limite de esta iteracion

Esta iteracion no cambia:

- motor Babylon
- reglas de seleccion
- contratos de backend
- persistencia
- flujo de sesiones

Si luego queremos subir otro nivel, el siguiente frente sera:

- mejorar el render del puesto y los productos dentro de Babylon
- incorporar assets ilustrados propios del mercado
- reemplazar placeholders geometricos por arte final

## Criterios de aceptacion

- el juego se ve coherente con las referencias
- el usuario reconoce visualmente:
  - mision
  - monedas
  - canasta
  - compra
  - premio
- no se rompe ningun test del nucleo
- no cambia el comportamiento de la logica
