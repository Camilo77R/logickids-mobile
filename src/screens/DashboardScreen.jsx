import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CaminoARScreen from '../features/games/camino-ar/CaminoARScreen';
import { obtenerConfiguracionBaseCaminoAr } from '../features/games/camino-ar/caminoArConfiguracion';
import CaminoArPlaneSmokeTestScreen from '../features/games/camino-ar/presentacion/CaminoArPlaneSmokeTestScreen';
import {
  ESTADOS_ACCESO_JUEGO,
  resolverAccesoJuegoDesdePerfil,
} from '../features/games/core/resolverAccesoJuego';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import { colores, espaciado, radios, tipografia } from '../theme/tokens';

const HABILIDADES_OFICIALES = Object.freeze([
  { nombre: 'Memoria', acento: colores.alerta },
  { nombre: 'Patrones', acento: '#9B8BFF' },
  { nombre: 'Lógica', acento: '#82D7FF' },
  { nombre: 'Razonamiento', acento: '#18C47A' },
  { nombre: 'Atención', acento: '#FF8A8A' },
]);

const TERMINAL_PARTICIPANT_STATES = new Set(['completado', 'abandonado', 'cerrado']);

const normalizarClaveHabilidad = (valor = '') =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const construirTarjetasHabilidad = (skillStatsView) => {
  const entries = skillStatsView?.entries ?? [];
  const statsPorHabilidad = new Map(
    entries.map((entry) => [normalizarClaveHabilidad(entry.skillName), entry]),
  );

  return HABILIDADES_OFICIALES.map((habilidad) => {
    const stat = statsPorHabilidad.get(normalizarClaveHabilidad(habilidad.nombre));

    return {
      ...habilidad,
      precision: stat?.precisionLabel ?? 'Sin datos',
      intentos: stat?.attemptsLabel ?? 'Pendiente',
      reaccion: stat?.reactionLabel ?? 'Aun no evaluada',
      descripcion:
        stat?.skillDescription ??
        'Esta habilidad se llenara cuando el estudiante complete actividades relacionadas.',
      evaluada: Boolean(stat),
    };
  });
};

const construirResumenActividad = (profile, accesoCaminoAr) => {
  if (!profile) {
    return {
      titulo: 'Cargando actividad',
      descripcion: 'Estamos preparando la clase actual del estudiante.',
      detalle: 'Sin datos todavia',
    };
  }

  if (!profile.sesion_activa) {
    if (TERMINAL_PARTICIPANT_STATES.has(profile.sesion_participante_estado)) {
      return {
        titulo:
          profile.sesion_participante_estado === 'completado'
            ? 'Actividad completada'
            : 'Actividad cerrada',
        descripcion:
          profile.sesion_participante_estado === 'completado'
            ? 'Este estudiante ya termino su actividad actual. El grupo puede seguir abierto para otros compañeros.'
            : 'La actividad actual ya no sigue disponible para este estudiante.',
        detalle:
          profile.sesion_minijuego_titulo != null
            ? `Ultimo juego: ${profile.sesion_minijuego_titulo}`
            : profile.grupo_nombre ?? 'Sesion finalizada',
      };
    }

    return {
      titulo: 'Actividad bloqueada',
      descripcion: 'El tutor todavia no ha abierto una sesion para este grupo.',
      detalle: profile.grupo_nombre ?? 'Esperando grupo activo',
    };
  }

  if (profile.sesion_modo === 'path') {
    return {
      titulo: profile.sesion_ruta_nombre ?? 'Ruta activa',
      descripcion:
        'El estudiante debe seguir el camino en orden. Solo el paso actual queda habilitado.',
      detalle: `Paso ${profile.sesion_paso_actual ?? 1} de ${profile.sesion_total_pasos ?? 1} · Bloque ${profile.sesion_bloque_actual ?? 1} · Nivel ${profile.sesion_nivel_en_bloque ?? 1}`,
    };
  }

  if (accesoCaminoAr.estado !== ESTADOS_ACCESO_JUEGO.disponible) {
    return {
      titulo: profile.sesion_minijuego_titulo ?? 'Actividad activa',
      descripcion: accesoCaminoAr.motivo,
      detalle: `Juego habilitado: ${profile.sesion_minijuego_titulo ?? 'Pendiente'}`,
    };
  }

  return {
    titulo: profile.sesion_minijuego_titulo ?? 'Camino AR',
    descripcion:
      'La sesion single mantiene el mismo juego durante varios niveles secuenciales.',
    detalle: `Nivel actual del bloque: ${profile.sesion_nivel_en_bloque ?? 1}`,
  };
};

const construirResumenProgreso = ({ progressSummary, skillStatsView }) => ({
  habilidadesMedidas: progressSummary.skillsTracked || 0,
  precisionPromedio:
    progressSummary.averagePrecision == null
      ? 'Sin datos'
      : `${progressSummary.averagePrecision}%`,
  fortalezaActual: skillStatsView?.strongestSkill?.skillName ?? 'Aún sin fortaleza medida',
  siguienteRefuerzo:
    skillStatsView?.needsPracticeSkill?.skillName ?? 'Aún sin habilidad por reforzar',
});

const buildGroupLabel = (profile) => {
  if (!profile?.grupo_id) {
    return 'Sin grupo activo';
  }

  return profile.grupo_nombre ?? `Grupo #${profile.grupo_id}`;
};

export default function DashboardScreen({ studentSession, onLogout }) {
  const mostrarSmokeTest = __DEV__;
  const [juegoActivo, setJuegoActivo] = useState(null);
  const {
    profile,
    achievements,
    progressSummary,
    skillStatsView,
    playState,
    isLoading,
    isRefreshing,
    errorMessage,
    reloadDashboard,
  } = useStudentDashboard(studentSession);

  const studentProfile = profile ?? studentSession?.studentProfile ?? null;
  const configuracionBaseCaminoAr = useMemo(
    () => obtenerConfiguracionBaseCaminoAr(),
    [],
  );
  const accesoCaminoAr = useMemo(
    () =>
      resolverAccesoJuegoDesdePerfil({
        perfilEstudiante: studentProfile,
        slugJuego: configuracionBaseCaminoAr.slug,
      }),
    [configuracionBaseCaminoAr.slug, studentProfile],
  );
  const contextoSesionCaminoAr = useMemo(
    () => ({
      tokenEstudiante: studentSession?.token ?? null,
      baseUrlApi: studentSession?.apiBaseUrl ?? null,
      minijuegoId: studentProfile?.sesion_minijuego_id ?? null,
    }),
    [studentProfile?.sesion_minijuego_id, studentSession?.apiBaseUrl, studentSession?.token],
  );
  const tarjetasHabilidad = useMemo(
    () => construirTarjetasHabilidad(skillStatsView),
    [skillStatsView],
  );
  const resumenActividad = useMemo(
    () => construirResumenActividad(studentProfile, accesoCaminoAr),
    [accesoCaminoAr, studentProfile],
  );
  const resumenProgreso = useMemo(
    () =>
      construirResumenProgreso({
        progressSummary,
        skillStatsView,
      }),
    [progressSummary, skillStatsView],
  );
  const logrosRecientes = achievements.slice(0, 3);
  const salirDeCaminoAr = async () => {
    try {
      await reloadDashboard();
    } finally {
      setJuegoActivo(null);
    }
  };

  if (juegoActivo === 'camino-ar') {
    return (
      <CaminoARScreen
        onSalir={salirDeCaminoAr}
        configuracionInicial={configuracionBaseCaminoAr}
        contextoSesion={contextoSesionCaminoAr}
      />
    );
  }

  if (mostrarSmokeTest && juegoActivo === 'camino-ar-plane-smoke-test') {
    return (
      <CaminoArPlaneSmokeTestScreen
        onSalir={() => {
          setJuegoActivo(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoPrincipal} />

      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.encabezado}>
          <View style={styles.encabezadoTexto}>
            <Text style={styles.ceja}>Dashboard del estudiante</Text>
            <Text style={styles.titulo}>
              {studentProfile?.nombre ?? 'Cargando estudiante'}
            </Text>
            <Text style={styles.subtitulo}>
              {buildGroupLabel(studentProfile)} · {isRefreshing ? 'Actualizando...' : 'Sesion sincronizada'}
            </Text>
          </View>

          <TouchableOpacity style={styles.botonSalir} onPress={onLogout}>
            <Text style={styles.botonSalirTexto}>Salir</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.panelError}>
            <Text style={styles.panelErrorTitulo}>No pudimos refrescar el tablero</Text>
            <Text style={styles.panelErrorTexto}>{errorMessage}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.panelCarga}>
            <ActivityIndicator color={colores.alerta} size="small" />
            <Text style={styles.panelCargaTexto}>Cargando progreso, logros y actividad...</Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>Actividad actual</Text>
          <Text style={styles.textoPrincipal}>{resumenActividad.titulo}</Text>
          <Text style={styles.textoPanel}>{resumenActividad.descripcion}</Text>
          <Text style={styles.textoDetalle}>{resumenActividad.detalle}</Text>
          {!studentProfile?.sesion_activa &&
          TERMINAL_PARTICIPANT_STATES.has(studentProfile?.sesion_participante_estado) ? (
            <Text style={styles.textoPanel}>
              Tus logros y habilidades actualizadas aparecen más abajo en este tablero.
            </Text>
          ) : null}

          <View style={styles.metricasFila}>
            <View style={styles.metrica}>
              <Text style={styles.metricaEtiqueta}>Modo</Text>
              <Text style={styles.metricaValor}>{studentProfile?.sesion_modo ?? 'Ninguno'}</Text>
            </View>
            <View style={styles.metrica}>
              <Text style={styles.metricaEtiqueta}>Puntaje medio</Text>
              <Text style={styles.metricaValor}>
                {progressSummary.averagePrecision == null
                  ? 'Sin datos'
                  : `${progressSummary.averagePrecision}%`}
              </Text>
            </View>
            <View style={styles.metrica}>
              <Text style={styles.metricaEtiqueta}>Intentos</Text>
              <Text style={styles.metricaValor}>{progressSummary.totalAttempts}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.botonJugar,
              accesoCaminoAr.estado !== ESTADOS_ACCESO_JUEGO.disponible && styles.botonJugarBloqueado,
            ]}
            disabled={accesoCaminoAr.estado !== ESTADOS_ACCESO_JUEGO.disponible}
            onPress={() => setJuegoActivo('camino-ar')}
          >
            <Text style={styles.botonJugarTexto}>
              {accesoCaminoAr.estado === ESTADOS_ACCESO_JUEGO.disponible
                ? playState.buttonLabel
                : accesoCaminoAr.juegoHabilitadoTitulo
                  ? `Activo: ${accesoCaminoAr.juegoHabilitadoTitulo}`
                  : playState.buttonLabel}
            </Text>
          </TouchableOpacity>

          {mostrarSmokeTest ? (
            <TouchableOpacity
              style={styles.botonPrueba}
              onPress={() => setJuegoActivo('camino-ar-plane-smoke-test')}
            >
              <Text style={styles.botonPruebaTexto}>Probar anclaje AR base</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>Resumen de progreso</Text>
          <Text style={styles.textoPanel}>
            Aquí ves el estado acumulado del estudiante después de cada sesión guardada.
          </Text>

          <View style={styles.metricasFila}>
            <View style={styles.metrica}>
              <Text style={styles.metricaEtiqueta}>Habilidades medidas</Text>
              <Text style={styles.metricaValor}>{resumenProgreso.habilidadesMedidas}</Text>
            </View>
            <View style={styles.metrica}>
              <Text style={styles.metricaEtiqueta}>Precisión promedio</Text>
              <Text style={styles.metricaValor}>{resumenProgreso.precisionPromedio}</Text>
            </View>
          </View>

          <View style={styles.resumenProgresoCard}>
            <Text style={styles.resumenProgresoTitulo}>Fortaleza actual</Text>
            <Text style={styles.resumenProgresoValor}>{resumenProgreso.fortalezaActual}</Text>
          </View>

          <View style={styles.resumenProgresoCard}>
            <Text style={styles.resumenProgresoTitulo}>Próxima habilidad por reforzar</Text>
            <Text style={styles.resumenProgresoValor}>{resumenProgreso.siguienteRefuerzo}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>Logros recientes</Text>
          {logrosRecientes.length ? (
            <View style={styles.listaLogros}>
              {logrosRecientes.map((logro) => (
                <View key={logro.id} style={styles.logroCard}>
                  <Text style={styles.logroTitulo}>{logro.nombre_logro}</Text>
                  <Text style={styles.logroTexto}>{logro.descripcion}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.textoPanel}>
              Todavia no hay logros desbloqueados. Se llenaran cuando el estudiante complete sesiones.
            </Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>Habilidades cognitivas</Text>
          <Text style={styles.textoPanel}>
            Estas cinco areas resumen lo que el estudiante ha practicado y lo que todavia falta por evaluar.
          </Text>
          <View style={styles.gridHabilidades}>
            {tarjetasHabilidad.map((habilidad) => (
              <View key={habilidad.nombre} style={styles.habilidadCard}>
                <View
                  style={[
                    styles.habilidadBadge,
                    { backgroundColor: `${habilidad.acento}22`, borderColor: `${habilidad.acento}55` },
                  ]}
                >
                  <Text style={[styles.habilidadBadgeTexto, { color: habilidad.acento }]}>
                    {habilidad.nombre}
                  </Text>
                </View>
                <Text style={styles.habilidadPrecision}>{habilidad.precision}</Text>
                <Text style={styles.habilidadTexto}>{habilidad.intentos}</Text>
                <Text style={styles.habilidadTexto}>{habilidad.reaccion}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondoPrincipal,
  },
  contenido: {
    padding: espaciado.lg,
    gap: espaciado.lg,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: espaciado.md,
  },
  encabezadoTexto: {
    flex: 1,
    gap: espaciado.xs,
  },
  ceja: {
    color: colores.acento,
    fontSize: tipografia.etiqueta,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '900',
  },
  titulo: {
    color: colores.textoPrincipal,
    fontSize: tipografia.titulo,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  botonSalir: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radios.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  botonSalirTexto: {
    color: colores.textoPrincipal,
    fontWeight: '800',
  },
  panel: {
    backgroundColor: colores.fondoSecundario,
    borderRadius: radios.lg,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.bordeAcento,
    gap: espaciado.sm,
  },
  panelCarga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    backgroundColor: colores.fondoSecundario,
    borderRadius: radios.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  panelCargaTexto: {
    color: colores.textoSecundario,
    fontWeight: '700',
  },
  panelError: {
    backgroundColor: 'rgba(255,106,106,0.14)',
    borderRadius: radios.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: 'rgba(255,106,106,0.32)',
    gap: espaciado.xs,
  },
  panelErrorTitulo: {
    color: '#FFD5D5',
    fontWeight: '900',
  },
  panelErrorTexto: {
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  tituloPanel: {
    color: colores.textoPrincipal,
    fontSize: tipografia.subtitulo,
    fontWeight: '800',
  },
  textoPrincipal: {
    color: colores.alerta,
    fontSize: 22,
    fontWeight: '900',
  },
  textoPanel: {
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  textoDetalle: {
    color: colores.textoDebil,
    lineHeight: 19,
  },
  resumenProgresoCard: {
    padding: espaciado.md,
    borderRadius: radios.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    gap: espaciado.xs,
  },
  resumenProgresoTitulo: {
    color: colores.textoDebil,
    fontSize: tipografia.etiqueta,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  resumenProgresoValor: {
    color: colores.textoPrincipal,
    fontSize: tipografia.subtitulo,
    fontWeight: '900',
  },
  metricasFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
  },
  metrica: {
    minWidth: 98,
    backgroundColor: colores.superficie,
    borderRadius: radios.md,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    gap: 4,
  },
  metricaEtiqueta: {
    color: colores.textoDebil,
    fontSize: tipografia.etiqueta,
    textTransform: 'uppercase',
  },
  metricaValor: {
    color: colores.textoPrincipal,
    fontWeight: '900',
  },
  botonJugar: {
    marginTop: espaciado.xs,
    borderRadius: radios.md,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: colores.exito,
  },
  botonJugarBloqueado: {
    backgroundColor: colores.bloqueado,
  },
  botonJugarTexto: {
    color: '#06131F',
    fontWeight: '900',
    fontSize: 15,
  },
  botonPrueba: {
    borderRadius: radios.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  botonPruebaTexto: {
    color: colores.textoPrincipal,
    fontWeight: '800',
    fontSize: 14,
  },
  listaLogros: {
    gap: espaciado.sm,
  },
  logroCard: {
    backgroundColor: colores.superficie,
    borderRadius: radios.md,
    padding: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    gap: 4,
  },
  logroTitulo: {
    color: colores.textoPrincipal,
    fontWeight: '800',
  },
  logroTexto: {
    color: colores.textoSecundario,
    lineHeight: 18,
  },
  gridHabilidades: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
  },
  habilidadCard: {
    width: '47.5%',
    backgroundColor: colores.superficie,
    borderRadius: radios.md,
    padding: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    gap: 6,
  },
  habilidadBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radios.pill,
    borderWidth: 1,
  },
  habilidadBadgeTexto: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  habilidadPrecision: {
    color: colores.textoPrincipal,
    fontSize: 20,
    fontWeight: '900',
  },
  habilidadTexto: {
    color: colores.textoSecundario,
    lineHeight: 18,
  },
});
