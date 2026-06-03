import { useCallback, useEffect, useRef } from 'react';

const AUDIO_SOURCES = Object.freeze({
  musicaFondo: require('../../../../assets/audio/camino-ar/playful-garden-loop.wav'),
  baldosaBase: require('../../../../assets/audio/camino-ar/tile-tin.wav'),
  baldosaAlta: require('../../../../assets/audio/camino-ar/tile-tin-high.wav'),
  exito: require('../../../../assets/audio/camino-ar/success-pop.wav'),
  estrellas: require('../../../../assets/audio/camino-ar/star-burst.wav'),
});

const createNoopAudio = () => ({
  disponible: false,
  players: {},
});

const hasNativeAudioModule = () => {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    return Boolean(requireOptionalNativeModule('ExpoAudio'));
  } catch {
    return false;
  }
};

const reproducirDesdeInicio = async (player) => {
  if (!player) {
    return;
  }

  try {
    await player.seekTo?.(0);
    player.play?.();
  } catch {
    // El audio no debe bloquear la partida si el dispositivo no puede reproducir.
  }
};

const detenerPlayer = (player) => {
  try {
    player?.pause?.();
    player?.release?.();
  } catch {
    // Cierre defensivo: el ciclo de vida del juego no depende del audio.
  }
};

const crearAudioSeguro = () => {
  try {
    if (!hasNativeAudioModule()) {
      return createNoopAudio();
    }

    const { createAudioPlayer, setAudioModeAsync } = require('expo-audio');

    setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => null);

    const players = {
      musicaFondo: createAudioPlayer(AUDIO_SOURCES.musicaFondo, {
        downloadFirst: true,
      }),
      baldosaBase: createAudioPlayer(AUDIO_SOURCES.baldosaBase, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
      baldosaAlta: createAudioPlayer(AUDIO_SOURCES.baldosaAlta, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
      exito: createAudioPlayer(AUDIO_SOURCES.exito, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
      estrellas: createAudioPlayer(AUDIO_SOURCES.estrellas, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
    };

    players.musicaFondo.loop = true;
    players.musicaFondo.volume = 0.07;
    players.baldosaBase.volume = 0.5;
    players.baldosaAlta.volume = 0.5;
    players.exito.volume = 0.55;
    players.estrellas.volume = 0.5;
    players.musicaFondo.play();

    return {
      disponible: true,
      players,
    };
  } catch {
    return createNoopAudio();
  }
};

export const useCaminoArAudio = ({ escena, escenaEspacial }) => {
  const audioRef = useRef(createNoopAudio());
  const baldosaActivaAnteriorRef = useRef(null);
  const resultadoVisibleAnteriorRef = useRef(false);
  const celebracionTimeoutRef = useRef(null);

  useEffect(() => {
    audioRef.current = crearAudioSeguro();

    return () => {
      if (celebracionTimeoutRef.current) {
        clearTimeout(celebracionTimeoutRef.current);
      }

      Object.values(audioRef.current.players).forEach(detenerPlayer);
      audioRef.current = createNoopAudio();
    };
  }, []);

  const reproducirToque = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.baldosaBase);
  }, []);

  useEffect(() => {
    const baldosaActiva = escenaEspacial.baldosas.find(
      (baldosa) => baldosa.estadoVisual === 'activa',
    );

    if (!baldosaActiva || escena.estadoActual.fase !== 'mostrandoPatron') {
      baldosaActivaAnteriorRef.current = null;
      return;
    }

    if (baldosaActivaAnteriorRef.current === baldosaActiva.id) {
      return;
    }

    baldosaActivaAnteriorRef.current = baldosaActiva.id;
    const player =
      baldosaActiva.indice % 2 === 0
        ? audioRef.current.players.baldosaBase
        : audioRef.current.players.baldosaAlta;
    reproducirDesdeInicio(player);
  }, [escena.estadoActual.fase, escenaEspacial.baldosas]);

  useEffect(() => {
    const resultadoVisible = Boolean(escena.resultado.visible);

    if (audioRef.current.players.musicaFondo) {
      audioRef.current.players.musicaFondo.volume = resultadoVisible ? 0.04 : 0.07;
    }

    if (!resultadoVisibleAnteriorRef.current && resultadoVisible) {
      reproducirDesdeInicio(audioRef.current.players.exito);

      if (escena.resultado.mostrarCelebracion) {
        celebracionTimeoutRef.current = setTimeout(() => {
          reproducirDesdeInicio(audioRef.current.players.estrellas);
        }, 220);
      }
    }

    resultadoVisibleAnteriorRef.current = resultadoVisible;
  }, [escena.resultado.mostrarCelebracion, escena.resultado.visible]);

  return {
    reproducirToque,
  };
};
