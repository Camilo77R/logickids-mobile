import { useCallback, useEffect, useRef } from 'react';

const AUDIO_SOURCES = Object.freeze({
  seleccion: require('../../../../assets/audio/mercado-3d/mercado-toque.wav'),
  desbloqueo: require('../../../../assets/audio/mercado-3d/mercado-ajuste.wav'),
  acierto: require('../../../../assets/audio/mercado-3d/mercado-estrella.wav'),
  nivel: require('../../../../assets/audio/camino-ar/camino-turno-chime.wav'),
  final: require('../../../../assets/audio/camino-ar/camino-exito-sparkle.wav'),
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
      nivel: createAudioPlayer(AUDIO_SOURCES.nivel, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
      final: createAudioPlayer(AUDIO_SOURCES.final, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      }),
    };

    players.seleccion.volume = 0.24;
    players.desbloqueo.volume = 0.33;
    players.acierto.volume = 0.3;
    players.nivel.volume = 0.28;
    players.final.volume = 0.42;

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
} = {}) {
  const audioRef = useRef(createNoopAudio());
  const contadorPrevioRef = useRef(estado?.contadorEnsambladas ?? 0);
  const mensajePrevioRef = useRef(estado?.mensaje ?? '');
  const problemaPrevioRef = useRef(problemaMatematico?.timestamp ?? null);
  const resultadoPrevioRef = useRef(Boolean(resultadoVisible));

  useEffect(() => {
    audioRef.current = crearAudioSeguro();

    return () => {
      Object.values(audioRef.current.players).forEach(detenerPlayer);
      audioRef.current = createNoopAudio();
    };
  }, []);

  useEffect(() => {
    const contadorActual = estado?.contadorEnsambladas ?? 0;
    const contadorPrevio = contadorPrevioRef.current;

    if (contadorActual > contadorPrevio) {
      if (estado?.resultado || mostrarCelebracion) {
        reproducirDesdeInicio(audioRef.current.players.final);
      } else {
        reproducirDesdeInicio(audioRef.current.players.acierto);
      }
    }

    contadorPrevioRef.current = contadorActual;
  }, [estado?.contadorEnsambladas, estado?.resultado, mostrarCelebracion]);

  useEffect(() => {
    const mensajeActual = estado?.mensaje ?? '';
    const mensajePrevio = mensajePrevioRef.current;

    if (mensajeActual !== mensajePrevio && mensajeActual.includes('Pieza desbloqueada')) {
      reproducirDesdeInicio(audioRef.current.players.desbloqueo);
    }

    mensajePrevioRef.current = mensajeActual;
  }, [estado?.mensaje]);

  useEffect(() => {
    const problemaActual = problemaMatematico?.timestamp ?? null;

    if (
      mostrarModalMatematica &&
      problemaActual &&
      problemaActual !== problemaPrevioRef.current
    ) {
      reproducirDesdeInicio(audioRef.current.players.nivel);
    }

    problemaPrevioRef.current = problemaActual;
  }, [mostrarModalMatematica, problemaMatematico?.timestamp]);

  useEffect(() => {
    const resultadoActual = Boolean(resultadoVisible);

    if (resultadoActual && !resultadoPrevioRef.current) {
      reproducirDesdeInicio(
        mostrarCelebracion
          ? audioRef.current.players.final
          : audioRef.current.players.nivel,
      );
    }

    resultadoPrevioRef.current = resultadoActual;
  }, [mostrarCelebracion, resultadoVisible]);

  const reproducirSeleccion = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.seleccion);
  }, []);

  const reproducirDesbloqueo = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.desbloqueo);
  }, []);

  const reproducirNivel = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.nivel);
  }, []);

  const reproducirFinal = useCallback(() => {
    reproducirDesdeInicio(audioRef.current.players.final);
  }, []);

  return {
    reproducirSeleccion,
    reproducirDesbloqueo,
    reproducirNivel,
    reproducirFinal,
  };
}
