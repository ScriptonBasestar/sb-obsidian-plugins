# 🧩 Obsidian Plugins TODO 리스트

> 모노레포 구조의 Obsidian 플러그인 개발을 위한 초기 작업 목록입니다.

---

## 📦 공통 작업 (Monorepo)

- [x] `pnpm` 기반 workspace 구성 (`pnpm-workspace.yaml`)
- [x] 루트 `package.json` 설정 (devDeps, scripts 등)
- [x] 공통 타입/유틸 디렉토리 `shared/` 생성
- [x] 루트 `.gitignore`, `README.md`, `Makefile` 생성
- [ ] GitHub Actions 배포용 워크플로우 (`.github/workflows/release.yml`)

---

## 📄 template-generator 플러그인

- [ ] `/templates` 폴더로부터 템플릿 목록 로드 기능 구현
- [ ] 템플릿 생성 버튼/명령어 (`Command palette`) 추가
- [ ] 템플릿 엔진(Handlebars or eta) 통합
- [ ] `{{날짜}}`, `{{날씨}}`, `{{운세}}` 변수 처리
- [ ] 외부 API(OpenWeather 등) 연동 구현
- [ ] 사용자 설정: 템플릿 디렉토리 위치, 기본 템플릿 지정
- [ ] 템플릿 미리보기 및 선택 UI 구현

---

## 🔄 git-sync 플러그인

- [ ] 주기적 `tmp` 브랜치 자동 커밋 및 푸시
- [ ] 커밋 메시지 생성을 위한 LLM API 연동 (Claude/GPT)
- [ ] 사용자가 지정한 프롬프트 기반 커밋 메시지 생성기
- [ ] Obsidian 시작 시 `pull --rebase` 자동 실행
- [ ] `tmp` → `main` 브랜치 병합 자동 처리/옵션 제공
- [ ] 충돌 발생 시 `code .` 등 외부 에디터 실행
- [ ] 설정 UI: 주기 설정, 브랜치 이름, 자동 병합 여부

---

## 🧠 metadata-manager 플러그인

- [ ] 새 문서 열기 시 frontmatter 자동 삽입 기능
- [ ] 템플릿 기반 메타데이터 규칙 정의 기능
- [ ] 규칙 기반 lint: 누락 필드, 잘못된 타입 감지
- [ ] 메타데이터 자동 포맷/정렬 기능
- [ ] 설정 UI: 규칙 템플릿 작성, 필수/옵션 필드 구분

---

## 🌐 publisher-scripton 플러그인

- [ ] API 키 등록 UI 구현
- [ ] 노트 또는 폴더 선택 → scripton.cloud로 업로드
- [ ] Markdown → HTML/JSON 변환기 구현 또는 연동
- [ ] 배포 로그/상태 피드백 UI 구현
- [ ] 실패 시 자동 재시도 또는 로그 파일 기록
- [ ] 공개 여부, 태그 필터 등 설정 지원

---

## 🧪 테스트 및 릴리스

- [ ] 각 플러그인별 테스트 기본 코드 구성 (`vitest`, `obsidian-mock`)
- [ ] `make dev`, `make release` 명령 구성
- [ ] GitHub Releases 연동 (자동 릴리스 zip 생성)
- [ ] Obsidian 플러그인 마켓 등록 준비

---

🛠️ 계속해서 플러그인을 확장하거나 요구사항이 변경되면 이 TODO를 갱신하세요!
