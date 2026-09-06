#!/usr/bin/env python3
"""**말했을 때** 이해하기 어려운 표현의 후보를 뽑는다. 고칠지 말지는 사람이 정한다.

    ./scripts/check-speech-clarity.py              # 범주별 건수
    ./scripts/check-speech-clarity.py 전자          # 그 범주의 문장을 전부 출력
    ./scripts/check-speech-clarity.py 조건절

`docs/12` 의 일본어 검사와는 **기준이 다르다.** 저쪽은 문법(조사·경어·문말)이고, 이쪽은
**귀로 들었을 때 따라갈 수 있는가**다. 글로 읽으면 멀쩡한데 말하면 무너지는 표현이 대상이다.

다섯 가지를 본다.

  (1) 긴 문장       — 한 문장이 60자 이상. 듣는 쪽이 앞을 놓친다.
  (2) 전자/후자     — 듣는 사람이 두 항목을 머리에 담고 되짚어야 한다. 이름을 부르면 사라진다.
  (3) 이쪽/그쪽     — 지시 대상이 멀면 못 따라간다. 가까우면 문제없다(그래서 오탐이 많다).
  (4) 나열 4개 이상 — 개수를 먼저 밝히지 않은 긴 나열.
  (5) 조건절 겹침   — "A가 B로 C했고 거기서 D가 난 경우는" 처럼 조건이 세 겹 이상.

**CI 에 넣지 않는다.** 오탐이 많기 때문이다. 예를 들어 (4) 는 "세 가지입니다" 로 개수를
먼저 말한 정당한 나열까지 잡고, (1) 은 `@ConditionalOnMissingBean` 같은 긴 식별자 때문에
길어진 문장까지 잡는다. 기계가 고를 수 있는 것은 **후보**까지이고, "이게 정말 듣기 어려운가"는
사람이 읽고 판단해야 한다. 통과·실패를 매기는 검사로 만들면 오탐을 맞추려고 원고를 망친다.

조사 결과와 판단 기준은 `docs/13-말로-이해하기-어려운-표현-조사.md` 에 있다.
"""
import re, glob, sys, collections

SETS = [
    ("회화체", "manuscripts/회화체/Part*.md"),
    ("java", "manuscripts/java-면접/Part*.md"),
    ("spring", "manuscripts/spring-면접/Part*.md"),
    ("python", "manuscripts/python-면접/Part*.md"),
    ("javascript", "manuscripts/javascript-면접/Part*.md"),
    ("db", "manuscripts/db-면접/Part*.md"),
    ("kafka", "manuscripts/kafka-면접/Part*.md"),
    ("kubernetes", "manuscripts/kubernetes-면접/Part*.md"),
]

COND_JP = re.compile(r"場合|とき|なら|たら|ければ|ていて")
COND_KR = re.compile(r"경우|때|면\s|으면|이면|하고 |했고")


def blocks(path):
    """(Q번호, 제목, 일본어, 한국어) 로 자른다."""
    t = open(path, encoding="utf-8").read()
    parts = re.split(r"^#{2,3} (Q\d+)\.\s*(.*)$", t, flags=re.M)
    out = []
    for i in range(1, len(parts), 3):
        q, title, body = parts[i], parts[i + 1], parts[i + 2]
        jp = re.search(r"\*\*🇯🇵[^\*]*\*\*(.*?)(?=\*\*🇰🇷|\Z)", body, re.S)
        kr = re.search(r"\*\*🇰🇷[^\*]*\*\*(.*?)(?=\n---|\Z)", body, re.S)
        out.append((q, title, jp.group(1) if jp else "", kr.group(1) if kr else ""))
    return out


def sentences(text, lang):
    text = re.sub(r"`[^`]*`", lambda m: m.group(0).replace("。", "").replace(".", ""), text)
    text = re.sub(r"\*\*|\n+", " ", text).strip()
    s = re.split(r"(?<=[。？！])\s*" if lang == "jp" else r"(?<=[.?!])\s+", text)
    # Part11 의 역질문은 "リアクション : … 메시지 : …" 형식이라 문장이 아니다.
    return [x.strip() for x in s if len(x.strip()) > 3 and "リアクション" not in x]


def clen(s):
    return len(re.sub(r"\s", "", s))


def main():
    flags = collections.defaultdict(list)
    total = 0
    for setname, pattern in SETS:
        for path in sorted(glob.glob(pattern)):
            for q, title, jp, kr in blocks(path):
                if not jp and not kr:
                    continue
                total += 1
                for lang, text in (("jp", jp), ("kr", kr)):
                    for s in sentences(text, lang):
                        n = clen(s)
                        hit = (setname, q, lang, n, s)
                        if n >= 60:
                            flags["긴 문장 (60자 이상)"].append(hit)
                        if re.search(r"前者|後者|전자|후자", s):
                            flags["전자/후자 되짚기"].append(hit)
                        if re.search(r"こちら|そちら|あちら|이쪽|그쪽|저쪽", s):
                            flags["이쪽/그쪽 지시"].append(hit)
                        if s.count("、") >= 4 or s.count(", ") >= 4:
                            flags["나열 4개 이상"].append(hit)
                        cond = (COND_JP if lang == "jp" else COND_KR).findall(s)
                        if len(cond) >= 3 and n >= 55:
                            flags["조건절 겹침"].append(hit)

    print(f"검사한 문항 {total}개 — 후보만 뽑는다. 통과·실패를 매기지 않는다.\n")
    for name, items in sorted(flags.items(), key=lambda kv: -len(kv[1])):
        by_set = collections.Counter(x[0] for x in items)
        print(f"== {name}: {len(items)}건")
        print("   " + " · ".join(f"{k} {v}" for k, v in by_set.most_common()))

    if len(sys.argv) > 1:
        want = sys.argv[1]
        print()
        for name, items in flags.items():
            if want not in name:
                continue
            for setname, q, lang, n, s in sorted(items, key=lambda x: -x[3]):
                print(f"[{setname} {q} {lang} {n}자] {s[:300]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
