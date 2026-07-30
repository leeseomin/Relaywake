가능합니다. **cmux 안에서 Codex CLI·개발 서버·브라우저를 3분할**하면 가장 편합니다.

```text
┌──────────────────────┬──────────────────────────┐
│ Codex CLI            │ cmux 인앱 브라우저       │
│                      │ localhost:5173           │
├──────────────────────┤                          │
│ Vite 개발 서버       │                          │
└──────────────────────┴──────────────────────────┘
```

## 1. Codex CLI 실행

cmux 터미널에서 프로젝트 폴더로 이동한 뒤 실행합니다.

```bash
cd ~/Projects/my-app
codex
```

Codex CLI는 현재 디렉터리의 코드를 읽고 수정하며 명령과 테스트를 실행합니다. 최초 실행 때는 ChatGPT 계정 로그인을 진행합니다. ([OpenAI Help Center][1])

## 2. 개발 서버용 터미널 분할

Codex가 실행 중인 상태에서:

* `⌘ ⇧ D` → 아래쪽에 터미널 분할
* 새 터미널에서 개발 서버 실행

Vite 프로젝트라면:

```bash
npm run dev
```

보통 다음과 같은 주소가 표시됩니다.

```text
http://localhost:5173
```

일반 HTML 프로젝트라면:

```bash
python3 -m http.server 8000
```

이 경우 주소는:

```text
http://localhost:8000
```

## 3. cmux 인앱 브라우저 열기

Codex 터미널이나 서버 터미널에 포커스를 둔 상태에서:

```text
⌘ ⇧ L
```

그러면 옆에 브라우저가 분할되어 열립니다. 주소창에 다음처럼 입력합니다.

```text
http://localhost:5173
```

브라우저를 바로 오른쪽에 분할하는 별도 단축키는 `⌥ ⌘ D`입니다. 주소창 포커스는 `⌘ L`, 새로고침은 `⌘ R`입니다. ([cmux][2])

Vite의 HMR이 작동하므로 Codex가 파일을 수정하면 대부분 브라우저 화면이 자동 갱신됩니다.

## 4. 오류 확인

cmux 브라우저에서 다음 단축키를 사용할 수 있습니다.

| 기능            | 단축키     |
| ------------- | ------- |
| 개발자 도구        | `⌥ ⌘ I` |
| JavaScript 콘솔 | `⌥ ⌘ C` |
| 새로고침          | `⌘ R`   |
| 강력 새로고침       | `⌘ ⇧ R` |
| 브라우저 확대       | `⌘ +`   |

cmux 브라우저는 콘솔·네트워크·DOM 확인과 JavaScript 실행을 지원합니다. ([cmux][2])

## Codex가 브라우저까지 직접 검사하게 하기

단순히 Codex를 cmux에서 실행한다고 해서 **Codex가 자동으로 브라우저 화면을 이해하는 것은 아닙니다.** 사람은 옆에서 볼 수 있지만, Codex가 직접 클릭·DOM 검사·콘솔 오류 확인까지 하게 하려면 cmux 스킬을 설치하는 편이 좋습니다.

```bash
npx skills add manaflow-ai/cmux -g -y
```

또는:

```bash
curl -fsSL https://raw.githubusercontent.com/manaflow-ai/cmux/main/skills.sh | bash
```

cmux 공식 스킬은 Codex를 포함한 코딩 에이전트에 브라우저 및 cmux CLI 사용법을 제공합니다. ([cmux][3])

그다음 Codex에 다음처럼 요청하면 됩니다.

```text
이 앱을 수정하면서 Vite 개발 서버를 실행하고,
cmux 인앱 브라우저에서 localhost 페이지를 확인해라.

각 수정 후 다음을 수행해라.
- 페이지 렌더링 확인
- 브라우저 콘솔 오류 확인
- 주요 버튼과 입력 동작 확인
- 오류가 있으면 수정 후 다시 검증
```

더 명시적으로는:

```text
cmux browser 명령을 사용해서 현재 브라우저를 식별하고,
DOM snapshot과 console/errors를 확인하면서 작업해라.
```

Codex가 사용할 수 있는 대표 명령은 다음과 같습니다.

```bash
cmux browser identify
cmux browser open-split http://localhost:5173
cmux browser surface:2 snapshot --interactive --compact
cmux browser surface:2 console list
cmux browser surface:2 errors list
cmux browser surface:2 screenshot --out /tmp/app.png
cmux browser surface:2 reload
```

cmux의 브라우저 API는 페이지 열기, DOM 스냅샷, 클릭, 입력, JavaScript 평가, 콘솔 및 오류 조회를 지원합니다. ([cmux][4])

**추천 구성은 왼쪽 위 Codex, 왼쪽 아래 `npm run dev`, 오른쪽 전체 브라우저**입니다. 이 구조가 Codex 작업 로그와 서버 오류, 실제 결과 화면을 동시에 확인하기 가장 좋습니다.

[1]: https://help.openai.com/en/articles/11096431-codex-cli-getting-started/ "Codex CLI | ChatGPT Learn"
[2]: https://cmux.com/docs/configuration "Configuration — macOS — cmux docs"
[3]: https://cmux.com/docs/skills?utm_source=chatgpt.com "Skills — AI coding on macOS"
[4]: https://cmux.com/docs/browser-automation?utm_source=chatgpt.com "Browser Automation — cmux docs"
