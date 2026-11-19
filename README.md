# Basic Arabic · 기초 아랍어 인터랙티브 교실

국제학교 아랍어 수업에서 학생들과 함께 쓰는 인터랙티브 학습 사이트입니다.

- **15개 단원**: 소개 + 1~14과 (글자·발음 → 기초 문법 → 일상 대화 → 숫자·시간 → 여행 → 이집트 구어체)
- **243개 연습 문항**: 객관식, 듣기, 카드로 문장 만들기, 분류, 짝 맞추기, 말하기(음성 인식) — 채점 시 점수·정답·해설 표시, 최고 점수 저장
- **종합 테스트**: 전 단원에서 20문항 무작위 출제
- **원어민 스타일 음성**: Microsoft Edge 뉴럴 음성(사우디 Hamed/Zariyah, 이집트 Shakir/Salma). 음성 파일이 없으면 브라우저 아랍어 음성으로 자동 대체
- **한국어/English 전환**, 발음기호·모음부호 켜기/끄기, 재생 속도, 큰 글씨(프로젝터용)

## 구조
```
index.html            메인 (전체 단원 지도, 진도)
ch00.html ~ ch14.html 단원 페이지
final.html            종합 테스트
data/                 단원 데이터 (ch00.js ~ ch14.js, meta.js)
assets/               app.js (엔진), style.css
audio/manifest.json   음성 목록 → GitHub Actions가 audio/*.mp3 생성
tools/gen_audio.py    음성 생성 스크립트
```

## 음성 생성
`audio/manifest.json`이 바뀌어 push되면 **Actions → Generate native Arabic audio** 워크플로가 자동으로 mp3를 만들어 커밋합니다. 수동 실행은 Actions 탭에서 *Run workflow*.

교재 내용은 저작권 보호를 위해 예문·대화·연습문제를 새로 구성했습니다.
