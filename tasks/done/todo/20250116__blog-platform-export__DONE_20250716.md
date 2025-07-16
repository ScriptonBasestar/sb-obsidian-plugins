---
source: backlog
created: 2025-01-16
priority: medium
effort: medium
tags: [integration, blog, hugo, jekyll, wikijs, export]
original_backlog: /tasks/backlog/refined/20250116__blog-platform-compatibility.md
---

# 블로그 플랫폼 내보내기 기능 구현

## 작업 목록

### Phase 1: 기본 변환 엔진 구축 (effort: 2d) ✅
- [x] Markdown 파서 선택 및 기본 변환 파이프라인 구현 (priority: high)
- [x] Obsidian 위키 링크 → 표준 마크다운 링크 변환기 구현 (effort: 3h)
- [x] 이미지 참조 경로 추출 및 변환 로직 구현 (effort: 4h)
- [x] 코드 블록 및 수식 블록 호환성 검사기 구현 (effort: 2h)

### Phase 2: Hugo 지원 구현 (effort: 1.5d) ✅
- [x] Hugo frontmatter 템플릿 시스템 구현 (priority: medium)
- [x] Hugo 콘텐츠 디렉토리 구조 생성기 구현 (effort: 3h)
- [x] 단축코드(shortcode) 변환 규칙 정의 및 구현 (effort: 4h)
- [x] Hugo 특화 이미지 경로 처리 (effort: 2h)

### Phase 3: Jekyll 지원 구현 (effort: 1.5d) ✅
- [x] Jekyll frontmatter 템플릿 시스템 구현 (priority: medium)
- [x] _posts 디렉토리 파일명 규칙 적용 (YYYY-MM-DD-title.md) (effort: 2h)
- [x] Jekyll 카테고리 및 태그 변환 로직 구현 (effort: 3h)
- [x] Jekyll 특화 permalink 및 layout 설정 지원 (effort: 2h)

### Phase 4: WikiJS 연동 기능 구현 (effort: 2d) ✅
- [x] WikiJS GraphQL API 클라이언트 통합 (priority: high)
- [x] Obsidian 폴더 구조 → WikiJS 경로 변환기 구현 (effort: 3h)
- [x] WikiJS 페이지 생성 mutation 빌더 구현 (effort: 4h)
- [x] Obsidian frontmatter → WikiJS 메타데이터 매핑 (tags, description, locale) (effort: 3h)
- [x] WikiJS editor 타입 자동 감지 (markdown/code) (effort: 2h)
- [x] WikiJS 디렉토리 구조 동기화 및 경로 정규화 (effort: 3h)

### Phase 5: 내보내기 UI 및 프로필 관리 (effort: 2d) ✅
- [x] 내보내기 명령 팔레트 커맨드 구현 (priority: high)
- [x] 내보내기 설정 모달 UI 구현 (effort: 4h)
- [x] 프로필 저장/불러오기 시스템 구현 (effort: 3h)
- [x] 일괄 내보내기 진행률 표시 UI (effort: 2h)
- [x] 내보내기 결과 프리뷰 기능 (effort: 3h)

### Phase 6: 에셋 관리 및 최적화 (effort: 1d) ✅
- [x] 이미지 파일 복사 및 정리 시스템 구현 (priority: medium)
- [x] 중복 에셋 감지 및 최적화 (effort: 2h)
- [x] 외부 이미지 링크 처리 옵션 (effort: 2h)
- [x] 내보내기 후 검증 리포트 생성 (effort: 2h)

## 기술 요구사항
- unified/remark 또는 markdown-it 파서
- YAML 처리 라이브러리
- 파일 시스템 작업을 위한 Node.js API
- GraphQL 클라이언트 라이브러리 (apollo-client 또는 graphql-request)

## 참고 자료
- [Hugo Front Matter 가이드](https://gohugo.io/content-management/front-matter/)
- [Jekyll Front Matter 문서](https://jekyllrb.com/docs/front-matter/)
- [Obsidian 링크 형식 문서](https://help.obsidian.md/Linking+notes+and+files/Internal+links)
- [WikiJS GraphQL API 문서](https://docs.requarks.io/dev/api)

## WikiJS GraphQL Mutation 예시
```graphql
mutation {
  pages {
    create(
      content: "페이지 내용"
      description: "페이지 설명"
      editor: "markdown"
      isPublished: true
      isPrivate: false
      locale: "ko"
      path: "/docs/example"
      tags: ["obsidian", "wikijs"]
      title: "페이지 제목"
    ) {
      responseResult {
        succeeded
        errorCode
        message
      }
      page {
        id
        path
        title
      }
    }
  }
}
```