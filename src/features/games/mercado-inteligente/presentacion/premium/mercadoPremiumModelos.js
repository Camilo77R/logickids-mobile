const crearAsset = (source, mimeType) =>
  Object.freeze({ source, mimeType });

export const MODELOS_ESCENA_MERCADO_PREMIUM = Object.freeze({
  escenario: crearAsset(
    require('../../../../../../assets/images/mercado-inteligente/escenario-mercado-premium.png'),
    'image/png',
  ),
});
