import * as THREE from 'three';

export function crearHitAreaPieza(parteDef) {
  const [x = 0.3, y = 0.3, z = x] = parteDef.tamanio ?? [];
  const esPiezaPequena = x <= 0.12 || y <= 0.3 || parteDef.forma === 'cone';
  const minimoBase = esPiezaPequena ? 0.9 : 0.55;
  const minimoAlto = esPiezaPequena ? 1.05 : 0.55;

  return [
    Math.max(x * 1.9, minimoBase),
    Math.max(y * 1.8, minimoAlto),
    Math.max(z * 1.9, minimoBase),
  ];
}

export function obtenerPuntoLocalDesdeEvento(event, schematicNode) {
  if (!event) return null;

  if (!schematicNode || !event.raycaster) {
    if (!event.point) return null;
    const punto = new THREE.Vector3(event.point.x, event.point.y, event.point.z);
    schematicNode?.worldToLocal?.(punto);
    return [punto.x, punto.y, punto.z];
  }

  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const target = new THREE.Vector3();
  event.raycaster.ray.intersectPlane(plane, target);
  schematicNode.worldToLocal(target);
  return [target.x, target.y, target.z];
}

export function crearOffsetDeArrastre(posicionInicial, pointerLocal) {
  if (!pointerLocal) return [0, 0, 0];

  return [
    posicionInicial[0] - pointerLocal[0],
    posicionInicial[1] - pointerLocal[1],
    posicionInicial[2] - pointerLocal[2],
  ];
}

export function esPointerActivo(arrastre, pointerId) {
  if (!arrastre) return false;
  if (pointerId == null || arrastre.pointerId == null) return true;
  return pointerId === arrastre.pointerId;
}

export function calcularPosicionArrastre(pointerLocal, offset) {
  return [
    pointerLocal[0] + offset[0],
    pointerLocal[1] + offset[1],
    pointerLocal[2] + offset[2],
  ];
}

export function aplicarMovimientoArrastre({
  event,
  arrastre,
  schematicNode,
  onMoverParte,
}) {
  const pointerLocal = obtenerPuntoLocalDesdeEvento(event, schematicNode);
  if (!pointerLocal) return null;

  const siguientePosicion = calcularPosicionArrastre(pointerLocal, arrastre.offset);
  const posicionNormalizada = [...siguientePosicion];

  if (Number.isFinite(arrastre?.zFijo)) {
    posicionNormalizada[2] = arrastre.zFijo;
  }

  if (arrastre.node) {
    arrastre.node.position.set(...posicionNormalizada);
  }

  onMoverParte?.(arrastre.idParte, posicionNormalizada);
  return posicionNormalizada;
}
