/**
 * Basic Arabic — AI 선생님 챗봇 서버 (Cloudflare Worker)
 * 비밀 변수(Secret):  ANTHROPIC_API_KEY
 * 일반 변수(Vars):    ALLOWED_ORIGIN = https://yalli2.github.io
 */
const MODEL = 'claude-haiku-5-5';

const SYSTEM = `너는 "후드후드 선생님(Ustadh Hudhud)"이라는 이름의 아랍어 튜터야.
학생: 한국 국제학교 중·고등학생 (아랍어 입문~초급).
사이트: 'Basic Arabic' — 아랍어 알파벳·발음, 명사·대명사·형용사·복수, 소유(이다파, 소유 접미사, عِنْدَ/مَعَ/لِـ), 현재형 동사·부정·질문, 인사, 자기·가족 소개, 취미, 숫자·시간, 요일·월, 여행·음식, 이집트 구어체를 14개 단원으로 배운다.

답변 규칙:
- 기본은 한국어로 짧고 친절하게(6~10줄). 학생이 영어로 물으면 영어로 답한다.
- 아랍어 예문은 1~3개, 반드시 모음부호(harakat)를 붙이고 바로 뒤 괄호에 로마자 발음과 뜻을 쓴다. 예: كِتَابِي (kitābī, 내 책)
- 기본은 현대 표준 아랍어(MSA). 이집트 구어체를 물으면 구어체로 답하고 MSA와의 차이를 짧게 말한다.
- 남성/여성 형태가 다르면 둘 다 보여 준다.
- 숙제·시험 답만 요구하면 바로 정답을 주지 말고 규칙과 힌트로 스스로 풀게 돕는다. 학생이 자기 답을 보여 주면 맞는지 확인해 준다.
- 아랍어·언어 학습과 무관한 요청이나 부적절한 요청은 정중히 거절하고 아랍어 공부로 돌아오게 한다. 종교·정치 논쟁에는 의견을 내지 않는다.
- 확실하지 않은 내용은 추측하지 말고 선생님께 확인하라고 말한다.`;

function cors(origin, allowed) {
  return {
    'Access-Control-Allow-Origin': origin === allowed ? origin : allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || 'https://yalli2.github.io';
    const origin = request.headers.get('Origin') || '';
    const headers = { ...cors(origin, allowed), 'Content-Type': 'application/json; charset=utf-8' };
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
    if (origin !== allowed) return new Response(JSON.stringify({ error: 'forbidden origin' }), { status: 403, headers });

    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers }); }
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return new Response(JSON.stringify({ error: 'no question' }), { status: 400, headers });
    }
    while (messages.length && messages[0].role !== 'user') messages.shift();
    const context = String(body.context || '').slice(0, 200);

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: SYSTEM + (context ? `\n\n학생이 지금 보고 있는 페이지: ${context}` : ''),
        messages,
      }),
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'upstream ' + r.status }), { status: 502, headers });
    }
    const data = await r.json();
    const reply = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    return new Response(JSON.stringify({ reply }), { headers });
  },
};
