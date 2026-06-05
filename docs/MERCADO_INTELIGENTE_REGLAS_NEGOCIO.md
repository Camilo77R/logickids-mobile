# Reglas de negocio sugeridas - Mercado Inteligente

## Objetivo

Bajar `mercado-inteligente` a reglas compatibles con la DB, el backend y el
front mobile actual, evitando reglas ambiguas o imposibles de persistir.

## Verdad del sistema

- La DB define el slug, titulo, habilidad y catalogo oficial.
- El backend define la sesion autorizada, dificultad y `game_config`.
- Mobile ejecuta la experiencia y reporta eventos dentro del contrato existente.

## Identidad oficial observada

- slug: `mercado-inteligente`
- titulo: `Mercado Inteligente`
- habilidad: `Razonamiento`

## Reglas sugeridas del juego

### 1. La sesion de clase manda

El estudiante solo puede entrar si `mi-perfil` trae:

- `sesion_activa = true`
- `sesion_minijuego_slug = "mercado-inteligente"`

Mobile no debe habilitar el juego por nombre visual ni por card.

### 2. El backend debe ser autoritativo en parametros pedagogicos

El mobile puede tener defaults de seguridad, pero el comportamiento esperado
debe venir de `game_config`.

Campos sugeridos:

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
  "ayudas_disponibles": 1,
  "modo_presentacion": "ar-superficie"
}
```

### 3. La ronda termina cuando el estudiante confirma

No cerrar por simple seleccion.

Estados de una ronda:

- seleccionando
- confirmada con acierto
- confirmada con error

### 4. Los eventos oficiales no cambian

Mientras backend no agregue nuevos tipos, `mercado-inteligente` debe usar:

- `acierto`
- `error`
- `combo`
- `nivel_completado`

Y toda semantica propia vive en `metadata`.

### 5. El backend calcula el resultado oficial

Mobile puede mostrar un resumen local provisional, pero la verdad del cierre
oficial sigue siendo:

- puntaje
- aciertos
- errores
- combo_maximo
- estrellas

### 6. La AR es modo de presentacion, no otro minijuego

Sugerencia fuerte:

- no crear otro slug como `mercado-ar`
- usar `mercado-inteligente` como identidad unica
- usar `modo_presentacion` para indicar si la experiencia corre en AR

## Reglas sugeridas para DB/backend

### Configuracion base por paso

`sesion_clase_pasos.configuracion_base` deberia soportar:

- presupuesto
- categorias
- modo objetivo
- cantidad de rondas
- ayudas

### Catalogo futuro de productos

Si el juego crece, conviene evitar hardcodear productos en mobile.

Camino recomendado:

- corto plazo: `categorias_permitidas` + generacion local
- mediano plazo: tabla/catalogo de productos pedagogicos

## Decisiones que si requieren confirmacion del equipo

- La habilidad oficial se queda en `Razonamiento` o debe migrar a otra taxonomia.
- `modo_presentacion` va a venir del backend o solo sera interno del mobile.
- El producto final usa solo AR o tiene fallback 2D para dispositivos no compatibles.
- Las ayudas restan puntos o solo afectan analytics.
