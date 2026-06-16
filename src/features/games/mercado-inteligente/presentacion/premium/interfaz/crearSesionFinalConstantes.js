export const MAX_ESTRELLAS_TROFEO = 3;
export const CONFETI_TOTAL = 32;
export const CONFETI_VARIANTES = 5;
export const ACCION_PRINCIPAL_SESION_FINAL_DEFAULT = 'continue';

export const ACCIONES_PRINCIPALES_SESION_FINAL = Object.freeze([
  ACCION_PRINCIPAL_SESION_FINAL_DEFAULT,
]);

const ACCIONES_PRINCIPALES_PERMITIDAS = new Set(ACCIONES_PRINCIPALES_SESION_FINAL);

export const resolverAccionPrincipalSesionFinal = (accion) => {
  const accionNormalizada = String(accion ?? '').trim();
  return ACCIONES_PRINCIPALES_PERMITIDAS.has(accionNormalizada)
    ? accionNormalizada
    : ACCION_PRINCIPAL_SESION_FINAL_DEFAULT;
};
