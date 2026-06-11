export const escaparHtml = (valor) =>
  String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export const textoSeguro = (valor, respaldo = 'Sin datos') => {
  const texto = String(valor ?? '').trim();
  return escaparHtml(texto || respaldo);
};

export const numeroSeguro = (valor, respaldo = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : respaldo;
};

export const monedasSeguras = (valor) => Math.max(0, numeroSeguro(valor));

export const atributoSeguro = (valor) => escaparHtml(valor);

export const claseTotal = (estado) => {
  const clases = {
    exact: 'mercado-total--exacto',
    over: 'mercado-total--exceso',
    under: 'mercado-total--faltante',
  };

  return clases[estado] ?? 'mercado-total--neutral';
};
