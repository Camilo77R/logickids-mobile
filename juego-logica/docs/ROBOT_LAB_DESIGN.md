# RobotLab: El taller del Dr. Cables

## Concepto central
El niño es un asistente de robotista. Construye robots funcionales para superar misiones (limpiar habitación, plantar árbol, cocinar tortilla, etc.). Para que el robot funcione, hay que elegir las piezas correctas y unirlas en el orden lógico adecuado usando el gesto de pinza (pulgar + índice) a modo de "pistola de ensamblaje".

## Habilidades lógicas que se entrenan
- **Clasificación**: ¿Esta pieza es una cabeza, un brazo o una herramienta?
- **Correspondencia**: ¿La cabeza redonda va mejor con brazos articulados o con pinzas?
- **Secuenciación**: Primero el torso, luego la cabeza, después los brazos.
- **Causa-efecto**: Si conectas un brazo al revés, el robot hará el gesto contrario.
- **Depuración (debugging)**: El robot no funciona → hay que revisar qué pieza sobra o falta.

## Mecánica

### 1. Zonas de ensamblaje codificadas por colores y formas
- Cada pieza tiene una clavija con forma geométrica (círculo, cuadrado, triángulo) y un color.
- El robot tiene receptáculos con esas mismas formas y colores.
- Si la pieza no coincide, rebota (feedback visual y sonoro).
- Conecta cuadrado con cuadrado, triángulo con triángulo.

### 2. Orden de ensamblaje obligatorio
- No se puede poner el brazo si primero no está el torso.
- No se puede poner la cabeza si los brazos no están colocados (o viceversa, según la misión).
- Diagrama de flujo simple ("Primero haz esto, luego esto") en una esquina.

### 3. Pistola de pegamento inteligente (gesto de pinza mejorado)
- Mantener el gesto de pinza (índice + pulgar) durante 1 segundo sobre la pieza → la pieza se "ilumina" y se pega a la mano virtual.
- Mover la mano lentamente hacia el receptor correcto.
- Abrir la pinza (separar dedos) para "soltar" la pieza.
- Si suelta antes de tiempo, la pieza cae al suelo y hay que volver a levantarla.

### 4. Detección de errores y "modo depuración"
- Si el robot tiene una pieza mal puesta (ej. dos cabezas, ningún brazo), se enciende una luz roja y el robot dice: "¡Ups! Me falta un brazo izquierdo" o "Tengo dos cabezas, eso no está bien".
- El niño usa la pinza para desmontar la pieza errónea (pinza + tirar hacia afuera) y volver a intentarlo.

### 5. Misiones con diferentes requisitos lógicos
| Misión | Robot | Piezas especiales |
|--------|-------|-------------------|
| Limpiador de basura espacial | Dos brazos largos + pinza + aspirador en el pecho | Imán, cepillo |
| Cocinero galáctico | Brazo con cuchara + brazo con batidora + delantal | Ojos que ven temperatura |
| Astronauta bombero | Brazos cortos + manguera + casco reflectante | Extintor en la espalda |

El niño debe pensar qué piezas cumplen la función. Para limpiar necesita pinza, no un taladro.

### 6. Feedback sensorial y celebración en 3D
Cuando la pieza encaja correctamente:
- **Efecto visual**: Partículas de chispas verdes.
- **Sonido**: ¡"Clinc"! + voz amigable del robot ("¡Bien pegado!").
- **Animación**: La pieza se atornilla sola.

Al completar todo el robot:
- El robot cobra vida, camina, saluda al niño y completa su misión (ej. aspira una mancha virtual).
- Se muestra un diploma en 3D con el nombre del niño y el robot construido.

## Consideraciones técnicas con MediaPipe + Babylon.js

### Detección de pinza
MediaPipe da las coordenadas 3D de la punta del índice y del pulgar. Cuando la distancia entre ambos es menor a un umbral (ej. 3 cm), se activa el gesto de "agarrar".

### Hold-to-grab
A diferencia de la versión anterior (pinch = grab instantáneo), ahora se requiere mantener la pinza 1 segundo sobre la pieza. Se muestra un anillo de progreso alrededor de la mano.

### Raycasting en Babylon
Para saber sobre qué pieza está la pinza, se lanza un rayo desde la "palma virtual" (punto medio entre muñeca y nudillos).

### Smooth dragging
Para evitar que la pieza se teletransporte, se usa un Vector3.Lerp que sigue la mano con cierta inercia (más natural para niños).

### Zonas de ensamblaje
Son `Mesh` invisibles con `isPickable = true`. Cuando la pieza entra en colisión con la zona correcta y el niño abre la pinza, la pieza se ancla en esa posición.

## Estructura de datos propuesta

```js
const MISSION = {
  id: 'space-cleaner',
  name: 'Limpiador de basura espacial',
  description: 'Necesito un robot con dos brazos largos, una pinza y un aspirador.',
  blueprint: 'cleaner-v1',
  // Orden de ensamble (algoritmo)
  assemblyOrder: [
    { slot: 'torso', partType: 'torso-standard' },
    { slot: 'head', partType: 'head-sensor' },
    { slot: 'arm_left', partType: 'arm-long' },
    { slot: 'arm_right', partType: 'arm-long' },
    { slot: 'tool_chest', partType: 'vacuum' },
  ],
  // Piezas disponibles (algunas correctas, otras distractoras)
  availableParts: [
    { id: 'head-sensor', correct: true, peg: { shape: 'circle', color: 'blue' } },
    { id: 'head-camera', correct: false, peg: { shape: 'circle', color: 'red' } },
    { id: 'arm-long', correct: true, peg: { shape: 'square', color: 'green' } },
    { id: 'arm-short', correct: false, peg: { shape: 'square', color: 'green' } },
    { id: 'arm-drill', correct: false, peg: { shape: 'square', color: 'yellow' } },
    { id: 'vacuum', correct: true, peg: { shape: 'triangle', color: 'cyan' } },
    { id: 'shovel', correct: false, peg: { shape: 'triangle', color: 'cyan' } },
  ],
};

const RECEPTACLE = {
  slot: 'arm_left',
  position: { x: -1.1, y: 0.8, z: 0 },
  shape: 'square',
  color: 'green',
  requires: 'arm-long', // o null = cualquiera que coincida forma+color
};
```

## Fases de implementación

### Fase A — Reemplazar MathChallengeOverlay por MissionSelector
- Eliminar `MathChallengeOverlay`
- Crear `MissionSelector` con 3 misiones iniciales
- Estado de "misión actual" en WorkshopController

### Fase B — Reemplazar AssemblyManager por RobotAssemblyEngine
- Eliminar `AssemblyManager` (versión vieja)
- Crear `RobotAssemblyEngine` con:
  - Validación de orden
  - Validación de forma/color (peg matching)
  - Feedback de error ("pieza incorrecta")
  - Soporte para pinza mantenida (1s) en vez de instantánea

### Fase C — Reemplazar piezas genéricas por Robot Parts v2
- Cada pieza tiene `peg: { shape, color }` además de geometría
- Receptáculos visibles (no solo hit volumes)
- Animación de "atornillado" al encajar

### Fase D — Celebración de misión completada
- Robot cobra vida (animación de caminar)
- Mini-cinematica de la misión (ej. aspirar basura)
- Diploma en 3D

### Fase E — Pulido y balance
- Afinar dificultad por edad
- Sonidos y voces del robot
- Progreso guardado en RobotCustomization
