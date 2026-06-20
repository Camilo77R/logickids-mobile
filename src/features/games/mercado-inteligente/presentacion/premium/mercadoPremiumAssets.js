export const prepararAssetsMercadoPremium = async ({
  productos,
}) => {
  const productosPreparados = productos.map((producto) => [producto.id, []]);

  return {
    productos: Object.fromEntries(productosPreparados),
    escena: {},
    sesionFinal: { capas: {}, iconos: {}, efectos: {} },
  };
};
