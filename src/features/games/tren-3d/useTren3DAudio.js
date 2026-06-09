import { useCallback, useEffect, useRef } from 'react';

const AUDIO_SOURCES = Object.freeze({
  seleccion: require('../../../../assets/audio/tren-3d/tren-seleccion.mp3'),
  acierto: require('../../../../assets/audio/tren-3d/tren-acierto.mp3'),
  error: require('../../../../assets/audio/tren-3d/tren-error.mp3'),
  nivel: require('../../../../assets/audio/tren-3d/tren-nivel.mp3'),
  final: require('../../../../assets/audio/tren-3d/tren-final.mp3'),
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
    // Los sonidos acompanan el juego, pero nunca deben bloquear la partida.
  }
};

const detenerPlayer = (player) => {
  try {
    player?.pause?.();
    player?.release?.();
  } catch {
    // Cierre defensivo del audio.
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
      seleccion: createAudioPlayer(AUDIO_SOURCES.seleccion, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
      acierto: createAudioPlayer(AUDIO_SOURCES.acierto, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
      error: createAudioPlayer(AUDIO_SOURCES.error, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
      nivel: createAudioPlayer(AUDIO_SOURCES.nivel, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
      final: createAudioPlayer(AUDIO_SOURCES.final, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
    };

    players.seleccion.volume = 0.45;
    players.acierto.volume = 0.58;
    players.error.volume = 0.46;
    players.nivel.volume = 0.55;
    players.final.volume = 0.56;

    return {
      disponible: true,
      players,
    };
  } catch {
    return createNoopAudio();
  }
};

export const useTren3DAudio = () => {
  const audioRef = useRef(createNoopAudio());

  useEffect(() => {
    audioRef.current = crearAudioSeguro();

    return () => {
      Object.values(audioRef.current.players).forEach(detenerPlayer);
      audioRef.current = createNoopAudio();
    };
  }, []);

  const reproducirSeleccion = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.seleccion);
  }, []);

  const reproducirAcierto = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.acierto);
  }, []);

  const reproducirError = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.error);
  }, []);

  const reproducirNivel = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.nivel);
  }, []);

  const reproducirFinal = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.final);
  }, []);

  return {
    reproducirSeleccion,
    reproducirAcierto,
    reproducirError,
    reproducirNivel,
    reproducirFinal,
  };
};
