# LogicKids Mobile

Aplicacion movil de LogicKids desarrollada con React Native y Expo.

## Ejecutar como APK

Esta app no esta pensada para probarse en Expo Go cuando se necesita validar el flujo real de instalacion. Para Android se debe generar una APK con EAS Build e instalarla en el dispositivo.

### 1. Requisitos

- Node.js instalado.
- Dependencias instaladas con `npm install`.
- Sesion iniciada en Expo/EAS con `npx eas-cli login`.
- Un backend accesible desde el celular, por ejemplo una URL HTTPS publicada o la IP de tu computador en la misma red.

### 2. Configurar backend para la APK

La APK no puede usar `localhost` para llamar al backend, porque en el celular `localhost` es el propio telefono.

Antes de compilar, define la variable:

```powershell
$env:EXPO_PUBLIC_API_URL="https://tu-dominio.com/api"
```

Para pruebas en red local, usa la IP del computador:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.50:3000/api"
```

### 3. Generar APK

```powershell
npm run build:apk
```

EAS entregara un enlace para descargar la APK. Descargala en el celular e instalala.

## Desarrollo local opcional

Para trabajar durante desarrollo todavia puedes usar Metro:

```powershell
npm run dev:8082
```

Ese modo sirve para desarrollo, pero no reemplaza la prueba final con APK.
