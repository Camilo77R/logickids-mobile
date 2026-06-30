import { Directory, File, Paths } from 'expo-file-system';

const BABYLON_CDN_URL = 'https://cdn.babylonjs.com/babylon.js';
const BYTES_MINIMOS_SCRIPT = 1_000_000;
const TIEMPO_MAXIMO_DESCARGA_MS = 12_000;

const directorioCacheMotor = new Directory(Paths.cache, 'logickids', 'tren-3d');
const archivoCacheMotor = new File(directorioCacheMotor, 'babylon.js');

let promesaMotorBabylon = null;

const leerMotorDesdeCache = async () => {
  if (!archivoCacheMotor.exists) {
    return null;
  }

  const infoArchivo = archivoCacheMotor.info();

  if ((infoArchivo.size ?? 0) < BYTES_MINIMOS_SCRIPT) {
    return null;
  }

  return archivoCacheMotor.uri;
};

const descargarMotorBabylon = async () => {
  const controlador = new AbortController();
  const temporizador = setTimeout(
    () => controlador.abort(),
    TIEMPO_MAXIMO_DESCARGA_MS,
  );

  try {
    const respuesta = await fetch(BABYLON_CDN_URL, {
      signal: controlador.signal,
    });

    if (!respuesta.ok) {
      throw new Error(`Respuesta ${respuesta.status}`);
    }

    const contenido = await respuesta.text();

    if (contenido.length < BYTES_MINIMOS_SCRIPT) {
      throw new Error('El motor Babylon llego incompleto.');
    }

    if (!directorioCacheMotor.exists) {
      directorioCacheMotor.create({ idempotent: true, intermediates: true });
    }

    archivoCacheMotor.write(contenido);

    return archivoCacheMotor.uri;
  } finally {
    clearTimeout(temporizador);
  }
};

export const cargarMotorBabylon = async () => {
  if (!promesaMotorBabylon) {
    promesaMotorBabylon = (async () => {
      const motorEnCache = await leerMotorDesdeCache();

      if (motorEnCache) {
        return motorEnCache;
      }

      try {
        return await descargarMotorBabylon();
      } catch (error) {
        const respaldoEnCache = await leerMotorDesdeCache();

        if (respaldoEnCache) {
          return respaldoEnCache;
        }

        throw error;
      }
    })().catch((error) => {
      promesaMotorBabylon = null;
      throw error;
    });
  }

  return promesaMotorBabylon;
};
