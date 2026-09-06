// 레슨 2 — 프로토타입·클래스·프로토타입 오염 (면접 Q5 · Q15 · Q38)
//
// 2-5 의 프로토타입 오염이 이 레슨의 핵심이다. "재귀 병합 유틸 하나가 전역을 오염시킨다"를
// 실제로 재현하고, 되돌린다. Object.create(null) 과 Map 이 왜 안전한지도 같은 코드로 본다.
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fact, lesson } from './lesson.js';

describe('레슨 2. 프로토타입 — class 의 속과 오염', () => {

  it('2-1. class 는 프로토타입의 문법 설탕이다 (Q5)', () => {
    class Animal { speak() { return '...'; } }
    class Dog extends Animal { speak() { return '멍'; } }
    const d = new Dog();

    assert.equal(typeof Dog, 'function');                                 // 클래스는 함수
    assert.equal(Object.getPrototypeOf(d), Dog.prototype);
    assert.equal(Object.getPrototypeOf(Dog.prototype), Animal.prototype); // 체인
    assert.equal(Object.getPrototypeOf(Animal.prototype), Object.prototype);
    assert.equal(Object.getPrototypeOf(Object.prototype), null);          // 끝

    // 인스턴스에는 메서드가 없다 — 프로토타입에 있고 체인을 타고 찾는다
    assert.equal(Object.hasOwn(d, 'speak'), false);
    assert.equal('speak' in d, true);

    lesson('new 가 하는 일 = 빈 객체를 만들고 [[Prototype]] 을 Class.prototype 에 연결하는 것');
  });

  it('2-2. 인스턴스 속성은 프로토타입 속성을 가린다 — 지우면 다시 보인다 (Q5)', () => {
    const proto = { greeting: 'proto' };
    const obj = Object.create(proto);
    assert.equal(obj.greeting, 'proto');       // 체인에서 찾음

    obj.greeting = 'own';                      // 프로토타입을 바꾸는 게 아니라 자기 속성이 생긴다
    assert.equal(obj.greeting, 'own');
    assert.equal(proto.greeting, 'proto');

    delete obj.greeting;                       // 자기 속성을 지우면
    assert.equal(obj.greeting, 'proto');       // 다시 프로토타입 것이 보인다

    lesson('읽기는 체인을 타지만 쓰기는 항상 자기 자신에게 — 이 비대칭이 shadowing 이다');
  });

  it('2-3. hasOwn 과 in 과 for-in 은 다른 것을 본다 (Q5)', () => {
    const proto = { inherited: 1 };
    const obj = Object.create(proto);
    obj.own = 2;

    assert.equal(Object.hasOwn(obj, 'own'), true);
    assert.equal(Object.hasOwn(obj, 'inherited'), false);
    assert.equal('inherited' in obj, true);                 // in 은 체인까지

    const forIn = [];
    for (const k in obj) forIn.push(k);                     // for-in 은 열거 가능한 상속 키까지
    assert.deepEqual(forIn, ['own', 'inherited']);
    assert.deepEqual(Object.keys(obj), ['own']);            // keys 는 자기 것만

    lesson('객체를 순회할 때는 Object.keys/entries — for-in 은 프로토타입까지 긁어 온다');
  });

  it('2-4. 평범한 객체를 사전으로 쓰면 "constructor" 키에서 사고가 난다 (Q15) ★', () => {
    const asDict = {};
    const asMap = new Map();
    const asNullProto = Object.create(null);

    // 사용자 입력이 "constructor" 였다고 하자
    const key = 'constructor';
    assert.equal(key in asDict, true);                 // 넣은 적 없는데 있다고 나온다
    assert.equal(typeof asDict[key], 'function');      // Object 생성자가 나온다
    assert.equal(asMap.has(key), false);               // Map 은 정직하다
    assert.equal(key in asNullProto, false);           // 프로토타입이 없는 객체도 정직하다

    fact('{}["constructor"] 의 정체', asDict[key].name);

    lesson('키가 외부에서 오는 사전은 Map 이나 Object.create(null) — {} 는 Object.prototype 의 키를 전부 갖고 태어난다');
  });

  describe('2-5. 프로토타입 오염 (Q38)', () => {
    afterEach(() => { delete Object.prototype.isAdmin; });   // 오염을 반드시 되돌린다

    it('2-5a. 순진한 재귀 병합은 __proto__ 를 타고 전역을 오염시킨다 ★', () => {
      // 흔히 보이는 deepMerge — 키를 검사하지 않는다
      const naiveMerge = (target, src) => {
        for (const k of Object.keys(src)) {
          if (src[k] && typeof src[k] === 'object') {
            target[k] ??= {};
            naiveMerge(target[k], src[k]);
          } else {
            target[k] = src[k];
          }
        }
        return target;
      };

      const payload = JSON.parse('{"__proto__": {"isAdmin": true}}');
      // JSON.parse 자체는 안전하다 — "__proto__" 가 자기 속성으로 들어올 뿐
      assert.equal(Object.hasOwn(payload, '__proto__'), true);
      assert.equal(({}).isAdmin, undefined);

      naiveMerge({}, payload);        // 여기서 target["__proto__"] 가 setter 로 동작한다

      const victim = {};              // 이 요청과 아무 상관 없는 객체가
      fact('오염 뒤 새로 만든 {} 의 isAdmin', victim.isAdmin);
      assert.equal(victim.isAdmin, true);   // 관리자가 됐다

      lesson('오염의 경로는 "target[k] 에 k=__proto__ 로 대입" — 병합 유틸은 __proto__/constructor/prototype 키를 거른다');
    });

    it('2-5b. Object.create(null) 과 Map 은 같은 입력에도 오염되지 않는다', () => {
      const safeMerge = (target, src) => {
        for (const k of Object.keys(src)) {
          if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;   // 거른다
          target[k] = src[k];
        }
        return target;
      };
      const payload = JSON.parse('{"__proto__": {"isAdmin": true}, "name": "x"}');

      const merged = safeMerge(Object.create(null), payload);
      assert.equal(merged.name, 'x');
      assert.equal(({}).isAdmin, undefined);                  // 오염 없음

      const m = new Map(Object.entries(payload));            // Map 은 키가 문자열일 뿐
      assert.equal(m.has('__proto__'), true);
      assert.equal(({}).isAdmin, undefined);

      lesson('Map 에서 "__proto__" 는 그냥 문자열 키다 — 사전 용도로 Map 을 권하는 진짜 이유');
    });
  });

  it('2-6. Object.freeze 는 얕고, 깊게 얼리려면 재귀가 필요하다 (Q11)', () => {
    const deepFreeze = (o) => {
      for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v);
      return Object.freeze(o);
    };
    const shallow = Object.freeze({ inner: { n: 1 } });
    const deep = deepFreeze({ inner: { n: 1 } });

    shallow.inner.n = 2;                                        // 통과
    assert.equal(shallow.inner.n, 2);
    assert.throws(() => { 'use strict'; deep.inner.n = 2; }, TypeError);   // 모듈은 strict — 예외
    assert.equal(deep.inner.n, 1);

    lesson('freeze 한 객체를 "불변"이라고 부르려면 안쪽까지 얼렸는지 봐야 한다');
  });
});
