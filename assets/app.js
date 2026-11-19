/* Basic Arabic — interactive class site engine */
(function () {
  "use strict";
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("ba_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ba_" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const S = { lang: LS.get("lang", "ko"), tr: LS.get("tr", true), har: LS.get("har", true), rate: LS.get("rate", 1), big: LS.get("big", false) };
  window.BA = { S, LS };

  // ---------------- helpers ----------------
  const HAR = /[ً-ْٰ]/g;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const H = s => (S.har ? s : String(s).replace(HAR, ""));
  const t = x => { if (x == null) return ""; if (typeof x === "string") return x; return x[S.lang] != null ? x[S.lang] : (x.ko || x.en || ""); };
  const T = x => H(t(x)); // translated + harakat aware (inline Arabic)
  const UI = {
    ko: { home: "홈", chapters: "단원", lesson: "학습", exercises: "연습문제", check: "채점하기", retry: "다시 풀기", show: "정답 보기", score: "점수", best: "최고", listenAll: "전체 듣기", stop: "정지",
      translit: "발음기호", harakat: "모음부호", speed: "속도", big: "크게", prev: "이전 단원", next: "다음 단원", goals: "학습 목표", correct: "정답!", wrong: "오답", answer: "정답",
      unanswered: "아직 답하지 않은 문제가 있어요. 그래도 채점할까요?", tapTiles: "아래 카드를 눌러 문장을 만드세요", clear: "지우기", undo: "되돌리기", mic: "말하기", micNo: "이 브라우저는 음성 인식을 지원하지 않아요 (Chrome·Edge 권장).",
      heard: "인식된 말", similarity: "일치율", bonus: "말하기 연습 · 점수 미포함", showTr: "번역 보기", hideTr: "번역 숨기기", play: "듣기", done: "완료", pairs: "왼쪽을 누른 뒤 짝이 되는 오른쪽을 누르세요",
      excellent: "훌륭해요! 다음 단원으로 가도 좋아요.", good: "좋아요! 틀린 문제를 복습해 보세요.", tryAgain: "조금 더 연습해 봐요. 학습 부분을 다시 읽어 보세요.", final: "종합 테스트", reset: "초기화", toc: "이 단원 목차", listenQ: "듣고 답하세요", setScores: "연습 점수" },
    en: { home: "Home", chapters: "Chapters", lesson: "Lesson", exercises: "Exercises", check: "Check answers", retry: "Try again", show: "Show answers", score: "Score", best: "Best", listenAll: "Play all", stop: "Stop",
      translit: "Transliteration", harakat: "Vowel marks", speed: "Speed", big: "Large", prev: "Previous", next: "Next", goals: "Goals", correct: "Correct!", wrong: "Not quite", answer: "Answer",
      unanswered: "Some questions are still unanswered. Check anyway?", tapTiles: "Tap the cards below to build your answer", clear: "Clear", undo: "Undo", mic: "Speak", micNo: "Speech recognition isn't supported in this browser (use Chrome or Edge).",
      heard: "Heard", similarity: "Match", bonus: "Speaking practice · not scored", showTr: "Show translation", hideTr: "Hide translation", play: "Play", done: "Done", pairs: "Tap an item on the left, then its partner on the right",
      excellent: "Excellent! You're ready for the next chapter.", good: "Good job! Review the ones you missed.", tryAgain: "Keep practising — reread the lesson part.", final: "Final test", reset: "Reset", toc: "In this chapter", listenQ: "Listen and answer", setScores: "Exercise scores" }
  };
  const u = k => UI[S.lang][k] || k;
  window.BA.t = t; window.BA.u = u; window.BA.H = H; window.BA.esc = esc; window.BA.T = T;

  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  function shuffleIdx(n, seedStr) { const r = seeded(hashStr(seedStr)); const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const norm = s => String(s).replace(HAR, "").replace(/[؟?.,،!:؛‍]/g, " ").replace(/\s+/g, " ").trim();

  // ---------------- audio ----------------
  const LANGV = { m: "ar-SA", f: "ar-SA", em: "ar-EG", ef: "ar-EG" };
  const FEMALE = /(zariyah|salma|laila|layla|hoda|amina|fatima|mariam|maryam|sana|rana|zeina|noura|female|woman|jamila|amal|iman|salwa)/i;
  const MALE = /(hamed|shakir|naayf|maged|tarik|hamdan|omar|male|man|fahed|bassel|moaz|rami|saleh)/i;
  let voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices().filter(v => /^ar/i.test(v.lang)); } catch (e) {} }
  if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function pickVoice(v) {
    if (!voices.length) loadVoices();
    if (!voices.length) return null;
    const lang = LANGV[v] || "ar-SA", fem = v === "f" || v === "ef";
    const score = x => {
      let s = 0;
      if (x.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) s += 4;
      if (/natural|neural|online|premium|enhanced/i.test(x.name)) s += 6;
      if (/google/i.test(x.name)) s += 3;
      if (fem && FEMALE.test(x.name)) s += 3; if (!fem && MALE.test(x.name)) s += 3;
      if (fem && MALE.test(x.name)) s -= 2; if (!fem && FEMALE.test(x.name)) s -= 2;
      return s;
    };
    return voices.slice().sort((a, b) => score(b) - score(a))[0];
  }
  let curAudio = null, seqToken = 0, playingBtn = null;
  function markBtn(btn, on) { if (playingBtn && playingBtn !== btn) playingBtn.classList.remove("playing"); playingBtn = on ? btn : null; if (btn) btn.classList.toggle("playing", on); }
  function stopAll() { seqToken++; if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; } try { speechSynthesis.cancel(); } catch (e) {} markBtn(null, false); }
  const missing = new Set();
  function playOne(a, text, v) {
    return new Promise(res => {
      const tts = () => {
        if (!("speechSynthesis" in window) || !text) return res();
        try { speechSynthesis.cancel(); } catch (e) {}
        const ut = new SpeechSynthesisUtterance(String(text).replace(/\s\/\s/g, "، "));
        ut.lang = LANGV[v] || "ar-SA"; const vo = pickVoice(v); if (vo) ut.voice = vo;
        ut.rate = 0.85 * S.rate; ut.onend = () => res(); ut.onerror = () => res();
        speechSynthesis.speak(ut);
      };
      if (!a || missing.has(a)) return tts();
      const au = new Audio("audio/" + a + ".mp3");
      au.playbackRate = S.rate; curAudio = au;
      au.onended = () => res();
      au.onerror = () => { missing.add(a); tts(); };
      const p = au.play(); if (p && p.catch) p.catch(() => { missing.add(a); tts(); });
    });
  }
  async function playSeq(list, btn) {
    stopAll(); const tok = ++seqToken; markBtn(btn, true);
    for (const it of list) { if (tok !== seqToken) return; await playOne(it.a, it.ar, it.v || "m"); if (tok !== seqToken) return; await new Promise(r => setTimeout(r, 350)); }
    if (tok === seqToken) markBtn(btn, false);
  }
  function play(a, text, v, btn) { playSeq([{ a, ar: text, v }], btn); }
  window.BA.play = play; window.BA.playSeq = playSeq; window.BA.stopAll = stopAll;

  // delegate clicks on any [data-a] or [data-say]
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-play]");
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    if (el.classList.contains("playing")) { stopAll(); return; }
    play(el.dataset.a || null, el.dataset.say || el.textContent, el.dataset.v || "m", el);
  });
  document.addEventListener("click", e => {
    const el = e.target.closest(".ai");
    if (!el || e.target.closest("[data-play]")) return;
    play(el.dataset.a || null, el.textContent, el.dataset.v || "m", el);
  });

  // ---------------- small render helpers ----------------
  const spk = (o, v, cls) => o && o.ar ? `<span role="button" tabindex="0" class="spk ${cls || ""}" data-play data-a="${o.a || ""}" data-v="${o.v || v || "m"}" data-say="${esc(o.say || o.ar)}" aria-label="play">🔊</span>` : "";
  const arSpan = (o, cls) => `<span class="ar ${cls || ""}" dir="rtl">${esc(H(o.ar))}</span>`;
  const trSpan = o => o && o.tr && S.tr ? `<span class="tr">${esc(o.tr)}</span>` : "";
  function cell(c, v) {
    if (c == null) return "";
    if (typeof c === "string") return esc(c);
    if (c.ar !== undefined && c.m) return `<div class="cellar">${spk(c, v)}${arSpan(c)}${trSpan(c)}<div class="cm">${T(c.m)}</div></div>`;
    if (c.ar !== undefined) return `<div class="cellar">${c.a ? spk(c, v) : ""}${arSpan(c)}${trSpan(c)}</div>`;
    return T(c);
  }
  window.BA.spk = spk; window.BA.arSpan = arSpan; window.BA.trSpan = trSpan;

  // ---------------- top bar ----------------
  function topbar(active) {
    const meta = window.BA_META || [];
    const opts = meta.map(m => `<a href="ch${String(m.n).padStart(2, "0")}.html" class="${active === m.n ? "on" : ""}"><b>${m.n === 0 ? "★" : m.n}</b> ${esc(t(m.title))}</a>`).join("");
    return `<header class="top"><div class="topin">
      <a class="brand" href="index.html"><span class="logo" dir="rtl">ع</span><span><b>Basic Arabic</b><small dir="rtl">العربية للمبتدئين</small></span></a>
      <nav class="tnav"><a href="index.html">${u("home")}</a>
        <div class="dd"><button class="ddb">${u("chapters")} ▾</button><div class="ddm">${opts}<a href="final.html"><b>✓</b> ${u("final")}</a></div></div></nav>
      <div class="tog">
        <button data-tog="lang" title="Language">${S.lang === "ko" ? "한국어" : "English"} ⇄</button>
        <button data-tog="tr" class="${S.tr ? "on" : ""}" title="${u("translit")}">Aa <span class="hide-s">${u("translit")}</span></button>
        <button data-tog="har" class="${S.har ? "on" : ""}" title="${u("harakat")}"><span dir="rtl">بَ</span> <span class="hide-s">${u("harakat")}</span></button>
        <button data-tog="rate" title="${u("speed")}">🔊 ${S.rate === 1 ? "1×" : "0.75×"}</button>
        <button data-tog="big" class="${S.big ? "on" : ""}" title="${u("big")}">A+</button>
      </div></div></header>`;
  }
  function bindTop(rerender) {
    document.querySelectorAll("[data-tog]").forEach(b => b.onclick = () => {
      const k = b.dataset.tog;
      if (k === "lang") S.lang = S.lang === "ko" ? "en" : "ko";
      else if (k === "rate") S.rate = S.rate === 1 ? 0.75 : 1;
      else S[k] = !S[k];
      LS.set(k, S[k]); applyBig(); rerender();
    });
    const dd = document.querySelector(".dd");
    if (dd) dd.querySelector(".ddb").onclick = e => { e.stopPropagation(); dd.classList.toggle("open"); };
    document.addEventListener("click", () => dd && dd.classList.remove("open"), { once: true });
  }
  function applyBig() { document.documentElement.classList.toggle("big", !!S.big); document.documentElement.lang = S.lang; }
  window.BA.topbar = topbar; window.BA.bindTop = bindTop; window.BA.applyBig = applyBig;

  // ---------------- blocks ----------------
  function renderBlock(b, ch, i) {
    const v = ch.voice, id = "b" + i;
    const head = b.title ? `<h3 class="bh">${T(b.title)}</h3>` : "";
    switch (b.type) {
      case "text": return `<section class="blk txt" id="${id}">${head}<div class="body">${T(b.body)}</div></section>`;
      case "tip": return `<aside class="tip ${b.kind}" ><span class="tipi">${b.kind === "plus" ? "➕" : "💡"}</span><div>${T(b.body)}</div></aside>`;
      case "vocab": {
        const list = b.items.map(x => ({ a: x.a, ar: x.say || x.ar, v: x.v || v }));
        window.__seq = window.__seq || {}; window.__seq[id] = list;
        return `<section class="blk voc" id="${id}"><div class="bhrow">${head}<button class="pall" data-seq="${id}">▶ ${u("listenAll")}</button></div>
          <div class="vgrid">${b.items.map(x => `<div class="vcard" data-play data-a="${x.a || ""}" data-v="${x.v || v}" data-say="${esc(x.say || x.ar)}">
            <div class="var" dir="rtl">${esc(H(x.ar))}</div>${x.tr && S.tr ? `<div class="vtr">${esc(x.tr)}</div>` : ""}<div class="vm">${T(x.m)}</div><span class="vsp">🔊</span></div>`).join("")}</div></section>`;
      }
      case "table": return `<section class="blk tbl" id="${id}">${head}<div class="tw"><table><thead><tr>${b.cols.map(c => `<th>${typeof c === "object" && c.ar ? arSpan(c) : T(c)}</th>`).join("")}</tr></thead>
          <tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${cell(c, v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${b.note ? `<p class="note">${T(b.note)}</p>` : ""}</section>`;
      case "dialogue": {
        const names = Object.keys(b.speakers);
        const list = b.lines.map(x => ({ a: x.a, ar: x.ar, v: x.v }));
        window.__seq = window.__seq || {}; window.__seq[id] = list;
        return `<section class="blk dlg" id="${id}"><div class="bhrow">${head}<div><button class="pall" data-seq="${id}">▶ ${u("listenAll")}</button> <button class="ghost" data-trtog="${id}">${u("hideTr")}</button></div></div>
          <div class="cast">${names.map((n, k) => `<span class="who w${k}"><span dir="rtl">${esc(H(n))}</span> · ${T(b.speakers[n])}</span>`).join("")}</div>
          <div class="lines">${b.lines.map(x => { const k = names.indexOf(x.sp); return `<div class="line w${k}"><div class="bub"><div class="lt">${spk(x, v)}<span class="ar" dir="rtl">${esc(H(x.ar))}</span></div>${S.tr ? `<div class="tr">${esc(x.tr)}</div>` : ""}<div class="lm">${T(x.m)}</div></div></div>`; }).join("")}</div></section>`;
      }
      case "alphabet": return `<section class="blk alpha" id="${id}">${head}<div class="agrid">${b.rows.map(r => `<div class="acard ${r.hard ? "hard" : ""}">
          ${r.hard ? `<span class="hardtag">${S.lang === "ko" ? "도전" : "challenge"}</span>` : ""}
          <button class="abig" data-play data-a="${r.name.a || ""}" data-v="${v}" data-say="${esc(r.name.ar)}" dir="rtl">${r.letter}</button>
          <div class="aname"><span dir="rtl">${esc(H(r.name.ar))}</span> <i>${esc(r.name.tr)}</i></div><div class="asnd">[ ${esc(r.sound)} ]</div>
          <div class="atip">${T(r.tip)}</div>
          <button class="aex" data-play data-a="${r.ex.a || ""}" data-v="${v}" data-say="${esc(r.ex.ar)}"><span dir="rtl">${esc(H(r.ex.ar))}</span> ${S.tr ? `<i>${esc(r.ex.tr)}</i>` : ""} · ${T(r.ex.m)}</button></div>`).join("")}</div></section>`;
      case "forms": {
        const Z = "‍";
        return `<section class="blk forms" id="${id}">${head}<div class="tw"><table class="ftab"><thead><tr><th>${S.lang === "ko" ? "이름" : "Name"}</th><th>${S.lang === "ko" ? "독립형" : "Isolated"}</th><th>${S.lang === "ko" ? "어두형" : "Initial"}</th><th>${S.lang === "ko" ? "어중형" : "Medial"}</th><th>${S.lang === "ko" ? "어말형" : "Final"}</th></tr></thead><tbody>
          ${b.rows.map(r => `<tr class="${r.join ? "" : "nj"}"><td>${spk(r.name, v)}<span dir="rtl">${esc(H(r.name.ar))}</span>${S.tr ? ` <i>${esc(r.name.tr)}</i>` : ""}${r.join ? "" : ` <span class="njt">${S.lang === "ko" ? "뒤와 안 이어짐" : "no left join"}</span>`}</td>
          <td class="fl">${r.letter}</td><td class="fl">${r.join ? r.letter + Z : r.letter}</td><td class="fl">${r.join ? Z + r.letter + Z : Z + r.letter}</td><td class="fl">${Z + r.letter}</td></tr>`).join("")}</tbody></table></div></section>`;
      }
      case "tool": return `<section class="blk tool" id="${id}">${head}<p class="tdesc">${T(b.desc)}</p><div class="toolbox" data-tool="${b.tool}" data-bi="${i}"></div></section>`;
    }
    return "";
  }

  // ---------------- tools ----------------
  const TOOLS = {};
  TOOLS.joiner = (el, b, ch) => {
    const letters = "ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ة ء".split(" ");
    let word = [];
    const draw = () => {
      el.innerHTML = `<div class="jout" dir="rtl">${word.join("") || "<span class='ph'>…</span>"}</div>
        <div class="jsep" dir="rtl">${word.map(c => `<span>${c}</span>`).join(" + ") || ""}</div>
        <div class="kbd" dir="rtl">${letters.map(c => `<button data-c="${c}">${c}</button>`).join("")}</div>
        <div class="row"><button class="ghost" data-j="undo">⌫ ${u("undo")}</button><button class="ghost" data-j="clear">✕ ${u("clear")}</button>
        ${["كتاب", "مدرسة", "ورد", "قهوة", "شمس"].map(w => `<button class="chip" data-w="${w}">${w}</button>`).join("")}</div>`;
      el.querySelectorAll("[data-c]").forEach(x => x.onclick = () => { word.push(x.dataset.c); draw(); });
      el.querySelectorAll("[data-w]").forEach(x => x.onclick = () => { word = [...x.dataset.w]; draw(); });
      el.querySelector("[data-j=undo]").onclick = () => { word.pop(); draw(); };
      el.querySelector("[data-j=clear]").onclick = () => { word = []; draw(); };
    };
    draw();
  };
  TOOLS.trace = (el) => {
    const letters = "ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي".split(" ");
    let cur = "ب";
    el.innerHTML = `<div class="kbd small" dir="rtl">${letters.map(c => `<button data-c="${c}">${c}</button>`).join("")}</div>
      <div class="padwrap"><canvas class="pad" width="600" height="360"></canvas></div><div class="row"><button class="ghost" data-t="clear">✕ ${u("clear")}</button></div>`;
    const cv = el.querySelector("canvas"), cx = cv.getContext("2d");
    const bg = () => { cx.clearRect(0, 0, cv.width, cv.height); cx.fillStyle = "#e9e1d2"; cx.font = "260px 'Amiri', serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(cur, 300, 170);
      cx.strokeStyle = "#d9cdb8"; cx.setLineDash([6, 6]); cx.beginPath(); cx.moveTo(20, 230); cx.lineTo(580, 230); cx.stroke(); cx.setLineDash([]); };
    bg();
    let down = false;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.onpointerdown = e => { down = true; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); cx.beginPath(); cx.moveTo(x, y); };
    cv.onpointermove = e => { if (!down) return; const [x, y] = pos(e); cx.lineTo(x, y); cx.strokeStyle = "#0f766e"; cx.lineWidth = 12; cx.lineCap = "round"; cx.lineJoin = "round"; cx.stroke(); };
    cv.onpointerup = () => down = false;
    el.querySelectorAll("[data-c]").forEach(x => x.onclick = () => { cur = x.dataset.c; bg(); });
    el.querySelector("[data-t=clear]").onclick = bg;
    if (document.fonts) document.fonts.ready.then(bg);
  };
  TOOLS.vowels = (el, b) => {
    let ci = 0;
    const draw = () => {
      const row = b.rows[ci];
      el.innerHTML = `<div class="kbd small" dir="rtl">${b.rows.map((r, i) => `<button data-i="${i}" class="${i === ci ? "on" : ""}">${r.c}</button>`).join("")}</div>
      <div class="vlab">${row.s.map((s, k) => `<button class="vsyl" data-play data-a="${s.a}" data-v="m" data-say="${esc(s.ar)}"><span dir="rtl">${s.ar}</span><i>${s.tr}</i><small>${["fatḥa", "ḍamma", "kasra", "ā", "ū", "ī"][k]}</small></button>`).join("")}</div>`;
      el.querySelectorAll("[data-i]").forEach(x => x.onclick = () => { ci = +x.dataset.i; draw(); });
    };
    draw();
  };
  TOOLS.numbers = (el, b) => {
    el.innerHTML = `<div class="nshow"><div class="nbig">0</div><div class="ndig" dir="ltr">٠</div><div class="nar" dir="rtl">${esc(H(b.nums[0].ar))}</div><div class="ntr">${S.tr ? esc(b.nums[0].tr) : ""}</div></div>
      <div class="ngrid">${b.nums.map(n => `<button data-n="${n.n}">${n.n}</button>`).join("")}</div>`;
    el.querySelectorAll("[data-n]").forEach(x => x.onclick = () => {
      const n = b.nums[+x.dataset.n];
      el.querySelector(".nbig").textContent = n.n; el.querySelector(".ndig").textContent = n.dig;
      el.querySelector(".nar").textContent = H(n.ar); el.querySelector(".ntr").textContent = S.tr ? n.tr : "";
      el.querySelectorAll("[data-n]").forEach(y => y.classList.toggle("on", y === x));
      play(n.a, n.ar, "m");
    });
  };
  TOOLS.clock = (el, b) => {
    let h = 9, m = 15;
    const draw = () => {
      const it = b.clock.find(c => c.h === h && c.m === m);
      const ha = (h % 12) * 30 + m * 0.5, ma = m * 6;
      el.innerHTML = `<div class="clockrow"><svg viewBox="0 0 200 200" class="clk"><circle cx="100" cy="100" r="92" class="cf"/>${[...Array(12)].map((_, i) => { const a = (i + 1) * 30 * Math.PI / 180; return `<text x="${100 + 72 * Math.sin(a)}" y="${106 - 72 * Math.cos(a)}" text-anchor="middle">${i + 1}</text>`; }).join("")}
        <line x1="100" y1="100" x2="${100 + 45 * Math.sin(ha * Math.PI / 180)}" y2="${100 - 45 * Math.cos(ha * Math.PI / 180)}" class="hh"/><line x1="100" y1="100" x2="${100 + 70 * Math.sin(ma * Math.PI / 180)}" y2="${100 - 70 * Math.cos(ma * Math.PI / 180)}" class="mh"/><circle cx="100" cy="100" r="5" class="cc"/></svg>
        <div class="cside"><div class="ctime">${h}:${String(m).padStart(2, "0")}</div><div class="car" dir="rtl">${esc(H(it.ar))}</div><div class="ctr">${S.tr ? esc(it.tr) : ""}</div>
        <button class="pall" data-play data-a="${it.a}" data-v="m" data-say="${esc(it.ar)}">🔊 ${u("play")}</button>
        <div class="csel"><label>${S.lang === "ko" ? "시" : "Hour"} <select data-c="h">${[...Array(12)].map((_, i) => `<option ${i + 1 === h ? "selected" : ""}>${i + 1}</option>`).join("")}</select></label>
        <label>${S.lang === "ko" ? "분" : "Min"} <select data-c="m">${[...Array(12)].map((_, i) => `<option ${i * 5 === m ? "selected" : ""}>${i * 5}</option>`).join("")}</select></label></div></div></div>`;
      el.querySelector("[data-c=h]").onchange = e => { h = +e.target.value; draw(); };
      el.querySelector("[data-c=m]").onchange = e => { m = +e.target.value; draw(); };
    };
    draw();
  };
  TOOLS.composer = (el, b) => {
    let i = 0, j = 0, k = 0;
    const draw = () => {
      const parts = [b.subjects[i], b.objects[j], b.tails[k]];
      const ar = parts.map(p => p.ar).filter(Boolean).join(" ");
      const mean = parts.map(p => t(p.m)).filter(Boolean).join(" · ");
      const col = (arr, sel, key) => `<div class="ccol">${arr.map((p, n) => `<button class="${n === sel ? "on" : ""}" data-${key}="${n}">${p.ar ? `<span dir="rtl">${esc(H(p.ar))}</span>` : "—"}<small>${t(p.m)}</small></button>`).join("")}</div>`;
      el.innerHTML = `<div class="comp">${col(b.subjects, i, "i")}${col(b.objects, j, "j")}${col(b.tails, k, "k")}</div>
        <div class="cres"><button class="spk big" data-play data-a="${b.combos[i + "-" + j + "-" + k]}" data-v="m" data-say="${esc(ar)}">🔊</button><div><div class="ar big" dir="rtl">${esc(H(ar))}</div><div class="cm">${esc(mean)}</div></div></div>
        <div class="micbox" data-target="${esc(ar)}"></div>`;
      el.querySelectorAll("[data-i]").forEach(x => x.onclick = () => { i = +x.dataset.i; draw(); });
      el.querySelectorAll("[data-j]").forEach(x => x.onclick = () => { j = +x.dataset.j; draw(); });
      el.querySelectorAll("[data-k]").forEach(x => x.onclick = () => { k = +x.dataset.k; draw(); });
      micBox(el.querySelector(".micbox"), ar, "ar-SA");
    };
    draw();
  };
  TOOLS.menu = (el, b) => {
    let order = [];
    const draw = () => {
      const ar = order.length ? b.lead.ar + " " + order.map(n => b.items[n].ar).join(" وَ") : "";
      const total = order.reduce((s, n) => s + b.items[n].p, 0);
      el.innerHTML = `<div class="menu"><div class="mhead" dir="rtl">قَائِمَةُ الطَّعَام <small>${S.lang === "ko" ? "메뉴" : "Menu"}</small></div>
        <div class="mitems">${b.items.map((it, n) => `<button data-n="${n}"><span dir="rtl">${esc(H(it.ar))}</span><small>${t(it.m)}</small><b>${it.p} ${S.lang === "ko" ? "파운드" : "EGP"}</b></button>`).join("")}</div></div>
        <div class="cres"><button class="spk big" data-mplay>🔊</button><div><div class="ar big" dir="rtl">${ar ? esc(H(ar)) : "…"}</div>
        <div class="cm">${order.map(n => t(b.items[n].m)).join(", ")} ${order.length ? `— ${S.lang === "ko" ? "합계" : "Total"} ${total}` : ""}</div></div></div>
        <div class="row"><button class="ghost" data-x="undo">⌫ ${u("undo")}</button><button class="ghost" data-x="clear">✕ ${u("clear")}</button>
        <button class="chip" data-play data-a="${b.bill.a}" data-v="m" data-say="${esc(b.bill.ar)}">🧾 <span dir="rtl">${esc(H(b.bill.ar))}</span></button></div>`;
      el.querySelectorAll("[data-n]").forEach(x => x.onclick = () => { if (order.length < 4) { order.push(+x.dataset.n); draw(); play(b.items[+x.dataset.n].a, b.items[+x.dataset.n].ar, "m"); } });
      el.querySelector("[data-x=undo]").onclick = () => { order.pop(); draw(); };
      el.querySelector("[data-x=clear]").onclick = () => { order = []; draw(); };
      el.querySelector("[data-mplay]").onclick = e => { if (!order.length) return; const seq = [{ a: b.lead.a, ar: b.lead.ar, v: "m" }]; order.forEach(n => seq.push({ a: b.items[n].a, ar: b.items[n].ar, v: "m" })); playSeq(seq, e.currentTarget); };
    };
    draw();
  };

  // ---------------- speech recognition ----------------
  function sim(a, b) {
    a = norm(a).replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي"); b = norm(b).replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
    const m = a.length, n = b.length; if (!m || !n) return 0;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return Math.max(0, Math.round(100 * (1 - d[m][n] / Math.max(m, n))));
  }
  function micBox(box, target, lang) {
    if (!box) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    box.innerHTML = `<button class="mic">🎤 ${u("mic")}</button><span class="mres"></span>`;
    const res = box.querySelector(".mres");
    box.querySelector(".mic").onclick = () => {
      if (!SR) { res.textContent = u("micNo"); return; }
      const r = new SR(); r.lang = lang || "ar-SA"; r.interimResults = false; r.maxAlternatives = 3;
      box.classList.add("rec"); res.textContent = "…";
      r.onresult = e => { const alts = [...e.results[0]].map(x => x.transcript); let best = alts[0], bs = -1; alts.forEach(x => { const s = sim(x, target); if (s > bs) { bs = s; best = x; } });
        res.innerHTML = `${u("heard")}: <span dir="rtl" class="ar">${esc(best)}</span> · ${u("similarity")} <b class="${bs >= 80 ? "okc" : bs >= 50 ? "midc" : "badc"}">${bs}%</b>`; };
      r.onerror = ev => { res.textContent = ev.error === "not-allowed" ? "🎤 permission denied" : "…"; };
      r.onend = () => box.classList.remove("rec");
      try { r.start(); } catch (e) {}
    };
  }
  window.BA.micBox = micBox;

  // ---------------- exercises ----------------
  const ANS = {};      // ANS[setKey][qid] = value
  const GRADED = {};   // GRADED[setKey] = result
  function qPoints(q) { if (q.t === "sort") return q.items.length; if (q.t === "match") return q.pairs.length; if (q.t === "speak") return 0; return 1; }
  function gradeQ(q, a) {
    if (q.t === "mcq") return a != null && a === q.ans ? 1 : 0;
    if (q.t === "build") { const toks = buildTokens(q); const got = (a || []).map(i => toks[i]).join(q.sep); const ok = [q.answer, ...(q.alts || [])].some(x => norm(x).replace(/ /g, q.sep === "" ? "" : " ") === norm(got)); return ok ? 1 : 0; }
    if (q.t === "sort") return q.items.reduce((s, it, i) => s + ((a || {})[i] === it.cat ? 1 : 0), 0);
    if (q.t === "match") { const m = a || {}; return q.pairs.reduce((s, p, i) => s + (m[i] === i ? 1 : 0), 0); }
    return 0;
  }
  function answered(q, a) {
    if (q.t === "speak") return true;
    if (q.t === "mcq") return a != null;
    if (q.t === "build") return a && a.length;
    if (q.t === "sort") return a && Object.keys(a).length === q.items.length;
    if (q.t === "match") return a && Object.keys(a).length === q.pairs.length;
  }
  function buildTokens(q) {
    const main = q.sep === "" ? [...q.answer.replace(HAR, "")] : q.answer.split(" ");
    return [...main, ...(q.distract || [])];
  }
  function renderQ(q, key, n, graded, v) {
    const a = (ANS[key] || {})[q.id];
    const pts = graded ? gradeQ(q, a) : null, max = qPoints(q);
    const st = graded ? (q.t === "speak" ? "" : pts === max ? "ok" : "bad") : "";
    let h = `<div class="q ${st}" data-q="${q.id}"><div class="qn">${n}</div><div class="qb"><div class="qq">${T(q.q)}</div>`;
    const qv = q.v || v;
    if (q.t === "mcq") {
      if (q.ar) {
        if (q.listen) h += `<div class="qar listen"><button class="spk big" data-play data-a="${q.a || ""}" data-v="${qv}" data-say="${esc(q.ar)}">▶</button><span class="lhint">${u("listenQ")}</span>${graded ? `<span class="ar" dir="rtl">${esc(H(q.ar))}</span>${q.tr && S.tr ? `<span class="tr">${esc(q.tr)}</span>` : ""}` : ""}</div>`;
        else h += `<div class="qar">${spk(q, qv)}<span class="ar big" dir="rtl">${esc(H(q.ar))}</span>${q.tr && S.tr ? `<span class="tr">${esc(q.tr)}</span>` : ""}</div>`;
      }
      const order = shuffleIdx(q.opts.length, key + q.id);
      const isAr = q.opts[0] && q.opts[0].ar !== undefined;
      h += `<div class="opts ${isAr ? "aro" : ""}">${order.map(oi => { const o = q.opts[oi];
        let c = a === oi ? "sel" : ""; if (graded) { if (oi === q.ans) c += " right"; else if (a === oi) c += " wrongc"; }
        return `<button class="opt ${c}" data-oi="${oi}" ${graded ? "disabled" : ""}>${o.ar !== undefined ? `<span dir="rtl" class="ar">${esc(H(o.ar))}</span>${o.tr && S.tr ? ` <i class="tr">${esc(o.tr)}</i>` : ""}` : T(o)}</button>`; }).join("")}</div>`;
    }
    if (q.t === "build") {
      const toks = buildTokens(q), order = shuffleIdx(toks.length, key + q.id), sel = a || [];
      const joined = sel.map(i => toks[i]).join(q.sep);
      h += `<div class="bwrap"><div class="bans ${q.sep === "" ? "letters" : ""}" dir="rtl">${sel.length ? (q.sep === "" ? `<span class="bjoin">${esc(H(joined))}</span><span class="bletters">${sel.map((i, k) => `<button class="tile in" data-rm="${k}" ${graded ? "disabled" : ""}>${esc(toks[i])}</button>`).join("")}</span>` : sel.map((i, k) => `<button class="tile in" data-rm="${k}" ${graded ? "disabled" : ""}>${esc(H(toks[i]))}</button>`).join("")) : `<span class="ph">${u("tapTiles")}</span>`}</div>
        <div class="bpool" dir="rtl">${order.map(i => `<button class="tile ${sel.includes(i) ? "used" : ""}" data-ti="${i}" ${graded || sel.includes(i) ? "disabled" : ""}>${esc(H(toks[i]))}</button>`).join("")}</div></div>`;
      if (graded) h += `<div class="sol">${spk({ a: q.a, ar: q.show || q.answer }, qv)}<span class="ar" dir="rtl">${esc(H(q.show || q.answer))}</span>${q.tr && S.tr ? ` <span class="tr">${esc(q.tr)}</span>` : ""}</div>`;
    }
    if (q.t === "sort") {
      const m = a || {};
      h += `<div class="sorts">${q.items.map((it, i) => { let c = ""; if (graded) c = m[i] === it.cat ? "right" : "wrongc";
        return `<div class="srow ${c}">${spk(it, qv)}<span class="ar" dir="rtl">${esc(H(it.ar))}</span><span class="sbtns">${q.cats.map(ca => `<button class="sb ${m[i] === ca.id ? "sel" : ""} ${graded && ca.id === it.cat ? "right" : ""}" data-si="${i}" data-cat="${ca.id}" ${graded ? "disabled" : ""}>${T(ca.label)}</button>`).join("")}</span></div>`; }).join("")}</div>`;
    }
    if (q.t === "match") {
      const m = a || {}, ro = shuffleIdx(q.pairs.length, key + q.id);
      const used = new Set(Object.values(m));
      h += `<p class="hint">${u("pairs")}</p><div class="match"><div class="mcol">${q.pairs.map((p, i) => `<button class="mi L ${m[i] != null ? "paired p" + (i % 6) : ""} ${graded ? (m[i] === i ? "right" : "wrongc") : ""}" data-l="${i}" ${graded ? "disabled" : ""}>${spk(p[0], qv)}<span dir="rtl" class="ar">${esc(H(p[0].ar))}</span>${p[0].tr && S.tr ? ` <i class="tr">${esc(p[0].tr)}</i>` : ""}</button>`).join("")}</div>
        <div class="mcol">${ro.map(j => { const li = Object.keys(m).find(k => m[k] === j); return `<button class="mi R ${li != null ? "paired p" + (li % 6) : ""}" data-r="${j}" ${graded ? "disabled" : ""}>${T(q.pairs[j][1])}${graded ? ` <small class="mans">← <span dir="rtl">${esc(H(q.pairs[j][0].ar))}</span></small>` : ""}</button>`; }).join("")}</div></div>`;
    }
    if (q.t === "speak") {
      h += `<div class="qar">${spk(q, qv)}<span class="ar big" dir="rtl">${esc(H(q.ar))}</span>${q.tr && S.tr ? `<span class="tr">${esc(q.tr)}</span>` : ""}</div><div class="micbox"></div><div class="bonus">${u("bonus")}</div>`;
    }
    if (graded && q.t !== "speak") {
      h += `<div class="fb">${pts === max ? `✅ ${u("correct")}` : `❌ ${u("wrong")}`} ${max > 1 ? `(${pts}/${max})` : ""} ${q.ex ? `<span class="ex">${T(q.ex)}</span>` : ""}</div>`;
    }
    return h + `</div></div>`;
  }
  function renderSet(set, key, v) {
    const graded = GRADED[key];
    const best = LS.get("best_" + key, null);
    let h = `<div class="set" id="set-${key}"><div class="sethead"><div><h3>${T(set.title)}</h3><p>${T(set.desc)}</p></div>${best != null ? `<span class="bestb">${u("best")} ${best}%</span>` : ""}</div>`;
    let n = 0;
    h += set.qs.map(q => renderQ(q, key, ++n, graded, v)).join("");
    h += `<div class="setfoot">`;
    if (graded) {
      const pct = graded.max ? Math.round(100 * graded.pts / graded.max) : 0;
      h += `<div class="result"><div class="ring" style="--p:${pct}"><span>${pct}%</span></div><div><b>${u("score")}: ${graded.pts} / ${graded.max}</b><p>${pct >= 80 ? u("excellent") : pct >= 50 ? u("good") : u("tryAgain")}</p></div></div><button class="primary" data-retry>${u("retry")} ↺</button>`;
    } else h += `<button class="primary" data-check>${u("check")} ✓</button>`;
    return h + `</div></div>`;
  }
  function bindSet(root, set, key, v, onScore) {
    const box = root.querySelector("#set-" + CSS.escape(key));
    if (!box) return;
    const rer = () => { const nh = document.createElement("div"); nh.innerHTML = renderSet(set, key, v); box.replaceWith(nh.firstElementChild); bindSet(root, set, key, v, onScore); };
    ANS[key] = ANS[key] || {};
    const A_ = ANS[key];
    box.querySelectorAll(".q").forEach(qe => {
      const q = set.qs.find(x => x.id === qe.dataset.q);
      qe.querySelectorAll("[data-oi]").forEach(b => b.onclick = () => { A_[q.id] = +b.dataset.oi; rer(); });
      qe.querySelectorAll("[data-ti]").forEach(b => b.onclick = () => { (A_[q.id] = A_[q.id] || []).push(+b.dataset.ti); rer(); });
      qe.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { A_[q.id].splice(+b.dataset.rm, 1); rer(); });
      qe.querySelectorAll("[data-si]").forEach(b => b.onclick = () => { (A_[q.id] = A_[q.id] || {})[+b.dataset.si] = b.dataset.cat; rer(); });
      let selL = null;
      qe.querySelectorAll("[data-l]").forEach(b => b.onclick = e => { if (e.target.closest("[data-play]")) return; qe.querySelectorAll("[data-l]").forEach(x => x.classList.remove("cur")); b.classList.add("cur"); selL = +b.dataset.l; });
      qe.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { if (selL == null) return; const m = (A_[q.id] = A_[q.id] || {}); const r = +b.dataset.r; Object.keys(m).forEach(k => { if (m[k] === r) delete m[k]; }); m[selL] = r; rer(); });
      const mb = qe.querySelector(".micbox"); if (mb && q.t === "speak") micBox(mb, q.ar, (q.v || v).startsWith("e") ? "ar-EG" : "ar-SA");
    });
    const ck = box.querySelector("[data-check]");
    if (ck) ck.onclick = () => {
      const un = set.qs.filter(q => !answered(q, A_[q.id])).length;
      if (un && !confirm(u("unanswered"))) return;
      let pts = 0, max = 0; set.qs.forEach(q => { pts += gradeQ(q, A_[q.id]); max += qPoints(q); });
      GRADED[key] = { pts, max };
      const pct = max ? Math.round(100 * pts / max) : 0;
      const prev = LS.get("best_" + key, -1); if (pct > prev) LS.set("best_" + key, pct);
      rer(); onScore && onScore();
      box.ownerDocument.querySelector("#set-" + CSS.escape(key)).scrollIntoView({ behavior: "smooth", block: "end" });
    };
    const rt = box.querySelector("[data-retry]");
    if (rt) rt.onclick = () => { ANS[key] = {}; delete GRADED[key]; rer(); document.querySelector("#set-" + CSS.escape(key)).scrollIntoView({ behavior: "smooth", block: "start" }); };
  }
  window.BA.renderSet = renderSet; window.BA.bindSet = bindSet; window.BA.shuffleIdx = shuffleIdx; window.BA.seeded = seeded; window.BA.hashStr = hashStr;

  function chapterScore(n, sets) {
    const vals = sets.map(s => LS.get(`best_${n}_${s.id}`, null)).filter(x => x != null);
    return { done: vals.length, total: sets.length, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / sets.length) : 0 };
  }
  window.BA.chapterScore = chapterScore;

  // ---------------- chapter page ----------------
  function chapterPage(n) {
    const ch = window.BA_CH[n], meta = window.BA_META;
    const root = document.getElementById("app");
    const render = () => {
      stopAll(); applyBig();
      const idx = meta.findIndex(m => m.n === n), prev = meta[idx - 1], next = meta[idx + 1];
      const secName = window.BA_SECTIONS[ch.sec];
      const sc = chapterScore(n, ch.sets);
      const toc = ch.blocks.map((b, i) => b.title ? `<a href="#b${i}">${t(b.title).replace(/<[^>]+>/g, "")}</a>` : "").join("") + `<a href="#ex" class="tex">✎ ${u("exercises")}</a>`;
      document.title = `${n === 0 ? "" : "Ch." + n + " "}${t(ch.title)} · Basic Arabic`;
      root.innerHTML = topbar(n) + `<main class="chap">
        <section class="chero s${ch.sec}"><div class="chin"><div class="cnum">${n === 0 ? "INTRO" : (S.lang === "ko" ? n + "과" : "Chapter " + n)}<span>${esc(t(secName))}</span></div>
          <h1>${T(ch.title)}</h1><p class="csub">${T(ch.sub)}</p>
          ${ch.goals.length ? `<div class="goals"><b>${u("goals")}</b><ul>${ch.goals.map(g => `<li>${T(g)}</li>`).join("")}</ul></div>` : ""}
          <div class="cprog"><span>${u("setScores")}:</span> ${ch.sets.map(s => { const b = LS.get(`best_${n}_${s.id}`, null); return `<a href="#set-${n}_${s.id}" class="sp ${b == null ? "" : b >= 80 ? "g" : "y"}">${b == null ? "—" : b + "%"}</a>`; }).join("")}</div></div>
          <div class="cicon" dir="rtl">${esc(ch.icon)}</div></section>
        <div class="cbody"><aside class="toc"><b>${u("toc")}</b>${toc}</aside><div class="cmain">
          <h2 class="part">📖 ${u("lesson")}</h2>
          ${ch.blocks.map((b, i) => renderBlock(b, ch, i)).join("")}
          <h2 class="part" id="ex">✎ ${u("exercises")}</h2>
          ${ch.sets.map(s => renderSet(s, `${n}_${s.id}`, ch.voice)).join("")}
          <nav class="pn">${prev ? `<a href="ch${String(prev.n).padStart(2, "0")}.html">← ${u("prev")}<b>${esc(t(prev.title))}</b></a>` : "<span></span>"}
          ${next ? `<a href="ch${String(next.n).padStart(2, "0")}.html" class="nx">${u("next")} →<b>${esc(t(next.title))}</b></a>` : `<a href="final.html" class="nx">${u("final")} →<b>✓</b></a>`}</nav>
        </div></div></main>${footer()}`;
      bindTop(render);
      root.querySelectorAll("[data-seq]").forEach(b => b.onclick = () => { if (b.classList.contains("playing")) { stopAll(); return; } playSeq(window.__seq[b.dataset.seq], b); });
      root.querySelectorAll("[data-trtog]").forEach(b => b.onclick = () => { const sec = document.getElementById(b.dataset.trtog); const hid = sec.classList.toggle("notr"); b.textContent = hid ? u("showTr") : u("hideTr"); });
      root.querySelectorAll(".toolbox").forEach(el => { const b = ch.blocks[+el.dataset.bi]; TOOLS[el.dataset.tool] && TOOLS[el.dataset.tool](el, b, ch); });
      ch.sets.forEach(s => bindSet(root, s, `${n}_${s.id}`, ch.voice, null));
    };
    render();
  }
  function footer() {
    return `<footer class="foot"><p>${S.lang === "ko" ? "국제학교 아랍어 수업용 인터랙티브 학습 사이트 · 다인에듀 후안샘" : "Interactive Arabic class site for international-school students · Dain Edu"}</p>
      <p class="small">${S.lang === "ko" ? "음성: 원어민 스타일 뉴럴 음성(사우디·이집트). 음성 파일이 없으면 브라우저의 아랍어 음성으로 자동 재생됩니다." : "Audio: native-style neural voices (Saudi & Egyptian). If a clip is unavailable, your browser's Arabic voice is used."}</p></footer>`;
  }
  window.BA.footer = footer;
  window.BA.chapterPage = chapterPage;
  window.BA_SECTIONS = [
    { ko: "시작하기", en: "Getting started" }, { ko: "1부 · 글자와 소리", en: "Part 1 · Letters & sounds" }, { ko: "2부 · 기초 문법", en: "Part 2 · Basic grammar" },
    { ko: "3부 · 일상 대화", en: "Part 3 · Everyday conversation" }, { ko: "4부 · 숫자·시간·날짜", en: "Part 4 · Numbers, time & dates" },
    { ko: "5부 · 아랍 세계 여행", en: "Part 5 · Out and about" }, { ko: "6부 · 구어체 입문", en: "Part 6 · Spoken Arabic" }];
})();
