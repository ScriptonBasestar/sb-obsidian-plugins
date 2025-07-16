---
status: converted
new_file: /tasks/todo/20250116__settings-sharing-tool.md
original_status: refined
priority: high
effort: medium
tags: [settings, git, collaboration, init]
linked_backlogs: []
created: 2025-01-16
converted: 2025-01-16
---

# 설정 공유 도구

## 📋 요약
Obsidian 설정을 Git을 통해 팀원들과 공유하고, 새로운 환경에서 쉽게 초기화할 수 있는 도구

## 🎯 목표
- Obsidian 설정 파일의 버전 관리
- 팀 간 설정 동기화
- 새로운 Vault 초기화 자동화

## 📝 상세 요구사항

### 1. Obsidian Init 기능
- 프로젝트별 설정 템플릿 관리
- 플러그인 목록 및 설정 자동 설치
- 테마 및 CSS 스니펫 배포
- 핫키 설정 공유

### 2. Git 설정 관리
- `.obsidian` 디렉토리 선택적 동기화
- 민감한 정보 제외 (API 키 등)
- 설정 변경 이력 추적
- 충돌 해결 가이드

### 3. 설정 프로필 기능
- 개인/팀/프로젝트별 프로필 관리
- 프로필 간 전환
- 설정 상속 및 오버라이드
- 프로필 내보내기/가져오기

## 🔧 기술 스택
- Git 연동
- JSON/YAML 파싱
- Obsidian 설정 API
- 파일 시스템 작업

## ⚡ 예상 작업량
- 설정 파일 파싱 및 관리: 2일
- Git 연동 로직: 2일
- 프로필 시스템: 2일
- UI 및 명령어: 1일

## 📌 추가 고려사항
- 플러그인 호환성 체크
- 설정 마이그레이션 도구
- 백업 및 복원 기능

## 🔗 관련 문서
- Obsidian 설정 구조: https://docs.obsidian.md/Advanced+topics/Obsidian+URI
- Git 무시 패턴 가이드