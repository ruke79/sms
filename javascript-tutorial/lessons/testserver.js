// 실무 레슨용 로컬 HTTP 서버. 외부 네트워크를 쓰지 않는다.
//
// 실무 레슨은 "느린 상대", "가끔 죽는 상대", "중복을 걸러야 하는 상대"를 만들어야 하는데,
// 진짜 외부 API 를 쓰면 CI 가 남의 사정으로 빨개진다. 그래서 127.0.0.1 에 포트 0(임의 포트)으로
// 띄우고, **호출 횟수와 순서**로 판정한다. 시간은 재지 않는다.
import http from 'node:http';
import { once } from 'node:events';

/**
 * handler(req, res, ctx) 로 응답을 정한다. ctx.calls 는 지금까지의 호출 기록이다.
 * @returns {Promise<{url:string, calls:Array, close:()=>Promise<void>}>}
 */
export async function startServer(handler) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks).toString();
    const call = { method: req.method, path: req.url, headers: req.headers, body };
    calls.push(call);
    try {
      await handler(req, res, { calls, call, index: calls.length - 1 });
    } catch (e) {
      if (!res.headersSent) res.writeHead(500);
      res.end(String(e));
    }
    if (!res.writableEnded) res.end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    close: async () => {
      server.closeAllConnections();
      server.close();
      await once(server, 'close');
    },
  };
}

/** JSON 응답 한 줄. */
export function json(res, status, obj, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(obj));
}
