네. **RELAYWAKE 같은 무료 브라우저 게임은 Cloudflare Pages와 itch.io에 함께 올리는 편이 좋습니다.** 다만 itch.io로 이전하기보다 **Cloudflare Pages를 공식판, itch.io를 발견·커뮤니티용 배포판**으로 운영하는 방식이 가장 적합합니다.

### 역할을 이렇게 나누세요

| 채널                     | 역할                                   |
| ---------------------- | ------------------------------------ |
| **Cloudflare Pages**   | 항상 최신인 공식 플레이 주소, 빠른 배포, 커스텀 도메인·분석  |
| **itch.io**            | 게임 플랫폼 내 발견성, 작품 소개 페이지, 팔로워·업데이트·후원 |
| **GitHub**             | 오픈소스와 개발 신뢰도                         |
| **X·LinkedIn·Show HN** | 초기 유입과 홍보                            |

itch.io는 HTML/CSS/JavaScript 게임을 ZIP으로 올리면 페이지 안에서 직접 실행할 수 있으며, 업로드 비용도 없습니다. 태그·메타데이터·Devlog·팔로워 시스템을 통해 일반 웹 주소만 있을 때보다 게임 플랫폼 이용자에게 발견될 가능성이 생깁니다. 다만 itch.io도 ‘최근 출시’ 목록만으로는 홍보 효과가 제한적이라고 안내하므로, 기존 X·LinkedIn 홍보와 함께 써야 합니다. ([itch.io][1])

## 추천 배포 방식

**단순히 Cloudflare 링크만 거는 것보다 실제 빌드 ZIP을 itch.io에도 업로드하세요.**

1. Vite 설정에서 상대 경로를 사용합니다.

```ts
// vite.config.ts
export default defineConfig({
  base: "./",
});
```

2. `npm run build` 후 `dist` 폴더 자체가 아니라 **dist 내부 파일들**을 ZIP으로 묶습니다.

```text
relaywake-itch.zip
├── index.html
├── assets/
└── ...
```

itch.io는 ZIP 루트에 `index.html`이 있어야 하고, 파일 경로는 대소문자를 구분하며 상대 경로 사용을 권장합니다. 현재 HTML5 업로드 기본 제한은 압축 해제 후 500MB, 파일 1,000개 이하입니다. ([itch.io][1])

3. itch.io 설정은 다음이 적합합니다.

* Kind of project: **HTML**
* Pricing: **No payments** 또는 **$0 or donate**
* Embed: **Click to launch in fullscreen**
* Mobile Friendly: 실제 모바일 조작을 지원할 때만 체크
* Cover: **630×500**
* Screenshot: 3～5장
* 짧은 게임플레이 GIF 또는 영상 추가

itch.io는 브라우저 HTML5 게임의 경우 유료 접근권보다는 무료 플레이와 기부 방식으로 운영하도록 되어 있습니다. 표지와 스크린샷은 검색·추천 노출에도 중요합니다. ([itch.io][1])

## RELAYWAKE 페이지 구성 예시

**한 줄 소개**

> A 10-minute browser survival-action game with 5 operatives, 23 upgrades, and escalating boss battles.

**추천 태그**

`Survival` · `Action` · `Roguelite` · `Bullet Hell` · `Singleplayer` · `Short` · `Browser` · `Pixel Art` 또는 실제 그래픽 스타일 태그

본문에는 다음 정도만 명확히 넣으면 됩니다.

* 브라우저에서 즉시 플레이
* 한 판 약 10분
* 5명의 오퍼레이터
* 23개 업그레이드
* 미니보스와 최종 보스
* 키보드·마우스 조작법
* Cloudflare 공식판 링크
* GitHub 오픈소스 링크

## 한 가지 주의점

Cloudflare판과 itch.io판은 도메인이 달라서 IndexedDB나 `localStorage` 저장 데이터가 서로 공유되지 않습니다. 따라서 한쪽에서 얻은 해금·설정·기록이 다른 쪽으로 자동 이전되지는 않습니다. ([MDN Web Docs][2])

**결론적으로 지금 itch.io에도 등록하는 것이 좋습니다.** 특히 RELAYWAKE는 이미 플레이 가능하고 영상·GitHub·소개 문구도 준비되어 있어 itch.io 페이지를 만드는 추가 비용이 낮습니다. Cloudflare를 주력판으로 유지하면서 itch.io를 두 번째 플레이 입구이자 포트폴리오 페이지로 활용하는 구성이 가장 효율적입니다.

[1]: https://itch.io/docs/creators/html5 "Uploading HTML5 games - itch.io"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology?utm_source=chatgpt.com "IndexedDB key characteristics and basic terminology - Web APIs | MDN"
