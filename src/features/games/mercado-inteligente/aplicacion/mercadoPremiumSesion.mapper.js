const numeroNoNegativo = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(0, Math.round(numero)) : 0;
};

export const crearResumenActividadMercado = () => ({
  nivelesCompletados: 0,
  estrellasObtenidas: 0,
  aciertos: 0,
  errores: 0,
  comboMaximo: 0,
  puntaje: 0,
});

export const resolverResultadoNivelParaResumenMercado = ({
  resultadoLocal,
  respuestaFinalizacion,
}) => {
  const resumenOficial = respuestaFinalizacion?.resumen_oficial;

  if (!resumenOficial) {
    return resultadoLocal;
  }

  return {
    estadisticas: {
      puntaje: resumenOficial.puntaje,
      aciertos: resumenOficial.aciertos,
      errores: resumenOficial.errores,
      comboMaximo: resumenOficial.combo_maximo,
    },
  };
};

export const acumularNivelEnResumenMercado = ({
  resumen = crearResumenActividadMercado(),
  resultado,
  estrellas = 0,
}) => {
  if (!resultado) {
    return resumen;
  }

  const estadisticas = resultado.estadisticas ?? {};

  return {
    nivelesCompletados: numeroNoNegativo(resumen.nivelesCompletados) + 1,
    estrellasObtenidas:
      numeroNoNegativo(resumen.estrellasObtenidas) + Math.min(3, numeroNoNegativo(estrellas)),
    aciertos: numeroNoNegativo(resumen.aciertos) + numeroNoNegativo(estadisticas.aciertos),
    errores: numeroNoNegativo(resumen.errores) + numeroNoNegativo(estadisticas.errores),
    comboMaximo: Math.max(
      numeroNoNegativo(resumen.comboMaximo),
      numeroNoNegativo(estadisticas.comboMaximo),
    ),
    puntaje: numeroNoNegativo(resumen.puntaje) + numeroNoNegativo(estadisticas.puntaje),
  };
};

export const crearSesionFinalUiMercadoPremium = ({
  resumenActividad,
  nombreJugador,
  totalNiveles,
  sincronizandoResultado,
  errorSincronizacionResultado,
}) => {
  const nivelesTotales = Math.max(1, numeroNoNegativo(totalNiveles));
  const resumen = resumenActividad ?? crearResumenActividadMercado();

  return {
    title: '¡Sesión de clase finalizada!',
    playerMessage: `¡Súper trabajo, ${String(nombreJugador || 'Estudiante').trim()}! Eres un experto del mercado inteligente.`,
    completedMissions: Math.min(nivelesTotales, numeroNoNegativo(resumen.nivelesCompletados)),
    totalMissions: nivelesTotales,
    earnedStars: Math.min(nivelesTotales * 3, numeroNoNegativo(resumen.estrellasObtenidas)),
    availableStars: nivelesTotales * 3,
    correctAnswers: numeroNoNegativo(resumen.aciertos),
    errors: numeroNoNegativo(resumen.errores),
    maxCombo: numeroNoNegativo(resumen.comboMaximo),
    score: numeroNoNegativo(resumen.puntaje),
    trophyLevel: Math.min(nivelesTotales, numeroNoNegativo(resumen.nivelesCompletados)),
    primaryLabel: 'Finalizar y volver al tablero',
    primaryAction: 'continue',
    primaryDisabled: false,
    historyDisabled: true,
    historyLabel: 'Ver historial de sesiones',
    syncLabel: errorSincronizacionResultado
      ? 'No pudimos guardar todavía. Revisa tu conexión e inténtalo otra vez.'
      : sincronizandoResultado
        ? 'Resultado listo. Guardamos tu progreso en segundo plano.'
        : 'Tu actividad quedó guardada.',
  };
};
