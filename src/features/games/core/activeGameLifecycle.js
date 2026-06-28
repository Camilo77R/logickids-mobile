import { ESTADOS_ACCESO_JUEGO } from './resolverAccesoJuego';

const PARTICIPANT_STATES_REQUIRING_EXIT = new Set(['abandonado', 'cerrado']);

export const shouldCloseActiveGame = ({
  accessState,
  participantState,
  resultVisible = false,
  sessionActive = false,
}) => {
  if (accessState === ESTADOS_ACCESO_JUEGO.disponible) {
    return false;
  }

  if (!resultVisible) {
    return true;
  }

  return PARTICIPANT_STATES_REQUIRING_EXIT.has(participantState);
};
