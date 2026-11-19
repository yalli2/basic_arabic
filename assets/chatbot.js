/* Basic Arabic — 학습 도우미 챗봇 "Ustadh Hudhud (후드후드 선생님)"
 * ① 내장 모드 (설정 없이 무료로 작동): 단어 사전(한/영/아랍어/로마자 검색), 글자 안내, 숫자·시간 변환, 문법 FAQ, 단어 퀴즈, 단원 바로가기
 * ② AI 선생님 모드: assets/config.js 의 BA_CONFIG.chatEndpoint 를 설정하면 자유 질문에 AI가 답변 (README 참고)
 */
(function () {
  const CFG = window.BA_CONFIG || {};
  const AI_URL = (CFG.chatEndpoint || "").trim();
  const BA = window.BA, S = BA.S, esc = BA.esc;
  const ko = () => S.lang === "ko";
  const L = (k, e) => (ko() ? k : e);
  const HAR = /[ً-ْٰـ]/g;
  const nAr = s => String(s).replace(HAR, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[؟?!.,،]/g, "").trim();
  const nLat = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ʿʾ'’`-]/g, "").replace(/\s+/g, " ").trim();
  const isAr = s => /[ء-ي]/.test(s);
  const spk = (ar, a, v) => `<span role="button" tabindex="0" class="spk" data-play data-a="${a || ""}" data-v="${v || "m"}" data-say="${esc(ar)}">🔊</span>`;
  const chLink = (c, b) => { const m = (window.BA_META || []).find(x => x.n === c); return `<a class="cb-link" href="ch${String(c).padStart(2, "0")}.html${b != null ? "#b" + b : ""}">📘 ${c === 0 ? "" : L(c + "과 ", "Ch." + c + " ")}${m ? esc(BA.t(m.title)) : ""}</a>`; };

  let DICT = null, loading = null;
  function ensure() {
    if (DICT) return Promise.resolve();
    if (!loading) loading = new Promise((ok, no) => { if (window.BA_DICT) { DICT = window.BA_DICT; return ok(); } const s = document.createElement("script"); s.src = "data/dict.js"; s.onload = () => { DICT = window.BA_DICT; ok(); }; s.onerror = no; document.head.appendChild(s); });
    return loading;
  }

  /* ---------------- grammar FAQ ---------------- */
  const FAQ = [
    { rx: /태양|달 ?글자|sun|moon|shams|qamar|ال.*발음|al.*발음|정관사|definite|article/i, c: 4, b: 9,
      ko: "**태양 글자와 달 글자**\n- 정관사 **ال (al-)** 뒤에 태양 글자(ت ث د ذ ر ز س ش ص ض ط ظ ل ن)가 오면 **l 소리가 사라지고** 첫 자음을 두 번: الشَّمْس **ash-shams**\n- 달 글자(나머지)는 l을 그대로: الْقَمَر **al-qamar**\n- 철자는 그대로, 소리만 바뀌어요.\n- 일반 개념(음악, 과학)에도 ال을 붙여요: الْمُوسِيقَى",
      en: "**Sun and moon letters**\n- After **ال (al-)**, a sun letter (ت ث د ذ ر ز س ش ص ض ط ظ ل ن) swallows the l and is doubled: الشَّمْس **ash-shams**\n- Moon letters keep the l: الْقَمَر **al-qamar**\n- Spelling never changes, only sound.\n- Arabic also uses ال for general ideas: الْمُوسِيقَى (music)" },
    { rx: /남성|여성|성별|gender|masculine|feminine|타 ?마르부타|ة|marbuta/i, c: 4, b: 1,
      ko: "**명사의 성(性)**\n- 모든 명사는 남성 또는 여성.\n- 끝이 **ة (타 마르부타)**면 대개 여성: مَدِينَة 도시, سَيَّارَة 차\n- 사람 명사는 남성형 + ة = 여성형: طَالِب → طَالِبَة\n- 예외도 있어요: شَمْس(해)는 여성\n- 소유 어미가 붙으면 ة → ت : سَيَّارَتِي 내 차",
      en: "**Gender**\n- Every noun is masculine or feminine.\n- Ending in **ة (tāʾ marbūṭa)** → usually feminine: مَدِينَة city, سَيَّارَة car\n- People: masculine + ة = feminine: طَالِب → طَالِبَة\n- Exceptions exist: شَمْس (sun) is feminine\n- With a possessive ending ة becomes ت: سَيَّارَتِي my car" },
    { rx: /대명사|pronoun|나는|너는|anta|anti|huwa|hiya|it\b|그것/i, c: 4, b: 5,
      ko: "**인칭 대명사**\n- أَنَا 나 · أَنْتَ 너(남) · أَنْتِ 너(여) · هُوَ 그 · هِيَ 그녀 · نَحْنُ 우리 · أَنْتُمْ 너희 · هُمْ 그들\n- ‘그것’은 없어요 → 사물의 성에 따라 هُوَ / هِيَ\n- ‘~이다’ 동사 없이: أَنَا سَعِيد (나는 행복하다)",
      en: "**Pronouns**\n- أَنَا I · أَنْتَ you (m) · أَنْتِ you (f) · هُوَ he · هِيَ she · نَحْنُ we · أَنْتُمْ you (pl) · هُمْ they\n- No ‘it’: use هُوَ / هِيَ by gender\n- No ‘to be’ in the present: أَنَا سَعِيد (I am happy)" },
    { rx: /소유|possess|나의|my |your |-ي\b|접미사|suffix/i, c: 5, b: 0,
      ko: "**소유 접미사** (كِتَاب 책)\n- كِتَابِي 내 책 · كِتَابُكَ/كِتَابُكِ 너의 책 · كِتَابُهُ 그의 · كِتَابُهَا 그녀의 · كِتَابُنَا 우리의 · كِتَابُكُمْ 너희의 · كِتَابُهُمْ 그들의\n- ة로 끝나면 ت로 바뀜: مَدْرَسَتِي 내 학교\n- 소유 어미와 ال은 같이 쓰지 않아요.",
      en: "**Possessive suffixes** (كِتَاب book)\n- كِتَابِي my · كِتَابُكَ/كِتَابُكِ your · كِتَابُهُ his · كِتَابُهَا her · كِتَابُنَا our · كِتَابُكُمْ your (pl) · كِتَابُهُمْ their\n- ة turns into ت: مَدْرَسَتِي my school\n- Never combine ال with a possessive ending." },
    { rx: /이다파|idafa|iḍāfa|이다프|소유격|명사\s*\+\s*명사/i, c: 5, b: 3,
      ko: "**이다파 (명사+명사 = ‘B의 A’)**\n- 두 명사를 나란히: سَيَّارَة الطَّبِيب 의사의 차\n- **마지막 명사만** 한정(ال/소유어미/고유명사). 첫 명사엔 ال 금지!\n- 마지막이 아닌 ة는 t로 발음: sayyārat aṭ-ṭabīb",
      en: "**Iḍāfa (noun + noun = ‘A of B’)**\n- Put two nouns together: سَيَّارَة الطَّبِيب the doctor's car\n- **Only the last noun** is definite. Never ال on the first!\n- ة that isn't last is pronounced t: sayyārat aṭ-ṭabīb" },
    { rx: /가지고|have|있다|عند|ʿinda|maʿa|مع|لي/i, c: 5, b: 5,
      ko: "**‘가지고 있다’ 표현** (동사 없음!)\n- **مَعَ + 어미**: 지금 지니고 있음 — مَعِي هَاتِف\n- **عِنْدَ + 어미**: 소유 — عِنْدِي سَيَّارَة\n- **لِـ + 어미**: 가족 관계·추상(격식) — لِي أُخْت\n- 장소가 가진 것: **فِي** — الْمَدِينَة فِيهَا حَدَائِق",
      en: "**Saying ‘have’** (no verb!)\n- **مَعَ + suffix**: on you now — مَعِي هَاتِف\n- **عِنْدَ + suffix**: ownership — عِنْدِي سَيَّارَة\n- **لِـ + suffix**: relationships (formal) — لِي أُخْت\n- Places: **فِي** — الْمَدِينَة فِيهَا حَدَائِق" },
    { rx: /활용|동사|conjugat|verb|현재형|present|yadrus|يدرس/i, c: 6, b: 1,
      ko: "**현재형 활용** (يَدْرُسُ 공부하다)\n- أَدْرُسُ 나 · تَدْرُسُ 너(남) · تَدْرُسِينَ 너(여) · يَدْرُسُ 그 · تَدْرُسُ 그녀 · نَدْرُسُ 우리 · تَدْرُسُونَ 너희 · يَدْرُسُونَ 그들\n- 주어가 동사 안에 있어서 대명사는 강조할 때만!",
      en: "**Present tense** (يَدْرُسُ to study)\n- أَدْرُسُ I · تَدْرُسُ you (m) · تَدْرُسِينَ you (f) · يَدْرُسُ he · تَدْرُسُ she · نَدْرُسُ we · تَدْرُسُونَ you (pl) · يَدْرُسُونَ they\n- The subject is built in — pronouns only for emphasis!" },
    { rx: /부정|not|않|negat|لا\b|\blā\b/i, c: 6, b: 4,
      ko: "**부정문**: 현재형 동사 앞에 **لَا**\n- لَا أَدْرُسُ 나는 공부하지 않는다\n- هِيَ لَا تَعْمَلُ 그녀는 일하지 않는다 (대명사와 동사 사이)",
      en: "**Negation**: put **لَا** before a present verb\n- لَا أَدْرُسُ I don't study\n- هِيَ لَا تَعْمَلُ she doesn't work (between pronoun and verb)" },
    { rx: /질문|의문|question|hal|هل|뭐|누구|어디|언제|why|where|who|what/i, c: 6, b: 6,
      ko: "**질문 만들기**\n- 예/아니오: 문장 앞에 **هَلْ** — هَلْ هِيَ طَالِبَة؟\n- 의문사: مَا/مَاذَا 무엇 · مَنْ 누구 · أَيْنَ 어디 · مَتَى 언제 · كَيْفَ 어떻게 · كَمْ 얼마나 · لِمَاذَا 왜 · أَيّ 어느\n- 전치사는 맨 앞: مِنْ أَيْنَ أَنْتَ؟",
      en: "**Questions**\n- Yes/no: put **هَلْ** first — هَلْ هِيَ طَالِبَة؟\n- Words: مَا/مَاذَا what · مَنْ who · أَيْنَ where · مَتَى when · كَيْفَ how · كَمْ how many · لِمَاذَا why · أَيّ which\n- Prepositions go first: مِنْ أَيْنَ أَنْتَ؟" },
    { rx: /복수|plural|형용사|adjective|nisba|니스바|국적/i, c: 4, b: 11,
      ko: "**형용사와 복수**\n- 형용사는 명사 **뒤**, 성·수·ال 일치: الْمَدِينَة الْقَدِيمَة\n- 사람 복수: 남성 **-ūn** (مُهَنْدِسُونَ), 여성 **-āt** (مُهَنْدِسَات)\n- 불규칙 복수는 외우기: كِتَاب → كُتُب, بَيْت → بُيُوت\n- ⭐ 사람이 아닌 복수 → **여성 단수** 형용사: سَيَّارَات جَدِيدَة\n- 니스바: كُورِيَا → كُورِيّ / كُورِيَّة",
      en: "**Adjectives & plurals**\n- Adjective **after** the noun, agreeing in gender, number and ال: الْمَدِينَة الْقَدِيمَة\n- Human plurals: m **-ūn**, f **-āt**\n- Broken plurals must be learned: كِتَاب → كُتُب\n- ⭐ Non-human plurals take a **feminine singular** adjective: سَيَّارَات جَدِيدَة\n- Nisba: كُورِيَا → كُورِيّ / كُورِيَّة" },
    { rx: /숫자.*(규칙|일치)|agreement|반대 성|number.*noun|몇 개|three books/i, c: 10, b: 3,
      ko: "**숫자와 명사 일치**\n- 1: 명사만 · 3~10: **복수 명사** + 숫자는 **반대 성** (ثَلَاثَة كُتُب / ثَلَاث بَنَات)\n- 11 이상: **단수 명사** (عِشْرُونَ طَالِبًا)",
      en: "**Number–noun agreement**\n- 1: noun alone · 3–10: **plural noun**, number takes the **opposite gender** (ثَلَاثَة كُتُب / ثَلَاث بَنَات)\n- 11+: **singular noun** (عِشْرُونَ طَالِبًا)" },
    { rx: /모음|harak|vowel|fatha|kasra|damma|샷다|shadda|sukun|함자|hamza|막수라|maqs/i, c: 3, b: 0,
      ko: "**발음 기호**\n- ـَ fatḥa(a) · ـُ ḍamma(u) · ـِ kasra(i) · ـْ sukūn(모음 없음)\n- ـّ shadda: 자음 두 번 (دَرَّسَ darrasa)\n- ء hamza: 성문 파열음 (أ إ ؤ ئ)\n- ى alif maqṣūra: 끝에서 ‘아-’ (عَلَى)\n- 상단 ‘모음부호’ 버튼으로 켜고 끌 수 있어요.",
      en: "**Pronunciation marks**\n- ـَ fatḥa (a) · ـُ ḍamma (u) · ـِ kasra (i) · ـْ sukūn (none)\n- ـّ shadda: double the consonant (دَرَّسَ darrasa)\n- ء hamza: glottal stop (أ إ ؤ ئ)\n- ى alif maqṣūra: final ‘ā’ (عَلَى)\n- Toggle them with the ‘Vowel marks’ button." },
    { rx: /이어|연결|join|connect|형태|form|모양|쓰기|writ/i, c: 2, b: 0,
      ko: "**글자 잇기**\n- 글자마다 독립·어두·어중·어말 4가지 모양\n- **ا د ذ ر ز و** 6글자는 뒤(왼쪽) 글자와 이어지지 않아요.\n- 2과의 ‘글자 잇기 실험실’에서 직접 해 보세요!",
      en: "**Joining letters**\n- Each letter has isolated, initial, medial and final forms\n- **ا د ذ ر ز و** never join the next (left) letter.\n- Try the ‘Letter-joining lab’ in Chapter 2!" },
    { rx: /시간|몇 시|time|clock|o'clock|분 전|past|to /i, c: 10, b: 6,
      ko: "**시간 말하기**: السَّاعَة + 서수(여성형)\n- 9시 = السَّاعَة التَّاسِعَة\n- 지나서: وَ + خَمْس دَقَائِق / الرُّبْع / الثُّلْث / النِّصْف\n- ~전: إِلَّا رُبْعًا · إِلَّا ثُلْثًا\n- 💡 ‘9:15’처럼 시간을 입력하면 바로 알려 줄게요!",
      en: "**Telling time**: السَّاعَة + feminine ordinal\n- 9:00 = السَّاعَة التَّاسِعَة\n- Past: وَ + خَمْس دَقَائِق / الرُّبْع / الثُّلْث / النِّصْف\n- To: إِلَّا رُبْعًا · إِلَّا ثُلْثًا\n- 💡 Type a time like ‘9:15’ and I'll say it!" },
    { rx: /요일|day|week|월|month|계절|season/i, c: 11, b: 0,
      ko: "**요일·월·계절**\n- 일 الْأَحَد · 월 الِاثْنَيْن · 화 الثُّلَاثَاء · 수 الْأَرْبِعَاء · 목 الْخَمِيس · 금 الْجُمُعَة · 토 السَّبْت\n- 월 이름은 이집트식(يَنَايِر…)과 레반트식(كَانُونُ الثَّانِي…) 두 가지\n- 봄 الرَّبِيع · 여름 الصَّيْف · 가을 الْخَرِيف · 겨울 الشِّتَاء",
      en: "**Days, months, seasons**\n- Sun الْأَحَد · Mon الِاثْنَيْن · Tue الثُّلَاثَاء · Wed الْأَرْبِعَاء · Thu الْخَمِيس · Fri الْجُمُعَة · Sat السَّبْت\n- Two month systems: Egyptian (يَنَايِر…) and Levantine (كَانُونُ الثَّانِي…)\n- Spring الرَّبِيع · Summer الصَّيْف · Autumn الْخَرِيف · Winter الشِّتَاء" },
    { rx: /이집트|방언|구어|dialect|egypt|colloquial|eca|عايز/i, c: 14, b: 0,
      ko: "**이집트 구어체(ECA)**\n- 발음: ج → g (gamīl), ق → ʾ (ṣadīʾ), ث → t\n- ‘원하다’ عَايِز / عَايْزَة / عَايْزِين\n- 습관 현재는 بِـ: بَحِبّ 나는 좋아해\n- 아니요 لَأ · 아니다 مِش · 어떻게 إِزَّاي · 어디 فِين",
      en: "**Egyptian Arabic (ECA)**\n- Sounds: ج → g (gamīl), ق → ʾ (ṣadīʾ), ث → t\n- ‘want’ عَايِز / عَايْزَة / عَايْزِين\n- Habitual present with بِـ: بَحِبّ I like\n- no لَأ · not مِش · how إِزَّاي · where فِين" },
    { rx: /MSA|표준|fusha|فصحى|방향|오른쪽|right to left|rtl/i, c: 0, b: 1,
      ko: "**아랍어 기본 상식**\n- 오른쪽 → 왼쪽으로 쓰고, 숫자는 왼쪽 → 오른쪽\n- 신문·뉴스의 **표준 아랍어(MSA)**와 일상 **방언**이 따로 있어요.\n- 이 사이트 1~13과는 MSA, 14과는 이집트 방언.",
      en: "**Basics**\n- Written right to left; numbers read left to right\n- **Modern Standard Arabic** (news, books) vs everyday **dialects**\n- Chapters 1–13 teach MSA, Chapter 14 Egyptian." },
    { rx: /사용법|어떻게 써|사이트|채점|점수|진도|how to use|score|help|도움/i, c: null,
      ko: "**사이트 사용법**\n1. 메인에서 단원을 고르세요.\n2. 아랍어를 누르면 원어민 음성이 나와요 (상단 🔊로 0.75배속).\n3. 단원 끝 연습문제를 풀고 **채점하기** → 점수·정답·해설!\n4. 저에게 단어(‘사과’, ‘كتاب’, ‘kitab’), 글자(‘ع’), 숫자(‘47’), 시간(‘8:40’), 문법(‘이다파’)을 물어보세요. ‘퀴즈’도 돼요!",
      en: "**How to use the site**\n1. Pick a chapter on the home page.\n2. Tap any Arabic to hear it (🔊 at the top for 0.75×).\n3. Do the exercises and press **Check** for score, answers and explanations!\n4. Ask me words (‘apple’, ‘كتاب’, ‘kitab’), letters (‘ع’), numbers (‘47’), times (‘8:40’) or grammar (‘idafa’). Try ‘quiz’ too!" },
  ];

  function md(s) {
    const lines = String(s).split("\n"); let out = "", inList = false;
    const fmt = x => esc(x).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/([؀-ۿ][؀-ۿً-ْٰ\s،؟]*[؀-ۿً-ْٰ؟])/g, m => `<span class="ai" dir="rtl" data-v="m">${BA.H(m)}</span>`);
    lines.forEach(l => { if (/^\s*[-•]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) { if (!inList) { out += "<ul>"; inList = true; } out += "<li>" + fmt(l.replace(/^\s*([-•]|\d+\.)\s+/, "")) + "</li>"; } else { if (inList) { out += "</ul>"; inList = false; } if (l.trim()) out += "<p>" + fmt(l) + "</p>"; } });
    if (inList) out += "</ul>";
    return out;
  }

  /* ---------------- dictionary search ---------------- */
  function entryHtml(e) {
    return `<div class="cb-ent">${spk(e.ar, e.a, e.v)}<span class="ar" dir="rtl">${esc(BA.H(e.ar))}</span>${e.tr ? ` <i class="cb-tr">${esc(e.tr)}</i>` : ""}<div class="cb-m">${esc(ko() ? e.ko : e.en)} ${chLink(e.c, e.b)}</div></div>`;
  }
  function search(q) {
    const qa = isAr(q) ? nAr(q) : null, ql = nLat(q), qk = q.trim().toLowerCase();
    const scored = [];
    DICT.d.forEach(e => {
      let s = 0;
      if (qa) { const ea = nAr(e.ar); if (ea === qa) s = 100; else if (ea.split(/[\s/،]+/).includes(qa)) s = 80; else if (ea.includes(qa)) s = 40 - Math.min(30, ea.length - qa.length); }
      else {
        const k = (e.ko || "").toLowerCase(), en = (e.en || "").toLowerCase(), tr = nLat(e.tr || "");
        const kw = k.split(/[\s,()/·~]+/), ew = en.split(/[\s,()/·]+/);
        if (kw.includes(qk) || ew.includes(qk)) s = 90; else if (tr === ql || tr.split(/[\s/]+/).includes(ql)) s = 85;
        else if (qk.length >= 2 && (k.includes(qk) || en.includes(qk))) s = 50 - Math.min(40, (k.length + en.length) / 6);
        else if (ql.length >= 3 && tr.includes(ql)) s = 35;
      }
      if (s > 0) scored.push([s - e.ar.length / 100, e]);
    });
    const seen = new Set();
    return scored.sort((a, b) => b[0] - a[0]).map(x => x[1]).filter(e => { const k = nAr(e.ar); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 5);
  }

  /* ---------------- quiz ---------------- */
  let quiz = null;
  function startQuiz() {
    const pool = DICT.d.filter(e => e.ar.split(" ").length <= 3 && !/[\/….]/.test(e.ar) && e.c !== 14 && /^[^~(…]{1,16}$/.test(e.ko || "") && /^[^~(…]{1,24}$/.test(e.en || ""));
    const pick = () => pool[Math.floor(Math.random() * pool.length)];
    const right = pick(), opts = [right];
    while (opts.length < 4) { const o = pick(); if (!opts.some(x => (ko() ? x.ko : x.en) === (ko() ? o.ko : o.en))) opts.push(o); }
    opts.sort(() => Math.random() - 0.5);
    quiz = { right, n: (quiz ? quiz.n : 0) + 1, ok: quiz ? quiz.ok : 0 };
    return `🎯 <b>${L("단어 퀴즈", "Word quiz")} #${quiz.n}</b><div class="cb-q">${spk(right.ar, right.a, right.v)}<span class="ar big" dir="rtl">${esc(BA.H(right.ar))}</span></div>${L("뜻은?", "Meaning?")}
      <div class="cb-chips">${opts.map(o => `<button class="cb-chip" data-quiz="${o === right ? 1 : 0}">${esc(ko() ? o.ko : o.en)}</button>`).join("")}</div><div class="cb-mute">${L("‘그만’을 입력하면 끝나요", "Type ‘stop’ to finish")}</div>`;
  }
  function answerQuiz(ok) {
    const r = quiz.right;
    if (ok) quiz.ok++;
    const msg = (ok ? "✅ " + L("정답!", "Correct!") : "❌ " + L("정답은", "Answer:")) + ` <b>${esc(ko() ? r.ko : r.en)}</b> <span class="cb-mute">(${esc(r.tr)})</span> · ${quiz.ok}/${quiz.n}`;
    BA.play(r.a, r.ar, r.v);
    return msg + '<hr class="cb-hr">' + startQuiz();
  }

  /* ---------------- offline answer ---------------- */
  function arNum(n) { return DICT.num.find(x => x.n === n); }
  function offline(q) {
    const t = q.trim();
    if (/^(퀴즈|quiz|문제|test me)/i.test(t)) return startQuiz();
    // time
    const tm = t.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
    if (tm && (t.includes(":") || t.includes("시"))) {
      let h = +tm[1] % 12 || 12, m = tm[2] ? +tm[2] : 0; m = Math.round(m / 5) * 5; if (m === 60) { m = 0; h = h % 12 + 1; }
      const c = DICT.clock.find(x => x.h === h && x.m === m);
      if (c) return `🕘 <b>${h}:${String(m).padStart(2, "0")}</b>${tm[2] && +tm[2] % 5 ? L(" (5분 단위로 반올림)", " (rounded to 5 min)") : ""}<div class="cb-ent">${spk(c.ar, c.a)}<span class="ar" dir="rtl">${esc(BA.H(c.ar))}</span> <i class="cb-tr">${esc(c.tr)}</i></div>${chLink(10, 9)}`;
    }
    // numbers (western or arabic-indic)
    const nm = t.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).match(/^\D*(\d{1,3})\D*$/);
    if (nm && +nm[1] <= 100) { const x = arNum(+nm[1]); return `🔢 <b>${x.n}</b> = <span class="ar" dir="rtl">${x.dig}</span><div class="cb-ent">${spk(x.ar, x.a)}<span class="ar" dir="rtl">${esc(BA.H(x.ar))}</span> <i class="cb-tr">${esc(x.tr)}</i></div>${chLink(10, 1)}`; }
    // single letter
    const lt = nAr(t).replace(/(발음|소리|글자|letter|이름|name|\s)/g, "");
    const letter = DICT.let.find(x => x.l === lt || nAr(x.name.ar) === lt || nLat(x.name.tr) === nLat(t.replace(/(발음|소리|글자|letter)/g, "")));
    if (letter && (lt.length === 1 || t.split(/\s+/).length <= 2)) {
      return `<div class="cb-letter"><span class="ar" dir="rtl">${letter.l}</span><div>${spk(letter.name.ar, letter.name.a)}<b dir="rtl">${esc(BA.H(letter.name.ar))}</b> <i>${esc(letter.name.tr)}</i> · [${esc(letter.snd)}]${letter.hard ? ` <span class="cb-warn">${L("도전 글자", "tricky")}</span>` : ""}</div></div><p>${BA.T(letter.tip)}</p>
        <div class="cb-ent">${spk(letter.ex.ar, letter.ex.a)}<span class="ar" dir="rtl">${esc(BA.H(letter.ex.ar))}</span> <i class="cb-tr">${esc(letter.ex.tr)}</i> · ${BA.T(letter.ex.m)}</div>${chLink(1, 1)}`;
    }
    // FAQ first when the core term is a grammar topic
    const term = t.replace(/(아랍어로는?|아랍어|뭐야|뭐예요|뭔가요|무슨 뜻|뜻은?|알려\s*줘|설명해\s*줘|in arabic|how do you say|what is|what's|what are|meaning( of)?|explain|tell me about|\?|？)/gi, " ").replace(/\s+/g, " ").trim() || t;
    const faq = FAQ.find(f => f.rx.test(term));
    const res = search(term.replace(/[은는이가을를]$/, ""));
    if (faq) {
      const rel = res.slice(0, 2);
      return md(ko() ? faq.ko : faq.en) + (faq.c != null ? chLink(faq.c, faq.b) : "") + (rel.length && isAr(term) ? '<hr class="cb-hr">' + rel.map(entryHtml).join("") : "");
    }
    if (res.length) return `${L("이런 단어를 찾았어요", "Here's what I found")}:` + res.map(entryHtml).join("");
    return L("음… 아직 그건 잘 모르겠어요 🦉 이렇게 물어보세요:", "Hmm, I'm not sure yet 🦉 Try asking like this:") + chips();
  }
  const chips = () => `<div class="cb-chips">${(ko() ? ["사과", "كتاب", "ع 발음", "47", "8:40", "태양 글자", "이다파", "퀴즈"] : ["apple", "كتاب", "ع", "47", "8:40", "sun letters", "idafa", "quiz"]).map(x => `<button class="cb-chip" data-ask="${x}">${x}</button>`).join("")}</div>`;

  /* ---------------- AI mode ---------------- */
  const history = [];
  async function answerAI(q) {
    const ch = window.BA_CH && Object.keys(window.BA_CH).length === 1 ? window.BA_CH[Object.keys(window.BA_CH)[0]] : null;
    const ctx = ch ? `Chapter ${ch.n}: ${ch.title.ko} / ${ch.title.en}` : "메인 페이지";
    history.push({ role: "user", content: q.slice(0, 800) });
    const res = await fetch(AI_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.slice(-10), context: ctx, lang: S.lang }) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json(); const reply = (data.reply || "").trim();
    if (!reply) throw new Error("empty");
    history.push({ role: "assistant", content: reply });
    return md(reply);
  }

  /* ---------------- UI ---------------- */
  const css = document.createElement("style");
  css.textContent = `
  .cb-fab{position:fixed;right:20px;bottom:20px;z-index:75;width:62px;height:62px;border-radius:50%;border:3px solid var(--gold2);background:var(--night);color:#fff;font-size:28px;box-shadow:0 10px 28px rgba(13,43,58,.4);cursor:pointer;transition:transform .15s}
  .cb-fab:hover{transform:scale(1.07)}
  .cb-fab .dot{position:absolute;right:2px;top:2px;width:14px;height:14px;border-radius:50%;background:var(--rose);border:2px solid #fff}
  .cb-panel{position:fixed;right:20px;bottom:94px;z-index:76;width:min(410px,calc(100vw - 24px));height:min(620px,calc(100vh - 120px));background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;border:1px solid var(--line)}
  .cb-panel.open{display:flex}
  .cb-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(120deg,var(--night),var(--night2));color:#fff}
  .cb-head .av{width:38px;height:38px;border-radius:50%;background:var(--gold2);display:grid;place-items:center;font-size:20px}
  .cb-head b{display:block;font-size:15px}.cb-head small{font-size:11.5px;opacity:.8}
  .cb-head button{margin-left:auto;background:transparent;border:0;color:#fff;font-size:24px;cursor:pointer}
  .cb-body{flex:1;overflow-y:auto;padding:14px;background:var(--sand);display:flex;flex-direction:column;gap:10px}
  .cb-msg{max-width:90%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.6;word-break:break-word}
  .cb-msg p{margin:0 0 6px}.cb-msg p:last-child{margin:0}.cb-msg ul{margin:4px 0;padding-left:18px}
  .cb-bot{background:#fff;border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:4px}
  .cb-me{background:var(--teal);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .cb-ent{display:flex;align-items:center;flex-wrap:wrap;gap:2px 4px;padding:6px 0;border-top:1px dashed var(--line)}
  .cb-ent:first-of-type{border-top:0}.cb-ent .ar{font-size:1.4em}
  .cb-m{width:100%;font-size:13.5px;color:#3b4652}
  .cb-tr{color:var(--teal);font-size:12.5px}
  .cb-q{display:flex;align-items:center;gap:6px;margin:6px 0}
  .cb-letter{display:flex;gap:12px;align-items:center}.cb-letter>.ar{font-size:54px;line-height:1.1;color:var(--night);background:var(--sand);border-radius:12px;padding:0 14px}
  .cb-mute{color:var(--mute);font-size:12.5px}.cb-warn{color:var(--rose);font-size:12px;font-weight:700}
  .cb-link{display:inline-block;margin-top:4px;font-size:12.5px;font-weight:700;color:var(--teal);text-decoration:none}
  .cb-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .cb-chip{border:1px solid #bfe0d9;background:#e6f2f0;color:var(--teal);border-radius:999px;padding:4px 11px;font-size:13px;cursor:pointer;font-family:inherit}
  .cb-chip:hover{background:var(--teal);color:#fff}
  .cb-hr{border:0;border-top:1px dashed var(--line);margin:8px 0}
  .cb-typing{color:var(--mute);font-size:13px}
  .cb-foot{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line);background:#fff}
  .cb-foot input{flex:1;min-width:0;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:15px;outline:none;font-family:inherit}
  .cb-foot input:focus{border-color:var(--teal)}
  .cb-foot button{white-space:nowrap;border:0;background:var(--teal);color:#fff;border-radius:12px;padding:0 16px;font-size:15px;font-weight:700;cursor:pointer}
  .cb-mode{display:flex;gap:6px;padding:6px 14px;background:#fff;border-bottom:1px solid var(--line);font-size:12px;align-items:center}
  .cb-mode button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer}
  .cb-mode button.on{background:var(--night);color:#fff;border-color:var(--night)}
  @media (max-width:560px){.cb-panel{right:8px;bottom:86px;height:calc(100vh - 100px)}.cb-fab{right:12px;bottom:12px}}
  @media print{.cb-fab,.cb-panel{display:none!important}}`;
  document.head.appendChild(css);

  const fab = document.createElement("button");
  fab.className = "cb-fab"; fab.setAttribute("aria-label", "chatbot");
  fab.innerHTML = '💬<span class="dot"></span>';
  const panel = document.createElement("div"); panel.className = "cb-panel";
  document.body.appendChild(fab); document.body.appendChild(panel);
  let mode = AI_URL ? "ai" : "dict", started = false, body, input;
  function build() {
    fab.title = L("질문하기 (학습 도우미)", "Ask the study helper");
    panel.innerHTML = `<div class="cb-head"><div class="av">🦉</div><div><b>${L("후드후드 선생님 · 학습 도우미", "Ustadh Hudhud · Study helper")}</b><small>${AI_URL ? L("AI 선생님 + 단어 사전", "AI teacher + dictionary") : L("단어 사전 · 글자 · 숫자 · 문법 · 퀴즈", "Dictionary · letters · numbers · grammar · quiz")}</small></div><button aria-label="close">×</button></div>
      ${AI_URL ? `<div class="cb-mode">${L("답변 방식", "Mode")}: <button data-m="ai" class="${mode === "ai" ? "on" : ""}">🤖 ${L("AI 선생님", "AI teacher")}</button><button data-m="dict" class="${mode === "dict" ? "on" : ""}">📖 ${L("빠른 사전", "Quick dictionary")}</button></div>` : ""}
      <div class="cb-body"></div>
      <form class="cb-foot"><input placeholder="${L("예: 사과 / كتاب / ع 발음 / 9:15 / 이다파", "e.g. apple / كتاب / ع / 9:15 / idafa")}" autocomplete="off" maxlength="400"><button>${L("보내기", "Send")}</button></form>`;
    body = panel.querySelector(".cb-body"); input = panel.querySelector("input");
    panel.querySelector(".cb-head button").onclick = close;
    panel.querySelector("form").onsubmit = e => { e.preventDefault(); ask(input.value); };
    panel.querySelectorAll(".cb-mode button").forEach(b => b.onclick = () => { mode = b.dataset.m; panel.querySelectorAll(".cb-mode button").forEach(x => x.classList.toggle("on", x === b)); });
    body.addEventListener("click", e => {
      const c = e.target.closest("[data-ask]"); if (c) return ask(c.dataset.ask);
      const z = e.target.closest("[data-quiz]"); if (z && quiz) { add(esc(z.textContent), "me"); add(answerQuiz(z.dataset.quiz === "1")); }
    });
    started = false;
  }
  function add(html, who) { const d = document.createElement("div"); d.className = "cb-msg " + (who === "me" ? "cb-me" : "cb-bot"); d.innerHTML = html; body.appendChild(d); body.scrollTop = body.scrollHeight; return d; }
  async function ask(q) {
    q = String(q || "").trim(); if (!q) return;
    add(esc(q), "me"); input.value = "";
    const wait = add(`<span class="cb-typing">${L("생각 중…", "Thinking…")}</span>`);
    try {
      await ensure();
      let html;
      if (quiz && /^(그만|stop|끝|종료|quit)/i.test(q)) { html = L(`퀴즈 끝! ${quiz.ok}/${quiz.n} 맞혔어요 👏`, `Quiz over! ${quiz.ok}/${quiz.n} correct 👏`); quiz = null; }
      else {
        const quick = /^(퀴즈|quiz)/i.test(q) || /^\s*[\d٠-٩]{1,3}\s*$/.test(q) || /^\d{1,2}\s*:\s*\d{1,2}$/.test(q.trim()) || (isAr(q) && q.trim().split(/\s+/).length <= 2);
        if (mode === "ai" && AI_URL && !quick) {
          try { html = await answerAI(q); } catch (e) { html = `<p class="cb-mute">${L("(AI 연결이 원활하지 않아 사전으로 답해요)", "(AI unavailable — answering from the dictionary)")}</p>` + offline(q); }
        } else html = offline(q);
      }
      wait.innerHTML = html;
    } catch (e) { wait.innerHTML = L("데이터를 불러오지 못했어요. 새로고침해 주세요.", "Couldn't load data. Please refresh."); }
    body.scrollTop = body.scrollHeight;
  }
  function open() {
    panel.classList.add("open"); fab.querySelector(".dot").style.display = "none";
    if (!started) { started = true; add(md(L("مَرْحَبًا! 안녕하세요, 저는 **후드후드 선생님**이에요 🦉\n아랍어 단어·글자·숫자·시간·문법을 물어보세요. 한국어, 영어, 아랍어, 로마자로 검색할 수 있어요.", "مَرْحَبًا! I'm **Ustadh Hudhud** 🦉\nAsk me Arabic words, letters, numbers, times or grammar — in English, Korean, Arabic script or transliteration.")) + chips()); ensure(); }
    setTimeout(() => input.focus(), 50);
  }
  function close() { panel.classList.remove("open"); }
  fab.onclick = () => (panel.classList.contains("open") ? close() : open());
  build();
  // rebuild text when language toggles
  document.addEventListener("click", e => { if (e.target.closest("[data-tog=lang]")) setTimeout(() => { const wasOpen = panel.classList.contains("open"); build(); if (wasOpen) open(); }, 0); });
  window.BAChat = { open, ask };
})();
