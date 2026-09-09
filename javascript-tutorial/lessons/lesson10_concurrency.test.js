// 레슨 10 — 동시 실행을 제어한다 (면접 Q33 · Q35 · Q48)
//
// `Promise.all` 은 "병렬로 돌린다"가 아니라 **"전부 동시에 쏜다"** 이다. 100건이면 100개가 한꺼번에
// 나간다. 상대 API 도 이쪽 커넥션 풀도 그걸 감당해야 한다.
// 판정은 전부 **동시에 떠 있던 최대 개수**와 **호출 횟수**로 한다 — 시간은 재지 않는다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fact, lesson, nextMacrotask } from './lesson.js';

/** 동시 실행 수를 세는 가짜 작업 생성기. */
function tracker() {
  let inFlight = 0, peak = 0, started = 0;
  return {
    peak: () => peak,
    started: () => started,
    task: (ticks = 1) => async () => {
      started++; inFlight++; peak = Math.max(peak, inFlight);
      for (let i = 0; i < ticks; i++) await nextMacrotask();
      inFlight--;
      return started;
    },
  };
}

/** 동시 실행 상한을 두고 전부 처리한다. 실무의 p-limit 이 하는 일. */
async function withLimit(limit, jobs) {
  const results = new Array(jobs.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= jobs.length) return;
      results[i] = await jobs[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

describe('레슨 10. 동시 실행 제어 — 폭주를 막는 법', () => {

  it('10-1. Promise.all 은 병렬이 아니라 "전부 동시에" 다 (Q33·Q35) ★', async () => {
    const t = tracker();
    const jobs = Array.from({ length: 50 }, () => t.task(2));
    await Promise.all(jobs.map((j) => j()));

    fact('작업 수', 50);
    fact('동시에 떠 있던 최대 개수', t.peak());
    assert.equal(t.peak(), 50);        // 상한이 없다

    lesson('목록 길이가 곧 동시 요청 수가 된다 — 사용자 한 명의 요청이 상대 API 에 50건으로 도착한다');
  });

  it('10-2. 상한을 두면 최대 동시 개수만 줄고 총 처리량은 그대로다 (Q35) ★', async () => {
    const t = tracker();
    const jobs = Array.from({ length: 50 }, () => t.task(2));
    const results = await withLimit(5, jobs);

    fact('동시 상한', 5);
    fact('동시에 떠 있던 최대 개수', t.peak());
    fact('처리한 건수', results.length);
    assert.equal(t.peak(), 5);
    assert.equal(t.started(), 50);     // 전부 처리했다
    assert.equal(results.length, 50);

    lesson('"느려지는 것"이 아니라 "한꺼번에 쏟지 않는 것" — 상대의 레이트 리밋과 이쪽 풀을 지킨다');
  });

  it('10-3. 같은 키의 동시 요청을 합치면 원본 호출이 1회로 준다 (Q29·Q35) ★', async () => {
    let originCalls = 0;
    const origin = async (key) => { originCalls++; await nextMacrotask(); return `value:${key}`; };

    // (a) 합치지 않으면 — 같은 키로 10개가 동시에 들어오면 10번 부른다
    originCalls = 0;
    const naive = await Promise.all(Array.from({ length: 10 }, () => origin('user:1')));
    fact('합치지 않았을 때 원본 호출', originCalls);
    assert.equal(originCalls, 10);
    assert.equal(new Set(naive).size, 1);

    // (b) in-flight 를 공유하면 1번
    originCalls = 0;
    const inFlight = new Map();
    const coalesced = (key) => {
      if (inFlight.has(key)) return inFlight.get(key);
      const p = origin(key).finally(() => inFlight.delete(key));
      inFlight.set(key, p);
      return p;
    };
    const merged = await Promise.all(Array.from({ length: 10 }, () => coalesced('user:1')));
    fact('합쳤을 때 원본 호출', originCalls);
    assert.equal(originCalls, 1);
    assert.deepEqual(new Set(merged), new Set(['value:user:1']));

    lesson('캐시가 비었을 때 몰리는 동시 요청을 막는 가장 싼 방법 — 결과가 아니라 "진행 중인 약속"을 공유한다');
  });

  it('10-4. Promise.all 은 첫 실패에서 나머지 결과를 버린다 — allSettled 는 수확한다 (Q36) ★', async () => {
    const jobs = [
      async () => 'a',
      async () => { throw new Error('b 실패'); },
      async () => 'c',
    ];

    const allErr = await Promise.all(jobs.map((j) => j())).catch((e) => e);
    fact('Promise.all 의 결과', allErr);
    assert.ok(allErr instanceof Error);          // a 와 c 의 성공은 손에 남지 않는다

    const settled = await Promise.allSettled(jobs.map((j) => j()));
    const ok = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const failed = settled.filter((r) => r.status === 'rejected').map((r) => r.reason.message);
    fact('allSettled — 성공', ok);
    fact('allSettled — 실패', failed);
    assert.deepEqual(ok, ['a', 'c']);
    assert.deepEqual(failed, ['b 실패']);

    lesson('부분 실패를 "일부는 됐다"로 보고해야 하는 배치에서는 all 이 아니라 allSettled 다');
  });

  it('10-5. 취소 신호를 확인하지 않으면 이미 시작한 작업은 계속 돈다 (Q35)', async () => {
    const ac = new AbortController();
    const done = [];

    // (a) 신호를 보지 않는 워커 — 취소해도 남은 일을 다 한다
    const ignoring = withLimit(2, Array.from({ length: 6 }, (_, i) => async () => {
      await nextMacrotask(); done.push(`ignore:${i}`);
    }));
    ac.abort();
    await ignoring;
    fact('취소를 무시한 워커가 끝낸 작업', done.length);
    assert.equal(done.length, 6);

    // (b) 매 작업 앞에서 신호를 보는 워커
    const ac2 = new AbortController();
    const done2 = [];
    const respecting = withLimit(2, Array.from({ length: 6 }, (_, i) => async () => {
      if (ac2.signal.aborted) return;
      await nextMacrotask(); done2.push(`respect:${i}`);
    }));
    ac2.abort();
    await respecting;
    fact('취소를 확인한 워커가 끝낸 작업', done2.length);
    // 처음엔 0 이라고 단정했다가 2 로 실패했다. `withLimit` 이 워커를 만드는 순간 async 함수 본문이
    // **첫 await 까지 동기로** 달리므로, abort() 를 부르기 전에 이미 상한(2)만큼이 검사를 지나가 있다.
    // 취소가 막는 것은 "아직 시작하지 않은 것"뿐이라는 뜻이고, 이게 실무의 실제 모습이다.
    assert.equal(done2.length, 2);               // 이미 출발한 2개는 끝나고, 나머지 4개는 시작조차 안 했다
    assert.deepEqual(done2, ['respect:0', 'respect:1']);

    lesson('AbortController 는 신호일 뿐이다 — 확인하는 코드가 없으면 아무것도 취소되지 않는다');
    lesson('확인해도 이미 출발한 작업은 끝난다 — "취소했다"와 "부수효과가 없다"는 다른 말이다');
  });

  it('10-6. 큐가 무제한이면 대기열만 자란다 — 상한과 거부가 세트다 (Q33)', async () => {
    const t = tracker();
    const accepted = [], rejected = [];
    const maxQueue = 10;
    let queued = 0;

    const submit = (job) => {
      if (queued >= maxQueue) { rejected.push('거부'); return null; }
      queued++;
      return job().finally(() => queued--);
    };

    const jobs = Array.from({ length: 30 }, () => t.task(1));
    for (const j of jobs) { const p = submit(j); if (p) accepted.push(p); }
    await Promise.all(accepted);

    fact('제출한 작업', 30);
    fact('받은 작업', accepted.length);
    fact('거부한 작업', rejected.length);
    assert.equal(accepted.length, maxQueue);
    assert.equal(rejected.length, 20);

    lesson('스레드풀 Q72 와 같은 이야기다 — 큐에 상한이 없으면 메모리가 상한이 된다');
  });

  it('10-7. 순차 처리는 상대를 지키지만 실패 하나가 뒤를 전부 막는다 (Q35)', async () => {
    const processed = [];
    const items = [1, 2, 3, 4, 5];
    const handle = async (n) => { if (n === 3) throw new Error('3 에서 실패'); processed.push(n); };

    const err = await (async () => { for (const n of items) await handle(n); })().catch((e) => e);
    fact('순차 처리에서 끝난 건수', processed.length);
    fact('멈춘 이유', err);
    assert.deepEqual(processed, [1, 2]);         // 4·5 는 시도조차 못 했다

    processed.length = 0;
    const settled = await Promise.allSettled(items.map(handle));
    fact('allSettled 로 돌렸을 때 끝난 건수', processed.length);
    assert.equal(processed.length, 4);           // 3 만 빼고 전부

    lesson('Kafka Q15 의 "독 메시지" 와 같다 — 한 건의 실패가 뒤를 막을지 말지를 정해 두어야 한다');
  });
});
