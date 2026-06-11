# Mercado Inteligente Premium

## 1. Estado de este documento

Este documento es la fuente de verdad para reconstruir la experiencia visual de
`Mercado Inteligente`.

La reconstruccion comienza desde cero en lo visual. No se intenta reparar,
maquillar ni extender la presentacion anterior.

La implementacion debe conservar los contratos reales de sesion, resultados y
reglas de negocio que ya funcionan. El backend y la DB siguen siendo la fuente
de verdad.

## 2. Objetivo del producto

Crear un minijuego movil infantil en paisaje que se sienta como un mercado
digital vivo, claro y satisfactorio.

La experiencia debe comunicar durante los primeros cinco segundos:

- cual es la mision;
- cuantos productos debe comprar el estudiante;
- cual es el presupuesto disponible;
- que productos puede seleccionar;
- cuanto suma su compra;
- cual es la accion principal.

No debe sentirse como formulario, dashboard, prototipo tecnico ni coleccion de
tarjetas.

## 3. Alcance inmediato

La experiencia completa tendra tres pantallas:

1. Mercado jugable.
2. Resultado del nivel.
3. Cierre de la sesion asignada.

El primer corte trabaja exclusivamente la **Pantalla 1: Mercado jugable**.

No se inicia la Pantalla 2 hasta que la Pantalla 1:

- sea visualmente consistente;
- permita seleccionar, retirar, fallar, corregir y comprar;
- mantenga 60 FPS razonables en el dispositivo objetivo;
- respete el nivel y presupuesto recibidos;
- se entienda sin explicacion externa.

Las especificaciones de Pantallas 2 y 3 quedan documentadas para proteger el
flujo completo, pero no se implementan ni refinan visualmente hasta recibir sus
referencias finales.

## 4. Regla de preservacion

### Se conserva

- el slug y contrato real esperado por backend;
- `useSesionMercado.js` como adaptador de la sesion existente;
- `mercadoMotor.js` como base de reglas puras, ajustandolo solo si existe una
  necesidad real y comprobada;
- la configuracion derivada del backend;
- el avance y cierre de niveles asignados;
- el reporte de resultados mediante las capas existentes;
- los mensajes positivos y de correccion amable;
- los assets GLB y sonidos que superen la nueva revision visual.

### Se reconstruye

- toda la composicion visual;
- la escena Babylon;
- la interfaz del juego;
- el bridge visual;
- botones, paneles, indicadores y animaciones;
- la presentacion de productos;
- la seleccion visual y la canasta;
- los estados de carga y error visual.

### Auditoria real del proyecto al iniciar esta reconstruccion

| Archivo o modulo | Decision | Motivo |
| --- | --- | --- |
| `aplicacion/useSesionMercado.js` | Conservar | Inicia, sincroniza y finaliza sesiones mediante el cliente comun. |
| `mercadoMotor.js` | Conservar | Genera rondas, evalua seleccion y construye contratos comunes. |
| `mercadoConfiguracion.js` | Conservar | Traduce configuracion local y `game_config` real del backend. |
| `mercado.constants.js` | Conservar | Mantiene identidad y catalogo del dominio. |
| `useMercadoFeedback.js` | Revisar y adaptar | La responsabilidad es valida, pero los sonidos deben responder al nuevo diseño. |
| `MercadoInteligenteScreen.jsx` | Extraer y sustituir visualmente | Mezcla orquestacion real con una presentacion anterior de mas de 900 lineas. |
| `presentacion/*` actual | Sustituir | Pertenece a la cara visual anterior. No es referencia del nuevo diseño. |

La presentacion anterior solo permanece temporalmente mientras la nueva
Pantalla 1 alcanza paridad funcional. Despues se elimina por completo junto con
imports, estilos y archivos no referenciados.

### No se permite

- peticiones HTTP, sockets o persistencia dentro de Babylon/WebView;
- reglas de sesion dentro de Babylon;
- calculos de compra duplicados en UI y motor;
- precios, niveles o productos quemados dentro de componentes;
- nombres relacionados con AR;
- reutilizar componentes visuales anteriores solo por conveniencia;
- mezclar las tres pantallas en un componente gigante;
- mostrar errores tecnicos al estudiante.

## 5. Imagen mental de arquitectura

El juego es un teatro:

- la sesion de React Native es el productor que entrega el libreto;
- el controlador del juego decide que ocurre;
- Babylon es el escenario y mueve los actores 3D;
- la UI 2D son los letreros y controles visibles;
- el bridge es el intercomunicador entre camerinos;
- al terminar, React Native recibe el resultado y lo reporta usando el flujo
  existente.

Ninguna capa debe hacer el trabajo de otra.

## 6. Arquitectura objetivo

```text
src/features/games/mercado-inteligente/
  aplicacion/
    useSesionMercado.js
    useMercadoPremiumController.js

  dominio/
    mercadoMotor.js
    mercadoConfiguracion.js
    mercadoNivel.mapper.js

  presentacion/
    MercadoInteligenteScreen.jsx

    premium/
      MercadoPremiumWebView.jsx
      mercadoPremiumBridge.js
      mercadoPremiumAssets.js
      mercadoPremiumTokens.js

      escena/
        crearEscenaMercado.js
        crearMostrador.js
        crearProducto3d.js
        crearCanasta3d.js
        animarProductoACanasta.js
        actualizarEstadoVisual.js

      interfaz/
        crearInterfazMercado.js
        crearPanelMision.js
        crearPanelTarea.js
        crearPanelMochila.js
        crearPanelJugador.js
        crearControlesCompra.js
        crearEstilosMercado.js
```

Los nombres pueden ajustarse si el codigo existente demuestra una separacion
mejor, pero las responsabilidades no pueden mezclarse.

## 7. Contrato entre capas

### React Native entrega al juego

```js
{
  type: 'START_GAME_SESSION',
  payload: {
    sessionId,
    currentLevel,
    totalLevels,
    level: {
      missionText,
      budget,
      requiredProductCount,
      products,
    },
  },
}
```

El mapper traduce el contrato real existente a este modelo visual. No se cambia
el backend para acomodar la vista.

### Juego informa a React Native

```js
{
  type: 'LEVEL_COMPLETED',
  payload: {
    level,
    attempts,
    errors,
    stars,
    spentCoins,
    selectedProductIds,
    elapsedTimeMs,
  },
}
```

```js
{
  type: 'GAME_EXIT_REQUESTED',
}
```

```js
{
  type: 'SESSION_VISUAL_COMPLETE',
  payload: {
    levelsCompleted,
    totalStars,
    totalErrors,
    maxCombo,
  },
}
```

La capa de aplicacion decide como traducir estos eventos al flujo real de
sesion. La WebView nunca guarda ni cierra sesiones directamente.

## 8. Pantalla 1: composicion obligatoria

La composicion usa paisaje y respeta safe areas.

### Centro: protagonista

- mostrador de mercado 3D calido;
- entre tres y cuatro productos grandes;
- cada producto conserva espacio visual propio;
- nombre y precio legibles cerca del producto;
- la canasta se ve en primer plano;
- el centro permanece libre de paneles grandes.

### Superior centro: mision

- marquesina verde;
- texto corto y dinamico;
- maximo dos lineas;
- jerarquia superior al resto de textos;
- nunca se corta.

Ejemplo:

```text
MISION: COMPRA 2 OBJETOS
SIN PASARTE DE 8 MONEDAS
```

### Lateral izquierdo: tarea y mochila

Panel de tarea:

- progreso `0/2 objetos`;
- presupuesto maximo;
- estados claros mediante icono y texto.

Mochila:

- muestra miniaturas de lo seleccionado;
- permite entender rapidamente que esta dentro;
- no duplica toda la informacion del producto.

### Lateral derecho: jugador y acciones

- avatar o mascota configurable;
- nivel actual;
- monedas disponibles;
- boton `Comprar` como unica accion dominante;
- acciones secundarias `Reiniciar` y `Menu` visualmente subordinadas.

### Inferior centro: total

- total actual siempre visible;
- cambia de estado visual segun faltante, exacto o exceso;
- nunca muestra monedas negativas;
- no necesita presionar comprar para conocer el progreso.

## 9. Interaccion principal

### Seleccionar producto

Al tocar un producto:

1. responde inmediatamente;
2. ejecuta un rebote corto;
3. vuela en parabola hacia la canasta;
4. actualiza mochila y total;
5. reproduce feedback corto;
6. conserva la posibilidad de retirarlo.

El estudiante puede seleccionar una respuesta incorrecta. El juego debe
permitir fallar, entender y corregir.

### Comprar

Si la seleccion no cumple la mision:

- no avanza;
- registra el intento local;
- explica si faltan monedas, sobran monedas o falta cantidad;
- permite corregir;
- mantiene un tono positivo.

Si la seleccion cumple:

- bloquea interacciones duplicadas;
- celebra brevemente;
- crea el resultado del nivel;
- transiciona a la Pantalla 2 cuando esta exista.

### Reiniciar nivel

- limpia la seleccion local;
- devuelve productos a su posicion original;
- reinicia total y feedback visual;
- no inicia ni finaliza otra sesion remota;
- no registra un resultado falso;
- conserva la misma mision del nivel actual.

## 10. Direccion visual

La referencia es un mercado infantil premium de juguete:

- madera calida;
- verdes vivos para mision y compra;
- oro para monedas y recompensa;
- productos saturados, reconocibles y bien iluminados;
- bordes gruesos controlados;
- sombras planas para profundidad;
- tipografia redondeada, gruesa y altamente legible;
- animaciones cortas y con proposito.

### Variables base

```css
:root {
  --primary-green: #5cb85c;
  --light-green: #a3e34b;
  --wood-dark: #8b5a2b;
  --wood-light: #f4d0a4;
  --coin-gold: #ffd700;
  --text-dark: #4a2e1b;
  --text-white: #ffffff;
  --overlay-bg: rgba(40, 25, 15, 0.4);
}
```

Estas variables son tokens semanticos, no una licencia para pintar todo del
mismo color.

## 11. Reglas de Babylon

Babylon se encarga solamente de:

- escena;
- camara fija;
- luces;
- productos;
- mostrador;
- canasta;
- picking;
- animaciones 3D;
- feedback visual 3D.

Babylon no conoce:

- backend;
- sesion de clase;
- endpoints;
- reglas de estrellas;
- cierre oficial;
- navegacion de React Native.

La camara debe ser fija o fuertemente limitada. El estudiante no puede perder
el mercado ni alterar accidentalmente la composicion.

### Animacion de producto a canasta

El vuelo de seleccion debe:

- iniciar desde la posicion visual actual del producto;
- terminar dentro de la canasta;
- usar una trayectoria curva corta y legible;
- bloquear dobles toques durante el vuelo;
- restaurar limpiamente el producto si se retira de la compra;
- emitir el evento de seleccion una sola vez al terminar.

La animacion es presentacion. La seleccion oficial pertenece al controlador.

## 12. Reglas de UI movil

- una sola accion primaria visible;
- objetivos y presupuesto siempre legibles;
- botones dentro de safe areas;
- objetivos tactiles amplios;
- textos cortos;
- no repetir informacion;
- no tapar productos con paneles;
- estados de carga sin congelar la interfaz;
- el resultado visual aparece inmediatamente y la persistencia ocurre en
  segundo plano mediante la capa existente.

## 13. Pantalla 2: resultado de nivel

Esta pantalla aparece encima del mercado cuando la compra es correcta.

Debe:

- bloquear interacciones con la escena;
- celebrar sin cubrir la pantalla con datos tecnicos;
- mostrar estrellas secuencialmente;
- resumir aciertos, correcciones, monedas usadas y combo;
- permitir avanzar solo cuando el flujo real confirme que corresponde;
- mostrar el resultado inmediatamente mientras la persistencia ocurre en
  segundo plano.

Regla visual provisional de estrellas:

- cero intentos fallidos: tres estrellas;
- uno o dos intentos fallidos: dos estrellas;
- tres o mas intentos fallidos: una estrella.

La respuesta oficial del backend prevalece sobre este calculo visual. No se
persiste una regla paralela.

## 14. Pantalla 3: cierre de sesion

Esta pantalla aparece exclusivamente cuando el estudiante termino los niveles
asignados por el tutor.

Debe mostrar:

- trofeo o logro principal;
- niveles completados;
- estrellas oficiales acumuladas;
- aciertos, errores y combo maximo disponibles;
- celebracion visual controlada;
- una unica accion principal para volver al tablero.

No debe mostrar `Jugar otra vez` cuando la sesion ya termino.

Antes de salir, la presentacion debe liberar escena, engine, listeners,
animaciones y recursos temporales. La capa React Native conserva la
responsabilidad de cerrar el flujo oficial.

## 15. Configuracion visual de entrada

El juego recibe un modelo visual agnostico generado por un mapper desde el
contrato real:

```js
{
  sessionId: 'session-id',
  currentLevel: 1,
  totalLevels: 3,
  level: {
    missionText: 'Compra 2 objetos sin pasarte de 8 monedas',
    budget: 8,
    requiredProductCount: 2,
    products: [
      {
        id: 'manzana',
        name: 'Manzana',
        cost: 3,
        modelSources: ['asset-uri-principal', 'asset-uri-respaldo'],
      },
    ],
  },
}
```

El mapper es la unica pieza autorizada para traducir nombres del backend a
nombres visuales. Ni Babylon ni la UI conocen `game_config`, endpoints o
schemas remotos.

## 16. Audio y feedback

El sistema debe diferenciar:

- toque de producto;
- producto entrando a canasta;
- correccion requerida;
- compra correcta;
- estrella obtenida;
- cierre completo.

Los audios deben ser cortos, agradables y reemplazables desde una sola
configuracion. Ningun sonido puede bloquear el juego ni romperlo si falla.

La vibracion debe ser breve y proporcional al evento. No se usa vibracion
constante.

## 17. Rendimiento y ciclo de vida

- los modelos se precargan una vez por sesion visual;
- los productos se reutilizan entre cambios de estado;
- no se recrea el documento WebView por cada seleccion;
- no se convierte repetidamente el mismo GLB a Base64;
- se eliminan listeners al desmontar;
- se dispone Babylon al salir definitivamente;
- se limita el numero de luces, particulas y meshes;
- se evita ejecutar calculos de React en cada frame;
- los mensajes del bridge son pequenos y validados.

La escena debe degradarse con elegancia si un asset falla, pero el fallo debe
quedar diagnosticado para desarrollo.

## 18. Modularidad y Clean Code

- una responsabilidad por archivo;
- funciones pequenas y nombradas por intencion;
- configuracion inyectada;
- reglas puras fuera de React y Babylon;
- bridge con mensajes validados;
- ningun componente principal mayor a 250 lineas;
- ninguna funcion de escena mayor a 40 lineas sin una razon documentada;
- no usar comentarios para explicar codigo confuso: simplificar el codigo;
- comentarios solo para explicar decisiones o restricciones.

## 19. Estrategia de reconstruccion

Cada paso se completa y verifica antes de avanzar:

1. Congelar y documentar contratos reales que se conservan.
2. Crear un nuevo shell visual vacio para la Pantalla 1.
3. Crear la UI 2D estatica con la composicion final.
4. Crear la escena Babylon estatica.
5. Integrar productos configurables.
6. Integrar seleccion y vuelo a canasta.
7. Conectar motor puro y validacion.
8. Integrar feedback, sonidos y mensajes positivos.
9. Verificar sesion real sin modificar su contrato.
10. Eliminar definitivamente la presentacion anterior no referenciada.

No se construyen varias capas al mismo tiempo. Cada corte debe poder probarse
visualmente en dispositivo.

## 20. Cortes verificables de Pantalla 1

### Corte A: composicion estatica

- la pantalla coincide en jerarquia con la referencia;
- no existe logica duplicada;
- la mision, tarea, mochila, jugador, total y comprar tienen lugar definido;
- la escena central permanece despejada.

### Corte B: productos configurables

- los productos vienen de la ronda real;
- cada producto muestra nombre y precio;
- cada modelo tiene posicion y escala configurables;
- ningun producto queda oculto o cortado.

### Corte C: seleccion y canasta

- tocar agrega;
- tocar de nuevo retira;
- la animacion termina limpiamente;
- mochila y total representan el mismo estado.

### Corte D: validacion y correccion

- se puede fallar;
- se explica como corregir;
- comprar no duplica eventos;
- reiniciar no cierra la sesion.

### Corte E: integracion real

- conserva inicio, eventos y finalizacion existentes;
- respeta niveles asignados;
- no muestra resultado antes de tiempo;
- no bloquea la UI mientras sincroniza.

## 21. Criterios de aceptacion de la Pantalla 1

- parece un mercado y no una pantalla administrativa;
- la mision se entiende en cinco segundos;
- los productos son protagonistas y reconocibles;
- no existe ruido visual innecesario;
- la accion `Comprar` domina;
- el estudiante puede fallar y corregir;
- la canasta y el total responden inmediatamente;
- no existe dependencia de AR o camara;
- no existe logica de backend dentro del juego;
- no se rompe el flujo real de sesiones;
- la pantalla funciona en paisaje respetando safe areas;
- el codigo queda dividido por responsabilidad.

## 22. Regla final

La nueva presentacion no debe heredar decisiones visuales anteriores.

Se conserva el conocimiento funcional del producto, no su apariencia.

Primero claridad. Luego interaccion. Luego belleza. Finalmente celebracion.
