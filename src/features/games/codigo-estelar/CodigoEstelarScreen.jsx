import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GAME_STATUS } from './codigoEstelar.constants';
import CodigoEstelarArena from './components/CodigoEstelarArena';
import { useCodigoEstelarController } from './useCodigoEstelarController';

// ─── CONSTANTES DE DISEÑO ────────────────────────────────────────────────────
const RADIO_BORDE    = 24;
const RADIO_CHIP     = 20;
const RADIO_BTN      = 18;
const PADDING_CARD   = 20;
const PADDING_CHIP   = 12;

const COLOR_FONDO    = '#050915';
const COLOR_AZUL     = '#6bd5ff';
const COLOR_VERDE    = '#37d79f';
const COLOR_AMBER    = '#ffbf5b';
const COLOR_PELIGRO  = '#ff7e72';
const COLOR_TEXTO    = '#f8fbff';
const COLOR_MUTED    = 'rgba(234,244,255,0.64)';
const COLOR_CARD     = 'rgba(15,25,45,0.95)';
const COLOR_BORDE    = 'rgba(107,213,255,0.14)';

const DIFFICULTY_OPTIONS = [
  { value: '1', emoji: '🌙', title: 'Explorador',  hint: 'Para empezar',  color: COLOR_AZUL   },
  { value: '2', emoji: '⚡', title: 'Piloto',       hint: 'El favorito',  color: COLOR_VERDE  },
  { value: '3', emoji: '🔥', title: 'Comandante',   hint: 'Más rápido',   color: COLOR_AMBER  },
  { value: '4', emoji: '💫', title: 'Legendario',   hint: 'Sin piedad',   color: COLOR_PELIGRO},
];

const FLOW_STEPS_META = [
  { key: 'qr',     emoji: '🎮', title: 'Piloto verificado'   },
  { key: 'http',   emoji: '🛸', title: 'Misión asignada'     },
  { key: 'socket', emoji: '📡', title: 'Canal en órbita'     },
  { key: 'close',  emoji: '🏁', title: 'Misión cerrada'      },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const compactName = (value) => {
  if (!value) return 'Piloto';
  const words = value.trim().split(/\s+/).slice(0, 3).join(' ');
  return words.length > 18 ? `${words.slice(0, 18)}…` : words;
};

const computeStepStates = (steps) => {
  let currentAssigned = false;
  return steps.map((step) => {
    if (step.done) return { ...step, visualState: 'done' };
    if (!currentAssigned) { currentAssigned = true; return { ...step, visualState: 'current' }; }
    return { ...step, visualState: 'pending' };
  });
};

const buildFlowSteps = ({ runtime, status }) =>
  computeStepStates([
    {
      key: 'qr',
      done: Boolean(runtime.studentProfile),
      detail: runtime.studentProfile
        ? `Piloto: ${compactName(runtime.studentProfile.nombre)}`
        : 'Escaneando identidad del piloto...',
    },
    {
      key: 'http',
      done: Boolean(runtime.session),
      detail: runtime.session ? `Misión #${runtime.session.id} lista` : 'Preparando la misión...',
    },
    {
      key: 'socket',
      done: status === GAME_STATUS.playing || status === GAME_STATUS.finished,
      detail: runtime.realtime?.room_key
        ? `Sala ${runtime.realtime.room_key}`
        : 'Abriendo canal de comunicación...',
    },
    {
      key: 'close',
      done: Boolean(runtime.finalization),
      detail: runtime.finalization
        ? `${runtime.finalization.resumen_oficial.puntaje} pts registrados`
        : 'Esperando señal de cierre...',
    },
  ]);

const resolveRoomLabel = (roomKey) => {
  if (!roomKey) return null;
  const match = /room:grupo_(\d+):/.exec(roomKey);
  return match ? `Grupo ${match[1]}` : roomKey;
};

// ─── SUB-COMPONENTES VISUALES ─────────────────────────────────────────────────

const HeroLanzamiento = ({ automaticoDesdeDashboard }) => (
  <View style={estilos.hero}>
    <View style={estilos.heroAuraAzul} />
    <View style={estilos.heroAuraVerde} />
    <Text style={estilos.heroEmoji}>{automaticoDesdeDashboard ? '🛰️' : '🚀'}</Text>
    <Text style={estilos.heroTitulo}>
      {automaticoDesdeDashboard ? 'Entrando a tu misión' : '¡A la órbita!'}
    </Text>
    <Text style={estilos.heroSubtitulo}>
      {automaticoDesdeDashboard
        ? 'Tu dashboard ya validó que puedes jugar. Ahora te conectamos con la sala del tutor.'
        : 'Configura tu misión y entra a la carrera'}
    </Text>
  </View>
);

const ChipDificultad = ({ opcion, seleccionado, onPress }) => {
  const activo = seleccionado === opcion.value;
  return (
    <TouchableOpacity
      style={[
        estilos.chip,
        activo && { borderColor: opcion.color, backgroundColor: `${opcion.color}18` },
      ]}
      onPress={() => onPress(opcion.value)}
      activeOpacity={0.75}
    >
      <Text style={estilos.chipEmoji}>{opcion.emoji}</Text>
      <Text style={[estilos.chipTitulo, activo && { color: opcion.color }]}>{opcion.title}</Text>
      <Text style={estilos.chipHint}>{opcion.hint}</Text>
    </TouchableOpacity>
  );
};

const CardConfiguracion = ({
  form,
  updateFormField,
  showRed,
  onToggleRed,
  studentSession,
}) => (
  <View style={estilos.card}>
    {studentSession ? (
      <View style={estilos.campoGrupo}>
        <Text style={estilos.campoLabel}>Piloto verificado 🎮</Text>
        <View style={estilos.identidadLista}>
          <Text style={estilos.identidadNombre}>{compactName(studentSession.studentProfile.nombre)}</Text>
          <Text style={estilos.identidadHint}>
            Grupo #{studentSession.studentProfile.grupo_id ?? 'sin grupo'} · QR validado en HU-41
          </Text>
        </View>
      </View>
    ) : (
      <View style={estilos.campoGrupo}>
        <Text style={estilos.campoLabel}>Código del piloto 🎮</Text>
        <TextInput
          style={estilos.input}
          autoCapitalize="characters"
          autoCorrect={false}
          value={form.qrToken}
          onChangeText={(v) => updateFormField('qrToken', v)}
          placeholder="QR-XXXXXX-XXXXXX"
          placeholderTextColor="rgba(255,255,255,0.28)"
          returnKeyType="done"
        />
      </View>
    )}

    <View style={estilos.campoGrupo}>
      <Text style={estilos.campoLabel}>Nivel orbital ⚡</Text>
      <View style={estilos.chipGrid}>
        {DIFFICULTY_OPTIONS.map((op) => (
          <ChipDificultad
            key={op.value}
            opcion={op}
            seleccionado={form.dificultad}
            onPress={(v) => updateFormField('dificultad', v)}
          />
        ))}
      </View>
    </View>

    <TouchableOpacity style={estilos.redToggle} onPress={onToggleRed} activeOpacity={0.7}>
      <Text style={estilos.redToggleTexto}>
        {showRed ? '▲ Ocultar ajustes de conexión' : '▼ Ajustes de conexión'}
      </Text>
    </TouchableOpacity>

    {showRed && (
      <View style={estilos.campoGrupo}>
        <Text style={estilos.campoLabel}>URL del servidor</Text>
        <TextInput
          style={estilos.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={form.apiBaseUrl}
          onChangeText={(v) => updateFormField('apiBaseUrl', v)}
          placeholder="http://192.168.X.X:3000/api"
          placeholderTextColor="rgba(255,255,255,0.28)"
        />
      </View>
    )}
  </View>
);

const BarraProgreso = ({ steps }) => (
  <View style={estilos.barraProgreso}>
    {FLOW_STEPS_META.map((meta, idx) => {
      const step = steps.find((s) => s.key === meta.key) ?? { visualState: 'pending', detail: '' };
      const done = step.visualState === 'done';
      const current = step.visualState === 'current';
      return (
        <View key={meta.key} style={estilos.pasoFila}>
          <View
            style={[
              estilos.pasoDot,
              done && estilos.pasoDotDone,
              current && estilos.pasoDotCurrent,
            ]}
          >
            <Text style={estilos.pasoDotEmoji}>{done ? '✓' : current ? '◉' : '○'}</Text>
          </View>
          {idx < FLOW_STEPS_META.length - 1 && (
            <View style={[estilos.pasoLinea, done && estilos.pasoLineaDone]} />
          )}
          <View style={estilos.pasoMeta}>
            <Text
              style={[
                estilos.pasoTitulo,
                done && { color: COLOR_VERDE },
                current && { color: COLOR_AZUL },
              ]}
            >
              {meta.emoji} {meta.title}
            </Text>
            {(done || current) && <Text style={estilos.pasoDetalle}>{step.detail}</Text>}
          </View>
        </View>
      );
    })}
  </View>
);

const BotonLanzar = ({ onPress, ocupado }) => (
  <TouchableOpacity
    style={[estilos.botonLanzar, ocupado && estilos.botonLanzarOcupado]}
    onPress={onPress}
    disabled={ocupado}
    activeOpacity={0.82}
  >
    {ocupado ? (
      <View style={estilos.botonLanzarContenido}>
        <ActivityIndicator color={COLOR_FONDO} size="small" />
        <Text style={estilos.botonLanzarTexto}>Sincronizando tripulación...</Text>
      </View>
    ) : (
      <Text style={estilos.botonLanzarTexto}>🚀 ¡Lanzar misión!</Text>
    )}
  </TouchableOpacity>
);

// ─── PANTALLA PRINCIPAL ───────────────────────────────────────────────────────
export default function CodigoEstelarScreen({ onSalir, onReturnToDashboard = onSalir, studentSession = null, autoLaunch = false }) {
  const {
    form,
    runtime,
    status,
    errorMessage,
    connectionStep,
    updateFormField,
    startGame,
    submitClassification,
    retryFinalization,
    resetFlow,
    isBusy,
    isFinalizing,
  } = useCodigoEstelarController({ studentSession });

  const [showRed, setShowRed] = useState(false);
  const autoLaunchRef = useRef(false);
  const hasStudentSession = Boolean(studentSession?.token && studentSession?.studentProfile);
  const automaticoDesdeDashboard = hasStudentSession && autoLaunch;

  const enJuego = status === GAME_STATUS.playing || status === GAME_STATUS.finished;
  const flowSteps = buildFlowSteps({ runtime, status });
  const hayActividad = status !== GAME_STATUS.setup || Boolean(runtime.studentProfile);
  const roomLabel = resolveRoomLabel(runtime.realtime?.room_key);

  useEffect(() => {
    if (!automaticoDesdeDashboard || autoLaunchRef.current || status !== GAME_STATUS.setup) {
      return;
    }

    autoLaunchRef.current = true;
    startGame();
  }, [automaticoDesdeDashboard, startGame, status]);

  const reintentarLanzamiento = () => {
    autoLaunchRef.current = false;
    resetFlow();
  };

  if (enJuego) {
    return (
      <CodigoEstelarArena
        runtime={runtime}
        status={status}
        onAnswer={submitClassification}
        roomLabel={roomLabel}
        finalization={runtime.finalization}
        errorMessage={errorMessage}
        isFinalizing={isFinalizing}
        onRetryFinalization={retryFinalization}
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={COLOR_FONDO} />

      <TouchableOpacity style={estilos.btnVolver} onPress={onSalir}>
        <Text style={estilos.btnVolverTexto}>← Volver</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={estilos.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeroLanzamiento automaticoDesdeDashboard={automaticoDesdeDashboard} />

        {automaticoDesdeDashboard ? (
          <View style={estilos.card}>
            <View style={estilos.campoGrupo}>
              <Text style={estilos.campoLabel}>Ingreso desde tu dashboard</Text>
              <View style={estilos.identidadLista}>
                <Text style={estilos.identidadNombre}>Preparando tu misión</Text>
                <Text style={estilos.identidadHint}>
                  {roomLabel ? `${roomLabel} · ${connectionStep}` : connectionStep}
                </Text>
              </View>
            </View>

            {status === GAME_STATUS.error ? (
              <TouchableOpacity
                style={estilos.botonSecundario}
                onPress={reintentarLanzamiento}
                activeOpacity={0.82}
              >
                <Text style={estilos.botonSecundarioTexto}>Reintentar misión</Text>
              </TouchableOpacity>
            ) : (
              <View style={estilos.estadoConexionFila}>
                <ActivityIndicator color={COLOR_AZUL} size="small" />
                <Text style={estilos.estadoConexionTexto}>
                  {isBusy
                    ? 'Conectando con la sala de tu tutor...'
                    : 'Estamos terminando de abrir tu misión.'}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <CardConfiguracion
              form={form}
              updateFormField={updateFormField}
              showRed={showRed}
              onToggleRed={() => setShowRed((v) => !v)}
              studentSession={hasStudentSession ? studentSession : null}
            />

            <BotonLanzar onPress={startGame} ocupado={isBusy} />
          </>
        )}

        {!!errorMessage && (
          <View style={estilos.errorBox}>
            <Text style={estilos.errorTexto}>⚠️ {errorMessage}</Text>
          </View>
        )}

        {hayActividad && <BarraProgreso steps={flowSteps} />}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLOR_FONDO,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 16,
  },

  // Botón volver
  btnVolver: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  btnVolverTexto: {
    color: COLOR_MUTED,
    fontSize: 14,
    fontWeight: '700',
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroAuraAzul: {
    position: 'absolute',
    top: -40,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(107,213,255,0.10)',
    // React Native no tiene filter:blur, usamos opacidad + radio grande
  },
  heroAuraVerde: {
    position: 'absolute',
    bottom: -30,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(55,215,159,0.08)',
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  heroTitulo: {
    color: COLOR_TEXTO,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSubtitulo: {
    color: COLOR_MUTED,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },

  // Card configuración
  card: {
    backgroundColor: COLOR_CARD,
    borderRadius: RADIO_BORDE,
    padding: PADDING_CARD,
    borderWidth: 1,
    borderColor: COLOR_BORDE,
    gap: 18,
  },
  campoGrupo: {
    gap: 10,
  },
  campoLabel: {
    color: COLOR_TEXTO,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIO_BTN,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLOR_TEXTO,
    fontSize: 16,
  },
  identidadLista: {
    borderRadius: RADIO_BTN,
    borderWidth: 1,
    borderColor: 'rgba(55,215,159,0.22)',
    backgroundColor: 'rgba(55,215,159,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  identidadNombre: {
    color: COLOR_TEXTO,
    fontSize: 18,
    fontWeight: '900',
  },
  identidadHint: {
    color: COLOR_MUTED,
    fontSize: 12,
    lineHeight: 17,
  },

  // Chips de dificultad
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minWidth: '47%',
    flex: 1,
    alignItems: 'center',
    paddingVertical: PADDING_CHIP,
    paddingHorizontal: 10,
    borderRadius: RADIO_CHIP,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 4,
  },
  chipEmoji: {
    fontSize: 26,
  },
  chipTitulo: {
    color: COLOR_TEXTO,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  chipHint: {
    color: COLOR_MUTED,
    fontSize: 11,
    textAlign: 'center',
  },

  // Red toggle
  redToggle: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  redToggleTexto: {
    color: 'rgba(107,213,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
  },
  estadoConexionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  estadoConexionTexto: {
    color: COLOR_MUTED,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  botonSecundario: {
    minHeight: 52,
    borderRadius: RADIO_BTN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107,213,255,0.24)',
    backgroundColor: 'rgba(107,213,255,0.10)',
  },
  botonSecundarioTexto: {
    color: COLOR_AZUL,
    fontSize: 16,
    fontWeight: '900',
  },

  // Botón lanzar
  botonLanzar: {
    backgroundColor: COLOR_VERDE,
    borderRadius: RADIO_BTN,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLOR_VERDE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  botonLanzarOcupado: {
    opacity: 0.7,
  },
  botonLanzarContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botonLanzarTexto: {
    color: '#031a0e',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(255,126,114,0.12)',
    borderRadius: RADIO_BTN,
    borderWidth: 1,
    borderColor: 'rgba(255,126,114,0.28)',
    padding: 14,
  },
  errorTexto: {
    color: '#ffd6d2',
    fontSize: 14,
    lineHeight: 20,
  },

  // Barra de progreso
  barraProgreso: {
    backgroundColor: COLOR_CARD,
    borderRadius: RADIO_BORDE,
    padding: PADDING_CARD,
    borderWidth: 1,
    borderColor: COLOR_BORDE,
    gap: 2,
  },
  pasoFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  pasoDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginTop: 1,
  },
  pasoDotDone: {
    backgroundColor: 'rgba(55,215,159,0.18)',
    borderColor: COLOR_VERDE,
  },
  pasoDotCurrent: {
    backgroundColor: 'rgba(107,213,255,0.18)',
    borderColor: COLOR_AZUL,
  },
  pasoDotEmoji: {
    fontSize: 12,
    color: COLOR_TEXTO,
  },
  pasoLinea: {
    position: 'absolute',
    left: 13,
    top: 34,
    width: 2,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
  },
  pasoLineaDone: {
    backgroundColor: COLOR_VERDE,
    opacity: 0.5,
  },
  pasoMeta: {
    flex: 1,
    paddingTop: 4,
    gap: 2,
  },
  pasoTitulo: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '800',
  },
  pasoDetalle: {
    color: COLOR_MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
});




