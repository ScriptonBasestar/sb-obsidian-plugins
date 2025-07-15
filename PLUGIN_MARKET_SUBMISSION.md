# Obsidian Plugin Market Submission Guide

> 이 문서는 sb-obsidian-plugins 모노레포의 각 플러그인을 Obsidian 공식 플러그인 마켓에 등록하기 위한 가이드입니다.

## 🚀 준비된 플러그인들

### 1. Template Generator
- **ID**: `template-generator`
- **설명**: 날씨, 운세, 날짜 변수가 포함된 동적 템플릿 삽입
- **주요 기능**: Handlebars 템플릿 엔진, OpenWeather API, 한국어 날짜 지원

### 2. Git Sync
- **ID**: `git-sync`
- **설명**: 자동 git 동기화 및 LLM 기반 커밋 메시지 생성
- **주요 기능**: 자동 커밋/푸시, 브랜치 병합, Claude/GPT 연동

### 3. Metadata Manager
- **ID**: `metadata-manager`
- **설명**: Frontmatter 메타데이터 자동 관리 및 린트
- **주요 기능**: 자동 frontmatter 삽입, 규칙 기반 검증, 자동 포맷팅

### 4. Publisher Scripton
- **ID**: `publisher-scripton`
- **설명**: scripton.cloud로 노트 발행
- **주요 기능**: 클라우드 발행, 첨부파일 업로드, 자동 재시도

## 📋 제출 요구사항 체크리스트

### ✅ 필수 파일들
- [x] `manifest.json` - 모든 플러그인에 있음
- [x] `main.js` - 빌드 프로세스로 생성됨
- [x] `README.md` - 각 플러그인별로 작성됨
- [x] `package.json` - 모든 플러그인에 있음

### ✅ 코드 품질
- [x] TypeScript로 작성
- [x] 포괄적인 테스트 커버리지
- [x] ESLint 및 타입 체크 통과
- [x] 에러 처리 및 사용자 피드백

### ✅ 사용자 경험
- [x] 설정 UI 구현
- [x] 명령어 팔레트 통합
- [x] 상태바 표시
- [x] 알림 및 오류 메시지

### ✅ 문서화
- [x] 상세한 README.md
- [x] 사용법 가이드
- [x] 설정 옵션 설명
- [x] 문제 해결 가이드

### ✅ 릴리스 관리
- [x] GitHub Actions 자동 빌드
- [x] 시맨틱 버전 관리
- [x] 자동 릴리스 zip 생성
- [x] 릴리스 노트 생성

## 🔧 제출 프로세스

### 1. 개별 리포지토리 생성
각 플러그인을 별도 리포지토리로 분리해야 합니다:

```bash
# 1. 새 리포지토리 생성 (GitHub에서)
# 2. 플러그인 코드 복사
mkdir obsidian-template-generator
cd obsidian-template-generator

# 3. 필요한 파일들 복사
cp -r ../sb-obsidian-plugins/packages/template-generator/* .
cp ../sb-obsidian-plugins/.github/workflows/release.yml .github/workflows/
cp ../sb-obsidian-plugins/README.md .
cp ../sb-obsidian-plugins/LICENSE .

# 4. package.json 수정 (모노레포 설정 제거)
# 5. 독립적인 빌드 설정 확인
```

### 2. 커뮤니티 플러그인 PR 생성
Obsidian 공식 리포지토리에 PR 생성:

```bash
# 1. obsidian-releases 리포지토리 fork
git clone https://github.com/obsidianmd/obsidian-releases.git
cd obsidian-releases

# 2. community-plugins.json에 플러그인 추가
{
  "id": "template-generator",
  "name": "Template Generator",
  "author": "sb-obsidian-plugins",
  "description": "Dynamic template insertion with weather, fortune, and date variables",
  "repo": "sb-obsidian-plugins/obsidian-template-generator"
}

# 3. PR 생성
```

### 3. 리뷰 및 승인 대기
- Obsidian 팀이 코드 리뷰 진행
- 보안 및 성능 체크
- 사용자 경험 검토

## 📝 각 플러그인별 README.md 작성

### Template Generator README 예시:
```markdown
# Template Generator for Obsidian

Dynamic template insertion with weather, fortune, and date variables.

## Features
- 📅 Korean date formatting
- 🌤️ Weather information via OpenWeather API
- 🔮 Daily fortune/horoscope
- 🎨 Handlebars template engine
- 📁 Folder-based template organization

## Installation
1. Download from Obsidian Community Plugins
2. Enable in Settings > Community Plugins
3. Configure API keys in plugin settings

## Usage
- Use `Ctrl/Cmd + P` and search "Insert Template"
- Templates support variables: `{{날짜}}`, `{{날씨}}`, `{{운세}}`
- Store templates in `/templates` folder

## Settings
- OpenWeather API key
- Default location
- Template directory path
- Date format preferences
```

## 🎯 제출 우선순위

1. **Template Generator** - 가장 완성도 높고 사용자 친화적
2. **Metadata Manager** - 범용성이 높은 유틸리티
3. **Git Sync** - 개발자 대상, 니치한 용도
4. **Publisher Scripton** - 특정 서비스 의존적

## ⚠️ 주의사항

- 각 플러그인은 독립적인 리포지토리여야 함
- API 키가 필요한 플러그인은 보안 고려사항 문서화
- 커뮤니티 가이드라인 준수
- 정기적인 업데이트 및 버그 수정 계획

## 📚 참고 자료

- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Community Plugin Review Process](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Plugin API Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)