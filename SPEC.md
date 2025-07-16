# Obsidian Plugins Specification

> 이 문서는 sb-obsidian-plugins monorepo에 포함된 각 플러그인의 핵심 기능과 사양을 정리합니다.

## 플러그인 개요

총 **7개의 Obsidian 플러그인**이 포함되어 있으며, 각각 특정 기능을 담당합니다:

| 플러그인 | 핵심 기능 | 카테고리 |
|---------|-----------|----------|
| [Settings Sync](#settings-sync) | 설정 동기화 및 프로필 관리 | 🔧 Configuration |
| [Git Sync](#git-sync) | AI 기반 자동 Git 동기화 | 🔄 Version Control |
| [WikiJS Sync](#wikijs-sync) | WikiJS 양방향 동기화 | 🌐 External Integration |
| [Blog Platform Export](#blog-platform-export) | 블로그 플랫폼 내보내기 | 📝 Publishing |
| [Publisher Scripton](#publisher-scripton) | Scripton 클라우드 퍼블리싱 | ☁️ Cloud Publishing |
| [Template Generator](#template-generator) | 동적 템플릿 생성 | 📋 Content Creation |
| [Metadata Manager](#metadata-manager) | 메타데이터 자동 관리 | 📊 Data Management |

---

## Settings Sync

### 기본 정보
- **ID**: `settings-sync`
- **목적**: Git을 통한 Obsidian 설정 공유 및 동기화
- **데스크톱 전용**: false

### 핵심 기능
- **🔄 설정 동기화**: Git 저장소를 통한 팀/개인 설정 공유
- **👤 프로필 관리**: 여러 설정 프로필 생성 및 전환
- **📦 백업 기능**: 설정 백업 및 복원
- **🚀 초기화 마법사**: 새 볼트 설정 간편화
- **📜 히스토리 추적**: 설정 변경 이력 관리

### 주요 컴포넌트
- `ProfileManager`: 설정 프로필 관리
- `GitManager`: Git 연동 (isomorphic-git)
- `SyncManager`: 동기화 엔진
- `BackupManager`: 백업 관리
- `SettingsParser`: 설정 파일 파싱

---

## Git Sync

### 기본 정보
- **ID**: `git-sync`
- **목적**: Git 관리 기능
- **데스크톱 전용**: true

### 핵심 기능
- **🤖 AI 커밋 메시지**: LLM을 활용한 자동 커밋 메시지 생성
- **⚡ 자동 동기화**: 파일 변경 시 자동 커밋 및 푸시
- **🌿 브랜치 관리**: 메인 브랜치와 임시 브랜치 간 자동 머지
- **🔧 충돌 해결**: 수동 머지 충돌 시 외부 에디터 실행, AI로 자동 머지 기능 지원
- **⏰ 스케줄링**: 시작 시 자동 풀, 주기적 동기화

### 주요 컴포넌트
- `GitService`: Git 명령어 실행
- `AutoCommitService`: 자동 커밋 서비스
- `LLMService`: AI 커밋 메시지 생성
- `PromptTemplateService`: 프롬프트 템플릿 관리

---

## WikiJS Sync

### 기본 정보
- **ID**: `wikijs-sync`
- **목적**: WikiJS와 Obsidian 간 양방향 동기화
- **데스크톱 전용**: false

### 핵심 기능
- **🔄 양방향 동기화**: Obsidian ↔ WikiJS 간 실시간 동기화
- **👀 실시간 감시**: 파일 변경 시 자동 동기화
- **⚡ 충돌 해결**: 동기화 충돌 감지 및 처리
- **🎯 선택적 동기화**: 특정 파일/폴더 제외 가능
- **📦 배치 작업**: 전체 동기화 또는 단일 파일 동기화

### 주요 컴포넌트
- `WikiJSClient`: WikiJS GraphQL API 클라이언트
- `SyncEngine`: 동기화 엔진
- `MetadataConverter`: 메타데이터 변환
- `PathMapper`: 경로 매핑 유틸리티

---

## Blog Platform Export

### 기본 정보
- **ID**: `blog-platform-export`
- **목적**: 블로그 플랫폼으로 노트 내보내기
- **데스크톱 전용**: false

### 핵심 기능
- **🌐 다중 플랫폼 지원**: Hugo, Jekyll, WikiJS 등 지원
- **👤 프로필 관리**: 여러 내보내기 설정을 프로필로 관리
- **🔄 변환 엔진**: 마크다운 형식을 플랫폼별로 자동 변환
- **📎 자산 관리**: 이미지 및 첨부파일 처리
- **🎨 UI 통합**: 리본 아이콘, 명령어, 컨텍스트 메뉴 지원

### 주요 컴포넌트
- `ConversionEngine`: 마크다운 변환 (unified/remark)
- `ProfileManager`: 내보내기 프로필 관리
- `AssetManager`: 이미지 및 에셋 관리
- `HugoExporter`, `JekyllExporter`, `WikiJSExporter`: 플랫폼별 내보내기

---

## Publisher Scripton

### 기본 정보
- **ID**: `publisher-scripton`
- **목적**: Scripton 클라우드로 노트 퍼블리싱
- **데스크톱 전용**: false

### 핵심 기능
- **☁️ 클라우드 퍼블리싱**: scripton.cloud로 노트 발행
- **🔄 콘텐츠 처리**: 위키링크 변환, frontmatter 제거
- **📎 첨부파일 업로드**: 이미지 및 파일 자동 업로드
- **📦 배치 퍼블리싱**: 폴더 단위 일괄 발행
- **🔄 재시도 로직**: 실패 시 자동 재시도

### 주요 컴포넌트
- `ScriptonApiService`: API 통신 서비스
- 다양한 모달 클래스 (파일 선택, 옵션 설정, 로그 뷰어)

---

## Template Generator

### 기본 정보
- **ID**: `template-generator`
- **목적**: 동적 템플릿 생성 및 삽입
- **데스크톱 전용**: false

### 핵심 기능
- **🌦️ 동적 템플릿**: 날씨, 운세, 날짜 등 실시간 데이터 삽입
- **⚡ 템플릿 캐싱**: 성능 향상을 위한 템플릿 캐시
- **🎯 변수 시스템**: 사용자 정의 변수 지원
- **🌤️ 날씨 API**: OpenWeatherMap API 연동
- **🌍 다국어 지원**: 한국어/영어 운세 및 날씨 정보

### 주요 컴포넌트
- `TemplateEngine`: 템플릿 렌더링 엔진
- `TemplateCache`: 템플릿 캐시 관리
- `TemplateParser`: 템플릿 파싱
- `WeatherService`, `FortuneService`: 외부 서비스 연동

---

## Metadata Manager

### 기본 정보
- **ID**: `metadata-manager`
- **목적**: Frontmatter 메타데이터 자동 관리
- **데스크톱 전용**: false

### 핵심 기능
- **📝 자동 메타데이터 삽입**: 새 파일 생성 시 frontmatter 자동 추가
- **📋 템플릿 관리**: 폴더별 다른 메타데이터 템플릿 지원
- **✅ 메타데이터 검증**: 필수 필드 확인 및 형식 검증
- **🔄 자동 업데이트**: 수정 시간 자동 갱신
- **🎨 포맷팅**: 메타데이터 필드 순서 정렬

### 주요 기능
- 자동 created/modified 타임스탬프
- 필수/선택 필드 검증
- YAML 파싱 및 포맷팅
- 템플릿 변수 지원 ({{title}}, {{date}} 등)

---

## 공통 아키텍처 패턴

### 🏗️ 모듈화된 구조
- 각 기능별로 별도 클래스 분리
- 관심사 분리 원칙 적용
- 재사용 가능한 유틸리티 함수

### ⚙️ 설정 관리
- 상세한 설정 옵션과 UI 제공
- 사용자 친화적 설정 인터페이스
- 설정 검증 및 기본값 지원

### 🚨 오류 처리
- 적절한 에러 핸들링과 사용자 피드백
- 사용자 친화적 에러 메시지
- 복구 가능한 오류 상황 처리

### 🎨 UI 통합
- 리본 아이콘, 명령어, 상태바 아이템 등 Obsidian UI와 완전 통합
- 일관된 사용자 경험 제공
- 접근성 고려

### ⚡ 비동기 처리
- 모든 외부 API 호출과 파일 작업을 비동기로 처리
- 성능 최적화 및 사용자 경험 향상
- 적절한 로딩 상태 표시

---

## 기술 스택

### 🛠️ 핵심 기술
- **TypeScript**: 모든 플러그인의 주 언어
- **Obsidian API**: 플러그인 인터페이스
- **Node.js**: 서버 사이드 기능 (데스크톱 전용)

### 📚 주요 라이브러리
- **isomorphic-git**: Git 작업 (Settings Sync, Git Sync)
- **unified/remark**: 마크다운 파싱 및 변환 (Blog Platform Export)
- **graphql-request**: GraphQL 통신 (WikiJS Sync)
- **yaml**: YAML 파싱 (Metadata Manager)

### 🧪 테스트 및 빌드
- **Vitest**: 단위 테스트 프레임워크
- **ESBuild**: 번들링 및 빌드
- **TypeScript**: 타입 검사 및 컴파일
- **ESLint + Prettier**: 코드 품질 관리

---

## 워크플로우 통합

이 플러그인들은 완전한 지식 관리 및 퍼블리싱 워크플로를 구성합니다:

1. **📝 Content Creation**: Template Generator → Metadata Manager
2. **🔧 Configuration**: Settings Sync (프로필 관리)
3. **🔄 Version Control**: Git Sync (자동 커밋)
4. **🌐 External Sync**: WikiJS Sync (외부 위키 연동)
5. **📤 Publishing**: Blog Platform Export, Publisher Scripton (다중 플랫폼 퍼블리싱)

이러한 통합된 워크플로우를 통해 Obsidian을 중심으로 한 완전한 지식 관리 생태계를 구축할 수 있습니다.