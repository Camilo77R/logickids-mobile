import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

export const FUENTE_MODELO_TIPO = Object.freeze({
  dataUri: 'dataUri',
  localUri: 'localUri',
  multiple: 'multiple',
  missing: 'missing',
});

const crearResultadoAsset = ({
  tipo,
  uri = null,
  uris = [],
  diagnostico = null,
}) => ({
  tipo,
  uri,
  uris,
  diagnostico,
});

const crearDataUriGlb = async (localUri) => {
  const contenidoBase64 = await new File(localUri).base64();
  return `data:model/gltf-binary;base64,${contenidoBase64}`;
};

const agregarUriUnica = (uris, uri) => {
  if (typeof uri === 'string' && uri.length > 0 && !uris.includes(uri)) {
    uris.push(uri);
  }
};

export const resolverFuenteModeloBabylon = async (moduloAsset) => {
  if (!moduloAsset) {
    return crearResultadoAsset({
      tipo: FUENTE_MODELO_TIPO.missing,
      diagnostico: 'asset_module_missing',
    });
  }

  const asset = Asset.fromModule(moduloAsset);
  await asset.downloadAsync();

  const uris = [];
  const diagnosticos = [];

  // Expo sirve asset.uri desde Metro/EAS y Babylon puede cargarlo directamente.
  agregarUriUnica(uris, asset.uri);

  if (asset.localUri) {
    try {
      agregarUriUnica(uris, await crearDataUriGlb(asset.localUri));
    } catch (error) {
      diagnosticos.push(`data_uri_failed:${String(error?.message ?? error)}`);
    }
  }

  if (uris.length > 0) {
    return crearResultadoAsset({
      tipo: uris.length > 1 ? FUENTE_MODELO_TIPO.multiple : FUENTE_MODELO_TIPO.localUri,
      uri: uris[0],
      uris,
      diagnostico: diagnosticos.length > 0 ? diagnosticos.join('|') : null,
    });
  }

  return crearResultadoAsset({
    tipo: FUENTE_MODELO_TIPO.missing,
    diagnostico: diagnosticos.join('|') || 'asset_uri_missing_after_download',
  });
};

export const ocultarUriLargaParaLog = (uri) => {
  if (typeof uri !== 'string') {
    return uri;
  }

  if (uri.startsWith('data:')) {
    return `${uri.slice(0, 32)}...[base64 omitido]`;
  }

  return uri;
};
