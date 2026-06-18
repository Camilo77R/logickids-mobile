# Mercado Inteligente - Session Final Asset Kit

Kit raster por familias para la pantalla final del juego.

## Referencia oficial

La pantalla 3 aprobada por señor Camilo queda guardada como fuente visual principal:

- `sources/session-final-screen3-reference-original.jpeg`
- `sources/session-final-screen3-reference-official.png`
- `sources/session-final-screen3-reference-official.webp`
- `sources/session-final-screen3-reference.meta.json`

Esta referencia es el estandar visual para comparar proporciones, colores, composicion, banner, trofeo, estrellas, diploma, botones y paneles.

## Regla

- Los textos, nombres, estrellas, estadisticas y estados siguen siendo dinamicos.
- Los assets son actores visuales independientes para animacion y composicion.
- No se agregan SVG falsos como arte final en runtime.
- Si llega una fuente oficial mejor, se reemplazan los archivos `sources/session-final-screen3-reference-*` y se regenera el kit.

## Familias

- backgrounds/
- banners/
- characters/
- awards/
- stars/
- panels/
- buttons/
- icons/
- effects/
- sources/

## Generar

```bash
node scripts/generate-mercado-session-final-approved-assets.cjs
```
