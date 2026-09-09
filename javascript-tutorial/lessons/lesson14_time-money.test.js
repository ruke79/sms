// 레슨 14 — 시간·타임존·돈 (면접 Q44 · Q45)
//
// 이 셋은 "안다"와 "안 틀린다"의 거리가 가장 먼 주제다. 여기서는 **틀리는 쪽을 먼저 실행해서** 보여준다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fact, lesson } from './lesson.js';

describe('레슨 14. 시간·타임존·돈', () => {

  it('14-1. Date 는 시간축 위의 한 점이다 — 존은 표시할 때만 붙는다 (Q44) ★', () => {
    const t = new Date('2026-01-15T00:30:00Z');
    fact('UTC 밀리초', t.getTime());
    assert.equal(t.getTime(), Date.parse('2026-01-15T00:30:00Z'));

    // 같은 한 점을 두 존에서 보면 날짜가 다르다
    const tokyo = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', dateStyle: 'short' }).format(t);
    const ny = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/New_York', dateStyle: 'short' }).format(t);
    fact('도쿄에서 본 날짜', tokyo);
    fact('뉴욕에서 본 날짜', ny);
    assert.equal(tokyo, '2026-01-15');
    assert.equal(ny, '2026-01-14');              // 하루 전이다

    lesson('"1월 15일 매출"은 어느 존의 15일인지를 정하지 않으면 답이 없는 질문이다');
  });

  it('14-2. 존 없는 문자열은 파싱 규칙이 갈린다 (Q44) ★', () => {
    const withZ = Date.parse('2026-01-15T00:30:00Z');
    const naive = Date.parse('2026-01-15T00:30:00');      // 존 없음 → 로컬로 해석
    const dateOnly = Date.parse('2026-01-15');            // 날짜만 → UTC 로 해석

    fact('Z 붙은 것', withZ);
    fact('존 없는 일시 - Z 붙은 것 (ms)', naive - withZ);
    fact('날짜만 - Z 붙은 것 (ms)', dateOnly - withZ);

    assert.equal(dateOnly, Date.parse('2026-01-15T00:00:00Z'));   // 날짜만은 UTC 자정
    // 존 없는 일시는 실행 환경의 로컬 존을 따르므로, 두 값의 차이는 환경마다 다르다.
    // CI 는 UTC 라 0 이 되지만 그것을 단정하면 다른 장비에서 깨진다 — 규칙만 단정한다.
    assert.equal(typeof naive, 'number');
    assert.ok(!Number.isNaN(naive));

    lesson('`2026-01-15` 와 `2026-01-15T00:00:00` 이 다르게 해석된다 — 저장·통신은 항상 Z 를 붙인 UTC 로');
  });

  it('14-3. 월말에 한 달을 더하면 날짜가 넘친다 (Q44) ★', () => {
    const jan31 = new Date(Date.UTC(2026, 0, 31));
    const naive = new Date(jan31);
    naive.setUTCMonth(naive.getUTCMonth() + 1);           // 2월 31일 → 3월 3일로 넘어간다

    fact('1월 31일에 한 달 더한 결과', naive.toISOString().slice(0, 10));
    assert.equal(naive.toISOString().slice(0, 10), '2026-03-03');

    // 업무에서 원하는 것은 보통 "그 달의 마지막 날로 자른다" 이다
    const addMonthClamped = (d, n) => {
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
      const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return new Date(Date.UTC(y, m, Math.min(day, lastDay)));
    };
    fact('잘라낸 결과', addMonthClamped(jan31, 1).toISOString().slice(0, 10));
    assert.equal(addMonthClamped(jan31, 1).toISOString().slice(0, 10), '2026-02-28');

    lesson('구독 갱신일·정산 마감일이 이 한 줄에서 어긋난다 — 라이브러리를 쓰더라도 규칙을 정해야 한다');
  });

  it('14-4. JSON 왕복에서 Date 는 문자열이 된다 (Q44)', () => {
    const before = { at: new Date('2026-01-15T00:30:00Z'), n: 1 };
    const after = JSON.parse(JSON.stringify(before));

    fact('왕복 뒤의 타입', typeof after.at);
    assert.equal(typeof after.at, 'string');
    assert.equal(after.at, '2026-01-15T00:30:00.000Z');
    assert.notDeepEqual(before, after);

    // reviver 로 되살릴 수 있지만, "어떤 필드가 날짜인가"를 아는 쪽에서만 안전하다
    const revived = JSON.parse(JSON.stringify(before), (k, v) => (k === 'at' ? new Date(v) : v));
    assert.ok(revived.at instanceof Date);
    assert.equal(revived.at.getTime(), before.at.getTime());

    lesson('`typeof x.at === "string"` 이 되어 `.getTime is not a function` 이 나는 자리 — 경계에서 타입을 되살린다');
  });

  it('14-5. 돈을 부동소수점으로 다루면 합계가 어긋난다 (Q45) ★', () => {
    fact('0.1 + 0.2', 0.1 + 0.2);
    assert.notEqual(0.1 + 0.2, 0.3);
    assert.equal(0.1 + 0.2, 0.30000000000000004);

    // 처음엔 [0.1, 0.2, 0.3, 19.99, 0.7] 로 쓰고 어긋난다고 단정했다가 실패했다 — 이 조합은 우연히
    // 21.29 로 딱 떨어진다. **어긋날 때도 있고 아닐 때도 있다는 것**이 이 버그의 진짜 성질이라,
    // 실제로 어긋나는 조합과 안 어긋나는 조합을 둘 다 남긴다.
    const drifting = [0.07, 0.07, 0.07];
    const lucky = [19.99, 0.01, 5.55, 0.45];
    const sum = (xs) => xs.reduce((a, b) => a + b, 0);
    const cents = (xs) => xs.map((p) => Math.round(p * 100)).reduce((a, b) => a + b, 0);

    fact('어긋나는 조합의 합계', sum(drifting));
    fact('우연히 맞는 조합의 합계', sum(lucky));
    assert.notEqual(sum(drifting), 0.21);
    assert.equal(sum(drifting), 0.21000000000000002);
    assert.equal(sum(lucky), 26);                // 이쪽은 정확히 맞는다

    assert.equal(cents(drifting), 21);           // 정수로 하면 항상 맞는다
    assert.equal(cents(lucky), 2600);

    lesson('금액은 최소 단위의 정수로 갖는다 — 표시할 때만 나눈다. DB 도 `numeric` 이지 `float` 이 아니다');
    lesson('테스트가 초록이어도 안심할 수 없는 이유 — 입력에 따라 맞기도 해서, 운 좋은 데이터로 짠 테스트는 통과한다');
  });

  it('14-6. toFixed 는 사사오입이 아니다 (Q45)', () => {
    const samples = [1.005, 2.675, 1.5, 2.5];
    const fixed = samples.map((n) => n.toFixed(2));
    fact('toFixed(2) 결과', fixed);
    assert.equal((1.005).toFixed(2), '1.00');    // 1.01 이 아니다 — 1.005 가 정확히 저장되지 않는다
    assert.equal((2.675).toFixed(2), '2.67');

    // 표시 반올림은 Intl 에 맡기고, 계산 반올림은 정수에서 한다
    const won = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(2129);
    fact('통화 표시', won);
    assert.match(won, /2,129/);

    lesson('반올림이 필요한 순간을 계산과 표시로 나눈다 — 섞으면 합계와 화면이 1원씩 어긋난다');
  });

  it('14-7. 정렬은 사전순이 아니다 — 로케일을 지정한다 (Q45)', () => {
    const words = ['banana', 'Apple', 'cherry', '가나', 'apple'];
    const naive = [...words].sort();                       // 코드 유닛 순서
    const locale = [...words].sort((a, b) => a.localeCompare(b, 'ko'));

    fact('기본 sort', naive);
    fact('localeCompare("ko")', locale);
    assert.equal(naive[0], 'Apple');                       // 대문자가 전부 앞으로 온다
    assert.ok(naive.indexOf('Apple') < naive.indexOf('apple'));
    assert.notDeepEqual(naive, locale);

    lesson('사용자에게 보이는 목록을 기본 sort 로 정렬하면 "왜 대문자가 위에 몰리죠" 를 듣는다');
  });
});
