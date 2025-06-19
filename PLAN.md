좋습니다. 말씀하신 요구사항을 바탕으로 Obsidian 플러그인들을 **모노레포** 구조로 정리하고, 각 기능에 맞는 초기화 구조와 개발 방향을 아래와 같이 제안드립니다.

---

## 📦 프로젝트 구조 (Monorepo)

```
obsidian-plugins/
├─ package.json
├─ pnpm-workspace.yaml
├─ shared/                  # 공통 유틸/타입/템플릿 엔진 등
│
├─ plugins/
│  ├─ template-generator/   # 템플릿 문서 생성
│  ├─ git-sync/             # Git 관리
│  ├─ metadata-manager/     # Metadata 자동화
│  └─ publisher-scripton/   # Scripton 배포
│
└─ .github/workflows/
   └─ release.yml
```

---

## 📄 각 플러그인별 초기 구성 방향

### 1. 📝 `template-generator`

**기능**:

* `/templates/*.md` 기준 템플릿 읽기
* 선택 UI → 새 노트 생성 시 삽입
* `{{날짜}}`, `{{요일}}`, `{{날씨}}` 같은 마크업 지원
* 날씨: [wttr.in](https://wttr.in) 같은 API 또는 OpenWeather 활용

**기술요소**:

* 템플릿 엔진: `Handlebars` 또는 `eta`
* 설정 UI: 템플릿 선택, 자동 위치 지정

**예상 구조**:

```ts
const template = loadTemplate("daily-diary");
const rendered = renderTemplate(template, {
  날짜: todayDate(),
  날씨: await fetchWeather(),
  운세: getRandomFortune(),
});
```

---

### 2. 🔄 `git-sync`

**기능**:

* 일정 주기마다 `tmp` 브랜치에 자동 커밋/푸시
* LLM API를 통해 커밋 메시지 생성 (Claude or GPT)
* 시작 시 `pull --rebase`, 필요 시 `merge tmp`
* 충돌 발생 시 VSCode 자동 실행

**기술요소**:

* Git: `isomorphic-git` 또는 `simple-git`
* LLM 연동: API + 커밋 메시지 템플릿
* 옵션 설정: 자동 모드/질문 모드 전환 가능

---

### 3. 🧠 `metadata-manager`

**기능**:

* 새 문서 오픈 시 frontmatter 자동 삽입
* 규칙 기반 lint (필드 누락, 타입 불일치 등)

**예시 메타 규칙**:

```yaml
---
title: string
created: date
tags: string[]
category: enum[일기, 기록, 독서]
---
```

**기술요소**:

* Markdown AST 분석: `gray-matter`, `remark-frontmatter`
* Lint 규칙: JSON Schema 유사 정의 가능

---

### 4. 🚀 `publisher-scripton`

**기능**:

* Scripton API 키 기반 인증
* 선택한 노트(또는 폴더 전체) HTML/JSON으로 변환해 업로드
* 상태 UI, 배포 로그, 에러 메시지 등 제공

**기술요소**:

* API 통신: `fetch`
* 설정: API 키 저장, 공개 여부 설정
* Transformer: `obsidian-html-exporter` 또는 커스텀 마크다운 렌더러

---

## ✅ 개발 환경 제안

| 항목     | 기술                                               |
| ------ | ------------------------------------------------ |
| 개발 도구  | TypeScript, pnpm, Vite, `obsidian-api`           |
| 테스트    | `vitest`, `obsidian-mock`                        |
| 템플릿 엔진 | `eta`, `Handlebars`, 또는 `mustache`               |
| 배포 자동화 | GitHub Actions, `make release` 또는 `pnpm release` |

---

원하신다면 `pnpm workspace 초기 설정`, 각 플러그인별 `package.json`, 기본 `manifest.json`, 자동 생성 프롬프트도 제공해드릴 수 있습니다.
어떤 것부터 시작하시겠습니까? 😊
