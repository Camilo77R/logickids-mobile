export const finalizarSesionTren3DConCheckpoint = async ({
  finalizarSesion,
  finalizacion,
  flushCheckpoint,
}) => {
  if (
    typeof finalizarSesion !== 'function' ||
    typeof flushCheckpoint !== 'function' ||
    !finalizacion?.finalization_id
  ) {
    throw new Error('La finalizacion de Tren requiere checkpoint e identidad estable.');
  }

  await flushCheckpoint();
  return finalizarSesion(finalizacion);
};
