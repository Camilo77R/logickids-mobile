const crearModeloGlb = ({
  archivo,
  scale = [0.1, 0.1, 0.1],
  rotation = [0, 0, 0],
  positionOffset = [0, 0.075, 0],
}) =>
  Object.freeze({
    type: 'GLB',
    source: archivo,
    resources: [],
    scale,
    rotation,
    positionOffset,
  });

const MODELOS_PRODUCTOS_MERCADO = Object.freeze({
  manzana: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/apple.glb'),
    scale: [0.095, 0.095, 0.095],
    rotation: [0, 18, 0],
  }),
  banano: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/banana.glb'),
    scale: [0.105, 0.105, 0.105],
    rotation: [0, -28, -8],
  }),
  pera: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/pear.glb'),
    scale: [0.095, 0.095, 0.095],
    rotation: [0, 12, 0],
  }),
  zanahoria: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/carrot.glb'),
    scale: [0.1, 0.1, 0.1],
    rotation: [0, -18, 20],
  }),
  tomate: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/tomato.glb'),
    scale: [0.095, 0.095, 0.095],
    rotation: [0, 24, 0],
  }),
  lechuga: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/cabbage.glb'),
    scale: [0.1, 0.1, 0.1],
    rotation: [0, 10, 0],
  }),
  leche: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/carton-small.glb'),
    scale: [0.085, 0.085, 0.085],
    rotation: [0, -12, 0],
  }),
  yogur: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/carton.glb'),
    scale: [0.08, 0.08, 0.08],
    rotation: [0, 16, 0],
  }),
  queso: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/cheese.glb'),
    scale: [0.095, 0.095, 0.095],
    rotation: [0, 12, 0],
  }),
  pan: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/bread.glb'),
    scale: [0.1, 0.1, 0.1],
    rotation: [0, -14, 0],
  }),
  galleta: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/cookie-chocolate.glb'),
    scale: [0.1, 0.1, 0.1],
    rotation: [0, 12, 0],
  }),
  muffin: crearModeloGlb({
    archivo: require('../../../../assets/models/mercado-inteligente/kenney-food-kit/muffin.glb'),
    scale: [0.1, 0.1, 0.1],
    rotation: [0, -10, 0],
  }),
});

const MODELO_CANASTA = crearModeloGlb({
  archivo: require('../../../../assets/models/mercado-inteligente/kenney-mini-market/shopping-basket.glb'),
  scale: [0.12, 0.12, 0.12],
  rotation: [0, -18, 0],
  positionOffset: [0, 0.015, 0],
});

const MODELO_CARRITO = crearModeloGlb({
  archivo: require('../../../../assets/models/mercado-inteligente/kenney-mini-market/shopping-cart.glb'),
  scale: [0.1, 0.1, 0.1],
  rotation: [0, 18, 0],
  positionOffset: [0, 0.015, 0],
});

const MODELO_CAJA = crearModeloGlb({
  archivo: require('../../../../assets/models/mercado-inteligente/kenney-mini-market/cash-register.glb'),
  scale: [0.12, 0.12, 0.12],
  rotation: [0, -18, 0],
  positionOffset: [0, 0.02, 0],
});

export const MODELOS_DECORACION_MERCADO = Object.freeze({
  canasta: MODELO_CANASTA,
  carrito: MODELO_CARRITO,
  caja: MODELO_CAJA,
});

export const resolverModeloMercado = (producto) =>
  MODELOS_PRODUCTOS_MERCADO[producto?.id] ?? MODELOS_PRODUCTOS_MERCADO.galleta;
