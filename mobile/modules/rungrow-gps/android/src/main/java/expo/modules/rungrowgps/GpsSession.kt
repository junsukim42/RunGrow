package expo.modules.rungrowgps

import android.location.Location
import android.os.SystemClock
import java.util.UUID

// Commands and fused-location callbacks run on the Android main thread.
internal class GpsSession {
  private enum class State { IDLE, RECORDING, PAUSED, STOPPED, INTERRUPTED }

  val id: String = UUID.randomUUID().toString()
  private var state = State.IDLE
  private var sessionStartedAt = 0L
  private var movingSince: Long? = null
  private var movingNanos = 0L
  private var lastSample: Location? = null
  private var lastAccepted: Location? = null
  private var sampleCount = 0
  private var acceptedCount = 0
  private var distanceMeters = 0.0
  private var firstFixMs: Double? = null
  private var message: String? = null

  val isRecording: Boolean get() = state == State.RECORDING
  val isActive: Boolean get() = isRecording || state == State.PAUSED
  var onStateChanged: (() -> Unit)? = null

  fun start() {
    sessionStartedAt = SystemClock.elapsedRealtimeNanos()
    beginSegment(sessionStartedAt)
  }

  fun pause() {
    if (!isRecording) return
    endSegment()
    state = State.PAUSED
    onStateChanged?.invoke()
  }

  fun resume() {
    if (state == State.PAUSED) beginSegment(SystemClock.elapsedRealtimeNanos())
  }

  fun stop() {
    if (!isActive) return
    endSegment()
    state = State.STOPPED
    onStateChanged?.invoke()
  }

  fun interrupt(reason: String) {
    endSegment()
    state = State.INTERRUPTED
    message = reason
    onStateChanged?.invoke()
  }

  private fun beginSegment(now: Long) {
    movingSince = now
    state = State.RECORDING
    onStateChanged?.invoke()
  }

  private fun endSegment() {
    movingSince?.let { movingNanos += SystemClock.elapsedRealtimeNanos() - it }
    movingSince = null
    lastAccepted = null
  }

  fun record(sample: Location) {
    val segmentStart = movingSince ?: return
    val timestamp = sample.elapsedRealtimeNanos
    if (timestamp < segmentStart || timestamp <= (lastSample?.elapsedRealtimeNanos ?: 0L) ||
      !sample.hasAccuracy() || !sample.accuracy.isFinite() || sample.accuracy < 0 ||
      sample.latitude !in -90.0..90.0 || sample.longitude !in -180.0..180.0
    ) return

    lastSample = sample
    sampleCount++
    if (sample.accuracy > 20) return

    lastAccepted?.let { previous ->
      val meters = sample.distanceTo(previous)
      val seconds = (timestamp - previous.elapsedRealtimeNanos) / 1e9
      if (meters / seconds > 12) return
      distanceMeters += meters
    }
    lastAccepted = sample
    acceptedCount++
    if (firstFixMs == null) firstFixMs = (timestamp - sessionStartedAt) / 1e6
  }

  fun snapshot() = buildMap<String, Any> {
    val moving = movingSince?.let { SystemClock.elapsedRealtimeNanos() - it } ?: 0L
    put("status", state.name.lowercase())
    put("movingMs", (movingNanos + moving) / 1e6)
    put("distanceMeters", distanceMeters)
    put("sampleCount", sampleCount)
    put("acceptedCount", acceptedCount)
    firstFixMs?.let { put("firstFixMs", it) }
    lastSample?.let { put("accuracyMeters", it.accuracy.toDouble()) }
    message?.let { put("message", it) }
  }
}
