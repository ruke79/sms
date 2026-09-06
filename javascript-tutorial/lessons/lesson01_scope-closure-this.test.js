// 레슨 1 — 스코프·클로저·this (면접 Q1 · Q3 · Q4)
//
// 1-6 의 "bind 는 한 번만 먹는다"와 1-7 의 "메서드를 떼어내면 this 가 사라진다"가
// 실무 사고로 이어지는 지점이다. 나머지는 그 둘을 이해하기 위한 바닥이다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fact, lesson } from './lesson.js';

describe('레슨 1. 스코프·클로저·this', () => {

  it('1-1. var 는 끌어올려져 undefined 로 읽히고, let 은 TDZ 로 막힌다 (Q1)', () => {
    // var: 선언이 함수 맨 위로 끌어올려지고 값은 undefined
    const readVarBeforeDeclaration = () => {
      const seen = typeof hoisted;   // 선언 전인데도 에러가 아니다
      var hoisted = 1;
      return seen;
    };
    assert.equal(readVarBeforeDeclaration(), 'undefined');

    // let: 선언 전 접근은 ReferenceError (Temporal Dead Zone)
    const readLetBeforeDeclaration = () => {
      const seen = blocked;          // eslint-disable-line no-use-before-define
      let blocked = 1;
      return seen;
    };
    assert.throws(readLetBeforeDeclaration, ReferenceError);

    lesson('var 는 "선언 전에도 undefined 로 조용히 읽히는" 게 문제다 — let/const 는 에러로 잡아 준다');
  });

  it('1-2. var 는 함수 스코프, let 은 블록 스코프 (Q1)', () => {
    {
      var leaks = 'var 는 블록을 새어 나온다';
      let stays = 'let 은 블록 안에 남는다';
      assert.equal(stays.length > 0, true);
    }
    assert.equal(leaks, 'var 는 블록을 새어 나온다');
    assert.equal(typeof stays, 'undefined');

    lesson('블록을 벗어난 뒤에도 var 는 살아 있다 — 루프 변수가 밖으로 새는 원인');
  });

  it('1-3. const 는 재대입만 막는다 — 내용은 바뀐다 (Q1) ★', () => {
    const arr = [1, 2];
    arr.push(3);                                  // 통과 — 내용 변경
    assert.deepEqual(arr, [1, 2, 3]);
    assert.throws(() => { arr = []; }, TypeError); // eslint-disable-line no-const-assign

    const frozen = Object.freeze({ nested: { n: 1 } });
    frozen.nested.n = 2;                          // freeze 는 얕다
    assert.equal(frozen.nested.n, 2);

    lesson('const 는 "이 이름이 가리키는 대상을 못 바꾼다"일 뿐이다. 불변이 필요하면 freeze — 그것도 얕다');
  });

  it('1-4. 루프의 var 는 클로저가 전부 같은 변수를 본다, let 은 반복마다 새 변수 (Q1·Q3) ★', () => {
    const withVar = [];
    for (var i = 0; i < 3; i++) withVar.push(() => i);
    const withLet = [];
    for (let j = 0; j < 3; j++) withLet.push(() => j);

    fact('var 로 만든 클로저 3개가 돌려주는 값', withVar.map((f) => f()));
    fact('let 로 만든 클로저 3개가 돌려주는 값', withLet.map((f) => f()));

    assert.deepEqual(withVar.map((f) => f()), [3, 3, 3]);   // 하나의 i 를 공유
    assert.deepEqual(withLet.map((f) => f()), [0, 1, 2]);   // 반복마다 새 j

    lesson('"setTimeout 안에서 i 가 전부 3" 문제의 정체 — 클로저는 값이 아니라 변수를 붙잡는다');
  });

  it('1-5. 클로저로 외부에서 닿을 수 없는 상태를 만든다 (Q3)', () => {
    const makeCounter = () => {
      let count = 0;                 // 이 변수에 닿는 길은 아래 두 함수뿐
      return { inc: () => ++count, get: () => count };
    };
    const a = makeCounter();
    const b = makeCounter();
    a.inc(); a.inc(); b.inc();

    assert.equal(a.get(), 2);
    assert.equal(b.get(), 1);            // 인스턴스마다 별도의 count
    assert.equal('count' in a, false);   // 밖에서는 보이지 않는다

    lesson('모듈 패턴의 뼈대 — 함수가 만들어질 때의 스코프를 함수가 들고 다닌다');
  });

  it('1-6. this 는 호출 방식이 정한다 — 그리고 bind 는 한 번만 먹는다 (Q4) ★', () => {
    function whoAmI() { return this?.name ?? '(없음)'; }
    const alice = { name: 'alice', whoAmI };
    const bob = { name: 'bob' };

    assert.equal(alice.whoAmI(), 'alice');            // 메서드 호출 → 리시버
    assert.equal(whoAmI(), '(없음)');                 // 단독 호출(strict/모듈) → undefined
    assert.equal(whoAmI.call(bob), 'bob');            // call → 지정한 것
    assert.equal(new (function () { this.name = 'new 로 만든 것'; return undefined; })().name,
      'new 로 만든 것');                                // new → 새 인스턴스

    const boundToAlice = whoAmI.bind(alice);
    const reboundToBob = boundToAlice.bind(bob);      // 두 번째 bind 는 무시된다
    fact('bind(alice) 뒤 다시 bind(bob) 한 결과', reboundToBob());
    assert.equal(reboundToBob(), 'alice');
    assert.equal(boundToAlice.call(bob), 'alice');    // call 로도 못 바꾼다

    lesson('bind 된 함수의 this 는 영구 고정이다 — 라이브러리가 넘겨준 콜백을 다시 bind 해도 소용없다');
  });

  it('1-7. 메서드를 떼어내면 this 가 사라진다 — 화살표 함수 필드는 붙어 온다 (Q4) ★', () => {
    class Timer {
      label = 't';
      tickMethod() { return this?.label; }      // 프로토타입 메서드
      tickArrow = () => this.label;             // 인스턴스 필드(화살표) — 정의 시점의 this 고정
    }
    const t = new Timer();
    const detachedMethod = t.tickMethod;        // 떼어냄 — 콜백으로 넘길 때 흔히 일어난다
    const detachedArrow = t.tickArrow;

    assert.equal(detachedMethod(), undefined);  // this 를 잃었다
    assert.equal(detachedArrow(), 't');         // 붙어 있다

    // 대신 화살표 필드는 인스턴스마다 함수가 새로 만들어진다
    const u = new Timer();
    assert.equal(t.tickMethod, u.tickMethod);   // 프로토타입에 하나
    assert.notEqual(t.tickArrow, u.tickArrow);  // 인스턴스마다 하나

    lesson('콜백으로 넘길 메서드는 화살표 필드나 bind 로 — 대가는 인스턴스당 함수 하나');
  });

  it('1-8. 화살표 함수는 자기 this 가 없어 call 로도 못 바꾼다 (Q4)', () => {
    const outer = {
      name: 'outer',
      regular() { return (() => this.name)(); },   // 화살표는 바깥 regular 의 this 를 쓴다
    };
    assert.equal(outer.regular(), 'outer');

    const arrow = () => this;                      // 모듈 최상위의 this 는 undefined
    assert.equal(arrow.call({ name: 'x' }), undefined);

    lesson('화살표는 "this 를 안 만든다"이지 "this 를 바깥에서 가져온다"에 가깝다 — 그래서 메서드 정의에는 안 쓴다');
  });
});
