// 레슨 6 — 이터레이터·제너레이터·모듈 (면접 Q16 · Q17)
//
// 지연 평가는 시간이 아니라 "호출 횟수"로 잰다(java-tutorial 7-2 와 같은 이유).
// 6-5 의 ESM 라이브 바인딩 대 CJS 값 복사는 픽스처 모듈 두 개를 실제로 불러 확인한다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fact, lesson, nextMacrotask } from './lesson.js';
import { count as esmCount, inc as esmInc } from './fixtures/counter.mjs';

const require = createRequire(import.meta.url);

describe('레슨 6. 이터레이터·제너레이터·모듈', () => {

  it('6-1. 제너레이터는 요청한 만큼만 계산한다 — 무한 수열에서 5개 (Q17) ★', () => {
    let produced = 0;
    function* naturals() { let n = 1; while (true) { produced++; yield n++; } }   // 끝이 없다

    const take = (iter, k) => { const out = []; for (const v of iter) { out.push(v); if (out.length === k) break; } return out; };
    const first5 = take(naturals(), 5);

    fact('꺼낸 값', first5);
    fact('실제로 계산된 개수', produced);
    assert.deepEqual(first5, [1, 2, 3, 4, 5]);
    assert.equal(produced, 5);          // 6번째는 계산조차 안 했다

    lesson('yield 는 "여기서 멈춰 두고 다음에 이어서" — 배열을 다 만들지 않고도 순회할 수 있다');
  });

  it('6-2. Symbol.iterator 만 구현하면 for-of·스프레드·구조 분해가 전부 된다 (Q17)', () => {
    const range = {
      from: 1, to: 4,
      *[Symbol.iterator]() { for (let i = this.from; i <= this.to; i++) yield i; },
    };
    const collected = [];
    for (const x of range) collected.push(x);
    const [first, second, ...rest] = range;

    assert.deepEqual(collected, [1, 2, 3, 4]);
    assert.deepEqual([...range], [1, 2, 3, 4]);
    assert.deepEqual([first, second, rest], [1, 2, [3, 4]]);
    assert.equal(Math.max(...range), 4);

    lesson('"순회 가능"의 정의는 딱 하나 — [Symbol.iterator]() 가 next() 를 가진 객체를 돌려주는 것');
  });

  it('6-3. for-of 에서 break 하면 제너레이터의 finally 가 실행된다 — 리소스 정리 지점 (Q17) ★', () => {
    const log = [];
    function* withResource() {
      log.push('열기');
      try { yield 1; yield 2; yield 3; }
      finally { log.push('닫기'); }        // 소비자가 중간에 나가도 여기를 지난다
    }

    for (const v of withResource()) { log.push(`사용 ${v}`); if (v === 2) break; }
    fact('실행 기록', log);
    assert.deepEqual(log, ['열기', '사용 1', '사용 2', '닫기']);

    // 수동으로 next() 만 부르고 버리면 finally 를 지나지 않는다 — return() 을 불러야 한다
    log.length = 0;
    const g = withResource(); g.next();
    assert.deepEqual(log, ['열기']);      // 아직 안 닫힘
    g.return();
    assert.deepEqual(log, ['열기', '닫기']);

    lesson('for-of 의 break 는 iterator.return() 을 부른다 — 파일 핸들·커서를 제너레이터가 쥐고 있어도 새지 않는다');
  });

  it('6-4. 비동기 제너레이터 + for await — 소비자가 속도를 정한다 (Q17·Q34)', async () => {
    let produced = 0;
    async function* pages() {
      for (let p = 1; p <= 100; p++) { await nextMacrotask(); produced++; yield `page-${p}`; }
    }

    const got = [];
    for await (const page of pages()) {
      got.push(page);
      if (got.length === 3) break;      // 소비자가 그만두면
    }
    fact('소비한 페이지', got);
    fact('생산된 페이지 수', produced);
    assert.equal(produced, 3);          // 생산자도 딱 거기까지만 — 100 페이지를 미리 받아 두지 않았다

    lesson('페이지네이션 API 를 async 제너레이터로 감싸면 "필요한 만큼만 가져오기"가 문법이 된다');
  });

  it('6-5. ESM 의 import 는 라이브 바인딩, CJS 의 require 는 값 복사 (Q16) ★', () => {
    // ESM — 모듈 안에서 count 가 바뀌면 import 한 쪽에서도 바뀐 값이 보인다
    const esmBefore = esmCount;
    esmInc(); esmInc();
    fact('ESM: inc() 두 번 뒤 import 한 count', esmCount);
    assert.equal(esmBefore, 0);
    assert.equal(esmCount, 2);

    // CJS — exports 객체에 담긴 것은 그 순간의 값이다
    const cjs = require('./fixtures/counter.cjs');
    const { count: destructured } = cjs;
    cjs.inc(); cjs.inc();
    fact('CJS: inc() 두 번 뒤 cjs.count / 구조분해 count / get()', [cjs.count, destructured, cjs.get()]);
    assert.equal(cjs.count, 0);          // 모듈 안의 count 는 2 인데 exports.count 는 0 그대로
    assert.equal(destructured, 0);
    assert.equal(cjs.get(), 2);          // 함수를 통해 읽어야 현재 값

    lesson('ESM 은 "변수 자체"를 내보내고 CJS 는 "값"을 내보낸다 — 순환 의존에서 둘의 동작이 갈리는 뿌리');
  });

  it('6-6. 모듈은 한 번만 평가된다 · 네임스페이스는 봉인돼 있다 · 톱레벨 await (Q16)', async () => {
    // 같은 모듈을 다시 import 해도 새로 평가되지 않는다 — 6-5 에서 올린 count 가 그대로 보인다
    const again = await import('./fixtures/counter.mjs');
    assert.equal(again.count, 2);

    // 네임스페이스 객체는 밖에서 못 바꾼다
    assert.throws(() => { again.count = 99; }, TypeError);
    assert.equal(Object.isSealed(again), true);

    // 톱레벨 await — 그 모듈이 준비될 때까지 import 가 기다린다
    const { loadedAt } = await import('./fixtures/tla.mjs');
    assert.equal(loadedAt, '톱레벨 await 완료');

    lesson('모듈 = 싱글턴 — 상태를 모듈 변수에 두면 그 프로세스 전체가 공유한다. 테스트 격리가 깨지는 흔한 원인');
  });
});
