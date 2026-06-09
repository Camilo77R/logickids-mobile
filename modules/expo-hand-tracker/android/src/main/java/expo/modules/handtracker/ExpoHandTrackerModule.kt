package expo.modules.handtracker

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoHandTrackerModule : Module() {
  private var isInit = false

  override fun definition() = ModuleDefinition {
    Name("ExpoHandTracker")

    AsyncFunction("initialize") {
      isInit = true
    }

    AsyncFunction("processFrame") { imagePath: String ->
      mapOf(
        "hands" to emptyList<Map<String, Any>>(),
        "timestamp" to System.currentTimeMillis()
      )
    }
  }
}
