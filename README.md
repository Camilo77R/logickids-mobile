# LogicKids Mobile 

Este repositorio contiene el código fuente de la aplicación móvil de **LogicKids**, desarrollada utilizando **React Native** y el framework **Expo**. 

La aplicación integra de forma nativa un motor de renderizado 3D (**Babylon.js**) utilizando una arquitectura basada en `WebView`, lo que permite un rendimiento óptimo y multiplataforma sin depender de compilaciones pesadas de C++.

##  Cómo ejecutar el proyecto (Para Revisión)

Para probar la aplicación en tu propio dispositivo móvil (Android o iOS), sigue estos 3 sencillos pasos:

### 1. Requisitos Previos
* Asegúrate de tener instalado **Node.js** en tu computadora.
* Descarga la aplicación **"Expo Go"** en tu celular desde la Google Play Store (Android) o la App Store (iOS).

### 2. Instalación
Abre una terminal en la carpeta raíz del proyecto y ejecuta el siguiente comando para instalar todas las dependencias de React Native:
```bash
npm install
```

### 3. Ejecutar el Servidor Local
Una vez instaladas las dependencias, inicia el servidor de desarrollo de Expo ejecutando:
```bash
npx expo start -c
```
*(Nota: El flag `-c` limpia la caché para asegurar que no haya errores residuales).*

### 4. Ver la App en tu Celular
1. La terminal mostrará un **Código QR**.
2. Abre la aplicación **Expo Go** en tu celular.
3. Presiona **"Scan QR Code"** (o usa la cámara de tu iPhone) y escanea el código de la terminal.
4. La aplicación cargará el código fuente por Wi-Fi de forma inalámbrica.

---

## 🏗️ Arquitectura y Estructura

El código está estructurado bajo los principios de **Clean Code** y separación de responsabilidades:

* `App.js`: Punto de entrada de la aplicación.
* `src/screens/DashboardScreen.jsx`: Contiene toda la interfaz visual y botones.
* `src/features/games/BabylonBasicScene.jsx`: Contiene la lógica del motor tridimensional Babylon.js, inyectado de forma asíncrona.
