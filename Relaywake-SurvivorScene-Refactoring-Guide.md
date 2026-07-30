# Relaywake `SurvivorScene` 4축 리팩터링 상세 도입 가이드

> 대상 프로젝트: `Relaywake` 2.1.0  
> 대상 파일: `src/game/scenes/SurvivorScene.ts`  
> 현재 규모: 1,437줄, 메서드 74개  
> 목표 구조: `SurvivorScene + WorldSystem + CombatSystem + RunProgression`
>
> 문서 역할: 실제 구현 세부의 기준 문서. [`refac-v1-plan.md`](./refac-v1-plan.md)는 단계별 승인·중단 체크리스트로 함께 사용한다.

저장소 지침과 현재 코드·Phase 0 golden 결과가 이 문서의 예시보다 우선합니다. 예시를 적용했는데 공용 RNG/ID 소비, 같은 프레임 이벤트 순서, 공개 테스트 브리지 의미가 달라지면 예시를 강행하지 않고 해당 slice를 중단합니다.

## 빠른 목차

- **Part A** — 현재 결합, 위험 메서드, RNG·ID·same-frame 주의점
- **Part B** — 목표 파일 구조, 순수 상태, View Map, 이벤트와 포트
- **Part C** — 단계 0~5의 실제 도입 절차
- **Part D** — 현재 74개 메서드의 이동·분할표
- **Part E** — 단위 테스트, replay, E2E와 경계 가드
- **Part F** — 리뷰 slice와 회귀 조사법
- **Part G** — 피해야 할 임시 구조
- **Part H** — 최종 완료 체크리스트

---

## 1. 문서 목적

현재 `SurvivorScene.ts`에는 다음 책임이 한 클래스에 함께 들어 있습니다.

- Phaser Scene 생명주기와 입력
- 플레이어 이동과 체력
- 적 스폰, 이동, AI, 상태효과
- 무기 발사, 투사체, 근접 공격, 회전 무기, 영역 공격
- 픽업 이동과 수집 효과
- XP, 레벨업, 능력 선택, 코인, 킬, 누적 피해, 런 종료
- Sprite 생성·풀링·동기화
- HUD, 토스트, 피해 숫자, 화면 흔들림
- 일시정지와 Web Audio
- E2E 테스트 브리지

이 문서의 목적은 기능을 새로 설계하는 것이 아니라, **현재 게임 규칙과 프레임 순서를 최대한 보존하면서 책임의 단일 소유권을 만드는 것**입니다.

최종 런타임 소유자는 다음 네 축입니다.

```text
SurvivorScene  — Phaser 입력·렌더링·HUD·오디오·pause·시스템 호출 순서
WorldSystem    — 플레이어·적·픽업·공간·HP·회복·상태효과
CombatSystem   — 무기 발사·투사체·근접·회전·영역·충돌
RunProgression — XP·레벨업·능력 소유·보상·통계·런 종료
```

`model.ts`, `ports.ts`, `events.ts`, `EntityIdSource.ts` 같은 파일은 경계를 지지하는 타입과 도구일 뿐, 다섯 번째 게임 시스템이 아닙니다.

---

## 2. 결론부터: 적용 순서

권장 순서는 다음과 같습니다.

```text
0. 현재 행동 고정
1. 순수 상태와 Phaser View 분리
2. RunProgression 추출
3. WorldSystem 추출
4. CombatSystem 추출
5. SurvivorScene 최종 정리
```

`CombatSystem`을 `WorldSystem`보다 먼저 떼지 않습니다. 현재 전투 코드는 다음 객체에 직접 기대고 있기 때문입니다.

- `enemyGrid`
- `enemies`
- `player`
- `nearestEnemy()`
- `damageEnemy()`
- `damagePlayer()`
- `spawnPickup()`

Combat을 먼저 옮기면 Scene 배열과 다수의 콜백을 Combat 생성자에 전달하게 되고, World를 추출할 때 그 임시 계약을 다시 뜯어고쳐야 합니다.

---

## 3. 리팩터링 범위와 비범위

### 3.1 이번 작업에서 하는 것

- 원본 상태의 단일 소유권 확립
- 상태에서 Phaser 객체 제거
- 시스템 사이의 좁은 Query/Command 계약 도입
- 순수 시스템의 단위 테스트 가능성 확보
- Scene을 Phaser 어댑터와 프레임 조정자로 축소
- 현재 E2E 흐름과 저장 형식 유지

### 3.2 이번 작업에서 하지 않는 것

- 게임 밸런스 변경
- 스폰 곡선 변경
- 적 AI 개선
- 무기 수치 조정
- 새 무기·픽업 추가
- ECS 도입
- 매 프레임 상태를 Pinia로 이동
- RNG 스트림 분리
- 비동기 이벤트 버스 도입
- 자산 키나 저장 스키마 변경
- Scene 500줄 이하를 절대 기준으로 강제

특히 RNG 분리는 좋은 장기 개선이지만 이번 리팩터링과 섞으면 안 됩니다. 현재 배경 먼지 생성도 게임 RNG를 소비하므로, RNG를 분리하는 순간 같은 seed의 결과가 달라집니다.

---

# Part A. 현재 코드의 실제 결합 분석

## 4. 현재 상태 필드의 소유권 재분류

현재 `SurvivorScene` 필드를 목표 소유자 기준으로 분류하면 다음과 같습니다.

| 현재 필드 | 최종 소유자 | 비고 |
|---|---|---|
| `options` | Scene | 실행 환경·사용자 표현 설정 |
| `rng` | 시스템 공용 의존성 | 리팩터링 중에는 하나의 인스턴스를 공유 |
| `player` | World | `sprite`는 Scene으로 분리 |
| `abilities` | RunProgression | Combat과 World에는 좁은 읽기 계약만 제공 |
| `spawns` | World | `SpawnDirector`를 World 내부 구성요소로 사용 |
| `background`, `backgroundTint` | Scene | Phaser View |
| `cursors`, `keys`, `touchX`, `touchY` | Scene | 입력 어댑터 상태 |
| `enemyGrid` | World | 외부에 Grid 자체를 노출하지 않음 |
| `enemies` | World | `sprite`, `textureKey` 제거 |
| `projectiles` | Combat | `sprite`, `textureKey` 제거 |
| `pickups` | World | `sprite`, `textureKey` 제거 |
| `zones` | Combat | `visual` 제거 |
| `meleeEffects` | Combat | `visual`, `textureKey` 제거 |
| `orbiters` | Combat | `visual`, `textureKey` 제거 |
| `spritePools` | Scene | Phaser View 계층에만 유지 |
| `nextEntityId` | 공용 ID Source | World와 Combat이 같은 allocator를 공유 |
| `elapsedSeconds` | RunProgression | World·Combat에는 값으로 전달 |
| `durationSeconds` | RunProgression의 런 설정 | World의 SpawnDirector에도 불변 설정 전달 가능 |
| `miniBossSeconds` | World의 스폰 설정 | 불변 설정 |
| `nextChestTime` | World | 월드 픽업 스폰 일정 |
| `hudTimer` | Scene | 표현 갱신 주기 |
| `compactTimer` | Scene 또는 각 시스템 | 첫 리팩터링에서는 Scene 조정자가 유지하는 편이 안전 |
| `magnetTimer` | World | 픽업 공간 효과 |
| `recoveryTimer` | World | 실제 회복 적용 타이머 |
| `level`, `xp`, `xpRequired` | RunProgression | 성장 SSOT |
| `pendingLevelUps`, `levelUpOpen` | RunProgression | Scene은 결과를 표현하고 pause만 적용 |
| `paused` | Scene | 시뮬레이션·표현 정지 상태 |
| `ended` | RunProgression | Scene은 종료 표현 상태를 반영 |
| `kills`, `coins`, `damageDealt` | RunProgression | 런 통계 SSOT |
| `macheteSide` | Combat | 무기 실행 상태 |
| `audioContext`, `audioPaused`, `activeTones` | Scene | 표현 계층 |

---

## 5. 상태와 View를 모두 분리해야 하는 대상

초안에 제시된 네 종류만 분리하면 아직 Phaser 의존성이 남습니다. 실제로는 다음 일곱 경계가 필요합니다.

```text
PlayerState      ↔ playerSprite
EnemyState       ↔ enemySpriteMap
ProjectileState  ↔ projectileSpriteMap
PickupState      ↔ pickupSpriteMap
ZoneState        ↔ zoneViewMap
MeleeState       ↔ meleeSpriteMap
OrbiterState     ↔ orbiterSpriteMap
```

`PlayerRuntime.sprite`, `MeleeRuntime.visual`, `OrbiterRuntime.visual`도 제거해야 아래 완료 조건을 진짜로 만족합니다.

```text
순수 상태에 sprite, visual, Phaser.GameObjects.*가 없다.
```

---

## 6. 가장 위험한 교차 결합 메서드

### 6.1 `damageEnemy()` — 현재 1,097–1,121행

한 메서드가 동시에 다음을 수행합니다.

1. HP 계산
2. 누적 피해 통계 증가
3. 적 피격 타이머와 Sprite tint
4. 넉백
5. 피해 숫자
6. 흡혈 판정
7. 사망 처리

최종 분리 방향은 다음과 같습니다.

```text
WorldSystem
  - HP 감소
  - 넉백 상태 반영
  - flashTimer 설정
  - 사망 여부 확정
  - enemyDamaged / enemyKilled 의미 이벤트 발생

RunProgression
  - appliedDamage 누적
  - 흡혈 능력 판정에 필요한 능력 상태 제공
  - 킬·보상·최종 보스 종료 처리

SurvivorScene
  - 피해 숫자
  - tint를 View에 반영
  - 이벤트를 RunProgression과 Phaser 표현으로 라우팅
```

### 6.2 `killEnemy()` — 현재 1,130–1,162행

현재 이 메서드는 킬 통계, 드롭 RNG, 픽업 생성, 최종 보스 코인, 토스트, 런 종료, 음향을 모두 수행합니다.

분리 후에는 다음 순서를 유지해야 합니다.

```text
enemyDamaged
→ RunProgression.recordDamage
→ enemyKilled
→ RunProgression.resolveEnemyKill
→ WorldSystem.spawnPickup(...)
→ entityRemoved로 Enemy View 회수
→ enemyDefeatSettled
→ 최종 보스면 RunProgression.settleFinalBossVictory()
→ Scene이 토스트·음향·runEnded 표현
```

`enemyDamaged`가 `enemyKilled`보다 먼저 처리되어야 최종 보스에게 가한 마지막 피해가 `RunSummary.damageDealt`에 포함됩니다.
최종 보스는 현재 코드처럼 보상 상태를 먼저 반영하고 Enemy View를 회수한 뒤 토스트와 `runEnded`를 발생시킵니다.

### 6.3 `collectPickup()` — 현재 1,010–1,044행

픽업 종류별 최종 소유자는 다릅니다.

| 픽업 | 공간 수집 | 실제 효과 소유자 |
|---|---|---|
| gem | World | RunProgression의 XP |
| coin | World | RunProgression의 코인 |
| health | World | World의 HP 회복 |
| magnet | World | World의 픽업 유도 상태 |
| bomb | World | World의 비보스 적 피해 |
| chest | World | RunProgression의 코인·능력 보상 |

따라서 World가 `pickupCollected` 의미 이벤트를 동기적으로 발생시키고, Scene이 종류에 따라 World 또는 RunProgression 명령으로 라우팅하는 구성이 안전합니다.

### 6.4 `openLevelUp()` — 현재 1,067–1,095행

현재는 능력 후보 계산, 레벨업 상태, Phaser pause, Vue용 View 모델, 앱 이벤트가 한곳에 있습니다.

분리 후에는 다음과 같이 나눕니다.

```text
RunProgression
  - 후보 ID 선택
  - 현재/다음 레벨 계산
  - pendingLevelUps 관리

SurvivorScene
  - getAbility()로 현지화 이름·설명 조립
  - iconUrl() 조립
  - Phaser 표현 pause
  - gameEvents.emit('levelUp', views)
```

시스템은 한국어·영어 문자열을 만들지 않습니다.

---

## 7. 숨은 동작 보존 위험

### 7.1 배경 렌더링이 게임 RNG를 소비한다

`createBackground()`는 먼지 120개를 만들면서 각 먼지에 대해 `x`, `y`, 반지름을 뽑습니다. 즉 현재 구현에서는 배경 생성만으로 RNG를 360회 소비합니다.

같은 인스턴스는 이어서 초기 픽업, Ability 후보 shuffle, SpawnDirector weighted 선택, 적 위치·attackTimer, 플레이어 탄 spread, 수류탄 파편, 드롭, 흡혈, `randomUUID` 부재 시 런 ID까지 소비합니다. 시스템별 RNG 복제나 seed 재생성을 하지 않습니다.

따라서 다음 변경은 이번 리팩터링에서 금지합니다.

- 배경 전용 RNG를 갑자기 추가
- `createBackground()` 호출 순서 변경
- 먼지 개수 변경
- 배경 랜덤 생성을 고정 상수로 교체

안전한 초기화 원칙은 다음과 같습니다.

```ts
const rng = new SeededRandom(this.options.seed ?? Date.now());
const ids = new SequentialEntityIdSource();
const character = getCharacter(this.options.characterId);

// 생성자는 rng/ids를 소비하거나 이벤트를 발생시키지 않아야 한다.
this.progression = new RunProgression({ rng, /* ... */ });
this.world = new WorldSystem({ rng, ids, runState: this.progression, /* ... */ });
this.combat = new CombatSystem({ rng, ids, /* ... */ });

// create()의 실제 소비 순서는 현재 코드와 같아야 한다.
this.createBackground(rng);
this.world.initializePlayer();
this.createPlayerView(character);              // Phaser만 사용, RNG/ID 미소비
this.progression.initializeStartingAbility(); // starting grant는 RNG/ID를 소비하지 않음
this.bindInput();
this.world.spawnInitialPickups();              // 그다음 RNG와 공용 ID를 소비
```

현재 구현은 `init()`에서 `AbilityDirector`와 `SpawnDirector`를 먼저 생성하지만 두 생성자는 RNG를 소비하지 않습니다. 시스템 생성 위치를 옮길 수 있는 이유도 이 무부작용 계약 때문입니다. 새 생성자에서 초기 픽업, 후보 선택, ID 할당 또는 이벤트 발생을 시작하면 안 됩니다.

장기적으로 표현 RNG와 시뮬레이션 RNG를 분리하려면 별도의 동작 변경 버전에서 새 golden fixture를 승인해야 합니다.

### 7.2 엔티티 ID를 시스템별로 나누면 결과가 바뀔 수 있다

현재 `nextEntityId`는 적, 투사체, 픽업, Zone, Melee가 공유합니다. `SpatialSeparation`은 ID 순서와 ID 기반 각도를 사용하여 겹친 적을 분리합니다.

따라서 World와 Combat에 각각 `nextId = 1`을 두면 안 됩니다.

```ts
export type EntityId = number;

export interface EntityIdSource {
  next(): EntityId;
}

export class SequentialEntityIdSource implements EntityIdSource {
  private value = 1;

  public next(): EntityId {
    const id = this.value;
    this.value += 1;
    return id;
  }
}
```

World와 Combat은 같은 `SequentialEntityIdSource` 인스턴스를 주입받습니다.

주의: 기존 `OrbiterRuntime`은 전역 ID를 소비하지 않습니다. Orbiter View용 키를 추가할 때 공용 ID Source를 사용하면 이후 적 ID가 밀릴 수 있습니다. Orbiter는 `index` 또는 Combat 내부의 별도 View key를 사용합니다.

생성 함수 내부의 교차 순서도 golden으로 잠급니다.

```text
초기 gem 1개: angle RNG → radius RNG → pickup ID
일반 적: angle RNG → distance RNG → enemy ID → attackTimer RNG
fixedDistance 적: angle RNG → enemy ID → attackTimer RNG
플레이어 탄 1개: spread jitter RNG → projectile ID
수류탄 파편 1개: angle jitter RNG → projectile ID
```

초기 gem은 하드코딩한 새 상수가 아니라 `levelOne.initialGemCount`를 사용하며 현재 값은 25입니다.

View acquire/ensure는 RNG와 공용 ID를 소비하지 않아야 합니다. 객체 리터럴 필드 순서나 helper 경계를 바꾸면서 위 호출이 재배열되지 않도록 characterization trace에서 RNG 호출 종류와 할당 ID를 함께 기록합니다.

### 7.3 같은 프레임에 생성된 객체가 즉시 갱신된다

현재 배열에 항목을 추가한 뒤 같은 프레임 후반 단계에서 바로 처리하는 동작이 많습니다.

- 적이 발사한 투사체는 같은 프레임의 `updateProjectiles()`에서 이동합니다.
- 플레이어 무기가 만든 투사체도 같은 프레임에 이동·충돌합니다.
- 수류탄 파편은 `updateProjectiles()` 순회 도중 배열에 추가되며 같은 순회에서 처리될 수 있습니다.
- Molotov·중력 Zone은 투사체 만료 뒤 같은 프레임의 `updateZones()`에서 첫 tick을 수행합니다.
- 적 사망 드롭은 같은 프레임의 `updatePickups()`에서 이동·수집될 수 있습니다.
- 폭탄 픽업으로 죽은 적의 드롭도 현재 픽업 순회 중 배열 뒤에 추가될 수 있습니다.

따라서 초기 추출 단계에서 모든 생성·제거를 “다음 프레임 command queue”로 지연시키면 안 됩니다.

이 문서에서는 **동기식 의미 이벤트 Sink**를 권장합니다.

```ts
export type SimulationEventSink = (event: SimulationEvent) => void;
```

시스템이 의미 이벤트를 발생시키면 Scene이 그 호출 스택 안에서 즉시 다른 시스템 명령과 표현을 수행합니다. 비동기 EventEmitter, Promise, `queueMicrotask()`를 사용하지 않습니다.

### 7.4 update 순서는 게임 규칙이다

현재 순서는 다음과 같습니다.

```text
1. elapsed와 프레임 타이머 갱신
2. 배경 갱신
3. 플레이어 이동
4. 능력 cooldown tick
5. 회복
6. 스폰
7. 적 AI·공격·출혈
8. 적 분리와 Grid 재구축
9. 적 View 위치 동기화
10. 회전 무기
11. 준비된 무기 발사
12. 근접 효과
13. 투사체
14. Zone
15. 픽업
16. 주기적 compact
17. HUD
```

시스템을 분리해도 이 순서를 먼저 보존합니다. “각 시스템에 `update()` 하나씩”을 만들기 위해 순서를 `World 전체 → Combat 전체`로 단순화하면 픽업과 공격 타이밍이 달라질 수 있습니다.

### 7.5 종료는 현재 프레임을 즉시 중단하지 않는다

현재 `update()`의 `paused || ended` 검사는 프레임 진입 시 한 번뿐입니다. 적 출혈, 투사체, 폭발, Zone 등에서 `finishRun()`이 호출되어도 이미 시작한 적 순회와 뒤쪽 Combat·Zone·Pickup phase는 그 프레임 끝까지 계속됩니다.

```text
다음 프레임 진입             → ended로 차단
현재 프레임의 player damage  → damagePlayer()의 ended 검사로 차단
현재 프레임의 나머지 이동·적 공격·적 피해·드롭·픽업 → 계속 실행
```

첫 `finishRun()`에서 만든 `RunSummary`는 그 시점의 복사본입니다. 종료 뒤 같은 프레임에 live kills/coins/damage/level이 더 바뀌어도 이미 발생한 summary를 다시 쓰지 않습니다. 이 동작은 개선 대상일 수 있지만 시스템 추출 중에는 frame 중간 `return`이나 모든 progression command의 일괄 ended guard를 추가하지 않습니다. 별도 동작 변경 slice에서만 기대 동작과 새 fixture를 승인합니다.

---

# Part B. 목표 아키텍처

## 8. 권장 파일 구조

```text
src/game/
├─ GameController.ts
├─ runtimeContext.ts
├─ sceneBridge.ts
├─ scenes/
│  └─ SurvivorScene.ts
├─ simulation/
│  ├─ model.ts
│  ├─ events.ts
│  ├─ ports.ts
│  └─ EntityIdSource.ts
├─ systems/
│  ├─ AbilityDirector.ts
│  ├─ CombatSystem.ts
│  ├─ RunProgression.ts
│  ├─ WorldSystem.ts
│  ├─ ObjectPool.ts
│  ├─ PresentationPause.ts
│  ├─ SpawnDirector.ts
│  ├─ SpatialHashGrid.ts
│  └─ SpatialSeparation.ts
└─ core/
   ├─ combat.ts
   ├─ curves.ts
   ├─ math.ts
   ├─ rng.ts
   ├─ types.ts
   ├─ weighted.ts
   └─ xp.ts
```

`assets.ts`와 `data/` 등 변경하지 않는 파일은 도식에서 생략했습니다. 기존 `PresentationPause`, `ObjectPool`, `SpawnDirector`, `SpatialHashGrid`, `SpatialSeparation`, `curves`, `weighted`를 유지·재사용하며 같은 역할의 대체 추상화를 만들지 않습니다. 지원 타입 파일을 더 잘게 나눠도 되지만, 초기에 파일 수를 과도하게 늘리지 않는 편이 좋습니다.

Phase 0의 manual clock과 기존 테스트 브리지 보존 때문에 다음 기존 파일을 제한적으로 수정하고 golden spec/fixture를 추가할 수 있습니다.

```text
src/App.vue
src/game/core/types.ts
src/game/sceneBridge.ts
src/game/GameController.ts
tests/e2e/game.helpers.ts
tests/e2e/game.spec.ts
tests/e2e/simulation-golden.spec.ts
tests/unit/spawn-director.test.ts
tests/fixtures/survivor-simulation-v2.1.0.json
```

`package.json`, `package-lock.json`, `src/game/data`, `src/persistence`와 저장 schema는 이번 작업 범위가 아닙니다. 이 파일들의 변경이 필요해지면 현재 slice를 중단하고 범위를 다시 검토합니다.

---

## 9. 의존 방향

```text
                  ┌────────────────────┐
                  │   SurvivorScene    │
                  │ Phaser adapter     │
                  └──────┬─────┬───────┘
                         │     │
               commands │     │ snapshots/events
                         ▼     ▼
       ┌────────────────────┐  ┌────────────────────┐
       │    WorldSystem     │◀─│    CombatSystem    │
       │ player/enemy/drop  │  │ weapons/collision  │
       └─────────▲──────────┘  └──────────▲─────────┘
                 │                         │
                 │ semantic routing        │ ability port
                 │                         │
                 └──────────┬──────────────┘
                            ▼
                  ┌────────────────────┐
                  │  RunProgression    │
                  │ XP/stats/rewards   │
                  └────────────────────┘
```

정적 import 규칙은 다음과 같습니다.

- `SurvivorScene`은 세 시스템을 import할 수 있습니다.
- `CombatSystem`은 `WorldSystem` 클래스를 import하지 않고 `ports.ts`의 인터페이스만 import합니다.
- `CombatSystem`은 `RunProgression` 클래스를 import하지 않고 능력 포트만 받습니다.
- `WorldSystem`은 Combat을 알지 않으며, Run 종료 여부는 `RunStateQuery` 포트로만 확인합니다.
- `RunProgression`은 World와 Combat을 알지 않습니다.
- 세 순수 시스템은 `phaser`, `gameEvents`, Vue, Pinia, 현지화 문자열을 import하지 않습니다.

---

## 10. 순수 상태 모델

아래는 권장 형태의 축약 예시입니다.

```ts
// src/game/simulation/model.ts
import type { AbilityId } from '../data/schemas';
import type { EnemyId } from '../data/enemies';

export type EntityId = number;
export type PickupKind = 'gem' | 'coin' | 'health' | 'magnet' | 'bomb' | 'chest';
export type ProjectileOwner = 'player' | 'enemy';
export type ProjectileExpiry = 'none' | 'explosion' | 'fire' | 'gravity';
export type ZoneKind = 'fire' | 'gravity';

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  armor: number;
  moveSpeed: number;
  acceleration: number;
  luck: number;
  pickupRadius: number;
  facingAngle: number;
  invulnerability: number;
}

export interface EnemyState {
  id: EntityId;
  active: boolean;
  enemyType: EnemyId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  attackTimer: number;
  flashTimer: number;
  knockbackX: number;
  knockbackY: number;
  bleedDamage: number;
  bleedTimer: number;
  bleedTickTimer: number;
  facingX: -1 | 1;
}

export type ProjectileKind =
  | 'playerMachineGun'
  | 'playerShuriken'
  | 'playerDagger'
  | 'playerGrenade'
  | 'playerBazooka'
  | 'playerMolotov'
  | 'enemyGrenade'
  | 'enemyBoomerang'
  | 'enemyGravityGrenade';

export interface ProjectileState {
  id: EntityId;
  active: boolean;
  kind: ProjectileKind;
  owner: ProjectileOwner;
  sourceAbility: AbilityId | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  damage: number;
  radius: number;
  ttl: number;
  totalTtl: number;
  pierce: number;
  knockback: number;
  rotationSpeed: number;
  expiry: ProjectileExpiry;
  explosionRadius: number;
  zoneDuration: number;
  fragments: number;
  directCollision: boolean;
  boomerang: boolean;
  reversed: boolean;
  hitIds: Set<EntityId>;
}

export interface PickupState {
  id: EntityId;
  active: boolean;
  kind: PickupKind;
  x: number;
  y: number;
  value: number;
  attracted: boolean;
  age: number;
}

export interface ZoneState {
  id: EntityId;
  active: boolean;
  kind: ZoneKind;
  owner: ProjectileOwner;
  x: number;
  y: number;
  radius: number;
  damage: number;
  knockback: number;
  ttl: number;
  tickTimer: number;
  tickInterval: number;
}
```

### 모델 설계 원칙

- 상태에는 `Sprite`, `Arc`, `GameObject`, `textureKey`, `visual`을 넣지 않습니다.
- 적 상태에는 전체 `EnemyDefinition` 대신 `enemyType: EnemyId`를 저장합니다.
- Scene과 World가 필요할 때 `getEnemy(enemyType)`으로 정의를 조회합니다.
- 표현 선택이 필요한 투사체는 `ProjectileKind` 같은 의미 태그를 사용합니다.
- `Set`과 `Map`은 Phaser 의존성이 아니므로 순수 상태에서 사용할 수 있습니다.
- 외부에 상태 배열 자체를 쓰기 가능 형태로 노출하지 않습니다.

---

## 11. Scene의 View Registry

```ts
interface SpriteView {
  sprite: Phaser.GameObjects.Sprite;
  textureKey: string;
}

private playerSprite!: Phaser.GameObjects.Sprite;
private readonly enemySpriteMap = new Map<EntityId, SpriteView>();
private readonly projectileSpriteMap = new Map<EntityId, SpriteView>();
private readonly pickupSpriteMap = new Map<EntityId, SpriteView>();
private readonly meleeSpriteMap = new Map<EntityId, SpriteView>();
private readonly orbiterSpriteMap = new Map<number, SpriteView>();
private readonly zoneViewMap = new Map<EntityId, Phaser.GameObjects.Arc>();
private readonly spritePools = new Map<string, ObjectPool<Phaser.GameObjects.Sprite>>();
```

View Map은 다음 불변식을 가져야 합니다.

```text
활성 순수 엔티티 1개 ↔ 활성 View 최대 1개
비활성 순수 엔티티 1개 ↔ 활성 View 0개
Map에서 제거된 Sprite는 정확히 한 번 pool.release()
Zone Arc는 정확히 한 번 destroy()
shutdown 후 모든 Map은 비어 있음
```

### 적 View 동기화 예시

```ts
private syncEnemyView(enemy: Readonly<EnemyState>): void {
  const definition = getEnemy(enemy.enemyType);
  let view = this.enemySpriteMap.get(enemy.id);

  if (!view) {
    const sprite = this.acquireSprite(definition.spriteKey)
      .setScale(definition.displayScale)
      .setDepth(definition.boss ? 75 : 60)
      .play(definition.animationKey);

    view = { sprite, textureKey: definition.spriteKey };
    this.enemySpriteMap.set(enemy.id, view);
  }

  view.sprite
    .setPosition(enemy.x, enemy.y)
    .setFlipX(enemy.facingX < 0);

  if (enemy.flashTimer > 0) view.sprite.setTint(0xffffff);
  else view.sprite.clearTint();
}

private releaseEnemyView(id: EntityId): void {
  const view = this.enemySpriteMap.get(id);
  if (!view) return;
  this.enemySpriteMap.delete(id);
  this.releaseSprite(view.textureKey, view.sprite);
}
```

Map 삭제와 pool release를 한 메서드에 묶어 이중 회수를 막습니다.

---

## 12. 동기식 의미 이벤트 계약

시스템이 `gameEvents.emit()`을 직접 호출하지 않도록 별도의 순수 이벤트를 사용합니다.

```ts
// src/game/simulation/events.ts
import type { AbilityId } from '../data/schemas';
import type { EnemyId } from '../data/enemies';
import type { RunSummary } from '../core/types';
import type { EntityId, PickupKind, ProjectileOwner } from './model';

export interface EnemyAttackIntent {
  enemyType: EnemyId;
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  damage: number;
  projectileSpeed: number;
}

export type SimulationEvent =
  | { type: 'enemyAttackRequested'; attack: EnemyAttackIntent }
  | {
      type: 'enemyDamaged';
      enemyId: EntityId;
      appliedDamage: number;
      x: number;
      y: number;
      radius: number;
      canLifesteal: boolean;
    }
  | {
      type: 'enemyKilled';
      enemyId: EntityId;
      enemyType: EnemyId;
      x: number;
      y: number;
    }
  | {
      type: 'enemyDefeatSettled';
      enemyId: EntityId;
      enemyType: EnemyId;
      x: number;
      y: number;
    }
  | {
      type: 'playerDamaged';
      appliedDamage: number;
      x: number;
      y: number;
    }
  | {
      type: 'playerHealed';
      amount: number;
      x: number;
      y: number;
    }
  | { type: 'playerDied' }
  | { type: 'playerDamageSettled' }
  | {
      type: 'pickupCollected';
      pickupId: EntityId;
      kind: PickupKind;
      value: number;
    }
  | { type: 'pickupCollectionSettled'; pickupId: EntityId }
  | { type: 'bossSpawned'; boss: 'miniBoss' | 'finalBoss' }
  | { type: 'weaponFired'; abilityId: AbilityId }
  | {
      type: 'explosionCreated';
      owner: ProjectileOwner;
      x: number;
      y: number;
      radius: number;
    }
  | {
      type: 'explosionResolved';
      owner: ProjectileOwner;
      x: number;
      y: number;
    }
  | { type: 'magnetActivated' }
  | { type: 'abilityGranted'; abilityId: AbilityId; level: number; source: 'levelUp' | 'chest' }
  | { type: 'levelUpRequested'; choices: readonly AbilityId[] }
  | { type: 'finalBossRewardGranted'; coins: number }
  | { type: 'runEnded'; summary: RunSummary }
  | {
      type: 'entityAdded';
      entity: 'enemy' | 'projectile' | 'pickup' | 'zone' | 'melee';
      id: EntityId;
    }
  | {
      type: 'entityRemoved';
      entity: 'enemy' | 'projectile' | 'pickup' | 'zone' | 'melee';
      id: EntityId;
    };

export type SimulationEventSink = (event: SimulationEvent) => void;
```

### 왜 동기식이어야 하는가

현재 코드는 피해 호출 안에서 통계, 흡혈, 사망, 드롭, 종료가 연속으로 실행됩니다. 이를 비동기 이벤트로 바꾸면 같은 프레임의 순서가 달라집니다.

Scene의 이벤트 핸들러는 다음처럼 의미 이벤트를 앱 표현과 다른 시스템 명령으로 즉시 변환합니다.

```ts
private readonly onSimulationEvent: SimulationEventSink = (event) => {
  switch (event.type) {
    case 'enemyAttackRequested':
      // updateEnemies()의 현재 적 순회 위치에서 즉시 ID를 할당한다.
      this.combat.spawnEnemyAttack(event.attack);
      break;

    case 'enemyDamaged':
      this.progression.recordDamage(event.appliedDamage);
      this.flashEnemyView(event.enemyId);
      if (this.options.preferences.damageNumbers) {
        this.showDamageNumber(event.x, event.y - event.radius, event.appliedDamage, 0xffe0b0);
      }
      // 현재 damageEnemy()처럼 피해 숫자 처리 뒤에 lifesteal RNG를 소비한다.
      if (event.canLifesteal) {
        const recovery = this.progression.rollLifesteal();
        if (recovery > 0) this.world.healPlayer(recovery);
      }
      break;

    case 'enemyKilled': {
      const rewards = this.progression.resolveEnemyKill({
        enemyType: event.enemyType,
        x: event.x,
        y: event.y,
        playerLuck: this.world.player.luck,
      });
      for (const pickup of rewards.pickups) this.world.spawnPickup(pickup);
      break;
    }

    case 'enemyDefeatSettled':
      if (event.enemyType === 'finalBoss') {
        this.progression.settleFinalBossVictory();
      } else {
        this.applyEnemyDefeatFeedback(event);
      }
      break;

    case 'playerDamaged':
      this.flashPlayerView();
      if (this.options.preferences.screenShake) this.cameras.main.shake(95, 0.0035);
      if (this.options.preferences.damageNumbers) {
        this.showDamageNumber(event.x, event.y - 35, event.appliedDamage, 0xff667a);
      }
      this.tone(82, 0.055);
      break;

    case 'playerDied':
      // finish()가 최초 호출에서만 runEnded 의미 이벤트를 발생시킨다.
      this.progression.finish(false);
      break;

    case 'playerDamageSettled':
    case 'pickupCollectionSettled':
      // 현재 damagePlayer()/collectPickup()의 맨 끝에 있는 강제 HUD 발행.
      this.emitHud(true);
      break;

    case 'pickupCollected':
      this.applyPickupEffect(event);
      break;

    case 'runEnded':
      this.applyRunEnded(event.summary);
      break;

    default:
      this.applyPresentationEvent(event);
  }
};
```

World의 player damage 순서는 `playerDamaged → 필요 시 playerDied/runEnded → playerDamageSettled`입니다. `applyRunEnded()`는 현재 `finishRun()`처럼 level-up 상태 해제 → `applyPausedState(true, false)` → 앱 `runEnded` 발행 → 결과 tone 순서를 유지합니다. 결과 tone은 승리 `760Hz`, 패배 `64Hz`, 길이 `0.22s`입니다. 따라서 사망 피해의 강제 HUD 발행은 `runEnded` 뒤에 옵니다.

`entityAdded`는 현재 코드처럼 상태 생성과 같은 호출 스택에서 View를 보장할 때 사용합니다. 프레임 끝의 전체 동기화만 기다리면 같은 프레임에 생성·수집된 드롭은 View를 한 번도 만들지 않아 기존 pool 생명주기와 진단 값이 달라집니다. 초기 상태는 모든 시스템을 Scene 필드에 할당한 뒤 명시적 `initialize()`에서 만들거나, 초기화 직후 한 번 전체 동기화합니다. 시스템 생성자에서는 이벤트를 발생시키지 않습니다.

Orbiter는 공용 Entity ID를 소비하지 않으므로 위 union에 포함하지 않습니다. `updateOrbiters()` phase가 끝나는 즉시 index 기반 상태와 `orbiterSpriteMap`을 동기화하고, 그 뒤의 frame-end 동기화는 누락 진단용으로만 사용합니다.

이 이벤트는 앱의 `gameEvents`와 다릅니다.

```text
SimulationEvent = 순수 게임 의미
app/gameEvents  = Phaser/Vue 경계용 UI 이벤트
```

---

## 13. World Query와 Command 계약

```ts
// src/game/simulation/ports.ts
import type { AbilityId, WeaponStats } from '../data/schemas';
import type {
  EnemyState,
  EntityId,
  PickupState,
  PlayerState,
} from './model';

export interface EnemyDamageCommand {
  enemyId: EntityId;
  amount: number;
  knockback: number;
  sourceX: number;
  sourceY: number;
  canLifesteal: boolean;
}

export interface EnemyDamageResult {
  appliedDamage: number;
  killed: boolean;
}

export interface WorldQuery {
  readonly player: Readonly<PlayerState>;
  activeEnemies(): readonly Readonly<EnemyState>[];
  activePickups(): readonly Readonly<PickupState>[];
  getEnemy(id: EntityId): Readonly<EnemyState> | undefined;
  nearestEnemy(radius: number): Readonly<EnemyState> | null;
  queryEnemiesCircle(x: number, y: number, radius: number): readonly Readonly<EnemyState>[];
}

export interface WorldCommandSink {
  damageEnemy(command: EnemyDamageCommand): EnemyDamageResult;
  damagePlayer(rawDamage: number, bonusArmor: number): number;
  healPlayer(amount: number): number;
  applyBleed(enemyId: EntityId, damage: number, duration: number): void;
  movePlayerBy(dx: number, dy: number): void;
}

export type CombatWorldPort = WorldQuery & WorldCommandSink;

export interface RunStateQuery {
  isEnded(): boolean;
}

export interface CombatAbilityPort {
  ownedActiveAbilities(): readonly { id: AbilityId; level: number }[];
  isReady(id: AbilityId): boolean;
  effectiveStats(id: AbilityId): WeaponStats;
  trigger(id: AbilityId, cooldown: number): void;
  globalDamageMultiplier(): number;
  bonusArmor(): number;
}
```

### 계약 설계 원칙

- Combat에 `enemies`, `player`, `enemyGrid` 배열·객체를 통째로 전달하지 않습니다.
- `SpatialHashGrid` 구현을 외부에 노출하지 않습니다.
- Combat은 `EnemyState`를 직접 수정하지 않습니다.
- World는 능력 목록을 알지 않습니다.
- World가 `RunStateQuery`를 사용하는 이유는 같은 frame에 final boss가 죽은 뒤 이어지는 player damage를 현재처럼 차단하기 위해서뿐입니다.
- runtime query는 현재 Array/Grid 순회 순서를 유지하며 매 frame 정렬하지 않습니다.
- golden/test snapshot만 복사·정렬하고, 외부에 넘긴 `Readonly` 객체를 다시 mutable로 캐스팅해 수정하지 않습니다.
- 메서드 인자가 늘어날 때 임시 콜백 묶음 대신 명시적 Command 타입을 만듭니다.
- 포트가 너무 커지면 `EnemyQuery`, `PlayerCommandSink`처럼 역할별로 분할하되, 첫 단계부터 과도하게 쪼개지는 않습니다.

---

# Part C. 단계별 도입 절차

## 14. 단계 0 — 현재 행동 고정

### 14.1 먼저 실행할 기존 게이트

프로젝트의 공식 릴리스 게이트는 다음입니다.

```bash
npm run check
```

`node_modules`가 없거나 깨끗한 기준 환경을 새로 만들 때만 tracked lockfile을 사용해 `npm ci`를 먼저 실행합니다. 이는 네트워크 접근과 설치 디렉터리 재생성을 동반하므로 실행 전에 이유를 알리고, 각 Phase마다 반복하지 않습니다. 이번 리팩터링은 의존성·lockfile 변경을 포함하지 않습니다.

`VALIDATION.md`에는 현재 기준으로 strict typecheck, Vitest 48개, production build, Playwright 검증이 통과한 과거 기록이 있습니다. 그 기록을 현재 성공으로 간주하지 않고 Phase 0 작업 트리에서 `npm run check`를 다시 실행합니다. 각 단계가 끝날 때도 같은 소스 상태의 관련 focused gate와 최종 release gate를 실행합니다.

### 14.2 update 본문만 기계적으로 분리

소유권 이동 전에 `update()`의 실제 시뮬레이션을 별도 메서드로 감쌉니다.

```ts
public override update(_time: number, deltaMs: number): void {
  if (this.manualTestClock) return;
  this.stepSimulation(Math.min(0.05, deltaMs / 1000));
}

private stepSimulation(delta: number): void {
  if (this.paused || this.ended) return;
  this.simulationFrame += 1;
  // 기존 update 본문을 순서 변경 없이 그대로 이동
}
```

`simulationFrame`은 `init()`에서 0으로 초기화하고 실제로 진행된 step에서만 증가시킵니다. 이 변경은 책임 이동이 아니라 테스트 진입점과 안정된 checkpoint 번호를 확보하기 위한 기계적 추출입니다.

### 14.3 고정 delta 테스트 모드 추가

수동 clock은 기존 `/?e2e=1`에 자동으로 적용하지 않습니다. 명시적 쿼리만 사용합니다.

```text
/?e2e=1&clock=manual
```

전달 경로를 다음처럼 고정합니다.

```text
App.vue query parsing
→ StartRunOptions.testClock
→ GameController/runtimeContext
→ SurvivorScene.manualTestClock
→ sceneBridge/C2TestBridge.step()
```

`StartRunOptions`의 추가 필드는 선택적이며 일반 실행의 기본값은 `realtime`입니다.

```ts
export interface StartRunOptions {
  // 기존 필드 유지
  e2e?: boolean;
  testClock?: 'realtime' | 'manual';
}

const params = new URLSearchParams(window.location.search);
const e2e = params.get('e2e') === '1';
const testClock = e2e && params.get('clock') === 'manual'
  ? 'manual'
  : 'realtime';
```

```ts
public testStep(deltaMs: number, frames = 1): void {
  if (!this.options.e2e || !this.manualTestClock) {
    throw new Error('Manual stepping requires e2e manual-clock mode.');
  }
  if (!Number.isFinite(deltaMs) || !Number.isFinite(frames)) {
    throw new Error('Manual step arguments must be finite.');
  }
  const safeFrames = Math.max(0, Math.floor(frames));
  const safeDelta = clamp(deltaMs / 1000, 0, 0.05);
  for (let frame = 0; frame < safeFrames; frame += 1) {
    this.stepSimulation(safeDelta);
  }
}
```

테스트 브리지에는 기존 명령의 의미를 바꾸지 않고 manual-clock characterization에 필요한 명령을 추가합니다.

```ts
interface C2TestBridge {
  // 기존 snapshot/grantXp/damagePlayer/... 유지
  step(deltaMs: number, frames?: number): void;
  setMoveInput(x: number, y: number): void;
  testGrantAbility(id: AbilityId): void;
  testSpawnEnemyAt(id: EnemyId, x: number, y: number): void;
  testSpawnPickup(kind: PickupKind, x: number, y: number, value: number): void;
  resetEventTrace(): void;
}
```

`setMoveInput()`은 기존 `setTouchVector()`에 위임합니다. 고정 입력 replay에서는 실제 키를 누른 상태로 두지 않고 이 명령으로 프레임 구간별 입력을 설정합니다. `testGrantAbility()`는 현재 `AbilityDirector.grant()`를 사용해 RNG를 소비하지 않습니다. `testSpawnEnemyAt()`은 현재 `spawnEnemy(id)`의 RNG/ID/attackTimer 생성 경로를 먼저 거친 뒤 상태와 View 좌표만 덮어쓰며, `testSpawnPickup()`은 현재 `spawnPickup()` 경로를 사용합니다. setup 뒤 `resetEventTrace()`를 호출하고 act/step 결과만 fixture와 비교합니다.

각 fixture는 새 page/run에서 시작합니다. `resetEventTrace()`는 관찰 배열만 비우며 RNG, 공용 ID, cooldown, timer 또는 엔티티를 초기화하지 않습니다.

새 setup 명령은 `e2e=1&clock=manual`에서만 성공해야 하고 일반 실행에는 브리지를 노출하지 않습니다. 실시간 Phaser update와 수동 step이 동시에 실행되지 않도록 `manualTestClock` 플래그를 두며, `step()`도 manual 모드가 아니면 실패해야 합니다. 기존 `/?e2e=1` 테스트는 새 setup 명령에 의존하지 않습니다.

이 manual clock은 `SurvivorScene`의 시뮬레이션만 제어합니다. Phaser renderer, animation manager, tween clock과 브라우저 wall clock까지 가상화하는 기능은 아닙니다. 따라서 golden에는 Sprite animation frame, 피해 숫자 tween의 중간 위치, AudioContext 시간 같은 값을 넣지 않습니다. View Map 크기와 pool active count처럼 시뮬레이션 생명주기에 연결된 진단만 포함하고 실제 표현은 E2E/cmux smoke로 확인합니다.

기존 `/?e2e=1`은 실시간 24초 런을 그대로 유지합니다. 이 브라우저 characterization만으로 일반 600초/300초 미니보스 일정을 증명했다고 보지 않습니다. Phase 0에서 기존 `spawn-director.test.ts`를 `durationSeconds=600`, `miniBossSeconds=300`의 실제 보스 경계까지 검증하도록 보강하고, 단계 3 이후 Phaser-free replay에서도 일반 설정으로 별도 검증합니다.

### 14.4 Golden snapshot 형식

기존 `GameTestSnapshot`은 회귀 추적에 부족합니다. 테스트 전용 상세 snapshot을 추가합니다.

```ts
interface SimulationGoldenSnapshot {
  frame: number;
  elapsedSeconds: number;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    invulnerability: number;
  };
  progression: {
    level: number;
    xp: number;
    xpRequired: number;
    pendingLevelUps: number;
    kills: number;
    coins: number;
    damageDealt: number;
    ended: boolean;
  };
  counts: {
    enemies: number;
    projectiles: number;
    pickups: number;
    zones: number;
    melee: number;
    orbiters: number;
  };
  abilities: Array<{
    id: AbilityId;
    level: number;
    cooldownRemaining: number;
  }>;
  eventTrace: Array<{
    frame: number;
    type: string;
    entity?: string;
    entityId?: number;
    abilityId?: AbilityId;
  }>;
}
```

Phase 0의 `eventTrace`는 동작을 구동하는 새 이벤트 버스가 아니라, manual E2E에서만 현재 메서드의 생성·피해·제거·종료 지점에서 test-only 배열에 append하는 관찰자입니다. append 함수는 RNG/ID를 소비하거나 다른 명령을 호출하지 않습니다. 이후 실제 `SimulationEvent`가 도입되면 같은 정규화 형식으로 기록해 baseline과 비교합니다.

비교 안정성을 위해 다음 규칙을 사용합니다.

- 엔티티/능력 snapshot 배열은 복사본을 ID 또는 ability ID로 정렬
- `eventTrace`는 순서 자체가 검증 대상이므로 append 순서를 유지
- 실수는 snapshot 직전에 소수점 5–6자리로 반올림
- `RunSummary.id`, `endedAt`은 제외하거나 고정 provider 주입
- Phaser Sprite 좌표가 아니라 순수 상태 좌표를 기록
- fixture 갱신은 명시적 환경변수에서만 허용

예시 경로:

```text
tests/fixtures/survivor-simulation-v2.1.0.json
```

### 14.5 반드시 잠글 시나리오

| 시나리오 | 검증 항목 |
|---|---|
| 고정 seed·무입력 스폰 | 미니보스·최종 보스 출현 frame, 적 수, HP 배율 |
| 기본 기관총 | cooldown, 발사 수, 투사체 수, 피해 누적 |
| 단검 | 관통, 출혈 damage·duration·tick 0.75초 |
| 수류탄 | 만료, 폭발, 6개 파편, 같은 프레임 파편 처리 |
| Molotov | Zone 생성, 첫 tick, TTL |
| 도끼 | 개수, 궤도, 적별 0.42초 재타격 제한 |
| 검·마체테 | 각도 패턴, 좌우 교대, hitIds |
| 적 원거리 | 일반 탄환, 부메랑 반전, 중력 Zone |
| health | maxHp clamp와 회복량 |
| magnet | 5초 타이머와 모든 픽업 attracted |
| bomb | 비보스만 제거, 드롭 생성 |
| chest | 코인 10, 능력 1개 즉시 지급 |
| 레벨업 | pending 다중 레벨업, 일반 pause 덮어쓰기 방지 |
| hold 전이 | running/manual/levelUp에서 종료될 때 presentation·raw audio 상태 |
| 최종 보스 | 킬 1, 코인 보상, damageDealt, runEnded 1회 |
| 패배 | playerDied 뒤 runEnded 1회 |
| 종료 발생 frame | 뒤쪽 적/Combat/Zone/Pickup phase 계속, player damage만 차단, 최초 RunSummary 불변 |

### 14.6 단계 0 완료 조건

- 기존 `npm run check` 통과
- 고정 seed·고정 delta fixture 생성
- 주요 의미 이벤트 순서 기록
- `runEnded` 이벤트 횟수 기록
- pool active count를 포함한 View 진단 값 확보
- 아직 시스템 소유권 이동 없음

---

## 15. 단계 1 — 상태에서 Phaser 객체 제거

이 단계에서는 로직을 다른 클래스로 옮기지 않습니다. `SurvivorScene` 안에 계산이 남아 있어도 괜찮습니다.

### 15.1 순수 타입 파일 생성

```text
src/game/simulation/model.ts
src/game/simulation/EntityIdSource.ts
```

현재 Scene 상단의 Runtime 인터페이스를 순수 상태와 View 타입으로 나눕니다.

### 15.2 Player 분리

기존:

```ts
interface PlayerRuntime {
  sprite: Phaser.GameObjects.Sprite;
  // state...
}
```

변경:

```ts
private player!: PlayerState;
private playerSprite!: Phaser.GameObjects.Sprite;
```

`createPlayer()`는 두 부분으로 나눕니다.

```text
createPlayerState() — 캐릭터 수치를 가진 순수 상태 생성
createPlayerView()  — Sprite 생성과 애니메이션 시작
```

### 15.3 Enemy 분리

- `EnemyState`에서 `sprite`, `textureKey`, 전체 `definition` 제거
- `enemyType: EnemyId` 추가
- Scene에 `enemySpriteMap` 추가
- `spawnEnemy()`에서 상태 생성과 View 생성 코드를 별도 메서드로 분리
- `deactivateEnemy()`는 먼저 상태를 비활성화하고 View release 메서드를 호출

이 단계에서는 둘 다 Scene에 있어도 됩니다.

### 15.4 Projectile 분리

- `sprite`, `textureKey` 제거
- `ProjectileKind` 추가
- 회전값을 순수 상태에 보관
- Scene은 `ProjectileKind → textureKey/depth/scale` 매핑을 소유

```ts
private projectileAppearance(kind: ProjectileKind): {
  textureKey: string;
  depth: number;
  scale: number;
} {
  // 표현 매핑만 담당
}
```

### 15.5 Pickup·Zone·Melee·Orbiter 분리

- Pickup texture 선택은 Scene으로 이동
- Zone의 `Arc`는 `zoneViewMap`으로 이동
- Melee weapon texture와 origin/scale은 Scene으로 이동
- Orbiter Sprite는 `orbiterSpriteMap`으로 이동
- Orbiter key 때문에 공용 엔티티 ID 소비 순서를 바꾸지 않음

### 15.6 `Phaser.Math.Linear` 제거

World가 Phaser 없이 플레이어 이동을 계산하려면 먼저 동등한 순수 함수로 교체합니다.

```ts
// core/math.ts의 기존 lerp 사용
this.player.vx = lerp(
  this.player.vx,
  targetX,
  clamp(step / Math.max(1, Math.abs(targetX - this.player.vx)), 0, 1),
);
```

이 교체는 추출 전에 golden trace로 동등성을 확인합니다.

### 15.7 View 동기화 위치 보존

초기에는 현재 시각 순서를 유지합니다.

- 배경은 플레이어 이동 전에 갱신
- 플레이어 Sprite는 이동 직후 갱신
- player invulnerability alpha/clearTint도 이 위치에서만 동기화하고, 후반 피해는 tint만 즉시 반영
- 적 Sprite는 분리 후 갱신
- Combat 단계에서 적이 피해를 받으면 `enemyDamaged` 라우터가 해당 Sprite tint를 즉시 반영
- 상태 생성/제거 이벤트는 같은 호출 스택에서 View ensure/release
- Zone 중력으로 이동한 플레이어 View의 한 프레임 지연 같은 기존 특성도 이 단계에서 함께 고치지 않음

시각 지연 개선은 모든 순수 시스템 추출 후 별도 동작 변경 slice에서 처리합니다.

### 15.8 단계 1 완료 조건

```text
[ ] Runtime 순수 상태에 Phaser 타입 없음
[ ] playerSprite가 PlayerState 밖에 있음
[ ] enemy/projectile/pickup/zone/melee/orbiter View Map 존재
[ ] ObjectPool은 Scene에 있음
[ ] 상태 수와 View 수 진단 값이 일치
[ ] golden trace가 단계 0과 동일
[ ] 기존 E2E 통과
```

---

## 16. 단계 2 — `RunProgression` 추출

### 16.1 이동할 필드

```text
elapsedSeconds
durationSeconds
level
xp
xpRequired
pendingLevelUps
levelUpOpen
kills
coins
damageDealt
ended
AbilityDirector
characterId
```

`recoveryTimer`, `magnetTimer`, `nextChestTime`, 플레이어 위치, 픽업 배열은 이동하지 않습니다.

### 16.2 권장 클래스 골격

```ts
export interface RunProgressionConfig {
  characterId: CharacterId;
  startingAbility: AbilityId;
  durationSeconds: number;
  rng: SeededRandom;
  eventSink: SimulationEventSink;
  identity: RunIdentityProvider;
}

export class RunProgression implements CombatAbilityPort, RunStateQuery {
  private readonly abilities: AbilityDirector;
  private elapsedSeconds = 0;
  private level = 1;
  private xp = 0;
  private xpRequired = xpRequiredForLevel(1);
  private pendingLevelUps = 0;
  private levelUpOpen = false;
  private kills = 0;
  private coins = 0;
  private damageDealt = 0;
  private ended = false;
  private summary: RunSummary | null = null;

  public initializeStartingAbility(): void { /* grant exactly once, no RNG */ }
  public isEnded(): boolean { return this.ended; }
  public elapsed(): number { return this.elapsedSeconds; }
  public worldModifiers(): WorldFrameModifiers { /* moveSpeed/armor/recovery read model */ }
  public advanceClock(delta: number): void {
    if (this.ended) return;
    this.elapsedSeconds += delta;
  }

  public tickAbilityCooldowns(delta: number): void {
    if (this.ended) return;
    this.abilities.tick(delta);
  }

  public gainExperience(amount: number): void { /* ... */ }
  public chooseAbility(id: AbilityId): AbilitySelectionResult { /* ... */ }
  public openChest(): void { /* ... */ }
  public recordDamage(amount: number): void { /* ... */ }
  public addCoins(amount: number): void { /* ... */ }
  public resolveEnemyKill(input: EnemyKillInput): EnemyKillRewards { /* ... */ }
  public settleFinalBossVictory(): RunSummary | null { /* ... */ }
  public rollLifesteal(): number { /* ... */ }
  public finish(victory: boolean): RunSummary | null { /* ... */ }
  public snapshot(): RunProgressionSnapshot { /* ... */ }
}
```

Scene은 시작 시 `getCharacter(options.characterId)`를 한 번 해석해 `characterId`와 `startingAbility`를 RunProgression에, 수치 스탯을 World에, `spriteKey`를 Player View 생성에 사용합니다. `initializeStartingAbility()`는 전달받은 ID를 정확히 한 번 `grant()`하며 RNG를 소비하지 않고 `abilityGranted`/toast/tone도 발생시키지 않습니다.

`ended`를 모든 메서드의 공통 guard로 만들지 않습니다. 새 frame의 clock/cooldown과 외부 `chooseAbility`는 차단하지만, 이미 시작한 frame에서 호출될 수 있는 `recordDamage`, `resolveEnemyKill`, `addCoins`, `gainExperience`, `openChest`와 Combat의 ability query/trigger는 현재처럼 실행될 수 있어야 합니다. 최초 `finish()`가 보관한 `RunSummary`는 이후 live 상태 변경과 분리된 값 객체로 유지합니다.

### 16.3 `AbilityDirector`는 RunProgression 내부에 둔다

현재 `AbilityDirector`는 능력 레벨과 cooldown을 함께 가집니다. 이번 단계에서 이를 다시 두 클래스로 쪼개지 않습니다.

RunProgression이 다음 포트를 구현하도록 합니다.

- 소유한 액티브 능력 조회
- 준비 여부
- 유효 스탯 계산
- cooldown trigger
- 전역 modifier 조회

Combat은 이 포트만 사용합니다. World에는 매 프레임 필요한 modifier snapshot만 전달합니다.

후보 선택은 현재 `AbilityDirector.buildChoices(count)`의 **전체 available 배열 shuffle 후 slice**를 유지합니다. 상자에서 1개만 필요하다고 `pick()` 한 번으로 최적화하면 RNG 소비 횟수가 달라집니다. 소유 능력의 runtime 순회도 `Map` 삽입 순서를 유지하고, 정렬은 snapshot 복사본에서만 합니다.

### 16.4 XP와 레벨업 흐름

```text
gainExperience(amount)
→ applyExperience()
→ level/xp/xpRequired 갱신
→ pendingLevelUps 증가
→ levelUpOpen이 아니면 후보 생성
→ levelUpRequested 의미 이벤트
→ Scene이 Phaser pause + Vue levelUp 이벤트
```

`RunProgression`은 `AbilityChoiceView`를 만들지 않습니다. 후보 ID와 레벨 정보만 반환하거나 이벤트로 제공합니다.

### 16.5 능력 선택 흐름

```text
Scene.chooseAbility(id)
→ progression.chooseAbility(id)
→ abilityGranted 이벤트
→ pendingLevelUps 감소
→ 남은 레벨업이 있으면 새 후보 이벤트
→ 없으면 Scene이 level-up hold 해제
→ gameEvents.emit('paused', false)
```

레벨업을 열 때는 `gameEvents.emit('paused', true)`를 발생시키지 않습니다. 기존과 같이 `levelUp` overlay가 화면 소유권을 가집니다.
선택 후 다음 pending level-up이 열려 여전히 paused이면 선택 tone을 내지 않고, 마지막 hold가 풀린 경우에만 `640Hz/0.08s` tone을 냅니다.

### 16.6 상자 처리

현재 상자는 다음 순서입니다.

```text
coins += 10
buildChoices(1)
grant(choice)
toast
tone
```

분리 후:

```text
World: pickupCollected(chest)
Scene: progression.addCoins(10)
Scene: progression.openChest()
RunProgression: abilityGranted(source='chest')
Scene: CHEST 토스트와 tone
```

상자 tone은 현재 `880Hz/0.12s`이며, 후보가 없으면 toast/tone 없이 코인 10만 반영합니다.

### 16.7 적 사망 보상

`RunProgression.resolveEnemyKill()`은 순수 보상 계획을 반환합니다.

```ts
interface PickupSpawnCommand {
  kind: PickupKind;
  x: number;
  y: number;
  value: number;
}

interface EnemyKillRewards {
  pickups: readonly PickupSpawnCommand[];
}
```

일반 적의 RNG 호출 순서를 그대로 유지합니다.

```text
1. coinChance 판정
2. 코인이 나오면 x offset RNG
3. specialRoll RNG
```

미니보스는 chest와 10코인 픽업을 반환합니다. 최종 보스의 `resolveEnemyKill()`은 kill과 코인 보상을 한 번 반영하고 빈 pickup 목록을 반환하지만 아직 `runEnded`를 발생시키지 않습니다. World가 `entityRemoved`를 발생시켜 Enemy View가 회수된 뒤 final boss 타입의 `enemyDefeatSettled`를 보내면 Scene이 `settleFinalBossVictory()`를 호출합니다. 이 메서드가 `finalBossRewardGranted`와 `runEnded`를 각각 한 번만 발생시킵니다.

### 16.8 종료 ID와 시간 주입

순수 단위 테스트를 위해 런 ID와 종료 시각을 주입합니다.

```ts
export interface RunIdentityProvider {
  createRunId(): string;
  nowIso(): string;
}
```

프로덕션 구현은 현재와 같이 `crypto.randomUUID()`를 우선 사용하고, 사용할 수 없으면 `run-${Date.now()}-${Math.floor(rng.next() * 1_000_000)}` 형식으로 fallback합니다. 이 fallback의 `rng`는 반드시 Scene이 만든 같은 공유 인스턴스여야 하며, `finish()`의 현재 위치에서만 한 번 소비합니다. `endedAt`은 그다음 `new Date().toISOString()`으로 만듭니다. 테스트 구현은 고정 ID와 시각을 반환하고 RNG를 소비하지 않습니다.

`finish()`는 최초 종료에서만 `runEnded` 의미 이벤트를 발생시키며, 반복 호출은 `null`을 반환합니다. Scene은 반환값과 이벤트를 동시에 처리하지 않고 `runEnded` 이벤트 한 경로만 UI에 연결합니다.

### 16.9 Scene에서 제거되어야 하는 원본 상태

단계 2 종료 후 Scene에 아래 필드가 남아 있으면 추출이 미완료입니다.

```text
level
xp
xpRequired
pendingLevelUps
levelUpOpen
kills
coins
damageDealt
ended
abilities 원본 인스턴스
```

Scene은 `progression.snapshot()`과 좁은 명령만 사용합니다.

### 16.10 단위 테스트

새 파일:

```text
tests/unit/run-progression.test.ts
```

필수 케이스:

- 시작 능력 정확히 한 번 지급, RNG·abilityGranted/표현 이벤트 미발생
- XP가 한 번에 여러 레벨을 올릴 때 pending 수
- 모든 능력이 max면 level-up이 정상 종료
- 잘못된 선택 또는 이미 닫힌 선택 무시
- 상자 능력 1개 지급
- 킬·코인·누적 피해
- 일반 적 드롭 RNG 순서
- 미니보스 보상
- 최종 보스 보상 → entityRemoved → `settleFinalBossVictory()` 순서와 finish 1회
- 반복 `finish()`가 `null`을 반환하고 이벤트 중복 없음
- `randomUUID` 부재 fallback의 공유 RNG 1회 소비와 ID 형식
- 고정 identity provider로 RunSummary 완전 비교

### 16.11 단계 2 완료 조건

```text
[ ] RunProgression에 import Phaser 없음
[ ] RunProgression에 gameEvents 없음
[ ] RunProgression에 현지화 문자열 없음
[ ] Scene에 성장·통계 원본 필드 없음
[ ] HUD와 저장 RunSummary 형식 동일
[ ] level-up overlay가 pause overlay에 덮이지 않음
[ ] finalBoss reward와 runEnded가 1회
[ ] golden trace 동일
```

---

## 17. 단계 3 — `WorldSystem` 추출

### 17.1 이동할 상태

```text
PlayerState
enemies
pickups
enemyGrid
SpawnDirector
nextChestTime
magnetTimer
recoveryTimer
```

공용 ID Source와 RNG는 주입받습니다.

### 17.2 권장 생성자

```ts
export interface PlayerInitialStats {
  maxHp: number;
  armor: number;
  moveSpeed: number;
  acceleration: number;
  luck: number;
  pickupRadius: number;
}

export interface WorldSystemConfig {
  player: PlayerInitialStats;
  level: typeof levelOne;
  durationSeconds: number;
  miniBossSeconds: number;
  enemyCap: number;
  rng: SeededRandom;
  ids: EntityIdSource;
  runState: RunStateQuery;
  eventSink: SimulationEventSink;
}

export class WorldSystem implements WorldQuery, WorldCommandSink {
  // 생성자는 RNG/ID/event를 소비하지 않는다.
  public initializePlayer(): void { /* character 수치로 PlayerState 생성 */ }
  public spawnInitialPickups(): void { /* 현재 create() 위치에서 명시적으로 호출 */ }
}
```

Scene은 `getCharacter(options.characterId)`에서 위 숫자만 골라 World에 전달합니다. `spriteKey`, `startingAbility`, 현지화 메타데이터까지 포함한 `CharacterDefinition` 전체를 World에 넘기지 않습니다. 캐릭터 ID와 `RunSummary.characterId`, starting ability는 RunProgression이 소유하고, Scene은 `spriteKey`에서 현재와 같은 `${spriteKey}-walk` animation key를 조립해 player View를 만듭니다.

### 17.3 World가 외부에서 받을 프레임 입력

```ts
export interface MoveInput {
  x: number;
  y: number;
}

export interface ViewportMetrics {
  width: number;
  height: number;
}

export interface WorldFrameModifiers {
  moveSpeedMultiplier: number;
  bonusArmor: number;
  recovery: null | {
    amount: number;
    cooldown: number;
  };
}
```

`WorldFrameModifiers`는 `ports.ts`의 값 타입으로 두어 RunProgression과 Scene이 WorldSystem 클래스를 import하지 않고 공유합니다.

Phaser 키 객체를 World에 전달하지 않습니다. Scene이 키보드와 터치에서 raw 이동 벡터를 조립합니다.

### 17.4 플레이어 이동 분리

Scene에 남는 부분:

```text
- WASD/방향키 읽기
- 키보드 입력이 있으면 터치보다 우선
- MoveInput 전달
- PlayerState를 playerSprite에 반영
```

World로 이동하는 부분:

```text
- normalize
- 목표 속도
- acceleration
- lerp/approach
- x/y 적분
- facingAngle
- invulnerability 감소
```

현재 코드는 두 축 모두에 `lerp`를 먼저 적용한 뒤, 입력 방향이 0인 축에는 `approach(..., 0, step)`를 한 번 더 적용합니다. 이를 “가속은 lerp, 감속은 approach” 중 하나만 선택하는 형태로 단순화하면 무입력 감속량이 달라집니다. 최종 속도의 절댓값 합이 2를 넘을 때만 `facingAngle`을 갱신하는 조건도 유지합니다.

일시정지 때 Scene은 입력을 0으로 만들고 `world.stopPlayer()`로 `vx`, `vy`를 0으로 만듭니다.

### 17.5 스폰과 viewport 경계

현재 적 스폰 반경은 Phaser `scale.width/height`에 의존합니다. World가 Phaser를 알지 않도록 현재 viewport 크기를 값으로 전달합니다.

```ts
world.updateSpawning({
  delta,
  elapsedSeconds,
  viewport: {
    width: this.scale.width,
    height: this.scale.height,
  },
});
```

World 내부 계산:

```ts
const viewportRadius = Math.max(viewport.width, viewport.height) * 0.57;
```

`SpawnDirector.update()`는 enemy cap을 확인하기 전에 항상 호출합니다. 따라서 cap에 막혀 실제 regular enemy를 만들지 못해도 weighted enemy 선택 RNG는 이미 소비됩니다. 그 결과를 받은 뒤 regular enemy에만 90/420 cap을 적용하고, mini/final boss는 현재처럼 cap과 무관하게 생성합니다. 순서는 regular → mini boss → final boss → chest `while`이며, boss 상태 추가 시 `entityAdded`로 View를 먼저 만든 뒤 `bossSpawned`로 toast를 만듭니다.

### 17.6 적 AI와 적 공격 의도

적 이동과 공격 타이머는 World가 소유합니다. 적이 원거리 무기를 발사해야 할 때 World는 순수한 의도를 **현재 적의 순회 위치에서 동기적으로 발생**시킵니다.

적 하나의 계산 순서도 그대로 둡니다.

```text
1. attackTimer/flashTimer 감소
2. bleed tick, 사망하면 현재 적 종료
3. 이동 전 위치로 distance와 direction 계산
4. knockback 감쇠와 위치 적분
5. 3번의 direction으로 facing 결정
6. 3번의 distance로 2,200 제거·접촉/사거리 판정
7. 이동 후 x/y를 origin으로, 3번 direction을 방향으로 공격 생성
```

이동 뒤 distance/direction을 다시 계산하면 접촉 시점과 투사체 각도가 달라집니다.

```ts
// WorldSystem.updateEnemies() 내부, 현재 fireEnemyWeapon() 호출 위치
this.eventSink({
  type: 'enemyAttackRequested',
  attack: {
    enemyType: enemy.enemyType,
    x: enemy.x,
    y: enemy.y,
    directionX,
    directionY,
    damage: definition.damage,
    projectileSpeed: definition.projectileSpeed,
  },
});
```

Scene의 호출 순서는 다음과 같습니다.

```ts
// enemyAttackRequested는 이 호출 스택 안에서 Combat으로 즉시 라우팅된다.
this.world.updateEnemies(delta, bonusArmor);
this.world.separateEnemies();
```

`EnemyAttackIntent[]`를 반환한 뒤 일괄 생성하면 안 됩니다. 현재는 앞쪽 적이 투사체 ID를 받은 다음 뒤쪽 적의 출혈 사망 드롭이 ID를 받습니다. 일괄 생성은 이 공용 ID 순서를 뒤집을 수 있고, ID를 사용하는 공간 분리 결과까지 바꿀 수 있습니다. 동기 이벤트는 분리 전 origin 좌표뿐 아니라 **적 순회 사이의 ID 할당 순서**도 보존합니다.

근접 적의 접촉 피해는 World가 직접 `damagePlayer()`로 적용해도 됩니다. 원거리 투사체와 Zone 충돌은 Combat에서 WorldCommandSink를 통해 적용합니다.

### 17.7 출혈

출혈 상태와 tick은 World가 소유합니다.

```text
Combat: 단검 적중 시 world.applyBleed(...)
World: bleedTimer와 bleedTickTimer 갱신
World: 0.75초마다 damageEnemy(..., canLifesteal=false)
```

현재 순서대로 적 이동 전에 출혈 tick을 처리합니다. 출혈로 죽은 적은 그 프레임에 이동하거나 공격하지 않습니다.
`bleedTimer > 0`인 상태로 진입했으면 `bleedTimer`와 `bleedTickTimer`를 둘 다 감소시킨 뒤, tickTimer가 0 이하일 때 한 번만 피해를 주고 0.75로 재설정합니다. 이 감소로 bleedTimer가 0 이하가 되었더라도 같은 호출의 마지막 tick은 수행하며, `while`로 밀린 tick을 여러 번 보충하지 않습니다.

### 17.8 피해와 회복

World의 `damageEnemy()`는 다음 순서를 지킵니다.

```text
1. active와 amount 검증
2. resolveDamage
3. hp 반영
4. flashTimer 설정
5. 넉백 반영
6. enemyDamaged 이벤트
7. hp <= 0이면 enemyKilled 이벤트
8. 이벤트의 동기 reward/drop 처리가 끝난 뒤 active=false
9. entityRemoved 이벤트
10. enemyDefeatSettled 이벤트
```

`enemyDamaged` 이벤트 처리 중 Scene이 누적 피해·피해 숫자·흡혈을 즉시 처리하므로, 현재 피해→표현→흡혈→사망 순서를 보존할 수 있습니다. `enemyKilled` 처리 중에는 현재 코드처럼 Enemy가 아직 active이고 View도 남아 있는 상태에서 일반/미니보스 드롭을 동기 생성합니다. 이벤트가 반환된 뒤 비활성화하고 `entityRemoved`에서 View를 회수한 다음 `enemyDefeatSettled`에서 사망 tone 또는 최종 보스 토스트·종료를 처리합니다.

일반 적 사망 tone은 `105Hz/0.025s`, mini boss는 `72Hz/0.12s`이며 final boss에는 이 사망 tone이 없습니다. final boss는 보상 toast 뒤 `runEnded`, 승리 결과 tone 순서입니다.

World의 `damagePlayer()`는 방어 보너스를 값으로 받습니다.

```ts
world.damagePlayer(rawDamage, progression.bonusArmor());
```

플레이어 피해 흐름은 다음을 권장합니다.

```text
1. `runState.isEnded()`, invulnerability, rawDamage 검증
2. armor를 적용한 실제 피해 계산
3. hp와 invulnerability 반영
4. playerDamaged 이벤트
5. hp <= 0이면 playerDied 이벤트
6. playerDamageSettled 이벤트
```

현재 코드는 별도의 `hp <= 0` 선행 guard를 두지 않으므로 추출하면서 추가하지 않습니다. Scene은 `playerDamaged`에서 tint → shake → 피해 숫자 → tone을 처리하고, `playerDied`에서 idempotent `progression.finish(false)`를 호출하며, 마지막 `playerDamageSettled`에서 HUD를 강제 발행합니다. `playerDied` 이벤트가 동기 처리되므로 같은 적 순회나 같은 projectile 순회의 뒤쪽 player damage는 `RunStateQuery`에서 즉시 차단됩니다. 승리로 먼저 종료된 경우도 같습니다.

`0 < rawDamage < 1`에서 armor 때문에 applied damage가 0이 되어도 현재 코드는 invulnerability 0.48초를 설정하고 `playerDamaged` 표현과 HUD를 실행합니다. applied damage가 0이라는 이유로 중간 반환하지 않으며, 피해 숫자의 기존 `Math.max(1, round(amount))` 표시도 characterization에서 별도로 잠급니다.

주기 회복은 recovery 능력이 없으면 timer를 감소시키지 않습니다. 능력이 있으면 timer 감소 → 0 이하일 때 `max(1, cooldown)`으로 먼저 재설정 → heal 순서이며, 이미 최대 HP여서 실제 회복이 0이어도 timer는 재설정됩니다. `healPlayer()`에는 ended guard를 새로 추가하지 않습니다.

### 17.9 픽업 업데이트

현재 계산 순서를 그대로 유지합니다.

```text
1. age 증가
2. 현재 거리 계산
3. 자석/반경으로 attracted 설정
4. 현재 거리 기준으로 이동
5. 이동 전 계산한 distance로 수집 여부 판정
6. 수집되지 않았고 distance > 2,600, age > 20초면 비활성화
```

이동 후 거리를 다시 계산하면 한 프레임 빨리 수집될 수 있으므로 초기 추출에서는 바꾸지 않습니다.
`attracted`는 한 번 `true`가 되면 magnet timer가 끝나도 다시 `false`로 돌아가지 않습니다. Magnet 수집은 compact 전 inactive 항목까지 포함한 현재 pickup 배열의 모든 항목을 즉시 `true`로 만들고 timer를 `max(current, 5)`로 연장합니다.

### 17.10 픽업 이벤트의 동기 처리

`WorldSystem.updatePickups()`가 수집을 감지하면 즉시 `pickupCollected` 이벤트를 호출합니다. Scene은 호출 스택 안에서 효과를 적용합니다.

```ts
private applyPickupEffect(event: PickupCollectedEvent): void {
  switch (event.kind) {
    case 'gem':
      this.progression.gainExperience(event.value);
      // 현재 gainExperience() 내부의 즉시 HUD 발행 위치를 보존한다.
      this.emitHud(true);
      this.tone(460, 0.025);
      break;
    case 'coin':
      this.progression.addCoins(event.value);
      this.tone(720, 0.035);
      break;
    case 'health':
      this.world.healPlayer(Math.max(10, event.value));
      break;
    case 'magnet':
      // 상태 반영 뒤 magnetActivated 이벤트가 현재 toast를 만든다.
      this.world.activateMagnet(5);
      break;
    case 'bomb':
      this.world.damageAllNonBossEnemies(9999);
      // 모든 동기 enemy kill/drop 처리 뒤, pickup 제거 전의 현재 위치.
      if (this.options.preferences.screenShake) this.cameras.main.shake(280, 0.008);
      break;
    case 'chest':
      this.progression.addCoins(10);
      this.progression.openChest();
      break;
  }
}
```

World는 이벤트가 반환된 뒤 다음 순서를 완료합니다.

```text
pickupCollected
→ Scene이 효과·tone/toast/shake를 동기 처리
→ pickup.active=false
→ entityRemoved로 Pickup View 회수
→ pickupCollectionSettled
→ Scene.emitHud(true)
```

gem만은 현재 `gainExperience()`가 하던 첫 HUD 발행을 tone보다 앞에서 한 번 더 유지합니다. 이 방식은 폭탄으로 생긴 드롭이 같은 픽업 순회에서 처리되는 동작과, 효과 → View 회수 → 마지막 HUD의 표현 순서를 함께 보존합니다.

### 17.11 공간 API

- `nearestEnemy(radius)`
- `queryEnemiesCircle(x, y, radius)`
- `getEnemy(id)`

Grid는 현재와 같은 cell size 96으로 만들고, `separateSpatialCircles()`의 분리 전·후 rebuild와 ID 기반 pair/겹침 각도를 그대로 사용합니다. Grid rebuild는 World 내부에서만 수행하며 Combat은 Grid를 직접 보지 않습니다.

### 17.12 World 단위 테스트

새 파일:

```text
tests/unit/world-system.test.ts
```

필수 케이스:

- 플레이어 가속·감속·대각선 normalize
- 초기 gem의 RNG/공용 ID 소비 순서
- invulnerability 감소
- 방어 최소 피해 1 규칙
- 1 미만 원시 피해의 방어 처리
- 회복 maxHp clamp
- 고정 viewport의 적 스폰 거리
- e2e cap 90 / 일반 cap 420
- 미니보스·최종 보스 1회 스폰
- 원거리 적 attack intent
- 앞쪽 적 공격과 뒤쪽 적 출혈 사망이 같은 frame에 일어날 때 projectile/drop 공용 ID 순서
- 접촉 공격 cooldown
- 출혈 0.75초 tick과 출혈 사망
- 2,200 거리 일반 적 제거, 보스 유지
- SpatialSeparation 뒤 Grid 최신성
- magnet 5초와 pickup attraction
- 오래 멀어진 픽업 제거
- damage 이벤트 순서
- kill 이벤트 중복 방지
- 같은 frame에 Run이 종료된 뒤 뒤쪽 player damage 차단

### 17.13 단계 3 완료 조건

```text
[ ] WorldSystem에 Phaser import 없음
[ ] Scene에 player/enemies/pickups 원본 배열 없음
[ ] enemyGrid는 World 내부 private
[ ] Combat이 World 배열을 직접 받지 않음
[ ] pickup 효과 라우팅이 의미 이벤트 기반
[ ] 적 공격 intent가 분리 전 좌표를 보존
[ ] golden trace 동일
```

---

## 18. 단계 4 — `CombatSystem` 추출

### 18.1 이동할 상태

```text
projectiles
zones
meleeEffects
orbiters
macheteSide
```

### 18.2 이동할 메서드군

```text
fireEnemyWeapon
updateWeapons
firePlayerProjectiles
fireGrenade
fireMolotov
fireSideSlash
createMelee
updateMelee
updateOrbiters
clearOrbiters
spawnProjectile
updateProjectiles
collidePlayerProjectile
collideEnemyProjectile
expireProjectile
spawnFragments
createExplosion의 규칙 부분
createZone
updateZones의 규칙 부분
deactivateProjectile
Combat 소유 배열 compact
```

`createExplosion()`의 Phaser circle, tween, shake, tone은 Scene에 남습니다. Combat은 피해 전에 `explosionCreated`, 피해 뒤에 `explosionResolved`를 동기 발생시키며 두 이벤트 사이에서 폭발 피해를 적용합니다.

### 18.3 권장 생성자

```ts
export interface CombatSystemConfig {
  rng: SeededRandom;
  ids: EntityIdSource;
  world: CombatWorldPort;
  abilities: CombatAbilityPort;
  eventSink: SimulationEventSink;
}

export class CombatSystem {
  // Phaser-free implementation
}
```

### 18.4 적 공격 투사체

World에서 받은 `EnemyAttackIntent`를 Combat이 ProjectileState로 변환합니다.

```text
ranged    → enemyGrenade, directCollision=true
boomerang → enemyBoomerang, boomerang=true, pierce=2
gravity   → enemyGravityGrenade, directCollision=false, expiry=gravity
```

이 메서드는 World 클래스나 `EnemyState` 전체를 요구하지 않아야 합니다.

### 18.5 능력 포트 사용

Combat은 다음을 RunProgression의 포트로부터 얻습니다.

- 소유한 액티브 능력
- `isReady()`
- `effectiveStats()`
- `trigger()`
- 전역 damage 배율
- bonus armor

Combat이 능력 레벨을 직접 변경하거나 선택 후보를 만들지 않습니다.

`weaponFired`는 “모든 무기가 발사됐다”는 일반 알림이 아니라 현재 tone 호출 위치를 보존하는 표현 cue로 제한합니다.

```text
machineGun/shuriken/dagger → projectile batch 전체 생성 뒤 1회
bat/lightsaber/machete     → createMelee 1개마다 1회
sword                      → 양쪽 Melee 각각 1회, 합계 2회
grenade/bazooka/molotov/axe/enemy weapon → 발생시키지 않음
```

Scene의 기존 cue는 `machineGun=160Hz/0.025s`, `shuriken·dagger=320Hz/0.025s`, `lightsaber=520Hz/0.05s`, 나머지 Melee=`210Hz/0.05s`입니다.

즉 `fireReadyWeapons()` 루프 끝에서 능력마다 일괄 한 번 발생시키면 sword tone 횟수와 projectile View 생성 대비 tone 순서가 달라집니다.

### 18.6 투사체 동작 순서

현재 순서를 유지합니다.

```text
1. ttl 감소
2. 부메랑 반환 시점 판정
3. 위치 적분
4. 회전 갱신
5. owner별 직접 충돌
6. 비활성 여부 확인
7. ttl <= 0 또는 player와 distanceSquared > 4,000,000이면 만료
```

`forEach()`나 immutable map으로 바꾸기보다, 같은 프레임 append를 보존하는 명시적 index loop가 안전합니다.

```ts
for (let index = 0; index < this.projectiles.length; index += 1) {
  const projectile = this.projectiles[index];
  if (!projectile?.active) continue;
  // 배열 뒤에 fragment가 추가되면 현재 프레임에서 이어서 처리 가능
}
```

### 18.7 단검 출혈

```text
Projectile hit
→ world.damageEnemy(canLifesteal=true)
→ sourceAbility === dagger면 world.applyBleed()
→ pierce 감소
```

현재는 직접 피해 후 출혈 상태를 적용하며, 직접 피해로 적이 죽어 비활성화된 경우에도 compact 전 객체의 `bleedDamage`와 `bleedTimer`를 갱신합니다. gameplay 효과는 없지만 raw state와 호출 순서를 보존하려면 `applyBleed()`가 “inactive”만으로 무시하면 안 됩니다. ID에 해당하는 객체가 아직 배열에 있으면 값을 쓰고, 이후 `updateEnemies()`의 active guard가 tick을 막도록 합니다.

### 18.8 근접 공격

`MeleeState`에는 다음만 남깁니다.

- id
- sourceAbility
- angle/angularVelocity
- arcHalfAngle
- radius/damage/knockback
- ttl/totalTtl
- hitIds

Scene은 `sourceAbility`로 texture, scale, origin을 결정합니다.
각 effect는 TTL 감소와 angle 적분을 먼저 하고, 그 위치에서 아직 맞지 않은 적을 판정한 뒤, 마지막에 TTL이 0 이하면 제거합니다. 따라서 만료 frame에도 한 번 더 적중할 수 있습니다. `lightsaber`의 각도 무시와 `hitIds` 1회 제한도 그대로 둡니다.

### 18.9 회전 무기

`OrbiterState`는 다음을 가집니다.

- index
- x/y
- angle
- `lastHitAt`

Orbiter 수가 줄면 Combat이 상태를 제거하고 Scene이 View를 회수합니다. 공용 엔티티 ID를 소비하지 않도록 index 기반 key를 유지합니다.
`lastHitAt`은 항목 수가 160을 넘을 때만 정리하고, 그때 현재 elapsed 기준 6초보다 오래된 항목을 삭제합니다. 매 frame 정리하거나 inactive enemy 제거와 동시에 정리하면 Map 순회 비용과 snapshot 특성이 달라집니다.

### 18.10 Zone

Combat이 소유하는 것:

- TTL
- tickTimer
- 피해 판정
- 중력 pull 계산
- 플레이어 displacement 명령

Scene이 소유하는 것:

- Arc 생성
- 색상
- stroke
- pulse scale
- alpha
- destroy

현재 새 Zone은 `tickTimer = 0`으로 생성되고 같은 프레임 `updateZones()`에서 피해를 줍니다. Zone 하나는 TTL/tickTimer 감소 → pulse 값 계산 → gravity pull → 필요 시 damage tick 1회 → 마지막에 TTL 만료·제거 순서입니다. 따라서 이번 감소로 TTL이 0 이하가 되어도 그 frame의 pull/tick을 먼저 수행하며, `while`로 밀린 tick을 보충하지 않습니다.

fire/gravity projectile 만료 시에는 Zone 상태 추가와 `entityAdded`가 먼저, 원본 projectile의 `entityRemoved`가 그다음입니다. View 수명 순서까지 뒤집지 않습니다.

### 18.11 폭발

현재 `createExplosion()`은 원형 View/tween을 먼저 만들고, 피해를 적용한 뒤, 플레이어 폭발의 shake·tone을 실행합니다. 수류탄 파편은 `createExplosion()`이 반환된 다음 생성됩니다. 종료 프레임의 tween pause와 tone 순서까지 유지하려면 이벤트를 한 개로 뭉치지 않습니다.

Combat과 Scene의 동기 순서:

```text
1. Combat: explosionCreated 이벤트
2. Scene: 원형 시각 효과와 tween 생성
3. Combat: 범위 질의·overlap·damageEnemy 또는 damagePlayer
4. Combat: explosionResolved 이벤트
5. Scene: player 폭발이면 screen shake와 tone
6. Combat: grenade fragment 생성
7. Combat: 원본 projectile 비활성화와 entityRemoved
```

`explosionCreated` 핸들러에서 피해를 다시 적용하거나 shake/tone까지 한 번에 실행하지 않습니다. `explosionResolved`는 피해 처리 뒤의 표현 피드백만 뜻합니다. 적 폭발은 현재처럼 원형 View는 만들지만 player 폭발용 shake·tone은 실행하지 않습니다.

이 순서를 characterization event trace에 포함합니다. 다른 overlap 대상이 없는 fixture에서 폭발로 최종 보스가 죽는 경우 `explosionCreated → enemyDamaged → enemyKilled → enemy entityRemoved → enemyDefeatSettled → finalBossRewardGranted → runEnded → explosionResolved → fragment entityAdded → 원본 projectile entityRemoved` 순서가 유지되는지 확인합니다.

여러 적이 겹친 fixture에서는 `runEnded`가 범위 순회를 중단하지 않습니다. Grid가 반환한 뒤쪽 적의 damage/kill/drop 이벤트가 `runEnded`와 `explosionResolved` 사이에 계속 들어올 수 있으며, 이미 만든 `RunSummary`에는 그 후속 변경이 소급 반영되지 않습니다.

### 18.12 Combat 단위 테스트

새 파일:

```text
tests/unit/combat-system.test.ts
```

기존 `tests/unit/combat.test.ts`의 순수 함수 테스트는 유지하고 시스템 테스트를 추가합니다.

필수 케이스:

- 가장 가까운 적 target
- 기관총 spread와 count
- 수리검 회전
- 단검 pierce와 bleed command
- grenade 만료·폭발·파편 6개
- 폭발 View 생성 → 피해/종료 → shake·tone → fragment 순서
- bazooka 직접 충돌 후 폭발
- Molotov Zone 생성
- sword 양방향
- machete 좌우 교대
- lightsaber 각도 무시 판정
- orbiter count와 0.42초 hit cooldown
- enemy boomerang TTL 48% 반환
- player/enemy projectile 충돌
- gravity pull
- Zone 즉시 첫 tick
- 비활성 엔티티 중복 제거 이벤트 없음
- 같은 프레임 fragment 처리
- 최종 보스 뒤 같은 폭발 범위의 후속 적 처리와 최초 RunSummary 불변

### 18.13 단계 4 완료 조건

```text
[ ] CombatSystem에 Phaser import 없음
[ ] CombatSystem에 gameEvents/현지화 문자열 없음
[ ] Scene에 projectiles/zones/melee/orbiters 원본 배열 없음
[ ] ObjectPool은 Scene에만 있음
[ ] Combat은 WorldQuery/Command와 AbilityPort만 사용
[ ] fragment와 새 Zone의 same-frame 동작 보존
[ ] golden trace 동일
```

---

## 19. 단계 5 — `SurvivorScene` 최종 정리

### 19.1 Scene에 남길 책임

```text
- Phaser create/update/shutdown
- 키보드·터치 입력 수집
- 배경·카메라
- 세 시스템 생성과 호출 순서
- 의미 이벤트 라우팅
- 순수 상태 → Phaser View 동기화
- Sprite Pool과 View Map
- HUD snapshot 조립
- 토스트·피해 숫자·화면 흔들림
- 오디오
- pause와 level-up hold
- 테스트 bridge 위임
```

### 19.2 Scene에 남으면 안 되는 원본 상태

```text
enemies
projectiles
pickups
zones
meleeEffects
orbiters
player.hp 원본
level
xp
kills
coins
damageDealt
```

Scene이 갖는 Map은 View 캐시이며 게임 상태의 SSOT가 아닙니다.

### 19.3 최종 update 골격

아래 순서는 현재 구현을 보존하기 위한 형태입니다.

```ts
private stepSimulation(delta: number): void {
  if (this.isSimulationHeld()) return;
  this.simulationFrame += 1;

  // 1. clock와 공통 타이머
  this.progression.advanceClock(delta);
  this.advanceSceneFrameTimers(delta); // hudTimer, compactTimer
  this.world.advanceFrameTimers(delta);
  const elapsedSeconds = this.progression.elapsed();
  const worldModifiers = this.progression.worldModifiers();

  // 2. 현재 구현의 배경 갱신 위치 보존
  this.updateBackground(this.world.player);

  // 3. player
  const moveInput = this.readMoveInput();
  this.world.updatePlayer(moveInput, delta, worldModifiers.moveSpeedMultiplier);
  this.syncPlayerView();

  // 현재 구현과 같이 플레이어 이동 뒤 cooldown을 감소시킨다.
  this.progression.tickAbilityCooldowns(delta);

  // 4. recovery
  this.world.updateRecovery(delta, worldModifiers.recovery);

  // 5. spawning
  this.world.updateSpawning({
    delta,
    elapsedSeconds,
    viewport: { width: this.scale.width, height: this.scale.height },
  });
  this.syncNewWorldViews();

  // 6. enemy AI and enemy weapon spawn
  // enemyAttackRequested가 적 순회 도중 Combat으로 동기 라우팅된다.
  this.world.updateEnemies(delta, worldModifiers.bonusArmor);

  // 7. separation and enemy view sync
  this.world.separateEnemies();
  this.syncEnemyViews();

  // 8. combat phases — 순서를 합치지 않는다.
  this.combat.updateOrbiters(delta, elapsedSeconds);
  this.syncOrbiterViews(); // index key를 사용하며 공용 ID를 소비하지 않음
  this.combat.fireReadyWeapons();
  this.combat.updateMelee(delta);
  this.combat.updateProjectiles(delta);
  this.combat.updateZones(delta, elapsedSeconds);

  // 9. pickup
  this.world.updatePickups(delta, elapsedSeconds);

  // 10. View sync와 maintenance
  // 생성/제거와 enemy hit tint는 동기 이벤트에서 이미 반영한다.
  // 여기서는 살아 있는 공격체/픽업의 최종 transform을 맞추고 누락을 진단한다.
  this.syncCombatViews();
  this.syncPickupViews();
  this.compactIfDue();
  this.emitHud(false);
}
```

`advanceClock()`과 `tickAbilityCooldowns()`를 분리한 이유는 현재 구현의 호출 위치를 그대로 보존하기 위해서입니다. 두 메서드를 하나로 합치면 cooldown이 한 phase 빨리 감소할 수 있습니다.

`hudTimer`와 `compactTimer`는 현재처럼 frame 시작에 감소시킵니다. HUD 발행은 timer를 0.08초로, compact 실행은 0.7초로 재설정합니다. 특히 pickup의 강제 `emitHud(true)`가 timer를 재설정한 뒤 frame 끝에서 다시 delta를 빼면 다음 HUD 발행 시점이 달라지므로, 감소를 `emitHud()`나 `compactIfDue()` 안으로 옮기지 않습니다.

`isSimulationHeld()`는 step 진입 시에만 검사합니다. 중간 phase에서 `runEnded`가 발생했다고 뒤쪽 loop/phase를 조기 반환하지 않으며, 같은 frame의 후속 enemy damage·kill·pickup 명령도 일괄 무시하지 않습니다. 새 프레임과 player damage만 종료 상태로 차단하는 현재 비대칭을 Phase 0 fixture가 고정합니다.

`syncEnemyViews()`가 Combat보다 앞에 있으므로 피격 tint를 이 메서드 하나에만 의존하면 현재보다 한 프레임 늦습니다. `enemyDamaged` 이벤트에서 해당 View를 즉시 갱신하고, 다음 프레임의 `syncEnemyViews()`가 `flashTimer`를 기준으로 유지·해제합니다. 반대로 Zone 중력 displacement 뒤에는 `syncPlayerView()`를 다시 호출하지 않아 현재의 한 프레임 View 지연을 보존합니다.

### 19.4 Pause 상태를 분리하되 동작 개선은 섞지 않기

최종 정리 단계에서는 다음 상태를 구분하는 것이 안전합니다.

```ts
type HoldReason = 'none' | 'manual' | 'levelUp' | 'ended';
```

| 이유 | 시뮬레이션 | Phaser anim/tween/sound | Raw AudioContext | Vue 이벤트 |
|---|---:|---:|---:|---|
| none | 실행 | 실행 | 실행 | paused=false 필요 시 |
| manual | 정지 | 정지 | suspend | paused=true |
| levelUp | 정지 | 정지 | suspend | levelUp만 발생 |
| ended | 정지 | 정지 | 아래의 기존 전이 규칙 유지 | runEnded |

`HoldReason` 도입은 소유권을 명확히 하기 위한 모델링이며, raw audio 정책을 자동으로 바꾸는 허가가 아닙니다. 현재 일반적인 `running → ended`에서는 `applyPausedState(true, false)` 뒤 결과 tone이 허용됩니다. 반면 이미 `manual` 또는 `levelUp`으로 paused인 상태에서 테스트 브리지가 종료를 호출하면 `applyPausedState()`의 early return 때문에 raw audio 상태가 그대로 남을 수 있습니다.

후자의 동작은 기존 코드에서 발견된 별도 버그 후보입니다. Phase 0에 전이별 characterization을 추가하고, 본 리팩터링에서는 결과를 그대로 보존합니다. Pause Mode 전체 비교로 이를 개선하려면 시스템 추출과 golden 동등성이 끝난 뒤 별도 버그 수정 slice에서 기대 동작을 먼저 승인하고 회귀 테스트를 추가합니다.

종료 뒤 같은 frame의 픽업이 `levelUpRequested`를 만들더라도 presentation hold 우선순위는 `ended`가 가장 높습니다. 앱의 기존 `showLevelUp()`도 summary가 있으면 화면 전환을 무시합니다. 이를 이유로 해당 픽업의 XP/ability RNG 자체를 건너뛰지는 않습니다.

### 19.5 HUD 조립

Scene은 세 시스템 snapshot을 읽어 기존 `HudSnapshot`을 만듭니다.

```ts
const run = this.progression.snapshot();
const player = this.world.player;
const boss = this.world.activeBoss();

const snapshot: HudSnapshot = {
  hp: player.hp,
  maxHp: player.maxHp,
  xp: run.xp,
  xpRequired: run.xpRequired,
  level: run.level,
  elapsedSeconds: run.elapsedSeconds,
  remainingSeconds: Math.max(0, run.durationSeconds - run.elapsedSeconds),
  kills: run.kills,
  coins: run.coins,
  bossHp: boss?.hp ?? null,
  bossMaxHp: boss?.maxHp ?? null,
  abilities: run.abilities.map(({ id, level }) => ({
    id,
    level,
    iconUrl: iconUrl(getAbility(id).iconKey),
  })),
};
```

HUD를 위해 상태를 Scene 필드에 복사하지 않습니다.

### 19.6 테스트 브리지 위임

기존 외부 계약은 유지합니다.

```text
bridge grantXp           → Scene.testGrantXp → max(0, amount) XP + emitHud(true)
bridge damagePlayer      → Scene.testDamagePlayer → invulnerability=0 뒤 max(0, amount) World damage
bridge spawnEnemy        → Scene.testSpawnEnemy → crawler, fixedDistance=145
bridge testKillFinalBoss → Scene.testKillFinalBoss → 없으면 finalBoss, fixedDistance=180,
                           현재 HP만큼 canLifesteal=false 피해
bridge finishRun         → Scene.testFinish → progression.finish
bridge step (추가)       → Scene.testStep, manual clock에서만 stepSimulation
bridge setMoveInput (추가) → 기존 Scene.setTouchVector의 normalize/clamp 경로
bridge testGrantAbility (추가) → 현재 grant 경로, RNG 미소비
bridge testSpawnEnemyAt (추가) → 현재 spawnEnemy 경로 뒤 상태/View 좌표 설정
bridge testSpawnPickup (추가)  → 현재 spawnPickup 경로
bridge resetEventTrace (추가)  → test-only 관찰 배열만 비움
```

`testSnapshot()`은 시스템 snapshot을 합쳐 반환합니다. View pool 회귀를 잡기 위해 E2E 전용 진단 필드를 확장할 수 있습니다.

기존 `window.__C2_GAME__` 명령의 이름과 의미는 바꾸지 않습니다. 새 명령은 additive이며 setup/step 명령은 manual E2E가 아니면 실패합니다. `e2e=1`이 아닌 환경에는 브리지를 노출하지 않습니다. `testDamagePlayer`의 무적 시간 초기화를 빼거나 기존 `testSpawnEnemy`의 거리·적 종류를 바꾸면 E2E 계약 변경입니다.

```ts
viewCounts: {
  enemies: this.enemySpriteMap.size,
  projectiles: this.projectileSpriteMap.size,
  pickups: this.pickupSpriteMap.size,
  zones: this.zoneViewMap.size,
  melee: this.meleeSpriteMap.size,
  orbiters: this.orbiterSpriteMap.size,
}
```

### 19.7 shutdown

순서는 다음을 권장합니다.

```text
1. active scene detach
2. 시스템을 더 이상 update하지 않도록 종료 표시
3. Zone Arc destroy
4. View Map clear
5. 모든 Sprite pool destroy
6. active tone stop
7. AudioContext close
8. 시스템 참조 해제 가능 상태
```

`pool.destroy()`가 in-use Sprite까지 `releaseAll()`하므로, shutdown에서 개별 Sprite를 이중 release하지 않도록 한 경로만 사용합니다.

### 19.8 Scene 줄 수

권장 목표는 약 450–650줄입니다. 다만 다음 코드가 Scene에 남아 500줄을 넘는 것은 실패가 아닙니다.

- 여러 View Map 동기화
- texture/depth/scale 표현 매핑
- HUD View 모델 조립
- pause/audio
- E2E bridge

실패 기준은 줄 수가 아니라 **순수 게임 규칙이 Scene에 남는 것**입니다.

---

# Part D. 현재 메서드 이동표

## 20. Scene에 유지할 메서드

| 현재 메서드 | 현재 행 | 최종 역할 |
|---|---:|---|
| `constructor` | 205 | Scene 등록 |
| `init` | 209 | 옵션 저장 또는 구성 준비 |
| `create` | 218 | 시스템 조립, View 생성, bridge 연결 |
| `update` | 234 | phase 호출 순서만 조정 |
| `setPaused`, `togglePause` | 285–294 | hold reason과 표현 pause |
| `setTouchVector` | 296 | 입력 어댑터 |
| `testSnapshot` | 303 | 시스템 snapshot 조립 |
| `testGrantXp`, `testDamagePlayer`, `testSpawnEnemy`, `testKillFinalBoss`, `testFinish` | 321–346 | 기존 의미를 유지하며 시스템에 위임 |
| `createBackground` | 348 | Phaser View |
| `bindInput` | 396 | Phaser 입력 |
| `updateBackground` | 411 | Phaser View |
| `showDamageNumber` | 1,210 | Phaser text/tween |
| `emitHud` | 1,229 | Vue용 snapshot 조립 |
| `acquireSprite`, `releaseSprite` | 1,275–1,298 | View pool |
| `applyPausedState`, `syncAudioContextState`, `stopActiveTones` | 1,342–1,395 | Phaser·Web Audio pause |
| `tone` | 1,397 | 표현 음향 |
| `handleShutdown` | 1,427 | Phaser 자원 정리 |

`syncEnemyPositions`는 제거되기보다 `syncPlayerView`, `syncEnemyViews`, `syncCombatViews`, `syncPickupViews`로 확장됩니다.

---

## 21. RunProgression으로 이동할 메서드/부분

| 현재 메서드 | 현재 행 | 이동 내용 |
|---|---:|---|
| `chooseAbility` | 265 | grant, pending, 다음 후보 결정 |
| `createPlayer` 일부 | 369 | characterId·starting ability·초기 XP 기준 |
| `openChest` | 1,046 | 선택·grant 규칙 |
| `gainExperience` | 1,055 | XP와 레벨 |
| `openLevelUp` | 1,067 | 후보 ID와 상태 |
| `damageEnemy` 일부 | 1,097 | `damageDealt` 누적 |
| `tryLifesteal` | 1,123 | 능력·RNG 판정, 회복량 반환 |
| `killEnemy` 일부 | 1,130 | kills, drop reward plan, final reward |
| `finishRun` | 1,254 | idempotent RunSummary 생성 |
| `abilities.tick` 호출 | update 내부 | cooldown 상태 |

현지화, icon URL, toast, tone, pause는 이동하지 않습니다.

---

## 22. WorldSystem으로 이동할 메서드/부분

| 현재 메서드 | 현재 행 | 이동 내용 |
|---|---:|---|
| `createPlayer` 일부 | 369 | PlayerState 생성 |
| `spawnInitialPickups` | 403 | 순수 PickupState 생성 |
| `updatePlayer` 계산 | 424 | 이동·가속·facing |
| `updateRecovery` | 459 | recoveryTimer와 heal 적용 |
| `updateSpawning` | 469 | SpawnDirector, chest schedule |
| `spawnEnemy` 계산 | 495 | 위치·HP·EnemyState |
| `updateEnemies` | 531 | AI·이동·접촉 공격·intent |
| `updateBleed` | 579 | 상태효과 tick |
| `spawnPickup` 계산 | 973 | PickupState |
| `updatePickups` | 989 | 위치·유도·수집 판정 |
| `damageEnemy` 상태 부분 | 1,097 | HP·넉백·flash·kill 확정 |
| `deactivateEnemy` 상태 부분 | 1,164 | active false |
| `damagePlayer` 상태 부분 | 1,171 | 방어·HP·invulnerability |
| `healPlayer` 상태 부분 | 1,185 | HP clamp |
| `nearestEnemy` | 1,195 | 공간 query |
| `deactivatePickup` 상태 부분 | 1,306 | active false와 entityRemoved |
| `compactEntities` 일부 | 1,312 | enemies/pickups |
| `approach` | 1,337 | World의 순수 이동 helper |

Sprite 조작, 카메라, 피해 숫자, tone은 이동하지 않습니다.

---

## 23. CombatSystem으로 이동할 메서드/부분

| 현재 메서드 | 현재 행 |
|---|---:|
| `fireEnemyWeapon` | 589 |
| `updateWeapons` | 619 |
| `firePlayerProjectiles` | 655 |
| `fireGrenade` | 676 |
| `fireMolotov` | 691 |
| `fireSideSlash` | 703 |
| `createMelee` 규칙 | 713 |
| `updateMelee` 규칙 | 731 |
| `updateOrbiters` 규칙 | 756 |
| `clearOrbiters` 상태 | 796 |
| `spawnProjectile` 상태 | 803 |
| `updateProjectiles` | 820 |
| `collidePlayerProjectile` | 842 |
| `collideEnemyProjectile` | 865 |
| `expireProjectile` | 872 |
| `spawnFragments` | 885 |
| `createExplosion` 피해 부분 | 898 |
| `createZone` 상태 부분 | 916 |
| `updateZones` 규칙 | 936 |
| `deactivateProjectile` 상태 | 1,300 |
| `compactEntities` 일부 | 1,312 |

---

`compact`(현재 generic 메서드, 1,320행)는 World/Combat 소유 배열의 기존 in-place 순서를 유지하는 helper로 사용하되, 이를 위해 새 전역 시스템을 만들지 않습니다. `nextId`(현재 1,331행)는 Scene 메서드로 남기지 않고 공용 `EntityIdSource.next()`로 치환합니다.

## 24. 반드시 둘 이상으로 쪼갤 메서드

| 현재 메서드 | 분리 결과 |
|---|---|
| `createPlayer` | World 상태 생성 + Scene Sprite 생성 |
| `updatePlayer` | Scene 입력 수집 + World 이동 + Scene View sync |
| `spawnEnemy` | World 상태 생성 + Scene View ensure |
| `updateEnemies` | World AI + Combat enemy attack intent + Scene View sync |
| `createMelee` | Combat 상태 생성 + Scene Sprite ensure |
| `createExplosion` | Combat 범위 피해 + Scene circle/tween/shake/tone |
| `createZone` | Combat ZoneState + Scene Arc |
| `spawnPickup` | World PickupState + Scene View ensure |
| `collectPickup` | World 수집 판정 + Scene event routing + World/Run 명령 |
| `openLevelUp` | Run 후보 + Scene 현지화 View + Scene pause |
| `damageEnemy` | World 피해 + Run 통계/흡혈 + Scene 표현 |
| `killEnemy` | World 제거 + Run 보상 + World 드롭 + Scene 표현 |
| `damagePlayer` | World HP + Scene 표현 + Run 종료 |
| `healPlayer` | World HP + Scene 표현 |
| `finishRun` | Run summary + Scene pause/audio/UI event |

---

# Part E. 테스트와 아키텍처 가드

## 25. 새 테스트 파일 권장안

```text
tests/unit/
├─ architecture-boundaries.test.ts
├─ run-progression.test.ts
├─ world-system.test.ts
├─ combat-system.test.ts
└─ simulation-replay.test.ts

tests/e2e/
└─ simulation-golden.spec.ts
```

기존 테스트는 삭제하지 않습니다.

---

## 26. 정적 경계 테스트

`architecture-boundaries.test.ts`에서 소스 파일을 읽어 최소한 다음을 검사합니다.

```ts
const pureSystemFiles = [
  'src/game/systems/WorldSystem.ts',
  'src/game/systems/CombatSystem.ts',
  'src/game/systems/RunProgression.ts',
];

for (const file of pureSystemFiles) {
  const source = readFileSync(file, 'utf8');
  expect(source).not.toMatch(/from ['"]phaser['"]/);
  expect(source).not.toMatch(/\bPhaser\./);
  expect(source).not.toMatch(/gameEvents/);
  expect(source).not.toMatch(/iconUrl\(/);
}
```

추가 검사:

```text
ObjectPool<Phaser.GameObjects.Sprite> 사용 위치는 Scene/View 계층뿐
World/Combat/Run에 한국어·영어 toast 문자열 없음
순수 model에 sprite/visual/GameObjects 없음
Scene에 원본 배열 필드 선언 없음
```

정규식은 완전한 컴파일러 검증은 아니지만, 경계 회귀를 빠르게 잡는 안전망으로 유용합니다.

---

## 27. 결정론적 replay 테스트

최종적으로는 Phaser 없이 세 시스템을 직접 조립해 테스트합니다.

```ts
const events: SimulationEvent[] = [];
const rng = new SeededRandom(20260729);
const ids = new SequentialEntityIdSource();
const identity = fixedIdentityProvider('run-fixed', '2026-07-30T00:00:00.000Z');
const character = getCharacter('blue');

// 현재 Scene의 createBackground()가 먼저 소비하는 360회와 동일하다.
for (let index = 0; index < 120; index += 1) {
  rng.between(-1800, 1800);
  rng.between(-1800, 1800);
  rng.between(1, 3);
}

let progression: RunProgression;
let world: WorldSystem;
let combat: CombatSystem;
let routeDomainEvent: SimulationEventSink = () => {
  throw new Error('A constructor emitted before the simulation router was ready.');
};

const eventSink: SimulationEventSink = (event) => {
  events.push(structuredClone(event));
  routeDomainEvent(event);
};

progression = new RunProgression({
  eventSink,
  identity,
  rng,
  characterId: character.id,
  startingAbility: character.startingAbility,
  /* duration 등 */
});
world = new WorldSystem({
  eventSink,
  ids,
  rng,
  runState: progression,
  player: {
    maxHp: character.maxHp,
    armor: character.armor,
    moveSpeed: character.moveSpeed,
    acceleration: character.acceleration,
    luck: character.luck,
    pickupRadius: character.pickupRadius,
  },
  /* level/duration/cap 등 */
});
combat = new CombatSystem({ eventSink, ids, rng, world, abilities: progression });

routeDomainEvent = createTestDomainRouter({
  progression,
  world,
  combat,
  // Phaser 표현은 만들지 않지만 시스템 간 명령은 Scene과 같은 순서로 즉시 실행한다.
  presentation: () => undefined,
});

world.initializePlayer();
progression.initializeStartingAbility();
world.spawnInitialPickups();
```

`createTestDomainRouter`는 예시 이름입니다. 핵심은 event sink가 이벤트를 배열에 기록만 해서는 안 된다는 점입니다. `enemyDamaged → recordDamage/표현/lifesteal`, `enemyKilled → reward/drop`, `enemyDefeatSettled → 사망 feedback/최종 승리`, `pickupCollected → XP/코인/회복 → entityRemoved → pickupCollectionSettled`, `playerDamaged → 필요 시 playerDied/finish(false) → playerDamageSettled`, `enemyAttackRequested → Combat spawn`을 Scene과 같은 동기 순서로 실행해야 합니다. 그렇지 않으면 Phaser-free replay는 실제 게임과 다른 시뮬레이션입니다.

테스트 harness는 Scene의 `stepSimulation()`과 같은 phase 순서를 호출합니다. 시스템별 `update()`를 임의로 묶지 않습니다. Phase 0의 브라우저 fixture와 비교하는 동안에는 위 legacy background RNG warm-up을 제거하지 않습니다. 표현 RNG를 분리하는 후속 변경에서만 새 fixture 승인과 함께 제거합니다.

### fixture 비교에서 포함할 값

- 보스 spawn frame
- 플레이어 HP
- XP/레벨/required XP
- kills/coins/damageDealt
- 능력 ID·레벨·cooldown
- 활성 적/투사체/픽업/Zone/Melee/Orbiter 수
- 의미 이벤트 타입과 순서
- 최종 RunSummary의 결정론적 필드

---

## 28. E2E 보강

현재 E2E는 레벨업, 수동 pause, 패배, 최종 보스 승리, 저장을 잘 확인합니다. 다음 케이스를 추가합니다.

### 28.1 레벨업과 pause 소유권

```text
- levelUp 열림
- pause-dialog hidden
- P/Escape 입력이 manual pause를 열지 않음
- 선택 후 다음 pending이 있으면 levelUp 유지
- 마지막 선택 뒤 playing 복귀
```

### 28.2 `runEnded` 정확히 한 번

테스트 bridge에 이벤트 count를 노출하거나 App listener에서 test-only count를 기록합니다.

```text
- final boss에 반복 damage 호출
- finishRun 반복 호출
- run DB row 1개
- profile totalRuns 1
- runEnded event count 1
```

### 28.3 View pool 회수

```text
model enemy count === enemySpriteMap.size
model projectile count === projectileSpriteMap.size
model pickup count === pickupSpriteMap.size
종료·재시작 후 이전 View count 0
```

### 28.4 주요 전투 smoke

`/?e2e=1&clock=manual`에서 위 test-only 능력·적·픽업 setup 명령을 사용합니다. setup을 마친 뒤 event trace를 초기화하고 다음을 직접 확인합니다.

- projectile count 증가 후 감소
- explosion event 발생
- bleed 상태 또는 damage 누적
- orbiter count
- magnet timer
- bomb 뒤 일반 적 0, 보스 유지

### 28.5 cmux 인앱 브라우저 수동 검증

cmux에서 작업할 때는 저장소의 [`cmux-in-app-browser.md`](./cmux-in-app-browser.md)를 따릅니다. 이 프로젝트의 Vite 포트는 일반 예시의 5173이 아니라 `127.0.0.1:4173`입니다.

별도 pane에서 개발 서버를 실행합니다.

```bash
npm run dev
```

cmux 인앱 브라우저에서 `http://127.0.0.1:4173`을 열고 각 Phase의 관련 동작을 실제로 확인합니다.

```bash
cmux browser identify
cmux browser open-split http://127.0.0.1:4173
cmux browser surface:<id> snapshot --interactive --compact
cmux browser surface:<id> console list
cmux browser surface:<id> errors list
cmux browser surface:<id> screenshot --out /tmp/relaywake-refactor-phase.png
```

최종 수동 확인 범위:

```text
- menu → run 시작과 키보드/터치 이동
- level-up overlay와 manual pause의 상호 배제
- 투사체·근접·Orbiter·폭발·fire/gravity Zone 표시
- 적 피격 tint, 피해 숫자, player 피해·회복, HUD
- 최종 보스 승리와 결과 화면
- restart/reload 뒤 이전 View나 중복 저장 없음
- console error와 unhandled rejection 없음
```

DOM snapshot과 screenshot은 해당 시각 상태만 증명합니다. 수치·RNG·same-frame 동등성은 golden/unit replay로, 저장 1회는 E2E와 IndexedDB assertion으로 별도 검증합니다.

---

# Part F. 리뷰 단위와 검증 게이트

## 29. 권장 리뷰 순서

```text
Slice 0A — manual clock·snapshot·기존 bridge 보존
Slice 0B — baseline replay와 characterization
Slice 1A — Player/Enemy pure model + View Map
Slice 1B — Projectile/Pickup pure model + View Map
Slice 1C — Zone/Melee/Orbiter pure model + View Map
Slice 2  — RunProgression 추출
Slice 3  — WorldSystem 추출
Slice 4  — CombatSystem 추출
Slice 5  — Scene 정리 + architecture guard + cmux 검증
별도 Slice — 승인된 경우에만 pause/시각 동기화 동작 개선
```

이는 논리적인 리뷰 단위입니다. 사용자가 로컬 커밋을 요청한 경우에만 같은 경계로 커밋하고, 그렇지 않으면 검토 가능한 diff로 유지합니다. 각 slice는 단독으로 typecheck와 관련 테스트를 통과해야 합니다. 밸런스 변경이나 기존 버그 수정은 리팩터링 slice와 섞지 않습니다.

### 매 slice 게이트

```bash
npm run typecheck
npm run test
npm run build:bundle
npm run test:e2e:run
```

최종:

```bash
npm run check
```

---

## 30. 회귀가 생겼을 때 조사 순서

Golden replay가 달라지면 마지막 결과만 보지 말고 첫 차이부터 찾습니다.

```text
1. 첫 divergent frame
2. 그 frame의 의미 이벤트 순서
3. RNG 호출 순서
4. 엔티티 ID 할당 순서
5. phase 호출 순서
6. 배열 append가 같은 프레임에 처리되는지
7. Grid rebuild 시점
8. 피해→흡혈→킬→보상 순서
9. View release 누락은 논리 상태가 아니라 별도 진단으로 확인
```

대표 원인:

| 증상 | 우선 의심 |
|---|---|
| 같은 seed인데 적 종류가 달라짐 | RNG 소비 순서 변경 |
| 겹친 적 위치가 달라짐 | ID 할당 또는 separation 순서 변경 |
| 수류탄 피해가 한 frame 늦음 | 파편/Zone command queue 지연 |
| final summary 피해가 작음 | enemyKilled를 enemyDamaged보다 먼저 처리 |
| 레벨업 대신 pause 화면 | generic paused=true 이벤트 발생 |
| 재시작 후 Sprite가 남음 | View Map 삭제와 pool release 불일치 |
| 폭탄 드롭이 늦게 나타남 | pickup event를 update 뒤 비동기로 처리 |

---

# Part G. 금지 패턴

## 31. 다음 구조는 피한다

### 31.1 Combat 생성자에 Scene 배열을 넘기기

```ts
new CombatSystem({
  enemies: this.enemies,
  projectiles: this.projectiles,
  player: this.player,
  nearestEnemy: (...),
  damageEnemy: (...),
  damagePlayer: (...),
});
```

이는 분리가 아니라 Scene 내부를 다른 파일에서 조작하는 구조입니다.

### 31.2 시스템에 Phaser Scene 전달

```ts
new WorldSystem(this);
new CombatSystem(this);
```

이렇게 하면 시스템이 `scene.add`, `scene.cameras`, `scene.sound`를 다시 사용하게 됩니다.

### 31.3 시스템에서 앱 이벤트와 문자열 만들기

```ts
gameEvents.emit('toast', locale === 'ko' ? '...' : '...');
```

시스템은 `bossSpawned`, `abilityGranted` 같은 의미만 발생시킵니다.

### 31.4 Pool을 Combat/World로 이동

```ts
ObjectPool<Phaser.GameObjects.Sprite>
```

순수 시스템의 상태 생명주기와 Phaser Sprite 생명주기는 분리합니다.

### 31.5 per-frame 상태를 Pinia에 저장

적·투사체 배열을 Vue 반응형 상태로 만들면 렌더링 비용과 경계 복잡도가 증가합니다. Pinia는 메뉴·HUD·저장 메타 상태만 유지합니다.

### 31.6 리팩터링 중 RNG를 subsystem별로 fork

장기적으로는 바람직할 수 있지만 golden replay를 의도적으로 바꾸는 별도 작업입니다.

### 31.7 Scene 줄 수를 줄이기 위해 View helper를 순수 시스템으로 오인

Scene이 길면 후속으로 `SurvivorView` 또는 `SpriteViewRegistry`를 만들 수 있습니다. 다만 이 파일은 명백한 Phaser 표현 계층이어야 하며 World/Combat/Run과 같은 게임 시스템으로 취급하지 않습니다.

---

# Part H. 최종 완료 기준

## 32. 필수 완료 체크리스트

### 아키텍처

```text
[ ] SurvivorScene, WorldSystem, CombatSystem, RunProgression의 책임이 단일 소유권을 가짐
[ ] WorldSystem/CombatSystem/RunProgression에 import Phaser 없음
[ ] 순수 상태에 sprite, visual, Phaser.GameObjects.* 없음
[ ] Player/Melee/Orbiter도 상태와 View가 분리됨
[ ] ObjectPool<Phaser.GameObjects.Sprite>는 Scene/View 계층에만 있음
[ ] Scene에 enemies/projectiles/pickups/hp/xp/kills/coins 원본 상태 없음
[ ] Combat은 World 배열과 Grid를 직접 받지 않음
[ ] enemy attack intent는 적 순회 위치에서 동기 처리되고 일괄 지연되지 않음
[ ] 시스템은 gameEvents와 현지화 문자열을 만들지 않음
```

### 동작

```text
[ ] 같은 seed·입력·delta의 golden replay가 동일
[ ] legacy background RNG 360회 소비와 공용 Entity ID 순서가 동일
[ ] 보스 출현 frame 동일
[ ] 일반 600/300초와 E2E 24/10초 일정이 각각 검증됨
[ ] projectile/explosion/bleed/lifesteal/orbiter/pickup 동작 동일
[ ] 폭발 View→피해/종료→feedback→fragment 순서 동일
[ ] 레벨업 중 일반 pause 화면이 덮지 않음
[ ] 최종 보스 보상과 runEnded가 정확히 한 번
[ ] 종료가 발생한 현재 frame의 잔여 phase와 최초 RunSummary 고정 동작이 동일
[ ] randomUUID 부재 시 fallback 런 ID가 공유 RNG를 같은 위치에서 1회 소비
[ ] RunSummary 저장 형식 동일
[ ] 피해→킬→보상→종료 이벤트 순서 동일
```

### 자원

```text
[ ] 적 제거 시 enemy Sprite 회수
[ ] 투사체 제거 시 projectile Sprite 회수
[ ] 픽업 제거 시 pickup Sprite 회수
[ ] Melee/Orbiter Sprite 회수
[ ] Zone Arc destroy
[ ] restart/shutdown 후 이전 View 없음
[ ] pool active count와 View Map count가 일치
```

### 테스트

```text
[ ] RunProgression 단위 테스트
[ ] WorldSystem 단위 테스트
[ ] CombatSystem 단위 테스트
[ ] architecture boundary 테스트
[ ] deterministic replay 테스트
[ ] 기존 Playwright E2E
[ ] 전투·픽업 smoke E2E
[ ] cmux browser DOM/console/errors/screenshot 검토
[ ] npm run check 통과
```

---

## 33. 최종 권장 형태

```text
SurvivorScene
├─ Phaser lifecycle
├─ input adapter
├─ phase orchestrator
├─ SimulationEvent router
├─ View Maps + ObjectPool
├─ HUD/toast/damage number
├─ camera/audio/pause
└─ test bridge

WorldSystem
├─ PlayerState
├─ EnemyState[] + SpatialHashGrid
├─ PickupState[]
├─ SpawnDirector
├─ movement/AI/separation
├─ HP/heal/status
├─ pickup movement/collection
└─ WorldQuery + WorldCommandSink

CombatSystem
├─ ProjectileState[]
├─ MeleeState[]
├─ OrbiterState[]
├─ ZoneState[]
├─ weapon fire
├─ collision/expiry/fragment
└─ enemy attack intent handling

RunProgression
├─ AbilityDirector
├─ elapsed/xp/level
├─ pending level-ups
├─ kills/coins/damage
├─ reward plans
├─ idempotent finish
└─ RunSummary
```

---

## 34. 최종 판단

총 4개 축으로 나누는 결정은 타당합니다. 다만 안전하게 성공하려면 다음 일곱 원칙을 끝까지 유지해야 합니다.

1. **먼저 상태와 Phaser View를 분리하고, 그다음 시스템을 이동합니다.**
2. **World를 Combat보다 먼저 추출하여 Query/Command 계약을 확정합니다.**
3. **RNG와 엔티티 ID의 기존 소비 순서를 리팩터링 중에는 보존합니다.**
4. **적 공격 intent를 일괄 지연하지 않고 현재 적 순회 위치에서 Combat으로 전달합니다.**
5. **의미 이벤트는 동기적으로 라우팅하여 same-frame 생성·피해·드롭·표현 순서를 유지합니다.**
6. **수동 clock replay, Phaser-free replay, cmux 브라우저 검증이 각각 관찰한 범위만 근거로 사용합니다.**
7. **Scene 줄 수보다 게임 규칙의 단일 소유권과 회귀 테스트를 완료 기준으로 봅니다.**

이 순서대로 적용하면 `SurvivorScene`은 더 이상 게임 전체의 SSOT가 아니라, 세 순수 시스템을 Phaser와 Vue에 연결하는 명확한 어댑터가 됩니다.
