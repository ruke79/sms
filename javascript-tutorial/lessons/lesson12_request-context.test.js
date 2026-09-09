// 레슨 12 — 요청 컨텍스트와 구조화 로그 (면접 Q46 · Q47)
//
// **이 레슨은 Spring 의 Q37·Q48·Q80 과 같은 이야기다.** 저쪽은 `ThreadLocal` 이 스레드를 넘지 못하고,
// 이쪽은 `AsyncLocalStorage` 가 워커를 넘지 못한다. 같은 함정이 언어를 바꿔 다시 나온다.
//
// 판정은 "누구의 로그에 어떤 traceId 가 붙었나" 로 한다. 시간은 재지 않는다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { fact, lesson, nextMacrotask } from './lesson.js';

const als = new AsyncLocalStorage();

/** 컨텍스트에 있으면 traceId 를 자동으로 붙이는 로거. */
function logger(sink) {
  return (level, message, extra = {}) => {
    const ctx = als.getStore();
    sink.push({ level, message, ...(ctx ? { traceId: ctx.traceId } : {}), ...extra });
  };
}

describe('레슨 12. 요청 컨텍스트 — 전역 변수는 왜 섞이나', () => {

  it('12-1. 전역 변수에 요청 정보를 담으면 동시 요청에서 섞인다 (Q46) ★', async () => {
    let currentTrace = null;                       // ← 나쁜 방법
    const logs = [];
    const handle = async (traceId) => {
      currentTrace = traceId;
      await nextMacrotask();                       // I/O 를 기다리는 사이 다른 요청이 들어온다
      logs.push({ req: traceId, logged: currentTrace });
    };

    await Promise.all([handle('A'), handle('B'), handle('C')]);
    fact('요청과 실제로 찍힌 traceId', logs);
    assert.deepEqual(logs.map((l) => l.logged), ['C', 'C', 'C']);   // 전부 마지막 값으로 덮였다
    assert.notEqual(logs[0].req, logs[0].logged);

    lesson('싱글 스레드라 안전할 것 같지만 아니다 — await 사이에 다른 요청이 끼어들어 같은 변수를 덮는다');
  });

  it('12-2. AsyncLocalStorage 는 요청마다 따로 흐른다 (Q46) ★', async () => {
    const logs = [];
    const log = logger(logs);
    const handle = (traceId) => als.run({ traceId }, async () => {
      await nextMacrotask();
      log('info', '처리 완료');
    });

    await Promise.all([handle('A'), handle('B'), handle('C')]);
    fact('찍힌 traceId 들', logs.map((l) => l.traceId));
    assert.deepEqual(logs.map((l) => l.traceId).sort(), ['A', 'B', 'C']);

    lesson('인자로 계속 넘기지 않아도 되고, 그러면서 섞이지도 않는다 — 트레이스 ID 가 이걸로 산다');
  });

  it('12-3. await·setTimeout·이벤트를 건너도 컨텍스트가 유지된다 (Q46)', async () => {
    const logs = [];
    const log = logger(logs);

    await als.run({ traceId: 'deep' }, async () => {
      await nextMacrotask();
      log('info', 'await 뒤');
      await new Promise((r) => setTimeout(r, 0));
      log('info', 'setTimeout 뒤');
      await new Promise((r) => process.nextTick(r));
      log('info', 'nextTick 뒤');
      await Promise.resolve().then(() => log('info', 'microtask 안'));
    });

    fact('전부 같은 traceId 인가', new Set(logs.map((l) => l.traceId)));
    assert.deepEqual([...new Set(logs.map((l) => l.traceId))], ['deep']);
    assert.equal(logs.length, 4);

    lesson('비동기 경계를 넘어도 따라온다 — 그래서 "로그마다 손으로 ID 를 붙인다"를 안 해도 된다');
  });

  it('12-4. 컨텍스트 밖에서 부르면 조용히 없다 (Q46)', () => {
    const logs = [];
    const log = logger(logs);
    log('warn', '컨텍스트 밖');
    fact('컨텍스트 밖 로그', logs[0]);
    assert.equal(logs[0].traceId, undefined);      // 에러가 아니라 그냥 없다

    lesson('없어도 던지지 않으므로 "왜 어떤 로그에만 ID 가 없지" 를 나중에 겪는다 — 진입점에서 반드시 run 으로 감싼다');
  });

  it('12-5. 워커 스레드로는 넘어가지 않는다 — 넘기려면 명시적으로 (Q43·Q46) ★', async () => {
    const workerFile = fileURLToPath(new URL('./fixtures/context-worker.js', import.meta.url));

    const [implicit, explicit] = await als.run({ traceId: 'main-trace' }, async () => {
      const run = (workerData) => new Promise((resolve, reject) => {
        const w = new Worker(workerFile, { workerData });
        w.once('message', resolve); w.once('error', reject);
      });
      return Promise.all([
        run({}),                                   // 아무것도 안 넘긴다
        run({ traceId: als.getStore().traceId }),  // 손으로 넘긴다
      ]);
    });

    fact('워커가 스스로 본 컨텍스트', implicit.seen);
    fact('손으로 넘긴 traceId', explicit.seen);
    assert.equal(implicit.seen, null);             // 워커에는 안 따라간다
    assert.equal(explicit.seen, 'main-trace');

    lesson('Spring 의 @Async 가 ThreadLocal 을 못 넘기는 것과 같다 — 스레드를 바꾸면 명시적 인계가 필요하다');
  });

  it('12-6. 구조화 로그는 검색·집계를 위해서다 — 문자열 연결은 되돌릴 수 없다 (Q46) ★', () => {
    const events = [
      { traceId: 'A', userId: 42, action: 'checkout', ms: 120 },
      { traceId: 'B', userId: 7, action: 'checkout', ms: 980 },
      { traceId: 'C', userId: 42, action: 'login', ms: 30 },
    ];

    const flat = events.map((e) => `[${e.traceId}] user=${e.userId} ${e.action} ${e.ms}ms`);
    const structured = events.map((e) => JSON.stringify(e));

    // "42번 사용자의 checkout 만" 을 뽑는다
    const fromStructured = structured.map(JSON.parse).filter((e) => e.userId === 42 && e.action === 'checkout');
    fact('구조화 로그에서 뽑은 건수', fromStructured.length);
    assert.equal(fromStructured.length, 1);

    // 평문에서는 정규식을 새로 짜야 하고, 형식이 바뀌면 깨진다
    const fromFlat = flat.filter((l) => /user=42\b/.test(l) && l.includes('checkout'));
    fact('평문에서 정규식으로 뽑은 건수', fromFlat.length);
    assert.equal(fromFlat.length, 1);
    assert.equal(/user=42\b/.test('[X] user=421 login 5ms'), false);   // 이 경계 하나를 놓치면 오탐이 난다

    // p95 같은 집계는 구조화 쪽에서만 자연스럽다
    const sorted = structured.map(JSON.parse).map((e) => e.ms).sort((a, b) => a - b);
    fact('지연 중앙값', sorted[Math.floor(sorted.length / 2)]);
    assert.equal(sorted[Math.floor(sorted.length / 2)], 120);

    lesson('로그는 장애 때의 유일한 증거다 — 나중에 재구성할 수 있는 형태로 남기는가로 정한다');
  });

  it('12-7. 개인정보는 애초에 안 넣는다 — 마스킹은 남기기 전에 (Q46)', () => {
    const raw = { userId: 42, email: 'someone@example.com', card: '4111111111111111', action: 'pay' };
    const DENY = new Set(['email', 'card', 'password', 'authorization']);
    const safe = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, DENY.has(k) ? '[redacted]' : v]));

    fact('남기는 로그', safe);
    assert.equal(safe.email, '[redacted]');
    assert.equal(safe.card, '[redacted]');
    assert.equal(safe.userId, 42);                 // 식별자는 남긴다 — 추적이 안 되면 로그가 쓸모없다

    lesson('로그는 오래 보존된다 — 한 번 남기면 회수가 어렵다. 지우는 것보다 안 넣는 것이 싸다');
  });
});
