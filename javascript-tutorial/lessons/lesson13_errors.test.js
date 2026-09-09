// 레슨 13 — 에러 처리의 경계 (면접 Q36 · Q47)
//
// 자바의 Q142·Q143 과 같은 질문이다 — **삼키지 마라, 원인을 인계하라.**
// 다만 자바스크립트에는 자바에 없는 함정이 둘 더 있다. `throw` 할 수 있는 것이 Error 만이 아니고,
// 잡히지 않은 rejection 이 조용히 지나갈 수 있다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fact, lesson } from './lesson.js';

class OrderError extends Error {
  constructor(message, options) { super(message, options); this.name = 'OrderError'; }
}

describe('레슨 13. 에러 — 원인 사슬과 경계', () => {

  it('13-1. cause 를 안 넘기면 진짜 원인이 사라진다 (Q36) ★', async () => {
    const low = () => { throw new TypeError('connect ECONNREFUSED 127.0.0.1:5432'); };

    // 나쁜 판 — 메시지만 바꿔 다시 던진다
    const lost = (() => { try { low(); } catch { return new OrderError('주문 저장 실패'); } })();
    fact('cause 없이 감싼 에러의 원인', lost.cause);
    assert.equal(lost.cause, undefined);          // 무엇 때문인지 영원히 알 수 없다

    // 좋은 판 — cause 로 인계한다
    const kept = (() => { try { low(); } catch (e) { return new OrderError('주문 저장 실패', { cause: e }); } })();
    fact('cause 를 넘긴 에러의 원인', kept.cause);
    assert.ok(kept.cause instanceof TypeError);
    assert.match(kept.cause.message, /ECONNREFUSED/);

    // 사슬을 끝까지 따라가는 것도 한 줄이다
    const chain = [];
    for (let e = kept; e; e = e.cause) chain.push(e.message);
    fact('원인 사슬', chain);
    assert.deepEqual(chain, ['주문 저장 실패', 'connect ECONNREFUSED 127.0.0.1:5432']);

    lesson('Java Q143 과 같다 — 독자 예외를 만들면 원인 예외를 반드시 인계한다');
  });

  it('13-2. Error 가 아닌 것도 던져진다 — catch 는 그걸 가정하면 안 된다 (Q36) ★', async () => {
    const thrown = [];
    for (const bad of [new Error('정상'), 'just a string', { code: 500 }, null, undefined]) {
      try { throw bad; } catch (e) {
        thrown.push({ isError: e instanceof Error, message: e?.message, type: typeof e });
      }
    }
    fact('던져진 것들의 정체', thrown.map((t) => `${t.type}/${t.isError}`));
    assert.deepEqual(thrown.map((t) => t.isError), [true, false, false, false, false]);
    assert.equal(thrown[1].message, undefined);   // e.message 를 그냥 읽으면 undefined 가 로그에 남는다

    // 그래서 경계에서 정규화한다
    const normalize = (e) => (e instanceof Error ? e : new Error(String(e), { cause: e }));
    const fixed = [new Error('정상'), 'just a string', null].map(normalize);
    fact('정규화한 뒤', fixed.map((e) => e.message));
    assert.deepEqual(fixed.map((e) => e.message), ['정상', 'just a string', 'null']);

    lesson('`catch (e) { log(e.message) }` 는 문자열을 던지는 라이브러리 하나로 조용히 빈 로그가 된다');
  });

  it('13-3. finally 의 return 은 원래 에러를 지운다 (Q36) ★', () => {
    // Java Q20 과 정확히 같은 함정이다.
    const swallow = () => { try { throw new Error('진짜 원인'); } finally { return '괜찮음'; } };
    const keep = () => { try { throw new Error('진짜 원인'); } finally { /* 아무것도 반환하지 않는다 */ } };

    fact('finally 에서 return 한 결과', swallow());
    assert.equal(swallow(), '괜찮음');            // 예외가 통째로 사라졌다
    assert.throws(keep, /진짜 원인/);

    lesson('Java Q20 이 자바스크립트에서 그대로 재현된다 — finally 에서는 return 도 throw 도 하지 않는다');
  });

  it('13-4. Promise.any 는 AggregateError 로 전부를 들고 온다 (Q36)', async () => {
    const fail = (m) => Promise.reject(new Error(m));
    const err = await Promise.any([fail('a'), fail('b'), fail('c')]).catch((e) => e);

    fact('에러 종류', err.constructor.name);
    fact('안에 든 원인 수', err.errors.length);
    assert.ok(err instanceof AggregateError);
    assert.deepEqual(err.errors.map((e) => e.message), ['a', 'b', 'c']);

    const ok = await Promise.any([fail('a'), Promise.resolve('살아남음'), fail('c')]);
    assert.equal(ok, '살아남음');

    lesson('여러 후보 중 하나만 되면 되는 경우(다중 리전·다중 미러)에 쓴다 — 실패는 전부 모여 온다');
  });

  it('13-5. async 함수의 에러는 await 하지 않으면 아무도 못 본다 (Q36) ★', async () => {
    const seen = [];
    const failing = async () => { throw new Error('아무도 안 봄'); };

    // (a) 반환값을 버리면 — 이 함수는 정상 종료한 것처럼 보인다
    const caller = () => { failing().catch((e) => seen.push(e.message)); return 'done'; };
    fact('호출자의 반환값', caller());
    assert.equal(caller(), 'done');

    await new Promise((r) => setImmediate(r));
    fact('나중에 도착한 에러', seen);
    assert.equal(seen.length, 2);                 // 호출은 끝났는데 에러는 그 뒤에 온다

    lesson('"에러가 안 나던데요" 의 절반은 이것 — 호출자가 이미 응답을 반환한 뒤에 실패가 도착한다');
  });

  it('13-6. 잡히지 않은 rejection 은 프로세스를 죽인다 — 기본값이 그렇다 (Q36·Q47) ★', () => {
    // node:test 러너가 unhandledRejection 을 가로채므로 자식 프로세스에서 확인한다(레슨 4-5 와 같은 이유).
    const fixture = fileURLToPath(new URL('./fixtures/forgot-await.js', import.meta.url));

    const crashed = spawnSync(process.execPath, [fixture], { encoding: 'utf8' });
    fact('await 를 빠뜨린 프로세스의 종료 코드', crashed.status);
    assert.equal(crashed.status, 1);

    const awaited = spawnSync(process.execPath, [fixture, '--await'], { encoding: 'utf8' });
    fact('await 로 잡은 프로세스의 종료 코드', awaited.status);
    assert.equal(awaited.status, 0);

    lesson('Node 15 부터 기본이 crash 다 — 컨테이너가 재시작하며 원인이 로그 밖으로 밀려나는 장애가 여기서 난다');
  });

  it('13-7. 재시도해도 되는 에러와 아닌 에러를 타입으로 가른다 (Q35·Q36)', () => {
    class Retryable extends Error {}
    class Permanent extends Error {}
    const classify = (status) => (status >= 500 || status === 429 ? new Retryable(`HTTP ${status}`) : new Permanent(`HTTP ${status}`));

    const decisions = [200, 400, 404, 429, 500, 503].map((s) => ({ s, retry: classify(s) instanceof Retryable }));
    fact('상태별 재시도 여부', decisions.map((d) => `${d.s}:${d.retry ? 'Y' : 'N'}`));
    assert.deepEqual(decisions.map((d) => d.retry), [false, false, false, true, true, true]);

    lesson('Java Q143 의 기준과 같다 — "호출하는 쪽이 종류에 따라 처리를 바꾸는가" 가 클래스를 나눌 이유다');
  });
});
