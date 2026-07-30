# C2 — Nightfall Protocol

첨부된 Unity 2021.3 기반 `VampireSurvivorsClone`을 **Vite + Vue 3 + TypeScript(strict) + Phaser 4.2.1 + Pinia + Zod + Dexie + Vitest + Playwright** 구조로 다시 구현한 웹 프로젝트입니다. Unity 프로젝트를 웹 페이지에 감싼 것이 아니라, 원본의 게임 규칙·수치·이미지 자산을 웹 런타임에 맞춰 재구성했습니다.

## 실행

```bash
npm install
npm run dev
```

Node.js 20.19 이상을 사용합니다. 프로덕션 빌드와 검증 명령은 다음과 같습니다.

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
# 한 번에: npm run check
```

Playwright를 처음 사용하는 환경에서는 브라우저 설치가 필요합니다.

```bash
npx playwright install chromium
```


## v2.1 안정화 및 UX 개선

- 레벨업 이벤트 직후 일반 일시정지 이벤트가 화면 상태를 덮어쓰던 충돌을 제거했습니다.
- 일시정지 단축키를 Vue의 단일 전역 라우터로 통합하고, 키 반복·보조키 조합·입력 필드에서는 무시하도록 했습니다.
- 레벨업 선택은 숫자키 `1`·`2`·`3`으로도 가능하며 첫 카드에 자동 포커스가 이동합니다.
- 일시정지 메뉴에서 런 종료를 한 번 더 확인하고, 설정 초기화에도 파괴적 작업 확인 단계를 추가했습니다.
- 저체력·종료 60초 전 HUD 피드백, 시작 조작 안내, reduced-motion 대응을 추가했습니다.
- 모바일 조이스틱이 포인터 취소·포커스 이탈·탭 비활성화 뒤에도 남지 않도록 입력 정리를 강화했습니다.

## 구현 범위

- 5종 캐릭터 선택과 서로 다른 시작 무기·기본 능력치
- 원본 능력군을 바탕으로 한 21종 액티브/패시브 강화
- 자동 사격, 수리검, 출혈 단검, 근접 부채꼴, 회전 도끼, 광선검, 마체테, 수류탄, 바주카, 화염 지대
- 6계열 일반 적, 원거리/부메랑/중력 공격, 미니보스와 최종 보스
- 원본 `Level 1.asset`의 600초 러닝타임, 300초 미니보스, 구간별 스폰율·등장 확률·체력 배율 이식
- 경험치 보석, 코인, 회복, 자석, 폭탄, 상자
- 키보드와 모바일 가상 조이스틱
- 한국어/영어 UI, 효과음·화면 흔들림·피해 숫자 설정
- Dexie 기반 로컬 프로필·설정·런 기록 저장
- E2E 전용 결정론적 시드와 테스트 브리지

## 구조

```text
src/
├─ app/                 # Phaser ↔ Vue 타입 이벤트 버스
├─ components/          # 메뉴, HUD, 레벨업, 일시정지, 결과, 터치 UI
├─ game/
│  ├─ core/             # RNG, 곡선, XP, 수학, 공용 타입
│  ├─ data/             # Zod로 검증되는 캐릭터·적·능력·레벨 데이터
│  ├─ scenes/           # BootScene, SurvivorScene
│  ├─ systems/          # 능력, 스폰, 공간 해시, 오브젝트 풀
│  ├─ GameController.ts # Phaser 수명주기와 Vue 명령 경계
│  └─ sceneBridge.ts    # 순환 의존성을 피하는 런타임 포트
├─ persistence/         # Dexie DB와 Zod 저장 스키마
└─ stores/              # Pinia profile/settings/session stores
```

### 경계 원칙

1. **Phaser Scene은 렌더링과 프레임 조정만 담당**합니다. 성장 계산, 스폰 곡선, 가중 선택, 공간 질의, 풀링은 별도 TypeScript 모듈입니다.
2. **Vue/Pinia는 메타 UI와 영속 상태만 담당**합니다. 매 프레임 적·투사체 상태를 반응형 객체로 만들지 않아 렌더링 부하를 피합니다.
3. **외부 데이터는 Zod에서 즉시 검증**합니다. 잘못된 능력 ID나 음수 수치가 런타임 깊숙이 들어가지 않습니다.
4. **저장은 Dexie 저장소 계층을 통해서만 수행**합니다. Phaser Scene은 IndexedDB를 직접 알지 못합니다.
5. **테스트는 순수 로직과 브라우저 흐름을 분리**합니다. Vitest가 수치 시스템을, Playwright가 실제 메뉴→런→레벨업→일시정지→결과 흐름을 확인합니다.

## 조작

- 이동: `WASD` 또는 방향키
- 일시정지/재개: `P`, `Esc`, HUD의 `Ⅱ`
- 레벨업 선택: 숫자키 `1`, `2`, `3` 또는 카드 클릭
- 모바일: 왼쪽 가상 조이스틱, 오른쪽 일시정지 버튼
- 공격: 자동

## E2E 모드

`/?e2e=1`에서는 러닝타임이 24초로 줄고 고정 시드를 사용합니다. 브라우저에 `window.__C2_GAME__` 테스트 포트가 노출되며 Playwright에서 XP 지급, 피해, 적 스폰, 종료를 결정론적으로 호출합니다. 일반 실행에서는 이 포트가 생성되지 않습니다.

## 자산과 라이선스

원본 저장소의 MIT 라이선스를 유지하며 `LICENSE`에 포함했습니다. `public/assets`의 픽셀 아트는 첨부 프로젝트에서 복사한 자산입니다. 자세한 내용은 `THIRD_PARTY_NOTICES.md`, `MIGRATION.md`, `VALIDATION.md`를 참조하십시오.
