# Signalfall

[`VampireSurvivorsClone`](https://github.com/matthiasbroske/VampireSurvivorsClone)을 **Vite + Vue 3 + TypeScript(strict) + Phaser 4.2.1 + Pinia + Zod + Dexie + Vitest + Playwright** 구조로 다시 구현하고, 유닛을 새롭게 디자인했습니다.

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

## 조작

- 이동: `WASD` 또는 방향키
- 일시정지/재개: `P`, `Esc`, HUD의 `Ⅱ`
- 레벨업 선택: 숫자키 `1`, `2`, `3` 또는 카드 클릭
- 모바일: 왼쪽 가상 조이스틱, 오른쪽 일시정지 버튼
- 공격: 자동

## 자산과 라이선스

원본 저장소의 MIT 라이선스를 유지하며 `LICENSE`에 포함했습니다. `public/assets`에는 원본 프로젝트 자산과 Relaywake 전용 생성·재구성 자산이 함께 포함됩니다. 자세한 내용은 `THIRD_PARTY_NOTICES.md`, `MIGRATION.md`, `VALIDATION.md`를 참조하십시오.
