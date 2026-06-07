import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts, shadows, spacing } from '../../../../constants/theme';
import { ESTADOS_ROBOT_TALLER } from '../robotTaller.constants';

const ROBOT_TALLER_BACKGROUND = '#F4F8FF';
const ROBOT_TALLER_ACCENT = '#1E6FBA';
const ROBOT_TALLER_ACCENT_SOFT = '#D9E8FB';

function Panel({ children, style }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

function Metrica({ etiqueta, valor }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{etiqueta}</Text>
      <Text style={styles.metricValue}>{String(valor)}</Text>
    </View>
  );
}

function PizarronPatron({ patron, piezaActiva }) {
  const posicionActiva = piezaActiva == null
    ? -1
    : patron.findIndex((p) => p === piezaActiva);
  return (
    <View style={styles.patternBoard}>
      {patron.length === 0 ? (
        <Text style={styles.patternEmpty}>El patron aparecera aqui</Text>
      ) : (
        patron.map((indicePieza, posicion) => {
          const encendida = posicion === posicionActiva;
          return (
            <View
              key={`pos-${posicion}`}
              style={[
                styles.patternStep,
                encendida && styles.patternStepActive,
              ]}
            >
              <Text
                style={[
                  styles.patternStepText,
                  encendida && styles.patternStepTextActive,
                ]}
              >
                {posicion + 1}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

function PiezaBoton({ pieza, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={pieza.deshabilitada}
      onPress={() => onPress(pieza.indice)}
      style={[
        styles.piece,
        pieza.activa && styles.pieceActive,
        pieza.colocada && styles.piecePlaced,
        pieza.deshabilitada && styles.pieceDisabled,
      ]}
    >
      <View style={styles.pieceIcon}>
        <Ionicons
          name={pieza.icono}
          size={26}
          color={
            pieza.activa || pieza.colocada
              ? colors.white
              : ROBOT_TALLER_ACCENT
          }
        />
      </View>
      <Text
        style={[
          styles.pieceLabel,
          (pieza.activa || pieza.colocada) && styles.pieceLabelActive,
        ]}
      >
        {pieza.etiqueta}
      </Text>
      {pieza.colocada ? (
        <View style={styles.pieceCheck}>
          <Ionicons name="checkmark-circle" size={18} color={colors.white} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function BloqueResultado({ resultado, onSalir }) {
  if (!resultado.visible) {
    return null;
  }
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <View style={styles.resultIcon}>
          <Ionicons
            name={resultado.mostrarCelebracion ? 'trophy' : 'school'}
            size={28}
            color={colors.white}
          />
        </View>
        <View style={styles.resultHeaderText}>
          <Text style={styles.resultTitle}>{resultado.titulo}</Text>
          <Text style={styles.resultDescription}>{resultado.descripcion}</Text>
        </View>
      </View>

      <View style={styles.resultMetrics}>
        {resultado.metricas.map((metrica) => (
          <Metrica
            key={`res-${metrica.etiqueta}`}
            etiqueta={metrica.etiqueta}
            valor={metrica.valor}
          />
        ))}
      </View>

      <View style={styles.starsRow}>
        {Array.from({ length: resultado.resumenInfantil.estrellasMaximas }).map(
          (_, indiceEstrella) => {
            const prendida =
              indiceEstrella < resultado.resumenInfantil.estrellas;
            return (
              <Ionicons
                key={`star-${indiceEstrella}`}
                name={prendida ? 'star' : 'star-outline'}
                size={26}
                color={prendida ? colors.yellow : colors.muted}
              />
            );
          },
        )}
        {!resultado.resumenInfantil.estrellasSincronizadas ? (
          <Text style={styles.starPending}>Guardando estrellas...</Text>
        ) : null}
      </View>

      <Text style={styles.progressMessage}>{resultado.mensajeProgreso}</Text>

      {Array.isArray(resultado.logros) && resultado.logros.length > 0 ? (
        <View style={styles.achievementsBox}>
          <Text style={styles.achievementsTitle}>Logros desbloqueados</Text>
          {resultado.logros.map((logro) => (
            <Text key={logro.id ?? logro.nombre_logro} style={styles.achievementItem}>
              {logro.nombre_logro}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.resultActions}>
        {resultado.accionContinuar ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={resultado.accionContinuar}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {resultado.etiquetaContinuar ?? 'Continuar'}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={resultado.accionSalir ?? onSalir}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {resultado.etiquetaSalir ?? 'Volver'}
          </Text>
        </TouchableOpacity>
        {resultado.sincronizandoCierre ? (
          <View style={styles.syncBadge}>
            <ActivityIndicator color={colors.white} size="small" />
            <Text style={styles.syncBadgeText}>Sincronizando resultados</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function RobotTallerVista({
  onSalir,
  escena,
  estado,
  configuracion,
}) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!escena.salida.permitida}
              onPress={onSalir}
              style={[
                styles.exitButton,
                !escena.salida.permitida && styles.exitButtonDisabled,
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={escena.salida.permitida ? colors.purpleDark : colors.muted}
              />
              <Text
                style={[
                  styles.exitButtonText,
                  !escena.salida.permitida && styles.exitButtonTextDisabled,
                ]}
              >
                {escena.salida.etiqueta}
              </Text>
            </TouchableOpacity>
            <View style={styles.skillBadge}>
              <Ionicons name="construct" size={16} color={colors.white} />
              <Text style={styles.skillBadgeText}>
                {configuracion.habilidad}
              </Text>
            </View>
          </View>

          <Panel>
            <Text style={styles.eyebrow}>{escena.encabezado.ceja}</Text>
            <Text style={styles.title}>{escena.encabezado.titulo}</Text>
            <Text style={styles.subtitle}>{escena.encabezado.subtitulo}</Text>
            <View style={styles.metricsRow}>
              {escena.sesion.metricas.map((metrica) => (
                <Metrica
                  key={`sesion-${metrica.etiqueta}`}
                  etiqueta={metrica.etiqueta}
                  valor={metrica.valor}
                />
              ))}
            </View>
            {escena.sesion.errorPersistencia ? (
              <Text style={styles.errorText}>
                {escena.sesion.errorPersistencia}
              </Text>
            ) : null}
          </Panel>

          <Panel>
            <Text style={styles.sectionTitle}>{escena.estadoActual.titulo}</Text>
            <Text style={styles.statusMessage}>{escena.estadoActual.mensaje}</Text>
            <Text style={styles.statusDescription}>
              {escena.estadoActual.descripcion}
            </Text>
            <View style={styles.metricsRow}>
              {escena.estadoActual.metricas.map((metrica) => (
                <Metrica
                  key={`estado-${metrica.etiqueta}`}
                  etiqueta={metrica.etiqueta}
                  valor={metrica.valor}
                />
              ))}
            </View>
          </Panel>

          {estado.fase === ESTADOS_ROBOT_TALLER.mostrandoPatron ? (
            <Panel>
              <Text style={styles.sectionTitle}>Patron en curso</Text>
              <Text style={styles.helperText}>
                Observa la posicion {estado.indiceRespuesta + 1} de {estado.patron.length}.
              </Text>
              <PizarronPatron
                patron={estado.patron}
                piezaActiva={estado.piezaActiva}
              />
            </Panel>
          ) : null}

          <Panel>
            <Text style={styles.sectionTitle}>{escena.tablero.titulo}</Text>
            <Text style={styles.helperText}>{escena.tablero.descripcion}</Text>
            <View style={styles.piecesGrid}>
              {escena.tablero.piezas.map((pieza) => (
                <PiezaBoton
                  key={pieza.id}
                  pieza={pieza}
                  onPress={escena.tablero.alSeleccionarPieza}
                />
              ))}
            </View>
          </Panel>

          {escena.acciones.mostrarControlesPrincipales ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={escena.acciones.iniciar.accion}
                disabled={escena.acciones.iniciar.deshabilitada}
                style={[
                  styles.primaryButton,
                  escena.acciones.iniciar.deshabilitada &&
                    styles.primaryButtonDisabled,
                ]}
              >
                {escena.acciones.iniciar.etiqueta === 'Preparando...' ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : null}
                <Text style={styles.primaryButtonText}>
                  {escena.acciones.iniciar.etiqueta}
                </Text>
                <Ionicons name="construct" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          ) : null}

          <BloqueResultado
            resultado={escena.resultado}
            onSalir={onSalir}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ROBOT_TALLER_BACKGROUND },
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...shadows.soft,
  },
  exitButtonDisabled: { opacity: 0.7 },
  exitButtonText: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  exitButtonTextDisabled: { color: colors.muted },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ROBOT_TALLER_ACCENT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillBadgeText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 11,
  },
  panel: {
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.soft,
  },
  eyebrow: {
    color: ROBOT_TALLER_ACCENT,
    fontFamily: fonts.black,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 22,
    lineHeight: 27,
  },
  subtitle: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 15,
  },
  statusMessage: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 14,
    lineHeight: 19,
  },
  statusDescription: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metric: {
    minWidth: 80,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: ROBOT_TALLER_ACCENT_SOFT,
  },
  metricLabel: {
    color: ROBOT_TALLER_ACCENT,
    fontFamily: fonts.semiBold,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  helperText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
  },
  patternBoard: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  patternStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternStepActive: {
    backgroundColor: colors.yellow,
  },
  patternStepText: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  patternStepTextActive: {
    color: colors.purpleDark,
  },
  patternEmpty: {
    color: colors.muted,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
  piecesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  piece: {
    width: '31%',
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: ROBOT_TALLER_ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  pieceActive: {
    backgroundColor: ROBOT_TALLER_ACCENT,
    borderColor: ROBOT_TALLER_ACCENT,
  },
  piecePlaced: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  pieceDisabled: {
    opacity: 0.55,
  },
  pieceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ROBOT_TALLER_ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceLabel: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 10,
    textAlign: 'center',
  },
  pieceLabelActive: {
    color: colors.white,
  },
  pieceCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: ROBOT_TALLER_ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.soft,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  resultCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.soft,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ROBOT_TALLER_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultHeaderText: { flex: 1 },
  resultTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 19,
    lineHeight: 24,
  },
  resultDescription: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  resultMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  starPending: {
    color: colors.muted,
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
  progressMessage: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  achievementsBox: {
    backgroundColor: ROBOT_TALLER_ACCENT_SOFT,
    borderRadius: 14,
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
  achievementsTitle: {
    color: ROBOT_TALLER_ACCENT,
    fontFamily: fonts.black,
    fontSize: 12,
    marginBottom: 4,
  },
  achievementItem: {
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
  resultActions: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ROBOT_TALLER_ACCENT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  syncBadgeText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  errorText: {
    color: colors.danger,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
});
