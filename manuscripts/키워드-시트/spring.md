# Spring Boot Q1~Q145 키워드 시트
## 145문항 · 한 문서 · 매일 훑기 / 면접 직전용

> **사용법**: 키워드만 보고 일본어로 말할 수 있으면 실전 가능선. 원문은 [`../spring-면접/`](../spring-면접/README.md).
> **굵은 글씨** = 다른 지원자와 차이를 만드는 차별화 포인트. 시간이 없어도 이것만은 반드시.
> 🔴 = [`필수-키노트`](../spring-면접/필수-키노트.md) 의 **S급 18문항**(반드시 나온다).
> **✅`SPRING-01`** = 이 저장소에서 **실물 DB 위에서 실행으로 확인한 케이스**(`verify-labs`). `./gradlew test -Dverify.only=SPRING-01` 로 돌려 볼 수 있다.
> **▶3-2** = [`spring-tutorial/`](../../spring-tutorial/README.md) 의 **실행 레슨 번호**. 인프라 없이 `./gradlew :spring-tutorial:test` 로 돈다.
>
> **Spring 함정의 절반은 한 문장이다 — "프록시를 안 거치면 안 걸린다."** (Q33·35·36·47·104)

---

# Part 1. 코어·DI·빈·자동 구성 (Q1~30)

| Q | 질문 | 키워드 |
|---|---|---|
| 1 | DI 컨테이너가 푸는 문제 | 생성·의존 해결을 쓰는 쪽에서 분리 · `new` 안 씀 → 구현 교체해도 호출 측 무수정 · **효과가 가장 뚜렷한 곳 = 테스트**(DB·외부 API 를 테스트용으로) |
| 2 | IoC 와 DI 관계 | IoC = 제어의 역전(넓은 개념) · DI = 그 수단 중 하나 · **동의어 아님** · Template Method 도 IoC |
| 3 🔴 | 주입 세 방식 중 무엇 | **생성자 주입** · `final` 불변 · 필수 의존이 시그니처에 드러남 · `new` 만으로 테스트 · 필드 주입은 리플렉션 없이 인스턴스화 불가 · **생성자가 길면 책임 과다 신호** ▶1-1 |
| 4 🔴 | 순환 참조 | A↔B · 생성자 주입이면 기동 에러 · Boot 2.6+ 기본 금지 · 우회 설정은 대증요법 · **본질은 책임 분할 오류** → 제3 클래스 추출 or 이벤트 ▶1-2 |
| 5 | 같은 타입 빈 여러 개 | `@Qualifier` 이름 / `@Primary` 기본 · **`List<Strategy>` 로 받으면 전부 주입 → 전략 패턴 확장** |
| 6 | 빈 스코프 | singleton(기본, 컨테이너당 1) · prototype · request/session/application · **빈에 상태를 두지 않는 게 전제**(요청 간 섞임) ▶2-1·2-2 |
| 7 🔴 | 싱글턴에 프로토타입 주입 | 기대대로 안 됨 · 주입은 싱글턴 생성 시 1회 → **계속 같은 인스턴스** · `ObjectProvider.getObject()` / `@Lookup` ✅`SPRING-05` ▶2-3·2-4 |
| 8 | 빈 생명주기 | 생성 → 주입 → `Aware` → `BeanPostProcessor` 전처리 → `@PostConstruct` → 후처리 → 사용 → `@PreDestroy` · **AOP 프록시는 후처리 단계에서 씌워짐** |
| 9 | `@Component` vs `@Bean` | 직접 쓴 클래스 / **외부 라이브러리 클래스**(어노테이션 못 붙임) · `@Bean` 은 메서드라 생성 로직·조건 분기 가능 |
| 10 | `@Configuration` 안에서 `@Bean` 직접 호출 | 싱글턴 유지 · **CGLIB 프록시가 호출 가로채 컨테이너 것 반환** · `proxyBeanMethods = false` 면 매번 새 인스턴스 ▶1-5 |
| 11 | 컴포넌트 스캔 범위 | `@SpringBootApplication` 클래스의 패키지 + 하위 · **메인 클래스는 루트 패키지에** · 다른 트리는 `@ComponentScan` 명시 or 자동 구성 |
| 12 | `ApplicationContext` vs `BeanFactory` | DI 최소 기능 / + 국제화·이벤트·리소스·AOP · **기동 시 싱글턴 미리 생성 → 설정 실수가 기동 시점에 실패** |
| 13 | 지연 초기화 | 전체 적용 피함 · 설정 실수가 첫 요청에서야 드러남 · 무거운 빈만 `@Lazy` · **전체 설정이 아니라 개별 지정** |
| 14 🔴 | 자동 구성 동작 | `@EnableAutoConfiguration` 이 `META-INF/spring/...AutoConfiguration.imports` 읽음 · `@ConditionalOnClass`·`@ConditionalOnMissingBean` 으로 **조건 맞는 것만 활성화** → 의존만 넣으면 설정이 들어온 듯 보임 |
| 15 | 자동 구성 덮어쓰기 | **같은 타입 빈을 직접 정의**(`@ConditionalOnMissingBean` 덕에 우선) · 안 되면 `exclude = ...` · `--debug` 조건 평가 리포트 |
| 16 | `@ConditionalOn...` 종류 | `OnClass`(클래스패스) / `OnMissingBean`(빈 없을 때) / `OnProperty`(설정값) / `OnWebApplication` · **`OnMissingBean` = 이용자가 덮어쓸 여지의 정석** |
| 17 | 스타터 | 관련 의존 꾸러미(`starter-web` = MVC+Tomcat+Jackson) · 버전은 부모 BOM · **의존 조합 고민 시간을 없애는 것** |
| 18 | 설정 외부화 | `application.yml` + 프로파일 · 우선순위: 커맨드라인 > 환경변수 > 프로파일별 > 기본 · **인증 정보는 파일에 안 씀** → 환경변수·Vault·Parameter Store |
| 19 | `@Value` vs `@ConfigurationProperties` | 한두 개 / 관련 묶음 · 타입 안전 · **`@Validated` 로 기동 시 검증** · IDE 자동완성 ▶6-1·6-4·6-5 |
| 20 | 프로파일 주의 | `application-dev.yml` + `spring.profiles.active` · `@Profile` · **분기 과다 → 프로덕션에서만 동작하는 구성** · 차이는 접속 대상·로그 레벨까지, 로직은 안 바꿈 |
| 21 | yml vs properties | 계층 깊으면 yml · yml 은 들여쓰기·리스트 실수 · 기능 동일 → **팀 통일이 더 중요** · 혼재 금지 |
| 22 | `CommandLineRunner`/`ApplicationRunner` | 기동 완료 후 1회(초기 데이터·헬스체크) · 차이 = 인자 파싱 · **여기서 예외 = 기동 실패** |
| 23 | `ApplicationEvent` 언제 | 결과 불필요한 통지(메일·통계) · 결합 느슨 · **기본 동기·같은 트랜잭션** · 비동기면 트랜잭션 전파 안 됨 · 커밋 후 = `@TransactionalEventListener` ▶7-4 |
| 24 | 설정이 적은 이유 | 관례에 의한 설정 · 자동 구성 + 스타터 + 내장 서버 · XML/JavaConfig 를 **조건부 기본값으로 제공** |
| 25 | 내장 서버 | 산출물에 서버 포함 → 환경별 준비 불필요 · 컨테이너 상성 · **서버 튜닝도 앱 설정**(스레드 상한·타임아웃 기본값 재검토) |
| 26 | Fat JAR 구조 | `BOOT-INF/classes` + `BOOT-INF/lib` 에 **JAR 그대로**(리소스 충돌 없음) · 전용 로더 · 컨테이너는 **레이어 분할 빌드**(의존은 안 바뀜) |
| 27 | 빈 등록 확인 | `--debug` 조건 평가 리포트(왜 비활성인지까지) · Actuator `beans` · "라이브러리가 안 먹는다"면 먼저 여기 |
| 28 | 빈 이름 충돌 | 기동 에러 · 덮어쓰기는 Boot 2.1+ 기본 금지 · 공통 라이브러리 빈은 **패키지 포함 구체적 이름** |
| 29 | `@SpringBootApplication` 구성 | `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan` · 개별로 쓸 수도 |
| 30 | 기동 시간 단축 | **먼저 측정**(`--debug`·Actuator `startup`) · 미사용 자동 구성 제외 · 스캔 범위 축소 · 무거운 빈만 `@Lazy` · GraalVM 은 제약 큼 |

---

# Part 2. AOP·트랜잭션 (Q31~55)

| Q | 질문 | 키워드 |
|---|---|---|
| 31 | AOP 가 푸는 문제 | 로그·트랜잭션·인가 = **횡단 관심사** 를 한 곳에 · 없으면 모든 메서드 앞뒤에 같은 코드 · 대상을 선언으로 지정 |
| 32 | AOP 용어 | Aspect(묶음) · Advice(실행 처리) · Pointcut(조건) · Join Point(지점) · **Spring AOP 의 Join Point 는 메서드 실행뿐**(필드·생성자 X) |
| 33 | Spring AOP 구현 방식 | 실행 시 **프록시** 생성 → 빈으로 등록 · AspectJ 는 바이트코드 · **프록시 안 거치는 호출엔 적용 안 됨 = 제약의 뿌리** ▶3-1 |
| 34 🔴 | JDK 동적 프록시 vs CGLIB | 인터페이스 구현체(**인터페이스 필수**) / 상속 서브클래스 · Boot 기본 CGLIB · **`final` 클래스·메서드엔 못 검** ✅`SPRING-02` ▶3-4·3-5 |
| 35 🔴 | 같은 클래스 안 호출에 `@Transactional` 안 걸림 | **자기 호출은 프록시를 안 거침**(`this.method()` = 원본) · 대처 = 다른 빈으로 분리 / 자기 프록시 주입 / AspectJ · **첫 번째가 가장 깔끔** ✅`SPRING-01` ▶3-2·4-6 |
| 36 | `private` 에 `@Transactional` | 안 걸림 · CGLIB 은 상속이라 오버라이드 불가 · **에러 없이 조용히 무시** → `public` 화 or 다른 빈 |
| 37 | `@Transactional` 동작 | 프록시가 앞뒤에 · 시작(커넥션 확보) → 커밋 / 대상 예외면 롤백 · **커넥션은 `ThreadLocal` → 같은 스레드 안에서만** · `@Async` 로 안 이어짐 ▶4-1 |
| 38 🔴 | `REQUIRED` vs `REQUIRES_NEW` | 참여 → **안쪽 롤백이 바깥도 말려듦** / 기존 중단 + 새 트랜잭션·다른 커넥션 → 바깥 롤백해도 안쪽 남음 · 감사 로그 ✅`SPRING-03` ▶4-5 |
| 39 | `REQUIRES_NEW` 주의 | **커넥션 2개** · 풀 부족하면 **자기가 자기를 기다리는 데드락** · 같은 행 건드리면 락 대기 ▶4-5 |
| 40 | 다른 전파 옵션 | `SUPPORTS` / `MANDATORY`(없으면 예외 = 의도 표명) / `NOT_SUPPORTED` / `NEVER` / `NESTED`(세이브포인트) · 실무는 거의 `REQUIRED`·`REQUIRES_NEW` |
| 41 | 격리 수준 | RU(더티 리드) / RC / RR(재읽기 일관) / SERIALIZABLE · 기본값 사용 · **PostgreSQL·Oracle = RC, MySQL = RR → DB 옮기면 동작 변화** |
| 42 🔴 | 어떤 예외에 롤백 | 기본 = `RuntimeException`·`Error` 만 · **체크 예외는 롤백 안 하고 커밋** · `IOException` 던졌는데 데이터 남음 · `rollbackFor` · 처음부터 런타임으로 감쌈 ✅`SPRING-04` ▶4-2·4-3 |
| 43 | `catch` 하면 롤백은 | 삼키면 프록시까지 안 가서 **커밋** · 단 안쪽 `REQUIRED` 가 rollback-only 표시 → 바깥이 커밋하려 하면 `UnexpectedRollbackException` ▶4-4·4-7 |
| 44 | `readOnly = true` | JPA 플러시 `MANUAL` + 스냅샷 없음 → 가벼움 · 레플리카 라우팅 표식 · **쓰기를 막는 보장은 아님** |
| 45 🔴 | 트랜잭션 안 외부 API | 피한다 · 상대 느리면 **커넥션 계속 점유 → 풀 고갈 → 전체 정지** · 함께 롤백 불가 · **커밋 후 이벤트** or Outbox ▶4-8 |
| 46 | 트랜잭션 범위 | 서비스 계층(여러 리포지토리를 업무 단위로) · 컨트롤러면 뷰 렌더링까지 · **필요 최소한**, 단 업무상 한 덩어리 유지 |
| 47 🔴 | `@Transactional` 안 걸리는 경우 5 | 자기 호출 · `private` · `final` · 빈 아닌 클래스 · 다른 스레드 · 공통점 = **프록시를 안 거침** · `isActualTransactionActive()` 로 확인 ▶3-3·3-5·4-6 |
| 48 | `@Async` 가 트랜잭션 이어받나 | 안 이어받음 · `ThreadLocal` 이라 스레드 바뀌면 끊김(`SecurityContext`·`MDC` 도) · 비동기 쪽에 다시 `@Transactional` · **커밋 전 실행 → 안 보이는 데이터 읽음** ▶7-6 |
| 49 | 커밋 후 처리 | `@TransactionalEventListener(AFTER_COMMIT)` · 성공 시만 · 롤백이면 미실행 → **존재하지 않는 주문 알림 방지** |
| 50 | 선언적 vs 프로그램적 | 기본 `@Transactional` · `TransactionTemplate` 은 **메서드보다 잘게**(일부만·루프 단위 커밋) |
| 51 | 테스트에 `@Transactional` | 종료 시 자동 롤백 · 함정 = **테스트와 프로덕션 코드가 같은 트랜잭션 → 별개 트랜잭션 문제 놓침** · `AFTER_COMMIT` 리스너 안 돎 |
| 52 | 여러 Advice 순서 | `@Order`/`Ordered` · 작을수록 바깥 · 미지정 = 보장 없음 · **재시도 Aspect 가 트랜잭션 안쪽이면 같은 깨진 트랜잭션을 재시도** ▶3-6 |
| 53 | `@Around` vs 나머지 | `@Around` 만 실행 제어(`proceed()` 안 부르면 미실행, 반환값 교체) · 책임 무거움 · **필요 최소한의 Advice**(`@Before`/`@AfterReturning`) |
| 54 | `@Repository` 효과 | 스캔 + **예외 변환**(JDBC/JPA 고유 → `DataAccessException` 계층) · DB 바꿔도 `DuplicateKeyException` 잡는 코드 그대로 |
| 55 | AOP 자작 시 주의 | Pointcut 너무 넓게 X(패키지·어노테이션 한정) · **Aspect 안에서 예외 삼키지 않기** · 로그 남겼으면 다시 던짐 |

---

# Part 3. Web·MVC·REST (Q56~85)

| Q | 질문 | 키워드 |
|---|---|---|
| 56 🔴 | 요청 → 응답 흐름 | `DispatcherServlet` → `HandlerMapping` → `HandlerAdapter`(앞뒤 `HandlerInterceptor`) → `@ResponseBody` 면 `HttpMessageConverter` / 뷰면 `ViewResolver` → 예외는 `HandlerExceptionResolver` · **입구가 하나** |
| 57 | `@Controller` vs `@RestController` | 후자 = `@Controller` + `@ResponseBody` · API / SSR · 섞으면 문자열이 뷰 이름으로 해석 → 404 |
| 58 | `@RequestParam`/`@PathVariable`/`@RequestBody` | 쿼리(필터·페이징) / URI 식별자 / 본문 · **무엇을 가리키나 = 경로, 어떻게 좁히나 = 쿼리, 무엇을 보내나 = 바디** · GET 바디 X |
| 59 | `HttpMessageConverter` | 요청 바디 ↔ 객체 · `Content-Type`·`Accept` 로 선택 · Jackson · **날짜 포맷·스네이크 케이스는 `ObjectMapper` 설정에서 일괄** |
| 60 | 입력 검증 | DTO 에 `@NotNull`·`@Size` + `@Valid` → `MethodArgumentNotValidException` · **`@RestControllerAdvice` 에서 잡아 통일 형식**(어느 필드가 왜) ▶5-3 |
| 61 | `@Valid` vs `@Validated` | 표준 / Spring 확장 · **그룹 지정** + 클래스에 붙여 메서드 인자 검증 · 등록·수정 필수 다르면 `@Validated` |
| 62 | 예외 처리 설계 | `@RestControllerAdvice` 집약 · **업무 예외 vs 시스템 예외 분리** · **내부 정보 비노출**(스택·SQL) → 밖엔 코드+메시지, 상세는 로그 |
| 63 | 에러 응답 형태 | HTTP 상태 = 대분류 · 바디 = 기계용 코드 + 사람용 메시지 + 필드별 상세 · **RFC 7807 `ProblemDetail`(Boot 3 내장) 먼저 검토** |
| 64 🔴 | 상태 코드 구분 | 4xx 클라이언트 / 5xx 서버 · 401 미인증 / 403 권한 없음 / 404 / 400 검증 · **에러를 200 + 플래그로 = 재시도·모니터링·캐시 전부 불능** ▶5-5·5-6 |
| 65 | 멱등 메서드 | GET·PUT·DELETE·HEAD / POST 는 아님 · 멱등 = **안심하고 재시도** · POST 중복 치명적이면 `Idempotency-Key` ▶5-6 |
| 66 🔴 | Filter/Interceptor/AOP | 서블릿 레벨(DispatcherServlet 밖) / MVC 내부 핸들러 앞뒤 / 빈 메서드 단위 · 인코딩·보안 / 핸들러 정보 필요한 인가·로깅 / 업무 메서드 · **어느 레이어 정보가 필요한가** ▶5-7 |
| 67 | CORS·프리플라이트 | 동일 출처 정책을 서버가 헤더로 완화 · 프리플라이트 = 단순 요청 벗어날 때(`PUT`/`DELETE`·`application/json`·커스텀 헤더) · **와일드카드 금지** |
| 68 | API 버저닝 | URI `/v1/orders` 가 실무 표준 · 헤더 방식은 확인·캐시 번거로움 · **애초에 버전 안 올려도 되는 변경**(필드 추가는 호환) · 삭제·타입 변경만 이유 |
| 69 | 페이징 설계 | 소규모 오프셋(`Pageable`) · **깊은 페이지에서 급격히 느림** → 커서 방식 · **총 건수 불필요하면 `Slice`** |
| 70 | DTO 와 엔티티 분리 | 내부 구조 노출 · **지연 로딩 건드려 `LazyInitializationException`·무한 순환** · API 사정으로 엔티티 변경 · 경계에서 옮겨 담기 |
| 71 | `RestTemplate` vs `WebClient` | 신규 `WebClient`(유지보수 모드 vs 동기도 가능) · Framework 6 `RestClient` · **무엇이든 타임아웃 필수**(기본 무제한 → 스레드 안 돌아옴) |
| 72 | 외부 API 장애 대비 | 접속+읽기 타임아웃 → 멱등 조작만 지수 백오프+지터 재시도 → 서킷브레이커 · **상대 죽었는데 재시도 = 자기까지 쓰러짐** · 폴백 |
| 73 | 재시도 × 서킷브레이커 순서 | 재시도 바깥 = 실패 여러 번 집계 → 빨리 열림 / CB 바깥 = 재시도 전체 1회 · **최소 시행 횟수 못 채워 안 열리는 사태** 회피 · 설정+순서 세트 |
| 74 | 레이트 리밋 | 카운터는 Redis 중앙(**인메모리 = 인스턴스 수만큼 샘**) · 토큰 버킷(고정 윈도우는 경계에서 2배) · Redis 죽으면 통과/차단 먼저 결정 |
| 75 | MVC 스레드 모델 | 요청당 스레드 1개, 응답까지 담당 · 직관적·디버깅 쉬움 · **동시 처리 = 스레드 수에서 막힘** · DB·외부 대기 중 블록 |
| 76 🔴 | Tomcat 스레드풀 | `server.tomcat.threads.max`(기본 200) · **뒷단 상한과 맞춘다** · 스레드 400 인데 커넥션 풀 20 이면 380 은 대기 · 부하 시험으로 처리량 안 느는 지점 |
| 77 | WebFlux vs MVC | 소수 이벤트 루프 논블로킹 · 대기 긴 처리 대량 · **전 경로 논블로킹 아니면 무의미**(블로킹 JDBC 하나면 전체 정지) · 기존 자산 있으면 가상 스레드 |
| 78 | Boot 가상 스레드 | `spring.threads.virtual.enabled=true` · **코드 안 바꾸고** 동시성 ↑ · CPU 바운드 무효 · `synchronized` 피닝 · **스레드 수가 상한 역할 상실 → 뒷단 보호 별도** |
| 79 | 비동기 구현 | `@Async` + `@EnableAsync` · **기본 Executor 그대로 X** → 전용 `ThreadPoolTaskExecutor`(큐 용량·거부 정책) · `void` 반환이면 예외 소실 → `CompletableFuture` |
| 80 | 요청별 정보 하위 전달 | 인자 vs `MDC`/`ThreadLocal`(트레이스 ID) · **비동기·다른 스레드로 안 넘어감** → 명시적 복사 · 재사용 스레드라 마지막에 반드시 삭제 ▶7-6 |
| 81 | 파일 업로드 | `max-file-size` 상한 · 파일 이름 그대로 X(경로 구분자) · **확장자가 아니라 실제 내용으로 종류 확인** · 웹 직접 배포 안 되는 위치 |
| 82 | 큰 응답 | 한 번에 메모리 X → `StreamingResponseBody`·`ResponseEntity<Resource>` · 페이징·필드 축소·압축 · **원격일수록 바이트 수가 응답 시간 지배** |
| 83 | SSE vs WebSocket | 단방향 / 양방향 · SSE = HTTP 위·프록시 통과·자동 재접속 · LLM 토큰 스트리밍은 SSE 로 충분 |
| 84 | 스케일 아웃 시 WebSocket | 접속이 인스턴스에 고정 → **다른 인스턴스 상대에게 전달 불가** · 백플레인(Redis Pub/Sub) · 유실 불허면 본체 DB + Pub/Sub 은 통지만 |
| 85 | 스테이트리스 중요성 | 어느 인스턴스든 같은 결과 → 수평 확장 자유 · 인메모리 세션·카운터 = **인스턴스마다 상태 어긋남**(레이트 리밋 샘·로그인 날아감) · Redis·DB 로 |

---

# Part 4. 데이터 접근 (Q86~115)

| Q | 질문 | 키워드 |
|---|---|---|
| 86 | 영속성 컨텍스트 | 엔티티 관리 1차 캐시 · 트랜잭션 동안 같은 ID = 동일 인스턴스 · 두 번 읽어도 SQL 1회 · 변경 추적 → 자동 UPDATE · **끝나면 관리 이탈 → 이후 지연 로딩 실패** |
| 87 | 더티 체킹 | 읽은 시점 스냅샷 vs 플러시 시점 비교 → UPDATE · `save()` 없이 갱신 · **의도치 않은 변경도 반영** · 읽기 메서드는 `readOnly = true` |
| 88 | 플러시 시점 | 커밋 · **JPQL 실행 직전**(미반영 변경이 있으면 결과 부정확하므로 먼저 씀) · `flush()` · "저장 안 했는데 SELECT 에 반영" 의 이유 |
| 89 🔴 | N+1 | 목록 1회 + 요소마다 연관 N회(100건 = 101회) · 지연 로딩 + 루프 안 접근 · **개발 환경에선 안 보이고 프로덕션 데이터 양에서 드러남** ✅`JPA-01` |
| 90 | N+1 해결 | `join fetch` 1회 SQL · 여러 연관·많은 건수 = `@BatchSize`/`default_batch_fetch_size`(IN 절로 101 → 2) · **SQL 로그로 실제 줄었는지 확인** |
| 91 | `@ManyToOne` EAGER 위험 | 불필요할 때도 항상 JOIN · 연쇄 · **JPQL 조회 시 본체 먼저 → 연관 개별 = 오히려 N+1** · 원칙 전부 LAZY + 필요한 곳 fetch join |
| 92 🔴 | fetch join + 페이징 | 컬렉션 fetch join 에 페이징 = **limit 없이 전체 로드 후 메모리 페이징** · 경고 HHH90003004 만, 예외 아님 → 데이터 늘면 OOM · 본체만 페이징 + `@BatchSize` · ToOne 은 병용 가능 ✅`JPA-06` |
| 93 | `LazyInitializationException` | 컨텍스트 닫힌 뒤 지연 로딩 접근 · 대처 = 트랜잭션 안에서 미리 로드 / DTO 변환 / OSIV(비권장) |
| 94 🔴 | OSIV 끄는 이유 | 켜면 **뷰 렌더링 끝까지 커넥션 보유** → 트래픽 늘면 풀 고갈·전체 정지 · Boot 기동 경고 · **끄면 나는 예외는 문제가 드러난 것일 뿐** ✅`JPA-03` |
| 95 | 메서드 이름 쿼리 한계 | 조건 두세 개까지 · 이상은 `@Query` JPQL / QueryDSL · **메서드 이름은 명세서가 아니다** |
| 96 | `save()` 는 항상 INSERT 인가 | 아니요 · 신규 판정(ID `null`) → 기존이면 `merge` · **ID 직접 채번 시 신규인데 `merge` → 불필요 SELECT** · `Persistable` / `persist` |
| 97 | 대량 삽입 | `hibernate.jdbc.batch_size` + 주기적 `flush`·`clear`(안 하면 컨텍스트 팽창 → OOM) · **`IDENTITY` 는 배치 불가**(INSERT 해야 ID 확정) → 시퀀스 |
| 98 | 벌크 갱신·삭제 | `@Modifying` JPQL 은 **컨텍스트 우회 → 낡은 엔티티와 어긋남** · `clearAutomatically = true` · 더티 체킹·`@PreUpdate` 안 돎(감사 항목) |
| 99 | 낙관 vs 비관 락 | 경합 빈도 · 드물면 `@Version` 낙관(동시성 ↑) · 재고 차감처럼 반드시 경합 = `PESSIMISTIC_WRITE` · **타임아웃 필수** |
| 100 | 낙관 락 예외 시 | 단순 재조회·재시도(횟수 상한) · 사용자 입력 얽히면 **마음대로 재시도 = 남의 변경 덮어씀** → "다른 사람이 갱신" 알림 |
| 101 | 데드락 대응 | 먼저 진짜 데드락인지(SQLState `40P01` vs 락 대기 타임아웃) · 원인 거의 **락 획득 순서 불일치** → ID 오름차순 · 트랜잭션 짧게 |
| 102 | 1차 vs 2차 캐시 | 컨텍스트 단위 / 앱 전체·트랜잭션 넘어 생존 · **2차는 엔티티를 ID 로 갖지 쿼리 결과는 안 가짐** → JPQL 은 매번 SQL · 쿼리 캐시 별도 |
| 103 | 2차 캐시 주의 | 갱신 많은 데이터 X · 마스터 계열 한정 · 다중 인스턴스 = **한쪽만 낡은 값** → 분산 캐시 or 짧은 TTL |
| 104 | `@Cacheable` 주의 | 키 설계 + **TTL·상한 없으면 사실상 누수** · **자기 호출이면 캐시 안 걸림**(프록시) · `sync = true` 도 인스턴스별 → N 대면 N 회 ▶7-2 |
| 105 | 캐시 스탬피드 | 인기 키 TTL 만료 순간 일제히 미스 → DB 폭주 · 분산 락(하나만 조회) / 논리 TTL 비동기 갱신 / TTL 지터 · **중요도별 구분** |
| 106 | HikariCP 풀 크기 | 크다고 좋지 않음(DB 쪽이 먼저 힘듦) · DB `max_connections` ÷ 인스턴스 수로 역산 → 부하 시험 · **풀 × 최대 인스턴스 ≤ DB 상한** ✅`DB-02`·`DB-06` |
| 107 | `connectionTimeout` 늘리기 | 부적절 · 풀에서 얻기까지 대기 시간 → **고갈 시 요청 스레드 장시간 블록 → DB 일시 지연이 앱 전체 정지로** · 짧게 해서 빨리 실패 + CB ✅`DB-02`·`DB-06` |
| 108 🔴 | 풀 고갈 원인 분리 | 사용 시간 메트릭으로 기계적 분리 · 슬로우 쿼리 = 반납되므로 분포에 나타남(p99 ↑) / 누수 = **분포에 안 나타나고 active 만 계단식 증가** · `leakDetectionThreshold` → 빌린 지점 스택 ✅`DB-02`·`DB-06` |
| 109 | `maxLifetime` 목적 | DB·네트워크 장비가 먼저 끊는 문제 · **DB `wait_timeout` 보다 짧게 → 앱이 먼저 능동적으로 버림** · 재현성 없는 통신 에러 조사 비용 |
| 110 | JPA vs MyBatis | 도메인 중심·상태 변화 = JPA / 복잡 집계·SQL 주역 = MyBatis·JdbcTemplate · **병용 가능 → 용도로 선택** |
| 111 | QueryDSL 이점 | 타입 안전(오타가 컴파일에서) · 동적 쿼리 `BooleanBuilder`/`BooleanExpression` · **문자열 연결 `where` 는 반드시 깨짐** |
| 112 | SQL 인젝션 | 파라미터 바인딩(값은 데이터로만) · **`ORDER BY` 컬럼·테이블명은 바인딩 불가 → 화이트리스트** · DB 사용자 권한 최소 |
| 113 | 스키마 변경 관리 | Flyway/Liquibase · 프로덕션 `ddl-auto` 논외, `validate` · **하위 호환 분할**(컬럼 삭제 = 안 쓰기 → 다음 릴리스 삭제) |
| 114 | 무정지 컬럼 삭제 | Expand and Contract · 추가·양쪽 쓰기 → 새 쪽만 읽기 → 삭제 · **각 단계에서 신·구 앱 모두 동작** · 삭제는 전 인스턴스 교체 후 |
| 115 | 읽기 전용 레플리카 | `readOnly = true` 표식 + `AbstractRoutingDataSource` · **복제 지연 → 쓴 직후 읽으면 낡은 값** · 자기 쓰기 읽기는 프라이머리 |

---

# Part 5. 운영·테스트·보안 (Q116~145)

| Q | 질문 | 키워드 |
|---|---|---|
| 116 | Actuator 공개 범위 | 필요한 것만 · 기본 `health`·`info` · `env`·`heapdump`·`beans` 는 **외부 노출 = 정보 유출** · 관리 포트 분리·인증 |
| 117 | liveness vs readiness | 살아 있나(실패 = 재시작) / 트래픽 받나(실패 = LB 제외) · **readiness 엔 외부 의존 OK, liveness 엔 금지** · DB 잠깐 죽으면 전 Pod 재시작 반복 |
| 118 | graceful shutdown | 처리 중 요청 완료 후 종료 · `server.shutdown=graceful` + 유예 · k8s 는 `preStop` 몇 초 대기 · **라우팅 제외 전파에 시간차** |
| 119 | 감시 지표 | 요청률·에러율·지연(**p95·p99**, 평균은 이상치 은폐) · 스레드풀·커넥션 풀 active/pending·GC · **이용자 체감에서 역산** |
| 120 | 분산 트레이싱 | 서비스 넘는 하나의 요청 추적 · 트레이스 ID 전파 + 로그에도 · **비동기·스레드풀 넘으면 끊김 → 명시적 인계** |
| 121 | 샘플링 주의 | 비용 ↓ 대신 **드문 에러가 누락** · 에러·느린 요청은 100% 남기는 조건부 샘플링 |
| 122 | 구조화 로그 | 검색·집계 가능 · JSON + 트레이스 ID·사용자 ID·요청 ID 키 고정 · **개인정보·인증 정보 금지**(장기 보존, 회수 어려움) |
| 123 | 로그 레벨 | ERROR = 사람이 대응 / WARN = 주시 / INFO = 업무 분기점 / DEBUG · **알림 과다 → 아무도 안 봄** · ERROR = "깨워도 좋다" 기준 |
| 124 | 프로덕션 설정 변경 | 재시작 가능하면 환경변수 교체 · 로그 레벨은 Actuator `loggers` · Spring Cloud Config + `@RefreshScope` · **동적 설정은 바뀌는 순간 테스트 어려움 → 범위 제한** |
| 125 | `@SpringBootTest` 언제 | 컨텍스트 전체 → 배선·계층 넘는 동작 · 느림 · **단위로 충분한 건 단위, 통합 필요한 곳만 통합** · 설정 바꾸면 컨텍스트 재생성 |
| 126 | 슬라이스 테스트 | `@WebMvcTest`(컨트롤러) · `@DataJpaTest` · `@JsonTest` · 필요한 빈만 → 빠름 · 서비스는 `@MockBean` · **테스트 대상 계층을 명확히 하는 설계 효과** |
| 127 | 인메모리 DB 테스트 문제 | 방언 차이 → **통과할 리 없는 SQL 이 통과, 통과해야 할 SQL 이 실패** · 타입·함수·락·격리 다름 · Testcontainers |
| 128 | MockMvc vs `RANDOM_PORT` | 서버 없이 DispatcherServlet 직접(빠름, HTTP 안 거침) / 실제 서버 + `TestRestTemplate`(필터·직렬화 포함 **진짜 경로**) · 기본 MockMvc |
| 129 | 외부 API 의존 테스트 | WireMock 스텁 서버로 HTTP 레벨(직렬화·타임아웃) · **목이 실물과 어긋나는 리스크** → 계약 테스트·사양 변경 통지 |
| 130 | `@MockBean` 주의 | **조합마다 다른 컨텍스트 → 캐시 무효 → 전체 느려짐** · 과다 = 자기 기대대로 도는 것만 확인 · 경계에만 |
| 131 | 테스트 데이터 관리 | 테스트 안에서 생성 · 공통 픽스처 전부 = 의존 불명·무관한 테스트 깨짐 · **테스트 간 상태 공유 금지**(단독 통과·전체 실패) |
| 132 | Security 인증·인가 흐름 | 필터 체인 · 인증 필터 → `AuthenticationManager` → `Authentication` 을 `SecurityContext` 에 → 인가 필터 · **인증≠인가 → 401/403 구분** · `ThreadLocal` |
| 133 | 세션 vs 토큰 | 서버 상태 가능 = 세션 / 스케일 아웃·모바일 = 토큰 · 세션도 Redis 로 확장 가능 · **토큰은 즉시 무효화 불가** → 권한 회수 즉시 반영이면 세션 |
| 134 | JWT 주의 | 짧은 유효 기간 · 기밀 정보 X(Base64 = 누구나 읽음) · 알고리즘 고정 · 단명 액세스 + 리프레시 · **리프레시는 서버 관리 + 회전, 재사용 감지 시 전부 무효화** |
| 135 | 비밀번호 저장 | 솔트 + 계산 비용 큰 해시(bcrypt/scrypt/Argon2) · `BCryptPasswordEncoder` 는 솔트 자동 · SHA-256 X — **빠른 게 공격자에게 유리** · work factor 재검토 |
| 136 | CSRF | 브라우저가 쿠키 자동 첨부하는 것을 악용 · 토큰(공격자가 모르는 값) + `SameSite` · **쿠키 안 쓰는 인증(Authorization 헤더)이면 성립 안 함 → 꺼도 됨** ✅`SEC-01` |
| 137 | XSS | 출력 시 이스케이프(템플릿 자동) · 위험 = 이스케이프 끄는 `th:utext` · CSP + `HttpOnly` · **입력 시 제거에만 의존 X** ✅`SEC-02` |
| 138 | 인가 로직 위치 | URL 레벨은 보안 설정 / 리소스 단위는 서비스 계층(`@PreAuthorize`) · **"자기 데이터인가" 판정 누락 = 가장 흔한 취약점** |
| 139 | 기밀 정보 관리 | 리포지토리에 X · 환경변수·Vault·Parameter Store · **실수 커밋 감지**(CI 시크릿 스캔) · 이력에 들어가면 삭제 + **반드시 회전** |
| 140 | 의존 취약점 대응 | CI 의존성 스캔 + Dependabot · **쌓아두지 않는다**(1년 방치 = 파괴적 변경 겹침) · 일상적 소폭 갱신 |
| 141 | 프로덕션 급성 지연 조사 | 범위 분리(전체/특정·언제부터·직전 배포) → 계층 하강(스레드풀·커넥션 풀) · GC ↑ = 메모리, DB 대기 ↑ = 쿼리 · **추측 말고 측정부터** |
| 142 | 일부 API 장애 격리 | 벌크헤드 = 리소스 분리 · 같은 풀 공유 = 무거운 하나가 전 스레드 점유 · 중요도별 별도 풀 + CB + 타임아웃 · **느린 의존에 끌려가지 않게** |
| 143 | 배포 전략 | 롤링 기본 / 블루그린(즉시 복귀·DB 호환 걱정) / 카나리(소량 트래픽 모니터링) · **무엇이든 DB 변경이 하위 호환인 것이 전제** |
| 144 | 설정 실수 차단 | 기동 시 실패시킴(`@ConfigurationProperties` + `@Validated`) · 환경별 차이 리뷰 · Git 관리로 **변경이 차이로 보이는 상태** · 손으로 바꾼 프로덕션 설정은 덮어써짐 |
| 145 | Boot 버전업 | 릴리스 노트·마이그레이션 가이드로 삭제·비권장 먼저 · Boot 3 = Java 17 + `javax`→`jakarta` · **마이너 건너뛰지 않고 순서대로** · 부하 시험까지 |

---

# 🚨 함정 문항 (틀리면 즉시 감점)

| Q | 함정 | 정답 방향 |
|---|---|---|
| 7 | 싱글턴에 프로토타입을 주입하면 매번 새 것 | 주입은 1회. 계속 같은 인스턴스 ✅`SPRING-05` ▶2-3 |
| 10 | `@Bean` 메서드를 직접 부르면 새 인스턴스 | CGLIB 프록시가 가로채 싱글턴 유지 ▶1-5 |
| 35 | 같은 클래스 안에서 불러도 `@Transactional` 이 걸린다 | 자기 호출은 프록시를 안 거친다 ✅`SPRING-01` ▶3-2·4-6 |
| 36 | `private` 에 붙이면 에러가 난다 | 에러 없이 조용히 무시된다 |
| 42 | 체크 예외도 롤백된다 | 기본은 런타임·`Error` 만. 체크 예외는 커밋 ✅`SPRING-04` ▶4-2 |
| 43 | 예외를 `catch` 하면 안전하게 커밋된다 | 안쪽 `REQUIRED` 가 rollback-only 면 `UnexpectedRollbackException` ▶4-4 |
| 45 | 트랜잭션 안에서 외부 API 를 불러도 된다 | 커넥션 점유 → 풀 고갈 ▶4-8 |
| 48 | `@Async` 가 트랜잭션을 이어받는다 | `ThreadLocal` 이라 끊긴다 ▶7-6 |
| 51 | 테스트 `@Transactional` 이면 다 검증된다 | 별개 트랜잭션 문제·`AFTER_COMMIT` 리스너를 놓친다 |
| 64 | 에러도 200 으로 주고 바디 플래그로 | 재시도·모니터링·캐시가 전부 죽는다 ▶5-5 |
| 91 | `@ManyToOne` 은 EAGER 가 편하다 | JPQL 에서 오히려 N+1 |
| 92 | fetch join 에 페이징을 붙여도 된다 | limit 없이 전건 로드 → OOM ✅`JPA-06` |
| 94 | OSIV 는 켜 두는 게 편하다 | 렌더링 끝까지 커넥션 보유 ✅`JPA-03` |
| 104 | `@Cacheable` 은 어디서 불러도 캐시된다 | 자기 호출이면 안 걸린다 ▶7-2 |
| 107 | `connectionTimeout` 을 늘리면 안전 | 고갈 시 스레드가 더 오래 막힌다 ✅`DB-02` |
| 117 | liveness 에 DB 체크를 넣는다 | 전 Pod 재시작 유발. readiness 에만 |
| 127 | 인메모리 DB 로 테스트하면 충분 | 방언이 달라 통과할 리 없는 SQL 이 통과 |
| 136 | API 서버도 CSRF 를 켜야 한다 | 쿠키를 안 쓰면 성립하지 않는다 ✅`SEC-01` |

---

# 📌 S급 18문항 (시간이 없으면 이것만)

**코어 (4)** Q3 생성자 주입 ▶1-1 · Q7 싱글턴+프로토타입 ✅ ▶2-3 · Q4 순환 참조 ▶1-2 · Q14 자동 구성
**AOP·트랜잭션 (7)** Q35 자기 호출 ✅ ▶3-2 · Q42 롤백 규칙 ✅ ▶4-2 · Q34 프록시 종류 ✅ ▶3-4 · Q38 `REQUIRES_NEW` ✅ ▶4-5 · Q47 안 걸리는 5 ▶3-3 · Q45 외부 API ▶4-8
**Web (4)** Q56 요청 흐름 · Q66 Filter/Interceptor/AOP ▶5-7 · Q64 상태 코드 ▶5-5 · Q76 Tomcat 스레드
**데이터 (4)** Q89 N+1 ✅ · Q92 fetch join 페이징 ✅ · Q94 OSIV ✅ · Q108 풀 고갈 분리 ✅

---

# 💡 사용 순서

1. **매일 아침 5분** — 그날 학습할 Part 의 키워드만 훑기
2. **학습 중** — 키워드만 보고 일본어로 말하기 → 녹음 → [`Part1`](../spring-면접/Part1.md)~[`Part5`](../spring-면접/Part5.md) 원문 대조
3. **▶ 문항은 한 번은 돌려 본다** — `./gradlew :spring-tutorial:test` (인프라 없이) · ✅ 문항은 `docker compose up -d --wait` 뒤에 `./gradlew test -Dverify.only=SPRING-01`
4. **면접 전날** — 함정 18개 + S급 18문항 키워드만 · **"프록시를 안 거치면 안 걸린다"** 한 문장으로 Q33·35·36·47·104 를 묶는다
5. **면접 당일** — [`필수-키노트`](../spring-면접/필수-키노트.md) 의 **일본어 한 문장 18개**
