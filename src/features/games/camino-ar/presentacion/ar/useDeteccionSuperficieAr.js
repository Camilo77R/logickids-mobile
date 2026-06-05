import { useCallback, useMemo, useReducer, useRef } from 'react';
import {
  crearEstadoInicialDeteccionSuperficieAr,
  reducirDeteccionSuperficieAr,
  resolverEtiquetaEstadoDeteccionAr,
  resolverMensajeDeteccionSuperficieAr,
} from './deteccionSuperficieAr';

export const useDeteccionSuperficieAr = () => {
  const anclasRef = useRef(new Map());
  const [estado, dispatch] = useReducer(
    reducirDeteccionSuperficieAr,
    undefined,
    crearEstadoInicialDeteccionSuperficieAr,
  );

  const registrarAncla = useCallback((anchor) => {
    if (!anchor?.anchorId) {
      return;
    }

    anclasRef.current.set(anchor.anchorId, anchor);
    dispatch({
      tipo: 'ancla-registrada',
      cantidadSuperficies: anclasRef.current.size,
    });
  }, []);

  const removerAncla = useCallback((anchor) => {
    if (!anchor?.anchorId) {
      return;
    }

    anclasRef.current.delete(anchor.anchorId);

    if (anclasRef.current.size === 0) {
      dispatch({ tipo: 'anclas-vacias' });
      return;
    }

    dispatch({
      tipo: 'ancla-registrada',
      cantidadSuperficies: anclasRef.current.size,
    });
  }, []);

  const confirmarSuperficie = useCallback(() => {
    dispatch({ tipo: 'superficie-seleccionada' });
  }, []);

  const reiniciarSeleccion = useCallback(() => {
    anclasRef.current.clear();
    dispatch({ tipo: 'reiniciar-seleccion' });
  }, []);

  return useMemo(
    () => ({
      estado,
      revisionReinicio: estado.revisionReinicio,
      etiquetaEstado: resolverEtiquetaEstadoDeteccionAr(estado),
      mensaje: resolverMensajeDeteccionSuperficieAr(estado),
      registrarAncla,
      actualizarAncla: registrarAncla,
      removerAncla,
      confirmarSuperficie,
      reiniciarSeleccion,
    }),
    [
      confirmarSuperficie,
      estado,
      registrarAncla,
      reiniciarSeleccion,
      removerAncla,
    ],
  );
};
