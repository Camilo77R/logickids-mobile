const crearDimensiones = (ancho, alto) => Object.freeze({ ancho, alto });

export const FORMATOS_RASTER_SESION_FINAL = Object.freeze({
  pngOpaco: Object.freeze({
    extension: 'png',
    mimeType: 'image/png',
    transparencia: false,
  }),
  pngTransparente: Object.freeze({
    extension: 'png',
    mimeType: 'image/png',
    transparencia: true,
  }),
  pngSpriteSheet: Object.freeze({
    extension: 'png',
    mimeType: 'image/png',
    transparencia: true,
    estructura: 'sprite-sheet',
  }),
});

const CONFIGURACION_RASTER = Object.freeze({
  fondo: Object.freeze({
    rol: 'Fondo completo de la pantalla final.',
    dimensiones: crearDimensiones(1672, 941),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngOpaco,
  }),
  banner: Object.freeze({
    rol: 'Marco superior para alojar el titulo dinamico.',
    dimensiones: crearDimensiones(1200, 180),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  tarjetaJugador: Object.freeze({
    rol: 'Marco del jugador; nombre, nivel y avatar permanecen dinamicos.',
    dimensiones: crearDimensiones(320, 380),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  diploma: Object.freeze({
    rol: 'Reconocimiento decorativo independiente del texto dinamico.',
    dimensiones: crearDimensiones(480, 276),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  trofeo: Object.freeze({
    rol: 'Trofeo principal sin nivel ni texto incrustado.',
    dimensiones: crearDimensiones(600, 520),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  estrellaActiva: Object.freeze({
    rol: 'Estado visual de estrella obtenida.',
    dimensiones: crearDimensiones(240, 240),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  estrellaInactiva: Object.freeze({
    rol: 'Estado visual de estrella aun no obtenida.',
    dimensiones: crearDimensiones(240, 240),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  panelResumen: Object.freeze({
    rol: 'Contenedor del resumen; cifras, etiquetas e iconos permanecen dinamicos.',
    dimensiones: crearDimensiones(1040, 260),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  globo: Object.freeze({
    rol: 'Globo para mensaje y estado de sincronizacion dinamicos.',
    dimensiones: crearDimensiones(760, 180),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  botonHistorial: Object.freeze({
    rol: 'Fondo del boton historial sin icono ni etiqueta incrustados.',
    dimensiones: crearDimensiones(420, 104),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  botonTablero: Object.freeze({
    rol: 'Fondo del boton tablero sin iconos ni etiqueta incrustados.',
    dimensiones: crearDimensiones(520, 120),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  icono: Object.freeze({
    rol: 'Icono semantico reutilizable sin texto incrustado.',
    dimensiones: crearDimensiones(128, 128),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  efectoEstatico: Object.freeze({
    rol: 'Capa decorativa aislada para animacion independiente.',
    dimensiones: crearDimensiones(512, 512),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngTransparente,
  }),
  efectoAnimado: Object.freeze({
    rol: 'Sprite sheet para reproducir un efecto sin acoplarlo a otras capas.',
    dimensiones: crearDimensiones(1024, 1024),
    formatoRecomendado: FORMATOS_RASTER_SESION_FINAL.pngSpriteSheet,
  }),
});

const ESTADOS_ASSET_RASTER = Object.freeze({
  APROBADO: 'aprobado',
  PENDIENTE: 'pendiente',
  DESCARTADO: 'descartado',
});

const crearEntradaRaster = (
  configuracion,
  source = null,
  estado = source ? ESTADOS_ASSET_RASTER.APROBADO : ESTADOS_ASSET_RASTER.PENDIENTE,
) =>
  Object.freeze({
    source,
    disponible: source !== null,
    estado,
    configuracion,
  });

const crearIconoPendiente = () => crearEntradaRaster(CONFIGURACION_RASTER.icono);
const crearEfectoEstaticoPendiente = () =>
  crearEntradaRaster(CONFIGURACION_RASTER.efectoEstatico);

export const MERCADO_SESION_FINAL_RASTER_MANIFEST = Object.freeze({
  capas: Object.freeze({
    fondo: crearEntradaRaster(CONFIGURACION_RASTER.fondo),
    banner: crearEntradaRaster(
      CONFIGURACION_RASTER.banner,
      require('../../../../../../assets/images/mercado-inteligente/session-final/banners/session-final-banner-premium.png'),
    ),
    tarjetaJugador: crearEntradaRaster(
      CONFIGURACION_RASTER.tarjetaJugador,
      require('../../../../../../assets/images/mercado-inteligente/session-final/characters/session-final-player-card-premium.png'),
    ),
    diploma: crearEntradaRaster(
      CONFIGURACION_RASTER.diploma,
      require('../../../../../../assets/images/mercado-inteligente/session-final/characters/session-final-diploma-premium.png'),
    ),
    trofeo: crearEntradaRaster(
      CONFIGURACION_RASTER.trofeo,
      require('../../../../../../assets/images/mercado-inteligente/session-final/awards/session-final-trophy-premium.png'),
    ),
    estrellaActiva: crearEntradaRaster(
      CONFIGURACION_RASTER.estrellaActiva,
      require('../../../../../../assets/images/mercado-inteligente/session-final/stars/session-final-star-active-premium.png'),
    ),
    estrellaInactiva: crearEntradaRaster(
      CONFIGURACION_RASTER.estrellaInactiva,
      require('../../../../../../assets/images/mercado-inteligente/session-final/stars/session-final-star-inactive-premium.png'),
    ),
    panelResumen: crearEntradaRaster(
      CONFIGURACION_RASTER.panelResumen,
      require('../../../../../../assets/images/mercado-inteligente/session-final/panels/session-final-summary-card-premium.png'),
    ),
    globo: crearEntradaRaster(
      CONFIGURACION_RASTER.globo,
      require('../../../../../../assets/images/mercado-inteligente/session-final/panels/session-final-message-bubble-premium.png'),
    ),
    botonHistorial: crearEntradaRaster(
      CONFIGURACION_RASTER.botonHistorial,
      require('../../../../../../assets/images/mercado-inteligente/session-final/buttons/session-final-history-button-premium.png'),
    ),
    botonTablero: crearEntradaRaster(
      CONFIGURACION_RASTER.botonTablero,
      require('../../../../../../assets/images/mercado-inteligente/session-final/buttons/session-final-return-button-premium.png'),
    ),
  }),
  iconos: Object.freeze({
    checkResumen: crearEntradaRaster(
      CONFIGURACION_RASTER.icono,
      require('../../../../../../assets/images/mercado-inteligente/session-final/icons/session-final-check-premium.png'),
    ),
    estrellaResumen: crearEntradaRaster(
      CONFIGURACION_RASTER.icono,
      require('../../../../../../assets/images/mercado-inteligente/session-final/stars/session-final-star-active-premium.png'),
    ),
    historial: crearEntradaRaster(
      CONFIGURACION_RASTER.icono,
      require('../../../../../../assets/images/mercado-inteligente/session-final/icons/session-final-history-premium.png'),
    ),
    tablero: crearEntradaRaster(
      CONFIGURACION_RASTER.icono,
      require('../../../../../../assets/images/mercado-inteligente/session-final/icons/session-final-home-premium.png'),
    ),
    trofeoMini: crearEntradaRaster(
      CONFIGURACION_RASTER.icono,
      require('../../../../../../assets/images/mercado-inteligente/session-final/icons/session-final-trophy-mini-premium.png'),
    ),
  }),
  efectos: Object.freeze({
    confeti: crearEntradaRaster(
      CONFIGURACION_RASTER.efectoEstatico,
      require('../../../../../../assets/images/mercado-inteligente/session-final/effects/session-final-confetti-premium-overlay.png'),
    ),
    brilloTrofeo: crearEfectoEstaticoPendiente(),
    destelloEstrella: crearEfectoEstaticoPendiente(),
  })
});


