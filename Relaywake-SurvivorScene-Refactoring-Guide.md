# Relaywake `SurvivorScene` 4축 리팩터링 상세 도입 가이드

> 대상 프로젝트: `Relaywake` 2.1.0  
> 대상 파일: `src/game/scenes/SurvivorScene.ts`  
> 현재 규모: 1,437줄, 메서드 74개  
> 목표 구조: `SurvivorScene + WorldSystem + CombatSystem + RunProgression`

## 빠른 목차

- **Part A** — 현재 결합, 위험 메서드, RNG·ID·same-frame 주의점
- **Part B** — 목표 파일 구조, 순수 상태, View Map, 이벤트와 포트
- **Part C** — 단계 0~5의 실제 도입 절차
- **Part D** — 현재 74개 메서드의 이동·분할표
- **Part E** — 단위 테스트, replay, E2E와 경계 가드
- **Part F** — 커밋 순서와 회귀 조사법
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
→ 필요 시 RunProgression.finish(true)
→ Scene이 토스트·음향·runEnded 표현
```

`enemyDamaged`가 `enemyKilled`보다 먼저 처리되어야 최종 보스에게 가한 마지막 피해가 `RunSummary.damageDealt`에 포함됩니다.

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

따라서 다음 변경은 이번 리팩터링에서 금지합니다.

- 배경 전용 RNG를 갑자기 추가
- `createBackground()` 호출 순서 변경
- 먼지 개수 변경
- 배경 랜덤 생성을 고정 상수로 교체

안전한 최종 초기화 예시는 다음과 같습니다.

```ts
const rng = new SeededRandom(this.options.seed ?? Date.now());

// 현재와 같은 RNG 소비 순서를 먼저 유지한다.
this.createBackground(rng);

const ids = new SequentialEntityIdSource();
this.progression = new RunProgression({ rng, /* ... */ });
this.world = new WorldSystem({ rng, ids, /* ... */ });
this.combat = new CombatSystem({ rng, ids, /* ... */ });
```

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

---

# Part B. 목표 아키텍처

## 8. 권장 파일 구조

```text
src/game/
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
│  ├─ SpawnDirector.ts
│  ├─ SpatialHashGrid.ts
│  └─ SpatialSeparation.ts
└─ core/
   ├─ combat.ts
   ├─ math.ts
   ├─ rng.ts
   ├─ types.ts
   └─ xp.ts
```

지원 타입 파일을 더 잘게 나눠도 되지만, 초기에 파일 수를 과도하게 늘리지 않는 편이 좋습니다.

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
- `WorldSystem`은 Combat을 알지 않습니다.
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
비활성 순수 엔티티 0개 ↔ View 0개
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

export type SimulationEvent =
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
  | {
      type: 'pickupCollected';
      pickupId: EntityId;
      kind: PickupKind;
      value: number;
    }
  | { type: 'bossSpawned'; boss: 'miniBoss' | 'finalBoss' }
  | { type: 'weaponFired'; abilityId: AbilityId }
  | {
      type: 'explosionCreated';
      owner: ProjectileOwner;
      x: number;
      y: number;
      radius: number;
    }
  | { type: 'magnetActivated' }
  | { type: 'abilityGranted'; abilityId: AbilityId; level: number; source: 'levelUp' | 'chest' }
  | { type: 'levelUpRequested'; choices: readonly AbilityId[] }
  | { type: 'finalBossRewardGranted'; coins: number }
  | { type: 'runEnded'; summary: RunSummary }
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
    case 'enemyDamaged':
      this.progression.recordDamage(event.appliedDamage);
      if (event.canLifesteal) {
        const recovery = this.progression.rollLifesteal();
        if (recovery > 0) this.world.healPlayer(recovery);
      }
      if (this.options.preferences.damageNumbers) {
        this.showDamageNumber(event.x, event.y - event.radius, event.appliedDamage, 0xffe0b0);
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

    case 'playerDied':
      // finish()가 최초 호출에서만 runEnded 의미 이벤트를 발생시킨다.
      this.progression.finish(false);
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
- 메서드 인자가 늘어날 때 임시 콜백 묶음 대신 명시적 Command 타입을 만듭니다.
- 포트가 너무 커지면 `EnemyQuery`, `PlayerCommandSink`처럼 역할별로 분할하되, 첫 단계부터 과도하게 쪼개지는 않습니다.

---

# Part C. 단계별 도입 절차

## 14. 단계 0 — 현재 행동 고정

### 14.1 먼저 실행할 기존 게이트

프로젝트의 공식 게이트는 다음입니다.

```bash
npm ci
npm run check
```

`VALIDATION.md`에는 현재 기준으로 strict typecheck, Vitest 48개, production build, Playwright 검증이 통과한 것으로 기록되어 있습니다. 리팩터링 브랜치에서는 각 단계가 끝날 때 같은 게이트를 반복합니다.

### 14.2 update 본문만 기계적으로 분리

소유권 이동 전에 `update()`의 실제 시뮬레이션을 별도 메서드로 감쌉니다.

```ts
public override update(_time: number, deltaMs: number): void {
  if (this.manualTestClock) return;
  this.stepSimulation(Math.min(0.05, deltaMs / 1000));
}

private stepSimulation(delta: number): void {
  if (this.paused || this.ended) return;
  // 기존 update 본문을 순서 변경 없이 그대로 이동
}
```

이 변경은 책임 이동이 아니라 테스트 진입점 확보를 위한 기계적 추출입니다.

### 14.3 고정 delta 테스트 모드 추가

```ts
public testStep(frames: number, deltaSeconds = 1 / 60): void {
  if (!this.options.e2e) throw new Error('Manual stepping is E2E-only.');
  const safeFrames = Math.max(0, Math.floor(frames));
  const safeDelta = clamp(deltaSeconds, 0, 0.05);
  for (let frame = 0; frame < safeFrames; frame += 1) {
    this.stepSimulation(safeDelta);
  }
}
```

실시간 Phaser update와 수동 step이 동시에 실행되지 않도록 `manualTestClock` 플래그를 둡니다.

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
}
```

비교 안정성을 위해 다음 규칙을 사용합니다.

- 배열은 ID 또는 ability ID로 정렬
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
| 최종 보스 | 킬 1, 코인 보상, damageDealt, runEnded 1회 |
| 패배 | playerDied 뒤 runEnded 1회 |

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
- 적 Sprite는 분리 후 갱신
- Zone 중력으로 이동한 플레이어 View의 한 프레임 지연 같은 기존 특성도 이 단계에서 함께 고치지 않음

시각 지연 개선은 모든 순수 시스템 추출 후 별도 커밋에서 처리합니다.

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
  durationSeconds: number;
  rng: SeededRandom;
  eventSink: SimulationEventSink;
  identity: RunIdentityProvider;
}

export class RunProgression implements CombatAbilityPort {
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
  public rollLifesteal(): number { /* ... */ }
  public finish(victory: boolean): RunSummary | null { /* ... */ }
  public snapshot(): RunProgressionSnapshot { /* ... */ }
}
```

### 16.3 `AbilityDirector`는 RunProgression 내부에 둔다

현재 `AbilityDirector`는 능력 레벨과 cooldown을 함께 가집니다. 이번 단계에서 이를 다시 두 클래스로 쪼개지 않습니다.

RunProgression이 다음 포트를 구현하도록 합니다.

- 소유한 액티브 능력 조회
- 준비 여부
- 유효 스탯 계산
- cooldown trigger
- 전역 modifier 조회

Combat은 이 포트만 사용합니다. World에는 매 프레임 필요한 modifier snapshot만 전달합니다.

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
  finalBossDefeated: boolean;
}
```

일반 적의 RNG 호출 순서를 그대로 유지합니다.

```text
1. coinChance 판정
2. 코인이 나오면 x offset RNG
3. specialRoll RNG
```

미니보스는 chest와 10코인 픽업을 반환합니다. 최종 보스는 코인 보상을 RunProgression에 직접 반영한 뒤 종료 이벤트를 정확히 한 번 생성합니다.

### 16.8 종료 ID와 시간 주입

순수 단위 테스트를 위해 런 ID와 종료 시각을 주입합니다.

```ts
export interface RunIdentityProvider {
  createRunId(): string;
  nowIso(): string;
}
```

프로덕션 구현은 `crypto.randomUUID()`와 `new Date().toISOString()`을 사용하고, 테스트 구현은 고정 값을 반환합니다. `finish()`는 최초 종료에서만 `runEnded` 의미 이벤트를 발생시키며, 반복 호출은 `null`을 반환합니다. Scene은 반환값과 이벤트를 동시에 처리하지 않고 `runEnded` 이벤트 한 경로만 UI에 연결합니다.

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

- XP가 한 번에 여러 레벨을 올릴 때 pending 수
- 모든 능력이 max면 level-up이 정상 종료
- 잘못된 선택 또는 이미 닫힌 선택 무시
- 상자 능력 1개 지급
- 킬·코인·누적 피해
- 일반 적 드롭 RNG 순서
- 미니보스 보상
- 최종 보스 보상 후 `finish(true)` 1회
- 반복 `finish()`가 `null`을 반환하고 이벤트 중복 없음
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
export interface WorldSystemConfig {
  character: CharacterDefinition;
  level: typeof levelOne;
  durationSeconds: number;
  miniBossSeconds: number;
  enemyCap: number;
  rng: SeededRandom;
  ids: EntityIdSource;
  eventSink: SimulationEventSink;
}

export class WorldSystem implements WorldQuery, WorldCommandSink {
  // Phaser-free implementation
}
```

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
  moveSpeed: number;
  armor: number;
  recovery: null | {
    amount: number;
    cooldown: number;
  };
}
```

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

### 17.6 적 AI와 적 공격 의도

적 이동과 공격 타이머는 World가 소유합니다. 적이 원거리 무기를 발사해야 할 때 World는 순수한 의도를 반환합니다.

```ts
export interface EnemyAttackIntent {
  enemyType: EnemyId;
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  damage: number;
  projectileSpeed: number;
}
```

Scene의 호출 순서는 다음과 같습니다.

```ts
const attacks = this.world.updateEnemies(delta, bonusArmor);
for (const attack of attacks) this.combat.spawnEnemyAttack(attack);
this.world.separateEnemies();
```

원거리 투사체가 분리 전 적 위치에서 생성되도록 intent에 origin 좌표를 담습니다. 이는 현재 `updateEnemies()` 안에서 발사한 뒤 분리하는 순서를 보존합니다.

근접 적의 접촉 피해는 World가 직접 `damagePlayer()`로 적용해도 됩니다. 원거리 투사체와 Zone 충돌은 Combat에서 WorldCommandSink를 통해 적용합니다.

### 17.7 출혈

출혈 상태와 tick은 World가 소유합니다.

```text
Combat: 단검 적중 시 world.applyBleed(...)
World: bleedTimer와 bleedTickTimer 갱신
World: 0.75초마다 damageEnemy(..., canLifesteal=false)
```

현재 순서대로 적 이동 전에 출혈 tick을 처리합니다. 출혈로 죽은 적은 그 프레임에 이동하거나 공격하지 않습니다.

### 17.8 피해와 회복

World의 `damageEnemy()`는 다음 순서를 지킵니다.

```text
1. active와 amount 검증
2. resolveDamage
3. hp 반영
4. flashTimer 설정
5. 넉백 반영
6. enemyDamaged 이벤트
7. hp <= 0이면 active=false
8. enemyKilled 이벤트
9. entityRemoved 이벤트
```

`enemyDamaged` 이벤트 처리 중 Scene이 누적 피해와 흡혈을 즉시 처리하므로, 현재 피해→흡혈→사망 순서를 보존할 수 있습니다.

World의 `damagePlayer()`는 방어 보너스를 값으로 받습니다.

```ts
world.damagePlayer(rawDamage, progression.bonusArmor());
```

플레이어 피해 흐름은 다음을 권장합니다.

```text
1. invulnerability/ended/rawDamage 검증
2. armor를 적용한 실제 피해 계산
3. hp와 invulnerability 반영
4. playerDamaged 이벤트
5. hp <= 0이면 playerDied 이벤트
```

Scene은 `playerDamaged`에서 피해 숫자·shake·tone·HUD를 처리하고, `playerDied`에서 idempotent `progression.finish(false)`를 호출합니다.

### 17.9 픽업 업데이트

현재 계산 순서를 그대로 유지합니다.

```text
1. age 증가
2. 현재 거리 계산
3. 자석/반경으로 attracted 설정
4. 현재 거리 기준으로 이동
5. 이동 전 계산한 distance로 수집 여부 판정
6. 멀고 오래된 픽업 비활성화
```

이동 후 거리를 다시 계산하면 한 프레임 빨리 수집될 수 있으므로 초기 추출에서는 바꾸지 않습니다.

### 17.10 픽업 이벤트의 동기 처리

`WorldSystem.updatePickups()`가 수집을 감지하면 즉시 `pickupCollected` 이벤트를 호출합니다. Scene은 호출 스택 안에서 효과를 적용합니다.

```ts
private applyPickupEffect(event: PickupCollectedEvent): void {
  switch (event.kind) {
    case 'gem':
      this.progression.gainExperience(event.value);
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
      this.world.activateMagnet(5);
      break;
    case 'bomb':
      this.world.damageAllNonBossEnemies(9999);
      break;
    case 'chest':
      this.progression.addCoins(10);
      this.progression.openChest();
      break;
  }
  this.emitHud(true);
}
```

이 방식은 폭탄으로 생긴 드롭이 같은 픽업 순회에서 처리되는 현재 동작을 보존하기 쉽습니다.

### 17.11 공간 API

- `nearestEnemy(radius)`
- `queryEnemiesCircle(x, y, radius)`
- `getEnemy(id)`

Grid rebuild는 World 내부에서만 수행합니다. Combat은 Grid를 직접 보지 않습니다.

### 17.12 World 단위 테스트

새 파일:

```text
tests/unit/world-system.test.ts
```

필수 케이스:

- 플레이어 가속·감속·대각선 normalize
- invulnerability 감소
- 방어 최소 피해 1 규칙
- 1 미만 원시 피해의 방어 처리
- 회복 maxHp clamp
- 고정 viewport의 적 스폰 거리
- e2e cap 90 / 일반 cap 420
- 미니보스·최종 보스 1회 스폰
- 원거리 적 attack intent
- 접촉 공격 cooldown
- 출혈 0.75초 tick과 출혈 사망
- 2,200 거리 일반 적 제거, 보스 유지
- SpatialSeparation 뒤 Grid 최신성
- magnet 5초와 pickup attraction
- 오래 멀어진 픽업 제거
- damage 이벤트 순서
- kill 이벤트 중복 방지

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

`createExplosion()`의 Phaser circle, tween, shake, tone은 Scene에 남습니다. Combat은 폭발 피해를 적용하고 `explosionCreated` 의미 이벤트를 발생시킵니다.

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

### 18.6 투사체 동작 순서

현재 순서를 유지합니다.

```text
1. ttl 감소
2. 부메랑 반환 시점 판정
3. 위치 적분
4. 회전 갱신
5. owner별 직접 충돌
6. 비활성 여부 확인
7. ttl 또는 최대 거리 만료
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

현재는 직접 피해 후 출혈 상태를 적용합니다. 적이 직접 피해로 죽었다면 `applyBleed()`가 비활성 적을 무시하도록 합니다.

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

### 18.9 회전 무기

`OrbiterState`는 다음을 가집니다.

- index
- x/y
- angle
- `lastHitAt`

Orbiter 수가 줄면 Combat이 상태를 제거하고 Scene이 View를 회수합니다. 공용 엔티티 ID를 소비하지 않도록 index 기반 key를 유지합니다.

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

현재 새 Zone은 `tickTimer = 0`으로 생성되고 같은 프레임 `updateZones()`에서 피해를 줍니다. 이를 유지합니다.

### 18.11 폭발

Combat:

```text
- 범위 적 질의
- overlap
- damageEnemy / damagePlayer
- fragment 생성
- explosionCreated 이벤트
```

Scene:

```text
- 원형 시각 효과
- tween
- screen shake
- tone
```

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

  // 1. clock와 공통 타이머
  this.progression.advanceClock(delta);
  this.world.advanceFrameTimers(delta);

  // 2. 현재 구현의 배경 갱신 위치 보존
  this.updateBackground(this.world.player);

  // 3. player
  const moveInput = this.readMoveInput();
  this.world.updatePlayer(moveInput, delta, this.progression.worldModifiers());
  this.syncPlayerView();

  // 현재 구현과 같이 플레이어 이동 뒤 cooldown을 감소시킨다.
  this.progression.tickAbilityCooldowns(delta);

  // 4. recovery
  this.world.updateRecovery(delta, this.progression.recoveryEffect());

  // 5. spawning
  this.world.updateSpawning({
    delta,
    elapsedSeconds: this.progression.elapsedSeconds,
    viewport: { width: this.scale.width, height: this.scale.height },
  });
  this.syncNewWorldViews();

  // 6. enemy AI and enemy weapon spawn
  const attacks = this.world.updateEnemies(delta, this.progression.bonusArmor());
  for (const attack of attacks) this.combat.spawnEnemyAttack(attack);

  // 7. separation and enemy view sync
  this.world.separateEnemies();
  this.syncEnemyViews();

  // 8. combat phases — 순서를 합치지 않는다.
  this.combat.updateOrbiters(delta, this.progression.elapsedSeconds);
  this.combat.fireReadyWeapons();
  this.combat.updateMelee(delta);
  this.combat.updateProjectiles(delta);
  this.combat.updateZones(delta, this.progression.elapsedSeconds);

  // 9. pickup
  this.world.updatePickups(delta, this.progression.elapsedSeconds);

  // 10. View sync와 maintenance
  this.syncCombatViews();
  this.syncPickupViews();
  this.compactIfDue(delta);
  this.emitHud(false);
}
```

`advanceClock()`과 `tickAbilityCooldowns()`를 분리한 이유는 현재 구현의 호출 위치를 그대로 보존하기 위해서입니다. 두 메서드를 하나로 합치면 cooldown이 한 phase 빨리 감소할 수 있습니다.

### 19.4 Pause를 boolean 하나로만 보지 않기

최종 정리 단계에서는 다음 상태를 구분하는 것이 안전합니다.

```ts
type HoldReason = 'none' | 'manual' | 'levelUp' | 'ended';
```

| 이유 | 시뮬레이션 | Phaser anim/tween/sound | Raw AudioContext | Vue 이벤트 |
|---|---:|---:|---:|---|
| none | 실행 | 실행 | 실행 | paused=false 필요 시 |
| manual | 정지 | 정지 | suspend | paused=true |
| levelUp | 정지 | 정지 | suspend | levelUp만 발생 |
| ended | 정지 | 정지 | 결과 tone 허용 | runEnded |

현재 `applyPausedState(true, false)`는 이미 paused인 상태에서 early return하면 raw audio 모드 변경을 반영하지 못할 수 있습니다. 최종 구현은 boolean 비교 대신 Pause Mode 전체를 비교합니다.

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
testGrantXp       → progression.gainExperience
testDamagePlayer  → world.damagePlayer
testSpawnEnemy    → world.spawnEnemy
testKillFinalBoss → world.spawn/find/damage
testFinish        → progression.finish
```

`testSnapshot()`은 시스템 snapshot을 합쳐 반환합니다. View pool 회귀를 잡기 위해 E2E 전용 진단 필드를 확장할 수 있습니다.

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
| `testGrantXp` 등 테스트 메서드 | 321–346 | 시스템에 위임 |
| `createBackground` | 348 | Phaser View |
| `bindInput` | 396 | Phaser 입력 |
| `updateBackground` | 411 | Phaser View |
| `showDamageNumber` | 1,210 | Phaser text/tween |
| `emitHud` | 1,229 | Vue용 snapshot 조립 |
| `acquireSprite`, `releaseSprite` | 1,275–1,298 | View pool |
| `applyPausedState` 계열 | 1,342–1,395 | Phaser·Web Audio pause |
| `tone` | 1,397 | 표현 음향 |
| `handleShutdown` | 1,427 | Phaser 자원 정리 |

`syncEnemyPositions`는 제거되기보다 `syncPlayerView`, `syncEnemyViews`, `syncCombatViews`, `syncPickupViews`로 확장됩니다.

---

## 21. RunProgression으로 이동할 메서드/부분

| 현재 메서드 | 현재 행 | 이동 내용 |
|---|---:|---|
| `chooseAbility` | 265 | grant, pending, 다음 후보 결정 |
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
| `compactEntities` 일부 | 1,312 | enemies/pickups |

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
const eventSink: SimulationEventSink = (event) => events.push(structuredClone(event));
const rng = new SeededRandom(20260729);
const ids = new SequentialEntityIdSource();
const identity = fixedIdentityProvider('run-fixed', '2026-07-30T00:00:00.000Z');

const progression = new RunProgression({ /* ... */ });
const world = new WorldSystem({ /* ... */ });
const combat = new CombatSystem({ world, abilities: progression, /* ... */ });
```

테스트 harness는 Scene의 `stepSimulation()`과 같은 phase 순서를 호출합니다. 시스템별 `update()`를 임의로 묶지 않습니다.

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

테스트 전용 bridge로 능력 grant와 적 고정 위치 spawn을 제공하여 다음을 직접 확인합니다.

- projectile count 증가 후 감소
- explosion event 발생
- bleed 상태 또는 damage 누적
- orbiter count
- magnet timer
- bomb 뒤 일반 적 0, 보스 유지

---

# Part F. 커밋 단위와 검증 게이트

## 29. 권장 커밋 순서

```text
Commit 0 — baseline replay와 테스트 bridge
Commit 1 — pure model + Scene View Map 분리
Commit 2 — RunProgression 추출
Commit 3 — WorldSystem 추출
Commit 4 — CombatSystem 추출
Commit 5 — Scene 정리 + architecture guard
Commit 6 — 선택적 시각 동기화 개선
```

각 커밋은 단독으로 typecheck와 테스트를 통과해야 합니다. 밸런스 변경과 리팩터링을 같은 커밋에 넣지 않습니다.

### 매 커밋 게이트

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
[ ] 시스템은 gameEvents와 현지화 문자열을 만들지 않음
```

### 동작

```text
[ ] 같은 seed·입력·delta의 golden replay가 동일
[ ] 보스 출현 frame 동일
[ ] projectile/explosion/bleed/lifesteal/orbiter/pickup 동작 동일
[ ] 레벨업 중 일반 pause 화면이 덮지 않음
[ ] 최종 보스 보상과 runEnded가 정확히 한 번
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

총 4개 축으로 나누는 결정은 타당합니다. 다만 안전하게 성공하려면 다음 다섯 원칙을 끝까지 유지해야 합니다.

1. **먼저 상태와 Phaser View를 분리하고, 그다음 시스템을 이동합니다.**
2. **World를 Combat보다 먼저 추출하여 Query/Command 계약을 확정합니다.**
3. **RNG와 엔티티 ID의 기존 소비 순서를 리팩터링 중에는 보존합니다.**
4. **의미 이벤트는 동기적으로 라우팅하여 same-frame 생성·피해·드롭 순서를 유지합니다.**
5. **Scene 줄 수보다 게임 규칙의 단일 소유권과 회귀 테스트를 완료 기준으로 봅니다.**

이 순서대로 적용하면 `SurvivorScene`은 더 이상 게임 전체의 SSOT가 아니라, 세 순수 시스템을 Phaser와 Vue에 연결하는 명확한 어댑터가 됩니다.
