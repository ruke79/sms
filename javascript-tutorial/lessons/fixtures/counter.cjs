// 레슨 6-5 의 픽스처(CommonJS) — 같은 내용을 CJS 로 쓴 것.
let count = 0;
function inc() { count++; }
function get() { return count; }
module.exports = { count, inc, get };   // count 는 이 시점의 "값"이 복사돼 나간다
