import * as Crypto from 'expo-crypto';

import { createGameOperationTracker } from './gameOperationIdentity';

export const createMobileGameOperationTracker = () =>
  createGameOperationTracker({ createId: () => Crypto.randomUUID() });
