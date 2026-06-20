export const debePosponerRenderSesionFinalMercado = (estadoUi = {}) =>
  estadoUi.screen === 'session-result' &&
  estadoUi.sessionResult?.primaryVisible === false;
