import CoreLocation
import ExpoModulesCore
import UIKit

public final class RunGrowGpsModule: Module {
  private let recorder = GpsRecorder()

  public func definition() -> ModuleDefinition {
    Name("RunGrowGps")

    AsyncFunction("requestPermission") { [recorder] (promise: Promise) in
      recorder.requestPermission(promise)
    }.runOnQueue(.main)

    AsyncFunction("start") { [recorder] in recorder.start() }.runOnQueue(.main)
    AsyncFunction("pause") { [recorder] in recorder.pause() }.runOnQueue(.main)
    AsyncFunction("resume") { [recorder] in recorder.resume() }.runOnQueue(.main)
    AsyncFunction("stop") { [recorder] in recorder.stop() }.runOnQueue(.main)
    AsyncFunction("getSnapshot") { [recorder] in recorder.snapshot() }.runOnQueue(.main)

    OnDestroy { [recorder] in
      DispatchQueue.main.async { recorder.stop() }
    }
  }
}

// Core Location and all recorder operations use the main queue.
private final class GpsRecorder: NSObject, CLLocationManagerDelegate {
  private enum State: String {
    case idle, recording, paused, stopped, interrupted
  }

  private lazy var manager: CLLocationManager = {
    let manager = CLLocationManager()
    manager.delegate = self
    manager.activityType = .fitness
    manager.desiredAccuracy = kCLLocationAccuracyBest
    manager.distanceFilter = 3
    manager.pausesLocationUpdatesAutomatically = false
    return manager
  }()

  private var permissionRequest: Promise?
  private var state = State.idle
  private var sessionStartedAt = Date.distantPast
  private var segmentStartedAt = Date.distantPast
  private var movingSince: ContinuousClock.Instant?
  private var movingTime: Duration = .zero
  private var lastSample: CLLocation?
  private var lastAccepted: CLLocation?
  private var sampleCount = 0
  private var acceptedCount = 0
  private var distanceMeters = 0.0
  private var firstFixMs: Double?
  private var message: String?

  private var hasPreciseLocation: Bool {
    let status = manager.authorizationStatus
    return (status == .authorizedWhenInUse || status == .authorizedAlways)
      && manager.accuracyAuthorization == .fullAccuracy
  }

  func requestPermission(_ promise: Promise) {
    guard manager.authorizationStatus == .notDetermined else {
      promise.resolve(hasPreciseLocation)
      return
    }
    guard permissionRequest == nil else {
      promise.reject("ERR_GPS_PERMISSION_PENDING", "위치 권한 요청이 이미 진행 중이에요.")
      return
    }
    permissionRequest = promise
    manager.requestWhenInUseAuthorization()
  }

  func start() {
    guard state != .recording && state != .paused else { return }
    state = .idle
    sampleCount = 0
    acceptedCount = 0
    distanceMeters = 0
    movingTime = .zero
    lastSample = nil
    firstFixMs = nil
    message = nil
    sessionStartedAt = Date()
    beginSegment()
  }

  func pause() {
    guard state == .recording else { return }
    endSegment()
    state = .paused
  }

  func resume() {
    guard state == .paused else { return }
    beginSegment()
  }

  func stop() {
    guard state == .recording || state == .paused else { return }
    endSegment()
    state = .stopped
  }

  private func beginSegment() {
    guard hasPreciseLocation else {
      interrupt("설정에서 위치 접근과 정확한 위치를 허용해 주세요.")
      return
    }
    let inForeground = MainActor.assumeIsolated { UIApplication.shared.applicationState != .background }
    guard inForeground else {
      interrupt("앱 화면을 연 상태에서 GPS 측정을 시작해 주세요.")
      return
    }
    let modes = Bundle.main.object(forInfoDictionaryKey: "UIBackgroundModes") as? [String]
    guard modes?.contains("location") == true else {
      interrupt("이 빌드에 백그라운드 위치 설정이 포함되어 있지 않아요.")
      return
    }
    segmentStartedAt = Date()
    movingSince = .now
    state = .recording
    manager.allowsBackgroundLocationUpdates = true
    manager.showsBackgroundLocationIndicator = true
    manager.startUpdatingLocation()
  }

  private func endSegment() {
    if let movingSince {
      movingTime += movingSince.duration(to: .now)
      self.movingSince = nil
      manager.stopUpdatingLocation()
      manager.allowsBackgroundLocationUpdates = false
    }
    lastAccepted = nil
  }

  private func interrupt(_ reason: String) {
    endSegment()
    state = .interrupted
    message = reason
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if manager.authorizationStatus != .notDetermined, let permissionRequest {
      self.permissionRequest = nil
      permissionRequest.resolve(hasPreciseLocation)
    }
    if (state == .recording || state == .paused) && !hasPreciseLocation {
      interrupt("정확한 위치 권한이 해제되어 측정을 중단했어요.")
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard state == .recording else { return }
    for sample in locations {
      guard sample.timestamp >= segmentStartedAt,
            sample.timestamp > (lastSample?.timestamp ?? .distantPast),
            sample.horizontalAccuracy.isFinite,
            sample.horizontalAccuracy >= 0,
            CLLocationCoordinate2DIsValid(sample.coordinate) else { continue }

      lastSample = sample
      sampleCount += 1
      guard sample.horizontalAccuracy <= 20 else { continue }

      if let previous = lastAccepted {
        let meters = sample.distance(from: previous)
        let seconds = sample.timestamp.timeIntervalSince(previous.timestamp)
        guard meters / seconds <= 12 else { continue }
        distanceMeters += meters
      }

      lastAccepted = sample
      acceptedCount += 1
      if firstFixMs == nil {
        firstFixMs = sample.timestamp.timeIntervalSince(sessionStartedAt) * 1000
      }
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    guard state == .recording else { return }
    if (error as? CLError)?.code == .locationUnknown { return }
    interrupt("위치 수신이 중단됐어요. 위치 서비스와 앱 권한을 확인해 주세요.")
  }

  func snapshot() -> [String: Any] {
    let duration = movingTime + (movingSince?.duration(to: .now) ?? .zero)
    let elapsed = duration.components
    var result: [String: Any] = [
      "status": state.rawValue,
      "movingMs": Double(elapsed.seconds) * 1000 + Double(elapsed.attoseconds) / 1e15,
      "distanceMeters": distanceMeters,
      "sampleCount": sampleCount,
      "acceptedCount": acceptedCount
    ]
    result["firstFixMs"] = firstFixMs
    result["accuracyMeters"] = lastSample?.horizontalAccuracy
    result["message"] = message
    return result
  }
}
