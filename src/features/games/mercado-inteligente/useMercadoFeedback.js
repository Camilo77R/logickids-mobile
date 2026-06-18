import { useCallback, useEffect, useRef } from 'react';
import { AppState, Vibration } from 'react-native';

const AUDIO_SOURCES = Object.freeze({
  musicaFondo: require('../../../../assets/audio/mercado-3d/mercado-musica-loop.wav'),
  toque: require('../../../../assets/audio/mercado-3d/mercado-toque.wav'),
  ajuste: require('../../../../assets/audio/mercado-3d/mercado-ajuste.wav'),
  exito: require('../../../../assets/audio/mercado-3d/mercado-exito.wav'),
  estrellas: require('../../../../assets/audio/mercado-3d/mercado-estrella.wav'),
});

const createNoopFeedback = () => ({
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
    // El feedback nunca debe bloquear el juego si el audio falla.
  }
};

const liberarPlayer = (player) => {
  try {
    player?.pause?.();
    player?.release?.();
  } catch {
    // Cierre defensivo: el audio acompaña, pero no manda sobre el juego.
  }
};

const crearFeedbackSeguro = () => {
  try {
    if (!hasNativeAudioModule()) {
      return createNoopFeedback();
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
        keepAudioSessionActive: false,
      }),
      toque: createAudioPlayer(AUDIO_SOURCES.toque, {
        keepAudioSessionActive: true,
      }),
      ajuste: createAudioPlayer(AUDIO_SOURCES.ajuste, {
        keepAudioSessionActive: true,
      }),
      exito: createAudioPlayer(AUDIO_SOURCES.exito, {
        keepAudioSessionActive: true,
      }),
      estrellas: createAudioPlayer(AUDIO_SOURCES.estrellas, {
        keepAudioSessionActive: true,
      }),
    };

    players.musicaFondo.loop = true;
    players.musicaFondo.volume = 0.055;
    players.musicaFondo.play?.();
    players.toque.volume = 0.32;
    players.ajuste.volume = 0.24;
    players.exito.volume = 0.46;
    players.estrellas.volume = 0.38;

    return {
      disponible: true,
      players,
    };
  } catch {
    return createNoopFeedback();
  }
};

const vibrarSeguro = (patron) => {
  try {
    Vibration.vibrate(patron);
  } catch {
    // Algunos dispositivos deshabilitan vibracion; no es error de juego.
  }
};

export const useMercadoFeedback = () => {
  const feedbackRef = useRef(createNoopFeedback());
  const estrellasTimeoutRef = useRef(null);

  useEffect(() => {
    feedbackRef.current = crearFeedbackSeguro();

    const appStateSubscription = AppState.addEventListener('change', (estadoApp) => {
      const musicaFondo = feedbackRef.current.players.musicaFondo;

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
      if (estrellasTimeoutRef.current) {
        clearTimeout(estrellasTimeoutRef.current);
      }

      Object.values(feedbackRef.current.players).forEach(liberarPlayer);
      feedbackRef.current = createNoopFeedback();
    };
  }, []);

  const reproducirToque = useCallback(() => {
    vibrarSeguro(18);
    reproducirDesdeInicio(feedbackRef.current.players.toque);
  }, []);

  const reproducirAjuste = useCallback(() => {
    vibrarSeguro([0, 30, 30, 30]);
    reproducirDesdeInicio(feedbackRef.current.players.ajuste);
  }, []);

  const reproducirExito = useCallback(() => {
    vibrarSeguro([0, 45, 35, 70]);
    reproducirDesdeInicio(feedbackRef.current.players.exito);

    if (estrellasTimeoutRef.current) {
      clearTimeout(estrellasTimeoutRef.current);
    }

    estrellasTimeoutRef.current = setTimeout(() => {
      reproducirDesdeInicio(feedbackRef.current.players.estrellas);
    }, 210);
  }, []);

  return {
    reproducirToque,
    reproducirAjuste,
    reproducirExito,
  };
};


