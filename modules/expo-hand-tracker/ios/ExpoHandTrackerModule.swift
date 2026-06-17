import ExpoModulesCore

public class ExpoHandTrackerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoHandTracker")

    AsyncFunction("initialize") {
    }

    AsyncFunction("processFrame") { (imagePath: String) -> [String: Any] in
      [
        "hands": [],
        "timestamp": Date().timeIntervalSince1970 * 1000
      ]
    }
  }
}
