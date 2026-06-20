import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../../constants/theme';
import { DATOS_FUNCION_PIEZA } from '../robotTaller.constants';

function TarjetaOpcion({ opcion, onPress, feedback }) {
  const escala = useRef(new Animated.Value(1)).current;
  const brillo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (feedback?.parteId === opcion.id && feedback.tipo === 'error') {
      escala.setValue(1);
      Animated.sequence([
        Animated.timing(escala, { toValue: 0.92, duration: 60, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1.08, duration: 60, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 0.94, duration: 60, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1, duration: 60, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(brillo, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(brillo, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [feedback?.timestamp, opcion.id]);

  const bgColor = brillo.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', 'rgba(255,80,80,0.3)'],
  });

  const deshabilitada = feedback?.tipo === 'correcto';

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: escala }], backgroundColor: bgColor }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => !deshabilitada && onPress(opcion.id)} style={styles.cardTouch}>
        <View style={[styles.colorDot, { backgroundColor: opcion.color }]} />
        <View style={styles.cardText}>
          <Text style={styles.cardNombre}>{opcion.nombre}</Text>
          <Text style={styles.cardFuncion}>{opcion.funcionDesc}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function QuizOverlay({ pregunta, feedback, onResponder, partesEnsambladas, totalPiezas }) {
  if (!pregunta) return null;
  
  const skillInfo = pregunta?.funcionNecesaria ? {
    funcion: pregunta.funcionNecesaria,
    descripcion: DATOS_FUNCION_PIEZA[pregunta.parteCorrectaId]?.descripcion ?? '',
  } : null;
  
  const skillIcon = skillInfo ? (
    skillInfo.funcion.includes('gira') ? 'sync' :
    skillInfo.funcion.includes('sostiene') ? 'hand-right' :
    skillInfo.funcion.includes('conecta') ? 'link' :
    skillInfo.funcion.includes('presiona') ? 'cube' :
    skillInfo.funcion.includes('mueve') ? 'play' : 'construct'
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        <Text style={styles.progressText}>{partesEnsambladas} de {totalPiezas}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(partesEnsambladas / totalPiezas) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.cuestion}>
        <Text style={styles.pregunta}>¿Qué pieza va en el lugar señalado?</Text>
        {pregunta.funcionNecesaria ? (
          <Text style={styles.pista}>Necesito una pieza que {pregunta.funcionNecesaria}</Text>
        ) : (
          <Text style={styles.pista}>Toca la pieza correcta para colocarla en el robot</Text>
        )}
      </View>
      
      {skillInfo && (
        <View style={styles.skillTooltip}>
          <View style={styles.skillHeader}>
            <Ionicons name={skillIcon} size={16} color={colors.white} />
            <Text style={styles.skillTitle}>¿Qué hace esta pieza?</Text>
          </View>
          <Text style={styles.skillDescripcion}>{skillInfo.descripcion}</Text>
        </View>
      )}

      <ScrollView style={styles.opcionesScroll} contentContainerStyle={styles.opciones} showsVerticalScrollIndicator={false}>
        {pregunta.opciones.map((op) => (
          <TarjetaOpcion key={op.id} opcion={op} onPress={onResponder} feedback={feedback} />
        ))}
      </ScrollView>

      {feedback && (
        <View style={[styles.feedback, feedback.tipo === 'correcto' ? styles.feedbackBien : styles.feedbackMal]}>
          <Text style={styles.feedbackIcon}>{feedback.tipo === 'correcto' ? '✓' : '✗'}</Text>
          <Text style={styles.feedbackText}>{feedback.mensaje}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 100, paddingHorizontal: 16, gap: 8,
    maxHeight: '60%',
  },
  progress: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  progressText: {
    color: colors.white, fontFamily: fonts.black, fontSize: 12, minWidth: 40,
  },
  progressBar: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#00E676', borderRadius: 3,
  },
  cuestion: {
    alignItems: 'center', gap: 2,
  },
  pregunta: {
    color: colors.white, fontFamily: fonts.black, fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  pista: {
    color: 'rgba(255,255,255,0.7)', fontFamily: fonts.semiBold, fontSize: 12,
  },
  opcionesScroll: {
    maxHeight: 280,
  },
  opciones: {
    gap: 8,
  },
  card: {
    borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTouch: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  colorDot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  cardText: {
    flex: 1,
  },
  cardNombre: {
    color: colors.white, fontFamily: fonts.black, fontSize: 15,
  },
  cardFuncion: {
    color: 'rgba(255,255,255,0.6)', fontFamily: fonts.semiBold, fontSize: 11, marginTop: 1,
  },
  feedback: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
  },
  feedbackBien: {
    backgroundColor: 'rgba(0,230,118,0.2)', borderWidth: 1, borderColor: 'rgba(0,230,118,0.4)',
  },
  feedbackMal: {
    backgroundColor: 'rgba(255,80,80,0.2)', borderWidth: 1, borderColor: 'rgba(255,80,80,0.4)',
  },
  feedbackIcon: {
    color: colors.white, fontFamily: fonts.black, fontSize: 18, width: 24, textAlign: 'center',
  },
  feedbackText: {
    color: colors.white, fontFamily: fonts.semiBold, fontSize: 13, flex: 1,
  },
  skillTooltip: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  skillTitle: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 14,
    flex: 1,
  },
  skillDescripcion: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
});
