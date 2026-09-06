#!/usr/bin/env python3
"""키워드 시트(`manuscripts/키워드-시트/`)가 원문 문항을 빠뜨리지 않았는지 검사한다.

    ./scripts/check-keyword-sheets.py          # 전체 검사
    ./scripts/check-keyword-sheets.py --quiet  # 문제만 출력 (CI 가 쓰는 형태)

세 가지를 본다.

  (1) 문항 누락 — 원문 Part 파일의 `### Qn.` 이 시트의 `| n |` 행으로 전부 있는가.
  (2) 유령 문항 — 시트에 있는데 원문에 없는 Q 번호가 있는가 (함정 표·S급 표의 오타가 여기서 걸린다).
  (3) ✅ 근거 id — 시트가 "실행으로 확인했다"고 적은 `✅\`DB-14\`` 의 id 가
      실제로 이 저장소의 `VerificationCase.id()` 에 존재하는가.
      없는 id 를 적으면 **"검증한 척"이 된다** — docs/00 §8 이 금지하는 바로 그것이다.

시트는 원문에서 손으로 뽑은 요약이지 생성물이 아니다. 그래서 내용의 일치는 사람이 보고,
이 스크립트는 **번호가 빠지거나 근거 id 가 허구인 경우**만 기계적으로 막는다.
"""
import argparse
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET_DIR = os.path.join(ROOT, "manuscripts", "키워드-시트")

# 시트 파일 → (원문 디렉터리, Part 파일 글롭)
SHEETS = {
    "Q1-Q200.md": ("manuscripts/회화체", "Part*.md"),
    "java.md": ("manuscripts/java-면접", "Part*.md"),
    "spring.md": ("manuscripts/spring-면접", "Part*.md"),
    "python.md": ("manuscripts/python-면접", "Part*.md"),
    "javascript.md": ("manuscripts/javascript-면접", "Part*.md"),
    "db.md": ("manuscripts/db-면접", "Part*.md"),
    "kafka.md": ("manuscripts/kafka-면접", "Part*.md"),
    "kubernetes.md": ("manuscripts/kubernetes-면접", "Part*.md"),
}

HEADING_RE = re.compile(r"^#{2,3} Q(\d+)\.", re.M)
ROW_RE = re.compile(r"^\| (\d+)(?: 🔴)? \| ", re.M)
RED_ROW_RE = re.compile(r"^\| \d+ 🔴 \| ", re.M)
CASE_REF_RE = re.compile(r"✅`([A-Z0-9·-]+)`")
CASE_ID_RE = re.compile(r'return\s+"([A-Z]+-\d+[A-Z]?)"\s*;')


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def source_questions(src_dir, pattern):
    qs = set()
    for path in sorted(glob.glob(os.path.join(ROOT, src_dir, pattern))):
        qs.update(int(n) for n in HEADING_RE.findall(read(path)))
    return qs


def sheet_questions(text):
    return set(int(n) for n in ROW_RE.findall(text))


def sheet_case_refs(text):
    ids = set()
    for group in CASE_REF_RE.findall(text):
        ids.update(group.split("·"))
    return ids


def known_case_ids():
    ids = set()
    for path in glob.glob(os.path.join(ROOT, "**", "src", "main", "java", "**", "*.java"), recursive=True):
        ids.update(CASE_ID_RE.findall(read(path)))
    return ids


def fmt(nums):
    return ", ".join(f"Q{n}" for n in sorted(nums))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--quiet", action="store_true", help="문제만 출력한다")
    args = ap.parse_args()

    case_ids = known_case_ids()
    problems = []
    lines = []

    for sheet, (src_dir, pattern) in SHEETS.items():
        sheet_path = os.path.join(SHEET_DIR, sheet)
        if not os.path.exists(sheet_path):
            problems.append(f"{sheet}: 파일이 없다")
            continue
        text = read(sheet_path)
        expected = source_questions(src_dir, pattern)
        actual = sheet_questions(text)
        if not expected:
            problems.append(f"{sheet}: 원문 {src_dir}/{pattern} 에서 문항을 하나도 못 찾았다")
            continue

        missing = expected - actual
        ghost = actual - expected
        if missing:
            problems.append(f"{sheet}: 원문에 있는데 시트에 없는 문항 {len(missing)}건 — {fmt(missing)}")
        if ghost:
            problems.append(f"{sheet}: 시트에 있는데 원문에 없는 번호 {len(ghost)}건 — {fmt(ghost)}")

        refs = sheet_case_refs(text)
        bogus = refs - case_ids
        if bogus:
            problems.append(
                f"{sheet}: ✅ 로 적은 근거 id 가 저장소에 없다 — {', '.join(sorted(bogus))} "
                f"(VerificationCase.id() 에 없는 id 는 '검증한 척'이다)"
            )

        n_red = len(RED_ROW_RE.findall(text))
        lines.append(
            f"  {sheet:<14} {len(expected):>3}문항  시트 {len(actual):>3}  "
            f"🔴 {n_red:>2}  ✅ {len(refs):>2}"
        )

    if not args.quiet:
        print("키워드 시트 검사 — 원문 ↔ 시트 문항 대조")
        print("\n".join(lines))
        print(f"  저장소의 VerificationCase id {len(case_ids)}개를 근거 id 대조에 썼다")

    if problems:
        print(f"\n문제 {len(problems)}건")
        for p in problems:
            print("  - " + p)
        return 1

    if not args.quiet:
        print("\n누락 0 · 유령 번호 0 · 허구 근거 id 0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
