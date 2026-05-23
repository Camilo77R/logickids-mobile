import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CaminoARScreen from '../features/games/camino-ar/CaminoARScreen';
import { obtenerConfiguracionBaseCaminoAr } from '../features/games/camino-ar/caminoArConfiguracion';
import { MODOS_PRESENTACION_CAMINO_AR } from '../features/games/camino-ar/caminoAr.constants';
import {
  ESTADOS_ACCESO_JUEGO,
  resolverAccesoJuegoDesdePerfil,
} from '../features/games/core/resolverAccesoJuego';
import { crearPerfilEstudianteDemo } from '../features/student/demo/perfilEstudianteDemo';
import { colores, espaciado, radios, tipografia } from '../theme/tokens';

export default function DashboardScreen() {
  const [sesionDemoActiva, setSesionDemoActiva] = useState(false);
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [modoPresentacionDemo, setModoPresentacionDemo] = useState(
    MODOS_PRESENTACION_CAMINO_AR.tablero2d,
  );

  const configuracionBase = useMemo(
    () =>
      obtenerConfiguracionBaseCaminoAr({
        modoPresentacion: modoPresentacionDemo,
      }),
    [modoPresentacionDemo],
  );
  const perfilEstudiante = useMemo(
    () =>
      crearPerfilEstudianteDemo({
        sesionActiva: sesionDemoActiva,
        slugJuego: configuracionBase.slug,
        tituloJuego: configuracionBase.titulo,
      }),
    [configuracionBase.slug, configuracionBase.titulo, sesionDemoActiva],
  );
  const accesoCaminoAr = useMemo(
    () =>
      resolverAccesoJuegoDesdePerfil({
        perfilEstudiante,
        slugJuego: configuracionBase.slug,
      }),
    [configuracionBase.slug, perfilEstudiante],
  );
  const contextoSesionCaminoAr = useMemo(
    () => ({
      tokenEstudiante: null,
      baseUrlApi: null,
      minijuegoId: perfilEstudiante.sesion_minijuego_id,
    }),
    [perfilEstudiante.sesion_minijuego_id],
  );

  if (juegoActivo === 'camino-ar') {
    return (
      <CaminoARScreen
        onSalir={() => setJuegoActivo(null)}
        configuracionInicial={configuracionBase}
        contextoSesion={contextoSesionCaminoAr}
      />
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoPrincipal} />

      <View style={styles.encabezado}>
        <Text style={styles.logo}>LogicKids Mobile</Text>
        <Text style={styles.subtitulo}>Base limpia para juegos nativos sin Babylon ni WebView</Text>
      </View>

      <View style={styles.cuerpo}>
        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>Sesion de clase</Text>
          <Text style={styles.textoPanel}>
            Para la primera partida todos arrancan con nivel base 1. Luego otra capa podra adaptar dificultad y ritmo con estadisticas e IA.
          </Text>
          <View style={styles.selectorModo}>
            <TouchableOpacity
              style={[
                styles.botonModo,
                modoPresentacionDemo === MODOS_PRESENTACION_CAMINO_AR.tablero2d &&
                  styles.botonModoActivo,
              ]}
              onPress={() =>
                setModoPresentacionDemo(MODOS_PRESENTACION_CAMINO_AR.tablero2d)
              }
            >
              <Text
                style={[
                  styles.botonModoTexto,
                  modoPresentacionDemo === MODOS_PRESENTACION_CAMINO_AR.tablero2d &&
                    styles.botonModoTextoActivo,
                ]}
              >
                Probar en 2D
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonModo,
                modoPresentacionDemo ===
                  MODOS_PRESENTACION_CAMINO_AR.realidadAumentada &&
                  styles.botonModoActivo,
              ]}
              onPress={() =>
                setModoPresentacionDemo(
                  MODOS_PRESENTACION_CAMINO_AR.realidadAumentada,
                )
              }
            >
              <Text
                style={[
                  styles.botonModoTexto,
                  modoPresentacionDemo ===
                    MODOS_PRESENTACION_CAMINO_AR.realidadAumentada &&
                    styles.botonModoTextoActivo,
                ]}
              >
                Probar en AR
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.textoPanel}>
            Modo actual:{' '}
            {modoPresentacionDemo === MODOS_PRESENTACION_CAMINO_AR.tablero2d
              ? 'tablero 2D'
              : 'realidad aumentada'}
          </Text>
          <TouchableOpacity
            style={[styles.botonEstado, sesionDemoActiva ? styles.botonCerrar : styles.botonAbrir]}
            onPress={() => setSesionDemoActiva((previo) => !previo)}
          >
            <Text style={styles.botonEstadoTexto}>
              {sesionDemoActiva ? 'Cerrar sesion demo' : 'Abrir sesion demo'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          disabled={accesoCaminoAr.estado !== ESTADOS_ACCESO_JUEGO.disponible}
          style={[
            styles.tarjetaJuego,
            accesoCaminoAr.estado !== ESTADOS_ACCESO_JUEGO.disponible && styles.tarjetaBloqueada,
          ]}
          onPress={() => setJuegoActivo('camino-ar')}
        >
          <Text style={styles.emojiJuego}>Camino base</Text>
          <Text style={styles.tituloJuego}>Camino AR</Text>
          <Text style={styles.descripcionJuego}>
            El nino memoriza un recorrido iluminado y luego toca las baldosas en el mismo orden.
          </Text>
          <View style={styles.filaBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>RN puro</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>Nivel base 1</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>
                {modoPresentacionDemo === MODOS_PRESENTACION_CAMINO_AR.tablero2d
                  ? 'Modo 2D'
                  : 'Modo AR'}
              </Text>
            </View>
          </View>
          <Text style={styles.estadoJuego}>
            {accesoCaminoAr.estado === ESTADOS_ACCESO_JUEGO.disponible
              ? 'Disponible: el backend ya permitiria iniciar la sesion del juego.'
              : accesoCaminoAr.motivo}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondoPrincipal,
  },
  encabezado: {
    paddingTop: espaciado.xl,
    paddingHorizontal: espaciado.lg,
    paddingBottom: espaciado.lg,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSuave,
    gap: espaciado.xs,
  },
  logo: {
    color: colores.alerta,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  cuerpo: {
    flex: 1,
    padding: espaciado.lg,
    gap: espaciado.lg,
  },
  panel: {
    backgroundColor: colores.fondoSecundario,
    borderRadius: radios.lg,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.bordeAcento,
    gap: espaciado.sm,
  },
  tituloPanel: {
    color: colores.textoPrincipal,
    fontSize: tipografia.subtitulo,
    fontWeight: '800',
  },
  textoPanel: {
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  selectorModo: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  botonModo: {
    flex: 1,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colores.superficie,
  },
  botonModoActivo: {
    borderColor: colores.alerta,
    backgroundColor: 'rgba(255,216,107,0.16)',
  },
  botonModoTexto: {
    color: colores.textoSecundario,
    fontWeight: '800',
  },
  botonModoTextoActivo: {
    color: colores.alerta,
  },
  botonEstado: {
    borderRadius: radios.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonAbrir: {
    backgroundColor: colores.exito,
  },
  botonCerrar: {
    backgroundColor: '#FF6B6B',
  },
  botonEstadoTexto: {
    color: '#06131F',
    fontWeight: '900',
  },
  tarjetaJuego: {
    backgroundColor: colores.fondoSecundario,
    borderRadius: radios.lg,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.bordeAcento,
    gap: espaciado.sm,
  },
  tarjetaBloqueada: {
    opacity: 0.52,
    borderColor: colores.bordeSuave,
  },
  emojiJuego: {
    fontSize: 14,
    fontWeight: '800',
    color: colores.acento,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tituloJuego: {
    color: colores.textoPrincipal,
    fontSize: 24,
    fontWeight: '900',
  },
  descripcionJuego: {
    color: colores.textoSecundario,
    lineHeight: 21,
  },
  filaBadges: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  badge: {
    backgroundColor: 'rgba(255,216,107,0.14)',
    borderRadius: radios.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,216,107,0.24)',
  },
  badgeTexto: {
    color: colores.alerta,
    fontSize: tipografia.etiqueta,
    fontWeight: '800',
  },
  estadoJuego: {
    color: colores.acento,
    lineHeight: 20,
    marginTop: espaciado.xs,
  },
});
