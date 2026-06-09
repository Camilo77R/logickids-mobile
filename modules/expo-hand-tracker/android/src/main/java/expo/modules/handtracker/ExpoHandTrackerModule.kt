package expo.modules.handtracker

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult
import java.io.File

class ExpoHandTrackerModule : Module() {
  private var handLandmarker: HandLandmarker? = null
  private var isInit = false
  private val lock = Any()

  override fun definition() = ModuleDefinition {
    Name("ExpoHandTracker")

    AsyncFunction("initialize") {
      ensureHandLandmarker()
    }

    AsyncFunction("processFrame") { imagePath: String ->
      val bitmap = loadBitmap(imagePath) ?: return@AsyncFunction null
      synchronized(lock) {
        val result = detectHands(bitmap)
        result?.let { formatResult(it) }
      }
    }

    Events("onLandmarks")
  }

  private fun ensureHandLandmarker() {
    if (isInit) return
    try {
      val appContext = appContext.reactContext ?: return
      val baseOptions = BaseOptions.builder()
        .setModelAssetPath("hand_landmarker.task")
        .setDelegate(Delegate.GPU)
        .build()

      val options = HandLandmarker.HandLandmarkerOptions.builder()
        .setBaseOptions(baseOptions)
        .setRunningMode(RunningMode.IMAGE)
        .setNumHands(2)
        .setMinHandDetectionConfidence(0.5f)
        .setMinTrackingConfidence(0.5f)
        .setMinHandPresenceConfidence(0.5f)
        .build()

      handLandmarker = HandLandmarker.createFromOptions(appContext, options)
      isInit = true
    } catch (e: Exception) {
      android.util.Log.e("ExpoHandTracker", "Failed to init", e)
    }
  }

  private fun loadBitmap(path: String): Bitmap? {
    return try {
      val file = File(path)
      if (!file.exists()) return null
      val bitmap = BitmapFactory.decodeFile(path)
      bitmap?.let { rotateIfNeeded(it, path) }
    } catch (e: Exception) {
      null
    }
  }

  private fun rotateIfNeeded(bitmap: Bitmap, path: String): Bitmap {
    val exif = try {
      android.media.ExifInterface(path)
    } catch (e: Exception) {
      return bitmap
    }
    val orientation = exif.getAttributeInt(
      android.media.ExifInterface.TAG_ORIENTATION,
      android.media.ExifInterface.ORIENTATION_NORMAL
    )
    val matrix = Matrix()
    when (orientation) {
      android.media.ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      android.media.ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      android.media.ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      else -> return bitmap
    }
    Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
  }

  private fun detectHands(bitmap: Bitmap): HandLandmarkerResult? {
    try {
      val mpImage = BitmapImageBuilder(bitmap).build()
      return handLandmarker?.detect(mpImage)
    } catch (e: Exception) {
      return null
    }
  }

  private fun formatResult(result: HandLandmarkerResult): Map<String, Any> {
    val handsList = mutableListOf<Map<String, Any>>()
    for (idx in 0 until result.landmarks().size()) {
      val landmarks = result.landmarks()[idx]
      val handedness = if (result.handedness()?.get(idx)?.get(0)?.categoryName() == "Left") "Left" else "Right"
      val score = result.handedness()?.get(idx)?.get(0)?.score() ?: 0.0f

      val lmList = mutableListOf<Map<String, Any>>()
      for (lm in landmarks) {
        lmList.add(mapOf(
          "x" to lm.x().toDouble(),
          "y" to lm.y().toDouble(),
          "z" to lm.z().toDouble()
        ))
      }

      handsList.add(mapOf(
        "landmarks" to lmList,
        "handedness" to handedness,
        "score" to score.toDouble()
      ))
    }

    return mapOf(
      "hands" to handsList,
      "timestamp" to System.currentTimeMillis()
    )
  }
}
