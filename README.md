# Basic Arabic · 기초 아랍어 인터랙티브 교실

국제학교 아랍어 수업에서 학생들과 함께 쓰는 인터랙티브 학습 사이트입니다.

- **15개 단원**: 소개 + 1~14과 (글자·발음 → 기초 문법 → 일상 대화 → 숫자·시간 → 여행 → 이집트 구어체)
- **243개 연습 문항**: 객관식, 듣기, 카드로 문장 만들기, 분류, 짝 맞추기, 말하기(음성 인식) — 채점 시 점수·정답·해설 표시, 최고 점수 저장
- **종합 테스트**: 전 단원에서 20문항 무작위 출제
- **원어민 스타일 음성**: Microsoft Edge 뉴럴 음성(사우디 Hamed/Zariyah, 이집트 Shakir/Salma). 음성 파일이 없으면 브라우저 아랍어 음성으로 자동 대체
- **💬 학습 도우미 챗봇 (후드후드 선생님)**: 모든 페이지 오른쪽 아래
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

## 💬 학습 도우미 챗봇 (후드후드 선생님)
모든 페이지 오른쪽 아래 💬 버튼으로 엽니다.

**① 내장 모드 (설정 없이 바로 작동, 무료)**
- 단어 사전: 한국어·영어·아랍어·로마자로 검색 (`사과`, `apple`, `كتاب`, `kitab`) → 음성 + 해당 단원 바로가기
- 글자 안내: `ع 발음`, `ghayn`
- 숫자·시간: `47`, `٢٥`, `8:40`, `9시 15분`
- 문법 Q&A: `태양 글자`, `이다파`, `소유 접미사`, `동사 활용`, `질문 만들기`, `이집트 방언` …
- `퀴즈` → 무한 단어 퀴즈 (보기 선택)
- 사전 데이터(`data/dict.js`)는 챗봇을 열 때만 불러옵니다.

**② AI 선생님 모드 (자유 질문 답변, 선택)**
API 키를 공개 사이트에 넣으면 누구나 훔쳐 쓸 수 있으므로, 키는 Cloudflare Worker(무료 플랜 가능)에만 보관합니다.
1. https://console.anthropic.com 에서 API 키 발급 (사용량만큼 과금 — 월 사용 한도를 꼭 설정하세요)
2. https://dash.cloudflare.com → Workers & Pages → Create → "Hello World" Worker 생성 (이름 예: `basic-arabic-chat`)
3. Edit code → `worker/worker.js` 내용을 붙여넣고 Deploy
4. Worker의 Settings → Variables and Secrets
   - Secret `ANTHROPIC_API_KEY` = 발급받은 키
   - Text `ALLOWED_ORIGIN` = `https://yalli2.github.io`
5. Worker 주소를 `assets/config.js`의 `chatEndpoint`에 넣고 커밋
→ 챗봇 상단에 "🤖 AI 선생님 / 📖 빠른 사전" 전환 버튼이 생깁니다. AI 연결이 실패하면 자동으로 사전 답변으로 넘어갑니다.
