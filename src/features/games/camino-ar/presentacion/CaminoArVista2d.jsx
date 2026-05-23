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
import { colores, espaciado, radios, tipografia } from '../../../../theme/tokens';

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

export default function CaminoArVista2d({
  onSalir,
  escena,
}) {
  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoPrincipal} />
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.encabezado}>
          <TouchableOpacity onPress={onSalir} style={styles.botonVolver}>
            <Text style={styles.botonVolverTexto}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.ceja}>{escena.encabezado.ceja}</Text>
          <Text style={styles.titulo}>{escena.encabezado.titulo}</Text>
          <Text style={styles.subtitulo}>{escena.encabezado.subtitulo}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>{escena.sesion.titulo}</Text>
          <Text style={styles.textoPanel}>{escena.sesion.descripcion}</Text>
          <View style={styles.filaMetricas}>
            {escena.sesion.metricas.map((metrica) => (
              <TarjetaMetrica
                key={`sesion-${metrica.etiqueta}`}
                etiqueta={metrica.etiqueta}
                valor={metrica.valor}
              />
            ))}
          </View>
          {escena.sesion.errorPersistencia ? (
            <Text style={styles.textoErrorPersistencia}>{escena.sesion.errorPersistencia}</Text>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>{escena.estadoActual.titulo}</Text>
          <Text style={styles.textoPanel}>{escena.estadoActual.mensaje}</Text>
          <Text style={styles.textoAyuda}>{escena.estadoActual.descripcion}</Text>
          <View style={styles.filaMetricas}>
            {escena.estadoActual.metricas.map((metrica) => (
              <TarjetaMetrica
                key={`estado-${metrica.etiqueta}`}
                etiqueta={metrica.etiqueta}
                valor={metrica.valor}
              />
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>{escena.tablero.titulo}</Text>
          <Text style={styles.textoPanel}>{escena.tablero.descripcion}</Text>
          <View style={styles.tablero}>
            {escena.tablero.baldosas.map((baldosa) => (
              <View
                key={baldosa.id}
                style={[
                  styles.celdaBaldosa,
                  baldosa.varianteColumna === 'dos' ? styles.columnaDos : styles.columnaTres,
                ]}
              >
                <Baldosa
                  indice={baldosa.indice}
                  activa={baldosa.activa}
                  deshabilitada={baldosa.deshabilitada}
                  onPress={escena.tablero.alSeleccionarBaldosa}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.filaAcciones}>
          <TouchableOpacity style={styles.botonPrimario} onPress={escena.acciones.iniciar.accion}>
            <Text style={styles.botonPrimarioTexto}>{escena.acciones.iniciar.etiqueta}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.botonSecundario,
              escena.acciones.pista.deshabilitada && styles.botonInactivo,
            ]}
            disabled={escena.acciones.pista.deshabilitada}
            onPress={escena.acciones.pista.accion}
          >
            <Text style={styles.botonSecundarioTexto}>{escena.acciones.pista.etiqueta}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonSecundario} onPress={escena.acciones.reiniciar.accion}>
            <Text style={styles.botonSecundarioTexto}>{escena.acciones.reiniciar.etiqueta}</Text>
          </TouchableOpacity>
        </View>

        {escena.resultado.visible && (
          <View style={styles.panelResultado}>
            <Text style={styles.tituloResultado}>{escena.resultado.titulo}</Text>
            <Text style={styles.textoPanel}>{escena.resultado.descripcion}</Text>
            <View style={styles.filaMetricas}>
              {escena.resultado.metricas.map((metrica) => (
                <TarjetaMetrica
                  key={`resultado-${metrica.etiqueta}`}
                  etiqueta={metrica.etiqueta}
                  valor={metrica.valor}
                />
              ))}
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
  textoErrorPersistencia: {
    color: '#FF8E8E',
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
