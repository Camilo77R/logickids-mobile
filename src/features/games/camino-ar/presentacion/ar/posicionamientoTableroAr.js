const DESPLAZAMIENTO_MINIMO_METROS = 0.34;
const MARGEN_SEGURIDAD_METROS = 0.12;
const ELEVACION_TABLERO_METROS = 0.006;
const PRECISION_DECIMALES = 3;
const ALTURA_MINIMA_PISO_RELATIVA_METROS = 0.35;
const ALTURA_MAXIMA_PISO_RELATIVA_METROS = 2.5;
const DISTANCIA_HORIZONTAL_MAXIMA_METROS = 3;
const TIPOS_HIT_PRIORIDAD = Object.freeze([
  'ExistingPlaneUsingExtent',
  'ExistingPlane',
]);

const redondear = (valor) => Number(valor.toFixed(PRECISION_DECIMALES));

const normalizarVectorHorizontal = ([x = 0, _y = 0, z = 0]) => {
  const magnitud = Math.hypot(x, z);

  if (magnitud < 0.0001) {
    return [0, 0, -1];
  }

  return [x / magnitud, 0, z / magnitud];
};

const calcularYawDesdeDireccion = ([x = 0, _y = 0, z = -1]) =>
  Number(((Math.atan2(x, z) * 180) / Math.PI).toFixed(2));

export const esPlanoCandidatoAPiso = ({ plano, posicionCamara }) => {
  if (!plano?.position || !Array.isArray(plano.position) || plano.position.length !== 3) {
    return true;
  }

  if (!Array.isArray(posicionCamara) || posicionCamara.length !== 3) {
    return true;
  }

  const [cameraX, cameraY, cameraZ] = posicionCamara;
  const [planeX, planeY, planeZ] = plano.position;
  const diferenciaAltura = cameraY - planeY;
  const distanciaHorizontal = Math.hypot(planeX - cameraX, planeZ - cameraZ);

  return (
    diferenciaAltura >= ALTURA_MINIMA_PISO_RELATIVA_METROS &&
    diferenciaAltura <= ALTURA_MAXIMA_PISO_RELATIVA_METROS &&
    distanciaHorizontal <= DISTANCIA_HORIZONTAL_MAXIMA_METROS
  );
};

export const esPuntoCandidatoAPiso = ({ punto, posicionCamara }) => {
  if (!Array.isArray(punto) || punto.length !== 3) {
    return false;
  }

  return esPlanoCandidatoAPiso({
    plano: { position: punto },
    posicionCamara,
  });
};

export const resolverReferenciaPisoDesdeHitTests = ({
  hitTestResults,
  posicionCamara,
}) => {
  if (!Array.isArray(hitTestResults) || hitTestResults.length === 0) {
    return null;
  }

  for (const tipoObjetivo of TIPOS_HIT_PRIORIDAD) {
    const candidato = hitTestResults.find((resultado) => {
      if (resultado?.type !== tipoObjetivo) {
        return false;
      }

      return esPuntoCandidatoAPiso({
        punto: resultado?.transform?.position,
        posicionCamara,
      });
    });

    if (candidato) {
      return {
        tipo: candidato.type,
        posicion: candidato.transform.position,
      };
    }
  }

  return null;
};

/**
 * Traduce un toque crudo sobre un plano a una colocacion estable del tablero.
 *
 * POR QUÉ:
 * El toque exacto del usuario suele quedar demasiado cerca del celular.
 * Si centramos el tablero justo ahi, parte del camino termina debajo de la
 * camara y la interaccion se siente torpe. Este helper desplaza el tablero un
 * poco hacia adelante y lo orienta segun la vista del jugador.
 */
export const calcularColocacionTableroAr = ({
  puntoToque,
  posicionCamara,
  alturaPlano,
  anchoTablero,
  profundoTablero,
}) => {
  if (!Array.isArray(puntoToque) || puntoToque.length !== 3) {
    return null;
  }

  const posicionCamaraSegura = Array.isArray(posicionCamara) && posicionCamara.length === 3
    ? posicionCamara
    : [puntoToque[0], puntoToque[1] + 1, puntoToque[2] + 0.4];

  const direccionHorizontal = normalizarVectorHorizontal([
    puntoToque[0] - posicionCamaraSegura[0],
    0,
    puntoToque[2] - posicionCamaraSegura[2],
  ]);
  const desplazamiento = Math.max(
    profundoTablero / 2 + MARGEN_SEGURIDAD_METROS,
    anchoTablero / 2 + 0.06,
    DESPLAZAMIENTO_MINIMO_METROS,
  );

  return {
    posicion: [
      redondear(puntoToque[0] + direccionHorizontal[0] * desplazamiento),
      redondear((alturaPlano ?? puntoToque[1]) + ELEVACION_TABLERO_METROS),
      redondear(puntoToque[2] + direccionHorizontal[2] * desplazamiento),
    ],
    rotacion: [0, calcularYawDesdeDireccion(direccionHorizontal), 0],
    desplazamiento,
  };
};
