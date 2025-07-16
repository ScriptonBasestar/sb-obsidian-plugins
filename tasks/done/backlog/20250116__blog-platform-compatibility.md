---
status: converted
new_file: /tasks/todo/20250116__blog-platform-export.md
original_status: refined
priority: medium
effort: medium
tags: [integration, blog, hugo, jekyll, export]
linked_backlogs: []
created: 2025-01-16
converted: 2025-01-16
---

# 블로그 플랫폼 호환성 기능

## 📋 요약
Obsidian 노트를 Hugo, Jekyll 등의 정적 사이트 생성기와 호환되는 형식으로 변환하는 기능

## 🎯 목표
- Obsidian 노트를 블로그 포스트로 자동 변환
- Hugo/Jekyll frontmatter 형식 지원
- 이미지 및 링크 경로 변환

## 📝 상세 요구사항

### 1. Hugo 호환 기능
- Hugo frontmatter 형식 생성
- 콘텐츠 디렉토리 구조 매핑
- 단축코드(shortcode) 지원
- 이미지 경로 변환

### 2. Jekyll 호환 기능
- Jekyll frontmatter 형식 생성
- _posts 디렉토리 구조 준수
- 날짜 기반 파일명 변환
- 카테고리 및 태그 매핑

### 3. 공통 기능
- Obsidian 위키 링크를 마크다운 링크로 변환
- 이미지 에셋 복사 및 경로 조정
- 코드 블록 및 수식 호환성 처리
- 내보내기 프로필 관리

## 🔧 기술 스택
- Markdown 파서/변환기
- YAML frontmatter 처리
- 파일 시스템 작업

## ⚡ 예상 작업량
- Frontmatter 변환기: 1일
- 링크/이미지 변환: 2일
- 내보내기 UI: 1일
- 프로필 관리: 1일

## 🔗 관련 문서
- Hugo 문서: https://gohugo.io/content-management/front-matter/
- Jekyll 문서: https://jekyllrb.com/docs/front-matter/