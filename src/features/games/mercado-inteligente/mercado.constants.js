export const SLUG_MERCADO = 'mercado-inteligente';
export const TITULO_MERCADO = 'Mercado Inteligente';
export const HABILIDAD_MERCADO = 'Razonamiento';
export const MODO_PRESENTACION_MERCADO = 'babylon-3d';

export const MODOS_OBJETIVO_MERCADO = Object.freeze({
  presupuestoMaximo: 'presupuesto_maximo',
  presupuestoExacto: 'presupuesto_exacto',
  categoriaObjetivo: 'categoria_objetivo',
  cantidadYCategoria: 'cantidad_y_categoria',
});

export const CATEGORIAS_MERCADO = Object.freeze([
  'frutas',
  'verduras',
  'lacteos',
  'panaderia',
]);

export const PRODUCTOS_BASE_MERCADO = Object.freeze([
  Object.freeze({ id: 'manzana', nombre: 'Manzana', categoria: 'frutas', icono: 'apple' }),
  Object.freeze({ id: 'banano', nombre: 'Banano', categoria: 'frutas', icono: 'nutrition' }),
  Object.freeze({ id: 'pera', nombre: 'Pera', categoria: 'frutas', icono: 'leaf' }),
  Object.freeze({ id: 'zanahoria', nombre: 'Zanahoria', categoria: 'verduras', icono: 'flower' }),
  Object.freeze({ id: 'tomate', nombre: 'Tomate', categoria: 'verduras', icono: 'color-fill' }),
  Object.freeze({ id: 'lechuga', nombre: 'Lechuga', categoria: 'verduras', icono: 'leaf-outline' }),
  Object.freeze({ id: 'leche', nombre: 'Leche', categoria: 'lacteos', icono: 'water' }),
  Object.freeze({ id: 'queso', nombre: 'Queso', categoria: 'lacteos', icono: 'square' }),
  Object.freeze({ id: 'yogur', nombre: 'Yogur', categoria: 'lacteos', icono: 'ellipse' }),
  Object.freeze({ id: 'pan', nombre: 'Pan', categoria: 'panaderia', icono: 'cafe' }),
  Object.freeze({ id: 'galleta', nombre: 'Galleta', categoria: 'panaderia', icono: 'disc' }),
  Object.freeze({ id: 'muffin', nombre: 'Muffin', categoria: 'panaderia', icono: 'triangle' }),
]);
