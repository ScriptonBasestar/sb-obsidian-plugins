# 일반 사용자용 소스에서 설치 가이드

> 📦 GitHub 소스 코드에서 직접 sb-obsidian-plugins 설치하기

## 🎯 설치 대상

이 가이드는 다음과 같은 사용자를 대상으로 합니다:
- 최신 개발 버전을 사용하고 싶은 사용자
- 공식 플러그인 마켓에서 아직 제공되지 않는 플러그인 사용자
- 소스 코드 수정 및 커스터마이징을 원하는 사용자
- 베타 기능을 미리 체험하고 싶은 사용자

## 📋 사전 요구사항

### 필수 소프트웨어
- **Node.js**: v16 이상 (권장: v18+)
- **Git**: 최신 버전
- **Obsidian**: 최신 버전 (데스크톱 앱)

### 권장 도구
- **터미널**: 명령줄 작업을 위한 터미널 앱
- **텍스트 에디터**: VS Code, Sublime Text 등 (선택사항)

## 🚀 전체 설치 프로세스

### 1단계: 소스 코드 다운로드
```bash
# 1. 홈 디렉토리 또는 적절한 위치에 저장소 클론
cd ~
git clone https://github.com/sb-obsidian-plugins/sb-obsidian-plugins.git
cd sb-obsidian-plugins

# 2. 최신 안정 버전으로 체크아웃 (선택사항)
git checkout main
# 또는 최신 개발 버전
git checkout develop
```

### 2단계: 의존성 설치
```bash
# 1. pnpm 설치 (Node.js 패키지 매니저)
npm install -g pnpm

# 2. 프로젝트 의존성 설치
pnpm install

# 3. 설치 확인
pnpm -v
```

### 3단계: 플러그인 빌드
```bash
# 모든 플러그인 빌드
pnpm run build:all

# 개별 플러그인 빌드 (선택사항)
cd packages/template-generator
pnpm run build

cd ../git-sync
pnpm run build

cd ../metadata-manager
pnpm run build

cd ../publisher-scripton
pnpm run build
```

### 4단계: Obsidian 플러그인 디렉토리에 복사
```bash
# Obsidian 플러그인 디렉토리 찾기
# Windows: %APPDATA%\Obsidian\plugins
# macOS: ~/Library/Application Support/obsidian/plugins
# Linux: ~/.config/obsidian/plugins

# 예시: macOS 기준
OBSIDIAN_PLUGINS_DIR="~/Library/Application Support/obsidian/plugins"

# 각 플러그인 복사
cp -r packages/template-generator "$OBSIDIAN_PLUGINS_DIR/"
cp -r packages/git-sync "$OBSIDIAN_PLUGINS_DIR/"
cp -r packages/metadata-manager "$OBSIDIAN_PLUGINS_DIR/"
cp -r packages/publisher-scripton "$OBSIDIAN_PLUGINS_DIR/"
```

## 🔧 개별 플러그인 설치

### Template Generator 설치
```bash
# 1. 플러그인 디렉토리로 이동
cd packages/template-generator

# 2. 의존성 설치 및 빌드
pnpm install
pnpm run build

# 3. Obsidian 플러그인 디렉토리에 복사
PLUGIN_DIR="~/Library/Application Support/obsidian/plugins/template-generator"
mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json "$PLUGIN_DIR/"

# 4. 추가 파일 복사 (있는 경우)
cp styles.css "$PLUGIN_DIR/" 2>/dev/null || true
```

### Git Sync 설치
```bash
# 1. 플러그인 디렉토리로 이동
cd packages/git-sync

# 2. 의존성 설치 및 빌드
pnpm install
pnpm run build

# 3. Obsidian 플러그인 디렉토리에 복사
PLUGIN_DIR="~/Library/Application Support/obsidian/plugins/git-sync"
mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json "$PLUGIN_DIR/"
```

### Metadata Manager 설치
```bash
# 1. 플러그인 디렉토리로 이동
cd packages/metadata-manager

# 2. 의존성 설치 및 빌드
pnpm install
pnpm run build

# 3. Obsidian 플러그인 디렉토리에 복사
PLUGIN_DIR="~/Library/Application Support/obsidian/plugins/metadata-manager"
mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json "$PLUGIN_DIR/"
```

### Publisher Scripton 설치
```bash
# 1. 플러그인 디렉토리로 이동
cd packages/publisher-scripton

# 2. 의존성 설치 및 빌드
pnpm install
pnpm run build

# 3. Obsidian 플러그인 디렉토리에 복사
PLUGIN_DIR="~/Library/Application Support/obsidian/plugins/publisher-scripton"
mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json "$PLUGIN_DIR/"
```

## 🎮 Obsidian에서 플러그인 활성화

### 1. Obsidian 실행
1. Obsidian을 열거나 재시작합니다
2. 설정 (Settings) 메뉴로 이동합니다
3. 좌측 메뉴에서 "Community plugins"를 클릭합니다

### 2. 플러그인 활성화
1. "Installed plugins" 섹션에서 설치한 플러그인들을 확인합니다
2. 각 플러그인의 토글 버튼을 클릭하여 활성화합니다:
   - **Template Generator**: 템플릿 생성 기능
   - **Git Sync**: Git 동기화 기능
   - **Metadata Manager**: 메타데이터 관리 기능
   - **Publisher Scripton**: Scripton 발행 기능

### 3. 플러그인 설정
각 플러그인의 설정 아이콘을 클릭하여 개별 설정을 구성합니다:

#### Template Generator 설정
- OpenWeather API 키 입력
- 템플릿 디렉토리 경로 설정
- 날짜 형식 설정

#### Git Sync 설정
- Git 저장소 경로 설정
- 자동 커밋 간격 설정
- AI 커밋 메시지 API 키 설정

#### Metadata Manager 설정
- 자동 메타데이터 삽입 설정
- 메타데이터 템플릿 설정
- 검증 규칙 설정

#### Publisher Scripton 설정
- Scripton.cloud API 키 설정
- 발행 옵션 설정
- 자동 발행 규칙 설정

## 🔄 업데이트 방법

### 수동 업데이트
```bash
# 1. 소스 코드 업데이트
cd ~/sb-obsidian-plugins
git pull origin main

# 2. 의존성 업데이트
pnpm install

# 3. 다시 빌드
pnpm run build:all

# 4. 플러그인 파일 다시 복사
# (4단계 과정 반복)
```

### 자동 업데이트 스크립트
```bash
#!/bin/bash
# update-plugins.sh

cd ~/sb-obsidian-plugins
git pull origin main
pnpm install
pnpm run build:all

OBSIDIAN_PLUGINS_DIR="~/Library/Application Support/obsidian/plugins"

for plugin in template-generator git-sync metadata-manager publisher-scripton; do
    echo "Updating $plugin..."
    cp packages/$plugin/main.js "$OBSIDIAN_PLUGINS_DIR/$plugin/"
    cp packages/$plugin/manifest.json "$OBSIDIAN_PLUGINS_DIR/$plugin/"
done

echo "All plugins updated!"
```

## 🚨 문제 해결

### 빌드 오류 해결
```bash
# 1. 의존성 문제
pnpm install --force

# 2. 캐시 문제
pnpm store prune
pnpm install

# 3. Node.js 버전 문제
nvm use 18  # Node.js 18 버전 사용
```

### 플러그인 인식 안됨
```bash
# 1. 파일 권한 확인
ls -la "~/Library/Application Support/obsidian/plugins/"

# 2. 파일 존재 확인
ls -la "~/Library/Application Support/obsidian/plugins/template-generator/"

# 3. manifest.json 검증
cat "~/Library/Application Support/obsidian/plugins/template-generator/manifest.json"
```

### 플러그인 충돌 해결
1. **다른 플러그인과 충돌**: 유사한 기능의 플러그인 비활성화
2. **설정 충돌**: `.obsidian/plugins/` 폴더에서 설정 파일 삭제 후 재설정
3. **캐시 문제**: Obsidian 재시작 또는 개발자 도구에서 캐시 삭제

## 📱 플랫폼별 설치 경로

### Windows
```powershell
# 플러그인 디렉토리
$env:APPDATA\Obsidian\plugins\

# 설치 명령어 예시
xcopy packages\template-generator\main.js "%APPDATA%\Obsidian\plugins\template-generator\"
xcopy packages\template-generator\manifest.json "%APPDATA%\Obsidian\plugins\template-generator\"
```

### macOS
```bash
# 플러그인 디렉토리
~/Library/Application Support/obsidian/plugins/

# 설치 명령어 예시
cp packages/template-generator/main.js "~/Library/Application Support/obsidian/plugins/template-generator/"
cp packages/template-generator/manifest.json "~/Library/Application Support/obsidian/plugins/template-generator/"
```

### Linux
```bash
# 플러그인 디렉토리
~/.config/obsidian/plugins/

# 설치 명령어 예시
cp packages/template-generator/main.js ~/.config/obsidian/plugins/template-generator/
cp packages/template-generator/manifest.json ~/.config/obsidian/plugins/template-generator/
```

## 🔐 보안 고려사항

### 소스 코드 검증
```bash
# 1. 체크섬 확인
sha256sum packages/template-generator/main.js

# 2. 코드 검토
cat packages/template-generator/src/main.ts | head -50

# 3. 의존성 검토
pnpm audit
```

### 권한 관리
- 플러그인이 요구하는 권한 확인
- 민감한 정보 (API 키 등) 안전한 저장소에 보관
- 정기적인 API 키 교체

## 📞 지원 및 문의

### 설치 관련 문의
- **GitHub Issues**: [설치 문제 신고](https://github.com/sb-obsidian-plugins/sb-obsidian-plugins/issues)
- **Discord**: [커뮤니티 채널](https://discord.gg/obsidianmd)
- **이메일**: support@sb-obsidian-plugins.com

### 유용한 리소스
- **설치 가이드 동영상**: [YouTube 채널](https://youtube.com/sb-obsidian-plugins)
- **FAQ**: [자주 묻는 질문](https://github.com/sb-obsidian-plugins/sb-obsidian-plugins/wiki/FAQ)
- **커뮤니티 포럼**: [Obsidian 포럼](https://forum.obsidian.md)

---

Made with ❤️ by [sb-obsidian-plugins](https://github.com/sb-obsidian-plugins)