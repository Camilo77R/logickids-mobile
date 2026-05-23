import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ESTADOS_CAMINO_AR } from './caminoAr.constants';
import { useCaminoArControlador } from './useCaminoArControlador';
import { colores, espaciado, radios, tipografia } from '../../../theme/tokens';

const TarjetaMetrica = ({ etiqueta, valor }) => (
  <View style={styles.tarjetaMetrica}>
    <Text style={styles.etiquetaMetrica}>{etiqueta}</Text>
    <Text style={styles.valorMetrica}>{valor}</Text>
  </View>
);

const Baldosa = ({ indice, activa, deshabilitada, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    disabled={deshabilitada}
    onPress={() => onPress(indice)}
    style={[
      styles.baldosa,
      activa && styles.baldosaActiva,
      deshabilitada && styles.baldosaDeshabilitada,
    ]}
  >
    <Text style={[styles.baldosaTexto, activa && styles.baldosaTextoActiva]}>
      {indice + 1}
    </Text>
  </TouchableOpacity>
);

export default function CaminoARScreen({ onSalir, configuracionInicial }) {
  const {
    configuracion,
    estado,
    columnasTablero,
    iniciarPartida,
    reiniciarPartida,
    seleccionarBaldosa,
    usarPista,
    puedePedirPista,
  } = useCaminoArControlador(configuracionInicial);

  const descripcionEstado = {
    [ESTADOS_CAMINO_AR.listo]: 'Prepara al estudiante para memorizar el recorrido base.',
    [ESTADOS_CAMINO_AR.mostrandoPatron]: 'El sistema esta mostrando el patron que luego se debe repetir.',
    [ESTADOS_CAMINO_AR.esperandoRespuesta]: 'Es turno del estudiante: debe tocar las baldosas en el mismo orden.',
    [ESTADOS_CAMINO_AR.completado]: 'La ronda cerro bien y quedo lista para persistir sus resultados.',
    [ESTADOS_CAMINO_AR.fallido]: 'La ronda cerro con error o tiempo agotado. Puede reiniciarse sin ruido.',
  }[estado.fase];

  const estiloColumna = columnasTablero === 2 ? styles.columnaDos : styles.columnaTres;

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoPrincipal} />
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.encabezado}>
          <TouchableOpacity onPress={onSalir} style={styles.botonVolver}>
            <Text style={styles.botonVolverTexto}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.ceja}>Primer juego real del proyecto</Text>
          <Text style={styles.titulo}>Camino AR</Text>
          <Text style={styles.subtitulo}>
            El nucleo de memoria secuencial ya queda listo en React Native puro. La escena AR se conecta despues.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>Sesion base del juego</Text>
          <Text style={styles.textoPanel}>
            Todos empiezan en nivel 1. Mas adelante otra capa podra adaptar esta configuracion con IA sin reescribir el juego.
          </Text>
          <View style={styles.filaMetricas}>
            <TarjetaMetrica etiqueta="Dificultad" valor={configuracion.dificultad} />
            <TarjetaMetrica etiqueta="Patron" valor={configuracion.configuracion.longitudPatron} />
            <TarjetaMetrica etiqueta="Baldosas" valor={configuracion.configuracion.cantidadBaldosas} />
            <TarjetaMetrica etiqueta="Fuente" valor={configuracion.fuenteAdaptacion} />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>Estado actual</Text>
          <Text style={styles.textoPanel}>{estado.mensaje}</Text>
          <Text style={styles.textoAyuda}>{descripcionEstado}</Text>
          <View style={styles.filaMetricas}>
            <TarjetaMetrica etiqueta="Tiempo" valor={`${Math.ceil(estado.tiempoRestanteMs / 1000)} s`} />
            <TarjetaMetrica etiqueta="Aciertos" valor={estado.aciertos} />
            <TarjetaMetrica etiqueta="Errores" valor={estado.errores} />
            <TarjetaMetrica etiqueta="Pistas" valor={estado.ayudasRestantes} />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>Tablero base</Text>
          <Text style={styles.textoPanel}>
            Este tablero ya representa el corazon del juego: mostrar una secuencia y pedirle al nino que la repita en orden.
          </Text>
          <View style={styles.tablero}>
            {Array.from({ length: configuracion.configuracion.cantidadBaldosas }).map((_, indice) => (
              <View key={`baldosa-${indice}`} style={[styles.celdaBaldosa, estiloColumna]}>
                <Baldosa
                  indice={indice}
                  activa={estado.baldosaActiva === indice}
                  deshabilitada={estado.fase !== ESTADOS_CAMINO_AR.esperandoRespuesta}
                  onPress={seleccionarBaldosa}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.filaAcciones}>
          <TouchableOpacity style={styles.botonPrimario} onPress={iniciarPartida}>
            <Text style={styles.botonPrimarioTexto}>Iniciar ronda</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.botonSecundario, !puedePedirPista && styles.botonInactivo]}
            disabled={!puedePedirPista}
            onPress={usarPista}
          >
            <Text style={styles.botonSecundarioTexto}>Usar pista</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonSecundario} onPress={reiniciarPartida}>
            <Text style={styles.botonSecundarioTexto}>Reiniciar</Text>
          </TouchableOpacity>
        </View>

        {estado.resultado && (
          <View style={styles.panelResultado}>
            <Text style={styles.tituloResultado}>
              {estado.resultado.detalles.patronResuelto
                ? 'Actividad completada'
                : 'Actividad terminada'}
            </Text>
            <Text style={styles.textoPanel}>
              Contrato comun listo: puntaje {estado.resultado.estadisticas.puntaje}, {estado.resultado.estadisticas.aciertos} aciertos, {estado.resultado.estadisticas.errores} errores y {estado.resultado.estadisticas.pistasUsadas} pistas usadas.
            </Text>
            <View style={styles.filaMetricas}>
              <TarjetaMetrica etiqueta="Nivel" valor={estado.resultado.estadisticas.nivelAlcanzado} />
              <TarjetaMetrica etiqueta="Tiempo" valor={`${Math.ceil(estado.resultado.estadisticas.tiempoTotalMs / 1000)} s`} />
              <TarjetaMetrica etiqueta="Precision" valor={`${estado.resultado.estadisticas.precisionPct}%`} />
              <TarjetaMetrica etiqueta="Patron" valor={estado.resultado.detalles.patronLongitud} />
            </View>
          </View>
        )}
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
    gap: espaciado.sm,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radios.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  botonVolverTexto: {
    color: colores.textoPrincipal,
    fontWeight: '700',
  },
  ceja: {
    color: colores.acento,
    fontSize: tipografia.etiqueta,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titulo: {
    color: colores.textoPrincipal,
    fontSize: tipografia.titulo,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.textoSecundario,
    lineHeight: 21,
  },
  panel: {
    backgroundColor: colores.fondoSecundario,
    borderRadius: radios.lg,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.bordeAcento,
    gap: espaciado.sm,
  },
  panelResultado: {
    backgroundColor: colores.superficieElevada,
    borderRadius: radios.lg,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: 'rgba(24,196,122,0.28)',
    gap: espaciado.sm,
  },
  tituloPanel: {
    color: colores.textoPrincipal,
    fontSize: tipografia.subtitulo,
    fontWeight: '800',
  },
  tituloResultado: {
    color: '#D7FFE7',
    fontSize: 22,
    fontWeight: '900',
  },
  textoPanel: {
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  textoAyuda: {
    color: colores.textoDebil,
    lineHeight: 19,
  },
  filaMetricas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
  },
  tarjetaMetrica: {
    minWidth: 105,
    backgroundColor: colores.superficie,
    borderRadius: radios.md,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    gap: 4,
  },
  etiquetaMetrica: {
    color: colores.textoDebil,
    fontSize: tipografia.etiqueta,
    textTransform: 'uppercase',
  },
  valorMetrica: {
    color: colores.alerta,
    fontSize: 20,
    fontWeight: '900',
  },
  tablero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -espaciado.xs,
  },
  celdaBaldosa: {
    padding: espaciado.xs,
  },
  columnaDos: {
    width: '50%',
  },
  columnaTres: {
    width: '33.3333%',
  },
  baldosa: {
    aspectRatio: 1,
    borderRadius: radios.md,
    backgroundColor: colores.baldosaBase,
    borderWidth: 1,
    borderColor: colores.bordeAcento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baldosaActiva: {
    backgroundColor: colores.baldosaActiva,
    borderColor: 'rgba(255,216,107,0.45)',
  },
  baldosaDeshabilitada: {
    opacity: 0.86,
  },
  baldosaTexto: {
    color: colores.textoPrincipal,
    fontSize: tipografia.hero,
    fontWeight: '900',
  },
  baldosaTextoActiva: {
    color: colores.fondoPrincipal,
  },
  filaAcciones: {
    gap: espaciado.sm,
  },
  botonPrimario: {
    backgroundColor: colores.exito,
    borderRadius: radios.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  botonPrimarioTexto: {
    color: '#052A16',
    fontWeight: '900',
    fontSize: 15,
  },
  botonSecundario: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radios.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  botonSecundarioTexto: {
    color: colores.textoPrincipal,
    fontWeight: '800',
  },
  botonInactivo: {
    opacity: 0.45,
  },
});
