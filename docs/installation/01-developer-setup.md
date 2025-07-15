# 개발자용 로컬 환경 설치 가이드

> 🛠️ sb-obsidian-plugins 개발 환경 구축 및 Obsidian 플러그인 개발 가이드

## 🚀 개발 환경 요구사항

### 필수 소프트웨어
- **Node.js**: v16 이상 (권장: v18+)
- **pnpm**: v7 이상 (모노레포 워크스페이스 지원)
- **Git**: 최신 버전
- **Obsidian**: 최신 버전 (데스크톱 앱)
- **IDE**: VS Code 또는 WebStorm 권장

### 권장 도구
- **Git GUI**: SourceTree, GitHub Desktop
- **Terminal**: iTerm2 (macOS), Windows Terminal (Windows)
- **Docker**: 테스트 환경 격리용 (선택사항)

## 📦 로컬 환경 설치

### 1. 저장소 클론
```bash
# 1. 저장소 클론
git clone https://github.com/sb-obsidian-plugins/sb-obsidian-plugins.git
cd sb-obsidian-plugins

# 2. 브랜치 확인
git branch -a
git checkout main
```

### 2. 의존성 설치
```bash
# pnpm 설치 (없는 경우)
npm install -g pnpm

# 모노레포 의존성 설치
pnpm install

# 개별 패키지 의존성 확인
pnpm -r list
```

### 3. 개발 환경 구성
```bash
# 1. 환경 변수 설정 (선택사항)
cp .env.example .env
# .env 파일 편집하여 API 키 등 설정

# 2. 모든 패키지 빌드
pnpm run build:all

# 3. 테스트 실행
pnpm run test:all
```

## 🎯 Obsidian 개발 환경 설정

### 1. 개발용 Vault 생성
```bash
# 1. 개발용 vault 디렉토리 생성
mkdir ~/obsidian-dev-vault
cd ~/obsidian-dev-vault

# 2. 기본 설정 폴더 생성
mkdir -p .obsidian/plugins

# 3. 개발용 플러그인 심볼릭 링크 생성
ln -s /path/to/sb-obsidian-plugins/packages/template-generator .obsidian/plugins/
ln -s /path/to/sb-obsidian-plugins/packages/git-sync .obsidian/plugins/
ln -s /path/to/sb-obsidian-plugins/packages/metadata-manager .obsidian/plugins/
ln -s /path/to/sb-obsidian-plugins/packages/publisher-scripton .obsidian/plugins/
```

### 2. Obsidian 설정
```javascript
// .obsidian/config.json
{
  "pluginEnabledStatus": {
    "template-generator": true,
    "git-sync": true,
    "metadata-manager": true,
    "publisher-scripton": true
  },
  "enabledPlugins": [
    "template-generator",
    "git-sync", 
    "metadata-manager",
    "publisher-scripton"
  ]
}
```

### 3. 핫 리로드 설정
```bash
# 각 플러그인 디렉토리에서 개발 모드 실행
cd packages/template-generator
pnpm run dev  # 파일 변경 시 자동 빌드

# 별도 터미널에서
cd packages/git-sync
pnpm run dev

# 모든 패키지 동시 개발 모드
pnpm run dev:all
```

## 🔧 개발 워크플로우

### 1. 기능 개발 프로세스
```bash
# 1. 새 기능 브랜치 생성
git checkout -b feature/new-awesome-feature

# 2. 개발 및 테스트
pnpm run dev  # 개발 모드
pnpm run test # 테스트 실행
pnpm run lint # 코드 린트

# 3. 빌드 및 검증
pnpm run build
pnpm run test:integration

# 4. 커밋 및 푸시
git add .
git commit -m "feat: add awesome new feature"
git push origin feature/new-awesome-feature
```

### 2. 디버깅 설정
```javascript
// VS Code launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Plugin",
      "program": "${workspaceFolder}/packages/template-generator/src/main.ts",
      "outFiles": ["${workspaceFolder}/packages/template-generator/dist/**/*.js"],
      "sourceMaps": true,
      "console": "integratedTerminal"
    }
  ]
}
```

### 3. 테스트 환경
```bash
# 단위 테스트
pnpm run test:unit

# 통합 테스트
pnpm run test:integration

# E2E 테스트 (Obsidian 연동)
pnpm run test:e2e

# 커버리지 리포트
pnpm run test:coverage
```

## 🏗️ 모노레포 구조 이해

### 디렉토리 구조
```
sb-obsidian-plugins/
├── packages/                    # 개별 플러그인
│   ├── template-generator/      # 템플릿 생성기
│   ├── git-sync/               # Git 동기화
│   ├── metadata-manager/       # 메타데이터 관리
│   └── publisher-scripton/     # Scripton 발행
├── shared/                     # 공통 유틸리티
│   ├── src/                    # 공통 소스 코드
│   └── dist/                   # 빌드 결과물
├── docs/                       # 문서화
├── .github/workflows/          # CI/CD 파이프라인
└── tools/                      # 개발 도구
```

### 공통 스크립트
```json
{
  "scripts": {
    "build:all": "pnpm -r run build",
    "test:all": "pnpm -r run test",
    "lint:all": "pnpm -r run lint",
    "dev:all": "pnpm -r run dev",
    "clean:all": "pnpm -r run clean"
  }
}
```

## 🧪 테스트 전략

### 1. 단위 테스트 (Vitest)
```typescript
// packages/template-generator/src/__tests__/main.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TemplateGenerator } from '../main';

describe('TemplateGenerator', () => {
  it('should generate template with weather data', async () => {
    const generator = new TemplateGenerator();
    const result = await generator.processTemplate('{{날씨}}');
    expect(result).toContain('°C');
  });
});
```

### 2. 통합 테스트 (Obsidian Mock)
```typescript
// packages/template-generator/src/__tests__/integration.test.ts
import { App, TFile } from 'obsidian';
import { TemplateGenerator } from '../main';

describe('TemplateGenerator Integration', () => {
  let app: App;
  let plugin: TemplateGenerator;

  beforeEach(() => {
    app = new App(); // Mock App
    plugin = new TemplateGenerator(app, manifest);
  });

  it('should integrate with Obsidian API', async () => {
    await plugin.onload();
    // Integration test code
  });
});
```

### 3. E2E 테스트 (Playwright)
```typescript
// e2e/template-generator.spec.ts
import { test, expect } from '@playwright/test';

test('template generator workflow', async ({ page }) => {
  await page.goto('obsidian://vault/test');
  await page.click('[data-testid="template-generator-button"]');
  await expect(page.locator('.template-modal')).toBeVisible();
});
```

## 🔍 디버깅 및 프로파일링

### 1. Chrome DevTools 연결
```bash
# Obsidian 디버그 모드 실행
/Applications/Obsidian.app/Contents/MacOS/Obsidian --remote-debugging-port=9222

# Chrome에서 chrome://inspect 접속
```

### 2. 로그 레벨 설정
```typescript
// 개발 모드 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG] Template processing:', data);
}

// 프로덕션 로깅
this.app.vault.adapter.write('.obsidian/logs/plugin.log', logData);
```

### 3. 성능 모니터링
```typescript
// 성능 측정
const start = performance.now();
await heavyOperation();
const end = performance.now();
console.log(`Operation took ${end - start} milliseconds`);
```

## 🚀 배포 전 체크리스트

### 코드 품질 확인
- [ ] 모든 테스트 통과
- [ ] ESLint 경고 없음
- [ ] TypeScript 컴파일 오류 없음
- [ ] 코드 커버리지 80% 이상

### 문서화 확인
- [ ] README.md 업데이트
- [ ] CHANGELOG.md 작성
- [ ] API 문서 생성
- [ ] 사용법 가이드 작성

### 성능 및 보안
- [ ] 메모리 누수 검사
- [ ] 보안 취약점 스캔
- [ ] 번들 크기 최적화
- [ ] 의존성 취약점 검사

## 📚 참고 자료

### Obsidian 개발 문서
- [Plugin API Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)

### 개발 도구
- [Obsidian Plugin Template](https://github.com/obsidianmd/obsidian-plugin-template)
- [Obsidian API Types](https://github.com/obsidianmd/obsidian-api)
- [Hot Reload Plugin](https://github.com/pjeby/hot-reload)

### 커뮤니티 리소스
- [Obsidian Plugin Dev Discord](https://discord.gg/obsidianmd)
- [Plugin Development Forum](https://forum.obsidian.md/c/plugin-ideas)
- [Community Plugins](https://github.com/obsidianmd/obsidian-releases)

---

Made with ❤️ by [sb-obsidian-plugins](https://github.com/sb-obsidian-plugins)