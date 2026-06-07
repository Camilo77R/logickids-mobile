# Mapa del Software: Arquitectura y Lógica de Juego de Lógica

Este documento contiene el plano detallado de la arquitectura de software del **Juego de Lógica** (`juego-logica`). Se detallan todos los archivos fuente que componen el núcleo del sistema, explicando el propósito de cada archivo, qué lógica implementa y cómo contribuye al funcionamiento global del juego interactivo 3D sin contacto.

---

## 1. Raíz de la Aplicación e Inicialización (`./src/`)

Estos archivos gestionan la carga inicial de los recursos y el flujo principal del ciclo de vida general.

| Archivo | Propósito General | Lógica e Implementación |
| :--- | :--- | :--- |
| **[main.js](file:///d:/menu_juegos/juego-logica/src/main.js)** | Punto de entrada del compilador. | Instancia el cargador raíz de la clase `App`, monta el canvas dentro del contenedor del DOM `#app` y dispara el método `.start()` de inicialización general. |
| **[app.js](file:///d:/menu_juegos/juego-logica/src/app.js)** | Director de orquesta global de la aplicación. | Gestiona las transiciones de estado de toda la app (inicio, carga, menú principal, juego activo). Contiene los event listeners globales de teclado (atajos de depuración, reinicios, escape de menú), controla el bucle de renderizado `requestAnimationFrame` y la actualización del contador de FPS. Configura el detector de gestos a `30Hz` para optimizar CPU. |

---

## 2. Subsistema de Interfaz de Usuario y HUDs (`./src/ui/`)

Estos archivos componen la interfaz web táctil tradicional, las alertas de depuración y las notificaciones adaptadas.

| Archivo | Propósito General | Lógica e Implementación |
| :--- | :--- | :--- |
| **[LandingPage.js](file:///d:/menu_juegos/juego-logica/src/ui/LandingPage.js)** | Menú inicial interactivo. | Genera una pantalla de selección premium mediante glassmorphism y destellos de fondo flotantes. Unifica la llamada en un gran botón táctil ("Comenzar la Batalla") que unifica el Taller Stark de Iron Man y la Misión del Corte Cósmico. |
| **[HintComponent.js](file:///d:/menu_juegos/juego-logica/src/ui/HintComponent.js)** | Guía dinámica de controles en pantalla. | Muestra paneles de ayuda flotantes adaptados según el juego activo. Explica las mecánicas en **español** de forma clara (ej. abrir palma para desarmar, pellizcar para rotar, o la mano derecha para sables). |
| **[ModeIndicator.js](file:///d:/menu_juegos/juego-logica/src/ui/ModeIndicator.js)** | Indicador de juego activo. | Añade un botón flotante con diseño de neón en la esquina superior que indica la misión en curso y permite retornar de manera segura al menú principal. |
| **[StatusIndicator.js](file:///d:/menu_juegos/juego-logica/src/ui/StatusIndicator.js)** | Monitoreo del MediaPipe. | Informa visualmente del estado de la cámara y del conteo de manos detectadas en tiempo real. |
| **[DebugComponent.js](file:///d:/menu_juegos/juego-logica/src/ui/DebugComponent.js)** | Consola de telemetría de rendimiento. | Renderiza métricas de bajo nivel para desarrolladores (FPS de renderizado 3D, manos activas, número de partículas en pantalla, estado de la GPU y consumo de memoria). |
| **[DeviceBanner.js](file:///d:/menu_juegos/juego-logica/src/ui/DeviceBanner.js)** | Validador de hardware. | Advierte al usuario sobre el uso recomendado de dispositivos móviles potentes o computadoras con webcam para un tracking a 60 FPS estables. |
| **[CameraPermissionBanner.js](file:///d:/menu_juegos/juego-logica/src/ui/CameraPermissionBanner.js)** | Gestor de consentimiento multimedia. | Guía al usuario en **español** sobre cómo permitir el acceso a su webcam en caso de bloqueo del navegador, ofreciendo instrucciones claras según el sistema operativo. |
| **[Footer.js](file:///d:/menu_juegos/juego-logica/src/ui/Footer.js)** | Cierre visual del contenedor. | Añade una línea Stark Industries en la parte inferior de la pantalla con botones integrados de retroceso. |

---

## 3. Motor Compartido de Seguimiento de Movimiento y Renderizado (`./src/shared/`)

Módulos compartidos para la detección ML (Machine Learning), procesamiento de imágenes y efectos de renderizado avanzados.

| Archivo | Propósito General | Lógica e Implementación |
| :--- | :--- | :--- |
| **[HandTracker.js](file:///d:/menu_juegos/juego-logica/src/shared/HandTracker.js)** | Interfaz con MediaPipe Tasks Vision. | Levanta el feed de la cámara web con restricciones ideales de resolución y cuadros. Descarga dinámicamente los pesos WASM de seguimiento desde la CDN de `jsDelivr` para un arranque inmediato (<2s). Implementa un patrón singleton para evitar la duplicación de buffers de memoria (OOM). |
| **[GestureDetector.js](file:///d:/menu_juegos/juego-logica/src/shared/GestureDetector.js)** | Clasificador de poses corporales. | Recibe las coordenadas de los 21 puntos clave de la mano. Calcula distancias euclidianas y ángulos angulares para identificar poses específicas: puño cerrado (fist), mano abierta (palm), pellizco (pinch) y señalamiento con índice (pointing). |
| **[GestureTypes.js](file:///d:/menu_juegos/juego-logica/src/shared/GestureTypes.js)** | Diccionario y constantes de gestos. | Define umbrales de sensibilidad y factores de tolerancia para la clasificación matemática de poses. |
| **[HandLandmarkOverlay.js](file:///d:/menu_juegos/juego-logica/src/shared/HandLandmarkOverlay.js)** | Capa canvas de depuración 2D. | Dibuja líneas fluorescentes conectando los nodos óseos sobre el feed de video del usuario para validar visualmente la detección. |
| **[HandTrailTracker.js](file:///d:/menu_juegos/juego-logica/src/shared/HandTrailTracker.js)** | Buffer temporal de estela. | Mantiene un registro de las últimas posiciones del dedo índice, calculando el vector de velocidad e inercia para los cortes. |
| **[HandTypes.js](file:///d:/menu_juegos/juego-logica/src/shared/HandTypes.js)** | Estructuras de datos de manos. | Define tipificaciones genéricas en JavaScript para estructurar los landmarks y polaridades de mano izquierda/derecha. |
| **[PostProcessingManager.js](file:///d:/menu_juegos/juego-logica/src/shared/PostProcessingManager.js)** | Pipeline de efectos especiales de pantalla. | Usa la librería `postprocessing` en un único buffer `HalfFloatType` de alta definición. Une un pase de Bloom SCREEN ultra radiante, aberración cromática en los bordes y aplica una **Tabla de Búsqueda 3D (3D LUT)** matemática creada dinámicamente para lograr una paleta cósmica en azul y púrpura. |
| **[RobotCustomization.js](file:///d:/menu_juegos/juego-logica/src/shared/RobotCustomization.js)** | Persistencia de preferencias estéticas. | Guarda y recupera los colores (neón, oro, metálicos) y el tipo de sable preferido del usuario utilizando `localStorage`. |

---

## 4. Componentes y Lógica de "Corte Cósmico" (`./src/cosmic-slash/`)

Este juego espacial procesa el rastreo de manos del jugador para generar sables láser y rebanar objetos.

| Archivo | Propósito General | Lógica e Implementación |
| :--- | :--- | :--- |
| **[CosmicSlashController.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/CosmicSlashController.js)** | Bucle de juego y máquina de estados. | Procesa el frame rate de los sables. Implementa el filtrado restrictivo que selecciona **únicamente la mano derecha física** (o en su defecto, la mano más cercana al extremo derecho de la pantalla) para evitar saltos o sables dobles indeseados. Controla oleadas de enemigos, la batalla final del jefe y despliega el HUD. |
| **[PowLaserEffect.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/PowLaserEffect.js)** | Render del sable de luz volumétrico. | Genera un grupo de cilindros concéntricos animados por un shader personalizado de ruido y plasma de energía con colores aditivos que simulan un sable de luz denso e inestable. |
| **[CosmicObject.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/CosmicObject.js)** | Anomalías gravitacionales rebanables. | Modela los asteroides, esferas de energía y cápsulas espaciales que caen. Si se detecta un corte, **rebana físicamente la geometría** (BufferGeometry) en dos piezas separadas que caen de forma independiente con inercia rotacional y fuerzas gravitacionales. |
| **[CollisionDetector.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/CollisionDetector.js)** | Algoritmos de colisión 3D. | Calcula la distancia mínima en el espacio euclidiano de 3D entre el rayo infinito del sable del jugador y las esferas de colisión (Bounding Spheres) de los asteroides activos. |
| **[SliceEffect.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/SliceEffect.js)** | Partículas y chispas de impacto. | Dispara ráfagas de chispas en la dirección del corte del sable, coloreadas según la anomalía impactada. |
| **[ScoreManager.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/ScoreManager.js)** | Motor de puntuación y multiplicadores. | Lleva el conteo de cortes exitosos y calcula combos rápidos incrementando la puntuación exponencialmente. |
| **[ScoreHud.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/ScoreHud.js)** | Marcador de puntaje de neón. | Pinta el puntaje y multiplicadores en pantalla usando un diseño futurista de neón. |
| **[BossWarningOverlay.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/BossWarningOverlay.js)** | Alerta de jefe en camino. | Muestra un aviso de emergencia parpadeante en rojo ("ADVERTENCIA: ANOMALÍA MASIVA") con efectos de sonido de sirena Stark. |
| **[BossHud.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/BossHud.js)** | HUD de vida del jefe. | Dibuja una barra de escudo de energía holográfica roja que disminuye al rebanar los proyectiles del jefe. |
| **[LevelUpOverlay.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/LevelUpOverlay.js)** | Transiciones de oleada. | Congela la pantalla en momentos épicos para mostrar de forma animada el cambio de oleada con textos motivacionales en español. |
| **[PowHud.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/PowHud.js)** | Barra de poder acumulado. | Representa el nivel de carga acumulado del reactor de arco para desatar el ultra láser. |
| **[ScreenFlashEffect.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/ScreenFlashEffect.js)** | Retroalimentación de daño. | Agita la cámara web y tiñe la pantalla con destellos cromáticos cuando un asteroide impacta la zona defensiva del jugador. |
| **[CosmicBackground.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/CosmicBackground.js)** | Espacio exterior procedural. | Dibuja el fondo de estrellas y nebulosas móviles para dar una sensación de velocidad. |
| **[CosmicEnvironment.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/CosmicEnvironment.js)** | Luces de la escena cósmica. | Administra los tonos de iluminación espacial fría (cyans y magentas) que tiñen la escena cósmica. |
| **[CosmicAssetLibrary.js](file:///d:/menu_juegos/juego-logica/src/cosmic-slash/CosmicAssetLibrary.js)** | Cargador de audio y texturas. | Administra los zumbidos del sable, los estallidos de rocas y las pistas musicales ambientales mediante Howler.js. |

---

## 5. Componentes y Lógica del "Taller de Iron Man" (`./src/iron-man-workshop/`)

Módulo holográfico interactivo que permite ensamblar la armadura MK-VI de Iron Man mediante gestos.

| Archivo | Propósito General | Lógica e Implementación |
| :--- | :--- | :--- |
| **[WorkshopController.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/WorkshopController.js)** | Cerebro del taller Stark. | Inicializa la escena holográfica. Coordina el arranque cinematográfico (cinematics de ensamblado inicial de piezas + validación por escáner láser + fade-in de anillos auxiliares). Interpreta la mano izquierda (abrir palma = desarmado; cerrar puño = armado completo) y los pellizcos de la derecha para rotar la armadura. |
| **[MarkVIModel.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/components/MarkVIModel.js)** | Cargador del asset 3D. | Importa asíncronamente el archivo binario GLTF `mark-vi-schematic.glb`. Recorre sus materiales y los reemplaza dinámicamente con un Shader Material holográfico para conservar alto rendimiento. |
| **[ExplodedViewManager.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/components/ExplodedViewManager.js)** | Gestor de explosión tridimensional. | Calcula las matrices de traslación espacial para separar cada parte de la armadura (cabeza, torso, extremidades) hacia vectores externos en base a una interpolación suave (GSAP). |
| **[ParticleTrailEmitter.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/components/ParticleTrailEmitter.js)** | Emisor de estelas de energía. | Genera un sistema de partículas de neón cian que persigue físicamente a cada extremidad de la armadura cuando esta se separa o se ensambla, logrando un efecto visual espectacular. |
| **[PartInfoPanel.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/components/PartInfoPanel.js)** | Cartel holográfico de información. | Pinta un panel flotante en 3D (billboard) al lado de la pieza que el jugador apunte con su índice derecho, detallando en **español** el estado táctico e ingeniería de dicha pieza (ej. "Estabilizadores de Vuelo repulsores", "Reactor de Arco MK-VI"). |
| **[WorkshopRings.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/components/WorkshopRings.js)** | Anillos holográficos de soporte. | Dibuja círculos geométricos concéntricos giratorios alrededor de la base del Mark VI que cambian de color según el estado del taller. |
| **[WorkshopPanels.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/components/WorkshopPanels.js)** | Pantallas de telemetría flotantes. | Ubica tarjetas transparentes texturizadas con rejillas y valores de sensores Stark a los lados del escenario. |
| **[WorkshopGrid.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/components/WorkshopGrid.js)** | Cuadrícula holográfica de base. | Renderiza una malla infinita 3D fluorescente sobre el suelo virtual de la escena. |
| **[LoadingOverlay.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/components/LoadingOverlay.js)** | Pantalla de encendido de la IA. | Bloquea la entrada durante la carga de modelos, mostrando un cargador Stark en **español** ("INICIALIZANDO PROTOCOLO MK-VI"). |
| **[WorkshopMaterial.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/materials/WorkshopMaterial.js)** | Shader GLSL holográfico a medida. | Vertex y Fragment shader personalizados que generan el efecto holográfico premium: efectos de rejillas lineales (scanlines), resplandores de neón en los bordes de la silueta (fresnel) y la simulación del haz de escáner láser verde vertical. |
| **[WorkshopAudioManager.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/audio/WorkshopAudioManager.js)** | Orquestador de sonido 3D. | Administra los disparos de repulsor, silbidos de piezas voladoras y zumbidos mecánicos tridimensionales que se atenúan de acuerdo a la rotación de la cámara. |
| **[ThreeAudioManager.js](file:///d:/menu_juegos/juego-logica/src/iron-man-workshop/audio/ThreeAudioManager.js)** | Driver de bajo nivel para audio espacial. | Inicializa los oyentes auditivos (AudioListener) y los emisores de sonido posicionales (PositionalAudio) en el motor Three.js. |

---

## 6. Módulos Utilitarios de Soporte (`./src/utils/`)

Algoritmos matemáticos y procesamiento de señales esenciales para refinar la interacción táctil.

| Archivo | Propósito General | Lógica e Implementación |
| :--- | :--- | :--- |
| **[math.js](file:///d:/menu_juegos/juego-logica/src/utils/math.js)** | Matemáticas vectoriales. | Contiene algoritmos para calcular el ángulo de giro (roll/twist) de una mano basándose en la inclinación del vector muñeca-dedos. Realiza interpolaciones no lineales. |
| **[smoothing.js](file:///d:/menu_juegos/juego-logica/src/utils/smoothing.js)** | Filtro One Euro para eliminar vibraciones. | Implementa un **Filtro de Señal One Euro** adaptativo de bajo retraso. Utiliza filtros paso bajo cuya frecuencia de corte cambia dinámicamente según la velocidad de la mano. Si la mano se mueve lento, suaviza al máximo la señal (eliminando el temblor natural de la cámara física). Si la mano se mueve rápido, reduce el filtro a cero para no introducir retraso (lag) de respuesta. |
