import { LogBox } from 'react-native';

const THREE_CLOCK_DEPRECATION =
  'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.';

let installed = false;

export function installDevelopmentWarningFilters() {
  if (!__DEV__ || installed) {
    return;
  }

  installed = true;

  // The warning currently comes from the 3D dependency stack, not from our app
  // code. We keep the behavior intact and only hide this known dev-only noise.
  LogBox.ignoreLogs([THREE_CLOCK_DEPRECATION]);
}
