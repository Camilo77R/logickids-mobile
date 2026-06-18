import { atributoSeguro, numeroSeguro, textoSeguro } from './mercadoInterfazUtils';
import {
  CONFETI_TOTAL,
  CONFETI_VARIANTES,
  MAX_ESTRELLAS_TROFEO,
} from './crearSesionFinalConstantes';

export const SESION_FINAL_ASSET_KIT = Object.freeze({
  fondo: 'escenario-mercado-premium.png',
  banner: 'sesion-final/banner',
  jugador: 'sesion-final/jugador',
  diploma: 'sesion-final/diploma',
  trofeo: 'sesion-final/trofeo',
  estrellas: 'sesion-final/estrellas',
  resumen: 'sesion-final/resumen',
  mensaje: 'sesion-final/mensaje',
  botonHistorial: 'sesion-final/boton-historial',
  botonTablero: 'sesion-final/boton-tablero',
  confeti: 'sesion-final/confeti',
});

const esFuenteValida = (fuente) => typeof fuente === 'string' && fuente.length > 0;

const obtenerPrimeraFuente = (entrada = {}) => {
  if (!Array.isArray(entrada.fuentes)) {
    return null;
  }

  return (
    entrada.fuentes.find((fuente) => esFuenteValida(fuente) && fuente.startsWith('data:')) ??
    entrada.fuentes.find(esFuenteValida) ??
    null
  );
};

const tieneFuenteRaster = (entrada) => Boolean(obtenerPrimeraFuente(entrada));

const crearImagenRasterSesionFinal = ({ className, fuente, alt = '' }) => {
  if (!fuente) {
    return null;
  }

  return `
    <img
      class="${atributoSeguro(className)}"
      src="${atributoSeguro(fuente)}"
      alt="${textoSeguro(alt)}"
      draggable="false"
    />
  `;
};

const crearCapaAssetSesionFinal = (entrada, className, alt = '') =>
  crearImagenRasterSesionFinal({
    className,
    fuente: obtenerPrimeraFuente(entrada),
    alt,
  }) ?? '';

const crearIconoRasterSesionFinal = ({ entrada, className, fallback, alt = '' }) =>
  crearImagenRasterSesionFinal({
    className,
    fuente: obtenerPrimeraFuente(entrada),
    alt,
  }) ?? fallback;

const crearIconoCheckFallback = () => `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="27" fill="#55ce50" stroke="#347c29" stroke-width="6" />
    <path d="M19 32l9 9 18-21" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

const crearIconoEstrellaFallback = () => `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="27" fill="#ffd03d" stroke="#a85b13" stroke-width="6" />
    <path d="M32 13l6 13 14 2-10 10 3 14-13-7-13 7 3-14-10-10 14-2Z" fill="#fff7a8" stroke="#9a5416" stroke-width="4" stroke-linejoin="round" />
  </svg>
`;

const crearIconoHistorialFallback = () => `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="14" y="12" width="36" height="42" rx="6" fill="#ffffff" stroke="#2b7f3d" stroke-width="5" />
    <path d="M23 25h18M23 34h18M23 43h13" stroke="#2b7f3d" stroke-width="5" stroke-linecap="round" />
  </svg>
`;

const crearIconoCasaFallback = () => `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M12 31L32 14l20 17" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M18 30v23h28V30" fill="#ffffff" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" />
    <rect x="27" y="38" width="10" height="15" rx="2" fill="#188ad4" />
  </svg>
`;

const crearIconoTrofeoMiniFallback = () => `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M19 16h26c1 19-4 30-13 30S18 35 19 16Z" fill="#ffd54a" stroke="#995719" stroke-width="5" />
    <path d="M19 23c-10-5-12 14 2 16M45 23c10-5 12 14-2 16" fill="none" stroke="#995719" stroke-width="5" stroke-linecap="round" />
    <path d="M28 46h8v7h-8Z" fill="#e89022" />
    <rect x="21" y="52" width="22" height="7" rx="3" fill="#e89022" stroke="#995719" stroke-width="4" />
  </svg>
`;

export const crearConfetiSesionFinal = () =>
  Array.from({ length: CONFETI_TOTAL }, (_, indice) => {
    const variante = (indice % CONFETI_VARIANTES) + 1;
    return `<i class="mercado-resultado__confeti mercado-resultado__confeti--${variante}" aria-hidden="true"></i>`;
  }).join('');

export const crearFondoSesionFinal = (assets = {}) =>
  crearCapaAssetSesionFinal(assets?.capas?.fondo, 'mercado-sesion-final__fondo-asset', '');

export const crearOverlayConfetiSesionFinal = (assets = {}) =>
  crearCapaAssetSesionFinal(assets?.efectos?.confeti, 'mercado-sesion-final__confeti-premium', '');

export const crearBannerSesionFinal = ({ titulo, assets }) => `
  <header class="mercado-sesion-final__banner ${tieneFuenteRaster(assets?.capas?.banner) ? 'mercado-sesion-final__banner--con-asset' : ''}">
    ${crearCapaAssetSesionFinal(assets?.capas?.banner, 'mercado-sesion-final__banner-asset', '')}
    <h1>${textoSeguro(titulo, '¡Sesión de clase finalizada!')}</h1>
  </header>
`;

const crearIdSvgSesionFinal = (id = 'jugador') =>
  atributoSeguro(String(id ?? 'jugador').replace(/[^a-zA-Z0-9_-]/g, '-') || 'jugador');

export const crearAvatarJugadorSesionFinal = (id = 'jugador') => {
  const idSeguro = crearIdSvgSesionFinal(id);

  return `
  <svg class="mercado-sesion-final__avatar-svg" viewBox="0 0 120 120" role="img" aria-label="Avatar del estudiante">
    <defs>
      <linearGradient id="avatar-fondo-${idSeguro}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#8ce9ff" />
        <stop offset="1" stop-color="#c8fbff" />
      </linearGradient>
      <linearGradient id="avatar-piel-${idSeguro}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#ffd19d" />
        <stop offset="1" stop-color="#e98d5f" />
      </linearGradient>
    </defs>
    <rect x="9" y="9" width="102" height="102" rx="24" fill="url(#avatar-fondo-${idSeguro})" stroke="#f0bd3d" stroke-width="8" />
    <circle cx="60" cy="66" r="30" fill="url(#avatar-piel-${idSeguro})" stroke="#8d4d24" stroke-width="4" />
    <path d="M31 53c6-24 35-34 59-15 6 5 8 15 3 24-12-11-30-12-58-2-4-1-6-4-4-7Z" fill="#63351f" />
    <path d="M44 39c10-18 37-16 50 2-14-4-31-3-50 5Z" fill="#4e2b1d" />
    <circle cx="50" cy="67" r="4.5" fill="#4a2618" />
    <circle cx="72" cy="67" r="4.5" fill="#4a2618" />
    <path d="M51 82c7 7 16 7 24 0" fill="none" stroke="#8d3d2a" stroke-width="5" stroke-linecap="round" />
    <path d="M39 101c11-9 32-9 43 0" fill="#45bcd6" />
  </svg>
`;
};

export const crearTarjetaJugadorSesionFinal = ({ jugador = {}, assets = {} } = {}) => {
  const tieneTarjetaPremium = Boolean(obtenerPrimeraFuente(assets?.capas?.tarjetaJugador));

  return `
  <section class="mercado-sesion-final__jugador" aria-label="Jugador">
    ${crearCapaAssetSesionFinal(assets?.capas?.tarjetaJugador, 'mercado-sesion-final__jugador-asset', '')}
    ${tieneTarjetaPremium ? '' : `<div class="mercado-sesion-final__avatar">${crearAvatarJugadorSesionFinal()}</div>`}
    <strong class="mercado-sesion-final__jugador-nombre">${textoSeguro(jugador.nombre, 'Estudiante')}</strong>
    <span>${textoSeguro(jugador.nivelEtiqueta, 'Actividad completada')}</span>
    ${tieneTarjetaPremium ? '' : '<i aria-hidden="true">★</i>'}
  </section>
`;
};

export const crearDiplomaSesionFinal = (assets = {}) =>
  crearCapaAssetSesionFinal(assets?.capas?.diploma, 'mercado-sesion-final__diploma-asset', 'Diploma de comprador inteligente') || `
  <div class="mercado-sesion-final__medallon" aria-hidden="true">
    ${crearAvatarJugadorSesionFinal('diploma')}
    <span>♛</span>
  </div>
  <svg class="mercado-sesion-final__diploma-svg" viewBox="0 0 240 138" aria-hidden="true">
    <path d="M20 24h158l38 26v68H20Z" fill="#e9fbff" stroke="#4f9eb8" stroke-width="10" />
    <path d="M178 24v26h38Z" fill="#c8eef7" stroke="#4f9eb8" stroke-width="6" />
    <path d="M40 60h112M40 78h132M40 96h96" stroke="#7ca8b5" stroke-width="5" stroke-linecap="round" stroke-dasharray="7 7" />
    <circle cx="198" cy="105" r="24" fill="#f3bd3f" stroke="#9f5b17" stroke-width="6" />
    <path d="M187 105l8 8 15-18" fill="none" stroke="#fff8cc" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

const crearTrofeoFallbackSesionFinal = (nivel) => `
  <svg class="mercado-sesion-final__trofeo-svg" viewBox="0 0 300 260" role="img" aria-label="Trofeo de actividad completada">
    <path d="M72 88C36 72 24 109 42 135c14 21 37 29 63 23" fill="none" stroke="#9a5416" stroke-width="18" stroke-linecap="round" />
    <path d="M228 88c36-16 48 21 30 47-14 21-37 29-63 23" fill="none" stroke="#9a5416" stroke-width="18" stroke-linecap="round" />
    <path d="M72 42h156c2 74-25 125-78 125S70 116 72 42Z" fill="#ffc63b" stroke="#9a5416" stroke-width="11" />
    <circle cx="150" cy="190" r="29" fill="#f5b02d" stroke="#8b4814" stroke-width="8" />
    <text x="150" y="202" text-anchor="middle" font-size="37" font-weight="900" fill="#fff3c9">${numeroSeguro(nivel)}</text>
  </svg>
`;

export const crearTrofeoSesionFinal = (nivel, assets = {}) => {
  const imagenTrofeo = crearImagenRasterSesionFinal({
    className: 'mercado-sesion-final__trofeo-asset',
    fuente: obtenerPrimeraFuente(assets.capas?.trofeo),
    alt: 'Trofeo de actividad completada',
  });

  return imagenTrofeo ?? crearTrofeoFallbackSesionFinal(nivel);
};

export const crearEstrellaSesionFinal = ({ activa, id, assets }) => {
  const assetEstrella = activa
    ? assets?.capas?.estrellaActiva
    : assets?.capas?.estrellaInactiva;
  const imagenEstrella = crearImagenRasterSesionFinal({
    className: 'mercado-sesion-final__estrella-asset',
    fuente: obtenerPrimeraFuente(assetEstrella),
    alt: activa ? 'Estrella obtenida' : 'Estrella pendiente',
  });

  if (imagenEstrella) {
    return imagenEstrella;
  }

  return `
  <svg class="mercado-sesion-final__estrella-svg" viewBox="0 0 120 120" aria-hidden="true">
    <path d="M60 10l14 31 34 4-25 23 7 34-30-18-30 18 7-34-25-23 34-4Z" fill="${activa ? '#ffba2c' : '#9f9d99'}" stroke="${activa ? '#995014' : '#686660'}" stroke-width="8" stroke-linejoin="round" />
  </svg>
`;
};

export const crearEstrellasTrofeoSesionFinal = (cantidad = 0, assets = {}) =>
  Array.from({ length: MAX_ESTRELLAS_TROFEO }, (_, indice) => `
    <span class="mercado-sesion-final__estrella ${indice < numeroSeguro(cantidad) ? 'mercado-sesion-final__estrella--activa' : ''}" aria-hidden="true">
      ${crearEstrellaSesionFinal({ activa: indice < numeroSeguro(cantidad), id: indice + 1, assets })}
    </span>
  `).join('');

export const crearCelebracionSesionFinal = ({ nivelTrofeo, estrellasTrofeo, assets }) => `
  <section class="mercado-sesion-final__celebracion" aria-label="Reconocimiento final">
    <div class="mercado-sesion-final__diploma">
      ${crearDiplomaSesionFinal(assets)}
    </div>
    <div class="mercado-sesion-final__trofeo" aria-label="Trofeo de actividad completada">
      ${crearTrofeoSesionFinal(nivelTrofeo, assets)}
      <span class="mercado-sesion-final__trofeo-nivel" aria-hidden="true">${numeroSeguro(nivelTrofeo)}</span>
    </div>
    <div class="mercado-sesion-final__estrellas" aria-label="${numeroSeguro(estrellasTrofeo)} de ${MAX_ESTRELLAS_TROFEO} estrellas">
      ${crearEstrellasTrofeoSesionFinal(estrellasTrofeo, assets)}
    </div>
  </section>
`;

export const crearResumenSesionFinal = ({
  misionesCompletadas,
  misionesTotales,
  estrellasObtenidas,
  estrellasDisponibles,
  puntaje,
  aciertos,
  errores,
  comboMaximo,
  assets,
}) => `
  <section class="mercado-sesion-final__resumen ${tieneFuenteRaster(assets?.capas?.panelResumen) ? 'mercado-sesion-final__resumen--con-asset' : ''}" aria-label="Resumen de la actividad">
    ${crearCapaAssetSesionFinal(assets?.capas?.panelResumen, 'mercado-sesion-final__resumen-asset', '')}
    <article>
      <span class="mercado-sesion-final__resumen-icono" aria-hidden="true">
        ${crearIconoRasterSesionFinal({
          entrada: assets?.iconos?.checkResumen,
          className: 'mercado-sesion-final__icono-asset',
          fallback: crearIconoCheckFallback(),
        })}
      </span>
      <strong>Misiones totales</strong>
      <b>${numeroSeguro(misionesCompletadas)}/${numeroSeguro(misionesTotales, 1)}</b>
      <small>Completadas</small>
    </article>
    <article>
      <span class="mercado-sesion-final__resumen-icono" aria-hidden="true">
        ${crearIconoRasterSesionFinal({
          entrada: assets?.iconos?.estrellaResumen,
          className: 'mercado-sesion-final__icono-asset',
          fallback: crearIconoEstrellaFallback(),
        })}
      </span>
      <strong>Total estrellas</strong>
      <b>${numeroSeguro(estrellasObtenidas)}/${numeroSeguro(estrellasDisponibles)}</b>
      <small>${numeroSeguro(puntaje)} puntos</small>
    </article>
    <article class="mercado-sesion-final__estadisticas">
      <strong>Estadísticas globales</strong>
      <span>Aciertos: ${numeroSeguro(aciertos)}</span>
      <span>Fallos: ${numeroSeguro(errores)}</span>
      <span>Combo máx: x${numeroSeguro(comboMaximo)}</span>
    </article>
  </section>
`;

export const crearGloboMensajeSesionFinal = ({ mensaje, syncLabel, assets }) => `
  <p class="mercado-sesion-final__mensaje ${tieneFuenteRaster(assets?.capas?.globo) ? 'mercado-sesion-final__mensaje--con-asset' : ''}">
    ${crearCapaAssetSesionFinal(assets?.capas?.globo, 'mercado-sesion-final__mensaje-asset', '')}
    <span>${textoSeguro(mensaje, '¡Súper trabajo! Terminaste la actividad.')}</span>
    <small>${textoSeguro(syncLabel, 'Tu actividad quedó guardada.')}</small>
  </p>
`;

export const crearBotonHistorialSesionFinal = ({ etiqueta, deshabilitado, assets } = {}) => `
  <button
    class="mercado-sesion-final__historial ${tieneFuenteRaster(assets?.capas?.botonHistorial) ? 'mercado-sesion-final__historial--con-asset' : ''}"
    type="button"
    ${deshabilitado ? '' : 'data-mercado-action="history"'}
    ${deshabilitado ? 'disabled' : ''}
  >
    ${crearCapaAssetSesionFinal(assets?.capas?.botonHistorial, 'mercado-sesion-final__boton-asset', '')}
    <span aria-hidden="true">
      ${crearIconoRasterSesionFinal({
        entrada: assets?.iconos?.historial,
        className: 'mercado-sesion-final__boton-icono-asset',
        fallback: crearIconoHistorialFallback(),
      })}
    </span>
    <strong>${textoSeguro(etiqueta, 'Ver historial de sesiones')}</strong>
  </button>
`;

export const crearBotonTableroSesionFinal = ({ accion, etiqueta, deshabilitado, assets } = {}) => `
  <button
    class="mercado-sesion-final__tablero ${tieneFuenteRaster(assets?.capas?.botonTablero) ? 'mercado-sesion-final__tablero--con-asset' : ''}"
    type="button"
    data-mercado-action="${atributoSeguro(accion)}"
    ${deshabilitado ? 'disabled' : ''}
  >
    ${crearCapaAssetSesionFinal(assets?.capas?.botonTablero, 'mercado-sesion-final__boton-asset', '')}
    <span aria-hidden="true">
      ${crearIconoRasterSesionFinal({
        entrada: assets?.iconos?.tablero,
        className: 'mercado-sesion-final__boton-icono-asset',
        fallback: crearIconoCasaFallback(),
      })}
    </span>
    <strong>${textoSeguro(etiqueta, 'Finalizar y volver al tablero')}</strong>
    <i aria-hidden="true">
      ${crearIconoRasterSesionFinal({
        entrada: assets?.iconos?.trofeoMini,
        className: 'mercado-sesion-final__boton-icono-asset',
        fallback: crearIconoTrofeoMiniFallback(),
      })}
    </i>
  </button>
`;


