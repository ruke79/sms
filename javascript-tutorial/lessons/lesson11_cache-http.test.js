// 레슨 11 — 캐시와 HTTP 캐시 (면접 Q29 · Q48)
//
// 캐시는 "빨라진다"보다 **"틀린 값을 언제까지 보여도 되는가"** 를 정하는 일이다.
// 여기서는 상한 없는 캐시가 누수가 되는 것, TTL 이 끊긴 순간 몰리는 것, 그리고 ETag 로
// 본문을 아끼는 것을 전부 실행해서 확인한다. 타이머는 가짜 시계로 돌려 결정적으로 만든다.
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, json } from './testserver.js';
import { createHash } from 'node:crypto';
import { fact, lesson, nextMacrotask } from './lesson.js';

/** 상한과 TTL 이 있는 최소 LRU. now 를 주입받아 시계를 테스트가 쥔다. */
function lruCache({ max, ttl, now = () => Date.now() }) {
  const map = new Map();                       // Map 은 삽입 순서를 보장한다 = LRU 의 뼈대
  return {
    get size() { return map.size; },
    keys: () => [...map.keys()],
    get(key) {
      const e = map.get(key);
      if (!e) return undefined;
      if (ttl && now() - e.at >= ttl) { map.delete(key); return undefined; }
      map.delete(key); map.set(key, e);        // 다시 넣어 "최근 사용"으로 올린다
      return e.value;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      map.set(key, { value, at: now() });
      if (max && map.size > max) map.delete(map.keys().next().value);   // 가장 오래된 것을 버린다
    },
  };
}

describe('레슨 11. 캐시 — 상한·TTL·스탬피드·ETag', () => {

  it('11-1. 상한 없는 캐시는 기능이 아니라 메모리 누수다 (Q29) ★', () => {
    const unbounded = new Map();
    for (let i = 0; i < 10000; i++) unbounded.set(`key:${i}`, `v${i}`);
    fact('상한 없는 캐시의 항목 수', unbounded.size);
    assert.equal(unbounded.size, 10000);       // 지우는 코드가 없으면 계속 자란다

    const bounded = lruCache({ max: 100 });
    for (let i = 0; i < 10000; i++) bounded.set(`key:${i}`, `v${i}`);
    fact('상한 100 인 캐시의 항목 수', bounded.size);
    assert.equal(bounded.size, 100);
    assert.equal(bounded.get('key:0'), undefined);      // 오래된 것은 밀려났다
    assert.equal(bounded.get('key:9999'), 'v9999');

    lesson('Java Q96 의 "상한 없는 캐시" 와 같은 항목이다 — 언어가 달라도 누수의 형태는 같다');
  });

  it('11-2. LRU 는 "최근 읽은 것"을 살린다 — 읽기만 해도 순서가 바뀐다 (Q29)', () => {
    const c = lruCache({ max: 3 });
    c.set('a', 1); c.set('b', 2); c.set('c', 3);
    assert.equal(c.get('a'), 1);               // a 를 읽어 최근으로 올린다
    c.set('d', 4);                             // 하나 밀어내야 한다

    fact('남아 있는 키', c.keys());
    assert.deepEqual(c.keys(), ['c', 'a', 'd']);
    assert.equal(c.get('b'), undefined);       // 읽히지 않은 b 가 밀려났다

    lesson('LRU 를 Map 으로 만들 수 있는 이유 — Map 은 삽입 순서를 보장하고, 지웠다 다시 넣으면 맨 뒤로 간다');
  });

  it('11-3. TTL 은 시계를 주입해야 결정적으로 검증된다 (Q29)', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });
    const c = lruCache({ max: 10, ttl: 1000 });
    c.set('k', 'v');
    assert.equal(c.get('k'), 'v');

    t.mock.timers.tick(999);
    assert.equal(c.get('k'), 'v');             // 아직 살아 있다
    t.mock.timers.tick(1);
    fact('TTL 1000ms 를 넘긴 뒤의 값', c.get('k'));
    assert.equal(c.get('k'), undefined);

    lesson('"1초 뒤에 만료되더라"를 sleep 으로 확인하면 느리고 흔들린다 — 시계를 쥐면 즉시 결정적이다');
  });

  it('11-4. 캐시 스탬피드 — TTL 이 끊긴 순간 전부가 원본으로 몰린다 (Q29) ★', async () => {
    let originCalls = 0;
    const origin = async () => { originCalls++; await nextMacrotask(); return 'value'; };

    // (a) 순진한 read-through — 미스가 겹치면 그 수만큼 원본을 부른다
    const naive = new Map();
    const readThrough = async (key) => {
      if (naive.has(key)) return naive.get(key);
      const v = await origin();
      naive.set(key, v);
      return v;
    };
    await Promise.all(Array.from({ length: 20 }, () => readThrough('hot')));
    fact('동시 미스 20건 — 원본 호출', originCalls);
    assert.equal(originCalls, 20);             // 캐시가 있는데도 20번 갔다

    // (b) 진행 중인 약속을 캐시에 넣으면 1번
    originCalls = 0;
    const promises = new Map();
    const single = (key) => {
      if (!promises.has(key)) promises.set(key, origin());
      return promises.get(key);
    };
    await Promise.all(Array.from({ length: 20 }, () => single('hot')));
    fact('약속을 공유했을 때 원본 호출', originCalls);
    assert.equal(originCalls, 1);

    lesson('값이 아니라 **진행 중인 Promise** 를 캐시에 넣는다 — 이것만으로 스탬피드의 대부분이 사라진다');
  });

  it('11-5. 실패까지 캐시하면 장애가 TTL 만큼 늘어붙는다 (Q29·Q36)', async () => {
    let calls = 0;
    const flaky = async () => { calls++; if (calls === 1) throw new Error('일시 장애'); return 'ok'; };

    // 나쁜 판: 실패한 Promise 를 그대로 남겨 둔다
    const bad = new Map();
    const badGet = (k) => { if (!bad.has(k)) bad.set(k, flaky()); return bad.get(k); };
    await badGet('k').catch(() => {});
    const second = await badGet('k').catch((e) => e.message);
    fact('실패를 캐시했을 때 두 번째 결과', second);
    assert.equal(second, '일시 장애');          // 원본은 이미 나았는데 캐시가 장애를 기억한다

    // 좋은 판: 실패하면 지운다
    calls = 0;
    const good = new Map();
    const goodGet = (k) => {
      if (!good.has(k)) good.set(k, flaky().catch((e) => { good.delete(k); throw e; }));
      return good.get(k);
    };
    await goodGet('k').catch(() => {});
    fact('실패를 지웠을 때 두 번째 결과', await goodGet('k'));
    assert.equal(await goodGet('k'), 'ok');

    lesson('성공만 캐시한다 — 실패를 캐시하면 복구된 뒤에도 한동안 장애가 이어진다');
  });

  it('11-6. ETag/304 는 본문을 안 보낸다 — "캐시했다"의 실제 이득 (Q29) ★', async () => {
    const body = JSON.stringify({ items: Array.from({ length: 100 }, (_, i) => i) });
    const etag = `"${createHash('sha1').update(body).digest('hex').slice(0, 16)}"`;
    let bodiesSent = 0;

    const server = await startServer((req, res, { call }) => {
      if (call.headers['if-none-match'] === etag) { res.writeHead(304, { etag }); return; }
      bodiesSent++;
      res.writeHead(200, { etag, 'content-type': 'application/json' });
      res.end(body);
    });
    try {
      const first = await fetch(server.url);
      const got = await first.text();
      const tag = first.headers.get('etag');
      fact('첫 요청 상태', first.status);
      assert.equal(first.status, 200);
      assert.equal(got.length, body.length);

      const second = await fetch(server.url, { headers: { 'if-none-match': tag } });
      const secondBody = await second.text();
      fact('두 번째 요청 상태', second.status);
      fact('두 번째 응답 본문 길이', secondBody.length);
      fact('서버가 본문을 보낸 횟수', bodiesSent);
      assert.equal(second.status, 304);
      assert.equal(secondBody.length, 0);      // 본문이 아예 안 왔다
      assert.equal(bodiesSent, 1);
    } finally { await server.close(); }

    lesson('304 도 왕복은 한다 — 아끼는 것은 대역폭과 직렬화이지 지연이 아니다. 지연까지 없애려면 max-age');
  });

  it('11-7. Cache-Control 을 안 주면 캐시할지 말지를 중간 계층이 추측한다 (Q29)', async () => {
    const server = await startServer((req, res) => {
      if (req.url === '/private') return json(res, 200, { balance: 1000 }, { 'cache-control': 'private, no-store' });
      if (req.url === '/static') return json(res, 200, { v: 1 }, { 'cache-control': 'public, max-age=31536000, immutable' });
      return json(res, 200, { v: 1 });         // 아무 지시 없음
    });
    try {
      const priv = await fetch(`${server.url}/private`);
      const stat = await fetch(`${server.url}/static`);
      const none = await fetch(`${server.url}/none`);
      fact('개인 데이터', priv.headers.get('cache-control'));
      fact('불변 정적 자산', stat.headers.get('cache-control'));
      fact('지시 없음', none.headers.get('cache-control'));

      assert.equal(priv.headers.get('cache-control'), 'private, no-store');
      assert.match(stat.headers.get('cache-control'), /immutable/);
      assert.equal(none.headers.get('cache-control'), null);
    } finally { await server.close(); }

    lesson('지시가 없으면 프록시·CDN·브라우저가 각자 판단한다 — 개인 데이터가 공유 캐시에 남는 사고가 여기서 난다');
  });
});
