## 결론

정적 코드 분석상 **최종 보스 생성 조건은 들어가 있지만, 실제 플레이에서는 “10분이 지나도 안 나온 것처럼 보일” 가능성이 매우 높습니다.** 핵심 원인은 두 가지입니다.

1. **게임 시간이 실제 시간보다 느리게 흐를 수 있음**
2. **보스가 생성돼도 화면 밖에서 플레이어를 따라잡지 못할 수 있음**

특히 두 번째는 명백한 게임플레이 결함입니다.

---

## 1. 10분이 실제 10분이 아님

최종 보스 조건 자체는 다음과 같이 600초로 정확히 설정되어 있습니다.

* `src/game/data/level.ts:5`

  ```ts
  durationSeconds: 600
  ```
* `src/game/systems/SpawnDirector.ts:41`

  ```ts
  elapsedSeconds >= this.durationSeconds
  ```

하지만 실제 누적 시간은 다음 코드로 계산됩니다.

* `src/game/scenes/SurvivorScene.ts:239-242`

  ```ts
  if (this.paused || this.ended) return;
  const delta = Math.min(0.05, deltaMs / 1000);
  this.elapsedSeconds += delta;
  ```

여기서 프레임당 시간이 최대 **0.05초**, 즉 50ms로 잘립니다. 따라서 게임이 20FPS 아래로 내려가면 실제 시간 일부가 버려집니다.

| 실제 평균 FPS | 실제 10분 동안 누적되는 게임 시간 | 보스까지 필요한 실제 시간 |
| --------: | -------------------: | -------------: |
|  20FPS 이상 |                 600초 |            10분 |
|     18FPS |                 540초 |       약 11분 7초 |
|     15FPS |                 450초 |      약 13분 20초 |
|     12FPS |                 360초 |      약 16분 40초 |
|     10FPS |                 300초 |          약 20분 |

후반부에는 적이 최대 420마리까지 존재할 수 있고, 투사체·픽업·충돌·공간 분리까지 매 프레임 계산합니다. 따라서 성능이 떨어지는 환경에서는 보스 시간이 크게 밀릴 수 있습니다.

또한 다음 시간은 모두 600초에 포함되지 않습니다.

* 레벨업 선택창이 열린 시간
* 수동 일시정지 시간
* 게임 업데이트가 사실상 중단된 시간

저장소에 포함된 `refine-1.md`에도 이미 다음 문제가 기록되어 있습니다.

> Scene delta는 최대 50ms로 잘리므로 20FPS 미만에서는 실제 시간보다 게임 시간이 느려진다.

따라서 이 현상은 우연한 가능성이 아니라, 이미 코드 구조상 확인되는 문제입니다.

---

## 2. 보스가 생성되어도 화면에 들어오지 못할 수 있음

최종 보스는 일반 적과 같은 생성 함수를 사용합니다.

* `SurvivorScene.ts:506-512`

  ```ts
  const viewportRadius = Math.max(this.scale.width, this.scale.height) * 0.57;
  const radius = fixedDistance ?? viewportRadius + this.rng.between(110, 260);
  ```

기본 1280×720 화면이라면 보스는 플레이어로부터 대략 **840~990px 떨어진 화면 밖**에 생성됩니다. 창이 클수록 더 먼 곳에 생성됩니다.

그런데 속도는 다음과 같습니다.

* 최종 보스: `70`
* 플레이어: `164~204`
* 이동속도 패시브 최대 적용 시 플레이어는 더 빨라짐

`src/game/data/enemies.ts:41-43`:

```ts
id: 'finalBoss',
speed: 70,
attackRange: 330,
```

보스가 플레이어의 진행 방향 뒤쪽에 생성되면:

* 플레이어는 164~204 속도로 도망감
* 보스는 70 속도로 추적
* 거리가 계속 벌어짐
* 보스는 화면에 영원히 들어오지 못할 수 있음

일반 적은 플레이어와 2200px 이상 벌어지면 제거되지만, 보스는 제거하지 않도록 되어 있습니다.

```ts
if (distance > 2200 && !enemy.definition.boss) {
  this.deactivateEnemy(enemy, false);
}
```

즉 최종 보스는 **멀리 뒤에서 계속 살아 있으나 전투에는 참여하지 못하는 상태**가 될 수 있습니다. 이 경우 게임도 끝나지 않고 일반 적은 계속 생성됩니다.

이 문제가 사용자가 본 현상과 가장 직접적으로 일치합니다.

---

## 3. HUD가 최종 보스 출현을 제대로 알려주지 못함

HUD는 활성 보스 중 첫 번째 보스만 찾습니다.

* `SurvivorScene.ts:1358`

  ```ts
  const boss = this.enemies.find(
    (enemy) => enemy.active && enemy.definition.boss
  ) ?? null;
  ```

5분에 등장한 미니보스가 아직 살아 있으면 배열 앞쪽의 미니보스가 계속 선택됩니다. 그러면 10분에 최종 보스가 생성되어도:

* 기존 `BOSS SIGNAL` 체력바가 그대로 유지됨
* 최종 보스 이름이 표시되지 않음
* 새로운 보스 체력바로 전환되지 않음
* 화면 밖 최종 보스의 방향 표시도 없음
* `최종 보스 출현` 토스트는 2.6초 후 사라짐

결과적으로 실제 생성됐더라도 사용자는 출현 사실을 거의 알 수 없습니다.

---

## 4. `00:00`이 실제 조건보다 먼저 표시됨

카운트다운은 `floor`를 사용합니다.

* `src/game/core/math.ts:35-36`

  ```ts
  const safe = Math.max(0, Math.floor(seconds));
  ```

남은 시간이 `0.9초`여도 HUD에는 이미 `00:00`이 표시됩니다. 최종 보스는 실제 `elapsedSeconds >= 600`이 되어야 생성되므로, 최대 약 1초간은 `00:00`인데 아직 보스 조건에 도달하지 않은 상태가 됩니다.

이 문제만으로 장시간 지연되지는 않지만 사용자 혼란을 더합니다.

---

## 5. 자동 출현 테스트가 없음

현재 E2E의 최종 보스 테스트는 자동 출현을 기다리지 않습니다.

* `tests/e2e/game.spec.ts:112-115`

  ```ts
  await startRun(page);
  await page.evaluate(() => window.__C2_GAME__?.testKillFinalBoss());
  ```

`testKillFinalBoss()`는 보스가 없으면 직접 생성한 다음 즉시 죽입니다. 따라서 다음 사항은 검증되지 않습니다.

* 실제 600초 경계에서 자동 생성되는지
* 저FPS에서도 제시간에 생성되는지
* 보스가 화면에 진입하는지
* 미니보스가 살아 있을 때 HUD가 최종 보스를 보여주는지
* 계속 이동하는 플레이어를 보스가 따라잡을 수 있는지

단위 테스트도 실제 600초가 아니라 20초짜리 축약 설정만 검사합니다.

---

# 권장 수정

## P0-1. 런 타이머와 물리 시뮬레이션 시간을 분리

현재처럼 하나의 잘린 `delta`를 모든 목적에 사용하면 안 됩니다.

권장 구조는 다음과 같습니다.

```ts
const frameDelta = deltaMs / 1000;

// 보스 일정과 HUD는 실제 활성 플레이 시간을 사용
this.elapsedSeconds += frameDelta;

// 물리는 고정 스텝으로 안전하게 처리
this.simAccumulator = Math.min(
  this.simAccumulator + frameDelta,
  0.25,
);

let steps = 0;

while (
  this.simAccumulator >= FIXED_STEP
  && steps < MAX_CATCH_UP_STEPS
) {
  this.stepSimulation(FIXED_STEP);
  this.simAccumulator -= FIXED_STEP;
  steps += 1;
}
```

추천값:

```ts
const FIXED_STEP = 1 / 60;
const MAX_CATCH_UP_STEPS = 8;
```

브라우저 탭이 숨겨질 때는 `visibilitychange`로 명시적으로 자동 일시정지해야 합니다. 그러면 백그라운드 복귀 시 수십 초가 한꺼번에 누적되는 것도 막을 수 있습니다.

최소 수정만 한다면:

```ts
const frameDelta = deltaMs / 1000;
const simulationDelta = Math.min(0.05, frameDelta);

this.elapsedSeconds += frameDelta;
this.stepSimulation(simulationDelta);
```

다만 장기적으로는 bounded fixed-step 방식이 더 안전합니다.

---

## P0-2. 최종 보스 전용 생성 경로 추가

최종 보스를 일반 적과 같은 무작위 화면 밖 위치에 생성해서는 안 됩니다.

권장 동작:

1. 플레이어 진행 방향 앞쪽에 경고 표시
2. 1~1.5초 동안 소환 지점 표시
3. 플레이어로부터 약 400~520px 거리에 생성
4. 생성 즉시 화면 안 또는 화면 경계에서 보이게 함

예를 들면:

```ts
private spawnFinalBoss(): void {
  const moving = Math.hypot(this.player.vx, this.player.vy) > 10;

  const heading = moving
    ? Math.atan2(this.player.vy, this.player.vx)
    : this.player.facingAngle;

  const angle = heading + this.rng.between(-0.35, 0.35);
  const distance = 460;

  this.spawnEnemyAt(
    'finalBoss',
    this.player.x + Math.cos(angle) * distance,
    this.player.y + Math.sin(angle) * distance,
  );
}
```

최종 보스가 플레이어 앞쪽에 나타나면 플레이어가 계속 움직여도 자연스럽게 조우합니다.

---

## P0-3. 보스 추적에 거리 보정 추가

보스 속도만 70에서 200으로 올리는 방식은 충분하지 않습니다. 플레이어가 이동속도 패시브를 획득하면 다시 따돌릴 수 있기 때문입니다.

보스 전용 보정이 필요합니다.

```ts
if (enemy.definition.id === 'finalBoss') {
  if (distance > 1100) {
    this.repositionBossAhead(enemy);
  } else if (distance > 650) {
    bossSpeedMultiplier = 4;
  } else if (distance > 350) {
    bossSpeedMultiplier = 2;
  }
}
```

추천 방식은 다음 조합입니다.

* 거리 700px 이상: 돌진 또는 빠른 추적
* 거리 1100px 이상: 화면 밖 플레이어 앞쪽으로 재배치
* 재배치 전 시각적 경고 표시
* 최종 보스에게는 일반적인 무한 추적 이동 대신 도약·순간이동 패턴 부여

이렇게 해야 보스전이 항상 성립합니다.

---

## P0-4. 최종 보스 출현 시 일반 스폰 정리

최종 보스 등장 이후에도 현재 일반 적은 계속 생성됩니다. 후반 성능 저하와 보스 가시성 문제를 동시에 악화시킵니다.

최종 보스 출현 시 다음 처리가 적절합니다.

* 일반 적 신규 생성 중단 또는 70~90% 감소
* 플레이어와 멀리 떨어진 일반 적 제거
* 화면 안 일반 적만 제한적으로 유지
* 픽업과 오래된 투사체 정리
* 최종 보스 전용 상태로 전환

```ts
if (tick.spawnFinalBoss) {
  this.finalBossPhase = true;
  this.clearDistantRegularEnemies();
  this.spawnFinalBoss();
}
```

---

## P1. HUD 개선

HUD는 최종 보스를 미니보스보다 우선해야 합니다.

```ts
const finalBoss = this.enemies.find(
  enemy => enemy.active && enemy.definition.id === 'finalBoss',
);

const miniBoss = this.enemies.find(
  enemy => enemy.active && enemy.definition.id === 'miniBoss',
);

const boss = finalBoss ?? miniBoss ?? null;
```

`HudSnapshot`에는 다음 정보도 추가하는 것이 좋습니다.

```ts
bossId: 'miniBoss' | 'finalBoss' | null;
bossName: string | null;
bossDistance: number | null;
```

화면에는 다음처럼 구분해야 합니다.

* `EXECUTIONER · MINI BOSS`
* `NIGHT SOVEREIGN · FINAL BOSS`
* 화면 밖이면 가장자리 방향 화살표
* 보스까지 거리 표시
* 최종 보스 등장 시 화면 플래시와 경고음
* `00:00` 대신 `FINAL SIGNAL` 표시

카운트다운은 `Math.ceil()`을 사용해 실제 0초가 되었을 때만 `00:00`으로 보이게 하는 편이 자연스럽습니다.

---

## P1. 반드시 추가해야 할 테스트

다음 네 테스트가 필요합니다.

1. **실제 경계 테스트**

   ```ts
   expect(update(0, 599.999).spawnFinalBoss).toBe(false);
   expect(update(0, 600).spawnFinalBoss).toBe(true);
   ```

2. **저FPS 시간 테스트**

   * 매 프레임 `deltaMs=100`, 즉 10FPS 입력
   * 실제 활성 시간 600초 후 최종 보스가 출현하는지 확인

3. **자동 출현 E2E**

   * 축약 런 24초에서 `testKillFinalBoss()`를 먼저 호출하지 않음
   * 실제 자동 생성까지 기다림
   * `finalBossActive === true` 확인 후 처치

4. **조우 가능성 테스트**

   * 플레이어가 계속 전진
   * 보스를 플레이어 뒤쪽에 생성
   * 일정 시간 안에 보스가 화면 또는 공격 범위에 들어오는지 검증

---

## 최종 권장안

가장 먼저 고칠 순서는 다음입니다.

1. **게임 타이머를 50ms 제한 물리 delta에서 분리**
2. **최종 보스를 플레이어 앞쪽 400~520px에 전용 생성**
3. **멀어진 최종 보스의 돌진·재배치 처리**
4. **최종 보스 등장 후 일반 적 스폰 축소**
5. **HUD에서 최종 보스 우선 표시와 방향 화살표 추가**
6. **자동 출현·저FPS·조우 가능성 테스트 추가**

현재 상태에서 단순히 `durationSeconds: 600`을 590으로 줄이거나 보스 속도만 조금 올리는 것은 근본 해결이 아닙니다. **시간 계산과 보스 조우 보장을 함께 수정해야 합니다.**

현재 버전에서 임시로 확인할 때는 HUD가 `00:00`이고 `BOSS SIGNAL`이 보인다면 이동을 멈춰 보십시오. 보스가 화면 밖 뒤쪽에 생성된 경우 약간의 시간이 지난 뒤 접근할 수 있습니다. 다만 이미 크게 벌어졌다면 상당히 오래 걸릴 수 있습니다.

검증은 코드 경로와 포함 문서를 기준으로 진행했습니다. 이 환경에서는 패키지 프록시에 `zod 4.4.3`이 없어 `npm ci`가 404로 실패했기 때문에 전체 Playwright 런타임 재현까지는 실행하지 못했지만, 위 두 핵심 결함은 코드상 직접 확인됩니다.
