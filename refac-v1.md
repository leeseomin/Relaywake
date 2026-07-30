src/game/scenes/SurvivorScene.ts는 1,437줄, 메서드 74개이며, 적·무기·드롭·성장·렌더링·오디오가 한 클래스에 모여 있습니다

:


권장 리팩토링 순서

원안의 `RunProgression → CombatSystem → EnemyWorld → Scene`보다는 다음 순서가 안전합니다.

### 0. 행동 고정

고정 seed와 고정 delta로 현재 결과를 기록합니다.

* 보스 출현 시간
* 적 수
* 플레이어 HP
* XP와 레벨
* 킬·코인·누적 피해
* 능력 목록
* 투사체 수

현재 E2E는 레벨업·일시정지·패배·최종 보스 승리는 확인하지만, 투사체·폭발·출혈·흡혈·회전 무기·픽업 효과 대부분을 직접 검증하지 않습니다.

### 1. 상태에서 Phaser 객체 제거

아직 시스템을 옮기지 않고 먼저 다음을 분리합니다.

```text
EnemyState        ↔ enemySpriteMap
ProjectileState   ↔ projectileSpriteMap
PickupState       ↔ pickupSpriteMap
ZoneState         ↔ zoneViewMap
```

이 단계만 완료해도 이후 이동 위험이 크게 줄어듭니다.

### 2. `RunProgression` 추출

먼저 순수 계산에 가까운 것을 이동합니다.

* XP
* 레벨
* 코인·킬·피해 통계
* 능력 선택
* RunSummary
* 보스 보상과 종료

픽업 이동이나 플레이어 위치는 아직 옮기지 않습니다.

### 3. `WorldSystem` 추출

* 플레이어 이동
* 적 스폰·AI·분리
* 상태효과
* 픽업 위치·이동
* 피해와 회복 적용
* 공간 조회 API

CombatSystem이 사용할 `WorldQuery`와 `WorldCommandSink`를 이 단계에서 확정합니다.

### 4. `CombatSystem` 추출

원안과 달리 **World를 Combat보다 먼저 추출하는 것이 좋습니다.**

현재 Combat 후보 코드가 `enemyGrid`, `enemies`, `player`, `nearestEnemy`, `damageEnemy`, `damagePlayer`에 강하게 의존하기 때문입니다. Combat을 먼저 떼면 Scene의 배열과 콜백을 그대로 전달하는 임시 구조가 생겨 두 번 리팩토링하게 됩니다.

### 5. Scene 최종 정리

* 상태 필드 제거
* 렌더링 동기화
* 이벤트 표현
* HUD 조립
* 오디오와 pause
* 테스트 bridge 위임

---

# 완료 기준

다음 조건을 만족하면 제대로 분리된 것입니다.

* `WorldSystem`, `CombatSystem`, `RunProgression`에 `import Phaser`가 없다.
* 순수 상태에 `sprite`, `visual`, `Phaser.GameObjects.*`가 없다.
* `ObjectPool<Phaser.GameObjects.Sprite>`는 Scene 쪽에만 있다.
* Scene에 `enemies`, `projectiles`, `pickups`, `hp`, `xp`, `kills`, `coins`의 원본 상태가 없다.
* 시스템은 `gameEvents.emit()`이나 현지화된 문자열을 직접 만들지 않는다.
* 같은 seed와 같은 입력·delta에서 같은 시뮬레이션 결과가 나온다.
* 레벨업 중 일반 pause 화면이 덮어쓰지 않는다.
* 최종 보스 보상과 `runEnded`가 정확히 한 번만 발생한다.
* 적·투사체 제거 시 Sprite pool이 누락 없이 회수된다.
* Scene이 500줄을 넘더라도 순수 게임 규칙이 없다면 실패로 보지 않는다.

## 최종 결론

**총 4개로 분리한다는 결정은 맞습니다.** 다만 다음 형태로 수정하는 것이 가장 안전합니다.

```text
SurvivorScene — Phaser 입력·렌더링·HUD·오디오·pause
WorldSystem   — 플레이어·적·픽업·공간·HP·상태효과
CombatSystem  — 능력 발사·투사체·근접·회전·영역·충돌
RunProgression — XP·레벨업·보상·통계·런 종료
```

원안에서 반드시 고칠 부분은 네 가지입니다.

1. `EnemyWorld`를 `WorldSystem`으로 넓혀 플레이어 이동과 픽업 공간 상태까지 맡깁니다.
2. `RunProgression`에서는 픽업 배열과 플레이어 공간 상태를 제거합니다.
3. `ObjectPool`은 순수 시스템이 아니라 Scene의 Phaser view 계층에 둡니다.
4. 추출 순서는 `RunProgression → WorldSystem → CombatSystem → Sc
