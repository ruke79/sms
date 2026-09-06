// 레슨 3 — 이벤트 루프와 마이크로태스크 (면접 Q6 · Q32)
//
// 실행 "순서"만 단정한다. 순서는 사양이 정해 결정적이다.
// 단, 3-6 의 setTimeout(0) 대 setImmediate 는 메인 모듈에서 순서가 정해져 있지 않다 —
// 그 하나만 observe 로 내리고, I/O 콜백 안에서는 순서가 정해지므로 그쪽만 단정한다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import { fact, observe, lesson, nextMacrotask, blockFor } from './lesson.js';

describe('레슨 3. 이벤트 루프 — 무엇이 먼저 도는가', () => {

  it('3-1. 동기 → 마이크로태스크 전부 → 매크로태스크 하나 (Q6) ★', async () => {
    const order = [];
    setTimeout(() => order.push('setTimeout(0)'), 0);
    Promise.resolve().then(() => order.push('Promise.then'));
    queueMicrotask(() => order.push('queueMicrotask'));
    order.push('동기 코드');

    await nextMacrotask();
    await nextMacrotask();
    fact('실행 순서', order);
    assert.deepEqual(order, ['동기 코드', 'Promise.then', 'queueMicrotask', 'setTimeout(0)']);

    lesson('setTimeout(fn, 0) 보다 Promise 가 먼저 — 콜스택이 비면 마이크로태스크 큐를 비우고 나서야 타이머다');
  });

  it('3-2. 마이크로태스크는 "비워질 때까지" 돈다 — 계속 넣으면 타이머가 굶는다 (Q6) ★', async () => {
    const order = [];
    setTimeout(() => order.push('timer'), 0);

    // 마이크로태스크가 마이크로태스크를 1,000번 연쇄로 넣는다
    let n = 0;
    const chain = () => { if (++n < 1000) Promise.resolve().then(chain); else order.push('micro×1000 끝'); };
    Promise.resolve().then(chain);

    await new Promise((r) => setTimeout(r, 5));
    fact('실행 순서', order);
    assert.deepEqual(order, ['micro×1000 끝', 'timer']);   // 1,000개가 전부 끝나고 나서야 타이머

    lesson('마이크로태스크는 우선순위가 아니라 "선점"이다 — 재귀 then 은 렌더링·타이머를 굶긴다');
  });

  it('3-3. async 함수의 동기 부분은 즉시 실행되고, await 마다 마이크로태스크 하나를 소비한다 (Q6·Q9)', async () => {
    const order = [];
    const f = async () => {
      order.push('async 함수 안 — await 전');
      await null;                       // 여기서 양보
      order.push('async 함수 안 — await 후');
    };
    f();
    order.push('호출자 — f() 다음 줄');
    Promise.resolve().then(() => order.push('별도 then'));

    await nextMacrotask();
    fact('실행 순서', order);
    assert.deepEqual(order, [
      'async 함수 안 — await 전',
      '호출자 — f() 다음 줄',
      'async 함수 안 — await 후',      // f 의 await 가 먼저 큐에 들어갔으므로 별도 then 보다 앞
      '별도 then',
    ]);

    lesson('async 는 "나중에 실행"이 아니다 — 첫 await 까지는 그 자리에서 돈다');
  });

  it('3-4. process.nextTick 은 "매크로태스크에서 출발했을 때" 마이크로태스크보다 먼저다 (Q32 — Node 고유) ★', async () => {
    // 처음에는 이 세 줄을 테스트 본문에 바로 썼고 nextTick 이 먼저일 거라 단정했다가 실패했다.
    // 테스트 본문은 이미 마이크로태스크(Promise 연속) 안에서 돌고 있어서, V8 이 마이크로태스크 큐를
    // 전부 비운 뒤에야 Node 가 nextTick 큐를 처리한다. 그래서 "출발점"을 나눠서 두 번 잰다.
    const schedule = (order) => {
      Promise.resolve().then(() => order.push('Promise.then'));
      process.nextTick(() => order.push('nextTick'));
      queueMicrotask(() => order.push('queueMicrotask'));
    };

    // (a) 매크로태스크(타이머 콜백)에서 출발 — 콜스택이 비면 nextTick 큐 → 마이크로태스크 큐 순
    const fromMacrotask = await new Promise((resolve) => {
      setTimeout(() => { const o = []; schedule(o); setTimeout(() => resolve(o), 0); }, 0);
    });
    fact('매크로태스크에서 출발', fromMacrotask);
    assert.deepEqual(fromMacrotask, ['nextTick', 'Promise.then', 'queueMicrotask']);

    // (b) 마이크로태스크 안에서 출발 — 지금 돌고 있는 마이크로태스크 큐가 먼저 비워진다
    const fromMicrotask = await new Promise((resolve) => {
      Promise.resolve().then(() => { const o = []; schedule(o); setTimeout(() => resolve(o), 0); });
    });
    fact('마이크로태스크 안에서 출발', fromMicrotask);
    assert.deepEqual(fromMicrotask, ['Promise.then', 'queueMicrotask', 'nextTick']);

    lesson('Node 의 nextTick 큐는 마이크로태스크 큐보다 "앞"이지만, 이미 마이크로태스크를 비우는 중이면 그 뒤로 밀린다 — "항상 먼저"는 틀린 말');
  });

  it('3-5. 동기 코드가 도는 동안 타이머는 절대 끼어들지 못한다 (Q6·Q33) ★', async () => {
    let fired = false;
    setTimeout(() => { fired = true; }, 1);

    blockFor(30);                       // 30ms 동안 콜스택을 놓지 않는다
    assert.equal(fired, false);         // 만기가 지났어도 아직 — 스택이 비지 않았으므로 (결정적)

    await nextMacrotask();
    assert.equal(fired, true);          // 스택을 놓자마자 돈다

    lesson('싱글 스레드의 뜻 — CPU 를 쥔 동안은 타이머도 I/O 콜백도 못 돈다. Node 에서 CPU 작업을 워커로 빼는 이유(레슨 8)');
  });

  it('3-6. setTimeout(0) 과 setImmediate — 메인에서는 순서가 정해져 있지 않다, I/O 콜백 안에서는 정해져 있다 (Q32)', async () => {
    // (a) 메인 모듈: 타이머 만기 1ms 가 루프 진입 시점에 지났는지에 달려 있어 비결정적
    const fromMain = await new Promise((resolve) => {
      const seen = [];
      const done = (tag) => { seen.push(tag); if (seen.length === 2) resolve(seen); };
      setTimeout(() => done('timeout'), 0);
      setImmediate(() => done('immediate'));
    });
    observe('메인에서의 순서', fromMain);            // 단정하지 않는다

    // (b) I/O 콜백 안: poll 단계 직후가 check 단계라 setImmediate 가 항상 먼저
    const fromIo = await new Promise((resolve) => {
      fs.readFile(new URL(import.meta.url), () => {
        const seen = [];
        const done = (tag) => { seen.push(tag); if (seen.length === 2) resolve(seen); };
        setTimeout(() => done('timeout'), 0);
        setImmediate(() => done('immediate'));
      });
    });
    fact('I/O 콜백 안에서의 순서', fromIo);
    assert.deepEqual(fromIo, ['immediate', 'timeout']);

    lesson('"어느 쪽이 먼저?"의 정답은 "어디서 호출했느냐에 따라" — 메인에서는 비결정, I/O 콜백 안에서는 immediate');
  });

  it('3-7. await 한 I/O 결과 뒤에 이어지는 코드도 마이크로태스크다 (Q6)', async () => {
    const order = [];
    const p = readFile(new URL(import.meta.url), 'utf8').then(() => order.push('파일 읽기 후'));
    setTimeout(() => order.push('타이머'), 0);
    order.push('동기');
    await p;
    await nextMacrotask();

    // 파일 I/O 완료 시점은 환경에 좌우된다 — "동기가 맨 앞"만 단정한다
    fact('실행 순서', order);
    assert.equal(order[0], '동기');
    assert.equal(order.length, 3);
    observe('I/O 와 타이머 중 먼저 온 쪽', order[1]);

    lesson('I/O 완료 순서는 단정하지 않는다 — 단정할 수 있는 것은 "동기 코드가 전부 먼저"뿐');
  });
});
