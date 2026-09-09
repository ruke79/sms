// 레슨 15 — 문자열과 입력 검증 (면접 Q45 · Q38 · Q41)
//
// `length` 가 글자 수가 아니라는 것만 알아도 사고가 절반 줄어든다. 여기서는 **DB 컬럼이 터지는 자리**,
// **눈에 같아 보이는데 !== 인 자리**, **경로가 밖으로 나가는 자리**를 전부 실행해서 본다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { timingSafeEqual, randomUUID, scryptSync } from 'node:crypto';
import { fact, lesson } from './lesson.js';

describe('레슨 15. 문자열·입력 검증', () => {

  it('15-1. length 는 글자 수가 아니라 UTF-16 코드 유닛 수다 (Q45) ★', () => {
    const cases = ['abc', '한글', '😀', '👨‍👩‍👧‍👦'];
    const table = cases.map((s) => ({
      s, length: s.length,
      codePoints: [...s].length,
      graphemes: [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(s)].length,
    }));
    for (const r of table) fact(`"${r.s}"`, `length=${r.length} codePoint=${r.codePoints} grapheme=${r.graphemes}`);

    assert.equal('😀'.length, 2);                 // 서로게이트 페어라 2
    assert.equal([...'😀'].length, 1);
    assert.equal('👨‍👩‍👧‍👦'.length, 11);          // 가족 이모지는 11
    assert.equal([...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment('👨‍👩‍👧‍👦')].length, 1);

    lesson('"20자 제한"을 length 로 걸면 이모지 열 개에서 잘린다 — 세는 단위를 정하고 시작한다');
  });

  it('15-2. 자르면 글자가 깨진다 — slice 는 코드 유닛을 자른다 (Q45) ★', () => {
    const s = '안녕😀세계';
    const broken = s.slice(0, 3);                 // 이모지 중간을 자른다
    const safe = [...s].slice(0, 3).join('');

    fact('slice(0,3)', `${broken} (마지막 코드 유닛 ${broken.charCodeAt(2).toString(16)})`);
    fact('코드 포인트로 자른 것', safe);
    assert.equal(broken.length, 3);
    assert.ok(broken.endsWith('\uD83D'));         // 짝 잃은 서로게이트 = 깨진 글자
    assert.equal(safe, '안녕😀');

    lesson('미리보기 텍스트를 substring 으로 만들면 마지막 글자가 물음표로 나온다 — 이 자리다');
  });

  it('15-3. 눈에 같은데 !== 다 — 정규화하지 않은 입력 (Q45) ★', () => {
    const composed = '가';                          // U+AC00
    const decomposed = '가';              // ㄱ + ㅏ
    fact('보이는 모양', `${composed} vs ${decomposed}`);
    fact('길이', `${composed.length} vs ${decomposed.length}`);
    assert.notEqual(composed, decomposed);
    assert.equal(composed.normalize('NFC'), decomposed.normalize('NFC'));

    // macOS 가 파일명을 NFD 로 주는 것이 대표적인 사고 지점이다
    const dbHas = new Set([composed]);
    assert.equal(dbHas.has(decomposed), false);     // 검색이 안 된다
    assert.equal(dbHas.has(decomposed.normalize('NFC')), true);

    lesson('입력은 경계에서 NFC 로 정규화해 저장한다 — 안 하면 "분명히 넣었는데 검색이 안 되는" 버그가 된다');
  });

  it('15-4. 바이트 길이와 글자 길이는 다르다 — DB 컬럼이 여기서 터진다 (Q45)', () => {
    const s = '한글은 세 바이트';
    fact('문자 길이', s.length);
    fact('UTF-8 바이트 길이', Buffer.byteLength(s, 'utf8'));
    assert.equal(s.length, 9);
    // 한글 7자 × 3바이트 + 공백 2 = 23. 처음에 21 이라고 썼다가 공백을 빼먹어 틀렸다 —
    // "한글은 3바이트" 만 외우고 있으면 이렇게 어긋난다. 세는 것은 사람이 아니라 Buffer 다.
    assert.equal(Buffer.byteLength(s, 'utf8'), 23);

    // varchar(10) 이 바이트 단위인 DB 라면 이 문자열은 안 들어간다
    assert.ok(Buffer.byteLength(s, 'utf8') > 10);
    assert.ok(s.length <= 10);                      // 앱에서는 통과시켰는데

    lesson('앱의 검증은 글자로, DB 의 제약은 바이트로 걸려 있으면 프로덕션 데이터에서만 터진다');
  });

  it('15-5. 사용자 입력으로 경로를 만들면 밖으로 나간다 (Q41) ★', () => {
    const root = '/srv/uploads';
    const attack = '../../etc/passwd';

    const naive = path.join(root, attack);
    fact('그냥 join 한 결과', naive);
    assert.equal(naive, '/etc/passwd');             // 루트 밖으로 나갔다

    const resolved = path.resolve(root, attack);
    const safe = resolved.startsWith(root + path.sep) || resolved === root;
    fact('루트 안인가', safe);
    assert.equal(safe, false);

    // 방어 — 파일명만 취하고, 그래도 최종 경로를 확인한다
    const base = path.basename(attack);
    const finalPath = path.resolve(root, base);
    fact('basename 만 취한 결과', finalPath);
    assert.equal(finalPath, '/srv/uploads/passwd');
    assert.ok(finalPath.startsWith(root + path.sep));

    lesson('검증은 "입력을 거른다"가 아니라 **"만들어진 최종 경로가 루트 안인가"** 로 한다');
  });

  it('15-6. 비밀 값 비교는 === 로 하지 않는다 (Q41)', () => {
    const expected = Buffer.from('super-secret-token-value');
    const eq = (a) => {
      const b = Buffer.from(a);
      // 길이가 다르면 timingSafeEqual 이 던지므로 먼저 거른다(길이 자체는 비밀이 아니다)
      return b.length === expected.length && timingSafeEqual(b, expected);
    };
    fact('맞는 토큰', eq('super-secret-token-value'));
    fact('틀린 토큰', eq('super-secret-token-valuX'));
    fact('길이가 다른 토큰', eq('short'));
    assert.equal(eq('super-secret-token-value'), true);
    assert.equal(eq('super-secret-token-valuX'), false);
    assert.equal(eq('short'), false);

    // 비밀번호는 아예 느린 해시로
    const salt = randomUUID();
    const h1 = scryptSync('correct horse', salt, 32).toString('hex');
    const h2 = scryptSync('correct horse', salt, 32).toString('hex');
    assert.equal(h1, h2);
    assert.notEqual(scryptSync('wrong horse', salt, 32).toString('hex'), h1);

    lesson('`===` 는 첫 다른 바이트에서 멈춘다 — 그 시간 차이가 토큰을 한 글자씩 알려 준다');
  });

  it('15-7. JSON.parse 는 프로토타입 오염의 입구가 될 수 있다 (Q38) ★', () => {
    const payload = '{"__proto__": {"isAdmin": true}, "name": "bob"}';
    const parsed = JSON.parse(payload);

    // JSON.parse 자체는 안전하다 — 평범한 키로 들어간다
    fact('파싱 직후 전역이 오염됐나', {}.isAdmin);
    assert.equal({}.isAdmin, undefined);
    assert.equal(Object.hasOwn(parsed, '__proto__'), true);

    // 위험한 것은 그 뒤에 "병합" 하는 코드다 (레슨 2-5 와 같은 함정)
    const target = {};
    const key = '__proto__';
    Object.assign(target, { [key]: parsed[key] });   // Object.assign 은 안전한 쪽
    assert.equal({}.isAdmin, undefined);

    // 방어 — 위험한 키를 아예 버린다
    const DANGEROUS = new Set(['__proto__', 'constructor', 'prototype']);
    const cleaned = Object.fromEntries(Object.entries(parsed).filter(([k]) => !DANGEROUS.has(k)));
    fact('걸러낸 뒤의 키', Object.keys(cleaned));
    assert.deepEqual(Object.keys(cleaned), ['name']);

    lesson('레슨 2-5 의 오염은 파싱이 아니라 **병합**에서 일어난다 — 입력 경계에서 위험 키를 떨어뜨린다');
  });
});
