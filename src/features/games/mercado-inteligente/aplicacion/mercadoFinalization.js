const resolveCheckpointWarning = (error) =>
  error instanceof Error ? error.message : 'No se pudo guardar el checkpoint antes de finalizar.';

export const finalizarMercadoTrasGuardarCheckpoint = async ({
  finalizacion,
  flushCheckpoint,
  postFinalizacion,
}) => {
  let checkpointWarning = null;

  try {
    await flushCheckpoint();
  } catch (error) {
    checkpointWarning = resolveCheckpointWarning(error);
  }

  const respuesta = await postFinalizacion(finalizacion);

  return checkpointWarning && respuesta && typeof respuesta === 'object'
    ? { ...respuesta, checkpoint_warning: checkpointWarning }
    : respuesta;
};