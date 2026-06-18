import { useCallback, useEffect, useRef } from 'react';
import { AppState, Vibration } from 'react-native';

const AUDIO_SOURCES = Object.freeze({
  musicaFondo: require('../../../../assets/audio/camino-ar/camino-memoria-loop.wav'),
  baldosa: require('../../../../assets/audio/camino-ar/camino-baldosa-chime.wav'),
  turno: require('../../../../assets/audio/camino-ar/camino-turno-chime.wav'),
  exito: require('../../../../assets/audio/camino-ar/camino-exito-sparkle.wav'),
  estrellas: require('../../../../assets/audio/camino-ar/camino-estrellas-sparkle.wav'),
});

const AUDIO_CONFIG = Object.freeze({
  volumenMusica: 0.42,
  volumenMusicaResultado: 0.2,
  volumenBaldosa: 0.95,
  volumenTurno: 0.9,
  volumenExito: 0.9,
  volumenEstrellas: 0.86,
  variacionTonoBaldosa: [1, 1.08, 1.16, 1.25, 1.34, 1.42],
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

const vibrarSeguro = (patron) => {
  try {
    Vibration.vibrate(patron);
  } catch {
    // Algunos dispositivos no permiten vibracion; el juego sigue funcionando.
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
      baldosa: createAudioPlayer(AUDIO_SOURCES.baldosa, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
      turno: createAudioPlayer(AUDIO_SOURCES.turno, {
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
    players.musicaFondo.volume = AUDIO_CONFIG.volumenMusica;
    players.baldosa.volume = AUDIO_CONFIG.volumenBaldosa;
    players.turno.volume = AUDIO_CONFIG.volumenTurno;
    players.exito.volume = AUDIO_CONFIG.volumenExito;
    players.estrellas.volume = AUDIO_CONFIG.volumenEstrellas;
    players.musicaFondo.play?.();

    return {
      disponible: true,
      players,
    };
  } catch {
    return createNoopAudio();
  }
};

export const useCaminoArAudio = ({ escena }) => {
  const audioRef = useRef(createNoopAudio());
  const baldosaActivaAnteriorRef = useRef(undefined);
  const resultadoVisibleAnteriorRef = useRef(false);
  const faseAnteriorRef = useRef(null);
  const celebracionTimeoutRef = useRef(null);

  useEffect(() => {
    audioRef.current = crearAudioSeguro();

    const appStateSubscription = AppState.addEventListener('change', (estadoApp) => {
      const musicaFondo = audioRef.current.players.musicaFondo;

      if (!musicaFondo) {
        return;
      }

      if (estadoApp === 'active') {
        musicaFondo.play?.();
        return;
      }

      musicaFondo.pause?.();
    });

    return () => {
      appStateSubscription.remove?.();

      if (celebracionTimeoutRef.current) {
        clearTimeout(celebracionTimeoutRef.current);
      }

      Object.values(audioRef.current.players).forEach(detenerPlayer);
      audioRef.current = createNoopAudio();
    };
  }, []);

  const reproducirToque = useCallback(() => {
    vibrarSeguro(18);
    reproducirDesdeInicio(audioRef.current.players.baldosa);
  }, []);

  useEffect(() => {
    const baldosaActiva = escena.estadoActual.baldosaActiva;

    if (escena.estadoActual.fase !== 'mostrandoPatron') {
      baldosaActivaAnteriorRef.current = undefined;
      return;
    }

    if (baldosaActiva == null) {
      return;
    }

    if (baldosaActivaAnteriorRef.current === baldosaActiva) {
      return;
    }

    baldosaActivaAnteriorRef.current = baldosaActiva;
    const player = audioRef.current.players.baldosa;

    if (player) {
      const rate =
        AUDIO_CONFIG.variacionTonoBaldosa[
          baldosaActiva % AUDIO_CONFIG.variacionTonoBaldosa.length
        ];
      player.playbackRate = rate;
    }

    reproducirDesdeInicio(player);
  }, [escena.estadoActual.baldosaActiva, escena.estadoActual.fase]);

  useEffect(() => {
    const faseActual = escena.estadoActual.fase;
    const faseAnterior = faseAnteriorRef.current;

    if (faseAnterior === 'mostrandoPatron' && faseActual === 'esperandoRespuesta') {
      vibrarSeguro([0, 24, 28, 42]);
      reproducirDesdeInicio(audioRef.current.players.turno);
    }

    faseAnteriorRef.current = faseActual;
  }, [escena.estadoActual.fase]);

  useEffect(() => {
    const resultadoVisible = Boolean(escena.resultado.visible);

    if (audioRef.current.players.musicaFondo) {
      audioRef.current.players.musicaFondo.volume = resultadoVisible
        ? AUDIO_CONFIG.volumenMusicaResultado
        : AUDIO_CONFIG.volumenMusica;
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
