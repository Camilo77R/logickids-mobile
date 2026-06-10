package expo.modules.handtracker

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.framework.image.BitmapImageBuilder
import kotlin.math.sqrt

class ExpoHandTrackerModule : Module() {
  private var handLandmarker: HandLandmarker? = null
  private var isInit = false

  override fun definition() = ModuleDefinition {
    Name("ExpoHandTracker")

    AsyncFunction("initialize") {
      isInit = true
      true
    }

    AsyncFunction("processFrame") { imagePath: String ->
      if (!isInit) {
        return@AsyncFunction buildEmptyResult()
      }
      try {
        ensureLandmarker()
        val bitmap = loadBitmap(imagePath) ?: return@AsyncFunction buildEmptyResult()
        val mpImage = BitmapImageBuilder(bitmap).build()
        val result = handLandmarker?.detect(mpImage)
        val hands = result?.landmarks()?.map { handLandmarks ->
          val landmarks = handLandmarks.map { lm ->
            mapOf(
              "x" to lm.x().toDouble(),
              "y" to lm.y().toDouble(),
              "z" to lm.z().toDouble()
            )
          }
          val isPinching = if (handLandmarks.size > 8) {
            val thumb = handLandmarks[4]
            val index = handLandmarks[8]
            val dx = thumb.x() - index.x()
            val dy = thumb.y() - index.y()
            sqrt((dx * dx + dy * dy).toDouble()) < 0.05
          } else false
          mapOf(
            "landmarks" to landmarks,
            "isPinching" to isPinching
          )
        } ?: emptyList()
        mapOf(
          "hands" to hands,
          "timestamp" to System.currentTimeMillis()
        )
      } catch (e: Exception) {
        mapOf(
          "hands" to emptyList<Map<String, Any>>(),
          "timestamp" to System.currentTimeMillis(),
          "error" to (e.message ?: "Unknown error")
        )
      }
    }

    AsyncFunction("startTracking") { _fps: Int? ->
      isInit = true
    }

    AsyncFunction("stopTracking") {
      isInit = false
    }

    Function("isTracking") {
      isInit
    }
  }

  private fun ensureLandmarker() {
    if (handLandmarker != null) return
    val context = appContext.reactContext ?: throw IllegalStateException("React context not available")
    val baseOptions = BaseOptions.builder()
      .setModelAssetPath("hand_landmarker.task")
      .build()
    val options = HandLandmarkerOptions.builder()
      .setBaseOptions(baseOptions)
      .setRunningMode(RunningMode.IMAGE)
      .setNumHands(1)
      .build()
    handLandmarker = HandLandmarker.createFromOptions(context, options)
  }

  private fun loadBitmap(imagePath: String): Bitmap? {
    return try {
      if (imagePath.startsWith("content://")) {
        val context = appContext.reactContext ?: return null
        val uri = Uri.parse(imagePath)
        context.contentResolver.openInputStream(uri)?.use { stream ->
          BitmapFactory.decodeStream(stream)
        }
      } else {
        BitmapFactory.decodeFile(imagePath)
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun buildEmptyResult(): Map<String, Any> {
    return mapOf(
      "hands" to emptyList<Map<String, Any>>(),
      "timestamp" to System.currentTimeMillis()
    )
  }
}
