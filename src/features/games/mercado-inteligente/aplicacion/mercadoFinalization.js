export const finalizarMercadoTrasGuardarCheckpoint = async ({
  finalizacion,
  flushCheckpoint,
  postFinalizacion,
}) => {
  await flushCheckpoint();
  return postFinalizacion(finalizacion);
};
