// 레슨 4-5 의 픽스처 — await 를 빠뜨린 async 호출이 프로세스를 어떻게 죽이는지 보인다.
// 인자 없이 실행하면 await 를 빠뜨리고(종료 코드 1), --await 를 주면 붙인다(종료 코드 0).
const failing = async () => { throw new Error('await 안 한 실패'); };

let caught = null;
try {
  if (process.argv.includes('--await')) await failing();
  else failing();                                   // ← await 없음. 거부된 Promise 가 버려진다
} catch (e) {
  caught = e.message;
}
console.log(`try/catch 가 잡은 것: ${caught}`);
// 여기서 스크립트는 정상 종료하려 하지만, 버려진 거부가 있으면 Node 가 프로세스를 종료 코드 1 로 죽인다.
