# VS Code Extension 테스트 가이드

이 문서는 Smart Code Review VS Code Extension을 로컬에서 테스트하는 방법을 설명합니다.

## 📋 사전 준비

### 1. 필수 소프트웨어 확인

```bash
# Python 버전 확인 (3.9 이상 필요)
python3 --version

# Node.js 버전 확인 (18.0 이상 권장)
node --version

# VS Code 버전 확인 (1.80.0 이상 필요)
code --version
```

### 2. 현재 상태 확인

```bash
# 현재 브랜치 확인
git branch
# vscode-extension 브랜치에 있어야 함

# 변경사항 확인
git status
```

## 🚀 Extension 실행 방법

### 방법 1: VS Code UI를 통한 실행 (추천)

1. **VS Code에서 프로젝트 열기**
   ```bash
   code /Users/k/Documents/home/PROJECT/code-review-dashboard
   ```

2. **Run and Debug 패널 열기**
   - 좌측 사이드바에서 "Run and Debug" 아이콘 클릭 (▶️ 모양)
   - 또는 단축키: `Cmd+Shift+D` (macOS) / `Ctrl+Shift+D` (Windows/Linux)

3. **"Run Extension" 선택**
   - 상단 드롭다운에서 "Run Extension" 선택
   - 초록색 재생 버튼 클릭 또는 `F5` 키 누르기

4. **Extension Development Host 창 열림**
   - 새로운 VS Code 창이 열립니다
   - 제목 표시줄에 "[Extension Development Host]" 표시됨

### 방법 2: 키보드 단축키 사용

```
현재 프로젝트 폴더에서:
F5 키 누르기
→ 자동으로 컴파일 및 Extension Development Host 실행
```

## 🧪 테스트 시나리오

### 테스트 1: Extension 활성화 확인

1. **Extension Development Host 창에서:**
   - `Cmd+Shift+P` (macOS) 또는 `Ctrl+Shift+P` (Windows/Linux)
   - 명령어 팔레트가 열림

2. **"Smart Code Review" 검색**
   - `Smart Code Review: Open Dashboard` 명령어 확인
   - `Smart Code Review: Analyze Current Project` 명령어 확인

3. **Output 패널 확인**
   - `View` > `Output` (또는 `Cmd+Shift+U`)
   - 드롭다운에서 "Smart Code Review" 선택
   - Python 서버 시작 로그 확인:
     ```
     Smart Code Review extension is now active
     Python 서버를 시작합니다...
     Python 발견: Python 3.x.x
     서버 경로: .../backend
     서버가 성공적으로 시작되었습니다
     ```

### 테스트 2: Dashboard 열기

1. **명령어 실행**
   - `Cmd+Shift+P` → `Smart Code Review: Open Dashboard`

2. **Webview 패널 확인**
   - Dashboard가 새 패널에 표시됨
   - "Smart Code Review" 제목 확인
   - 프로젝트 선택 UI 표시 확인

### 테스트 3: 폴더 선택 (핵심 기능!)

1. **Browse 버튼 클릭**
   - VS Code 네이티브 폴더 선택 다이얼로그가 열림
   - **기존 웹 버전과 다른 점**: 실제 파일시스템 경로가 표시됨

2. **테스트 프로젝트 선택**
   - 아무 프로젝트 폴더나 선택 (예: frontend 폴더)
   - 경로가 자동으로 입력 필드에 입력됨
   - **확인할 점**: `/Users/k/Documents/.../frontend` 같은 실제 전체 경로

3. **Scan 버튼 클릭**
   - "Scanning..." 로딩 상태 표시
   - 언어 자동 감지 (JavaScript, TypeScript, Python 등)
   - 파일 트리가 표시됨

### 테스트 4: 필터링 기능

1. **언어 프리셋 확인**
   - "Detected Language" 확인
   - "Apply language presets" 체크박스 확인
   - `.gitignore file found` 메시지 확인 (있는 경우)

2. **필터 적용**
   - "Apply Filters" 버튼 클릭
   - Statistics 업데이트 확인:
     - Total Files
     - Selected (녹색)
     - Filtered (회색)

3. **파일 트리 확인**
   - `node_modules/` 폴더가 회색으로 표시되고 "(filtered)" 라벨
   - 하위 파일들도 모두 회색으로 표시 (부모-자식 전파)
   - 디렉토리 확장/축소 동작 확인

4. **커스텀 규칙 추가**
   - Custom Rules 섹션에서 `*.test.js` 입력
   - "+ Add" 버튼 클릭
   - "Apply Filters" 클릭
   - 테스트 파일들이 필터링되는지 확인

### 테스트 5: 현재 프로젝트 자동 분석

1. **워크스페이스 폴더 열기**
   - `File` > `Open Folder`
   - 아무 프로젝트 선택

2. **명령어 실행**
   - `Cmd+Shift+P` → `Smart Code Review: Analyze Current Project`

3. **자동 경로 설정 확인**
   - Dashboard가 열림
   - 현재 워크스페이스 경로가 자동으로 입력됨
   - 자동으로 스캔 시작 (0.5초 후)

### 테스트 6: Python 서버 통신

1. **Output 패널 모니터링**
   - "Smart Code Review" 출력 채널
   - API 요청 시 Python 서버 응답 로그 확인

2. **네트워크 확인**
   ```bash
   # 별도 터미널에서
   lsof -i :8000
   # Python 프로세스가 8000 포트에서 실행 중인지 확인
   ```

3. **에러 처리**
   - 잘못된 경로 입력 시 에러 메시지 표시 확인
   - 권한 없는 디렉토리 선택 시 에러 처리 확인

## 🐛 디버깅

### Extension 코드 디버깅

1. **브레이크포인트 설정**
   - `src/extension.ts`, `src/pythonServer.ts` 등에 브레이크포인트 설정
   - 빨간 점 클릭 또는 코드 왼쪽 여백 클릭

2. **F5로 디버그 시작**
   - 브레이크포인트에서 실행 멈춤
   - 변수 값 확인, 스텝 실행 등

### Webview (React) 디버깅

1. **Developer Tools 열기**
   - Extension Development Host 창에서
   - `Cmd+Shift+P` → `Developer: Open Webview Developer Tools`

2. **Console 탭**
   - JavaScript 에러 및 로그 확인
   - React 컴포넌트 오류 확인

3. **Network 탭**
   - API 요청/응답 확인 (Extension을 통한 프록시)

### Python 서버 디버깅

1. **서버 로그 확인**
   - Output 패널 > "Smart Code Review"
   - Python 서버의 stdout/stderr 출력 확인

2. **수동으로 서버 실행** (Extension 종료 후)
   ```bash
   cd backend
   python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

## ✅ 테스트 체크리스트

- [ ] Extension이 정상적으로 활성화됨
- [ ] Python 서버가 자동으로 시작됨
- [ ] Dashboard가 Webview로 열림
- [ ] Browse 버튼이 네이티브 다이얼로그를 열음
- [ ] **실제 파일시스템 경로가 정확하게 표시됨** (가장 중요!)
- [ ] 프로젝트 스캔이 정상 작동
- [ ] 언어 자동 감지 기능 작동
- [ ] 필터 적용이 정상 작동
- [ ] 부모 디렉토리 필터링 시 자식도 필터링됨
- [ ] Statistics가 정확하게 계산됨
- [ ] 커스텀 규칙 추가/삭제 기능 작동
- [ ] Recent Projects가 저장되고 불러와짐
- [ ] "Change Project" 버튼으로 초기화 가능
- [ ] 에러 처리가 적절하게 작동

## 🔧 문제 해결

### 문제 1: Extension이 활성화되지 않음

```bash
# TypeScript 컴파일 확인
npx tsc -p .

# out/ 폴더에 .js 파일들이 생성되었는지 확인
ls -la out/

# VS Code 재시작 후 F5 다시 시도
```

### 문제 2: Python 서버가 시작되지 않음

```bash
# Python 설치 확인
which python3

# 의존성 수동 설치
cd backend
pip3 install -r requirements.txt --user

# 수동으로 서버 테스트
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 문제 3: Webview가 비어있음

```bash
# 프론트엔드 빌드 확인
cd frontend
npm run build

# frontend/dist/ 폴더 확인
ls -la dist/

# index.html과 assets/ 폴더가 있어야 함
```

### 문제 4: 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 프로세스 종료
kill -9 <PID>

# 또는 settings.json에서 포트 변경
{
  "smartCodeReview.serverPort": 8001
}
```

## 📊 성능 확인

### 메모리 사용량

```bash
# Python 서버 메모리
ps aux | grep uvicorn

# Extension Host 메모리
Activity Monitor (macOS) 또는 Task Manager에서 확인
```

### 응답 시간

- 파일 스캔: 1000개 파일 기준 < 5초
- 필터 적용: < 1초
- Dashboard 열기: < 2초

## 🎉 성공 기준

다음 모든 항목이 작동하면 테스트 성공:

1. ✅ Extension Development Host가 정상적으로 열림
2. ✅ Python 서버 자동 시작 메시지 확인
3. ✅ Dashboard 정상 표시
4. ✅ **Browse 버튼으로 실제 경로 선택 가능** ← **핵심!**
5. ✅ 프로젝트 스캔 및 분석 정상 동작
6. ✅ 모든 필터링 기능 정상 작동

## 📝 다음 단계

테스트 완료 후:
1. 발견된 버그 수정
2. 변경사항 커밋
3. Phase 2 개발 준비 (AI 분석 통합)
