import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../../constants/theme';
import { PARTES_ROBOT, PIEZAS_ALTERNATIVAS, DATOS_FUNCION_PIEZA } from '../robotTaller.constants';

export default function MathChallengeModal({
  problema,
  visible,
  onCorrectAnswer,
  onIncorrectAnswer,
  onClose,
}) {
  const [respuestaUsuario, setRespuestaUsuario] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [intentos, setIntentos] = useState(0);
  const escala = useRef(new Animated.Value(1)).current;
  const firmaProblema = [
    problema?.idParte ?? 'sin-parte',
    problema?.operador ?? 'sin-operador',
    problema?.a ?? 'sin-a',
    problema?.b ?? 'sin-b',
    problema?.respuesta ?? 'sin-respuesta',
  ].join('-');

  useEffect(() => {
    if (visible) {
      setRespuestaUsuario('');
      setFeedback(null);
      setIntentos(0);
      Animated.sequence([
        Animated.timing(escala, { toValue: 1.1, duration: 300, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [escala, firmaProblema, visible]);

  const sanitizarRespuesta = (texto) => texto.replace(/[^\d]/g, '').slice(0, 3);

  const manejarRespuesta = () => {
    if (!problema || feedback?.tipo === 'correcto') return;

    const respuestaLimpia = respuestaUsuario.trim();
    if (!respuestaLimpia) return;

    if (!/^\d+$/.test(respuestaLimpia)) {
      setFeedback({ tipo: 'error', mensaje: 'Escribe solo numeros.' });
      return;
    }

    const respuestaCorrecta = parseInt(respuestaLimpia, 10);
    const correcta = respuestaCorrecta === problema.respuesta;

    if (correcta) {
      setFeedback({ tipo: 'correcto', mensaje: 'Correcto! La pieza esta desbloqueada.' });
      setTimeout(() => {
        onCorrectAnswer?.(problema.idParte);
      }, 700);
      return;
    }

    const intentosSiguientes = intentos + 1;
    setIntentos(intentosSiguientes);
    setRespuestaUsuario('');
    onIncorrectAnswer?.({
      idParte: problema.idParte,
      attempts: intentosSiguientes,
      exhausted: intentosSiguientes >= 3,
    });

    if (intentosSiguientes >= 3) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Intentemos otra cuenta para desbloquear esta pieza.',
      });
      return;
    }

    setFeedback({ tipo: 'error', mensaje: 'Incorrecto. Intenta de nuevo.' });
  };

  const puedeResponder = Boolean(respuestaUsuario.trim()) && feedback?.tipo !== 'correcto';

  const parteActual = useMemo(() =>
    PARTES_ROBOT.find(p => p.id === problema?.idParte)
      ?? PIEZAS_ALTERNATIVAS.find(p => p.id === problema?.idParte)
      ?? null,
    [problema?.idParte]
  );
  const funcionParte = useMemo(() =>
    problema?.idParte ? DATOS_FUNCION_PIEZA[problema.idParte] : null,
    [problema?.idParte]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        onClose?.();
      }}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContainer, { transform: [{ scale: escala }] }]}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="star" size={28} color="#FFD166" />
            </View>
            <Text style={styles.titulo}>¡Desbloqueá la pieza: {parteActual?.nombre ?? 'misteriosa'}!</Text>
          </View>

          {parteActual && (
            <View style={styles.piezaInfo}>
              <View style={[styles.colorSwatch, { backgroundColor: parteActual.color }]} />
              <View style={styles.piezaTextContainer}>
                <Text style={styles.piezaNombre}>{parteActual.nombre}</Text>
                {funcionParte && (
                  <Text style={styles.piezaFuncion}>Sirve para {funcionParte.funcion}</Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.problemaContainer}>
            <Text style={styles.instruccion}>¡Resuelve la cuenta para ganarte esta pieza!</Text>
            <View style={styles.equacionContainer}>
              <View style={styles.numberBox}><Text style={styles.numero}>{problema?.a}</Text></View>
              <Text style={styles.operador}>{problema?.operador}</Text>
              <View style={styles.numberBox}><Text style={styles.numero}>{problema?.b}</Text></View>
              <Text style={styles.igualdad}>=</Text>
              <Text style={styles.respuestaInput}>
                {feedback?.tipo === 'correcto' ? problema?.respuesta : '?'}
              </Text>
            </View>

            {feedback?.tipo !== 'correcto' ? (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={respuestaUsuario}
                  onChangeText={(texto) => setRespuestaUsuario(sanitizarRespuesta(texto))}
                  onSubmitEditing={manejarRespuesta}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholder="Escribe aquí"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  returnKeyType="done"
                />
              </View>
            ) : null}
          </View>

          {feedback ? (
            <View
              style={[
                styles.feedbackContainer,
                feedback.tipo === 'correcto' ? styles.feedbackCorrecto : styles.feedbackIncorrecto,
              ]}
            >
              <Text style={styles.feedbackIcon}>{feedback.tipo === 'correcto' ? '🎉' : '🤔'}</Text>
              <Text style={styles.feedbackText}>{feedback.mensaje}</Text>
            </View>
          ) : null}

          {feedback?.tipo === 'correcto' || intentos >= 3 ? null : (
            <TouchableOpacity
              style={[styles.boton, !puedeResponder && styles.botonInactivo]}
              onPress={manejarRespuesta}
              disabled={!puedeResponder}
              activeOpacity={0.8}
            >
              <Text style={styles.botonTexto}>¡Comprobar!</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#8338EC', // Vibrant purple
    borderRadius: 30,
    borderWidth: 6,
    borderColor: '#FFBE0B', // Bright yellow border
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 30,
    padding: 8,
  },
  titulo: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 22,
    flex: 1,
    textAlign: 'left',
  },
  problemaContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 15,
  },
  instruccion: {
    color: '#FFBE0B',
    fontFamily: fonts.bold,
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  equacionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  numberBox: {
    backgroundColor: '#FF006E', // vibrant pink
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  numero: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 32,
    textAlign: 'center',
  },
  operador: {
    color: '#FFBE0B',
    fontFamily: fonts.black,
    fontSize: 32,
  },
  igualdad: {
    color: '#FFBE0B',
    fontFamily: fonts.black,
    fontSize: 32,
    marginHorizontal: 4,
  },
  respuestaInput: {
    color: '#00F5D4',
    fontFamily: fonts.black,
    fontSize: 38,
    minWidth: 60,
    textAlign: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#00F5D4',
  },
  inputContainer: {
    marginTop: 15,
    width: '80%',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 15,
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 28,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#FFBE0B',
    minHeight: 60,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 15,
    marginVertical: 15,
  },
  feedbackCorrecto: {
    backgroundColor: '#06D6A0', // vibrant green
    borderWidth: 2,
    borderColor: colors.white,
  },
  feedbackIncorrecto: {
    backgroundColor: '#EF476F', // vibrant red
    borderWidth: 2,
    borderColor: colors.white,
  },
  feedbackIcon: {
    fontSize: 24,
    width: 30,
    textAlign: 'center',
  },
  feedbackText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 16,
    flex: 1,
  },
  boton: {
    backgroundColor: '#3A86FF', // vibrant blue
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  botonInactivo: {
    backgroundColor: 'rgba(58,134,255,0.4)',
    borderColor: 'transparent',
    elevation: 0,
  },
  botonTexto: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 20,
    textTransform: 'uppercase',
  },
  piezaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.white,
  },
  piezaTextContainer: {
    flex: 1,
  },
  piezaNombre: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  piezaFuncion: {
    color: '#00F5D4',
    fontFamily: fonts.bold,
    fontSize: 14,
    marginTop: 2,
  },
});
