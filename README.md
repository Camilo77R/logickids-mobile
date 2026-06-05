# LogicKids Mobile 

Este repositorio contiene el código fuente de la aplicación móvil de **LogicKids**, desarrollada utilizando **React Native** y el framework **Expo**. 

La aplicación integra de forma nativa un motor de renderizado 3D (**Babylon.js**) utilizando una arquitectura basada en `WebView`, lo que permite un rendimiento óptimo y multiplataforma sin depender de compilaciones pesadas de C++.

##  Cómo ejecutar el proyecto (Para revisión)

### Nota importante sobre Camino AR

La parte de `Camino AR` usa `@reactvision/react-viro`, por lo tanto:

- **no funciona con Expo Go**
- debe abrirse con **development build / dev client**

Si la revision incluye `Camino AR`, sigue esta guia y no la de Expo Go.

### 1. Requisitos previos
* Asegúrate de tener instalado **Node.js** en tu computadora.
* Tener disponible un **development build** de la app en el celular.

### 2. Instalacion
Abre una terminal en la carpeta raíz del proyecto y ejecuta el siguiente comando para instalar todas las dependencias de React Native:
```bash
npm install
```

### 3. Ejecutar el servidor local
Una vez instaladas las dependencias, inicia el servidor de desarrollo de Expo ejecutando:
```bash
npx expo start -c
```
*(Nota: El flag `-c` limpia la caché para asegurar que no haya errores residuales).*

### 4. Ver la app en tu celular
1. La terminal mostrará un **Código QR**.
2. Abre el **dev client** de la app en tu celular.
3. Escanea el código de la terminal o abre el proyecto desde el dev client.
4. La aplicación cargará el código fuente por Wi-Fi de forma inalámbrica.

### 5. Playtest de Camino AR

Para una prueba funcional de `Camino AR`, revisar:

- [docs/PLAYTEST_CAMINO_AR.md](./docs/PLAYTEST_CAMINO_AR.md)

---

## 🏗️ Arquitectura y Estructura

El código está estructurado bajo los principios de **Clean Code** y separación de responsabilidades:

* `App.js`: Punto de entrada de la aplicación.
* `src/screens/DashboardScreen.jsx`: Contiene toda la interfaz visual y botones.
* `src/features/games/BabylonBasicScene.jsx`: Contiene la lógica del motor tridimensional Babylon.js, inyectado de forma asíncrona.
