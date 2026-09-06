// 레슨 8-6 의 픽스처 — 워커 스레드에서 CPU 작업을 돌린다.
import { parentPort, workerData } from 'node:worker_threads';

const fib = (n) => (n < 2 ? n : fib(n - 1) + fib(n - 2));
parentPort.postMessage(fib(workerData.n));
