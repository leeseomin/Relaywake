# `SurvivorScene` 리팩토링 v1 도입 가이드

> - 근거 문서: [`refac-v1.md`](./refac-v1.md)
> - 대상: `src/game/scenes/SurvivorScene.ts`
> - 상태: 실행 전 계획(Draft)
> - 원칙: 사용자 동작과 게임 결과를 먼저 고정한 뒤, 한 단계씩 구조만 이동한다.

## 1. 작업 정의

| 항목 | 내용 |
| --- | --- |
| 유형 | 리팩토링 + 회귀 테스트 + 구조 문서 갱신 |
| 크기 | 장기 루프. 아래 Phase 0~5를 각각 독립적인 리뷰 단위로 진행 |
| 구현 위험 | 높음. 프레임 처리 순서와 RNG 호출 순서가 게임 결과에 직접 영향을 줌 |
| 사용자 가시 변경 | 없음 |
| 데이터/스키마 | 변경 없음 |
| 의존성/lockfile | 변경 없음 |
| 실행 방식 | 저장소 지침에 따라 한 agent가 Phase를 순차 수행 |

### 목표

`SurvivorScene`에 섞여 있는 게임 상태와 규칙을 다음 경계로 분리한다.

```text
SurvivorScene  — Phaser 입력·렌더링·HUD·오디오·pause·Vue 이벤트 변환
RunProgression — 시간·XP·레벨업·능력 소유·보상·통계·런 종료
WorldSystem    — 플레이어·적·픽업·공간 조회·HP·상태효과
CombatSystem   — 무기 발사·투사체·근접·회전·영역·충돌
```

리팩토링 전후에 같은 seed, 같은 입력, 같은 고정 delta를 주면 정규화한 시뮬레이션 결과가 같아야 한다.

### 반드시 유지할 동작

- 캐릭터별 초기 능력치와 시작 능력
- 600초 일반 런과 24초 E2E 런의 스폰/보스 타이밍
- 이동 가속, 적 AI, 분리, 공격 및 회복 수치
- 모든 능력의 쿨다운, 발사 수, 피격, 관통, 상태효과, 드롭 효과
- HUD와 `RunSummary`의 공개 타입 및 의미
- `window.__C2_GAME__`의 기존 명령 의미
- Vue/Pinia 화면 전이와 Dexie 저장 형식
- 레벨업 중 수동 pause 화면이 표시되지 않는 현재 동작
- 최종 보스 보상과 `runEnded`의 단 한 번 발생

### 제외 범위

- ECS나 범용 게임 엔진 프레임워크 도입
- 능력/적/레벨 밸런스 변경
- 독립 RNG 스트림으로의 재설계
- 자산, UI 디자인, 저장 스키마 변경
- Scene 줄 수를 특정 숫자 이하로 줄이는 작업
- 새 패키지 설치 또는 기존 패키지 업그레이드

### 문서 해석 가정

`refac-v1.md`의 마지막 109번째 줄은 현재 ``CombatSystem → Sc``에서 잘려 있다. 앞 문맥과 5단계 제목을 근거로 ``RunProgression → WorldSystem → CombatSystem → Scene``을 의도한 것으로 해석한다. 원문 자체는 이 작업에서 수정하지 않는다.

## 2. 현재 기준선

### 확인된 구조

| 현재 상태 | 영향 |
| --- | --- |
| `SurvivorScene.ts`는 1,437줄 | 한 번에 옮기지 않고 기능군별로 분리해야 함 |
| `PlayerRuntime`, `EnemyRuntime`, `ProjectileRuntime`, `PickupRuntime`, `ZoneRuntime`, `MeleeRuntime`, `OrbiterRuntime`가 Phaser 객체를 보유 | 원문의 4개 map뿐 아니라 Player/Melee/Orbiter도 상태와 view를 분리해야 함 |
| Scene이 적·투사체·픽업 배열과 HP·XP·통계를 직접 소유 | 대상 시스템별 SSOT를 먼저 정해야 함 |
| `AbilityDirector`가 능력 레벨/선택과 전투 쿨다운을 함께 소유 | Progression과 Combat이 능력 상태를 복제하지 않도록 좁은 포트로 공유해야 함 |
| `SpawnDirector`, `SpatialHashGrid`, `ObjectPool` 등 순수 단위가 이미 존재 | 기존 단위를 재사용하고 대체 추상화를 만들지 않음 |
| E2E는 레벨업, pause, 패배, 최종 보스 승리, 저장을 확인 | 무기별 효과와 고정 delta 결과를 먼저 보강해야 함 |

현재 테스트와 릴리스 게이트는 [`VALIDATION.md`](./VALIDATION.md)에 정리되어 있다. 해당 문서의 과거 성공 기록을 새 작업의 기준선으로 간주하지 말고, Phase 0 시작 시 현재 작업 트리에서 다시 실행한다.

### 현재 프레임 순서

리팩토링 중 아래 호출 순서를 그대로 유지한다. 시스템을 옮긴다는 이유로 한 프레임 안의 선후 관계를 바꾸지 않는다.

1. delta를 최대 50ms로 제한하고 시간/타이머 갱신
2. 배경 갱신
3. 플레이어 이동
4. 능력 쿨다운 tick
5. recovery
6. 적/보스/상자 spawn
7. 적 AI와 상태효과
8. 적 공간 분리와 위치 동기화
9. 회전 무기
10. 일반 무기 발사
11. 근접 효과
12. 투사체
13. 영역 효과
14. 픽업
15. 비활성 엔티티 compact
16. HUD 발행

### 현재 RNG 주의점

한 `SeededRandom` 인스턴스를 배경 먼지, 초기 픽업, `AbilityDirector`, `SpawnDirector`, 적/투사체/드롭/흡혈, fallback 런 ID가 함께 소비한다. 따라서 메서드를 다른 파일로 옮기면서 RNG 호출 횟수나 순서를 바꾸면 같은 seed라도 결과가 달라진다.

v1에서는 다음을 지킨다.

- 하나의 `runRng` 인스턴스를 composition root인 Scene에서 만들고 필요한 시스템에 주입한다.
- 초기화와 프레임 안의 RNG 소비 순서를 유지한다.
- `Array`, `Map`, 공간 질의 결과의 순회 순서를 임의로 정렬하거나 바꾸지 않는다.
- 배경용/게임용 RNG 분리는 결과 변경을 동반하므로 후속 작업으로 미룬다.
- `crypto.randomUUID()`, `Date`, viewport 크기는 golden 비교에서 주입하거나 정규화한다.

## 3. 대상 도메인과 SSOT

### 최소 도메인 맵

```text
Entities:
  Run, AbilityLoadout, Player, Enemy, Pickup,
  Projectile, MeleeEffect, Orbiter, Zone, PhaserView

Key states:
  Run.phase = running | choosingAbility | ended
  Entity.active = true | false
  manualPaused = true | false
  simulationHeld = manualPaused || Run.phase !== running

Relationships:
  Run 1 ── 1 AbilityLoadout
  WorldSystem 1 ── 1 Player, 0..N Enemy, 0..N Pickup
  CombatSystem 1 ── 0..N Projectile/MeleeEffect/Orbiter/Zone
  state entity 1 ── 0..1 Phaser view, keyed by stable entity ID

Actions:
  fixed step → ordered state transition → semantic events/read models
  damage command → HP change → damage/defeat/death result
  XP gain → progression change → optional ability-choice request
  final-boss defeat → one reward + one run end → later duplicate is no-op

SSOT:
  mutable facts are owned by exactly one row in the table below.
```

### 소유권 표

| Mutable fact | SSOT owner | 다른 계층의 접근 방식 |
| --- | --- | --- |
| elapsed/duration, level, XP, pending choices, run phase | `RunProgression` | read model 또는 명령 |
| kills, coins, damage dealt, final reward, `RunSummary` | `RunProgression` | 결과 이벤트 또는 read model |
| 능력 소유/레벨/선택/쿨다운 | `RunProgression` 내부의 단일 `AbilityDirector` 인스턴스 | World/Combat용 좁은 query/command port |
| player 위치/속도/HP/방어/상태 | `WorldSystem` | `WorldQuery`/`WorldCommandSink` |
| enemy/pickup 상태와 공간 인덱스 | `WorldSystem` | 읽기 전용 query와 명령 |
| projectile/melee/orbiter/zone 상태 | `CombatSystem` | 읽기 전용 render snapshot |
| manual pause, 키보드/터치 입력 | `SurvivorScene` | 프레임 입력값으로 전달 |
| Sprite/Arc/Text/Tween/Camera/Audio | `SurvivorScene` | ID 기반 view map |
| Vue 이벤트와 현지화 문자열 | `SurvivorScene` | 시스템의 semantic event를 변환 |
| `runRng`, 전역 entity ID 순서 | `SurvivorScene`의 composition root | 같은 인스턴스/`nextId` 포트를 순서대로 호출 |
| 저장된 profile/settings/run | 기존 Pinia/Dexie 계층 | 이번 리팩토링에서 변경하지 않음 |

능력 상태는 두 시스템에 복사하지 않는다. `RunProgression`이 기존 `AbilityDirector`를 감싸고, `CombatSystem`은 예를 들어 `isReady`, `effectiveStats`, `trigger`, `tickCooldowns`만 노출하는 포트를 사용한다. `WorldSystem`에는 armor, move speed, recovery처럼 필요한 계산값만 전달한다.

### 상태와 view의 대응

```text
PlayerState      ↔ playerSprite
EnemyState       ↔ enemySpriteMap<EntityId, EnemyView>
ProjectileState  ↔ projectileSpriteMap<EntityId, ProjectileView>
PickupState      ↔ pickupSpriteMap<EntityId, PickupView>
ZoneState        ↔ zoneViewMap<EntityId, ZoneView>
MeleeState       ↔ meleeSpriteMap<EntityId, MeleeView>
OrbiterState     ↔ orbiterSpriteMap<EntityId, OrbiterView>
```

`*State`에는 `sprite`, `visual`, `Phaser.GameObjects.*`가 없어야 한다. 텍스처 키, 색상, 사운드 문구를 상태 규칙에 직접 넣기보다 `abilityId`, `enemyId`, `pickupKind`, `effectKind` 같은 의미 기반 값을 Scene이 자산/현지화로 변환한다.

## 4. 경계 규칙

### 시스템 공통 규칙

- `RunProgression`, `WorldSystem`, `CombatSystem`은 `phaser`, `gameEvents`, Vue, Pinia, Dexie를 import하지 않는다.
- 시스템은 현지화 문자열, 아이콘 URL, 텍스처 인스턴스, 카메라 shake, tone을 만들지 않는다.
- 시스템은 변경 가능한 배열/Map/객체를 외부에 직접 넘기지 않는다.
- Scene은 시스템 상태를 직접 수정하지 않고 명령을 호출한다.
- 시스템 간 호출은 구체 클래스 전체가 아니라 필요한 query/command 포트로 제한한다.
- 외부 효과는 `bossSpawned`, `abilityGranted`, `magnetActivated`, `damageNumber`, `explosion`, `runEnded` 같은 semantic event로 반환한다.
- 환경 의존 값인 `now()`와 `runId()`는 주입한다. 단위 테스트에서는 고정 값을 사용한다.

### 권장 포트 형태

아래는 책임을 보여 주는 예시이며, 구현 중 필요한 최소 메서드만 확정한다.

```ts
interface WorldQuery {
  player(): Readonly<PlayerState>;
  nearestEnemy(radius: number): Readonly<EnemyTarget> | null;
  queryEnemies(x: number, y: number, radius: number): readonly Readonly<EnemyTarget>[];
}

interface WorldCommandSink {
  damageEnemy(command: DamageEnemyCommand): DamageResult;
  damagePlayer(rawDamage: number): DamageResult;
  healPlayer(amount: number): number;
  applyBleed(command: ApplyBleedCommand): void;
  displacePlayer(dx: number, dy: number): void;
}

interface CombatAbilityPort {
  ownedActive(): readonly AbilityRuntimeView[];
  tickCooldowns(deltaSeconds: number): void;
  isReady(id: AbilityId): boolean;
  effectiveStats(id: AbilityId): WeaponStats;
  trigger(id: AbilityId, cooldown: number): void;
}
```

포트가 Scene의 `enemies` 배열이나 콜백 묶음을 그대로 노출한다면 추출이 완료된 것이 아니다. Combat은 `WorldQuery`로 대상을 찾고 `WorldCommandSink`로 피해/회복/변위를 요청해야 한다.

### 예상 파일 범위

새 파일:

```text
src/game/systems/RunProgression.ts
src/game/systems/WorldSystem.ts
src/game/systems/CombatSystem.ts
tests/unit/run-progression.test.ts
tests/unit/world-system.test.ts
tests/unit/combat-system.test.ts
tests/unit/system-boundaries.test.ts
tests/fixtures/survivor-characterization.v1.json  # JSON fixture를 택할 때만
```

수정 가능성이 있는 기존 파일:

```text
src/game/scenes/SurvivorScene.ts
src/game/systems/AbilityDirector.ts              # 최소 port surface가 필요할 때만
src/game/core/types.ts
src/game/sceneBridge.ts
src/game/GameController.ts
src/App.vue                                      # E2E manual clock 전달
tests/e2e/game.helpers.ts
tests/e2e/game.spec.ts
README.md                                        # Phase 5에서 실제 구조만 반영
```

`package.json`, lockfile, `src/game/data`, `src/persistence`, 저장 schema는 원칙적으로 변경하지 않는다. 필요해지면 현재 계획을 중단하고 범위를 다시 합의한다.

## 5. 전체 수용 기준

### 대표 Given / When / Then

**Happy path**

- Given: 고정 viewport, seed `20260729`, 고정 입력 시퀀스, 16ms delta
- When: 같은 프레임 수만큼 현재 구현과 리팩터링 구현을 진행
- Then: 정규화한 체크포인트의 시간, 플레이어, XP/레벨, 적/픽업/공격체 수, 킬/코인/피해, 능력 목록과 의미 이벤트 순서가 일치

**회귀 경로**

- Given: 레벨업 선택이 열린 상태
- When: 수동 pause 명령 또는 일반 `paused` UI 이벤트가 발생할 조건을 실행
- Then: 레벨업 overlay가 유지되고 pause dialog가 덮어쓰지 않음

**종료 경로**

- Given: 살아 있는 최종 보스
- When: 같은 보스에 중복 피해/종료 명령이 도달
- Then: 보상은 한 번, `runEnded`도 한 번만 발생하고 저장되는 런도 하나

**view lifecycle 경로**

- Given: 적·투사체·픽업·근접·회전·영역 view가 생성된 상태
- When: 해당 상태가 제거되거나 Scene이 shutdown
- Then: 각 view는 한 번만 회수/파괴되고 active state 수와 active view 수가 일치

### 최종 구조 기준

- [ ] `RunProgression`, `WorldSystem`, `CombatSystem`에 Phaser import/참조가 없다.
- [ ] 순수 상태에 `sprite`, `visual`, `Phaser.GameObjects.*`가 없다.
- [ ] `ObjectPool<Phaser.GameObjects.Sprite>`는 Scene의 view 계층에만 있다.
- [ ] Scene에 `enemies`, `projectiles`, `pickups`, `hp`, `xp`, `kills`, `coins` 원본 상태가 없다.
- [ ] 시스템은 `gameEvents.emit()` 또는 현지화 문자열을 만들지 않는다.
- [ ] 같은 seed/입력/delta의 golden trace가 일치한다.
- [ ] 레벨업과 수동 pause의 화면 소유권이 충돌하지 않는다.
- [ ] 최종 보스 보상, `runEnded`, 런 저장이 각각 정확히 한 번 발생한다.
- [ ] 제거/shutdown 시 Sprite pool과 비풀링 Arc가 누락 없이 정리된다.
- [ ] 기존 unit/E2E와 `npm run check`가 통과한다.
- [ ] 공개 타입, 저장 스키마, 사용자 조작, 밸런스가 바뀌지 않는다.
- [ ] Scene에 순수 게임 규칙이 남지 않는다. Scene 줄 수는 판정 기준이 아니다.

## 6. 단계별 도입 계획

각 Phase는 이전 Phase가 green이고 diff가 검토된 뒤에만 시작한다. 한 Phase에서 회귀 원인을 좁힐 수 없을 정도로 변경량이 커지면 더 작은 하위 slice로 나눈다.

Phase 2~4의 새 시스템 테스트는 먼저 compile 가능한 최소 껍데기를 만든 뒤, 요구한 상태 전이 assertion 때문에 실패하는 것을 확인한다. 모듈 누락, import 오류, 테스트 설정 오류는 유효한 Red로 간주하지 않는다.

### Phase 0 — 행동 고정

#### 목적

구조 변경 전에 현재 행동을 고정 seed와 고정 delta로 기록하고, 결과 차이를 자동 검출한다.

#### 구현 가이드

1. 현재 작업 트리의 기준선을 실행한다.

   ```bash
   npm run typecheck
   npm run test
   npm run build:bundle
   npm run test:e2e:run -- --project=chromium
   ```

2. E2E 전용 manual clock을 추가한다.
   - 예: `/?e2e=1&clock=manual`
   - manual 모드에서는 Phaser의 자동 `update`가 시뮬레이션을 전진시키지 않는다.
   - 테스트 bridge의 `step(deltaMs, frames)`가 현재 update body와 동일한 단일 `stepSimulation`을 호출한다.
   - 일반 실행과 기존 `/?e2e=1` 동작은 바꾸지 않는다.

3. `GameTestSnapshot`을 characterization에 필요한 값으로 확장한다.
   - 플레이어 좌표/HP
   - XP, 필요 XP, 레벨
   - kills, coins, damage dealt
   - 능력 ID/레벨/쿨다운의 안정된 정렬 결과
   - active enemy/pickup/projectile/melee/orbiter/zone 수
   - run phase와 의미 이벤트 횟수
   - active state/view/pool 수

4. 불안정 값은 비교에서 제외하거나 고정한다.
   - `RunSummary.id`, `endedAt`
   - 브라우저 wall clock
   - 오디오 컨텍스트 상태처럼 플랫폼 정책에 좌우되는 값

5. 다음 시나리오를 고정 프레임에 실행하고 체크포인트를 JSON fixture 또는 명시적 assertion으로 보관한다.
   - 자연 spawn과 미니/최종 보스 시점
   - 이동, 피격, 회복
   - XP 획득과 연속 레벨업
   - 직접 투사체와 관통
   - 수류탄 폭발/파편, 화염 zone, 중력 zone
   - 단검 출혈, 흡혈
   - 근접/회전 무기 재피격 간격
   - 자석/폭탄/상자/코인/회복 픽업
   - 최종 보스 중복 종료 시도

6. 일반 E2E bridge는 현재처럼 `e2e`에서만 노출한다. 테스트용 명령이 production UI나 공개 API에 노출되지 않게 한다.

#### Red

fixture의 관찰값 하나를 임시로 다르게 두었을 때 characterization test가 그 차이 때문에 실패하는지 확인한다. 테스트 설정이나 bridge 미노출 때문에 실패한 것은 유효한 Red가 아니다.

#### 완료 조건

- 고정 seed/delta 시나리오가 연속 실행에서 같은 결과를 낸다.
- `refac-v1.md`에서 지적한 무기/픽업 공백을 직접 관찰한다.
- baseline 명령이 모두 green이다.
- 이후 Phase에서 fixture 차이가 나면 어느 체크포인트부터 달라졌는지 알 수 있다.

#### 중단 조건

고정 실행 자체가 비결정적이면 시스템 추출을 시작하지 않는다. viewport, 자동 clock, RNG 소비, wall clock 중 무엇이 원인인지 먼저 격리한다.

---

### Phase 1 — 상태에서 Phaser 객체 제거

#### 목적

게임 규칙의 위치는 아직 바꾸지 않고, 순수 state와 Phaser view의 수명만 분리한다.

#### 구현 가이드

1. 각 `*Runtime`에서 Phaser 필드를 제거하고 `*State`로 바꾼다.
2. Scene에 ID 기반 view map을 만든다.
3. 생성/프레임 동기화/제거/shutdown 경로를 명시적으로 나눈다.
4. `ObjectPool` acquire/release는 Scene의 view 함수에서만 실행한다.
5. Zone의 Arc처럼 풀링하지 않는 객체도 map으로 추적하고 제거 시 정확히 한 번 destroy한다.
6. player, enemy, pickup, projectile뿐 아니라 melee와 orbiter까지 처리한다.
7. 텍스처/색상/scale은 semantic kind를 바탕으로 Scene에서 정한다.
8. update 호출 순서, RNG 순서, compact 주기는 바꾸지 않는다.

권장 전환 형태:

```text
spawn state → Scene이 같은 ID의 view 생성
state update → Scene이 좌표/각도/alpha/tint 동기화
state deactivate → Scene이 view 회수 후 map 삭제
shutdown → 남은 view 전부 회수/파괴
```

#### Red

- `*State`의 Phaser 필드를 금지하는 source boundary check를 먼저 추가하고, 현재 `sprite`/`visual` 필드 때문에 실패하는지 확인한다.
- state 수와 view 수를 비교하는 lifecycle check는 보존 검사다. 현재 구현에서 먼저 통과시킨 뒤 전환 과정 내내 유지한다.

#### 집중 검증

```bash
npm run test -- tests/unit/object-pool.test.ts
npm run build:bundle
npm run test:e2e:run -- --project=chromium --grep "deterministic|final boss|levels up"
```

#### 완료 조건

- `*State`에 Phaser 객체가 없다.
- active state/view 수와 pool active 수가 일치한다.
- 생성/제거/reuse 시 texture, frame, tint, alpha, scale, rotation이 올바르게 초기화된다.
- Phase 0 golden trace가 그대로다.

#### 롤백 단위

state 종류 하나와 대응 view map 하나를 한 slice로 취급한다. 예를 들어 Projectile 전환이 실패하면 이미 green인 Enemy 전환까지 함께 되돌리지 않는다.

---

### Phase 2 — `RunProgression` 추출

#### 목적

공간 좌표나 Phaser 없이 진행도, 능력 선택, 통계, 보상, 종료를 한 SSOT로 이동한다.

#### 소유 대상

- elapsed/duration
- level, XP, required XP
- pending level-ups와 `Run.phase`
- `AbilityDirector`
- kills, coins, damage dealt
- 최종 보스 보상 여부와 ended 여부
- `RunSummary`

픽업 배열, 플레이어 좌표/HP, 적 객체는 소유하지 않는다.

#### 구현 가이드

1. `tests/unit/run-progression.test.ts`를 먼저 만든다.
2. `src/game/systems/RunProgression.ts`를 추가한다.
3. 기존 `AbilityDirector`를 내부 SSOT로 사용하고 World/Combat에는 좁은 port만 제공한다.
4. `gainExperience`, ability choice 생성/선택, kill/coin/damage 기록을 명령으로 옮긴다.
5. `finishRun`은 idempotent하게 만든다.
6. `RunSummary`의 ID와 종료 시각은 주입한 provider로 만든다.
7. 시스템은 ability ID와 semantic event만 반환한다.
8. Scene은 `getAbility`, `iconUrl`, locale을 사용해 `AbilityChoiceView`와 toast를 만든다.
9. 수동 pause는 Scene, `choosingAbility`는 Progression이 소유한다.

#### 필수 단위 테스트

- 단일/다중 레벨업과 pending choice 순서
- 최대 레벨 능력 제외와 고정 seed 선택
- 선택할 능력이 없을 때 running 복귀
- 코인/킬/누적 피해 기록
- final boss 보상 한 번
- `finishRun` 중복 호출 시 summary/event 한 번
- 고정 ID/clock을 사용한 `RunSummary`
- 레벨업 도중 수동 pause 명령이 progression phase를 손상하지 않음

#### 집중 검증

```bash
npm run test -- tests/unit/run-progression.test.ts tests/unit/ability-director.test.ts tests/unit/xp.test.ts
npm run typecheck
```

#### 완료 조건

- Scene의 `level`, `xp`, `xpRequired`, `pendingLevelUps`, `kills`, `coins`, `damageDealt`, `ended` 원본 필드가 제거된다.
- 기존 `HudSnapshot`, `RunSummary`, `gameEvents` 외부 계약이 유지된다.
- 시스템에 localization, icon URL, Phaser, `gameEvents`가 없다.
- Phase 0 golden trace와 기존 레벨업/패배/승리 E2E가 green이다.

---

### Phase 3 — `WorldSystem` 추출

#### 목적

플레이어·적·픽업과 공간/HP/상태효과를 Combat이 사용할 수 있는 순수 경계로 이동한다.

#### 소유 대상

- `PlayerState`, `EnemyState`, `PickupState`
- 적 cap, spawn, AI, 공격 intent
- `SpatialHashGrid`, 공간 분리, nearest/query
- 이동, knockback, player displacement
- HP, armor, invulnerability, heal
- bleed 상태와 tick
- pickup 위치/attraction/expiry
- magnet/recovery/chest spawn timer

#### 구현 가이드

1. `tests/unit/world-system.test.ts`를 먼저 만든다.
2. `src/game/systems/WorldSystem.ts`를 추가한다.
3. `SpawnDirector`, `SpatialHashGrid`, `separateSpatialCircles`를 재사용한다.
4. Phaser의 `Math.Linear` 사용은 기존 `core/math`의 순수 계산으로 동일하게 표현한다.
5. World는 입력 벡터, elapsed time, ability modifier를 값으로 받는다.
6. ranged/boomerang/gravity 적의 공격은 semantic attack intent로 반환한다.
7. 피해/회복/bleed/변위는 `WorldCommandSink`를 통해서만 적용한다.
8. 적 사망은 위치/종류/보스 여부/적용 피해가 포함된 결과를 반환한다.
9. pickup 수집은 semantic 결과를 반환한다.
   - gem/coin/chest 결과는 Progression 명령으로 전달
   - bomb 결과는 Combat/World 명령으로 전달
   - health/magnet은 World가 처리
10. Scene은 이벤트를 기계적으로 전달할 뿐 수치나 확률을 계산하지 않는다.

`killEnemy`, `collectPickup`, `createExplosion`처럼 여러 책임이 섞인 메서드는 통째로 이동하지 않는다. 상태 변경, 보상, 표현 효과를 각 owner로 분리한다.

#### 필수 단위 테스트

- 입력 정규화, 가속/감속, 위치
- 적 spawn HP 배율과 cap
- melee/ranged 적의 거리별 AI/attack intent
- 적 분리와 공간 질의
- armor, 무적 시간, 사망, heal 상한
- bleed tick과 적 사망 결과
- magnet 이동, pickup 수집/원거리 만료
- recovery 주기
- mini/final boss spawn 한 번
- 일반/미니보스 drop 결과

#### 집중 검증

```bash
npm run test -- tests/unit/world-system.test.ts tests/unit/spawn-director.test.ts tests/unit/spatial-grid.test.ts tests/unit/spatial-separation.test.ts
npm run typecheck
```

#### 완료 조건

- Scene의 player/enemy/pickup 원본 상태와 `enemyGrid`가 제거된다.
- Combat이 사용할 `WorldQuery`와 `WorldCommandSink`가 실제 테스트로 고정된다.
- World에 Phaser/view/event bus/현지화 의존성이 없다.
- Phase 0 golden trace가 그대로다.

---

### Phase 4 — `CombatSystem` 추출

#### 목적

World 포트를 사용해 모든 공격 규칙과 공격체 상태를 순수 시스템으로 이동한다.

#### 소유 대상

- `ProjectileState`, `MeleeState`, `OrbiterState`, `ZoneState`
- player/enemy 무기 발사
- cooldown trigger
- 관통과 `hitIds`
- 투사체 만료/boomerang/fragment
- explosion/fire/gravity
- melee arc/side slash/orbiter 재피격 간격
- lifesteal 판정과 World heal 명령

#### 구현 가이드

1. `tests/unit/combat-system.test.ts`를 먼저 만든다.
2. `src/game/systems/CombatSystem.ts`를 추가한다.
3. Combat은 `WorldQuery`, `WorldCommandSink`, `CombatAbilityPort`, `runRng`, `nextId`만 주입받는다.
4. `enemyGrid`, `enemies`, `player` 객체를 생성자나 콜백 묶음으로 받지 않는다.
5. 공격체의 위치/충돌/TTL은 Combat이 계산한다.
6. 피해, bleed, heal, player displacement는 World command로 요청한다.
7. explosion, tone, damage number, shake는 semantic presentation event로 반환한다.
8. render에 필요한 위치/각도/진행률은 읽기 전용 snapshot으로 노출한다.
9. Sprite/Arc 생성과 pool은 Scene에 남긴다.
10. 기존 frame/RNG/iteration 순서를 유지한다.

#### 필수 단위 테스트

- machine gun/shuriken/dagger 발사 수와 방향
- projectile direct hit, pierce, 중복 hit 방지
- dagger bleed 적용
- grenade/bazooka explosion과 grenade fragment
- molotov fire zone tick
- enemy ranged/boomerang/gravity projectile
- gravity player displacement
- bat/lightsaber/sword/machete arc와 machete side 순서
- axe orbiter 수와 0.42초 재피격 제한
- lifesteal 성공/실패 seed
- inactive projectile/melee/zone의 한 번 제거

#### 집중 검증

```bash
npm run test -- tests/unit/combat-system.test.ts tests/unit/combat.test.ts
npm run typecheck
```

#### 완료 조건

- Scene의 projectile/melee/orbiter/zone 원본 상태가 제거된다.
- Combat에 Phaser, ObjectPool, localized copy, `gameEvents`가 없다.
- World 포트 외부에서 World state를 수정하지 않는다.
- 원문이 지적한 투사체·폭발·출혈·흡혈·회전 무기·픽업 연계가 테스트된다.
- Phase 0 golden trace가 그대로다.

---

### Phase 5 — Scene 최종 정리

#### 목적

Scene을 composition root, 프레임 조정, 입력, view, 표현 효과의 경계로 정리한다.

#### Scene에 남길 것

- Phaser lifecycle과 카메라/배경
- 키보드/터치 입력 읽기
- 기존 순서를 보존하는 시스템 step 조정
- state ID ↔ Phaser view 동기화
- `ObjectPool<Phaser.GameObjects.Sprite>`
- HUD read model 조립과 icon URL 변환
- semantic event → localized `gameEvents` 변환
- 수동 pause, animation/tween/sound/AudioContext
- E2E bridge 위임
- shutdown 정리

#### Scene에서 제거할 것

- HP/XP/kill/coin의 원본 값
- spawn/drop 확률과 밸런스 계산
- 피해/회복/충돌/상태효과 계산
- 능력 선택/쿨다운/종료 규칙
- 직접 소유하는 enemy/projectile/pickup 배열

#### 구현 가이드

1. `init`에서 공용 `runRng`, `nextId`, 고정 가능한 clock/ID provider를 만든다.
2. Progression → World → Combat 의존 순서로 생성한다.
3. 기존 16단계 프레임 순서를 명시적인 orchestration으로 유지한다.
4. presentation event를 한 곳에서 처리한다.
5. HUD는 system read model에서 만들되 현재 80ms throttle을 유지한다.
6. `sceneBridge`의 기존 public behavior를 각 owner로 위임한다.
7. shutdown에서 view map, pool, Arc, tone, audio context를 모두 정리한다.
8. 최종 구조가 확정된 뒤에만 README의 구조/경계 설명을 실제 구현에 맞게 갱신한다.

#### 정적 경계 확인

다음 검색은 기대 결과가 없거나 주석으로 명시한 위치만 나와야 한다.

```bash
rg -n "from ['\"]phaser['\"]|Phaser\\." \
  src/game/systems/RunProgression.ts \
  src/game/systems/WorldSystem.ts \
  src/game/systems/CombatSystem.ts

rg -n "gameEvents|ObjectPool|GameObjects|sprite:|visual:" \
  src/game/systems/RunProgression.ts \
  src/game/systems/WorldSystem.ts \
  src/game/systems/CombatSystem.ts

rg -n "private (readonly )?(enemies|projectiles|pickups|hp|xp|kills|coins)" \
  src/game/scenes/SurvivorScene.ts
```

아키텍처 회귀가 다시 들어오지 않게 위 조건 중 안정적으로 검사 가능한 것은 `tests/unit/system-boundaries.test.ts`에 영구 검사로 둔다.

#### 완료 조건

- 전체 수용 기준 체크리스트가 모두 충족된다.
- Scene은 게임 규칙이 아니라 조정/표현만 담당한다.
- Scene 줄 수가 500을 넘는다는 이유만으로 추가 추출하지 않는다.
- Phase 0 golden trace와 모든 기존 테스트가 green이다.

## 7. 현재 메서드 이동 지도

| 현재 책임/메서드군 | 대상 | 주의사항 |
| --- | --- | --- |
| `createBackground`, `updateBackground`, `bindInput` | Scene | 표현/입력 유지 |
| `createPlayer` | World state + Scene player view | 캐릭터 데이터에서 state와 sprite 생성을 분리 |
| `updatePlayer` | World + Scene view sync | 입력은 Scene, 수치 계산은 World |
| `updateRecovery` | World | ability 계산값은 port로 받음 |
| `updateSpawning`, `spawnEnemy` | World + Scene view | toast는 semantic boss-spawn event로 분리 |
| `updateEnemies`, `updateBleed`, separation | World | ranged 공격은 Combat intent로 전달 |
| `fireEnemyWeapon`, `updateWeapons` | Combat | Ability/World port 사용 |
| projectile/grenade/molotov/fragment | Combat + Scene view | texture/tone은 Scene |
| melee/orbiter | Combat + Scene view | 충돌 각도는 Combat, Sprite는 Scene |
| explosion/zone | Combat + World command + Scene effect | 피해/변위/시각 효과를 분리 |
| pickup 이동/만료 | World + Scene view | 공간 상태는 Progression으로 보내지 않음 |
| `collectPickup` | World/Progression/Combat으로 분할 | 종류별 수치 판단을 Scene에 남기지 않음 |
| `gainExperience`, `openLevelUp`, `openChest` | RunProgression + Scene 표현 | choice에는 ID 중심의 domain 값 사용 |
| `damageEnemy`, `damagePlayer`, `healPlayer` | World | 통계 결과는 Progression에 전달 |
| `killEnemy` | World + RunProgression + Scene 표현 | drop, reward, toast, end를 분리 |
| `nearestEnemy` | `WorldQuery` | mutable Enemy 객체를 외부에 노출하지 않음 |
| `emitHud` | Scene | 값은 system read model, icon은 Scene |
| `finishRun` | RunProgression + Scene event/audio | ID/time 주입, idempotent |
| pool/deactivate/view compact | Scene view 계층 | system state compact와 view release 순서 검증 |
| pause/audio/shutdown | Scene | level-up phase와 manual pause를 구분 |

## 8. 테스트 매트릭스

| 관심사 | Unit | Deterministic integration | Browser E2E |
| --- | --- | --- | --- |
| XP/능력/통계/종료 | `run-progression.test.ts` | golden trace | level-up, 승/패, 저장 |
| 이동/적/픽업/HP | `world-system.test.ts` | golden trace | 이동, 피격, pickup smoke |
| 모든 공격 규칙 | `combat-system.test.ts` | 고정 능력/적 시나리오 | 주요 시각 효과 smoke |
| state/view/pool 수명 | pool + boundary test | count invariant | reload/shutdown, console |
| pause/level-up | session transition unit | event order | overlay 상호 배제 |
| 영속성 | 기존 persistence unit | 해당 없음 | run/profile 1회 저장 |

테스트는 관찰한 범위만 증명한다. unit이 통과해도 Phaser view 동기화가 맞다는 뜻은 아니며, screenshot이 같아도 수치 규칙이 같다는 뜻은 아니다.

## 9. 브라우저 검증 가이드

cmux에서 작업할 때는 [`cmux-in-app-browser.md`](./cmux-in-app-browser.md)를 따른다.

1. 개발 서버를 별도 pane에서 실행한다.

   ```bash
   npm run dev
   ```

2. cmux 인앱 브라우저에서 앱을 열고 다음을 확인한다.
   - menu → run 시작
   - 키보드/터치 이동
   - level-up 선택과 수동 pause의 상호 배제
   - 투사체/근접/회전/폭발/zone 표시
   - 피해/회복/HUD
   - 최종 보스 승리와 결과 화면
   - restart/reload 뒤 잔여 view나 중복 저장 없음

3. 각 행동 검증 시 DOM snapshot, console, errors를 함께 확인한다.

   ```bash
   cmux browser identify
   cmux browser surface:<id> snapshot --interactive --compact
   cmux browser surface:<id> console list
   cmux browser surface:<id> errors list
   cmux browser surface:<id> screenshot --out /tmp/relaywake-refac.png
   ```

4. screenshot은 시각 상태 한 장의 증거로만 사용한다. 결정론과 수치 동등성은 golden/unit test로 검증한다.

## 10. 최종 검증과 리뷰

### 전체 자동 검증

```bash
npm run check
```

이 명령은 typecheck → unit → production bundle → production-preview E2E 순으로 실행된다. 중간 단계가 실패하면 이후 단계를 성공한 것으로 보고하지 않는다.

### 구조 검토

```bash
git status --short
git diff -- \
  src/game/scenes/SurvivorScene.ts \
  src/game/systems \
  src/game/core/types.ts \
  src/game/sceneBridge.ts \
  src/game/GameController.ts \
  tests/unit \
  tests/e2e \
  README.md
```

확인할 내용:

- 각 변경이 현재 Phase 범위 안에 있는가
- 기존 사용자 변경을 덮어쓰지 않았는가
- balance/data/schema/lockfile에 우발적 변경이 없는가
- golden 변경이 있다면 원인과 승인된 의도 변경이 명시됐는가
- 테스트 bridge가 E2E 외 환경에 노출되지 않는가
- 외부 PR/배포/공유 리소스 변경을 실행하지 않았는가

## 11. 위험과 대응

| 위험 | 조기 신호 | 대응 |
| --- | --- | --- |
| RNG 순서 변경 | 첫 golden 체크포인트부터 적/능력 결과 차이 | 호출 순서와 iteration order 비교, v1에서 RNG 분리 금지 |
| frame 순서 변경 | HP/투사체/픽업 차이가 특정 프레임부터 발생 | 현재 16단계 순서를 유지하고 한 substep씩 이동 |
| 상태 이중 소유 | Scene과 system 값이 일시적으로 어긋남 | 원본 owner 하나만 남기고 Scene은 read model 사용 |
| 임시 콜백 구조 고착 | Combat 생성자에 Scene 배열/다수 콜백 등장 | World를 먼저 추출하고 query/command port 확정 |
| view 누수/이중 release | state/view/pool count 불일치, reload 오류 | ID map과 idempotent release, shutdown 검사 |
| level-up/pause 충돌 | pause dialog가 level-up을 덮음 | `Run.phase`와 `manualPaused`를 분리하고 기존 E2E 유지 |
| 종료 중복 | run/profile 수가 2, 코인 중복 | Progression의 idempotent finish + final reward unit/E2E |
| 날짜/UUID 때문에 golden 불안정 | 수치가 같아도 fixture diff | clock/ID 주입 또는 정규화 |
| 성능 저하 | 전투 중 frame drop/GC 증가 | per-frame 복사/정렬은 테스트 snapshot에만 사용, runtime은 읽기 전용 iterable 사용 |

## 12. 진행/중단 규칙

- 각 Phase 종료 시 focused test, golden, 관련 E2E, diff를 검토한다.
- 예상하지 않은 golden 차이가 하나라도 있으면 다음 Phase로 진행하지 않는다.
- 리팩토링 중 발견한 기존 버그는 재현 테스트와 별도 수정 slice로 분리한다.
- public API, 밸런스, 데이터, 의존성 변경이 필요해지면 이 계획 범위를 벗어나므로 먼저 결정과 승인을 받는다.
- 외부 PR 생성/수정, 배포, 공유 DB 작업은 별도 명시적 승인 전에는 수행하지 않는다.
- 되돌릴 때는 해당 Phase의 정확한 파일/변경을 역패치하거나 후속 수정으로 복구한다. 사용자 작업을 버리는 명령은 사용하지 않는다.

## 13. 권장 리뷰 단위

```text
Slice 0A  manual clock + snapshot 확장
Slice 0B  deterministic characterization scenarios
Slice 1A  Enemy/Player state-view 분리
Slice 1B  Projectile/Pickup state-view 분리
Slice 1C  Zone/Melee/Orbiter lifecycle 분리
Slice 2   RunProgression
Slice 3A  World player/enemy/spatial
Slice 3B  World pickup/status/damage
Slice 4A  projectile/explosion/zone
Slice 4B  melee/orbiter/status interaction
Slice 5   Scene 정리 + boundary guard + 문서
```

각 slice는 독립적으로 green이고 리뷰 가능해야 한다. 최종 목표는 “4개 파일 만들기”가 아니라, 상태 소유권이 하나이고 동일 입력에 동일 결과를 내는 경계를 만드는 것이다.
