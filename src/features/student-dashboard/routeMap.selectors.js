const PATH_VISUAL_STATES = Object.freeze({
  locked: 'locked',
  next: 'next',
  current: 'current',
  completed: 'completed',
});

const TERMINAL_PARTICIPANT_STATES = new Set(['completado', 'abandonado', 'cerrado']);

const toPositiveInt = (value) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

const findFirstIndex = (nodes, predicate) => nodes.findIndex(predicate);

const resolveRouteCompleted = ({ pathMode, profile, activeSession, currentStep, totalSteps }) => {
  if (!pathMode) {
    return false;
  }

  const participantState = profile?.sesion_participante_estado ?? activeSession?.participantState ?? null;
  return Boolean(
    currentStep &&
      totalSteps &&
      currentStep >= totalSteps &&
      TERMINAL_PARTICIPANT_STATES.has(participantState),
  );
};

const decorateNode = (node, visualState) => ({
  ...node,
  visualState,
  isCompleted: visualState === PATH_VISUAL_STATES.completed,
  isCurrent: visualState === PATH_VISUAL_STATES.current,
  isNext: visualState === PATH_VISUAL_STATES.next,
  isLocked: visualState === PATH_VISUAL_STATES.locked,
});

export const buildRouteMapState = ({
  nodes = [],
  profile = null,
  activeSession = null,
} = {}) => {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const pathMode = (profile?.sesion_modo ?? activeSession?.mode ?? null) === 'path';
  const currentStep = toPositiveInt(profile?.sesion_paso_actual ?? activeSession?.currentStep);
  const totalSteps = toPositiveInt(profile?.sesion_total_pasos ?? activeSession?.totalSteps);
  const routeCompleted = resolveRouteCompleted({
    pathMode,
    profile,
    activeSession,
    currentStep,
    totalSteps,
  });
  const assignedNodes = safeNodes.filter((node) => node.gameSlug);
  const resolvedTotalSteps = totalSteps ?? assignedNodes.length;
  const boundedCurrentStep = currentStep ? Math.min(currentStep, resolvedTotalSteps || currentStep) : null;
  const currentIndexFromPath =
    pathMode && boundedCurrentStep ? Math.max(0, boundedCurrentStep - 1) : -1;
  const currentIndexFromStatus = findFirstIndex(safeNodes, (node) => node.status === 'activo');
  const currentIndex = currentIndexFromPath >= 0 ? currentIndexFromPath : currentIndexFromStatus;
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : findFirstIndex(safeNodes, (node) => node.gameSlug);

  const nodesWithVisualState = safeNodes.map((node, index) => {
    if (!node.gameSlug) {
      return decorateNode(node, PATH_VISUAL_STATES.locked);
    }

    if (pathMode) {
      if (routeCompleted) {
        return decorateNode(node, PATH_VISUAL_STATES.completed);
      }

      if (currentIndex >= 0 && index < currentIndex) {
        return decorateNode(node, PATH_VISUAL_STATES.completed);
      }

      if (index === currentIndex) {
        return decorateNode(node, PATH_VISUAL_STATES.current);
      }

      if (index === nextIndex) {
        return decorateNode(node, PATH_VISUAL_STATES.next);
      }

      return decorateNode(node, PATH_VISUAL_STATES.locked);
    }

    if (node.status === 'completado') {
      return decorateNode(node, PATH_VISUAL_STATES.completed);
    }

    if (node.status === 'activo') {
      return decorateNode(node, PATH_VISUAL_STATES.current);
    }

    return decorateNode(
      node,
      node.status === 'bloqueado' ? PATH_VISUAL_STATES.locked : PATH_VISUAL_STATES.next,
    );
  });

  const resolvedCurrentIndex = findFirstIndex(
    nodesWithVisualState,
    (node) => node.visualState === PATH_VISUAL_STATES.current,
  );
  const completedCount = nodesWithVisualState.filter(
    (node) => node.visualState === PATH_VISUAL_STATES.completed,
  ).length;
  const progressAnchorIndex =
    resolvedCurrentIndex >= 0
      ? resolvedCurrentIndex
      : routeCompleted
        ? Math.max(nodesWithVisualState.length - 1, 0)
        : Math.max(completedCount - 1, 0);
  const maxSegments = Math.max(nodesWithVisualState.length - 1, 1);
  const progressPercent = Math.min(
    100,
    Math.max(0, (progressAnchorIndex / maxSegments) * 100),
  );

  const routeTitle = profile?.sesion_ruta_nombre ?? activeSession?.routeName ?? 'Ruta de hoy';
  const completedStepsLabel =
    boundedCurrentStep && resolvedTotalSteps
      ? `${Math.min(boundedCurrentStep, resolvedTotalSteps)}/${resolvedTotalSteps} pasos`
      : `${completedCount}/${nodesWithVisualState.length} juegos`;

  return {
    mode: pathMode ? 'path' : 'free',
    routeCompleted,
    currentStep,
    totalSteps,
    progressPercent: routeCompleted ? 100 : progressPercent,
    routeTitle,
    completedStepsLabel,
    nodes: nodesWithVisualState,
  };
};

export { PATH_VISUAL_STATES, TERMINAL_PARTICIPANT_STATES };
