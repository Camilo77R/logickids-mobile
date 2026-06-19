import { registerWebModule, NativeModule } from 'expo';

class ExpoHandTrackerModule extends NativeModule<{}> {}

export default registerWebModule(ExpoHandTrackerModule, 'ExpoHandTrackerModule');
