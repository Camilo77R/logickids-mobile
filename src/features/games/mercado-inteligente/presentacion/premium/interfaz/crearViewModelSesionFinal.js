import { numeroSeguro } from './mercadoInterfazUtils';
import {
  MAX_ESTRELLAS_TROFEO,
  resolverAccionPrincipalSesionFinal,
} from './crearSesionFinalConstantes';

const limitarRango = ({ valor, minimo = 0, maximo }) =>
  Math.min(maximo, Math.max(minimo, numeroSeguro(valor)));

const textoPlanoSeguro = (valor, respaldo) => {
  const texto = String(valor ?? '').trim();
  return texto || respaldo;
};

const calcularEstrellasTrofeoPorProgreso = ({ obtenidas, disponibles }) => {
  const totalDisponible = numeroSeguro(disponibles);
  if (totalDisponible <= 0) return 0;

  return limitarRango({
    valor: Math.ceil((numeroSeguro(obtenidas) / totalDisponible) * MAX_ESTRELLAS_TROFEO),
    maximo: MAX_ESTRELLAS_TROFEO,
  });
};

export const crearViewModelSesionFinal = ({
  sessionResult = {},
  player = {},
} = {}) => {
  const misionesCompletadas = numeroSeguro(sessionResult.completedMissions);
  const misionesTotales = numeroSeguro(sessionResult.totalMissions, 1);
  const estrellasObtenidas = numeroSeguro(sessionResult.earnedStars);
  const estrellasDisponibles = numeroSeguro(sessionResult.availableStars, misionesTotales * MAX_ESTRELLAS_TROFEO);
  const nivelTrofeo = numeroSeguro(sessionResult.trophyLevel, misionesCompletadas);

  return Object.freeze({
    titulo: textoPlanoSeguro(sessionResult.title, '¡Sesión de clase finalizada!'),
    mensajeJugador: textoPlanoSeguro(
      sessionResult.playerMessage,
      '¡Súper trabajo! Terminaste la actividad.',
    ),
    syncLabel: textoPlanoSeguro(sessionResult.syncLabel, 'Tu actividad quedó guardada.'),
    jugador: Object.freeze({
      nombre: textoPlanoSeguro(player.name, 'Estudiante'),
      nivelEtiqueta: textoPlanoSeguro(player.levelLabel, 'Actividad completada'),
    }),
    misionesCompletadas,
    misionesTotales,
    estrellasObtenidas,
    estrellasDisponibles,
    nivelTrofeo,
    estrellasTrofeo: calcularEstrellasTrofeoPorProgreso({
      obtenidas: estrellasObtenidas,
      disponibles: estrellasDisponibles,
    }),
    puntaje: sessionResult.score,
    aciertos: sessionResult.correctAnswers,
    errores: sessionResult.errors,
    comboMaximo: sessionResult.maxCombo,
    historial: Object.freeze({
      deshabilitado: Boolean(sessionResult.historyDisabled),
      etiqueta: textoPlanoSeguro(sessionResult.historyLabel, 'Ver historial de sesiones'),
    }),
    tablero: Object.freeze({
      accion: resolverAccionPrincipalSesionFinal(sessionResult.primaryAction),
      deshabilitado: Boolean(sessionResult.primaryDisabled),
      etiqueta: textoPlanoSeguro(sessionResult.primaryLabel, 'Finalizar y volver al tablero'),
    }),
  });
};
