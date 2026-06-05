export const mercadoArTheme = Object.freeze({
  fondos: Object.freeze({
    cielo: '#FFF8EC',
    puesto: '#FFF1D8',
    toldo: '#FF9F43',
    mostrador: '#9B5A1A',
    sombra: 'rgba(77, 43, 11, 0.18)',
    cartel: '#FFF7E8',
  }),
  tintas: Object.freeze({
    titulo: '#6B3D00',
    cuerpo: '#7A5A2E',
    fuerte: '#4A2A00',
    crema: '#FFF8ED',
    exito: '#1D7A43',
    alerta: '#C24B1A',
  }),
  categorias: Object.freeze({
    frutas: Object.freeze({
      fondo: '#FFE6D8',
      borde: '#F49E58',
      tinta: '#8B3D00',
      techo: '#FF9258',
    }),
    verduras: Object.freeze({
      fondo: '#E5F6DC',
      borde: '#7BB661',
      tinta: '#2D5A1C',
      techo: '#78C850',
    }),
    lacteos: Object.freeze({
      fondo: '#E4F0FF',
      borde: '#73A7E8',
      tinta: '#1E4D7A',
      techo: '#79B7FF',
    }),
    panaderia: Object.freeze({
      fondo: '#FFF0D9',
      borde: '#DDA24F',
      tinta: '#7A4B08',
      techo: '#FFC76A',
    }),
  }),
  hud: Object.freeze({
    primario: '#E56B1F',
    secundario: '#FFF4DE',
    panel: '#FFFFFF',
    panelSuave: '#FFF8E8',
  }),
});

export const resolverTemaCategoriaMercado = (categoria) =>
  mercadoArTheme.categorias[categoria] ?? mercadoArTheme.categorias.panaderia;
