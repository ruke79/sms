// 레슨 8 — Node 스트림·백프레셔·워커 (면접 Q33 · Q34)
//
// 백프레셔는 "버퍼에 쌓인 개수"로 잰다 — 결정적이다. 8-6 의 워커만 "메인 스레드가 그동안 몇 번 돌았나"를
// 세는데, 그 값 자체는 환경 의존이라 observe 하고 단정은 0 인지 아닌지에서 멈춘다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { text } from 'node:stream/consumers';
import { setImmediate as yieldToLoop } from 'node:timers/promises';
import { Worker } from 'node:worker_threads';
import { fact, observe, lesson, blockFor } from './lesson.js';

/** 느린 소비자 — 청크 하나를 처리하는 데 매크로태스크 한 바퀴가 걸린다. 버퍼 최대치를 기록한다. */
const slowSink = (highWaterMark) => {
  const seen = [];
  let peakBuffered = 0;
  const sink = new Writable({
    objectMode: true, highWaterMark,
    write(chunk, _enc, cb) { peakBuffered = Math.max(peakBuffered, sink.writableLength); seen.push(chunk); setTimeout(cb, 0); },
  });
  return { sink, seen, peak: () => peakBuffered };
};

describe('레슨 8. 스트림·백프레셔·워커', () => {

  it('8-1. write() 의 반환값 false 가 백프레셔 신호다 — drain 을 기다려야 한다 (Q34) ★', async () => {
    const { sink } = slowSink(3);
    const drained = new Promise((r) => sink.once('drain', r));

    const returns = [sink.write(1), sink.write(2), sink.write(3)];
    fact('write() 세 번의 반환값 (highWaterMark=3)', returns);
    assert.deepEqual(returns, [true, true, false]);   // 세 번째에서 "그만 보내라"
    assert.equal(sink.writableLength, 3);

    await drained;                                    // 소비자가 따라잡으면 drain
    assert.equal(sink.writableLength, 0);

    lesson('false 를 무시하고 계속 write 하면 버퍼가 메모리에 무한히 쌓인다 — "스트림이라 메모리 안 쓴다"는 이 신호를 지킬 때만 참');
  });

  it('8-2. 반환값을 무시한 루프는 전부 쌓이고, pipeline 은 상한 안에서 흐른다 (Q34) ★', async () => {
    const items = Array.from({ length: 200 }, (_, i) => i);

    // (a) 순진한 루프 — write() 의 false 를 안 본다
    const naive = slowSink(5);
    for (const x of items) naive.sink.write(x);
    const bufferedRightAfterLoop = naive.sink.writableLength;   // 루프 직후, 아직 아무것도 소비 안 됨
    naive.sink.end();
    await new Promise((r) => naive.sink.once('finish', r));
    fact('순진한 루프 — 루프 직후 버퍼에 있던 개수', bufferedRightAfterLoop);
    fact('순진한 루프 — write() 안에서 본 최대치', naive.peak());
    assert.equal(bufferedRightAfterLoop, 200);        // 200개가 통째로 메모리에 (highWaterMark 5 는 무시됐다)
    // 처음엔 peak() 도 200 이라 단정했다가 199 로 실패했다 — 두 번째 _write 가 불릴 때는 첫 청크가 이미 빠진 뒤라서다.
    // "그 시점에 몇 개가 쌓여 있었나"는 어디서 재느냐에 따라 1 이 달라진다. 루프 직후 값으로 단정하고, peak 는 기록만 한다.

    // (b) pipeline — Readable 을 멈췄다 풀었다 하며 상한을 지킨다
    const piped = slowSink(5);
    await pipeline(Readable.from(items), piped.sink);
    fact('pipeline — 버퍼 최대치', piped.peak());
    assert.ok(piped.peak() <= 5, `상한 5 를 넘겼다: ${piped.peak()}`);
    assert.deepEqual(piped.seen, items);              // 빠짐없이 전부 도착

    lesson('pipe/pipeline 이 하는 일의 본질 = 소비 속도에 맞춰 생산자를 pause/resume 하는 것. 직접 write 루프를 짜면 그 일을 내가 해야 한다');
  });

  it('8-3. pipeline 은 중간에서 난 에러를 전파하고 소스를 정리한다 (Q34·Q36)', async () => {
    const source = Readable.from(['a', 'b', 'c', 'd']);
    const explodeAtC = new Transform({
      objectMode: true,
      transform(chunk, _e, cb) { chunk === 'c' ? cb(new Error('c 에서 폭발')) : cb(null, chunk.toUpperCase()); },
    });
    const { sink, seen } = slowSink(16);

    await assert.rejects(pipeline(source, explodeAtC, sink), /c 에서 폭발/);
    fact('에러 전까지 실제로 소비된 것', seen);
    // 처음엔 ['A', 'B'] 라고 단정했다가 실패했다. B 는 sink 의 버퍼에 "들어가긴" 했지만, 느린 소비자가 A 를 끝내기 전에
    // c 가 터졌고 pipeline 이 sink 를 destroy 하면서 버퍼째 버렸다. 에러 시 버퍼는 사라진다 — 이것도 레슨이다.
    assert.deepEqual(seen, ['A']);
    assert.equal(source.destroyed, true);              // 소스도 닫혔다 — 파일 핸들이면 여기서 해제
    assert.equal(sink.destroyed, true);

    lesson('.pipe() 는 에러를 전파하지 않는다 — pipeline() 을 쓰는 이유는 "에러 때 전부 닫아 주는 것". 단, 닫히면서 버퍼에 있던 것은 버려진다');
  });

  it('8-4. 청크 경계는 줄 경계가 아니다 — Transform 이 남은 조각을 들고 넘어가야 한다 (Q34) ★', async () => {
    const splitLines = () => {
      let carry = '';
      return new Transform({
        readableObjectMode: true,
        transform(chunk, _e, cb) {
          const parts = (carry + chunk).split('\n');
          carry = parts.pop();                       // 마지막 조각은 다음 청크와 붙여야 한다
          for (const line of parts) this.push(line);
          cb();
        },
        flush(cb) { if (carry) this.push(carry); cb(); },   // 끝에 남은 것
      });
    };

    // 네트워크가 잘라 준 대로 — "cd" 와 "ef" 는 원래 한 줄이었다
    const chunks = ['ab\ncd', 'ef\ngh', '\nij'];
    const lines = [];
    await pipeline(Readable.from(chunks), splitLines(), new Writable({ objectMode: true, write(l, _e, cb) { lines.push(l); cb(); } }));
    fact('입력 청크', chunks);
    fact('복원된 줄', lines);
    assert.deepEqual(lines, ['ab', 'cdef', 'gh', 'ij']);

    lesson('chunk.split("\\n") 만 하면 줄이 두 동강 난다 — TCP 도 파일 읽기도 "의미 단위"로 잘라 주지 않는다');
  });

  it('8-5. Readable.from(async 제너레이터) 와 for await — 스트림과 이터레이터는 같은 것의 두 얼굴 (Q17·Q34)', async () => {
    async function* produce() { for (const w of ['스트림은', ' ', '이터러블이다']) yield w; }

    const collected = [];
    for await (const chunk of Readable.from(produce())) collected.push(chunk);   // 스트림을 for await 로
    assert.deepEqual(collected, ['스트림은', ' ', '이터러블이다']);

    const joined = await text(Readable.from(produce()));                         // 소비자 헬퍼
    assert.equal(joined, '스트림은 이터러블이다');

    lesson('Node 스트림은 AsyncIterable 이다 — 제너레이터로 만들고 for await 로 소비하면 콜백 API 를 거의 안 봐도 된다');
  });

  it('8-6. CPU 작업이 메인에 있으면 이벤트 루프가 멈추고, 워커로 빼면 계속 돈다 (Q33) ★', async () => {
    const fib = (n) => (n < 2 ? n : fib(n - 1) + fib(n - 2));
    const countTicksWhile = async (work) => {
      let ticks = 0;
      const interval = setInterval(() => ticks++, 1);   // 루프가 돌고 있으면 이 카운터가 오른다
      const result = await work();
      clearInterval(interval);
      return { ticks, result };
    };

    // (a) 메인 스레드에서 동기 계산 — 그동안 타이머는 단 한 번도 못 돈다 (결정적)
    const onMain = await countTicksWhile(async () => fib(30));
    fact('메인에서 fib(30) — 그동안 돈 타이머 횟수', onMain.ticks);
    assert.equal(onMain.ticks, 0);

    // (b) 워커에서 계산 — 메인의 타이머는 계속 돈다
    const inWorker = await countTicksWhile(() => new Promise((resolve, reject) => {
      const w = new Worker(new URL('./fixtures/fib-worker.js', import.meta.url), { workerData: { n: 30 } });
      w.once('message', resolve); w.once('error', reject);
    }));
    observe('워커에서 fib(30) — 그동안 돈 타이머 횟수', inWorker.ticks);   // 횟수 자체는 장비 의존
    assert.ok(inWorker.ticks > 0);                     // 0 이 아니라는 것만 단정
    assert.equal(inWorker.result, onMain.result);

    lesson('Node 가 느린 게 아니라 "CPU 작업 중에는 아무것도 못 받는" 것 — 워커 스레드나 별도 프로세스로 빼서 루프를 비워 둔다');
  });

  it('8-7. 워커를 못 쓰면 작업을 잘게 나눠 루프에 양보한다 — setImmediate 로 끼어들 틈을 만든다 (Q33)', async () => {
    const order = [];
    setTimeout(() => order.push('타이머'), 0);

    // 한 덩어리 — 타이머는 끝날 때까지 못 낀다
    blockFor(20); order.push('한 덩어리 끝');
    await new Promise((r) => setTimeout(r, 0));   // 타이머 "뒤"에 등록한 타이머로 기다린다
    assert.deepEqual(order, ['한 덩어리 끝', '타이머']);
    // 처음엔 여기서 await setImmediate 로 기다렸다가, 8-6 뒤에 이어 돌 때만 실패했다.
    // 8-6 은 워커의 message(poll 단계) 콜백에서 끝나므로 이 테스트는 poll 단계에서 출발하고,
    // 그러면 setImmediate 는 "같은 바퀴"의 check 단계에서 돌아 타이머보다 먼저 온다 — 3-6 에서 단정한 바로 그 규칙에 내가 걸렸다.

    order.length = 0;
    setTimeout(() => order.push('타이머'), 0);
    // 10 조각으로 나누고 조각 사이마다 양보 — 타이머가 중간에 낀다
    for (let i = 0; i < 10; i++) { blockFor(2); await yieldToLoop(); }
    order.push('조각내기 끝');
    fact('조각내기 — 실행 순서', order);
    assert.deepEqual(order, ['타이머', '조각내기 끝']);

    lesson('총 CPU 시간은 같아도 "응답성"이 달라진다 — 대량 데이터 가공은 청크 사이에 await setImmediate() 한 줄');
  });
});
