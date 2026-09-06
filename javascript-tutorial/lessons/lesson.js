// 레슨 공용 도구 — java-tutorial 의 Lesson.java 와 같은 역할.
//
// 이 튜토리얼의 규칙은 저장소 전체와 같다(docs/00 §8) — "확인한 척"을 만들지 않는다.
//   · 주장을 단정할 수 있으면 assert 로 못 박고,
//   · 환경(코어 수·GC 타이밍·스케줄링)에 좌우되면 값을 출력만 하고 단정하지 않는다.
// 후자를 observe 로 표시한다. 테스트가 초록이라고 해서 그 줄까지 증명된 것은 아니라는 뜻이다.

const show = (v) => {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return `${v.constructor.name}: ${v.message}`;
  try { return JSON.stringify(v) ?? String(v); } catch { return String(v); }
};

/** 확인된 사실을 콘솔에 남긴다. 판정에는 영향을 주지 않는다. */
export function fact(label, value) {
  console.log(`   · ${label.padEnd(44)} = ${show(value)}`);
}

/** 단정하지 않고 관측만 한 값. 이 줄은 "확인했다"고 말할 수 없다. */
export function observe(label, value) {
  console.log(`   ~ ${label.padEnd(44)} = ${show(value)}   (환경 의존 — 단정하지 않음)`);
}

/** 레슨의 결론 한 줄. */
export function lesson(text) {
  console.log(`   → ${text}`);
}

/** 매크로태스크 한 바퀴를 기다린다. */
export const nextMacrotask = () => new Promise((r) => setTimeout(r, 0));

/** 지정 ms 동안 이벤트 루프를 막는다(동기 바쁜 대기). 레슨에서 "블로킹"을 만들 때만 쓴다. */
export function blockFor(ms) {
  const end = performance.now() + ms;
  while (performance.now() < end) { /* spin */ }
}
