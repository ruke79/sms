// 레슨 5 — 값·복사·동등성·숫자 (면접 Q2 · Q11 · Q12 · Q14 · Q20)
//
// 전부 결정적인 언어 사양이라 observe 가 없다. 5-4(sort 기본 비교)와 5-7(64비트 정수 손실)이
// 실무 사고로 직결되는 항목이다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fact, lesson } from './lesson.js';

describe('레슨 5. 값 — 복사·비교·숫자', () => {

  it('5-1. == 는 형 변환 뒤 비교한다 — 예외 없이 === (Q2)', () => {
    assert.equal('' == 0, true);          // eslint-disable-line eqeqeq
    assert.equal('0' == false, true);     // eslint-disable-line eqeqeq
    assert.equal(null == undefined, true); // eslint-disable-line eqeqeq
    assert.equal(null == 0, false);        // eslint-disable-line eqeqeq
    assert.equal('' === 0, false);

    // NaN 은 자기 자신과도 다르다 — 검사는 Number.isNaN / Object.is
    assert.equal(NaN === NaN, false);
    assert.equal(Object.is(NaN, NaN), true);
    assert.equal(Object.is(0, -0), false);
    assert.equal(0 === -0, true);

    lesson('== 를 써도 되는 관용구는 "x == null"(null 과 undefined 를 한 번에) 하나뿐이다');
  });

  it('5-2. 스프레드는 얕은 복사 — 안쪽은 공유된다 (Q11) ★', () => {
    const src = { name: 'a', tags: ['x'], meta: { n: 1 } };
    const copy = { ...src };

    copy.name = 'b';           // 1단계는 분리
    copy.tags.push('y');       // 2단계는 공유 — 원본이 바뀐다
    copy.meta.n = 2;

    assert.equal(src.name, 'a');
    assert.deepEqual(src.tags, ['x', 'y']);
    assert.equal(src.meta.n, 2);

    lesson('{...state} 로 "복사했다"고 믿고 안쪽을 건드리면 원본 상태가 오염된다 — React 에서 렌더가 안 되는 이유이기도 하다');
  });

  it('5-3. 깊은 복사 — JSON 왕복은 Date·undefined·Map 에서 깨지고 structuredClone 은 함수에서 막힌다 (Q11) ★', () => {
    const src = { when: new Date(0), missing: undefined, m: new Map([['k', 1]]), n: 1 };

    const viaJson = JSON.parse(JSON.stringify(src));
    fact('JSON 왕복 결과', viaJson);
    assert.equal(typeof viaJson.when, 'string');       // Date → 문자열
    assert.equal('missing' in viaJson, false);          // undefined → 키 자체가 사라짐
    assert.deepEqual(viaJson.m, {});                    // Map → 빈 객체

    const viaClone = structuredClone(src);
    assert.ok(viaClone.when instanceof Date);           // 타입이 살아 있다
    assert.equal('missing' in viaClone, true);
    assert.equal(viaClone.m.get('k'), 1);
    assert.notEqual(viaClone.m, src.m);                 // 진짜 별개

    // 순환 참조: JSON 은 예외, structuredClone 은 처리
    const cyc = { self: null }; cyc.self = cyc;
    assert.throws(() => JSON.stringify(cyc), TypeError);
    assert.equal(structuredClone(cyc).self.self !== undefined, true);

    // 함수는 structuredClone 이 거부한다
    assert.throws(() => structuredClone({ f() {} }), /could not be cloned/);

    lesson('깊은 복사의 기본은 structuredClone — JSON 왕복은 "JSON 으로 표현되는 값"에서만 안전하다');
  });

  it('5-4. sort 의 기본 비교는 문자열이다 — 그리고 원본을 바꾼다 (Q14) ★', () => {
    const nums = [10, 9, 1, 100];
    const sorted = nums.sort();                 // 비교 함수 없음
    fact('[10, 9, 1, 100].sort()', sorted);
    assert.deepEqual(sorted, [1, 10, 100, 9]);  // 사전순
    assert.equal(sorted, nums);                 // 같은 배열 — 원본이 바뀌었다

    const fixed = [10, 9, 1, 100].sort((a, b) => a - b);
    assert.deepEqual(fixed, [1, 9, 10, 100]);

    // ES2023 의 비파괴 판 — 원본은 그대로
    const original = [3, 1, 2];
    const copy = original.toSorted((a, b) => a - b);
    assert.deepEqual(original, [3, 1, 2]);
    assert.deepEqual(copy, [1, 2, 3]);
    assert.deepEqual([1, 2, 3].toReversed(), [3, 2, 1]);

    lesson('숫자 배열의 sort() 는 거의 항상 버그다 — 비교 함수를 쓰고, 원본 보존이 필요하면 toSorted');
  });

  it('5-5. 원본을 바꾸는 메서드와 새 배열을 주는 메서드 (Q14)', () => {
    const a = [1, 2, 3];
    const mutating = { push: a.push(4), splice: a.splice(0, 1), reverse: a.reverse() };
    assert.deepEqual(a, [4, 3, 2]);            // 셋 다 원본을 바꿨다
    assert.equal(mutating.reverse, a);         // reverse 는 원본을 그대로 돌려준다

    const b = [1, 2, 3];
    const results = [b.map((x) => x * 2), b.filter((x) => x > 1), b.slice(1), b.concat([4]), b.with(0, 9)];
    assert.deepEqual(b, [1, 2, 3]);            // 하나도 안 바뀜
    assert.deepEqual(results[4], [9, 2, 3]);

    lesson('외우는 게 아니라 규칙 — 반환값이 새 배열이면 비파괴, 원본이나 잘린 조각이면 파괴');
  });

  it('5-6. ?? 는 0 과 빈 문자열을 살리고 || 는 지운다 (Q12) ★', () => {
    const count = 0, name = '', flag = false;
    assert.equal(count || 10, 10);    // 0 이 "없는 값" 취급 — 버그
    assert.equal(count ?? 10, 0);
    assert.equal(name || '익명', '익명');
    assert.equal(name ?? '익명', '');
    assert.equal(flag ?? true, false);
    assert.equal(null ?? 'x', 'x');
    assert.equal(undefined ?? 'x', 'x');

    // 옵셔널 체이닝과 조합 — 없으면 undefined 로 멈춘다
    const cfg = { db: null };
    assert.equal(cfg.db?.host ?? 'localhost', 'localhost');
    assert.equal(cfg.cache?.ttl, undefined);

    lesson('기본값에는 ?? — "값이 없음"은 null/undefined 둘뿐이고 0·""·false 는 값이다');
  });

  it('5-7. 부동소수점과 정수 한계 — 64비트 ID 는 문자열로 받는다 (Q20) ★', () => {
    assert.equal(0.1 + 0.2 === 0.3, false);
    assert.equal(Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON, true);

    const max = Number.MAX_SAFE_INTEGER;              // 2^53 - 1
    fact('MAX_SAFE_INTEGER', max);
    assert.equal(max + 1 === max + 2, true);          // 여기서부터 구분이 안 된다

    // 서버가 준 64비트 ID — JSON.parse 가 조용히 망가뜨린다
    const json = '{"id": 9007199254740993}';
    const parsed = JSON.parse(json);
    fact('JSON.parse 한 id', parsed.id);
    assert.notEqual(String(parsed.id), '9007199254740993');   // 끝자리가 달라졌다

    const asBigInt = BigInt('9007199254740993');
    assert.equal(asBigInt + 1n, 9007199254740994n);           // BigInt 는 정확
    assert.throws(() => asBigInt + 1, TypeError);             // 다만 Number 와 섞이지 않는다

    lesson('돈 계산은 정수(최소 단위)로, 64비트 ID 는 문자열로 — Number 는 53비트까지만 정직하다');
  });

  it('5-8. typeof 의 배신 — null 은 object, 배열도 object (Q2)', () => {
    assert.equal(typeof null, 'object');
    assert.equal(typeof [], 'object');
    assert.equal(Array.isArray([]), true);
    assert.equal(typeof (() => {}), 'function');
    assert.equal(typeof 10n, 'bigint');
    assert.equal(typeof Symbol(), 'symbol');

    lesson('타입 판정은 typeof 하나로 안 된다 — null 은 === null, 배열은 Array.isArray');
  });
});
