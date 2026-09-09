// 레슨 12-5 용 워커. 메인의 AsyncLocalStorage 컨텍스트가 여기까지 오는지 확인한다.
// 워커는 별도 스레드이자 별도 V8 인스턴스라, 메인의 저장소 자체가 존재하지 않는다.
import { parentPort, workerData } from 'node:worker_threads';
import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();   // 메인의 것과 다른 인스턴스다

parentPort.postMessage({
  seen: workerData?.traceId ?? als.getStore()?.traceId ?? null,
});
