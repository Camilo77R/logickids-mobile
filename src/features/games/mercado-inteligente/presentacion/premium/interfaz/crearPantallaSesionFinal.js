import {
  crearBannerSesionFinal,
  crearBotonHistorialSesionFinal,
  crearBotonTableroSesionFinal,
  crearCelebracionSesionFinal,
  crearConfetiSesionFinal,
  crearGloboMensajeSesionFinal,
  crearOverlayConfetiSesionFinal,
  crearResumenSesionFinal,
  crearTarjetaJugadorSesionFinal,
} from './crearAssetsSesionFinal';
import { crearViewModelSesionFinal } from './crearViewModelSesionFinal';

export function crearPantallaSesionFinal({
  sessionResult = {},
  player = {},
} = {}, opciones = {}) {
  const vista = crearViewModelSesionFinal({ sessionResult, player });
  const assets = opciones.assets ?? {};

  return `
    <main class="mercado-sesion-final" data-mercado-screen="session-result">
      <div class="mercado-sesion-final__stage">
        <div class="mercado-sesion-final__velo" aria-hidden="true"></div>
        <div class="mercado-resultado__confeti-capa" aria-hidden="true">${crearConfetiSesionFinal()}</div>
        ${crearOverlayConfetiSesionFinal(assets)}

        ${crearBannerSesionFinal({ titulo: vista.titulo, assets })}
        ${crearTarjetaJugadorSesionFinal({ jugador: vista.jugador, assets })}
        ${crearCelebracionSesionFinal({
          nivelTrofeo: vista.nivelTrofeo,
          estrellasTrofeo: vista.estrellasTrofeo,
          assets,
        })}
        ${crearResumenSesionFinal({
          misionesCompletadas: vista.misionesCompletadas,
          misionesTotales: vista.misionesTotales,
          estrellasObtenidas: vista.estrellasObtenidas,
          estrellasDisponibles: vista.estrellasDisponibles,
          puntaje: vista.puntaje,
          aciertos: vista.aciertos,
          errores: vista.errores,
          comboMaximo: vista.comboMaximo,
          assets,
        })}
        ${crearGloboMensajeSesionFinal({
          mensaje: vista.mensajeJugador,
          syncLabel: vista.syncLabel,
          assets,
        })}
        ${crearBotonHistorialSesionFinal({ ...vista.historial, assets })}
        ${crearBotonTableroSesionFinal({ ...vista.tablero, assets })}
      </div>
    </main>
  `;
}



