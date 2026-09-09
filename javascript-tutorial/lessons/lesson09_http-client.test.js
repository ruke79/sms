// 레슨 9 — 외부 API 를 부를 때 반드시 하는 것 (면접 Q35)
//
// "타임아웃·재시도·멱등성"은 말로는 쉬운데, **재시도가 사고를 만드는 쪽**은 잘 안 짚는다.
// 여기서는 진짜 HTTP 서버를 띄워 놓고 **호출 횟수**로 판정한다. 시간은 재지 않는다 —
// 재면 CI 머신 사정으로 흔들린다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, json } from './testserver.js';
import { fact, lesson } from './lesson.js';

/** 지수 백오프 + 지터. sleep 을 주입받아 테스트에서는 기다리지 않는다. */
function backoff({ base = 100, factor = 2, cap = 2000, attempt, random }) {
  const raw = Math.min(cap, base * factor ** attempt);
  return Math.floor(raw * (0.5 + 0.5 * random()));   // full jitter 의 절반 폭
}

/** 실무에서 쓰는 형태의 재시도 래퍼. 판정 기준을 전부 밖에서 정한다. */
async function callWithRetry(url, {
  retries = 3, shouldRetry, sleep = async () => {}, random = Math.random, signal, init = {},
} = {}) {
  const waited = [];
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal });
      if (!shouldRetry(res)) return { res, attempts: attempt + 1, waited };
      last = new Error(`HTTP ${res.status}`);
      const retryAfter = res.headers.get('retry-after');
      const ms = retryAfter ? Number(retryAfter) * 1000 : backoff({ attempt, random });
      if (attempt < retries) { waited.push(ms); await sleep(ms); }
    } catch (e) {
      last = e;
      if (e.name === 'AbortError' || e.name === 'TimeoutError') throw e;
      if (attempt < retries) { const ms = backoff({ attempt, random }); waited.push(ms); await sleep(ms); }
    }
  }
  throw last;
}

describe('레슨 9. 외부 API — 타임아웃·재시도·멱등성', () => {

  it('9-1. 타임아웃을 안 걸면 상대가 안 끝내는 한 영원히 안 돌아온다 (Q35) ★', async () => {
    const server = await startServer((req, res) => new Promise(() => { /* 절대 응답하지 않는다 */ }));
    try {
      // 타임아웃 없음 — 500ms 안에 안 끝난다는 것만 확인하고 버린다(영원히 기다릴 수는 없으니).
      const naked = fetch(server.url).then(() => 'resolved', () => 'rejected');
      const raced = await Promise.race([naked, new Promise((r) => setTimeout(() => r('아직 대기 중'), 500))]);
      fact('타임아웃 없이 부른 결과', raced);
      assert.equal(raced, '아직 대기 중');

      // AbortSignal.timeout 을 걸면 정해진 이름으로 끊긴다.
      const err = await fetch(server.url, { signal: AbortSignal.timeout(100) }).catch((e) => e);
      fact('AbortSignal.timeout(100) 의 결과', err.name);
      assert.equal(err.name, 'TimeoutError');
    } finally { await server.close(); }

    lesson('fetch 도 XHR 도 기본 타임아웃이 없다 — 상대가 죽으면 이쪽 워커가 붙잡힌 채 고갈된다');
  });

  it('9-2. 백오프에 지터가 없으면 재시도가 같은 순간에 겹친다 (Q35) ★', () => {
    const clients = 100;
    const noJitter = new Array(clients).fill(0).map(() => backoff({ attempt: 2, random: () => 1 }));
    const jittered = new Array(clients).fill(0).map((_, i) => backoff({ attempt: 2, random: () => i / clients }));

    fact('지터 없음 — 서로 다른 대기 시간의 개수', new Set(noJitter).size);
    fact('지터 있음 — 서로 다른 대기 시간의 개수', new Set(jittered).size);
    assert.equal(new Set(noJitter).size, 1);          // 100대가 전부 같은 순간에 다시 온다
    assert.ok(new Set(jittered).size > 50);

    assert.ok(Math.min(...jittered) >= 200 && Math.max(...jittered) <= 400);
    lesson('지터가 없으면 재시도가 파도가 되어 겨우 살아난 상대를 다시 쓰러뜨린다 (thundering herd)');
  });

  it('9-3. 5xx 는 재시도, 4xx 는 재시도하면 안 된다 (Q35) ★', async () => {
    const server = await startServer((req, res) => {
      if (req.url === '/flaky') return json(res, server.calls.filter((c) => c.path === '/flaky').length < 3 ? 503 : 200, { ok: true });
      return json(res, 400, { error: 'bad request' });
    });
    try {
      const retryOn5xx = (res) => res.status >= 500;

      const ok = await callWithRetry(`${server.url}/flaky`, { shouldRetry: retryOn5xx, random: () => 0.5 });
      fact('503 이 두 번 난 뒤 성공 — 총 시도', ok.attempts);
      assert.equal(ok.attempts, 3);
      assert.equal(ok.res.status, 200);

      const before = server.calls.length;
      const bad = await callWithRetry(`${server.url}/bad`, { shouldRetry: retryOn5xx, random: () => 0.5 });
      fact('400 에 대한 호출 횟수', server.calls.length - before);
      assert.equal(bad.attempts, 1);                 // 재시도하지 않는다
      assert.equal(server.calls.length - before, 1);
    } finally { await server.close(); }

    lesson('400 은 몇 번을 보내도 400 이다 — 상대만 괴롭히고 자기 지연만 늘린다');
  });

  it('9-4. Retry-After 를 무시하면 회복 타이밍과 어긋난다 (Q35)', async () => {
    // 처음엔 `server.calls.length < 2` 로 썼다가 429 가 한 번만 났다 — calls 는 핸들러가 돌기 **전에**
    // 쌓이므로 첫 요청에서 이미 1 이다. "몇 번째 호출인가"는 직접 세는 편이 오해가 없다.
    let n = 0;
    const server = await startServer((req, res) => {
      if (++n <= 2) return json(res, 429, { error: 'rate limited' }, { 'retry-after': '7' });
      return json(res, 200, { ok: true });
    });
    try {
      const r = await callWithRetry(server.url, {
        shouldRetry: (res) => res.status === 429 || res.status >= 500,
        random: () => 0.5, sleep: async () => {},
      });
      fact('서버가 알려준 대기(초)', 7);
      fact('실제로 기다리기로 한 값(ms)', r.waited);
      assert.deepEqual(r.waited, [7000, 7000]);       // 자기 백오프(150·300)가 아니라 서버 지시를 따랐다
      assert.equal(r.attempts, 3);
    } finally { await server.close(); }

    lesson('상대가 "몇 초 뒤에 오라"고 알려주는데 자기 백오프만 믿으면 쓸데없는 재시도만 반복한다');
  });

  it('9-5. 재시도는 멱등한 요청에만 — POST 를 재시도하면 두 건이 생긴다 (Q35) ★', async () => {
    const created = [];
    const server = await startServer((req, res, { call }) => {
      // 상대는 정상 처리했는데 응답만 못 돌려준 상황을 만든다.
      created.push(JSON.parse(call.body));
      if (created.length === 1) { res.destroy(); return; }   // 커넥션이 끊긴다 = 클라이언트는 실패로 본다
      return json(res, 201, { id: created.length });
    });
    try {
      const r = await callWithRetry(`${server.url}/orders`, {
        shouldRetry: () => false, random: () => 0.5,
        init: { method: 'POST', body: JSON.stringify({ item: 'book' }), headers: { 'content-type': 'application/json' } },
      });
      fact('클라이언트가 본 시도 횟수', r.attempts);
      fact('서버에 실제로 만들어진 주문 수', created.length);
      assert.equal(r.attempts, 2);
      assert.equal(created.length, 2);                // ← 한 번 주문했는데 두 건이 생겼다
    } finally { await server.close(); }

    lesson('"실패했으니 다시 보낸다"가 틀린 이유 — 실패한 것은 응답이지 처리가 아니다');
  });

  it('9-6. Idempotency-Key 를 주면 서버가 중복을 걸러 준다 (Q35) ★', async () => {
    const seen = new Map();     // key -> 저장된 응답
    const created = [];
    const server = await startServer((req, res, { call }) => {
      const key = call.headers['idempotency-key'];
      if (seen.has(key)) return json(res, 200, seen.get(key), { 'x-idempotent-replay': 'true' });
      created.push(JSON.parse(call.body));
      const body = { id: created.length };
      seen.set(key, body);
      if (created.length === 1) { res.destroy(); return; }   // 9-5 와 똑같이 응답만 유실
      return json(res, 201, body);
    });
    try {
      const key = 'order-2026-0001';
      const r = await callWithRetry(`${server.url}/orders`, {
        shouldRetry: () => false, random: () => 0.5,
        init: { method: 'POST', body: JSON.stringify({ item: 'book' }), headers: { 'idempotency-key': key } },
      });
      const body = await r.res.json();
      fact('시도 횟수', r.attempts);
      fact('서버에 만들어진 주문 수', created.length);
      fact('재생된 응답인가', r.res.headers.get('x-idempotent-replay'));
      assert.equal(r.attempts, 2);
      assert.equal(created.length, 1);                // 재시도해도 한 건
      assert.equal(body.id, 1);                       // 그리고 처음 것과 같은 결과를 돌려준다
    } finally { await server.close(); }

    lesson('멱등 키는 "재시도해도 되는 POST" 를 만드는 장치다 — 키를 만드는 쪽은 클라이언트다');
  });

  it('9-7. 재시도 예산이 없으면 전체 대기가 타임아웃보다 길어진다 (Q35)', async () => {
    // 한 번의 타임아웃이 1초여도, 3회 재시도 + 백오프면 총 소요는 그것의 몇 배가 된다.
    const perAttemptTimeout = 1000;
    const waits = [0, 1, 2].map((attempt) => backoff({ attempt, random: () => 1 }));
    const worstCase = perAttemptTimeout * 4 + waits.reduce((a, b) => a + b, 0);

    fact('한 번의 타임아웃(ms)', perAttemptTimeout);
    fact('백오프 대기(ms)', waits);
    fact('최악의 총 소요(ms)', worstCase);
    assert.equal(worstCase, 4000 + 700);
    assert.ok(worstCase > perAttemptTimeout * 4);

    // 그래서 전체 마감(deadline)을 따로 둔다.
    const deadline = 3000;
    const budgeted = [];
    let spent = 0;
    for (let attempt = 0; attempt <= 3; attempt++) {
      if (spent + perAttemptTimeout > deadline) break;
      budgeted.push(attempt);
      spent += perAttemptTimeout + (attempt < 3 ? backoff({ attempt, random: () => 1 }) : 0);
    }
    fact('마감 3초 안에서 실제로 시도한 횟수', budgeted.length);
    assert.equal(budgeted.length, 2);

    lesson('"타임아웃 1초"라고 답하면 되묻는다 — 재시도까지 합친 상한은 몇 초입니까');
  });
});
