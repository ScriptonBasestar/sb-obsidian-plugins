# 공식 마켓플레이스 등록 DevOps 가이드

> 🚀 sb-obsidian-plugins를 Obsidian 공식 커뮤니티 플러그인 마켓에 등록하는 DevOps 프로세스

## 🎯 등록 프로세스 개요

Obsidian 공식 커뮤니티 플러그인 마켓 등록은 다음과 같은 단계로 진행됩니다:

1. **개별 저장소 생성**: 모노레포에서 각 플러그인을 독립 저장소로 분리
2. **릴리스 자동화**: GitHub Actions을 통한 자동 빌드 및 릴리스
3. **품질 보증**: 자동화된 테스트, 린트, 보안 검사
4. **마켓플레이스 제출**: Obsidian 공식 저장소에 PR 생성
5. **리뷰 및 승인**: Obsidian 팀의 코드 리뷰 및 승인
6. **배포 및 관리**: 지속적인 업데이트 및 유지보수

## 📦 준비된 플러그인 목록

### 1. Template Generator

- **ID**: `template-generator`
- **이름**: Template Generator
- **설명**: Dynamic template insertion with weather, fortune, and date variables
- **주요 기능**: Handlebars 템플릿 엔진, OpenWeather API, 한국어 날짜 지원
- **제출 우선순위**: 1순위 (가장 완성도 높음)

### 2. Metadata Manager

- **ID**: `metadata-manager`
- **이름**: Metadata Manager
- **설명**: Automatically manage and lint frontmatter metadata in Obsidian documents
- **주요 기능**: 자동 frontmatter 삽입, 규칙 기반 검증, 자동 포맷팅
- **제출 우선순위**: 2순위 (범용성 높음)

### 3. Git Sync

- **ID**: `git-sync`
- **이름**: Git Sync
- **설명**: Automatic git synchronization with AI-powered commit messages
- **주요 기능**: 자동 커밋/푸시, 브랜치 병합, Claude/GPT 연동
- **제출 우선순위**: 3순위 (개발자 대상)

### 4. Publisher Scripton

- **ID**: `publisher-scripton`
- **이름**: Publisher Scripton
- **설명**: Publish your Obsidian notes to scripton.cloud
- **주요 기능**: 클라우드 발행, 첨부파일 업로드, 자동 재시도
- **제출 우선순위**: 4순위 (특정 서비스 의존적)

## 🏗️ 1단계: 개별 저장소 생성

### 자동화 스크립트 준비

```bash
#!/bin/bash
# scripts/create-standalone-repos.sh

PLUGINS=("template-generator" "metadata-manager" "git-sync" "publisher-scripton")
ORG="sb-obsidian-plugins"

for plugin in "${PLUGINS[@]}"; do
    echo "Creating standalone repository for $plugin..."

    # 1. 새 디렉토리 생성
    mkdir -p "dist/$plugin"
    cd "dist/$plugin"

    # 2. Git 저장소 초기화
    git init

    # 3. 플러그인 파일 복사
    cp -r "../../packages/$plugin/"* .

    # 4. 공통 파일 복사
    cp ../../LICENSE .
    cp ../../.gitignore .

    # 5. 독립형 package.json 생성
    node ../../scripts/generate-standalone-package.js $plugin

    # 6. GitHub Actions 워크플로우 복사
    mkdir -p .github/workflows
    cp ../../.github/workflows/plugin-release.yml .github/workflows/release.yml

    # 7. 커밋 및 푸시
    git add .
    git commit -m "Initial commit for $plugin standalone repository"

    # 8. 원격 저장소 설정 (수동으로 GitHub에서 저장소 생성 필요)
    git remote add origin "https://github.com/$ORG/obsidian-$plugin.git"

    cd ../..
done
```

### 독립형 package.json 생성기

```javascript
// scripts/generate-standalone-package.js
const fs = require('fs');
const path = require('path');

const plugin = process.argv[2];
const packagePath = path.join(__dirname, '..', 'packages', plugin, 'package.json');
const originalPackage = require(packagePath);

const standalonePackage = {
  name: `obsidian-${plugin}`,
  version: originalPackage.version,
  description: originalPackage.description,
  main: 'main.js',
  scripts: {
    build: 'tsc -noEmit -skipLibCheck && node esbuild.config.mjs production',
    dev: 'node esbuild.config.mjs',
    test: 'vitest',
    lint: 'eslint src --ext .ts',
    release: 'npm run build && npm version patch && git push --tags',
  },
  keywords: originalPackage.keywords,
  author: originalPackage.author,
  license: originalPackage.license,
  devDependencies: originalPackage.devDependencies,
  dependencies: originalPackage.dependencies,
};

fs.writeFileSync('./package.json', JSON.stringify(standalonePackage, null, 2));
console.log(`Generated standalone package.json for ${plugin}`);
```

## 🔄 2단계: 릴리스 자동화

### GitHub Actions 워크플로우

```yaml
# .github/workflows/release.yml
name: Release Plugin

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run lint
        run: npm run lint

      - name: Build plugin
        run: npm run build

      - name: Create release files
        run: |
          mkdir release
          cp main.js manifest.json release/
          cp styles.css release/ || true
          cp README.md release/

      - name: Create release zip
        run: |
          cd release
          zip -r ../plugin-release.zip .

      - name: Get version
        id: version
        run: echo "version=$(node -p "require('./manifest.json').version")" >> $GITHUB_OUTPUT

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            plugin-release.zip
            release/main.js
            release/manifest.json
            release/styles.css
          tag_name: ${{ github.ref }}
          name: Release ${{ steps.version.outputs.version }}
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 자동 버전 업데이트

```javascript
// scripts/update-version.js
const fs = require('fs');
const path = require('path');

const manifestPath = './manifest.json';
const packagePath = './package.json';

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// 버전 동기화
manifest.version = package.version;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Updated manifest.json to version ${package.version}`);
```

## 🔍 3단계: 품질 보증 자동화

### 코드 품질 검사 워크플로우

```yaml
# .github/workflows/quality-check.yml
name: Quality Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript Check
        run: npx tsc --noEmit

      - name: ESLint Check
        run: npm run lint

      - name: Unit Tests
        run: npm test -- --coverage

      - name: Build Test
        run: npm run build

      - name: Security Audit
        run: npm audit --audit-level=high

      - name: Bundle Size Check
        run: |
          npm run build
          ls -lh main.js
          SIZE=$(stat -c%s main.js)
          if [ $SIZE -gt 1048576 ]; then
            echo "Bundle size too large: $SIZE bytes"
            exit 1
          fi

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### 플러그인 호환성 테스트

```yaml
# .github/workflows/compatibility-test.yml
name: Obsidian Compatibility Test

on:
  pull_request:
    branches: [main]

jobs:
  compatibility-test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        obsidian-version: ['0.15.0', '1.0.0', 'latest']

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Obsidian ${{ matrix.obsidian-version }}
        run: |
          if [ "${{ matrix.obsidian-version }}" = "latest" ]; then
            npm install obsidian@latest
          else
            npm install obsidian@${{ matrix.obsidian-version }}
          fi

      - name: Build plugin
        run: npm run build

      - name: Test compatibility
        run: npm run test:compatibility
```

## 📝 4단계: 마켓플레이스 제출

### 자동 제출 스크립트

```bash
#!/bin/bash
# scripts/submit-to-marketplace.sh

PLUGIN_NAME=$1
PLUGIN_ID=$2
PLUGIN_REPO=$3

# 1. obsidian-releases 리포지토리 클론
git clone https://github.com/obsidianmd/obsidian-releases.git
cd obsidian-releases

# 2. 브랜치 생성
git checkout -b "add-$PLUGIN_ID"

# 3. community-plugins.json 수정
node ../scripts/add-plugin-to-community.js "$PLUGIN_ID" "$PLUGIN_NAME" "$PLUGIN_REPO"

# 4. 커밋 및 푸시
git add community-plugins.json
git commit -m "Add $PLUGIN_NAME plugin"
git push origin "add-$PLUGIN_ID"

# 5. PR 생성 (GitHub CLI 사용)
gh pr create \
  --title "Add $PLUGIN_NAME plugin" \
  --body "$(cat ../scripts/pr-template.md)" \
  --head "add-$PLUGIN_ID" \
  --base main
```

### 커뮤니티 플러그인 목록 업데이트

```javascript
// scripts/add-plugin-to-community.js
const fs = require('fs');

const pluginId = process.argv[2];
const pluginName = process.argv[3];
const pluginRepo = process.argv[4];

const communityPluginsPath = './community-plugins.json';
const communityPlugins = JSON.parse(fs.readFileSync(communityPluginsPath, 'utf8'));

// 플러그인 정보 추가
communityPlugins[pluginId] = {
  id: pluginId,
  name: pluginName,
  author: 'sb-obsidian-plugins',
  description: `${pluginName} plugin for Obsidian`,
  repo: pluginRepo,
};

// 알파벳 순으로 정렬
const sorted = Object.keys(communityPlugins)
  .sort()
  .reduce((acc, key) => {
    acc[key] = communityPlugins[key];
    return acc;
  }, {});

fs.writeFileSync(communityPluginsPath, JSON.stringify(sorted, null, 2));
console.log(`Added ${pluginName} to community plugins`);
```

### PR 템플릿

```markdown
<!-- scripts/pr-template.md -->

## Plugin Information

- **Plugin Name**: {{PLUGIN_NAME}}
- **Plugin ID**: {{PLUGIN_ID}}
- **Repository**: {{PLUGIN_REPO}}
- **Author**: sb-obsidian-plugins
- **License**: MIT

## Checklist

- [x] Plugin follows Obsidian plugin guidelines
- [x] All required files are present (main.js, manifest.json)
- [x] Plugin has been tested with latest Obsidian version
- [x] README.md includes installation and usage instructions
- [x] Plugin handles errors gracefully
- [x] No security vulnerabilities detected
- [x] Plugin respects user privacy
- [x] Plugin is properly documented

## Plugin Description

{{PLUGIN_DESCRIPTION}}

## Testing

The plugin has been thoroughly tested with:

- Obsidian v1.0.0+
- Various vault sizes
- Multiple operating systems (Windows, macOS, Linux)
- Common plugin combinations

## Maintenance

The plugin will be actively maintained with:

- Regular updates for Obsidian API changes
- Bug fixes and feature improvements
- Community support through GitHub issues
- Documentation updates
```

## 🚀 5단계: 배포 및 관리

### 지속적 배포 파이프라인

```yaml
# .github/workflows/cd.yml
name: Continuous Deployment

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build plugin
        run: npm run build

      - name: Deploy to GitHub Pages (docs)
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs

      - name: Update plugin statistics
        run: |
          node scripts/update-stats.js
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add stats.json
          git commit -m "Update plugin statistics" || exit 0
          git push
```

### 사용자 피드백 자동화

```yaml
# .github/workflows/feedback.yml
name: User Feedback Processing

on:
  issues:
    types: [opened, labeled]
  discussion:
    types: [created]

jobs:
  process-feedback:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Label Bug Reports
        if: contains(github.event.issue.title, 'bug') || contains(github.event.issue.title, 'error')
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.addLabels({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: ['bug', 'needs-investigation']
            })

      - name: Welcome New Users
        if: github.event_name == 'issues' && github.event.action == 'opened'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'Thank you for reporting this issue! We will investigate and get back to you soon.'
            })
```

## 📊 6단계: 모니터링 및 분석

### 다운로드 통계 수집

```javascript
// scripts/collect-stats.js
const { Octokit } = require('@octokit/rest');

async function collectDownloadStats() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const plugins = [
    'obsidian-template-generator',
    'obsidian-metadata-manager',
    'obsidian-git-sync',
    'obsidian-publisher-scripton',
  ];

  const stats = {};

  for (const plugin of plugins) {
    const releases = await octokit.rest.repos.listReleases({
      owner: 'sb-obsidian-plugins',
      repo: plugin,
    });

    let totalDownloads = 0;
    for (const release of releases.data) {
      for (const asset of release.assets) {
        totalDownloads += asset.download_count;
      }
    }

    stats[plugin] = {
      totalDownloads,
      latestVersion: releases.data[0]?.tag_name,
      releaseCount: releases.data.length,
    };
  }

  return stats;
}

module.exports = collectDownloadStats;
```

### 성능 모니터링

```javascript
// scripts/performance-monitor.js
const fs = require('fs');
const path = require('path');

function analyzeBundle() {
  const bundlePath = './main.js';
  const bundleSize = fs.statSync(bundlePath).size;

  const sizeInKB = Math.round(bundleSize / 1024);
  const sizeInMB = Math.round((bundleSize / (1024 * 1024)) * 100) / 100;

  console.log(`Bundle size: ${sizeInKB} KB (${sizeInMB} MB)`);

  if (bundleSize > 1024 * 1024) {
    // 1MB
    console.warn('⚠️  Bundle size exceeds 1MB recommendation');
  }

  return {
    size: bundleSize,
    sizeKB: sizeInKB,
    sizeMB: sizeInMB,
  };
}

module.exports = analyzeBundle;
```

## 🎯 제출 우선순위 및 타임라인

### 1차 제출 (Priority 1)

- **Template Generator**: 2024년 1월
- **Metadata Manager**: 2024년 2월

### 2차 제출 (Priority 2)

- **Git Sync**: 2024년 3월
- **Publisher Scripton**: 2024년 4월

### 각 단계별 예상 소요 시간

- **저장소 분리**: 1주
- **CI/CD 설정**: 1주
- **품질 보증**: 2주
- **문서화**: 1주
- **제출 및 리뷰**: 2-4주 (Obsidian 팀 리뷰 시간)

## 📋 제출 요구사항 체크리스트

### ✅ 필수 파일들

- [x] `main.js` - 컴파일된 플러그인 코드
- [x] `manifest.json` - 플러그인 메타데이터
- [x] `README.md` - 상세한 사용법 가이드
- [x] `LICENSE` - MIT 라이센스

### ✅ 코드 품질

- [x] TypeScript로 작성
- [x] 포괄적인 테스트 커버리지 (80% 이상)
- [x] ESLint 및 타입 체크 통과
- [x] 에러 처리 및 사용자 피드백
- [x] 보안 취약점 검사 통과

### ✅ 사용자 경험

- [x] 직관적인 설정 UI
- [x] 명령어 팔레트 통합
- [x] 상태바 표시 (해당 플러그인)
- [x] 알림 및 오류 메시지
- [x] 다국어 지원 (한국어, 영어)

### ✅ 문서화

- [x] 상세한 README.md
- [x] 사용법 가이드
- [x] 설정 옵션 설명
- [x] 문제 해결 가이드
- [x] API 문서 (개발자용)

### ✅ 릴리스 관리

- [x] GitHub Actions 자동 빌드
- [x] 시맨틱 버전 관리
- [x] 자동 릴리스 노트 생성
- [x] 보안 업데이트 자동화

## 📚 참고 자료

### Obsidian 공식 문서

- [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Community Plugin Review Process](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Plugin API Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

### DevOps 도구

- [GitHub Actions](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [ESLint](https://eslint.org/)
- [Vitest](https://vitest.dev/)

### 커뮤니티 리소스

- [Obsidian Plugin Dev Discord](https://discord.gg/obsidianmd)
- [Plugin Development Forum](https://forum.obsidian.md/c/plugin-ideas)
- [Community Plugins Repository](https://github.com/obsidianmd/obsidian-releases)

---

Made with ❤️ by [sb-obsidian-plugins](https://github.com/sb-obsidian-plugins)
