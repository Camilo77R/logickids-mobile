import { useCallback, useEffect, useRef } from 'react';
import { Vibration } from 'react-native';

const AUDIO_SOURCES = Object.freeze({
  seleccion: require('../../../../assets/audio/tren-3d/tren-seleccion.mp3'),
  desbloqueo: require('../../../../assets/audio/mercado-3d/mercado-ajuste.wav'),
  acierto: require('../../../../assets/audio/mercado-3d/mercado-exito.wav'),
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
    // El audio acompana, pero nunca debe romper la partida.
  }
};

const detenerPlayer = (player) => {
  try {
    player?.pause?.();
    player?.release?.();
  } catch {
    // Cierre defensivo.
  }
};

const vibrarSeguro = (patron) => {
  try {
    Vibration.vibrate(patron);
  } catch {
    // Algunos dispositivos no permiten vibracion.
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
      desbloqueo: createAudioPlayer(AUDIO_SOURCES.desbloqueo, {
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

    players.seleccion.volume = 0.34;
    players.desbloqueo.volume = 0.4;
    players.acierto.volume = 0.48;
    players.error.volume = 0.42;
    players.nivel.volume = 0.48;
    players.final.volume = 0.5;

    return {
      disponible: true,
      players,
    };
  } catch {
    return createNoopAudio();
  }
};

export function useRobotTallerAudio({
  estado,
  mostrarModalMatematica,
  problemaMatematico,
  resultadoVisible,
  mostrarCelebracion,
}) {
  const audioRef = useRef(createNoopAudio());
  const contadorAnteriorRef = useRef(estado.contadorEnsambladas);
  const erroresAnteriorRef = useRef(estado.erroresAcumulados);
  const modalVisibleAnteriorRef = useRef(false);
  const resultadoVisibleAnteriorRef = useRef(Boolean(resultadoVisible));

  useEffect(() => {
    audioRef.current = crearAudioSeguro();

    return () => {
      Object.values(audioRef.current.players).forEach(detenerPlayer);
      audioRef.current = createNoopAudio();
    };
  }, []);

  const reproducirSeleccion = useCallback(() => {
    vibrarSeguro(16);
    reproducirDesdeInicio(audioRef.current.players.seleccion);
  }, []);

  const reproducirDesbloqueo = useCallback(() => {
    vibrarSeguro([0, 22, 30, 26]);
    reproducirDesdeInicio(audioRef.current.players.desbloqueo);
  }, []);

  const reproducirAcierto = useCallback(() => {
    vibrarSeguro([0, 28, 26, 46]);
    reproducirDesdeInicio(audioRef.current.players.acierto);
  }, []);

  const reproducirError = useCallback(() => {
    vibrarSeguro([0, 24, 30, 24]);
    reproducirDesdeInicio(audioRef.current.players.error);
  }, []);

  const reproducirNivel = useCallback(() => {
    vibrarSeguro([0, 30, 35, 55]);
    reproducirDesdeInicio(audioRef.current.players.nivel);
  }, []);

  const reproducirFinal = useCallback(() => {
    vibrarSeguro([0, 40, 35, 65]);
    reproducirDesdeInicio(audioRef.current.players.final);
  }, []);

  useEffect(() => {
    const modalVisible = Boolean(mostrarModalMatematica && problemaMatematico);
    if (!modalVisibleAnteriorRef.current && modalVisible) {
      reproducirDesbloqueo();
    }
    modalVisibleAnteriorRef.current = modalVisible;
  }, [mostrarModalMatematica, problemaMatematico, reproducirDesbloqueo]);

  useEffect(() => {
    if (estado.contadorEnsambladas > contadorAnteriorRef.current) {
      reproducirAcierto();
    }
    contadorAnteriorRef.current = estado.contadorEnsambladas;
  }, [estado.contadorEnsambladas, reproducirAcierto]);

  useEffect(() => {
    if (estado.erroresAcumulados > erroresAnteriorRef.current) {
      reproducirError();
    }
    erroresAnteriorRef.current = estado.erroresAcumulados;
  }, [estado.erroresAcumulados, reproducirError]);

  useEffect(() => {
    const hayResultadoVisible = Boolean(resultadoVisible);
    if (!resultadoVisibleAnteriorRef.current && hayResultadoVisible) {
      if (mostrarCelebracion) {
        reproducirFinal();
      } else {
        reproducirNivel();
      }
    }
    resultadoVisibleAnteriorRef.current = hayResultadoVisible;
  }, [mostrarCelebracion, reproducirFinal, reproducirNivel, resultadoVisible]);

  return {
    reproducirSeleccion,
    reproducirDesbloqueo,
    reproducirNivel,
    reproducirFinal,
  };
}
