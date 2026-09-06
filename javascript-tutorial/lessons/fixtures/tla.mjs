// 레슨 6-6 의 픽스처 — 톱레벨 await. 이 모듈을 import 하는 쪽은 아래 await 가 끝날 때까지 기다린다.
export const loadedAt = await new Promise((r) => setTimeout(() => r('톱레벨 await 완료'), 5));
