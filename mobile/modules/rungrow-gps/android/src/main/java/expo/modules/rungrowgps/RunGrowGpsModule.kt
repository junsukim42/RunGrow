package expo.modules.rungrowgps

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailabilityLight
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RunGrowGpsModule : Module() {
  private var session = GpsSession()

  override fun definition() = ModuleDefinition {
    Name("RunGrowGps")

    AsyncFunction("start") {
      if (!session.isActive) {
        session = GpsSession()
        val context = appContext.reactContext?.applicationContext
        if (context == null) {
          session.interrupt("앱 화면을 다시 열고 GPS 측정을 시작해 주세요.")
        } else {
          startRecording(context)
        }
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("pause") { session.pause() }.runOnQueue(Queues.MAIN)
    AsyncFunction("resume") { session.resume() }.runOnQueue(Queues.MAIN)
    AsyncFunction("stop") { session.stop() }.runOnQueue(Queues.MAIN)
    AsyncFunction("getSnapshot") { session.snapshot() }.runOnQueue(Queues.MAIN)
    AsyncFunction("getPoints") { session.recordedPoints() }.runOnQueue(Queues.MAIN)

    OnDestroy {
      Handler(Looper.getMainLooper()).post { session.stop() }
    }
  }

  private fun startRecording(context: Context) {
    val message = when {
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) !=
        PackageManager.PERMISSION_GRANTED -> "설정에서 정확한 위치를 허용해 주세요."
      !context.hasEnabledLocation() -> "기기의 위치 서비스를 켜고 다시 시작해 주세요."
      GoogleApiAvailabilityLight.getInstance().isGooglePlayServicesAvailable(context) !=
        ConnectionResult.SUCCESS -> "이 기기에서 Google Play 서비스를 사용할 수 없어요."
      else -> null
    }
    if (message != null) {
      session.interrupt(message)
      return
    }
    session.start()
    GpsRecordingService.start(context, session)
  }
}

internal fun Context.hasEnabledLocation(): Boolean {
  val manager = getSystemService(LocationManager::class.java) ?: return false
  return LocationManagerCompat.isLocationEnabled(manager)
}
