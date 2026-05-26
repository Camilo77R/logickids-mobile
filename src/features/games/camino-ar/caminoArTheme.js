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
    primario: '#FFB703',
    primarioTexto: '#14314F',
    secundario: '#43C8FF',
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
    { fondo: 'rgba(78,200,255,0.22)', borde: 'rgba(78,200,255,0.28)' },
    { fondo: 'rgba(62,217,168,0.22)', borde: 'rgba(62,217,168,0.28)' },
    { fondo: 'rgba(255,216,107,0.28)', borde: 'rgba(255,216,107,0.30)' },
    { fondo: 'rgba(255,125,142,0.22)', borde: 'rgba(255,125,142,0.28)' },
    { fondo: 'rgba(140,121,255,0.20)', borde: 'rgba(140,121,255,0.26)' },
    { fondo: 'rgba(255,172,74,0.24)', borde: 'rgba(255,172,74,0.30)' },
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
