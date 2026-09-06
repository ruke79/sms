# Java Q1~Q145 키워드 시트
## 145문항 · 한 문서 · 매일 훑기 / 면접 직전용

> **사용법**: 키워드만 보고 일본어로 말할 수 있으면 실전 가능선. 원문은 [`../java-면접/`](../java-면접/README.md).
> **굵은 글씨** = 다른 지원자와 차이를 만드는 차별화 포인트. 시간이 없어도 이것만은 반드시.
> 🔴 = [`필수-키노트`](../java-면접/필수-키노트.md) 의 **S급 18문항**(반드시 나온다).
> **▶1-3** = [`java-tutorial/`](../../java-tutorial/README.md) 의 **실행 레슨 번호**. 외우기 전에 `./gradlew :java-tutorial:test --tests '*Lesson01*'` 로 직접 돌려 볼 수 있다.

---

# Part 1. 언어 기초 (Q1~30)

| Q | 질문 | 키워드 |
|---|---|---|
| 1 | `==` vs `equals()` | 참조 비교 / 값 비교(클래스가 정한 기준) · `String` 이 `==` 로 되는 건 **리터럴 풀 공유의 우연** ▶1-1·1-2 |
| 2 🔴 | `equals` 재정의 시 `hashCode` 도 | "같으면 같은 해시" 계약 · 어기면 **다른 버킷 → `put` 한 걸 `get` 못 함** · `Objects.hash()` ▶1-3·1-4 |
| 3 🔴 | `String` 불변 이유 | 풀 공유 안전 · **해시코드 캐시 → Map 키로 빠름** · 스레드 세이프 · 보안(검증 후 바뀌면 안 됨) ▶2-1·2-2 |
| 4 | `String`/`StringBuilder`/`StringBuffer` | 연결마다 새 인스턴스 · 루프 조립은 `StringBuilder` · `StringBuffer` 는 동기화 = 느림 → **실무는 거의 `StringBuilder`** ▶2-4 |
| 5 | 한 줄 연결도 바꿔야 하나 | 아니요 · 한 문장 `+` 는 **컴파일러가 변환** · 문제는 루프 → 반복마다 새 `StringBuilder` · **루프 밖에서 하나** ▶2-3·2-4 |
| 6 | 기본형 vs 참조형 | 값 자체(스택, 8종) / 힙 주소 · 차이 = `null` 가능·제네릭 사용·**메모리 풋프린트**(`int[]` vs `List<Integer>`) |
| 7 | 오토박싱 주의 | 루프 안 박싱 = 그 횟수만큼 `Integer` 생성 · **`null` 언박싱 → NPE** · `Optional`/기본값으로 차단 |
| 8 🔴 | `Integer` `==` 가 값마다 다른 이유 | **캐시 -128~127** 은 같은 인스턴스 · **127 은 되고 128 에서 깨짐** · 래퍼는 반드시 `equals()` ▶1-6·1-7 |
| 9 | `final` 세 곳 | 변수 재대입 금지 / 메서드 오버라이드 금지 / 클래스 상속 금지 · **참조 고정이지 내용 불변 아님**(`final List` 도 `add` 됨) ▶2-5 |
| 10 | `static` 특징·주의 | 클래스 소속, 로드 시 1회 초기화, 전 인스턴스 공유 · 스레드 세이프 아님 · **참조가 남아 GC 안 됨 → 누수** |
| 11 | 오버로딩 vs 오버라이딩 | 같은 이름 다른 인자, **컴파일 시점** 결정 / 부모 메서드 재정의, **실행 시점** 결정(다형성) · 반환 타입만 다르면 오버로딩 아님 |
| 12 | 추상 클래스 vs 인터페이스 | is-a + 상태 공유 / can-do 능력 · 기준 = **다중 상속 필요성** · 망설이면 인터페이스, 공통 구현 필요해지면 추상 클래스 |
| 13 | `default` 메서드 이유 | **기존 구현체 안 깨고 메서드 추가**(`Collection.stream()`) · 같은 시그니처 충돌 시 구현 클래스가 명시 오버라이드 |
| 14 | 접근 제어자 4종 | `public` / `protected`(패키지+상속) / package-private / `private` · 원칙 = **필요 최소한, `private` 부터** |
| 15 | 값 전달 vs 참조 전달 | **항상 값 전달** · 객체는 "참조라는 값"의 복사 · 재대입은 반영 안 됨 / 내용 변경은 반영됨 — 이 구분이 핵심 |
| 16 🔴 | 불변 클래스 만들기 | `final` 클래스 · `private final` 필드 · setter 없음 · 생성자 초기화 · **가변 객체는 받을 때·줄 때 방어적 복사** · `record` 도 복사는 수동 ▶2-6 |
| 17 | `Object` 주요 메서드 | `equals`/`hashCode`/`toString`/`getClass`/`clone`/`wait·notify` · `toString` = 로그 가독성 · **`clone` 은 얕은 복사 → 복사 생성자가 안전** |
| 18 🔴 | 체크 vs 언체크 예외 | 컴파일러 강제(`Exception`) / `RuntimeException` · 기준 = **호출 측이 회복 가능한가** · 파일 없음·통신 실패 = 체크, 프로그램 버그 = 런타임 ▶3-7 |
| 19 | `try-with-resources` | 해제 누락 + `finally` 예외가 원래 예외 지우는 문제 해결 · **역순 close** · 억제 예외(suppressed)로 원인 보존 ▶3-3·3-4 |
| 20 🔴 | `finally` 안 `return` | try 의 `return`·예외를 **덮어써서 원인이 사라짐** · `finally` 에선 `return` 도 `throw` 도 금지 ▶3-1·3-2 |
| 21 | 제네릭 이점 | 컴파일 시점 타입 안전 + 캐스트 불필요 · **오류를 실행 시점 → 컴파일 시점으로 옮기는 장치** |
| 22 | 타입 소거 | 컴파일 후 타입 정보 → `Object` · 구버전 호환 목적 · 제약 = `new T[]` 불가·`instanceof List<String>` 불가·`List<String>`/`List<Integer>` 오버로딩 불가 |
| 23 | `? extends` vs `? super` | **PECS** · 꺼내기만 = `extends` / 넣기 = `super` · `Collections.copy(dest, src)` 선언이 그대로 |
| 24 | `enum` 이점 | 값을 **컴파일 시점에 고정** · 클래스라 필드·메서드 가능 · 구분값별 동작은 `switch` 대신 추상 메서드 → 분기 제거 · 싱글턴 |
| 25 | `record` | 데이터 운반 클래스의 보일러플레이트 제거(생성자·equals·hashCode·toString·접근자) · 암묵 `final`, 필드 전부 `final` · **JPA 엔티티엔 불가** ▶1-5 |
| 26 | `var` 기준 | 우변에서 타입이 명확할 때 · `var result = service.process()` 는 피함 · **그 줄 안에 타입 단서가 있는가** |
| 27 | 클래스 초기화 순서 | 부모 우선 · static 필드·블록(1회) → 인스턴스 필드·블록 → 생성자 본문 · **생성자에서 오버라이드 가능 메서드 호출 → 자식 필드 `null`** |
| 28 | `instanceof` 패턴 매칭 | 체크+캐스트+선언을 한 줄로 `if (o instanceof String s)` · 캐스트 실수 여지 제거 · `switch` 패턴과 조합 |
| 29 | varargs 주의 | 호출마다 **배열 생성** → 핫 패스 낭비 · 오버로딩과 상성 나쁨 · 제네릭 결합 시 비안전 경고 · 정말 불특정일 때만 |
| 30 | 내부 클래스 vs `static` 중첩 | 내부 = 외부 인스턴스 참조 암묵 보유 → **오래 살면 외부까지 누수** · 외부 상태 안 쓰면 `static` 이 원칙 |

---

# Part 2. 컬렉션 (Q31~55)

| Q | 질문 | 키워드 |
|---|---|---|
| 31 | `List`/`Set`/`Map` | 순서+중복 / 중복 불허 / 키-값 · **`Map` 은 `Collection` 상속 안 함** · keySet·values·entrySet 으로 연결 |
| 32 | `ArrayList` vs `LinkedList` | 배열 O(1) 인덱스 / 노드 연결 O(1) 삽입이지만 위치 탐색 O(n) · **실측에선 `ArrayList` 가 이김**(캐시 효율) |
| 33 | `ArrayList` 용량 증가 | 가득 차면 **약 1.5배** 새 배열 + 복사 · 건수 알면 초기 용량 지정 · `HashMap` 도 같은 사고 |
| 34 | `HashSet` 중복 판정 | 내부 = `HashMap` 키 · **`hashCode` 로 버킷 → `equals` 로 비교** 2단 · Q2 와 직결 |
| 35 🔴 | `HashMap` 구조·`put` | 버킷 배열 · `hashCode` → **보조 해시(상위 비트 섞기)** → 길이와 AND 로 인덱스 · 빈 버킷이면 새 노드 / 있으면 `equals` 로 찾아 덮어쓰기 or 추가 · 임계값 초과 시 리사이즈 |
| 36 🔴 | 해시 충돌 | 같은 버킷에 연결 리스트 → O(n) 근접 · **Java 8+: 노드 8 초과 & 배열 64 이상이면 레드블랙 트리 → O(log n)** · 충돌 공격 대책 ▶4-2 |
| 37 | `HashMap` 리사이즈 | 요소 수 > 용량 × 부하율(0.75) · 16 이면 13번째 · **2배 + 전체 재배치** · `new HashMap<>(expected / 0.75 + 1)` |
| 38 🔴 | 키에 가변 객체 | `put` 후 필드 변경 → `hashCode` 변화 → **두 번 다시 못 꺼냄** · 키는 불변 · `String` 이 선호되는 이유 ▶4-1 |
| 39 | `HashMap`/`Hashtable`/`ConcurrentHashMap` | 비동기화·`null` 허용 / 전 메서드 `synchronized`·`null` 불허(안 씀) / **버킷 단위 락, 읽기는 락 없음** ▶4-3·5-4 |
| 40 🔴 | `ConcurrentHashMap` 의 `get` 후 `put` | **안전하지 않다** · 개별 메서드는 원자적, 조합은 아님 · `compute`/`merge`/`putIfAbsent` ▶5-5 |
| 41 | `LinkedHashMap` 용도 | 삽입·접근 순서 유지 · **접근 순서 모드 + `removeEldestEntry` = 몇 줄짜리 LRU** |
| 42 | `TreeMap` | 레드블랙 트리, 항상 정렬 · O(log n) · **범위 검색** `headMap`/`tailMap`/`subMap`/`floorKey`/`ceilingKey` |
| 43 | `Comparable` vs `Comparator` | 클래스 자신의 자연 순서 / 외부 규칙, 여러 개 가능 · `Comparator.comparing(...).thenComparing(...)` |
| 44 | `compareTo` 와 `equals` 정합성 | `TreeSet`/`TreeMap` 은 **`compareTo` 로 동일성 판단** · 어긋나면 `TreeSet` 은 중복 제거, `HashSet` 은 둘 다 들어감 |
| 45 | `ConcurrentModificationException` | 순회 중 직접 변경 · 변경 횟수 어긋남 · fail-fast · `iterator.remove()`/`removeIf` · **단일 스레드에서도 난다** ▶4-4·4-4b·4-5 |
| 46 | `Arrays.asList()` 에 `add` | `UnsupportedOperationException` · **배열을 감싼 고정 길이 뷰** · 교체는 됨 · `new ArrayList<>(...)` 로 재포장 · `List.of()` 는 교체도 불가 |
| 47 | `List.of()` vs `unmodifiableList()` | 복사한 진짜 불변 / **원본 읽기 전용 뷰 → 원본 바꾸면 뷰도 바뀜** · `List.of()` 는 `null` 불허 ▶2-7 |
| 48 | `Iterator` vs `ListIterator` | 앞 방향·`remove` 만 / 양방향·`add`·`set` · 대부분 스트림·`replaceAll` 이 더 읽기 쉬움 |
| 49 | `Queue`/`Deque`/`Stack` | FIFO / 양쪽 끝 / **`Stack` 은 `Vector` 상속 = 전부 동기화 → 안 씀** · LIFO 도 `ArrayDeque` |
| 50 | `BlockingQueue` | 생산자·소비자 분리 · 비면 꺼내는 쪽, 차면 넣는 쪽 자동 대기 · **용량 상한 필수**(무제한 → OOM) · 스레드풀 작업 큐 |
| 51 | `synchronizedList()` 면 안전한가 | 개별 메서드만 · **순회는 직접 `synchronized`** · 같은 락 = 확장 안 됨 · `CopyOnWriteArrayList`/`ConcurrentHashMap` ▶4-9 |
| 52 | `CopyOnWriteArrayList` | 읽기 압도적, 쓰기 드묾 · **쓸 때마다 배열 전체 복사** · 리스너 목록 · 읽기는 락 없음 |
| 53 | 순서 유지 중복 제거 | `LinkedHashSet` · 스트림 `toCollection(LinkedHashSet::new)` · `distinct()` 도 출현 순서 유지 |
| 54 | `keySet` vs `entrySet` 순회 | 값도 쓰면 **반드시 `entrySet`** · `keySet` + `get` = 요소 수만큼 불필요 검색 |
| 55 | 컬렉션에 `null` | 피한다 · 모든 지점에 `null` 체크 · "없음"과 "미설정" 구별 불가 · `List.of`/`ConcurrentHashMap` 은 불허 · 빈 컬렉션·`Optional` |

---

# Part 3. 동시성 (Q56~85)

| Q | 질문 | 키워드 |
|---|---|---|
| 56 | 프로세스 vs 스레드 | 독립 메모리 / 그 안의 실행 흐름 · 힙·메서드 영역 공유, 스택·PC 개별 · **공유해서 빠르고, 공유해서 동기화가 필요** |
| 57 | `Runnable` vs `Callable` | 반환 없음·체크 예외 불가 / 반환·예외 가능 · `Future.get()` · **예외가 `ExecutionException` 으로 전달 → 안 삼킴** ▶6-1 |
| 58 | `Thread` 직접 `new` 안 하는 이유 | 생성 비용 + **개수 제어 불가 → OOM** · 풀 = 상한·재사용·**거부 정책 명시** |
| 59 | `synchronized` 보장 | **상호 배제 + 가시성** · 해제 시 메인 메모리 반영, 획득 시 재독 · 메서드면 인스턴스(static 은 클래스)가 락 · 블록 단위로 좁게 |
| 60 🔴 | `volatile` vs `synchronized` | **가시성·재배치 방지만**, 상호 배제 없음 / 둘 다 · `count++` 는 3단계라 `volatile` 로 못 지킴 · 플래그처럼 **단순 대입·읽기만** ▶5-1·5-2 |
| 61 | 정지 플래그에 `volatile` | 없으면 레지스터·캐시 값 보유 → 갱신 못 알아챔 · **JIT 이 읽기를 루프 밖으로 끌어올림** · "false 로 했는데 안 멈춤" |
| 62 | happens-before | "결과가 반드시 보인다"는 순서 관계(JMM) · `synchronized` 해제→획득 · `volatile` 쓰기→읽기 · `start()` · `join()` · **없으면 보인다는 보장 없음** |
| 63 | `AtomicInteger` 원리 | **CAS**(기댓값 같으면 교체, 실패 시 재시도) · 락 없음 → 경합 적으면 빠름 · 경합 심하면 재시도 폭증 |
| 64 | `LongAdder` vs `AtomicLong` | 한 변수 쟁탈 / **여러 셀에 분산 후 읽을 때 합산** · 쓰기 많고 읽기 적은 카운터 · 자주 읽으면 `AtomicLong` |
| 65 | `ReentrantLock` 쓰는 이유 | **`tryLock` 타임아웃**·인터럽트 가능 대기·공정 모드·여러 조건 변수 · `finally` 에서 `unlock` 누락 위험 → 단순하면 `synchronized` |
| 66 | `ReadWriteLock` | 읽기끼리 병행 · 쓰기 늘면 관리 비용으로 오히려 느림 · 쓰기 **기아** 가능 · 비율 명확할 때만 |
| 67 🔴 | `ThreadLocal` | 스레드별 독립 값(트랜잭션 컨텍스트·트레이스 ID) · **스레드풀 재사용 → `remove()` 안 하면 이전 요청 값이 샘** · 정보 유출+누수 · `finally` 에서 `remove()` ▶6-5 |
| 68 | `wait()` vs `sleep()` | **`wait` 은 락 해제, `sleep` 은 락 쥔 채** · `wait` 은 `synchronized` 안에서만 · 실무는 `BlockingQueue`·`CountDownLatch` |
| 69 | `wait()` 을 `while` 로 | **spurious wakeup** · `notifyAll` 로 여럿 깨어나도 조건 만족은 하나 · 깨어날 때마다 재확인 |
| 70 | `ExecutorService` 안전 종료 | `shutdown()` → `awaitTermination` → `shutdownNow()` 3단계 · 안 부르면 **비데몬 스레드 → JVM 안 꺼짐** ▶6-6 |
| 71 🔴 | 스레드풀 크기 | CPU 바운드 = 코어 수 / I/O 바운드 = **코어 × (1 + 대기/처리)** · 계산식은 출발점, 부하 측정 · **DB 커넥션 풀 상한과 맞춰야** ▶6-8 |
| 72 🔴 | `newFixedThreadPool` 안 쓰는 이유 | **큐 용량 무제한 → 쌓여서 OOM** · `newCachedThreadPool` 은 스레드 무제한 · `ThreadPoolExecutor` 직접 조립(큐 용량+거부 정책) ▶6-2·6-3 |
| 73 | 큐 넘칠 때 선택지 | `Abort`/`Discard`/`DiscardOldest`/`CallerRuns` · **`CallerRunsPolicy` = 호출 측이 처리 → 유입 자연 감속(배압)** · 요청 스레드면 응답 지연 |
| 74 | `Future.get()` 문제·`CompletableFuture` | 블로킹 → 대기 시간 누적 / 콜백 합성 `thenCompose`·`allOf`·`exceptionally` · **타임아웃 반드시** ▶6-7 |
| 75 🔴 | 데드락 원인·방지 | 여러 락을 **다른 순서로** · 4조건(상호 배제·점유 대기·비선점·순환 대기) · **락 획득 순서 통일** + `tryLock` 타임아웃 + 락 범위 축소 ▶5-6 |
| 76 | 데드락 조사 | 스레드 덤프 `jstack`/`jcmd Thread.print` · "Found one Java-level deadlock" · `BLOCKED` 스레드가 기다리는 락과 소유자 · **몇 초 간격으로 여러 번** |
| 77 | 라이브락·기아 vs 데드락 | 완전 정지 / **움직이는데 진전 없음**(서로 양보 재시도) / 특정 스레드만 못 잡음 · 랜덤 대기 / 공정 모드 |
| 78 | `CountDownLatch`/`CyclicBarrier`/`Semaphore` | N개 완료 대기·1회용 / N개 스레드 집합·재사용 / **동시 접근 수 제한**(외부 API 동시 접속) |
| 79 | work stealing | 스레드별 큐, 끝나면 남의 큐 끝에서 훔침 · 부하 자연 평준화 · 병렬 스트림도 사용 · **commonPool 에 블로킹 섞으면 전체가 막힘** |
| 80 | 병렬 스트림 언제 | 요소 많고·CPU 바운드·부작용 없음 · 작은 데이터는 분할 비용으로 느림 · I/O 금지(공통 풀) · `LinkedList` 는 분할 어려움 · **측정해서 빨라졌을 때만** |
| 81 | 가상 스레드가 푸는 문제 | I/O 대기 중 OS 스레드 점유 · 블록 시 OS 스레드 반납 → 수만 개 · **코드 안 바꾸고 처리량 ↑** · 논블로킹 재작성 불필요 |
| 82 | 가상 스레드 주의 | **CPU 바운드엔 효과 없음** · `synchronized` 안에서 블록 = **피닝** → `ReentrantLock` · 풀링하지 않음 |
| 83 | DCL 에 `volatile` | 생성 = 확보·초기화·대입 3단계 · **재배치로 초기화 전 참조가 보임** · `volatile` 로 재배치 금지 · 실무는 `enum`·정적 홀더 |
| 84 | 불변 = 스레드 세이프 이유 | 상태 안 변함 → 경합 자체 없음 · 락 비용 0 · **공유 상태를 줄이는 게 먼저, 락은 마지막 수단** |
| 85 | `InterruptedException` 처리 | 삼키지 않는다 · 다시 던지거나 **`Thread.currentThread().interrupt()` 로 상태 복원** · 잊으면 상위 루프가 중지 요청 못 알아챔 |

---

# Part 4. JVM·GC·메모리 (Q86~115)

| Q | 질문 | 키워드 |
|---|---|---|
| 86 | 런타임 데이터 영역 | 공유 = 힙·메서드 영역 / 스레드별 = JVM 스택·PC·네이티브 스택 · 객체는 힙(GC 대상), 지역 변수·참조는 스택(메서드 끝나면 소멸) |
| 87 | 클래스로더 위임 모델 | 부모 먼저, 못 찾으면 자신 · 부트스트랩→플랫폼→애플리케이션 · 목적 = 안전(가짜 `java.lang.String` 차단) · **다른 로더로 이중 로드 → `ClassCastException`** |
| 88 | GC 의 불필요 판단 | 참조 카운트 아님 · **GC 루트에서 도달 가능성** · 루트 = 스택 지역 변수·정적 필드·JNI · **순환 참조만으로 못 걷히는 일 없음** |
| 89 | 세대 분리 이유 | **약한 세대 가설**("대부분 금방 죽는다") · Young 만 자주·좁게 → 생존자만 복사 · 오래 산 것만 Old 로, 가끔 회수 |
| 90 🔴 | Minor GC vs Full GC | Young 만·짧음 / Old 포함 전체·긴 정지 · 운영에서 볼 것 = **Full GC 빈도와 시간** · Minor 잦은 건 정상, Full 이 수 초 반복이면 누수·힙 부족 |
| 91 | Stop-The-World | GC 중 앱 스레드 전부 정지 · 안전 지점에서 · 줄일 수는 있어도 **0 불가** · 지연 중요 시스템은 합계가 아니라 **최댓값** |
| 92 | G1GC 특징 | 고정 크기 **리전** · 쓰레기 많은 리전부터(Garbage First) · `MaxGCPauseMillis` 목표 지정 · 목표는 힌트 · Java 9+ 기본 |
| 93 | G1 humongous object | **리전 절반 초과 객체 → Old 직행** · 큰 배열 자주 만들면 Old 급속 포화 → Full GC · 리전 크기 ↑ 또는 설계 변경 |
| 94 | GC 알고리즘 선택 | **먼저 바꾸지 않는다**(G1 기본) · 처리량 최우선·배치 = Parallel · 정지 극소·큰 힙 = ZGC/Shenandoah · **전후 측정 필수** |
| 95 | GC 로그에서 볼 것 | Full GC 빈도·정지 / **Full 후 힙이 내려가는가** / GC 시간 비율 · Full 후에도 우상향 = 누수 · 프로덕션 상시 ON |
| 96 🔴 | Java 에 메모리 누수 | 있다 · **불필요한데 참조가 남은 상태** · `static` 컬렉션 추가만 · 리스너 해제 누락 · `ThreadLocal` `remove` 누락 · 상한 없는 캐시 = "버리는 코드를 안 썼다" |
| 97 🔴 | 누수 조사 | GC 로그(Full 후 안 줄어듦) → 힙 히스토그램 2회 비교 `jcmd GC.class_histogram` → 힙 덤프 + MAT 지배 트리 · **늘어나는 것이 아니라 쥐고 있는 것을 찾는다** |
| 98 | OOM 종류 | `Java heap space` / `Metaspace` / `unable to create new native thread` / `GC overhead limit exceeded` · **메시지부터** · 스레드 원인에 힙 늘리면 악화 |
| 99 | 프로덕션 OOM 대비 | **`-XX:+HeapDumpOnOutOfMemoryError` + `HeapDumpPath`** · GC 로그 출력·로테이션 · 장애 후 준비 시작하면 늦다 |
| 100 | Metaspace vs PermGen | 힙 안 / **네이티브 메모리**(힙 GC 밖) · 기본 상한 없음 → 폭주 시 OS 메모리 소진 · `MaxMetaspaceSize` 는 "상한 정하기" 용 |
| 101 | Strong/Soft/Weak/Phantom | 절대 안 걷힘 / 메모리 부족 시(캐시) / 다음 GC 에(`WeakHashMap`) / 값 못 꺼냄, 회수 통지용 · 라이브러리 뒷정리 |
| 102 | `finalize()` 금지 이유 | 호출·시점 보장 없음 · 회수 한 세대 지연 · Java 9 비권장 · `try-with-resources`·`AutoCloseable` · `Cleaner` 는 보험 |
| 103 | `System.gc()` | 부르지 않는다 · 요청이지 강제 아님 · 실행되면 **Full GC → 긴 정지를 자초** · 제거 대상 |
| 104 | JIT | 인터프리터 → 임계값 넘은 메서드·루프를 네이티브 컴파일 · **워밍업 후 자릿수 차이** · 인라이닝·이스케이프 분석은 실행 정보 덕 |
| 105 | 이스케이프 분석 | 메서드 밖으로 안 새면 스택 할당 or 생성 제거 · 락 제거 · **"작은 객체 = 느리다" 아님 → 단순하게 쓰고 측정 후 최적화** |
| 106 | 마이크로벤치마크 3함정 | **워밍업 없음 / 결과 미사용 → 죽은 코드 제거 / 해상도 부족** · 밀리초 비교 위험 · JMH |
| 107 | 평균 대신 퍼센타일 | 평균은 이상치 은폐(90% 10ms + 10% 3s = 평균 300ms) · p95/p99 · **GC 정지는 꼬리에 나타남** |
| 108 | CPU 높을 때 특정 | `top -H` 로 **스레드 단위** · TID 16진수 → `jstack` 의 `nid` 대조 · GC 스레드였다면 메모리 문제 |
| 109 | 샘플링 vs 계측 프로파일러 | 주기적 스택 관찰·저오버헤드·프로덕션 가능 / 전 메서드 삽입·정확하지만 **인라이닝 방해로 실제와 다름** · 샘플링 → 필요 범위만 계측 |
| 110 | JFR 용도 | 프로덕션 **상시 기록**(오버헤드 수 %) · GC·할당·락 경합·I/O·예외 한꺼번에 · JDK 11+ 오픈소스 |
| 111 | 힙 크기 | **`-Xms` = `-Xmx`** · Full GC 후 라이브 데이터의 2~3배 · 크다고 좋지 않음(Full GC 길어짐) · 컨테이너 상한 고려 |
| 112 | 컨테이너 JVM 메모리 | 옛 JDK 는 호스트 메모리 보고 OOM Killer · JDK 10+ cgroup 인식 · **`MaxRAMPercentage` 비율 지정** · 메타스페이스·스택 있으니 100% 금지 |
| 113 | 압축 oop 32GB | 32GB 미만이면 참조 32비트 압축 · **33GB 로 하면 31GB 보다 실질 용량이 줄어드는 역전** · 32GB 전후 회피 |
| 114 | TLAB | 스레드별 Eden 전유 버퍼 · 없으면 할당마다 동기화 · 포인터만 전진 → **Java 객체 생성이 싼 이유** |
| 115 | 예외 비용이 큰 이유 | 예외 자체보다 **스택 트레이스 수집** · **스택 깊이에 비례** · 대책 = 수집 끄기가 아니라 제어 흐름에 예외 안 쓰기 |

---

# Part 5. 모던 자바·실무 (Q116~145)

| Q | 질문 | 키워드 |
|---|---|---|
| 116 | 함수형 인터페이스 | 추상 메서드 하나 · 람다 대입 대상 · `Function`/`Consumer`/`Supplier`/`Predicate` · `@FunctionalInterface` 로 실수 → 컴파일 에러 |
| 117 | 람다 vs 익명 클래스 | **`this` 의미**(자기 자신 / 바깥 인스턴스) · 클래스 파일 생성 / `invokedynamic` 실행 시 해결 · 성능 거의 같음, 기동 클래스 로딩 가벼움 |
| 118 | 람다 외부 변수 제약 | **실질적 final** 만 · 값을 복사해 갖기 때문 · 배열·아토믹 우회보다 **밖의 상태를 바꾸는 설계 자체를 피함** |
| 119 | 중간 vs 종단 연산 | 중간은 새 스트림 반환뿐 **아무것도 실행 안 함** · 종단(`collect`/`forEach`/`count`)에서 파이프라인 가동 · 종단 빠뜨리면 조용히 무동작 |
| 120 | 지연 평가 이점 | 요소가 파이프라인 전체를 한 번에 통과, 답 나오면 중단(`findFirst`) · **처리량이 전체 건수가 아니라 답까지의 거리에 비례** ▶7-2 |
| 121 | 스트림에서 피할 것 | `forEach` 안 외부 상태 변경(병렬 시 깨짐) → `collect`/`reduce` · 무리한 한 줄기 → 중첩 깊으면 `for` 가 낫다 |
| 122 | `map` vs `flatMap` | 일대일 변환 / 요소 → 스트림 → 평탄화 · `List<List<String>>` · `Optional.flatMap` 은 중첩 제거 |
| 123 | `reduce` vs `collect` | 하나의 값(합계·최댓값) / 가변 컨테이너(리스트·맵) · **`reduce` 문자열 연결은 매번 새 `String` → `Collectors.joining`** |
| 124 | `groupingBy` | 키별 묶기 · `computeIfAbsent` 루프 대체 · **다운스트림 컬렉터** `groupingBy(부서, counting())` · 3단 이상은 나눠 쓴다 |
| 125 | `Optional` 목적·사용법 | "없을 수 있음"을 타입으로 · **반환값에만** · `get()` 대신 `orElse`/`orElseGet`/`orElseThrow` · `isPresent`+`get` 은 `null` 체크 바꿔 쓴 것 ▶7-7 |
| 126 | `orElse` vs `orElseGet` | **`orElse` 는 값이 있어도 인자를 평가** · `orElseGet` 은 필요할 때만 · DB 접근 기본값은 `orElseGet` · 상수면 `orElse` ▶7-6 |
| 127 | `LocalDateTime`/`ZonedDateTime`/`Instant` | 벽시계(존 없음) / 존 포함 / UTC 절대 시각 · **저장·통신은 `Instant`/UTC, 표시할 때만 존** · `LocalDateTime` 저장 = 서버 존 바뀌면 의미 변화 |
| 128 | 옛 `Date`·`Calendar` 문제 | 가변 · 스레드 비안전 · 월 0부터 · 존 모호 · **`SimpleDateFormat` static 공유 → 드물게 깨진 날짜** · `java.time` 은 불변 |
| 129 | `Serializable` 문제 | **역직렬화 공격** · 클래스 변경 시 호환 깨짐 · 성능 · 외부 통신은 JSON · 쓰면 `serialVersionUID` 명시 + 기밀 `transient` |
| 130 | 버퍼 없는 I/O 가 느린 이유 | 1바이트마다 **시스템 콜** · `BufferedInputStream` 8KB 단위 → `read()` 대부분 메모리 접근 · 하부 호출 수만 분의 1 |
| 131 | NIO vs IO | 버퍼·채널 지향, 논블로킹 · `Selector` 로 한 스레드 다중 접속 · 단순 파일은 `Files.readAllLines` · **가상 스레드 이후 다중화 목적 NIO 필요성 ↓** |
| 132 | 리플렉션 | 실행 시 클래스 정보로 동적 접근 · 프레임워크 DI·ORM · 컴파일 타입 체크 없음 · `private` 뚫림 · 느림 · 앱 코드에선 거의 안 씀 |
| 133 | 어노테이션 보존 정책 | `SOURCE`(컴파일 시 소멸, `@Override`) / `CLASS` / `RUNTIME`(리플렉션, `@Autowired`) · **누가 언제 읽는가에서 역산** |
| 134 | 상속 관계의 `equals` | **대칭성 깨지기 쉬움** · `instanceof` = 자식 허용 / `getClass()` = 서브클래스 전부 `false` · 컴포지션 or 값 클래스 `final` |
| 135 | 상속보다 컴포지션 | 부모 구현 세부에 의존 · 부모가 내부 호출하면 오버라이드 시 이중 실행 · 패키지 넘는 상속 위험 · **is-a + 확장 의도 설계된 경우만** |
| 136 | 정적 팩토리 선호 이유 | **이름을 붙일 수 있다**(`of`/`from`/`valueOf`) · 캐시 반환 가능 · 서브타입 반환 가능 · `List.of`·`Optional.of` |
| 137 | 빌더 패턴 언제 | 인자 많고 상당수 선택 · `new Order(null, null, 3, null)` 회피 · `build()` 에서 필수 검증 · **3개 정도면 과함 → `record`·팩토리** |
| 138 | 안전한 싱글턴 | **`enum`**(유일성·직렬화·리플렉션 복제 방지) · 정적 홀더(클래스 로딩으로 지연+안전) · DCL 직접 안 씀 · Spring 이면 컨테이너에 |
| 139 | 단위 테스트 의식 | 하나의 테스트 = 하나 검증 · **이름으로 무엇을 보장하는지** · 구현 아닌 동작 검증 · 호출 횟수 검증 = 리팩터링마다 깨짐 |
| 140 | 목 과다 문제 | 자기 기대대로 도는 것만 확인 → **전부 녹색인데 프로덕션에서 깨짐** · 외부 경계에만 목 · DB 는 실물(Testcontainers) |
| 141 | 로깅 주의 | 플레이스홀더(`"x={}"`; 연결은 레벨 꺼져도 실행) · **예외는 스택 트레이스째** · 개인정보 금지 · **나중에 재구성 가능한가** |
| 142 | 예외 삼키기 위험 | 사실 자체가 사라짐 → 뒷단에서 엉뚱한 곳에서 죽음 · 무시한다면 **왜 무시해도 되는지 주석** · 못 쓰면 무시하면 안 되는 예외 |
| 143 | 독자 예외 기준 | **호출 측이 종류로 처리를 바꾸는가** · 아니면 `IllegalArgumentException` 으로 충분 · 만들면 `cause` 반드시 인계(스택 보존) |
| 144 | 코드 리뷰 중시점 | **나중에 바꾸는 비용이 큰 것**(의존 방향·DB 스키마) 우선 · 기계 판정 가능한 건 CI 로 · `must`/`imo`/`nits` 라벨 |
| 145 | 새 버전 추종 | LTS 기준 · 릴리스 노트의 **비권장·삭제 먼저** · 작은 프로젝트에서 실제 실행 · 가상 스레드 피닝처럼 **만져 봐야 아는 제약** |

---

# 🚨 함정 문항 (틀리면 즉시 감점)

| Q | 함정 | 정답 방향 |
|---|---|---|
| 8 | "`Integer` 도 `==` 로 비교하면 된다" | 캐시 -128~127 밖에서 깨진다 ▶1-6·1-7 |
| 9 | "`final` 이면 불변이다" | 참조 고정일 뿐. `final List` 도 `add` 된다 ▶2-5 |
| 15 | "객체는 참조 전달이다" | 항상 값 전달. 참조라는 값이 복사된다 |
| 20 | `finally` 의 `return` 은 안전 | try 의 `return`·예외를 덮어써 원인이 사라진다 ▶3-1·3-2 |
| 38 | 아무 객체나 `HashMap` 키로 | 가변 키는 `put` 후 바꾸면 못 꺼낸다 ▶4-1 |
| 40 | "`ConcurrentHashMap` 이면 `get` 후 `put` 도 안전" | 조합은 원자적이지 않다 → `compute`/`merge` ▶5-5 |
| 45 | "`ConcurrentModificationException` 은 멀티스레드 문제" | 단일 스레드에서도 난다 ▶4-4 |
| 47 | "`unmodifiableList` 면 불변" | 뷰일 뿐. 원본 바꾸면 따라 바뀐다 ▶2-7 |
| 60 | "`volatile` 이면 `count++` 도 안전" | 가시성만. 상호 배제는 없다 ▶5-1·5-2 |
| 67 | `ThreadLocal` 은 쓰고 잊어도 된다 | 풀 재사용 → 이전 요청 값이 샌다 ▶6-5 |
| 72 | `Executors.newFixedThreadPool` 은 프로덕션 기본 | 큐 무제한 → OOM ▶6-2·6-3 |
| 88 | "순환 참조는 GC 가 못 걷는다" | 도달 가능성 방식이라 걷힌다 |
| 96 | "GC 가 있으니 Java 엔 누수가 없다" | 참조가 남은 누수는 있다 |
| 103 | `System.gc()` 로 메모리 정리 | 요청일 뿐이고, 되면 Full GC 를 자초 |
| 126 | `orElse` 와 `orElseGet` 은 같다 | `orElse` 는 값이 있어도 인자를 평가 ▶7-6 |

---

# 📌 S급 18문항 (시간이 없으면 이것만)

**언어 기초 (6)** Q2 `equals`·`hashCode` ▶1-3 · Q8 `Integer` 캐시 ▶1-6 · Q3 `String` 불변 ▶2-1 · Q16 불변 클래스 ▶2-6 · Q18 체크/언체크 ▶3-7 · Q20 `finally` `return` ▶3-1
**컬렉션 (4)** Q35 `HashMap` 구조 · Q36 해시 충돌 ▶4-2 · Q38 가변 키 ▶4-1 · Q40 `get` 후 `put` ▶5-5
**동시성 (5)** Q60 `volatile` ▶5-1 · Q67 `ThreadLocal` ▶6-5 · Q71 풀 크기 ▶6-8 · Q72 `newFixedThreadPool` ▶6-2 · Q75 데드락 ▶5-6
**JVM·GC (3)** Q90 Minor/Full · Q96 누수 형태 · Q97 누수 조사

---

# 💡 사용 순서

1. **매일 아침 5분** — 그날 학습할 Part 의 키워드만 훑기
2. **학습 중** — 키워드만 보고 일본어로 말하기 → 녹음 → [`Part1`](../java-면접/Part1.md)~[`Part5`](../java-면접/Part5.md) 원문 대조
3. **▶ 문항은 한 번은 돌려 본다** — `./gradlew :java-tutorial:test` (인프라 없이 돈다)
4. **면접 전날** — 함정 15개 + S급 18문항 키워드만
5. **면접 당일** — [`필수-키노트`](../java-면접/필수-키노트.md) 의 **일본어 한 문장 18개**
