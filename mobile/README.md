# RunGrow 모바일 앱

**RunGrow**는 Figma 디자인을 바탕으로 만든 React Native + Expo 러닝 앱 프로토타입입니다. Android와 iPhone에서 Expo Go로 UI 데모를 실행할 수 있습니다.

## 휴대폰에서 실행

Node.js LTS와 휴대폰의 Expo Go가 필요합니다. PC와 휴대폰을 같은 Wi-Fi에 연결합니다.

```powershell
cd mobile
npm install
npm start
```

- Android: Expo Go에서 터미널의 QR 코드를 스캔합니다.
- iPhone: 기본 카메라로 QR 코드를 스캔해 Expo Go로 엽니다.
- 연결이 안 되면 `npm run start:tunnel`을 사용합니다. 이때 Expo가 안내하는 터널 패키지 설치가 필요할 수 있습니다.
- 브라우저 미리보기: `npm run web`

현재 프로젝트는 Expo Go용으로 SDK 57을 사용합니다. Expo Go와 프로젝트 SDK가 맞지 않으면 [Expo Go 다운로드 안내](https://expo.dev/go)에서 호환 버전을 확인하세요.

## 구성된 화면

홈, 기록, 달리기 준비, 순위, 내 정보, 오늘의 코칭, 코스 상세, 달리는 중, 달리기 결과, 친구와 1:1 화면을 구현했습니다. 프로필 수정, 알림, 공개 설정, 워치 연결 예시 화면도 포함합니다.

- 기록 기간과 순위 범위 변경
- 경쟁 상대·거리·코스 선택
- 설정 스위치와 닉네임 수정
- 3초 카운트다운, 데모 타이머, 일시정지·재개
- 완주 결과 예시, 공유, 앱 실행 중 데모 기록 저장
- 화면 아래 고정 버튼, 노치·홈 인디케이터 안전 영역, Android 뒤로가기

기본 러닝 화면은 예시 데이터를 사용합니다. 달리기 결과는 타이머와 별개인 5km 완주 예시이며, 데모 기록과 설정은 앱을 종료하면 초기화됩니다.

## GPS 네이티브 프로토타입

PC에 Android SDK를 설치하고 USB 디버깅으로 Android 기기를 연결합니다. Windows에서 Android를 빌드할 때는 NDK가 경로를 읽을 수 있도록 `C:\src\RunGrow`처럼 영문 경로에 저장소를 둡니다. iOS는 Xcode가 설치된 Mac에서 iPhone을 연결합니다. `npm install`을 실행한 `mobile` 폴더에서 해당 플랫폼을 빌드합니다.

```powershell
npx expo run:android --device
```

```sh
npx expo run:ios --device
```

설치된 앱에서 **달리기 → GPS 프로토타입 → GPS 측정 시작**을 누른 다음, 앱 사용 중 위치 접근과 정확한 위치를 허용합니다. Android는 Google Play 서비스가 있는 기기가 필요합니다. Android 13 이상에서는 알림을 허용하면 측정 알림을 알림 창에서 볼 수 있습니다. Expo Go와 웹에서는 UI 데모를 사용할 수 있습니다.

- 화면에서 누적 거리, 일시정지를 뺀 측정 시간, 최근 수평 정확도, 첫 고정까지 걸린 시간, 거리에 사용한 좌표 수와 전체 수신 수를 확인합니다.
- 첫 고정은 수평 정확도 20m 이하인 첫 좌표입니다. 거리를 계산할 때 정확도가 20m를 넘거나 직전 채택 좌표 기준 속도가 12m/s를 넘는 좌표를 제외합니다.
- iOS는 Core Location으로 수집하고, Android는 Fused Location을 위치 포그라운드 서비스에서 실행합니다. 측정 결과는 앱 프로세스의 메모리에 보관합니다.

### 1차 실기기 측정

1. 실외에서 측정하고 첫 고정 시간, 최근 수평 정확도, 출발 전 배터리를 기록합니다.
2. 신호가 잡히면 길이를 아는 구간을 이동합니다. 중간에 화면을 잠근 채 이동한 뒤 잠금을 풀고 수신 수와 거리가 증가했는지 확인합니다.
3. 일시정지 후 잠시 이동해도 거리와 시간이 그대로인지 확인합니다. 계속 측정을 누른 뒤 재개 지점부터 거리가 늘어나는지 봅니다.
4. 종료 후 실제 이동 거리와 앱 거리의 차이를 기록합니다. 배터리 비교는 기기, 실제 측정 시간, 시작·종료 배터리 비율을 함께 기록합니다.

## 검사

```powershell
cd mobile
npm run check
npm run export:all
npx expo-doctor
```

`export:all`은 Android·iOS·웹 JavaScript 번들을 검사합니다. GPS 실기기 측정에는 위의 네이티브 빌드를 사용합니다.

## 코드 위치

- `mobile/src/app`: Expo Router 화면과 내비게이션
- `mobile/src/screens`: 실제 화면 UI
- `mobile/src/ui.tsx`: 공통 카드·버튼·통계·그래픽
- `mobile/src/state.tsx`: 앱 실행 중 데모 상태
- `mobile/modules/rungrow-gps`: Swift·Kotlin 위치 수집 모듈
- `mobile/src/data.ts`: 샘플 데이터
- `mobile/assets/figma`: Figma에서 내려받은 원본 SVG

[Figma 디자인](https://www.figma.com/design/SC7ueYJZe8l1A0pMsW0qTP)

Expo 설정 기준: [프로젝트 생성](https://docs.expo.dev/get-started/create-a-project/), [실기기 실행](https://docs.expo.dev/get-started/set-up-your-environment/).
