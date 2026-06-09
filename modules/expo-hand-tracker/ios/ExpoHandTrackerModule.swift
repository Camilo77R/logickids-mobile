import ExpoModulesCore
import MediaPipeTasksVision

public class ExpoHandTrackerModule: Module {
  private var handLandmarker: HandLandmarker?
  private var isInitialized = false
  private let lock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("ExpoHandTracker")

    AsyncFunction("initialize") {
      try self.ensureHandLandmarker()
    }

    AsyncFunction("processFrame") { (imagePath: String) -> [String: Any]? in
      guard let image = self.loadImage(path: imagePath) else {
        return nil
      }
      self.lock.lock()
      defer { self.lock.unlock() }
      return self.detectHands(image: image)
    }

    Events("onLandmarks")
  }

  private func ensureHandLandmarker() throws {
    if isInitialized { return }
    guard let modelPath = Bundle.main.path(forResource: "hand_landmarker", ofType: "task") else {
      throw NSError(domain: "ExpoHandTracker", code: 1, userInfo: [NSLocalizedDescriptionKey: "hand_landmarker.task model not found in bundle"])
    }

    let options = HandLandmarkerOptions()
    options.baseOptions.modelAssetPath = modelPath
    options.runningMode = .image
    options.numHands = 2
    options.minHandDetectionConfidence = 0.5
    options.minTrackingConfidence = 0.5
    options.minHandPresenceConfidence = 0.5

    handLandmarker = try HandLandmarker.createFromOptions(options: options)
    isInitialized = true
  }

  private func loadImage(path: String) -> MPImage? {
    guard let image = UIImage(contentsOfFile: path) else { return nil }
    guard let mpImage = try? MPImage(image) else { return nil }
    return mpImage
  }

  private func detectHands(image: MPImage) -> [String: Any]? {
    guard let landmarker = handLandmarker else { return nil }
    guard let result = try? landmarker.detect(image: image) else { return nil }

    var handsList: [[String: Any]] = []

    for (idx, landmarks) in result.landmarks.enumerated() {
      let handedness: String
      if idx < result.handedness.count,
         let category = result.handedness[idx].first {
        handedness = category.categoryName
      } else {
        handedness = "Right"
      }

      let score: Double
      if idx < result.handedness.count,
         let category = result.handedness[idx].first {
        score = Double(category.score)
      } else {
        score = 0.0
      }

      var lmList: [[String: Any]] = []
      for lm in landmarks {
        lmList.append([
          "x": Double(lm.x),
          "y": Double(lm.y),
          "z": Double(lm.z)
        ])
      }

      handsList.append([
        "landmarks": lmList,
        "handedness": handedness,
        "score": score
      ])
    }

    return [
      "hands": handsList,
      "timestamp": Date().timeIntervalSince1970 * 1000
    ]
  }
}
