package expo.modules.rungrowgps

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

class GpsRecordingService : Service() {
  private val client by lazy { LocationServices.getFusedLocationProviderClient(this) }
  private var session: GpsSession? = null
  private var callback: LocationCallback? = null
  private val locationModeReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      val current = session ?: return
      if (current.isActive && !context.hasEnabledLocation()) current.interrupt(LOCATION_DISABLED)
    }
  }

  override fun onCreate() {
    super.onCreate()
    ContextCompat.registerReceiver(
      this, locationModeReceiver, IntentFilter(LocationManager.MODE_CHANGED_ACTION), ContextCompat.RECEIVER_NOT_EXPORTED
    )
  }

  override fun onBind(intent: Intent?) = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val requestedId = intent?.getStringExtra(SESSION_ID)
    val requested = pendingSession?.takeIf { it.id == requestedId }
    val promotionError = try {
      // A startForegroundService request must be promoted even if the screen canceled it meanwhile.
      promoteToForeground()
      null
    } catch (_: IllegalStateException) {
      "앱 화면을 연 상태에서 GPS 측정을 시작해 주세요."
    } catch (_: SecurityException) {
      "위치 권한이 없어 GPS 측정을 중단했어요."
    }
    if (requested == null || !requested.isActive || promotionError != null) {
      if (requested != null) {
        if (requested.isActive && promotionError != null) requested.interrupt(promotionError)
        if (pendingSession === requested) pendingSession = null
      }
      stopSelfResult(startId)
      return START_NOT_STICKY
    }

    if (session !== requested) {
      detachSession()
      session = requested
      requested.onStateChanged = { syncRecording(requested) }
    }
    syncRecording(requested)
    return START_NOT_STICKY
  }

  private fun promoteToForeground() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManagerCompat.from(this).createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "RunGrow GPS 측정", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setContentTitle("RunGrow GPS 프로토타입")
      .setContentText("러닝 측정 세션이 열려 있어요.")
      .setOngoing(true)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)

    packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
      notification.setContentIntent(PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE))
    }
    ServiceCompat.startForeground(this, NOTIFICATION_ID, notification.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
  }

  private fun syncRecording(current: GpsSession) {
    if (current.isRecording) {
      startUpdates(current)
    } else {
      removeUpdates()
      if (!current.isActive) stopSelf()
    }
  }

  // The module checks fine location before start. Permission can still change afterward.
  @SuppressLint("MissingPermission")
  private fun startUpdates(current: GpsSession) {
    if (callback != null) return
    if (!hasEnabledLocation()) {
      current.interrupt(LOCATION_DISABLED)
      return
    }
    val listener = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        if (callback === this) result.locations.forEach(current::record)
      }
    }
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
      .setMinUpdateIntervalMillis(1000L)
      .setMaxUpdateAgeMillis(0L)
      .build()
    callback = listener
    try {
      client.requestLocationUpdates(request, listener, Looper.getMainLooper())
        .addOnSuccessListener { if (callback !== listener) client.removeLocationUpdates(listener) }
        .addOnFailureListener {
          if (callback === listener) current.interrupt("GPS 수신을 시작하지 못했어요. 위치 서비스와 앱 권한을 확인해 주세요.")
        }
    } catch (_: SecurityException) {
      current.interrupt("위치 권한이 없어 GPS 측정을 중단했어요.")
    }
  }

  private fun removeUpdates() {
    val listener = callback ?: return
    callback = null
    client.removeLocationUpdates(listener)
  }

  private fun detachSession() {
    removeUpdates()
    session?.let { previous ->
      previous.onStateChanged = null
      if (previous.isActive) previous.interrupt("Android 위치 서비스가 종료됐어요.")
      if (pendingSession === previous) pendingSession = null
    }
    session = null
  }

  override fun onDestroy() {
    unregisterReceiver(locationModeReceiver)
    detachSession()
    super.onDestroy()
  }

  companion object {
    private const val CHANNEL_ID = "rungrow-gps"
    private const val NOTIFICATION_ID = 1741
    private const val SESSION_ID = "session-id"
    private const val LOCATION_DISABLED = "기기의 위치 서비스가 꺼져서 측정을 중단했어요."
    private var pendingSession: GpsSession? = null

    internal fun start(context: Context, session: GpsSession) {
      pendingSession = session
      val intent = Intent(context, GpsRecordingService::class.java).putExtra(SESSION_ID, session.id)
      try {
        ContextCompat.startForegroundService(context, intent)
      } catch (_: IllegalStateException) {
        pendingSession = null
        session.interrupt("앱 화면을 연 상태에서 GPS 측정을 시작해 주세요.")
      } catch (_: SecurityException) {
        pendingSession = null
        session.interrupt("위치 권한이 없어 GPS 측정을 시작하지 못했어요.")
      }
    }
  }
}
