# RobotLab v2 — Especificación de Misiones

5 misiones donde el niño debe construir robots funcionales usando gesto de pinza
(pulgar + índice). Cada robot resuelve un problema concreto y trabaja una
habilidad cognitiva distinta (clasificación, secuencia, causa-efecto, depuración, planificación).

> **Regla global**: si la pieza no corresponde a la misión, el robot "no sabe
> hacer" la tarea y Dr. Cables da una pista sin castigar. El feedback siempre
> enseña el *por qué* del error.

---

## Misión 1: El Limpiador de Estrellas

**Contexto visual:**
La escena muestra la cúpula de cristal de una estación espacial flotando entre
nebulosas. Las ventanas están llenas de polvo brillante (motas doradas y
rosas que titilan). En el centro flota un mapa holográfico con puntos de
suciedad parpadeando. De fondo pasan asteroides pequeños y dos lunas verdes.
La luz es violeta suave. Una pequeña aspiradora robot vieja (rota) está
apoyada en una esquina — es la "mascota" de la misión.

**Diálogo del Dr. Cables:**
> "¡Hola, robotista! La cúpula está sucia y no podemos ver las nebulosas.
> Necesito un robot que limpie sin romper el cristal. ¿Qué piezas crees que
> necesita? ¡Piénsalo! Una aspiradora no corta, una escobilla sí frota, y los
> ojos deben ver la mugre invisible. ¡Tú puedes!"

**Objetivo lógico:**
Clasificación funcional (identificar la herramienta correcta para cada tarea)
+ secuencia simple (orden: chasis → sensores → herramienta → movilidad).

**Piezas necesarias:**
- **Torso Aspiradora** (forma cilíndrica, color amarillo pastel con franja gris)
  — depósito central con indicador de "lleno/vacío"
- **Brazo Cepillo** (forma de L, color turquesa) — cerdas blancas que giran
  al activarse
- **Ojos Sensor de Polvo** (dos esferas pequeñas, color violeta) — parpadean
  cuando detectan motas
- **Base con Ruedas Silenciosas** (dos ruedas negras con banda azul
  fluorescente) — se mueven en silencio para no asustar a las estrellas

**Errores comunes que el juego debe detectar:**
- Poner un brazo de tijeras o de taladro en lugar del cepillo
  (cortaría/rayaría el cristal)
- Olvidar los ojos sensores (el robot "no ve" la mugre y choca contra las
  ventanas)
- Invertir el orden: intentar poner los ojos antes que el torso
- Poner piernas con pies en lugar de ruedas (tropieza con los muebles de la
  estación)

**Feedback del robot al fallar:**
- *Con brazo incorrecto*: el robot agita el brazo equivocado y emite un
  "¡Piiiii!" agudo. Dr. Cables: "Mmm, con eso vas a rayar el cristal. Busca
  algo que *frota* suavecito, no que corta."
- *Sin ojos*: el robot avanza en línea recta y se estampa contra la cúpula
  con un "¡PLOP!" de cómic. Dr. Cables: "¡No ve la mugre! El robot necesita
  ojos que detecten el polvo, ¿no?"
- *Orden invertido*: el juego bloquea la ranura y muestra un candado con un
  tooltip: "Primero el torso — es donde vive todo lo demás."

**Celebración al completar:**
El robot aspiradora se desliza en círculos suaves por la cúpula (animación
de 5s, recorrido en espiral). Cada mota de polvo que toca se transforma en
una pequeña estrella fugaz que cruza la pantalla. Al final, la cúpula
queda transparente y la nebulosa se ve con todo su color. Aparece una
medalla con forma de burbuja brillante. Dr. Cables: "¡Lo lograste! La
estación entera te lo agradece. Mira esas estrellas, ¿verdad que valía la
pena?"

---

## Misión 2: El Chef Galáctico

**Contexto visual:**
La cocina del Chef Cósmico es una burbuja transparente suspendida en el
espacio. Hay ollas flotando, una estufa de plasma azul, ingredientes
alienígenas suspendidos en frascos (tres tipos: orbes verdes, cubos naranjas,
espirales morados). Una receta holográmica parpadea en el centro. El vapor
es rosado. De fondo se ve un planeta con anillos.

**Diálogo del Dr. Cables:**
> "¡Mi chef robot se descompuso a mitad de una receta! Tiene que preparar
> la 'Sopa de Nebulosa' antes de que se enfríe. Las piezas son parecidas a
> las de un robot normal, pero cada una tiene un trabajo especial. ¿Sabes
> qué herramienta sirve para revolver, qué ojos ven la temperatura, y
> qué pieza se pone primero? ¡A cocinar!"

**Objetivo lógico:**
Causa-efecto (qué herramienta hace qué acción) + secuencia crítica
(la olla fría no cocina — el orden altera el resultado).

**Piezas necesarias:**
- **Torso Horno** (caja ancha, color rojo cereza con llamas decorativas
  pequeñas) — tiene una compuerta que se abre sola
- **Brazo Cuchara** (forma de J invertida, color plateado) — el cuenco
  brilla cuando revuelve
- **Ojos Termómetro** (dos prismas rectangulares, color rojo-naranja) —
  cambian de color según la temperatura (azul = frío, rojo = caliente)
- **Base con Plato Giratorio** (disco blanco con borde dorado) — rota
  360° para presentar la receta

**Errores comunes que el juego debe detectar:**
- Brazo con tenedor en lugar de cuchara (pincha en vez de revolver)
- Ojos de cámara (ve, pero no mide la temperatura — la sopa se quema)
- Poner la base giratoria antes que el torso (el plato se cae al vacío)
- Poner los ojos-termómetro como piezas "decorativas" al final (ya cocinado)

**Feedback del robot al fallar:**
- *Con tenedor*: el robot intenta revolver, pincha la olla y los orbes
  verdes salen disparados. Dr. Cables: "¡Eso pincha, no revuelve! Para
  mezclar, necesitas una cuchara, ¿ves la forma de J?"
- *Con ojos-cámara*: el robot cocina, no ve el color cambiar, y la sopa
  humea negra. Dr. Cables: "La sopa se pasó. El robot necesitaba *ver el
  calor*, no solo ver. Prueba con los prismas rojos."
- *Orden invertido*: la base se pone antes que el torso, y la pieza
  cae flotando sin soporte — animación divertida de pieza girando en el
  vacío con cara de sorpresa.

**Celebración al completar:**
El robot prepara la sopa: la olla echa vapor rosado, el brazo cuchara
revolve en cámara lenta, los ojos termómetro brillan en rojo. Una vez
lista, el plato giratorio rota y la "Sopa de Nebulosa" se eleva con un
destello. Aparece una medalla con forma de cuchara de chef. Dr. Cables:
"¡MMMM, qué delicia! Si yo fuera un alien, te pedía otra porción. ¡Eres
un chef estelar!"

---

## Misión 3: La Jardinera del Planeta Esmeralda

**Contexto visual:**
Un jardín botánico alienígena dentro de una burbuja verde. Hay tres tipos de
plantas: unas con bulbos morados que parpadean, otras con tentáculos
rosados que se enroscan, y unas pequeñas esferas amarillas que flotan.
El suelo es de musgo brillante. Una manguera rota gotea charcos azules
en una esquina. Pasan pájaros de luz entre las hojas. La paleta dominante
es verde-lima con acentos en violeta y rosa.

**Diálogo del Dr. Cables:**
> "¡Hola, botánica espacial! Mis plantas tienen sed, pero si les echo
> demasiada agua se ahogan. Necesito un robot que sepa cuánta agua es la
> *justa*. Tendrá que medir la humedad y tener una regadera, no un aspersor
> gigante. ¿Me ayudas a armarlo?"

**Objetivo lógico:**
Medición y moderación (causa-efecto: poca agua = planta triste, mucha agua
= planta ahogada) + clasificación (regadera, no manguera industrial).

**Piezas necesarias:**
- **Torso con Tanque de Agua** (forma de gota invertida, color verde
  transparente con nivel de agua visible) — indicador lateral
- **Brazo Regadera** (cilindro con cabeza de lluvia, color amarillo
  pastel) — 7 agujeros pequeños
- **Ojos Sensor de Humedad** (dos esferas medianas, color azul cielo) —
  brillan más fuerte cuanto más seco esté el suelo
- **Base con Raíces-Oruga** (dos orugas verdes con ventosas) — no daña
  el musgo

**Errores comunes que el juego debe detectar:**
- Brazo con manguera industrial (demasiada presión, arranca las plantas)
- Ojos de visión normal (no detecta humedad — riega al azar)
- Poner el brazo antes que el tanque (no tiene agua para verter)
- Poner ruedas duras (compacta el musgo)

**Feedback del robot al fallar:**
- *Con manguera*: las plantas se vuelcan y los pájaros de luz se van
  asustados. Dr. Cables: "¡Cuidado, astronauta! Esa manguera es muy
  fuerte. Las plantas son delicadas. Prueba con algo que tenga muchos
  agujeritos pequeños."
- *Sin sensor de humedad*: el robot riega sin parar, se forma un charco
  y aparecen burbujas. Dr. Cables: "¡Le ahogaste la planta! El robot no
  sabía cuándo parar. Necesita ojos que sientan la humedad."
- *Orden invertido*: el brazo cae vacío, no tiene agua; animación de
  brazo moviéndose sin soltar nada, con cara de "?": el tanque no
  existe aún.

**Celebración al completar:**
El robot avanza entre las plantas, los ojos brillan suavemente al
detectar sequedad, el brazo regadera deja caer gotas cristalinas. Cada
planta que se hidrata crece una flor brillante (animación de pétalos
desplegándose, 3 colores). Al final, una mariposa de luz se posa sobre
la cabeza del robot. Aparece una medalla con forma de hoja con gota de
rocío. Dr. Cables: "¡Verde que te quiero verde! Mira cómo florecen. Tú
sí que entiendes a las plantas."

---

## Misión 4: La Rescatista de la Luna Helada

**Contexto visual:**
La superficie de una luna congelada, de noche. Cielo con dos lunas
gigantes color cian. Un astronauta de juguete (mide unos 30cm) está
atrapado en una grieta de hielo brillante, rodeado de cristales azules.
Hay un pequeño cráter con vapor saliendo. La nieve es violeta pálido.
Unos animales cristalinos (parecidos a zorros) observan a lo lejos.
La luz es fría, con un único foco cálido en el centro.

**Diálogo del Dr. Cables:**
> "¡Auxilio, robotista! La astronauta Lina se cayó en una grieta y
> empieza a hacer frío. Necesito un robot *resistente* que pueda
> caminar sobre hielo sin resbalarse, tenga un brazo que la *alcance*,
> y ojos que la *vean* en la oscuridad. El tiempo corre: ¡las luces
> parpadean! ¿Qué piezas rescatan a una amiga?"

**Objetivo lógico:**
Depuración y selección bajo presión (identificar el conjunto de piezas
que resuelven *varios* problemas a la vez: tracción, alcance, visión
nocturna) + empatía (la motivación es salvar a alguien, no un puzzle
abstracto).

**Piezas necesarias:**
- **Torso Blindado** (caja hexagonal, color azul metálico con remaches
  naranjas) — emite vapor cálido al activarse
- **Brazo Extensible** (segmentos telescópicos, color plata con
  articulaciones amarillas) — se estira hasta 2x
- **Ojos de Visión Nocturna** (dos lentes verdes brillantes con halo
  cian) — iluminan el área al activarse
- **Base con Garras de Hielo** (dos trineos cortos con pinchos
  inferiores, color cian) — se adhieren al hielo

**Errores comunes que el juego debe detectar:**
- Brazo fijo (no llega a la grieta, queda corto)
- Ojos normales (no ve en la oscuridad, choca contra un cristal)
- Ruedas normales (resbala en el hielo, animación divertida de
  pirueta)
- Poner la base antes que el torso (sin calefacción, el robot
  "tiembla")

**Feedback del robot al fallar:**
- *Con brazo fijo*: el robot llega hasta el borde de la grieta, estira
  el brazo y se queda corto, con la astronauta a 5cm. Dr. Cables: "Tan
  cerca y tan lejos... ¿no hay un brazo que pueda *estirarse* más?"
- *Con ojos normales*: el robot camina a tientas, se choca con un
  cristal con un "¡CRASH!" apagado. Dr. Cables: "Está muy oscuro. El
  robot necesita ojos que *vean en la noche*."
- *Con ruedas en hielo*: el robot patina de un lado a otro, con sonido
  de "wiii wiii" cómico. Dr. Cables: "¡Resbala! Necesita algo que se
  agarre al hielo, ¿no?"

**Celebración al completar:**
El robot se acerca con sus luces, los ojos iluminan la grieta, el brazo
se extiende y levanta suavemente a la astronauta. Ella saluda con la
mano. Los cristales del entorno se iluminan uno por uno como un
árbol de Navidad. La astronauta abraza al robot y aparece un corazón
brillante entre los dos. Aparece una medalla con forma de estrella de
rescate. Dr. Cables: "¡Lo lograste! Lina está a salvo gracias a ti.
Eso es ser un verdadero héroe: pensar rápido y armar mejor."

---

## Misión 5: La Constructora del Puente Arcoíris

**Contexto visual:**
Una cantera flotante en el espacio. Hay dos plataformas separadas por un
vacío de 4 unidades, con un río de estrellas debajo. Bloques de colores
primarios (rojo, azul, amarillo, verde) están apilados en la plataforma
izquierda — son los "ladrillos" del puente. Un plano del puente
proyectado en holograma (líneas punteadas) muestra dónde va cada bloque.
De fondo, un planeta anillado y polvo de estrellas.

**Diálogo del Dr. Cables:**
> "¡Ingeniera a la vista! Tenemos que cruzar ese vacío para llegar al
> otro lado. El robot constructor debe *medir* la distancia, *cargar*
> los bloques, y *colocarlos* uno a uno en el orden correcto. Si pones
> un bloque rojo donde va uno azul, el puente se tambalea. ¿Lista para
> planificar paso a paso?"

**Objetivo lógico:**
Planificación y secuencia (visualizar el orden lógico de la construcción:
medir → cargar → colocar → asegurar) + depuración (el puente "se cae"
si el orden es incorrecto, enseñando al niño a reordenar).

**Piezas necesarias:**
- **Torso Caja de Herramientas** (caja rectangular con tapa que se abre,
  color naranja con cierre plateado) — guarda los bloques internamente
- **Brazo Martillo Suave** (forma de T, color dorado con cabeza roja) —
  emite un destello al "clavar" un bloque
- **Ojos Medidor Láser** (dos prismas finos, color verde neón) —
  proyectan una línea que mide distancias
- **Base con Orugas de Carga** (dos orugas anchas, color gris) —
  pueden llevar bloques encima

**Errores comunes que el juego debe detectar:**
- Brazo con sierra (rompe los bloques en vez de unirlos)
- Ojos decorativos (no proyecta la medida, coloca "a ojo" y se
  desequilibra)
- Colocar los bloques en cualquier color (no importa el orden al
  usuario, pero el puente se tambalea si va de claro a oscuro sin
  alternar)
- Intentar cruzar antes de terminar el puente (la pieza cae al vacío
  con cara de sorpresa)

**Feedback del robot al fallar:**
- *Con brazo-sierra*: el bloque se rompe en pedazos flotantes. Dr. Cables:
  "¡Lo cortaste! Eso no une, *corta*. Necesitas un martillo que *clava*."
- *Sin medidor*: el robot coloca un bloque demasiado lejos, queda
  flotando solo, y se cae al vacío. Dr. Cables: "Hay que *medir* antes
  de colocar. Prueba con los prismas verdes que proyectan luz."
- *Puente incompleto*: el robot intenta cruzar, da un paso en el vacío
  y cae (animación de "¡ay!" con burbujas de cómic). Dr. Cables: "¡El
  puente no está listo! Mira el plano, ¿qué bloque va primero?"

**Celebración al completar:**
El robot coloca el último bloque y el puente se ilumina bloque a bloque
(cada ladrillo emite luz cuando está bien colocado). El robot cruza
lentamente y al llegar al otro lado, el puente se transforma en un
arcoíris sólido. En la otra plataforma hay un cofre con otra pieza de
robot (recompensa visual para juntar todas las misiones). Aparece una
medalla con forma de arco y herramientas cruzadas. Dr. Cables: "¡Eres
una ingeniera de primer nivel! Eso que hiciste se llama *planificar*:
pensar antes de construir. En la vida también funciona así."

---

## Tabla resumen: Habilidad lógica por misión

| # | Misión | Tema | Habilidad lógica principal | Habilidad secundaria | Pieza "trampa" clave |
|---|---|---|---|---|---|
| 1 | El Limpiador de Estrellas | Limpieza | Clasificación funcional | Secuencia simple | Tijeras (corta en vez de frotar) |
| 2 | El Chef Galáctico | Cocina | Causa-efecto | Secuencia crítica | Tenedor (pincha, no revuelve) |
| 3 | La Jardinera del Planeta Esmeralda | Jardinería | Medición / moderación | Causa-efecto | Manguera industrial (presión excesiva) |
| 4 | La Rescatista de la Luna Helada | Rescate | Depuración bajo presión | Empatía / selección múltiple | Ruedas en hielo (resbala) |
| 5 | La Constructora del Puente Arcoíris | Construcción | Planificación | Secuencia lógica | Sierra (rompe, no une) |

### Mapa de progresión cognitiva

```
Misión 1 ──► Misión 2 ──► Misión 3 ──► Misión 4 ──► Misión 5
  Identificar   Causa y     Medir         Combinar      Planificar
   la pieza     efecto    cantidades    varias reglas   antes de
                                            a la vez     actuar
```

### Piezas "transversales" compartidas

Para añadir re-jugabilidad, las siguientes piezas pueden aparecer en
varias misiones con etiquetas de "tema" (no basta con tener la pieza, hay
que tener la *correcta para la misión*):

- **Torso**: depósito, horno, tanque, blindado, caja-herramientas
- **Brazos**: cepillo, cuchara, regadera, extensible, martillo
- **Ojos**: polvo, termómetro, humedad, visión-nocturna, medidor-láser
- **Bases**: ruedas, plato, oruga-garra, oruga-carga, raíces

Si el niño intenta poner una pieza de otra misión, el robot "no sabe
hacer la tarea" y Dr. Cables lo redirige.

### Reglas de feedback

- **Tono**: nunca de fracaso. Siempre de "pista".
- **Voz del Dr. Cables**: máximo 2 frases por pista, en presente.
- **Animación del robot**: exagerada y cómica (nunca triste).
- **Reintento**: ilimitado, sin penalización.
- **Celebración**: siempre con regalo visual (medalla, flor, animal,
  pieza) — nunca con "puntos" abstractos.
