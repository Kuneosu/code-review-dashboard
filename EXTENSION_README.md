# Smart Code Review - VS Code Extension

AI 기반 코드 분석 도구로 보안 취약점, 성능 문제, 코드 품질 문제를 탐지하는 VS Code Extension입니다.

## ✨ 주요 기능

- **네이티브 폴더 선택**: VS Code의 네이티브 폴더 다이얼로그로 프로젝트 선택
- **자동 언어 감지**: JavaScript, TypeScript, Python 프로젝트 자동 인식
- **스마트 필터링**: .gitignore 규칙 및 언어별 프리셋 필터 자동 적용
- **실시간 미리보기**: 필터링된 파일 트리 실시간 확인
- **Python 백엔드 자동 시작**: Extension 활성화 시 자동으로 분석 서버 시작

## 📦 설치 요구사항

- **VS Code**: 1.80.0 이상
- **Python**: 3.9 이상
- **Node.js**: 18.0 이상 (개발용)

## 🚀 사용 방법

### 1. Extension 설치

현재는 로컬 개발 모드로 실행합니다.

```bash
# 1. 저장소 클론
git clone <repository-url>
cd code-review-dashboard
git checkout vscode-extension

# 2. 의존성 설치
npm install
cd frontend && npm install && cd ..

# 3. 프론트엔드 빌드
cd frontend && npm run build && cd ..

# 4. Extension 컴파일
npx tsc -p .

# 5. VS Code에서 F5 키로 Extension Development Host 실행
```

### 2. Dashboard 열기

VS Code에서:
- **Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`)
- `Smart Code Review: Open Dashboard` 실행

또는:
- `Smart Code Review: Analyze Current Project` - 현재 워크스페이스 자동 분석

### 3. 프로젝트 분석

1. **Browse 버튼 클릭** - VS Code 네이티브 폴더 선택 다이얼로그 사용
2. **프로젝트 폴더 선택**
3. **Scan 버튼 클릭** - 자동으로 파일 트리 스캔 및 언어 감지
4. **필터 설정 조정** - 프리셋 토글, 커스텀 규칙 추가
5. **Apply Filters** - 필터 적용 및 결과 확인

## ⚙️ 설정

`settings.json`에서 설정 가능:

```json
{
  "smartCodeReview.pythonPath": "python3",  // Python 인터프리터 경로
  "smartCodeReview.serverPort": 8000         // 백엔드 서버 포트
}
```

## 🔧 개발

### 프로젝트 구조

```
code-review-dashboard/
├── src/                    # Extension 소스 코드 (TypeScript)
│   ├── extension.ts       # Extension 진입점
│   ├── pythonServer.ts    # Python 서버 관리
│   └── dashboardPanel.ts  # Webview 패널
├── frontend/              # React UI
│   ├── src/
│   └── dist/              # 빌드된 Webview 파일
├── backend/               # Python FastAPI 서버
│   ├── main.py
│   ├── services/
│   └── models/
└── out/                   # 컴파일된 Extension 코드
```

### 로컬 개발

```bash
# Terminal 1: Extension 컴파일 (watch mode)
npx tsc -watch -p .

# Terminal 2: 프론트엔드 개발 서버 (선택사항)
cd frontend && npm run dev

# Terminal 3: Python 서버 (자동 시작되지만 수동 실행도 가능)
cd backend && python -m uvicorn main:app --reload

# VS Code에서 F5로 Extension Development Host 실행
```

### 디버깅

1. VS Code에서 F5 키로 Extension Development Host 시작
2. Extension Host 창에서 `Developer: Open Webview Developer Tools` 실행
3. Webview 콘솔 및 Extension Host 디버그 콘솔 확인

### 빌드

```bash
# 프론트엔드 빌드
cd frontend && npm run build && cd ..

# Extension 컴파일
npx tsc -p .

# VSIX 패키지 생성 (배포용)
npx vsce package
```

## 📝 주요 차이점 (웹 버전 vs Extension)

| 기능 | 웹 버전 | VS Code Extension |
|------|---------|-------------------|
| 폴더 선택 | File System Access API (경로 추론 필요) | 네이티브 다이얼로그 (실제 경로) |
| 실행 방법 | 브라우저 + 별도 Python 서버 | Extension 활성화 시 자동 |
| 통합 | 독립 실행 | VS Code 워크플로우 통합 |
| 배포 | 웹 서버 | VS Code Marketplace |

## 🐛 알려진 문제

1. **Python 의존성 설치**: 첫 실행 시 pip install이 시간이 걸릴 수 있습니다
2. **Port 충돌**: 8000 포트가 이미 사용 중이면 설정에서 변경 필요
3. **Python 버전**: 3.9 미만에서는 작동하지 않습니다

## 🔮 다음 단계 (Phase 2, 3)

- **AI 분석 통합**: Ollama 연동으로 코드 분석
- **인라인 피드백**: 에디터에 직접 분석 결과 표시
- **Language Server Protocol**: LSP로 실시간 분석
- **Diagnostic Integration**: VS Code Problems 패널 통합
- **Quick Fix**: 코드 액션으로 자동 수정 제안

## 📄 라이선스

ISC

## 👥 기여

이슈 및 PR 환영합니다!

## 📞 문의

GitHub Issues를 통해 버그 리포트 및 기능 요청 가능합니다.
