# Relaywake — 개선안 타당성 재검토 및 도입 계획

## 1. 검토 범위와 기준

이 문서는 `vampire-re1.md`의 **15. 우선순위별 개선안**을 현재 저장소 상태와 다시 대조하고, 실제로 도입할 작업과 순서를 정리한다.

기본 목표는 다음과 같이 가정한다.

- 공개 가능한 웹 데모 품질 확보
- 이후 콘텐츠와 시스템을 계속 확장할 수 있는 구조 확보
- 지원 환경에서 재현 가능한 빌드와 자동 검증 확보

상업 배포나 서브패스 배포를 목표로 할 경우 별도의 출시 조건을 추가로 적용한다.

---

## 2. 종합 결론

기존 10개 개선안의 방향은 대체로 타당하지만, 현재 상태에서는 우선순위가 그대로 유효하지 않다.

핵심 수정 사항은 다음과 같다.

1. `package-lock.json`은 이미 존재하고 Git에 포함되어 있으므로 “lockfile 생성”은 작업 대상에서 제외한다.
2. 검토 당시 `npm run check`가 typecheck 단계에서 실패했으므로 빌드·CI 게이트 복구를 최우선으로 정했고, 현재 P0에서 해결했다.
3. 문서 13절에서 확인한 게임 동작 결함이 15절 우선순위에서 누락되어 있다.
4. `SurvivorScene` 분리는 필요하지만, 현재 동작을 고정하는 회귀 테스트보다 먼저 진행하면 위험하다.
5. 에셋 수정·최적화·manifest·라이선스 추적은 하나의 에셋 작업군으로 묶어 P1에서 반영했다.
6. 메타 진행과 고정 timestep은 각각 제품 방향과 시뮬레이션 계약을 먼저 정해야 한다.

권장 흐름은 다음과 같다.

```text
빌드·CI 정상화
→ 핵심 동작 회귀 테스트
→ 확인된 게임 결함 수정
→ 저장·에셋 안정화
→ SurvivorScene 점진 분리
→ 초기 로딩과 프레임 일관성 개선
```

### P0 반영 결과 — 2026-07-30

이 문서의 P0 범위는 현재 코드에 반영되었다.

| P0 항목 | 반영 내용 | 상태 |
| --- | --- | --- |
| 빌드 게이트 복구 | `SurvivorScene.update()`의 strict override 오류 수정 | 완료 |
| 단일 릴리스 게이트 | typecheck → unit → production build → preview E2E 순서의 `npm run check` 구성 | 완료 |
| CI | `a700802`에서 GitHub Actions를 추가했으나 후속 `b3fefb3`에서 workflow가 삭제됨 | 현재 workflow 없음 |
| production E2E | Vite dev server 대신 `dist`를 제공하는 `vite preview` 대상으로 전환 | 완료 |
| 게임 동작 결함 | 공격 방향, 오버킬 통계, 공간 해시 분리 순서, 최종 보스 보상, 완전한 프레젠테이션 정지 처리 | 완료 |
| 브라우저 회귀 | 실제 피해 패배, 최종 보스 처치 승리, 결과 UI, IndexedDB run/profile 저장 검증 | 완료 |
| 모바일 회귀 | 실제 touch start/move/end, Scene 입력 벡터, 조이스틱 초기화, 터치 일시정지 검증 | 완료 |

현재 통합 검증 결과:

- `npm ci`: 통과
- typecheck: 통과
- Vitest: 16파일, 48개 테스트 통과
- production bundle: 통과
- Playwright: 9개 통과, 데스크톱 프로젝트의 모바일 전용 테스트 1개 의도적 제외
- `npm run check`: 통과

### P1 6.3·6.4 반영 결과 — 2026-07-30

| P1 항목 | 반영 내용 | 상태 |
| --- | --- | --- |
| run/profile 원자성 | 기존 profile 조회, 중복 run 방지, run 추가와 profile 집계를 하나의 Dexie read-write transaction으로 결합 | 완료 |
| 메모리·DB 일관성 | transaction commit 반환 뒤에만 Pinia를 갱신하고 동시 run 종료·설정 저장·전체 초기화를 queue로 직렬화 | 완료 |
| 설정 오류 UX | 저장 성공 전 상태를 공개하지 않으며 실패 시 체크박스·Pinia를 이전 값으로 유지하고 오류 토스트 표시 | 완료 |
| 실제 브라우저 저장 검증 | run/profile/settings를 실제 IndexedDB에서 읽고 성공·실패 뒤 새로고침 상태까지 확인 | 완료 |
| 에셋 교체 | 고대비 단일 `play` PNG와 단일 회복 물약 PNG로 교체 | 완료 |
| 배경 최적화 | `dirt-red.png`를 2048×2048에서 512×512로 축소하고 2,948,342B에서 243,891B로 압축 | 완료 |
| manifest 통합 | 배포 이미지 40개의 포맷·치수·프레임·소비자·출처·commit·저작자·라이선스를 중앙 관리 | 완료 |
| preload·무결성 | Phaser 실제 소비 에셋만 preload하고 매직 바이트·확장자·크기·프레임·사용 여부·시각 품질을 같은 manifest로 검사 | 완료 |

---

## 3. 현재 검증 상태

### 빌드와 테스트

- `package-lock.json`은 lockfile v3이며 현재 Git에 추적되어 있다.
- `npm test`는 단위 테스트 16파일, 48개 테스트를 모두 통과한다.
- `src/game/scenes/SurvivorScene.ts`의 `update()`에 `override`를 적용해 기존 `TS4114`를 해소했다.
- `tsconfig.app.json`은 `noImplicitOverride: true`를 사용한다.
- typecheck와 production build가 모두 통과한다.
- 직접 Vite 번들링한 결과 초기 JavaScript가 단일 파일 약 1,704.23KB, gzip 약 464.09KB였다.
- Playwright Chromium을 설치하고 production preview 기반 E2E를 실행해 9개가 통과했으며, 데스크톱 프로젝트의 모바일 전용 테스트 1개만 의도적으로 제외했다.
- 전체 `npm run check`가 통과한다.

### 검증 파이프라인의 남은 공백

- `npm run check`와 Playwright production preview 검증은 구성됐지만, 실제 10분 전체 런의 soak/performance 검증은 아직 없다.
- `a700802`에서 추가했던 `.github/workflows/ci.yml`은 후속 `b3fefb3`에서 삭제되어 현재 원격 CI 자동 실행은 없다. 로컬 단일 게이트는 유지된다.
- 승리와 패배는 실제 게임 내부 경로를 통과하지만 E2E 전용 단축 브리지를 사용하므로 10분 동안의 자연 발생 이벤트 전체를 대신하지는 않는다.
- 기본 모바일 pointer 이동·해제·일시정지는 검증하지만 화면 회전과 장시간 백그라운드 복귀는 아직 자동화되지 않았다.
- Vitest coverage 기본 범위가 `src/game/core/**`와 `src/game/systems/**`로 제한되어 `SurvivorScene`의 핵심 전투 로직을 포함하지 않는다.

---

## 4. 기존 10개 개선안의 타당성

| 기존 순위 | 기존 작업 | 판정 | 도입 결정 |
| --- | --- | --- | --- |
| 1 | `package-lock.json` 생성 및 CI에서 `npm ci` | 부분 타당 | lockfile 생성은 제외하고 CI 부분을 2번과 통합한다. |
| 2 | 클린 환경 전체 검증 | 최우선 | 검토 당시 실패하던 릴리스 게이트를 P0에서 복구하고 자동화했다. |
| 3 | `play.png`, `potion.png` 수정 | 타당 | 실제 화면 품질과 파일 규약 문제이므로 에셋 작업군에 포함한다. |
| 4 | `dirt-red` 축소·압축, 불필요 preload 제거 | 타당 | 모바일 전송량과 GPU 메모리에 직접 효과가 있어 도입한다. |
| 5 | Phaser 런 시작 시 동적 import | 타당 | 초기 번들 측정 근거가 있으나 correctness 작업 뒤에 배치한다. |
| 6 | `SurvivorScene` 책임 분리 | 강하게 타당 | characterization test를 먼저 확보한 뒤 점진적으로 도입한다. |
| 7 | 에셋 manifest·출처·라이선스·프레임 정보 | 목표 의존 | 공개·상업 배포 시 P0, 내부 데모에서는 에셋 정리와 함께 P1로 도입한다. |
| 8 | 런 기록과 프로필 갱신의 Dexie transaction | 타당 | 작업량 대비 효과가 큰 데이터 안전성 개선으로 도입한다. |
| 9 | `discoveredAbilities`와 해금 시스템 구현 또는 제거 | 제품 결정 필요 | 자동 구현하지 않고 메타 진행 범위를 먼저 결정한다. |
| 10 | 고정 timestep 또는 accumulator | 조건부 타당 | 구조 분리와 프레임별 회귀 검증을 확보한 뒤 도입한다. |

---

## 5. 기존 우선순위에서 누락된 작업

### 5.1 검토 당시 빌드 게이트 실패

`SurvivorScene.update()`의 `override` 누락으로 strict typecheck가 실패했다. P0 적용으로 해당 오류를 수정하고 전체 게이트 통과를 확인했다.

### 5.2 알려진 게임 동작 결함

다음 문제는 `vampire-re1.md` 13절에서 확인되었지만 15절의 실행 순서에는 포함되지 않았다.

- 최종 보스를 처치하면 상자를 생성한 직후 런을 종료하여 상자를 획득할 수 없음
- 마체테·쌍검이 플레이어의 facing angle과 무관하게 월드 좌우 방향으로만 공격
- 적의 남은 체력을 초과한 오버킬 피해까지 결과 화면 피해량에 포함
- 적 분리 단계가 이전 프레임의 공간 해시를 사용
- 일시정지 중 Phaser 애니메이션, Tween, 피해 숫자와 이미 시작한 오디오가 계속 진행

이 항목들은 에셋 최적화나 구조 리팩터링보다 사용자 경험과 게임 결과에 직접 영향을 준다.

### 5.3 저장 오류 처리

런 기록과 프로필은 별도 write로 저장된다. 두 번째 write가 실패하면 런 기록은 존재하지만 누적 코인과 최고 기록은 반영되지 않을 수 있다.

또한 설정 store는 메모리 상태를 먼저 바꾸고 IndexedDB에 저장한다. 저장 실패 시 화면 상태와 재접속 후 상태가 달라질 수 있으며, 해당 오류가 사용자 알림 흐름에 완전히 연결되어 있지 않다.

### 5.4 배포 표면

공개 배포를 목표로 한다면 다음도 별도 출시 조건으로 다뤄야 한다.

- `/assets/...` 절대 경로와 Vite `base` 설정 부재로 인한 서브패스 배포 위험
- 원본 저장소 URL, commit, 에셋별 출처와 라이선스 증빙 부족
- package name, README, HTML description에 남아 있는 clone 표현

---

## 6. 실제 도입 계획

### P0 — 반영 완료

#### 6.1 빌드·CI 게이트 정상화

작업:

- `SurvivorScene.update()`의 strict typecheck 오류 수정
- 기존 `package-lock.json`을 사용한 `npm ci`
- 지원 Node/npm 버전을 CI에서 명시
- typecheck → unit → build → production preview E2E 순서로 검증
- Playwright 브라우저 설치와 캐시 구성
- E2E를 Vite dev server가 아니라 `dist` preview 대상으로 전환
- 전체 검증을 하나의 CI 진입점으로 제공

완료 기준:

- 새 체크아웃의 클린 환경에서 `npm ci`부터 전체 검증까지 통과한다.
- CI가 typecheck, unit, production build, preview E2E 중 하나라도 실패하면 배포를 차단한다.
- 현재 `VALIDATION.md`를 실제 실행 결과와 일치하도록 갱신한다.

#### 6.2 핵심 게임 회귀 테스트와 동작 결함 수정

먼저 추가할 검증:

- 단축된 자연스러운 런의 승리와 패배
- 최종 보스 처치와 보상 처리
- 공격 방향
- 실제 피해량과 결과 통계
- 일시정지 전후 시뮬레이션·Tween 상태
- 밀집된 적의 분리와 공간 해시 갱신
- 승리·패배 후 IndexedDB 저장 결과

그다음 수정할 항목:

- 최종 보스의 획득 불가능한 상자 처리
- 마체테·쌍검의 facing 기준 공격
- 오버킬 피해 통계 보정
- 적 분리와 공간 해시 순서 보정
- 일시정지 시 시각 효과와 오디오 정책 통일

완료 기준:

- 각 결함에 재현 테스트가 먼저 존재한다.
- 결함 수정 뒤 기존 메뉴→런→레벨업→일시정지→결과 흐름도 계속 통과한다.

---

### P1 — 다음 안정화 배치

#### 6.3 저장 원자성과 오류 처리

**반영 상태: 완료 — 2026-07-30**

작업:

- [x] 런 기록과 프로필 갱신을 하나의 Dexie transaction으로 결합
- [x] DB commit 성공 후에만 Pinia 프로필 갱신
- [x] transaction 실패 시 run/profile이 함께 rollback되는 테스트 추가
- [x] 설정 저장 실패 시 메모리 상태 유지와 직렬화된 후속 재시도 경로 확보
- [x] 설정 저장 오류를 사용자 토스트와 연결
- [x] E2E에서 실제 IndexedDB의 run/profile/settings 값을 확인

완료 기준:

- [x] 저장 도중 어느 write가 실패해도 부분 저장이 남지 않는다.
- [x] 메모리 상태와 새로고침 후 저장 상태가 일치한다.

실제 Dexie 생성·갱신·전체 초기화 실패를 `fake-indexeddb`에서 주입해
transaction rollback을 검증했다. 동일 run ID 재전달과 동시에 끝난 두
run도 중복 집계나 유실 없이 처리한다. 다른 브라우저 탭의 변경을 현재
탭 Pinia에 실시간 전파하지는 않지만, 새로고침 뒤에는 IndexedDB와 일치한다.

#### 6.4 에셋 품질·메모리·manifest 통합

**반영 상태: 완료 — 2026-07-30**

작업:

- [x] `play.png`를 실제 PNG로 변환하고 고대비 단일 아이콘으로 교체
- [x] `potion.png`를 단일 회복 아이템 스프라이트로 교체
- [x] 2048×2048 `dirt-red.png`를 시각 품질을 유지하며 축소·압축
- [x] Phaser에서 사용하지 않는 texture preload 제거
- [x] CSS에서 직접 참조하던 에셋도 중앙 manifest에서 공급
- [x] `key`, `path`, `format`, `dimensions`, `frame`, `source`, `license`를 하나의 manifest에서 관리
- [x] preload와 무결성 테스트가 동일한 manifest를 소비하도록 구성
- [x] 매직 바이트, 크기, 프레임 정렬, 사용 여부 검사 추가

완료 기준:

- [x] 확장자와 실제 포맷이 일치한다.
- [x] 잘못된 복합 스프라이트가 화면에 노출되지 않는다.
- [x] 사용하지 않는 이미지가 Phaser TextureManager에 올라가지 않는다.
- [x] 배경 최적화 전후의 다운로드 크기와 디코드 메모리를 기록한다.
- [x] 모든 포팅 에셋의 원본 URL·commit·경로·귀속 수준·라이선스 근거를 추적할 수 있다.

`dirt-red.png`의 다운로드 크기는 2,948,342B에서 243,891B로 91.73%,
RGBA 디코드 메모리는 16MiB에서 1MiB로 93.75% 감소했다. 상세 수치와
회귀 예산은 `ASSET_METRICS.md`에 기록했다. 새 `play`와 `potion`은
Relaywake용 생성 에셋이므로 upstream URL과 commit이 존재하지 않음을
manifest에 명시하고 프로젝트 MIT 라이선스로 구분했다.
코인 2종과 자석은 각각 Bonsaiheldin·Kenney까지 귀속을 확인했고, 나머지는
upstream bundle의 저장소·commit·원본 경로·포괄 라이선스 선언과 아트
크레딧을 기록했다. upstream이 파일별 아티스트 매핑을 제공하지 않는
항목은 그 신뢰 수준을 manifest에 명시했으므로, 공개·상업 배포에서
파일별 원저작자 확인이 필수라면 별도 확인이 남는다.

#### 6.5 `SurvivorScene` 점진 분리

원칙:

- 파일 길이를 줄이는 것 자체가 목표가 아니다.
- Phaser 객체를 다른 클래스에 그대로 옮기는 것보다 순수 시뮬레이션 경계를 만드는 것이 우선이다.
- 각 책임은 기존 동작을 고정하는 characterization test 뒤에 이동한다.

권장 분리 단위:

- 적 상태·AI·분리
- 투사체·충돌·폭발
- 근접·영역·회전 무기
- 드롭·획득·보상
- 플레이어 피해·회복·런 통계
- Phaser 렌더링 adapter

목표 구조:

```text
SurvivorScene
├─ 입력 수집
├─ 프레임 조정
├─ Phaser 렌더링 동기화
└─ 순수 게임 시스템 호출
   ├─ EnemySystem
   ├─ CombatSystem
   ├─ ProjectileSystem
   └─ PickupSystem
```

완료 기준:

- Scene은 입력·렌더링·수명주기 조정에 집중한다.
- 전투·적·투사체·드롭 규칙을 Phaser 없이 단위 테스트할 수 있다.
- 핵심 게임 코드가 coverage 대상에서 제외되지 않는다.

---

### P2 — 구조 안정화 후 도입

#### 6.6 Phaser 런타임 동적 로딩

작업:

- 메뉴 진입 시 Phaser와 Scene을 초기 의존성 그래프에서 제외
- 런 시작 시 게임 runtime을 동적 import
- 로딩 중 중복 클릭과 취소를 안전하게 처리
- 메뉴 초기 번들과 게임 청크를 분리

완료 기준:

- 첫 메뉴 화면의 초기 JS 다운로드와 parse 비용이 기존보다 명확히 감소한다.
- 런 시작, 재시작, 종료 과정에서 Phaser 인스턴스가 중복 생성되지 않는다.
- 초기 메뉴 번들과 게임 청크에 크기 예산을 설정한다.

#### 6.7 프레임률 독립성 강화

현재 문제:

- Scene delta는 최대 50ms로 잘리므로 20FPS 미만에서는 실제 시간보다 게임 시간이 느려진다.
- 적 분리는 delta를 사용하지 않아 프레임률에 따라 밀어내는 강도가 달라질 수 있다.
- 일부 주기성 이벤트는 긴 프레임에서 여러 tick을 따라잡지 않는다.
- 빠른 투사체는 이산 위치 충돌로 적을 건너뛸 수 있다.

도입 전 결정:

- 10분 런이 벽시계 10분인지 시뮬레이션 10분인지 정의
- 완전 결정론이 필요한지, 체감상 일관성만 필요한지 정의
- 지원할 최소 FPS와 최대 catch-up 비용 정의

권장 방식:

- bounded fixed-step accumulator
- 프레임당 최대 catch-up step 제한
- 과부하 시 남은 시간을 무제한 따라잡지 않도록 보호
- 필요 시 빠른 투사체에 swept collision 적용

완료 기준:

- 30/60/120FPS 조건에서 동일 시드의 시간, 스폰 수, 적 밀도와 피해 결과가 허용 오차 안에 들어온다.
- 저성능 환경에서 spiral-of-death가 발생하지 않는다.

---

## 7. 제품 결정이 필요한 메타 진행

현재 상태는 `discoveredAbilities` 하나만의 문제가 아니다.

- 모든 캐릭터가 기본 해금되어 있음
- `unlockedCharacters`가 메뉴 선택에 사용되지 않음
- `discoveredAbilities`가 실제 런 결과로 갱신되지 않음
- 코인은 누적되고 표시되지만 소비처가 없음
- 최고 시간·최고 처치·총 런 수가 저장되지만 사용자에게 충분히 노출되지 않음

선택지는 둘 중 하나다.

### 선택 A — 메타 진행 구현

- 캐릭터 해금 조건
- 코인 소비처
- 발견 능력 도감
- 최고 기록과 런 히스토리 화면
- 기존 저장 데이터의 Dexie migration

### 선택 B — 프로토타입 범위로 축소

- 사용하지 않는 `discoveredAbilities`, `unlockedCharacters` 제거
- 코인을 런 점수로 명확히 정의하거나 UI에서 제거
- 사용자에게 노출하지 않는 최고 기록 필드 정리

현재 목표가 웹 재구현 데모라면 **선택 B가 기본 권장안**이다. 별도의 메타 게임 설계 없이 해금 시스템만 임의로 추가하지 않는다.

---

## 8. 공개·상업 배포 시 우선순위 조정

공개 또는 상업 배포가 확정되면 다음 작업을 P0으로 올린다.

1. 원본 저장소 URL과 commit/tag 기록
2. 에셋별 원본 경로·저작자·라이선스·수정 여부 기록
3. 원본 및 배포 파일 해시 기록
4. 실제 배포 base에서 모든 에셋 경로 검증
5. 서브패스 배포를 지원한다면 절대 `/assets/...` 경로 수정
6. package name, README, HTML description의 clone 표현 정리

---

## 9. 최종 도입 순서

| 실제 순위 | 작업군 | 상태 |
| --- | --- | --- |
| 1 | typecheck 오류 수정과 클린 CI/production preview E2E | P0 반영 완료 |
| 2 | 핵심 Scene 회귀 테스트와 알려진 게임 결함 수정 | P0 반영 완료 |
| 3 | Dexie transaction과 설정 저장 오류 처리 | P1 반영 완료 |
| 4 | 에셋 수정·최적화·manifest 통합 | P1 반영 완료 |
| 5 | 테스트를 유지한 `SurvivorScene` 점진 분리 | 다음 배치 |
| 6 | Phaser 동적 import와 번들 분리 | 구조 안정화 후 |
| 7 | bounded fixed-step 또는 개별 프레임 의존성 보정 | 검증 기반 확보 후 |
| 8 | 메타 진행 구현 또는 제거 | 제품 결정 후 |

공개·상업 배포가 목표라면 에셋 출처·라이선스·배포 base 검증을 1~2순위 작업과 병행한다.

---

## 10. 전체 완료 조건

개선 작업은 문서나 코드 이동만으로 완료로 판단하지 않는다. 다음 조건을 충족해야 한다.

- 지원 Node/npm 버전의 클린 환경에서 `npm ci`와 전체 CI가 통과
- typecheck, unit, production build, preview E2E가 모두 녹색
- 승리·패배와 run/profile 저장을 실제 브라우저에서 검증
- run/profile 저장이 함께 성공하거나 함께 rollback
- 모바일 pointer 입력과 취소·백그라운드 복귀 흐름 검증
- 실제 배포 경로에서 모든 에셋이 정상 응답
- 핵심 게임 로직이 자동 테스트와 coverage 범위에 포함
- 초기 번들, 에셋 전송량, 텍스처 메모리, 프레임 일관성 개선 수치 기록
