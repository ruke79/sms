// 레슨 4 — Promise 와 async/await 의 함정 (면접 Q7 · Q8 · Q9 · Q10)
//
// 병행/직렬은 시간이 아니라 "동시에 떠 있던 최대 개수"로 잰다. 개수는 장비와 무관하게
// 결정적이라 단정할 수 있다(java-tutorial 7-2 가 호출 횟수로 잰 것과 같은 이유).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fact, lesson, nextMacrotask } from './lesson.js';

/** 동시에 떠 있는 작업 수의 최대치를 기록하는 계측기. */
const makeGauge = () => {
  let inFlight = 0, peak = 0;
  return {
    async run(value) {
      inFlight++; peak = Math.max(peak, inFlight);
      await nextMacrotask();                 // 한 바퀴 양보 — 여기서 겹침이 생긴다
      inFlight--;
      return value;
    },
    get peak() { return peak; },
  };
};

describe('레슨 4. Promise — 기다린 척과 진짜 기다림', () => {

  it('4-1. 상태 전이는 한 번뿐이다 — 두 번째 resolve/reject 는 무시된다 (Q7)', async () => {
    const p = new Promise((resolve, reject) => {
      resolve('첫 번째');
      resolve('두 번째');       // 무시
      reject(new Error('셋'));  // 무시
    });
    assert.equal(await p, '첫 번째');

    lesson('pending → fulfilled | rejected, 단방향 한 번. "이미 settle 된 Promise 는 바꿀 수 없다"');
  });

  it('4-2. then 안에서 return 을 빼먹으면 기다리지 않고 지나간다 (Q7) ★', async () => {
    const order = [];
    const slow = () => nextMacrotask().then(() => order.push('느린 작업 끝'));

    // 실수 — return 없음
    await Promise.resolve().then(() => { slow(); }).then(() => order.push('다음 단계'));
    fact('return 없이', order);
    assert.deepEqual(order, ['다음 단계']);          // 느린 작업이 끝나기도 전에 다음 단계

    await nextMacrotask();
    order.length = 0;

    // 제대로 — return
    await Promise.resolve().then(() => slow()).then(() => order.push('다음 단계'));
    fact('return 있이', order);
    assert.deepEqual(order, ['느린 작업 끝', '다음 단계']);

    lesson('then 콜백이 Promise 를 "반환"해야 체인이 그것을 기다린다 — 중괄호 화살표에서 가장 자주 빠진다');
  });

  it('4-3. then 이 Promise 를 반환하면 평탄화된다 — 중첩되지 않는다 (Q7)', async () => {
    const nested = Promise.resolve(1).then((v) => Promise.resolve(v + 1)).then((v) => Promise.resolve(v + 1));
    const result = await nested;
    assert.equal(result, 3);                       // Promise<Promise<number>> 가 아니라 number
    assert.equal(await Promise.resolve(Promise.resolve('안쪽')), '안쪽');

    lesson('Promise 는 Promise 를 담지 않는다 — 항상 풀려서 다음으로 넘어간다');
  });

  it('4-4. catch 로 복구하면 체인은 fulfilled 로 계속된다 (Q7·Q9)', async () => {
    const order = [];
    const v = await Promise.reject(new Error('실패'))
      .then(() => order.push('건너뜀'))          // 실행 안 됨
      .catch((e) => { order.push(`catch: ${e.message}`); return '기본값'; })
      .then((x) => { order.push(`then: ${x}`); return x; });

    assert.deepEqual(order, ['catch: 실패', 'then: 기본값']);
    assert.equal(v, '기본값');

    lesson('catch 는 "예외를 값으로 바꾸는" 자리다 — 바꾸지 않고 그냥 삼키면 아래가 undefined 로 흘러간다');
  });

  it('4-5. await 를 빠뜨린 Promise 는 try/catch 로 잡히지 않는다 → 프로세스가 죽는다 (Q9) ★', async () => {
    // 처음에는 이 프로세스 안에서 process.on("unhandledRejection") 으로 잡으려 했다.
    // 그런데 node:test 러너도 같은 이벤트를 듣고 있어서 테스트를 실패로 판정한다.
    // 그래서 자식 프로세스로 띄우고 "종료 코드"로 본다 — Node 15+ 의 기본 동작(크래시)이 그대로 보인다.
    const fixture = fileURLToPath(new URL('./fixtures/forgot-await.js', import.meta.url));

    const crashed = spawnSync(process.execPath, [fixture], { encoding: 'utf8' });
    fact('await 빠뜨린 프로세스의 종료 코드', crashed.status);
    fact('  stdout (try/catch 가 잡았나?)', crashed.stdout.trim());
    assert.equal(crashed.status, 1);                                   // 죽었다
    assert.match(crashed.stdout, /try\/catch 가 잡은 것: null/);        // try/catch 는 아무것도 못 잡았다
    assert.match(crashed.stderr, /await 안 한 실패/);                   // 이유는 stderr 로

    const survived = spawnSync(process.execPath, [fixture, '--await'], { encoding: 'utf8' });
    fact('await 붙인 프로세스의 종료 코드', survived.status);
    assert.equal(survived.status, 0);
    assert.match(survived.stdout, /try\/catch 가 잡은 것: await 안 한 실패/);

    lesson('async 함수는 예외를 던지지 않고 거부된 Promise 를 "반환"한다 — 받지 않으면 전역으로 새고, Node 15+ 는 기본이 크래시');
  });

  it('4-6. Promise.all 은 하나만 실패해도 즉시 reject — 그러나 나머지는 취소되지 않는다 (Q8) ★', async () => {
    const finished = [];
    const ok = (name, ticks) => (async () => { for (let i = 0; i < ticks; i++) await nextMacrotask(); finished.push(name); return name; })();
    const bad = (async () => { await nextMacrotask(); throw new Error('B 실패'); })();

    await assert.rejects(Promise.all([ok('A', 1), bad, ok('C', 3)]), /B 실패/);
    fact('all 이 reject 된 시점에 끝나 있던 것', [...finished]);
    assert.equal(finished.includes('C'), false);   // C 는 아직 돌고 있다

    for (let i = 0; i < 4; i++) await nextMacrotask();
    fact('그 뒤에도 계속 돌아서 끝난 것', [...finished]);
    assert.equal(finished.includes('C'), true);    // 취소된 게 아니라 결과만 버려졌다

    // allSettled 는 전부 기다리고 성공·실패를 같이 돌려준다
    const settled = await Promise.allSettled([Promise.resolve(1), Promise.reject(new Error('x'))]);
    assert.deepEqual(settled.map((s) => s.status), ['fulfilled', 'rejected']);

    lesson('all 의 reject 는 "먼저 실패한 것을 알려 줄 뿐" — 부수효과가 있는 나머지 작업은 계속된다. 취소하려면 AbortSignal(레슨 7)');
  });

  it('4-7. 루프 안의 await 는 직렬, 먼저 만들어 all 에 넘기면 병행 (Q10) ★', async () => {
    const items = [1, 2, 3, 4, 5];

    const serial = makeGauge();
    const a = [];
    for (const x of items) a.push(await serial.run(x));   // 하나 끝나야 다음을 시작
    fact('for…await — 동시에 떠 있던 최대 개수', serial.peak);
    assert.equal(serial.peak, 1);
    assert.deepEqual(a, items);

    const parallel = makeGauge();
    const b = await Promise.all(items.map((x) => parallel.run(x)));   // 전부 먼저 시작
    fact('Promise.all — 동시에 떠 있던 최대 개수', parallel.peak);
    assert.equal(parallel.peak, 5);
    assert.deepEqual(b, items);

    lesson('await 는 "시작"이 아니라 "기다림"을 직렬화한다 — Promise 를 만든 순간 이미 시작돼 있다');
  });

  it('4-8. 동시 실행 수를 제한한다 — 무제한 병행은 상대를 무너뜨린다 (Q10) ★', async () => {
    const limit = 2;
    const items = Array.from({ length: 7 }, (_, i) => i);
    const gauge = makeGauge();

    // 워커 limit 개가 같은 큐를 나눠 가져가는 가장 단순한 풀
    const queue = [...items];
    const results = new Array(items.length);
    const worker = async () => {
      while (queue.length) {
        const idx = items.length - queue.length;
        const x = queue.shift();
        results[idx] = await gauge.run(x);
      }
    };
    await Promise.all(Array.from({ length: limit }, worker));

    fact('동시에 떠 있던 최대 개수', gauge.peak);
    assert.equal(gauge.peak, limit);
    assert.deepEqual(results, items);

    lesson('Promise.all(전체.map(fetch)) 는 커넥션 상한과 상대 서버를 동시에 때린다 — 풀 크기를 정하는 것이 설계다');
  });

  it('4-9. Promise 생성자 안의 동기 throw 는 reject 가 된다 — 비동기 throw 는 못 잡는다 (Q9)', async () => {
    // 동기 throw → reject 로 변환된다
    await assert.rejects(new Promise(() => { throw new Error('동기 throw'); }), /동기 throw/);

    // 콜백 안(비동기)에서의 throw 는 Promise 가 모른다 → uncaughtException 으로 샌다.
    // 프로세스를 죽이므로 여기서는 재현하지 않고, 대신 "reject 를 직접 불러야 한다"를 보인다.
    await assert.rejects(new Promise((_, reject) => setTimeout(() => reject(new Error('콜백 안 실패')), 0)), /콜백 안 실패/);

    lesson('executor 의 보호 범위는 동기 구간까지다 — 콜백 API 를 감쌀 때는 reject 를 직접 호출한다');
  });
});
