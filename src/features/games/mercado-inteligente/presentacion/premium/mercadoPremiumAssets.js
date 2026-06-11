import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

const cacheFuentes = new Map();

const agregarFuente = (fuentes, fuente) => {
  if (typeof fuente === 'string' && fuente.length > 0 && !fuentes.includes(fuente)) {
    fuentes.push(fuente);
  }
};

const resolverFuentesSinCache = async ({ source, mimeType }) => {
  const asset = Asset.fromModule(source);
  await asset.downloadAsync();

  const fuentes = [];
  agregarFuente(fuentes, asset.uri);

  if (asset.localUri) {
    try {
      const contenido = await new File(asset.localUri).base64();
      agregarFuente(fuentes, `data:${mimeType};base64,${contenido}`);
    } catch {
      // asset.uri sigue siendo una fuente válida para Metro y builds EAS.
    }
  }

  return fuentes;
};

export const resolverFuentesModeloPremium = async (modelo) => {
  if (!modelo?.source) {
    return [];
  }

  if (!cacheFuentes.has(modelo.source)) {
    cacheFuentes.set(
      modelo.source,
      resolverFuentesSinCache({
        source: modelo.source,
        mimeType: modelo.mimeType ?? 'model/gltf-binary',
      }).catch((error) => {
        cacheFuentes.delete(modelo.source);
        throw error;
      }),
    );
  }

  return cacheFuentes.get(modelo.source);
};

export const prepararAssetsMercadoPremium = async ({
  productos,
  modelosEscena,
}) => {
  const productosPreparados = productos.map((producto) => [producto.id, []]);
  const escenaPreparada = await Promise.all(
    Object.entries(modelosEscena).map(async ([id, modelo]) => [
      id,
      await resolverFuentesModeloPremium(modelo),
    ]),
  );

  return {
    productos: Object.fromEntries(productosPreparados),
    escena: Object.fromEntries(escenaPreparada),
  };
};
