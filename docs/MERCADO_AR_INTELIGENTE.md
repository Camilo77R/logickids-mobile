# Mercado Inteligente AR

## Objetivo

Definir el minijuego oficial `mercado-inteligente` con una presentacion AR
como una integracion seria y trazable
con mobile, backend y DB, sin disfrazarlo como una variante de `camino-ar` ni
de `tren-3d`.

La meta es construir un juego AR de presupuesto y seleccion de productos para
trabajar matematica temprana, logica de eleccion y clasificacion semantica.

## Posicion dentro del sistema

Segun el backend actual revisado en `logickids-backend-sena`, el catalogo ya
incluye `mercado-inteligente` como minijuego oficial visible. La capa nueva del
mobile debe acoplarse a esa identidad real y montar la experiencia AR encima de
ella.

### Slug propuesto

```text
mercado-inteligente
```

### Titulo oficial

```text
Mercado Inteligente
```

### Habilidad pedagogica propuesta

```text
Razonamiento
```

La fantasia visual puede ser AR, pero la identidad del minijuego la define la
DB. Mobile no debe inventar ni el slug ni la habilidad.

## Fantasia del juego

Sobre una mesa o el piso aparece un mini mercado en realidad aumentada.
El estudiante recibe una mision corta:

- comprar cierta cantidad de productos
- respetar un presupuesto maximo o exacto
- elegir productos por categoria

El estudiante arma su canasta y confirma la compra. Si cumple el reto, gana
puntos y recompensas visuales.

## Propuesta pedagogica

### Habilidades trabajadas

- conteo
- suma
- comparacion de cantidades
- clasificacion por categorias
- toma de decisiones con restricciones

### Tipos de reto

- `presupuesto_maximo`: comprar sin pasarse
- `presupuesto_exacto`: llegar al valor exacto
- `categoria_objetivo`: comprar productos de una categoria concreta
- `cantidad_y_categoria`: comprar una cantidad fija dentro de una categoria

## Contrato esperado con backend

El backend y la DB son la verdad. Mobile debe adaptarse a estos contratos.

### Estado observado hoy en backend

- slug oficial encontrado: `mercado-inteligente`
- titulo oficial encontrado: `Mercado Inteligente`
- habilidad oficial encontrada: `Razonamiento`
- visible en catalogo: `true`
- orden de catalogo: `4`

### Requisitos minimos

- mantener o extender el registro oficial existente en DB
- slug oficial `mercado-inteligente`
- titulo oficial `Mercado Inteligente`
- asociacion a la habilidad oficial `Razonamiento`
- habilitacion desde sesiones de clase y pasos pedagogicos

### Flujo esperado

1. `GET /api/estudiantes/mi-perfil` devuelve `sesion_minijuego_slug=mercado-inteligente`
2. Mobile habilita la card o acceso del juego
3. El juego llama `POST /api/sesiones/iniciar`
4. El juego registra eventos en `POST /api/sesiones/:id/eventos`
5. El juego finaliza en `POST /api/sesiones/:id/finalizar`
6. Backend calcula resumen, progreso y cierre oficial

### `game_config` propuesto

```json
{
  "dificultad": 2,
  "rondas_por_partida": 3,
  "presupuesto_monedas": 10,
  "cantidad_productos_visibles": 5,
  "cantidad_objetivos": 2,
  "precio_min": 1,
  "precio_max": 6,
  "categorias_permitidas": ["frutas", "verduras", "lacteos"],
  "modo_objetivo": "presupuesto_maximo",
  "ayudas_disponibles": 1
}
```

## Contrato de eventos para el MVP

El backend actual acepta estos tipos:

- `acierto`
- `error`
- `combo`
- `nivel_completado`

Por eso el MVP debe mapear la semantica del mercado sobre esos eventos y usar
`metadata` para enriquecerlos.

### Ejemplos

Compra valida:

```json
{
  "tipo_evento": "acierto",
  "habilidad": "Matematica",
  "tiempo_reaccion_ms": 1400,
  "puntos": 10,
  "combo_en_evento": 1,
  "metadata": {
    "ronda": 1,
    "producto_id": "manzana",
    "precio": 3,
    "categoria": "frutas",
    "presupuesto_restante": 5
  }
}
```

Confirmacion invalida:

```json
{
  "tipo_evento": "error",
  "habilidad": "Matematica",
  "tiempo_reaccion_ms": 2100,
  "puntos": 0,
  "combo_en_evento": 0,
  "metadata": {
    "ronda": 1,
    "motivo": "presupuesto_excedido",
    "total_carrito": 12,
    "presupuesto": 10
  }
}
```

## Alcance del MVP

- 3 rondas por partida
- 4 a 6 productos visibles por ronda
- 1 objetivo simple por ronda
- seleccion por toque sobre productos AR
- canasta visible con total en vivo
- validacion local de jugada
- persistencia oficial con contrato actual de sesiones

## Direccion grafica recomendada

La referencia no debe ser un supermercado hiperrealista ni una escena recargada.
Para este tipo de juego infantil funciona mejor:

- puesto pequeno sobre mesa o piso
- productos grandes, pocos y bien separados
- colores por categoria
- precios legibles y siempre visibles
- HUD 2D fijo para presupuesto, carrito y objetivo
- feedback rapido con cambio de color, sonido y texto corto

### Lenguaje visual sugerido

- frutas: naranjas y rojos calidos
- verduras: verdes claros y oscuros
- lacteos: azules suaves
- panaderia: amarillos tostados

### Regla de escena

La AR debe cargar el mundo; la comprension del reto debe quedar resuelta en el
HUD. No obligar al nino a leer informacion critica en objetos 3D pequenos.

## Direccion tecnica recomendada

### Colocacion AR

- detectar una superficie horizontal estable
- usar hit test/raycast para elegir el punto de colocacion
- fijar un solo anchor principal para el puesto
- evitar muchos anchors por producto si no hacen falta

### Interaccion

- primer toque: colocar puesto
- segundo toque: seleccionar producto
- boton 2D: confirmar compra

### Contenido 3D

- modelos low-poly o semi-low-poly
- texturas ligeras
- pocas sombras dinamicas
- animaciones suaves y cortas

### Acoplamiento con backend

- slug, titulo y habilidad vienen del catalogo oficial
- configuraciones pedagogicas deben venir por `configuracion_base` o `game_config`
- mobile solo usa defaults seguros como fallback temporal

## Arquitectura mobile propuesta

```text
src/features/games/mercado-ar/
  aplicacion/
  presentacion/
  mercadoAr.constants.js
  mercadoArConfiguracion.js
  mercadoArMotor.js
  MercadoARScreen.jsx
```

### Reglas de integracion

- no importar archivos internos de `camino-ar`
- reutilizar solo contratos y clientes compartidos de `src/features/games/core/`
- no agregar dependencias nativas nuevas en el MVP si podemos apoyarnos en la
  base AR existente
- no hardcodear un slug alterno como `mercado-ar`
- el nombre del modulo puede seguir siendo `mercado-ar` por claridad interna,
  pero su slug de negocio debe ser `mercado-inteligente`

## Roadmap recomendado

### Fase 0. Definicion de contrato

- confirmar si la presentacion AR debe vivir sobre el minijuego ya existente
  `mercado-inteligente` o si el backend quiere separar una variante distinta
- definir el `game_config` oficial
- habilitacion desde web tutor

### Fase 1. Nucleo puro del juego

- configuracion normalizada
- catalogo base de productos
- generador de rondas
- evaluador de canasta
- resumen final de partida
- tests de nucleo

### Fase 2. Presentacion mobile

- `MercadoARScreen`
- HUD de presupuesto, objetivo y carrito
- feedback visual y sonoro
- adaptacion responsive

### Fase 3. Escena AR

- deteccion de superficie
- aparicion del puesto de mercado
- productos seleccionables
- canasta AR o HUD 2D sincronizado

### Fase 4. Integracion completa

- acceso desde dashboard por slug real
- inicio de sesion real
- registro de eventos
- finalizacion real
- pruebas end-to-end con backend

## Decisiones tomadas en esta rama

- se crea un modulo mobile nuevo `mercado-ar` como capa de presentacion y logica
- el MVP se diseña alrededor del contrato actual de eventos
- el dashboard no se toca todavia para evitar promesas falsas si backend aun no
  habilita el minijuego
- primero se asegura el nucleo puro del juego y sus tests

## Hallazgos de acoplamiento con backend a fecha 2026-06-05

Backend local revisado: `C:\Users\MAÑANA\Desktop\logickids-backend-sena`

- `database/seed.sql` ya registra `mercado-inteligente`
- `src/services/sesiones.service.js` arma `game_config` por `minijuego.slug`
- hoy existen builders dedicados para `codigo-estelar` y `camino-ar`
- `mercado-inteligente` hoy caeria en el `default`, o sea recibe
  `configuracion_base + dificultad`

Implicacion:

- mobile no debe esperar que hoy exista un `buildMercadoInteligenteGameConfig`
- si queremos presupuesto, categorias y rondas autoritativas desde backend,
  debemos agregar un builder especifico en backend
