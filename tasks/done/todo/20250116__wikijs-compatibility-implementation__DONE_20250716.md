---
source: backlog
created: 2025-01-16
priority: high
effort: hard
tags: [integration, wikijs, sync, metadata]
original_backlog: /tasks/backlog/refined/20250116__wikijs-compatibility.md
---

# WikiJS 호환성 기능 구현

## 작업 목록

### Phase 1: API 클라이언트 및 기반 구조 (effort: 3d)
- [ ] WikiJS GraphQL API 클라이언트 기본 구조 설계 및 구현 (priority: high)
- [ ] 인증 및 권한 관리 시스템 구현 (effort: 4h)
- [ ] API 통신 오류 처리 및 재시도 로직 구현 (effort: 2h)
- [ ] 플러그인 설정 UI에 WikiJS 연결 설정 추가 (effort: 3h)

### Phase 2: 메타데이터 변환 시스템 (effort: 2d)
- [ ] Obsidian frontmatter ↔ WikiJS 메타데이터 변환기 구현 (priority: high)
- [ ] 태그 및 카테고리 매핑 규칙 정의 및 구현 (effort: 3h)
- [ ] 날짜 형식 변환 및 타임존 처리 (effort: 2h)
- [ ] 사용자 정의 메타데이터 필드 매핑 지원 (effort: 4h)

### Phase 3: 디렉토리 구조 매핑 (effort: 2d)
- [ ] WikiJS 페이지 계층 구조 분석 및 캐싱 (priority: medium)
- [ ] Obsidian 폴더 → WikiJS 경로 변환 규칙 엔진 구현 (effort: 4h)
- [ ] 경로 매핑 설정 UI 구현 (effort: 3h)
- [ ] 특수 문자 및 공백 처리 로직 (effort: 2h)

### Phase 4: 동기화 엔진 (effort: 4d)
- [ ] 파일 변경 감지 시스템 구현 (priority: high)
- [ ] 양방향 동기화 로직 구현 (effort: 8h)
- [ ] 충돌 감지 및 해결 전략 구현 (effort: 6h)
- [ ] 배치 동기화 및 증분 동기화 지원 (effort: 4h)
- [ ] 동기화 상태 표시 UI 구현 (effort: 3h)

### Phase 5: 테스트 및 최적화 (effort: 2d)
- [ ] 단위 테스트 작성 (priority: medium)
- [ ] 통합 테스트 시나리오 작성 및 실행 (effort: 4h)
- [ ] 성능 최적화 및 메모리 사용 개선 (effort: 3h)
- [ ] 사용자 문서 작성 (effort: 2h)

## 기술 요구사항
- TypeScript 개발 환경 설정
- WikiJS 테스트 인스턴스 필요
- GraphQL 스키마 분석 도구

## 참고 자료
- [WikiJS GraphQL API 문서](https://docs.requarks.io/dev/api)
- [Obsidian Plugin API 가이드](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)