// 레슨 16 — 서버를 안전하게 내리고 올린다 (면접 Q46 · Q47 · Q49)
//
// Kubernetes Q11·Q13(liveness/readiness)과 Spring Q117·Q118 이 여기서 코드가 된다.
// **"프로세스가 살아 있다"와 "요청을 받아도 된다"는 다른 질문**이라는 것을 실행해서 확인한다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { startServer, json } from './testserver.js';
import { fact, lesson } from './lesson.js';

/** 처리 중인 요청을 세면서 graceful shutdown 을 지원하는 서버. */
async function makeServer({ slowMs = 50 } = {}) {
  let inFlight = 0, completed = 0, ready = true, draining = false;
  const server = http.createServer(async (req, res) => {
    if (req.url === '/healthz') return json(res, 200, { alive: true });                 // liveness
    if (req.url === '/readyz') return json(res, ready ? 200 : 503, { ready });           // readiness
    if (draining) return json(res, 503, { error: 'shutting down' });
    inFlight++;
    await new Promise((r) => setTimeout(r, slowMs));                                     // 느린 처리
    completed++; inFlight--;
    json(res, 200, { ok: true });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url, server,
    stats: () => ({ inFlight, completed }),
    setReady: (v) => { ready = v; },
    startDraining: () => { draining = true; },
    hardClose: () => { server.closeAllConnections(); server.close(); },
    graceful: async () => {
      ready = false;                       // 1) 먼저 로드밸런서에서 빠진다
      server.close();                      // 2) 새 연결을 안 받는다 (진행 중인 것은 끝낸다)
      server.closeIdleConnections();       // 3) keep-alive 로 놀고 있는 연결만 끊는다
      await once(server, 'close');
    },
  };
}

describe('레슨 16. 서버 운영 — 내리는 순서가 곧 가용성', () => {

  it('16-1. 그냥 죽이면 처리 중인 요청이 끊긴다 (Q46) ★', async () => {
    const app = await makeServer({ slowMs: 80 });
    const results = [];
    const reqs = Array.from({ length: 5 }, () =>
      fetch(app.url).then((r) => results.push(r.status), (e) => results.push(e.cause?.code ?? e.name)));

    await new Promise((r) => setTimeout(r, 20));       // 요청이 서버에 도착할 시간
    const during = app.stats();
    app.hardClose();                                    // 즉시 연결을 전부 끊는다
    await Promise.all(reqs);

    fact('끊기 직전 처리 중이던 요청', during.inFlight);
    fact('클라이언트가 받은 것', results);
    assert.equal(during.inFlight, 5);
    assert.equal(results.filter((r) => r === 200).length, 0);   // 하나도 못 받았다

    lesson('SIGTERM 에 바로 process.exit 하는 코드가 배포마다 5xx 를 만든다 — 사용자에게는 장애로 보인다');
  });

  it('16-2. graceful 은 진행 중인 것을 끝내고 새 연결만 막는다 (Q46) ★', async () => {
    const app = await makeServer({ slowMs: 80 });
    const results = [];
    const reqs = Array.from({ length: 5 }, () =>
      fetch(app.url).then((r) => results.push(r.status), (e) => results.push(e.cause?.code ?? e.name)));

    await new Promise((r) => setTimeout(r, 20));
    const closing = app.graceful();
    await Promise.all(reqs);
    await closing;

    fact('클라이언트가 받은 것', results);
    fact('서버가 끝낸 요청 수', app.stats().completed);
    assert.deepEqual(results, [200, 200, 200, 200, 200]);
    assert.equal(app.stats().completed, 5);

    // 닫힌 뒤에는 새 연결이 거절된다
    const after = await fetch(app.url).then(() => 'ok', (e) => e.cause?.code ?? e.name);
    fact('닫힌 뒤 새 요청', after);
    assert.notEqual(after, 'ok');

    lesson('close() 는 "지금 있는 것은 끝내고 새 손님만 안 받는다" 이다 — 이것만으로 배포 중 5xx 가 사라진다');
  });

  it('16-3. readiness 를 먼저 내려야 트래픽이 안 온다 (Q46) ★', async () => {
    const app = await makeServer();
    try {
      const alive1 = await fetch(`${app.url}/healthz`).then((r) => r.status);
      const ready1 = await fetch(`${app.url}/readyz`).then((r) => r.status);
      fact('정상 상태 — liveness / readiness', `${alive1} / ${ready1}`);
      assert.equal(alive1, 200);
      assert.equal(ready1, 200);

      app.setReady(false);                              // 종료를 시작하기 전에 먼저 뺀다
      const alive2 = await fetch(`${app.url}/healthz`).then((r) => r.status);
      const ready2 = await fetch(`${app.url}/readyz`).then((r) => r.status);
      fact('종료 직전 — liveness / readiness', `${alive2} / ${ready2}`);
      assert.equal(alive2, 200);                        // 아직 살아 있다 = 재시작시키면 안 된다
      assert.equal(ready2, 503);                        // 하지만 새 트래픽은 받지 않는다
    } finally { app.hardClose(); }

    lesson('Kubernetes Q13 이 그대로다 — liveness 를 실패시키면 재시작이고, readiness 만 내리면 라우팅에서 빠진다');
  });

  it('16-4. liveness 에 DB 를 넣으면 전 인스턴스가 동시에 재시작한다 (Q46) ★', async () => {
    let dbUp = true;
    const server = await startServer((req, res) => {
      if (req.url === '/live-with-db') return json(res, dbUp ? 200 : 503, { db: dbUp });   // 나쁜 판
      if (req.url === '/live') return json(res, 200, { process: 'up' });                   // 좋은 판
      return json(res, dbUp ? 200 : 503, { ready: dbUp });                                 // readiness 는 포함해도 된다
    });
    try {
      dbUp = false;                                     // DB 가 잠깐 죽었다
      const bad = await fetch(`${server.url}/live-with-db`).then((r) => r.status);
      const good = await fetch(`${server.url}/live`).then((r) => r.status);
      const ready = await fetch(`${server.url}/readyz`).then((r) => r.status);

      fact('DB 체크가 든 liveness', bad);
      fact('프로세스만 보는 liveness', good);
      fact('readiness', ready);
      assert.equal(bad, 503);                           // → 모든 Pod 이 동시에 재시작된다
      assert.equal(good, 200);
      assert.equal(ready, 503);                         // → 트래픽만 빠진다. 복구되면 그대로 돌아온다
    } finally { await server.close(); }

    lesson('DB 하나가 흔들렸을 뿐인데 전 Pod 이 재시작하면 복구가 더 늦어진다 — 의존은 readiness 에만');
  });

  it('16-5. 종료에도 상한이 필요하다 — 안 끝나는 요청은 버린다 (Q46)', async () => {
    const app = await makeServer({ slowMs: 5000 });     // 절대 제때 안 끝나는 요청
    const req = fetch(app.url).then(() => 'ok', (e) => e.cause?.code ?? e.name);
    await new Promise((r) => setTimeout(r, 20));

    const graceMs = 100;
    const started = Date.now();
    const timer = setTimeout(() => app.hardClose(), graceMs);   // 유예를 넘기면 강제 종료
    await once(app.server, 'close').catch(() => {});
    clearTimeout(timer);
    const waited = Date.now() - started;

    fact('유예(ms)', graceMs);
    fact('클라이언트 결과', await req);
    assert.ok(waited < 3000);                            // 5초짜리 요청을 끝까지 기다리지 않았다

    lesson('graceful 에 상한이 없으면 배포가 멈춘다 — "기다린다"와 "영원히 기다린다"는 다르다');
  });

  it('16-6. 진행 중 요청 수를 모르면 언제 내려도 되는지 알 수 없다 (Q46·Q47)', async () => {
    const app = await makeServer({ slowMs: 60 });
    try {
      assert.deepEqual(app.stats(), { inFlight: 0, completed: 0 });

      const reqs = Array.from({ length: 3 }, () => fetch(app.url).then((r) => r.status));
      await new Promise((r) => setTimeout(r, 20));
      fact('처리 중', app.stats().inFlight);
      assert.equal(app.stats().inFlight, 3);

      await Promise.all(reqs);
      fact('완료 후', app.stats());
      assert.deepEqual(app.stats(), { inFlight: 0, completed: 3 });
    } finally { app.hardClose(); }

    lesson('이 숫자가 대시보드에 없으면 배포 스크립트는 "몇 초 기다린다" 라는 추측으로 돌아간다');
  });

  it('16-7. 요청 단위 타임아웃이 없으면 느린 상대가 서버를 붙잡는다 (Q35·Q46)', async () => {
    const upstream = await startServer(() => new Promise(() => { /* 응답 없음 */ }));
    try {
      // 상류에 타임아웃을 걸지 않으면 이 핸들러는 영원히 안 끝난다.
      const withTimeout = await fetch(upstream.url, { signal: AbortSignal.timeout(80) })
        .then(() => 'ok', (e) => e.name);
      fact('타임아웃을 건 상류 호출', withTimeout);
      assert.equal(withTimeout, 'TimeoutError');

      // 타임아웃이 있으면 502 로 빨리 실패시켜 스레드(여기서는 커넥션)를 돌려준다
      const gateway = await startServer(async (req, res) => {
        const ok = await fetch(upstream.url, { signal: AbortSignal.timeout(50) }).then(() => true, () => false);
        return json(res, ok ? 200 : 504, { upstream: ok });
      });
      const status = await fetch(gateway.url).then((r) => r.status);
      fact('게이트웨이가 돌려준 상태', status);
      assert.equal(status, 504);
      await gateway.close();
    } finally { await upstream.close(); }

    lesson('Spring Q45·Q107 과 같다 — 빨리 실패시켜야 자원이 돌아온다. 오래 기다리는 것이 친절이 아니다');
  });
});
