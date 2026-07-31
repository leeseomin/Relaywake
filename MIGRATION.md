# Unity → C2 웹 리팩터링 기록

## 대응표

| Unity 원본 | C2 웹 구현 |
|---|---|
| `LevelBlueprint` / `Level 1.asset` | `src/game/data/level.ts` + `SpawnDirector` |
| `CharacterBlueprint` | `src/game/data/characters.ts` + Zod schema |
| `MonsterBlueprint` 계열 | `src/game/data/enemies.ts` |
| Ability Prefab / ScriptableObject | `src/game/data/abilities.ts` + `AbilityDirector` |
| `ObjectPool` 컴포넌트 | 프레임워크 독립 `systems/ObjectPool.ts` |
| Unity Physics/Collider | 원형 충돌 + `SpatialHashGrid` 근접 질의 |
| `GameManager` / Scene 전환 | `GameController`, `sceneBridge`, Pinia session store |
| PlayerPrefs/런타임 상태 | Dexie 테이블 + Zod 저장 스키마 |
| Canvas UI | Vue SFC 컴포넌트 |
| Unity Test Runner | Vitest + Playwright |

## 보존한 핵심 규칙

- 기본 레벨 시간 600초
- 300초 미니보스, 600초 최종 보스
- `spawnRateKeyframes`, `spawnChanceKeyframes`, `hpMultiplierKeyframes`
- 레벨 1–9/10–19/20–29/30+의 경험치 증가량 10/13/16/20
- 피해량에서 방어력을 뺀 뒤 일반 공격 최소 피해 1
- 자동 공격과 레벨업 시 3개 강화 선택
- 원본의 캐릭터·적·무기·보석·코인·배경 이미지

## 웹 환경에 맞춘 변경

- Unity 단위는 60 FPS에 종속되지 않는 초당 픽셀 단위로 정규화했습니다.
- Rigidbody 대신 명시적 속도 적분과 원형 충돌을 사용합니다.
- 적 수가 늘어날 때 전수 비교를 피하도록 96px 셀 공간 해시를 사용합니다.
- Sprite를 반복 생성/파괴하지 않고 텍스처별 오브젝트 풀에서 재사용합니다.
- 프레임 상태를 Pinia에 넣지 않고, 약 12.5Hz HUD 스냅샷만 Vue로 전달합니다.
- 저장 데이터는 브라우저 IndexedDB에만 존재하며 계정이나 서버가 필요하지 않습니다.
