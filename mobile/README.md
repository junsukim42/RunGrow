# 나란히 러닝 앱

Figma의 나란히 디자인을 바탕으로 만든 **React Native + Expo 모바일 UI 프로토타입**입니다. Android와 iPhone에서 Expo Go로 실행할 수 있습니다.

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

**UI만 구현했습니다.** 기록·코칭·날씨·지도·심박은 예시 데이터이며, GPS, 계정, 서버, 실제 워치, 음성 안내는 연결하지 않았습니다. 달리기 결과는 타이머와 별개인 5km 완주 예시입니다. 저장한 기록과 설정은 앱을 종료하면 초기화됩니다.

## 검사

```powershell
cd mobile
npm run check
npm run export:all
npx expo-doctor
```

`export:all`은 Android·iOS·웹 JavaScript 번들을 검사하는 명령이며, APK/IPA 설치 파일을 생성하는 명령은 아닙니다. 실기기 확인은 Expo Go에서 진행합니다.

## 코드 위치

- `mobile/src/app`: Expo Router 화면과 내비게이션
- `mobile/src/screens`: 실제 화면 UI
- `mobile/src/ui.tsx`: 공통 카드·버튼·통계·그래픽
- `mobile/src/state.tsx`: 앱 실행 중 데모 상태
- `mobile/src/data.ts`: 샘플 데이터
- `mobile/assets/figma`: Figma에서 내려받은 원본 SVG

[Figma 디자인](https://www.figma.com/design/SC7ueYJZe8l1A0pMsW0qTP)

Expo 설정 기준: [프로젝트 생성](https://docs.expo.dev/get-started/create-a-project/), [실기기 실행](https://docs.expo.dev/get-started/set-up-your-environment/).
