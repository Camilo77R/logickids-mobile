const limitarEstrellas = (valor) =>
  Math.max(0, Math.min(3, Number.isFinite(Number(valor)) ? Number(valor) : 0));

const obtenerNumero = (valor, respaldo = 0) =>
  Number.isFinite(Number(valor)) ? Number(valor) : respaldo;

const crearMensajeResultado = ({ nombreJugador, estrellas }) => {
  const nombre = String(nombreJugador || 'Estudiante').trim();

  if (estrellas >= 3) {
    return `¡Excelente, ${nombre}! Completaste una compra perfecta.`;
  }

  if (estrellas >= 2) {
    return `¡Muy bien, ${nombre}! Cumpliste la misión sin pasarte.`;
  }

  return `¡Buen trabajo, ${nombre}! Cada intento mejora tu estrategia.`;
};

export const crearResultadoUiMercadoPremium = ({
  modeloVisual,
  resultado,
  nombreJugador,
  tieneSiguienteNivel,
  etiquetaAccionResultado,
  sincronizandoResultado,
  errorSincronizacionResultado,
}) => {
  const estadisticas = resultado?.estadisticas ?? {};
  const estrellas = limitarEstrellas(modeloVisual?.feedback?.estrellas);
  const errores = obtenerNumero(
    estadisticas.errores,
    modeloVisual?.metricas?.errores,
  );

  return {
    title: '¡Misión de nivel completada!',
    subtitle: `¡Genial! Has ganado ${estrellas} ${estrellas === 1 ? 'estrella' : 'estrellas'}`,
    stars: estrellas,
    message: crearMensajeResultado({ nombreJugador, estrellas }),
    stats: {
      correctProducts: obtenerNumero(modeloVisual?.metricas?.productosElegidos),
      successfulPurchases: obtenerNumero(
        estadisticas.aciertos,
        modeloVisual?.metricas?.aciertos,
      ),
      errors: errores,
      combo: obtenerNumero(
        estadisticas.comboMaximo,
        modeloVisual?.feedback?.combo,
      ),
      coinsUsed: obtenerNumero(modeloVisual?.compra?.total),
    },
    selectedProducts: modeloVisual?.mochila ?? [],
    primaryVisible: !sincronizandoResultado || Boolean(errorSincronizacionResultado),
    primaryLabel: errorSincronizacionResultado
      ? 'Reintentar guardado'
      : etiquetaAccionResultado ?? (tieneSiguienteNivel
        ? '¡Siguiente nivel!'
        : 'Volver al tablero'),
    primaryAction: errorSincronizacionResultado ? 'retry-save' : 'continue',
    primaryDisabled: sincronizandoResultado,
    syncLabel: errorSincronizacionResultado
      ? 'No pudimos guardar todavía. Revisa tu conexión e inténtalo otra vez.'
      : sincronizandoResultado
        ? 'Resultado listo. Guardamos tu progreso en segundo plano.'
        : 'Tu progreso quedó guardado.',
  };
};
