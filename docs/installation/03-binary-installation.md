# 일반 사용자용 바이너리에서 설치 가이드

> 📦 미리 컴파일된 바이너리 파일로 간편하게 sb-obsidian-plugins 설치하기

## 🎯 설치 대상

이 가이드는 다음과 같은 사용자를 대상으로 합니다:
- 개발 환경 구축 없이 빠른 설치를 원하는 사용자
- Node.js나 빌드 도구 사용에 익숙하지 않은 사용자
- 안정적인 릴리스 버전을 사용하고 싶은 사용자
- 간편한 설치 과정을 선호하는 사용자

## 📋 사전 요구사항

### 필수 소프트웨어
- **Obsidian**: 최신 버전 (데스크톱 앱)
- **인터넷 연결**: 릴리스 파일 다운로드용

### 권장 도구
- **압축 해제 도구**: 내장 도구 또는 7-Zip, WinRAR 등
- **웹 브라우저**: GitHub 릴리스 페이지 접근용

## 🚀 빠른 설치 (권장)

### 1단계: 릴리스 페이지 접근
1. 웹 브라우저에서 [GitHub 릴리스 페이지](https://github.com/sb-obsidian-plugins/sb-obsidian-plugins/releases) 접속
2. 최신 릴리스 (Latest Release) 확인
3. 버전 정보 및 변경사항 검토

### 2단계: 통합 번들 다운로드
```
sb-obsidian-plugins-v1.0.0-all-plugins.zip
```
- 모든 플러그인이 포함된 통합 번들
- 한 번의 다운로드로 모든 플러그인 설치 가능
- 권장 설치 방법

### 3단계: 압축 해제
1. 다운로드한 ZIP 파일을 임시 폴더에 압축 해제
2. 다음과 같은 구조 확인:
```
sb-obsidian-plugins-v1.0.0/
├── template-generator/
│   ├── main.js
│   ├── manifest.json
│   └── styles.css (선택사항)
├── git-sync/
│   ├── main.js
│   ├── manifest.json
│   └── styles.css (선택사항)
├── metadata-manager/
│   ├── main.js
│   ├── manifest.json
│   └── styles.css (선택사항)
├── publisher-scripton/
│   ├── main.js
│   ├── manifest.json
│   └── styles.css (선택사항)
└── README.md
```

### 4단계: Obsidian 플러그인 디렉토리에 복사
각 플러그인 폴더를 Obsidian의 플러그인 디렉토리에 복사:

#### Windows
```
%APPDATA%\Obsidian\plugins\
```

#### macOS
```
~/Library/Application Support/obsidian/plugins/
```

#### Linux
```
~/.config/obsidian/plugins/
```

## 🔧 개별 플러그인 설치

각 플러그인을 개별적으로 다운로드하여 설치할 수 있습니다:

### Template Generator
```
다운로드: template-generator-v1.0.0.zip
압축 해제: template-generator/
복사 위치: [Obsidian 플러그인 디렉토리]/template-generator/
```

### Git Sync
```
다운로드: git-sync-v1.0.0.zip
압축 해제: git-sync/
복사 위치: [Obsidian 플러그인 디렉토리]/git-sync/
```

### Metadata Manager
```
다운로드: metadata-manager-v1.0.0.zip
압축 해제: metadata-manager/
복사 위치: [Obsidian 플러그인 디렉토리]/metadata-manager/
```

### Publisher Scripton
```
다운로드: publisher-scripton-v1.0.0.zip
압축 해제: publisher-scripton/
복사 위치: [Obsidian 플러그인 디렉토리]/publisher-scripton/
```

## 📱 플랫폼별 설치 가이드

### Windows 설치 가이드

#### 1. 플러그인 디렉토리 찾기
1. `Win + R` 키를 누르고 `%APPDATA%\Obsidian` 입력
2. `plugins` 폴더가 없다면 생성
3. 각 플러그인별로 하위 폴더 생성

#### 2. 파일 복사
```batch
# 예시: Template Generator 설치
copy template-generator\main.js "%APPDATA%\Obsidian\plugins\template-generator\"
copy template-generator\manifest.json "%APPDATA%\Obsidian\plugins\template-generator\"
```

#### 3. 권한 설정
- 관리자 권한이 필요한 경우 우클릭 → "관리자 권한으로 실행"
- Windows Defender 예외 설정 (필요시)

### macOS 설치 가이드

#### 1. 플러그인 디렉토리 찾기
```bash
# Finder에서 이동
cmd + shift + G
입력: ~/Library/Application Support/obsidian/plugins
```

#### 2. 파일 복사
```bash
# 터미널 사용 (선택사항)
cp -r template-generator/ "~/Library/Application Support/obsidian/plugins/"
cp -r git-sync/ "~/Library/Application Support/obsidian/plugins/"
cp -r metadata-manager/ "~/Library/Application Support/obsidian/plugins/"
cp -r publisher-scripton/ "~/Library/Application Support/obsidian/plugins/"
```

#### 3. 권한 설정
- Gatekeeper 경고 시 "시스템 환경설정 → 보안 및 개인정보보호"에서 허용
- 필요시 `sudo` 명령어 사용

### Linux 설치 가이드

#### 1. 플러그인 디렉토리 확인
```bash
# 디렉토리 생성 (없는 경우)
mkdir -p ~/.config/obsidian/plugins

# 현재 설치된 플러그인 확인
ls -la ~/.config/obsidian/plugins/
```

#### 2. 파일 복사
```bash
# 모든 플러그인 복사
cp -r template-generator/ ~/.config/obsidian/plugins/
cp -r git-sync/ ~/.config/obsidian/plugins/
cp -r metadata-manager/ ~/.config/obsidian/plugins/
cp -r publisher-scripton/ ~/.config/obsidian/plugins/
```

#### 3. 권한 설정
```bash
# 실행 권한 설정
chmod +x ~/.config/obsidian/plugins/*/main.js

# 소유권 확인
chown -R $USER:$USER ~/.config/obsidian/plugins/
```

## 🎮 Obsidian에서 플러그인 활성화

### 1. Obsidian 재시작
플러그인 파일을 복사한 후 Obsidian을 완전히 종료하고 다시 시작합니다.

### 2. 커뮤니티 플러그인 활성화
1. **Settings** (⚙️) → **Community plugins** 이동
2. **Safe mode** 비활성화 (처음 설치 시)
3. **Browse** 옆의 **Installed plugins** 확인

### 3. 개별 플러그인 활성화
설치된 각 플러그인을 활성화합니다:

#### Template Generator
- 토글 버튼 ON
- 설정 아이콘 클릭하여 초기 설정
- OpenWeather API 키 입력 (선택사항)

#### Git Sync
- 토글 버튼 ON
- Git 저장소 경로 설정
- 커밋 간격 설정

#### Metadata Manager
- 토글 버튼 ON
- 메타데이터 템플릿 설정
- 자동 삽입 옵션 설정

#### Publisher Scripton
- 토글 버튼 ON
- Scripton.cloud API 키 입력
- 발행 옵션 설정

## 🔄 업데이트 방법

### 자동 업데이트 알림
1. 새 릴리스가 있을 때 GitHub에서 알림 받기
2. **Watch** → **Releases only** 설정

### 수동 업데이트
1. **새 릴리스 확인**: GitHub 릴리스 페이지 방문
2. **백업**: 현재 설정 파일 백업
3. **다운로드**: 새 버전 바이너리 다운로드
4. **교체**: 기존 파일을 새 파일로 교체
5. **재시작**: Obsidian 재시작
6. **확인**: 플러그인 정상 작동 확인

### 백업 및 복원
```bash
# 설정 백업
cp -r ~/.config/obsidian/plugins/ ~/obsidian-plugins-backup/

# 설정 복원
cp -r ~/obsidian-plugins-backup/ ~/.config/obsidian/plugins/
```

## 🚨 문제 해결

### 일반적인 문제들

#### 플러그인이 목록에 나타나지 않음
1. **파일 위치 확인**: 올바른 플러그인 디렉토리에 복사했는지 확인
2. **파일 구조 확인**: `main.js`, `manifest.json`이 올바른 위치에 있는지 확인
3. **권한 확인**: 파일 읽기 권한이 있는지 확인
4. **Obsidian 재시작**: 완전히 종료하고 다시 시작

#### 플러그인 활성화 후 오류 발생
1. **콘솔 로그 확인**: Developer Tools (Ctrl+Shift+I) → Console 탭
2. **충돌 플러그인 확인**: 유사한 기능의 다른 플러그인 비활성화
3. **설정 초기화**: 플러그인 설정 폴더 삭제 후 재설정

#### 성능 문제
1. **메모리 사용량 확인**: Task Manager에서 Obsidian 메모리 사용량 모니터링
2. **불필요한 플러그인 비활성화**: 사용하지 않는 플러그인 비활성화
3. **Vault 크기 확인**: 매우 큰 Vault의 경우 성능 저하 가능

### 진단 도구

#### 플러그인 상태 확인
```javascript
// Developer Console에서 실행
console.log('Installed plugins:', app.plugins.enabledPlugins);
console.log('Plugin manifests:', app.plugins.manifests);
```

#### 오류 로그 확인
```javascript
// 오류 로그 필터링
console.log('Errors:', app.plugins.plugins['template-generator']);
```

## 🔐 보안 고려사항

### 다운로드 검증
1. **공식 릴리스 확인**: GitHub 공식 릴리스 페이지에서만 다운로드
2. **체크섬 확인**: 제공된 SHA256 해시와 비교
3. **디지털 서명**: 서명된 릴리스인지 확인

### 권한 관리
- 플러그인이 요구하는 권한 확인
- 민감한 정보 (API 키 등) 안전한 저장
- 정기적인 보안 업데이트

## 📞 지원 및 문의

### 설치 관련 지원
- **GitHub Issues**: [설치 문제 신고](https://github.com/sb-obsidian-plugins/sb-obsidian-plugins/issues)
- **설치 가이드 동영상**: [YouTube 채널](https://youtube.com/sb-obsidian-plugins)
- **Discord 커뮤니티**: [실시간 지원 채널](https://discord.gg/obsidianmd)

### 자주 묻는 질문
1. **Q: 플러그인이 보이지 않아요**
   A: Obsidian 재시작 후 Settings → Community plugins에서 확인

2. **Q: 업데이트는 어떻게 하나요?**
   A: 새 릴리스를 다운로드하여 기존 파일 교체

3. **Q: 설정이 사라졌어요**
   A: 플러그인 폴더의 `data.json` 파일 확인

4. **Q: 일부 플러그인만 설치할 수 있나요?**
   A: 네, 개별 플러그인 ZIP 파일을 다운로드하여 설치 가능

---

Made with ❤️ by [sb-obsidian-plugins](https://github.com/sb-obsidian-plugins)