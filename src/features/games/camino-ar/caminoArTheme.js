export const caminoArTheme = Object.freeze({
  paneles: {
    mision: 'rgba(255, 250, 238, 0.96)',
    misionBorde: 'rgba(255, 182, 107, 0.34)',
    acciones: 'transparent',
    accionesBorde: 'transparent',
    resultado: 'rgba(255, 249, 240, 0.98)',
    resultadoBorde: 'rgba(255, 169, 89, 0.26)',
    tarjetaSuave: 'rgba(255,255,255,0.58)',
    tarjetaSuaveBorde: 'rgba(15, 60, 92, 0.12)',
  },
  tintas: {
    oscuro: '#14314F',
    medio: '#31516D',
    suave: '#5A7691',
    crema: '#FFF8E8',
    rosa: '#FF7D8E',
    aqua: '#4EC8FF',
    menta: '#3ED9A8',
    sol: '#FFD86B',
    uva: '#8C79FF',
    naranja: '#FFAC4A',
  },
  botones: {
    primario: '#8E35D5',
    primarioTexto: '#FFFFFF',
    secundario: '#FFBF1F',
    secundarioTexto: '#FFFFFF',
    terciario: '#FFFFFF',
    terciarioTexto: '#31516D',
  },
  insignias: {
    explora: '#8C79FF',
    mira: '#FFAC4A',
    turno: '#FF7D8E',
    listo: '#3ED9A8',
    resultado: '#FF9F5A',
  },
  metricas: [
    { fondo: '#B25AF6', borde: '#6E22B5', texto: '#FFFFFF', subtitulo: '#F7EAFF' },
    { fondo: '#FFC21A', borde: '#D68C00', texto: '#3B220F', subtitulo: '#6A4300' },
    { fondo: '#29C67A', borde: '#188B53', texto: '#FFFFFF', subtitulo: '#E8FFF3' },
    { fondo: '#B25AF6', borde: '#6E22B5', texto: '#FFFFFF', subtitulo: '#F7EAFF' },
    { fondo: '#FFC21A', borde: '#D68C00', texto: '#3B220F', subtitulo: '#6A4300' },
    { fondo: '#29C67A', borde: '#188B53', texto: '#FFFFFF', subtitulo: '#E8FFF3' },
  ],
});

export const resolverColorInsigniaCaminoAr = (badge) => {
  switch (badge) {
    case 'Explorando':
      return caminoArTheme.insignias.explora;
    case 'Mira':
      return caminoArTheme.insignias.mira;
    case 'Tu turno':
      return caminoArTheme.insignias.turno;
    case 'Listo':
      return caminoArTheme.insignias.listo;
    default:
      return caminoArTheme.insignias.resultado;
  }
};
