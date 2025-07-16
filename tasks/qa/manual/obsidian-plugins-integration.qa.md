> ⚠️ 이 QA는 자동으로 검증할 수 없습니다.  
> 아래 절차에 따라 수동으로 확인해야 합니다.

### ✅ 수동 테스트 지침

- [ ] 테스트 환경 준비: Obsidian 설치, WikiJS 인스턴스 설정, 테스트 Vault 생성
- [ ] 플러그인 로딩 확인: 3개 플러그인(Settings Sync, WikiJS Sync, Blog Platform Export) 활성화
- [ ] 사용자 인터페이스 상태 확인: 각 플러그인 설정 패널 접근 및 기본 설정 구성
- [ ] 통합 워크플로우 테스트: 플러그인 간 상호작용 및 데이터 무결성 검증
- [ ] 성능 및 안정성 측정: 대용량 데이터 처리 시 메모리 사용량 및 처리 시간 확인

# title: Obsidian 플러그인 통합 기능 QA 시나리오

## related_tasks

- /tasks/done/todo/20250116**settings-sharing-tool**DONE_20250116.md
- /tasks/done/todo/20250116**wikijs-compatibility-implementation**DONE_20250716.md
- /tasks/done/todo/20250116**blog-platform-export**DONE_20250716.md

## purpose

개발된 3개의 Obsidian 플러그인(Settings Sync, WikiJS Sync, Blog Platform Export)이 독립적으로 및 통합 환경에서 정상 작동하는지 검증

## scenario

### 1. Settings Sync Plugin 기능 검증

**설정 파일 분석 및 Git 연동**

1. Obsidian을 설치하고 기본 설정을 구성
2. Settings Sync 플러그인 활성화
3. Git 저장소 연결 및 초기화 수행
4. 설정 변경(테마, 플러그인 활성화/비활성화) 후 자동 커밋 확인
5. 다른 환경에서 설정 동기화 테스트

**프로필 시스템 검증**

1. 새 프로필 생성 (예: "Work Profile", "Personal Profile")
2. 각 프로필에 다른 설정 적용
3. 프로필 전환 시 설정 즉시 적용 확인
4. 프로필 내보내기/가져오기 기능 테스트

### 2. WikiJS Sync Plugin 기능 검증

**양방향 동기화 테스트**

1. WikiJS 인스턴스 설정 및 API 키 구성
2. Obsidian에서 새 노트 생성 → WikiJS로 동기화 확인
3. WikiJS에서 페이지 수정 → Obsidian 노트 업데이트 확인
4. 양쪽에서 동시 수정 시 충돌 해결 메커니즘 테스트

**메타데이터 변환 검증**

1. Obsidian 노트에 frontmatter(tags, description) 추가
2. WikiJS 동기화 후 메타데이터 올바른 변환 확인
3. WikiJS 페이지 속성 변경 후 Obsidian frontmatter 업데이트 확인

### 3. Blog Platform Export Plugin 기능 검증

**Hugo 내보내기 테스트**

1. Obsidian 노트에 wikilink, 이미지, 코드 블록 포함
2. Hugo 프로필로 내보내기 실행
3. 생성된 Hugo 콘텐츠 디렉토리 구조 확인
4. frontmatter YAML 형식 및 shortcode 변환 검증
5. Hugo 빌드 및 렌더링 정상 작동 확인

**Jekyll 내보내기 테스트**

1. 날짜가 포함된 블로그 포스트 노트 생성
2. Jekyll 프로필로 내보내기 실행
3. \_posts 디렉토리에 YYYY-MM-DD-title.md 형식으로 생성 확인
4. Jekyll 서버에서 포스트 렌더링 확인

**WikiJS 내보내기 테스트**

1. 폴더 구조를 가진 노트 컬렉션 생성
2. WikiJS 내보내기 실행
3. WikiJS에서 계층 구조 및 경로 매핑 확인

### 4. 플러그인 간 상호작용 검증

**통합 워크플로우 테스트**

1. Settings Sync로 플러그인 설정 동기화
2. WikiJS Sync로 노트 동기화
3. Blog Platform Export로 동일 노트를 Hugo로 내보내기
4. 각 단계에서 데이터 무결성 유지 확인

**성능 및 안정성 테스트**

1. 대용량 노트 컬렉션(100+ 파일)으로 각 플러그인 테스트
2. 동시 실행 시 충돌 없음 확인
3. 메모리 사용량 및 처리 시간 측정

## expected_result

### Settings Sync Plugin

- ✅ Git 저장소 초기화 및 설정 파일 추적 정상 작동
- ✅ 프로필 전환 시 설정 즉시 반영 (핫 리로드)
- ✅ 민감한 정보(API 키 등) 자동 필터링
- ✅ 설정 충돌 시 병합 도우미 작동

### WikiJS Sync Plugin

- ✅ GraphQL API 연결 및 인증 성공
- ✅ Obsidian ↔ WikiJS 양방향 동기화 정상
- ✅ 메타데이터 변환 정확성 (tags, description, locale)
- ✅ 충돌 감지 및 해결 전략 작동

### Blog Platform Export Plugin

- ✅ Hugo: content/ 디렉토리 구조 및 frontmatter 생성
- ✅ Jekyll: \_posts/ 파일명 규칙 및 permalink 생성
- ✅ WikiJS: 경로 매핑 및 GraphQL mutation 성공
- ✅ 이미지 및 에셋 파일 올바른 복사 및 참조 업데이트

### 통합 환경

- ✅ 플러그인 간 설정 충돌 없음
- ✅ 동일 노트에 대한 다중 플랫폼 처리 정상
- ✅ 대용량 데이터 처리 시 안정성 유지

## test_data

```
테스트용 노트 구조:
/vault/
├── Settings/
│   ├── profiles.json
│   └── sync-config.md
├── Blog Posts/
│   ├── 2024-01-16-first-post.md (frontmatter + images)
│   └── 2024-01-17-second-post.md (wikilinks + code blocks)
├── Documentation/
│   ├── API Guide.md
│   └── User Manual.md
└── Assets/
    ├── screenshot.png
    └── diagram.svg
```

## tags

[qa], [integration], [e2e], [manual], [obsidian], [plugins]
