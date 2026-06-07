# Robot Lab — Guía de Operación para Exposición

Documento de referencia rápida para el operador del stand. Cubre arranque, control de la demo, ajustes en caliente y resolución de problemas frecuentes.

---

## 1. Arranque rápido (5 min antes de abrir)

### 1.1 Servidor de desarrollo

```powershell
cd D:\menu_juegos\juego-logica
bun dev
```

- Puerto: **2502**
- Host: `0.0.0.0` (accesible desde la red local del stand)
- Banner: muestra URL local + URL de túnel SSH si está activo

Verificar que compila sin errores: la última línea debe decir `ready in XXXms`.

### 1.2 Túnel HTTPS para móviles (QR)

El hand-tracking con MediaPipe **requiere HTTPS** (getUserMedia no funciona en HTTP fuera de localhost). Abre una segunda terminal PowerShell:

```powershell
ssh -R 80:localhost:2502 nokey@localhost.run
```

Aparece una URL tipo `https://xxxx.lhr.life` y un **código QR en la terminal**. Cualquier niño con la cámara del móvil puede escanearlo y entrar directamente al Robot Lab.

> El túnel muere si se cierra la terminal. Relanzarlo entre tandas si es necesario.

### 1.3 Verificación pre-apertura

Checklist antes de que llegue el primer visitante:

- [ ] Navegador de la pantalla principal abierto en `http://localhost:2502`
- [ ] Permiso de cámara concedido en el navegador (ícono de candado en la barra de URL)
- [ ] Mano del operador visible en el canvas con el esqueleto MediaPipe
- [ ] QR impreso o visible en la pantalla del stand
- [ ] Volumen de audio al 60-70% (los efectos son parte de la experiencia)
- [ ] Modo de pantalla completa (F11) si el stand lo requiere

---

## 2. Flujo de la demo (~2-3 min por visitante)

### 2.1 Pantalla de inicio

- Logo **Robot Lab** centrado
- Botón **COMENZAR** (o gesto de palma abierta si la mano ya está detectada)
- Tiempo de espera típico: el visitante mira la animación 2-5s antes de tocar

### 2.2 Introducción cinemática

- Vídeo/animación de Mark VI en el taller (~8s)
- Narra la misión: "Tu Mark VI necesita 6 piezas. ¿Puedes ensamblarlo?"
- Botón **ENSAMBLAR** al final

### 2.3 Minijuego de ensamblaje (núcleo)

**Objetivo:** colocar las 6 piezas en el orden correcto.

**Controles:**

| Gesto | Acción |
|-------|--------|
| Pellizco (índice + pulgar) | Agarrar pieza bajo la mano |
| Mano abierta moviéndose | Mover pieza agarrada |
| Soltar pellizco | Soltar pieza (snap automático si está cerca) |
| Ratón click + drag | Alternativa con ratón (modo fallback) |

**Feedback visual clave (para explicar al visitante):**

- **Aro verde** en el slot = "aquí va la pieza"
- **Resplandor blanco** en pieza = "puedes agarrarla"
- **Anillo de cuenta atrás** amarillo→verde = "suelta ya, va a encajar"
- **Rebote elástico** + flash + sonido = ¡correcto!
- **Sacudida** + flash rojo + sonido grave = pieza equivocada, inténtalo de nuevo

**Misiones disponibles (4):**

1. **Mark VI básico** — 6 piezas, orden estándar cabeza→pecho→brazos→piernas
2. **Mark VI con armas** — añade repulsores y botas
3. **Reparación de emergencia** — piezas dañadas que parpadean en rojo
4. **Modo libre** — sin orden, encaja donde quieras

### 2.4 Cierre y retorno

- Overlay **¡MISIÓN CUMPLIDA!** con confeti
- Sonido de victoria
- Botón **CONTINUAR** → vuelve al menú principal en 800ms
- Listo para el siguiente visitante

---

## 3. Ajustes en caliente (sin reiniciar)

### 3.1 Volumen y mute

`F1` en la página de juego: panel de debug con sliders de volumen por efecto (grab, snap, error, victory).

### 3.2 Cambiar la dificultad

`F2` en la página de juego: panel de misiones. Selecciona la misión activa. Se aplica al instante.

### 3.3 Calibrar la cámara del operador

Si el esqueleto MediaPipe salta o se pierde:

1. `F3` → panel de cámara
2. Verificar iluminación: el operador debe tener luz frontal (no contraluz)
3. Ajustar `confidence` si la mano no se detecta: bajar a 0.5 en condiciones de poca luz
4. Si la cámara pierde la mano, la pieza se **suelta automáticamente** (no se queda flotando)

### 3.4 Saltar la cinemática

`Escape` durante la intro → salta directamente al minijuego. Útil para demos rápidas a periodistas.

### 3.5 Reset total

`Ctrl+R` en la página → recarga el módulo del workshop. Más rápido que recargar la página entera.

---

## 4. Resolución de problemas

### 4.1 "La cámara no se activa"

- **HTTPS requerido**: si el visitante escaneó el QR y entra por `http://`, rechazar (la cámara no se concede). Verificar que el túnel SSH está activo.
- **Permiso denegado**: el visitante debe tocar el ícono de candado en la barra de URL del móvil y permitir la cámara.
- **Cámara ocupada por otra app**: cerrar Zoom, Meet, etc. en el móvil.

### 4.2 "Las piezas no se agarran"

- **Mano fuera de cuadro**: verificar que la mano está visible en el canvas
- **Pellizco mal detectado**: pellizco = punta del índice + punta del pulgar **juntas** (distancia < 30px en pantalla). No vale "mano cerrada".
- **Pellizco mal detectado en guantes oscuros**: MediaPipe funciona mejor con manos descubiertas y buena luz.

### 4.3 "El sonido no se reproduce"

- Los navegadores requieren **interacción del usuario** antes de permitir audio. El primer click/toque del visitante desbloquea el audio.
- Verificar volumen del sistema del operador.
- Verificar volumen del dispositivo móvil del visitante (los efectos son sutiles).

### 4.4 "La pieza se queda flotando"

- Si la mano se pierde de cuadro, la pieza se suelta automáticamente. Si no se suelta, es un bug: reportar con screenshot.
- Workaround: hacer un pellizco "fantasma" en el aire (juntar índice y pulgar lejos de la pieza) → fuerza el release.

### 4.5 "El QR no carga en el móvil"

- Verificar que el túnel SSH está activo (la terminal debe seguir abierta con el mensaje de localhost.run)
- Si el túnel expiró: relanzar `ssh -R 80:localhost:2502 nokey@localhost.run`
- Alternativa: el visitante puede entrar por la URL del túnel directamente (sin QR)

### 4.6 "El navegador se congela"

- F11 salir de pantalla completa → Ctrl+Shift+R recarga forzada
- Si persiste: abrir DevTools (F12) → pestaña Console → copiar errores → reportar
- La página tiene watchdog de 30s: si el frame loop se cuelga, se reinicia automáticamente

---

## 5. Métricas de la demo (qué observar)

Durante la exposición, anota estas métricas para el reporte post-evento:

| Métrica | Cómo medirla |
|---------|--------------|
| Tiempo medio de misión | Cronometrar desde "ENSAMBLAR" hasta "MISIÓN CUMPLIDA" |
| Tasa de abandono | Cuántos visitantes sueltan la mano y se van antes de terminar |
| Pieza más difícil | Cuál genera más "shake" (sacudida de error) — mirar logs F1 |
| Error más común | Visitante mete pieza 3 antes que pieza 2, etc. |
| Uso de móvil vs pantalla | % de visitantes que escanean QR vs usan la pantalla principal |

---

## 6. Contacto y escalation

Si algo no funciona y no está en esta guía:

1. Anotar: qué pasó, qué visitante hacía, screenshot si es posible
2. Revisar `docs/DESIGN-IRON-MAN-WORKSHOP.md` para entender la arquitectura
3. Revisar `docs/MISSIONS.md` para entender la lógica de misiones
4. Si es bug crítico: `git log --oneline -20` para ver el último cambio

---

## 7. Resumen de hotkeys

| Tecla | Acción |
|-------|--------|
| `F1` | Panel de audio (volumen por efecto) |
| `F2` | Selector de misión activa |
| `F3` | Panel de cámara MediaPipe |
| `F11` | Pantalla completa |
| `Esc` | Saltar cinemática |
| `Ctrl+R` | Recargar módulo workshop |
| `Ctrl+Shift+R` | Recarga forzada del navegador |

---

**Última actualización:** 2026-06-05
**Versión del juego:** Robot Lab v1.0 (exposición)
**Puerto dev:** 2502
**Stack:** Babylon.js + MediaPipe + Vite + GSAP
