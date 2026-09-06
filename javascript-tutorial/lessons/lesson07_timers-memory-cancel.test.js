// 레슨 7 — 타이머·메모리·취소 (면접 Q18 · Q19 · Q8)
//
// 디바운스/스로틀은 node:test 의 가짜 타이머로 시간을 "돌려서" 단정한다 — 실제 시간을 재지 않는다.
// GC 는 --expose-gc 로 강제해도 "회수됐다"를 사양이 보장하지 않으므로 7-4·7-5 는 observe 다.
// 단정하는 것은 그 반대 — "강하게 잡고 있으면 절대 회수되지 않는다"뿐이다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { fact, observe, lesson, nextMacrotask } from './lesson.js';

const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const throttle = (fn, ms) => { let last = -Infinity; return (...a) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...a); } }; };

describe('레슨 7. 타이머·메모리·취소', () => {

  it('7-1. 디바운스 — 마지막 호출 뒤 일정 시간이 지나야 "한 번" (Q18) ★', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });   // 가짜 시계
    const calls = [];
    const save = debounce((v) => calls.push(v), 100);

    save('a'); t.mock.timers.tick(50);
    save('b'); t.mock.timers.tick(50);
    save('c');                                        // 100ms 안에 세 번 — 앞의 둘은 취소된다
    t.mock.timers.tick(99);
    assert.deepEqual(calls, []);                      // 아직
    t.mock.timers.tick(1);
    fact('150ms 동안 3번 입력 → 실제 호출', calls);
    assert.deepEqual(calls, ['c']);                   // 마지막 것만, 한 번

    lesson('검색창 자동완성 — 타이핑이 "멈춘 뒤" 한 번만 보낸다. 입력 도중에는 영원히 안 나간다');
  });

  it('7-2. 스로틀 — 일정 간격에 최대 한 번, 첫 호출은 즉시 (Q18) ★', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });         // Date.now 를 가짜로
    const calls = [];
    const onScroll = throttle((v) => calls.push(v), 100);

    onScroll('t0');                                   // 즉시
    t.mock.timers.tick(30); onScroll('t30');          // 버려짐
    t.mock.timers.tick(30); onScroll('t60');          // 버려짐
    t.mock.timers.tick(40); onScroll('t100');         // 100ms 경과 — 통과
    t.mock.timers.tick(10); onScroll('t110');         // 버려짐
    fact('110ms 동안 5번 입력 → 실제 호출', calls);
    assert.deepEqual(calls, ['t0', 't100']);

    lesson('스크롤·리사이즈 — 계속 들어와도 "간격당 한 번"은 반드시 나간다. 디바운스와 반대 성질');
  });

  it('7-3. 해제하지 않은 리스너는 쌓인다 — AbortSignal 로 한꺼번에 떼는 법 (Q19) ★', () => {
    // (a) 매 "렌더"마다 등록만 하고 해제하지 않는 흔한 실수
    const bus = new EventEmitter();
    const render = () => bus.on('tick', () => {});
    for (let i = 0; i < 5; i++) render();
    fact('5번 렌더 뒤 리스너 수', bus.listenerCount('tick'));
    assert.equal(bus.listenerCount('tick'), 5);        // 컴포넌트는 하나인데 리스너는 다섯

    // (b) 해제를 짝으로 — off
    const handler = () => {};
    bus.on('tick', handler); bus.off('tick', handler);
    assert.equal(bus.listenerCount('tick'), 5);        // 늘지 않았다

    // (c) EventTarget + AbortSignal — 신호 하나로 여러 리스너를 한 번에 정리 (브라우저와 같은 API)
    const target = new EventTarget();
    const ac = new AbortController();
    let fired = 0;
    target.addEventListener('ping', () => fired++, { signal: ac.signal });
    target.addEventListener('pong', () => fired++, { signal: ac.signal });
    target.dispatchEvent(new Event('ping'));
    ac.abort();                                        // 두 리스너가 동시에 떨어진다
    target.dispatchEvent(new Event('ping'));
    target.dispatchEvent(new Event('pong'));
    assert.equal(fired, 1);

    lesson('리스너 누수의 처방은 "등록 시점에 해제 방법을 같이 만든다" — cleanup 함수 반환이나 AbortSignal');
  });

  it('7-4. WeakMap·WeakRef 는 키를 붙잡지 않는다 — 단, "회수됐다"는 단정하지 않는다 (Q19)', async () => {
    const strong = new Map();
    const weak = new WeakMap();
    let ref;
    {
      let obj = { big: new Array(1e5).fill(0) };
      strong.set('k', obj);
      weak.set(obj, 'meta');
      ref = new WeakRef(obj);
      obj = null;                                      // 이제 obj 에 닿는 강한 참조는 strong 뿐
    }

    globalThis.gc(); await nextMacrotask();
    assert.notEqual(ref.deref(), undefined);           // 단정: Map 이 잡고 있는 한 절대 회수되지 않는다

    strong.clear();                                    // 마지막 강한 참조를 끊는다
    globalThis.gc(); await nextMacrotask(); globalThis.gc();
    observe('강한 참조를 끊고 gc() 뒤 WeakRef.deref()', ref.deref() === undefined ? 'undefined (회수됨)' : '아직 살아 있음');
    // ↑ 대부분 undefined 가 나오지만, GC 시점은 엔진이 정한다 — 사양은 "언젠가"만 약속한다

    lesson('WeakMap 은 "이 객체가 살아 있는 동안만 메타데이터를 붙여 둔다" — 캐시 키로 DOM 노드를 쓸 때의 정답');
  });

  it('7-5. FinalizationRegistry 콜백은 언제 올지 모른다 — 정리 로직을 여기에 걸지 않는다 (Q19)', async () => {
    const collected = [];
    const registry = new FinalizationRegistry((tag) => collected.push(tag));
    (() => { registry.register({ tmp: true }, '임시 객체'); })();

    globalThis.gc(); await sleep(20); globalThis.gc(); await sleep(20);
    observe('gc() 두 번 + 40ms 뒤 도착한 finalization 콜백', collected);

    lesson('파일 닫기·소켓 해제를 GC 에 기대면 안 된다 — try/finally 나 명시적 close 가 답. 이 콜백은 "안 올 수도" 있다');
  });

  it('7-6. AbortController — 취소를 "신호"로 전파해 Promise.all 의 살아남은 작업을 멈춘다 (Q8·Q10) ★', async () => {
    // 취소 가능한 작업 — 신호가 오면 즉시 거부한다
    const task = (name, ticks, log, signal) => new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      let i = 0;
      const step = () => {
        if (signal.aborted) return reject(signal.reason);
        if (++i === ticks) { log.push(`${name} 완료`); return resolve(name); }
        setTimeout(step, 0);
      };
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      setTimeout(step, 0);
    });

    // (a) 레슨 4-6 의 상황 — B 가 실패해도 C 는 끝까지 돈다
    const noCancel = [];
    const idle = new AbortController();
    await assert.rejects(Promise.all([task('A', 1, noCancel, idle.signal), Promise.reject(new Error('B 실패')), task('C', 4, noCancel, idle.signal)]));
    for (let i = 0; i < 6; i++) await nextMacrotask();
    fact('취소 신호 없이 — 끝까지 돈 작업', noCancel);
    assert.ok(noCancel.includes('C 완료'));

    // (b) 실패하면 abort() — 나머지가 멈춘다
    const cancel = [];
    const ac = new AbortController();
    const all = Promise.all([task('A', 1, cancel, ac.signal), Promise.reject(new Error('B 실패')), task('C', 4, cancel, ac.signal)]);
    all.catch(() => ac.abort(new Error('동료가 실패해서 취소')));
    await assert.rejects(all, /B 실패/);
    for (let i = 0; i < 6; i++) await nextMacrotask();
    fact('취소 신호 있이 — 끝까지 돈 작업', cancel);
    assert.equal(cancel.includes('C 완료'), false);   // C 는 중간에 멈췄다

    // (c) AbortSignal.timeout / any — 타임아웃과 사용자 취소를 하나로 합친다
    const combined = AbortSignal.any([AbortSignal.timeout(10_000), ac.signal]);
    assert.equal(combined.aborted, true);            // ac 가 이미 abort 됐으므로
    assert.match(combined.reason.message, /취소/);

    lesson('Promise 는 취소가 없다 — 취소는 AbortSignal 을 "같이 넘겨서" 작업이 스스로 멈추게 하는 협력 프로토콜이다. fetch 도 같은 인자를 받는다');
  });
});
