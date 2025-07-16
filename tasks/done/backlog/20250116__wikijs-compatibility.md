---
status: converted
new_file: /tasks/todo/20250116__wikijs-compatibility-implementation.md
original_status: refined
priority: high
effort: hard
tags: [integration, wikijs, sync, metadata]
linked_backlogs: []
created: 2025-01-16
converted: 2025-01-16
---

# WikiJS 호환성 기능 구현

## 📋 요약
Obsidian과 WikiJS 간의 원활한 연동을 위한 호환성 기능 구현

## 🎯 목표
- Obsidian 노트를 WikiJS로 자동 동기화
- 메타데이터 양방향 호환
- 디렉토리 구조 매핑

## 📝 상세 요구사항

### 1. 메타데이터 관리
- WikiJS 메타데이터 형식과 Obsidian frontmatter 간 변환
- 태그, 카테고리, 작성자 정보 매핑
- 날짜 형식 통일

### 2. 디렉토리 구조 호환
- WikiJS 디렉토리 구조 자동 감지
- Obsidian 폴더 구조를 WikiJS 페이지 계층으로 변환
- 경로 매핑 규칙 설정

### 3. Sync API 연동
- WikiJS GraphQL API 클라이언트 구현
- 인증 및 권한 관리
- 변경사항 감지 및 자동 동기화
- 충돌 해결 전략

## 🔧 기술 스택
- WikiJS GraphQL API
- Obsidian Plugin API
- TypeScript

## ⚡ 예상 작업량
- API 클라이언트 구현: 2-3일
- 메타데이터 변환기: 1-2일
- 동기화 로직: 3-4일
- 테스트 및 디버깅: 2일

## 🔗 관련 문서
- WikiJS API 문서: https://docs.requarks.io/dev/api
- Obsidian Plugin API: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin