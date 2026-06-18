import React from 'react';

import MascotaGuiaJuego from '../../core/MascotaGuiaJuego';

const GUIA_MERCADO = Object.freeze({
  titulo: '¡Bienvenido al Mercadito!',
  mensaje: 'Yo te acompaño mientras compras. Mira tus monedas, elige productos y prueba tu compra cuando estés listo.',
  pasos: [
    'Toca productos para agregarlos a tu mochila.',
    'Mira el total y no te pases de las monedas.',
    'Cuando estés listo, pulsa Comprar.',
  ],
  accion: 'Empezar misión',
});

export default function MercadoGuiaInicial({ nombreJugador, onComenzar }) {
  return (
    <MascotaGuiaJuego
      titulo={GUIA_MERCADO.titulo}
      mensaje={`Hola, ${nombreJugador}. ${GUIA_MERCADO.mensaje}`}
      pasos={GUIA_MERCADO.pasos}
      accion={GUIA_MERCADO.accion}
      onAccion={onComenzar}
    />
  );
}
