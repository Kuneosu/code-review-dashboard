# Phase 2-1: 분석 실행 및 진행률 표시

**작성일**: 2025-10-16
**상태**: 설계 완료
**목적**: Phase 1에서 선택된 파일들을 정적 분석 도구로 분석하고 실시간 진행률 표시

---

## 📋 개요

Phase 1에서 선택된 파일들을 ESLint, Bandit 등의 정적 분석 도구로 분석하고, VS Code Extension 환경에서 비동기 백그라운드 분석과 실시간 진행률을 표시합니다.

### Phase 2-1의 범위

**Phase 2-1 (이번 작업)**:
- ✅ 비동기 분석 실행 및 상태 관리
- ✅ 실시간 진행률 표시 UI
- ✅ 분석 도구 통합 (ESLint, Bandit, Pylint)
- ✅ 일시정지/재개/중단 기능

**Phase 2-2 (다음 작업)**:
- 📊 대시보드 설계 및 시각화
- 📈 차트 및 통계
- 🔍 필터링 및 정렬
- 📤 리포트 내보내기

---

## 🔄 분석 실행 흐름

### 1. VS Code Extension 환경에서의 실행 플로우

```
사용자: Phase 1 페이지에서 "Start Analysis" 버튼 클릭
    ↓
Webview → Extension: 'startAnalysis' 메시지 전송
    ↓
Extension → Python Backend: POST /api/analysis/start
    ↓
Python Backend: 비동기 작업 시작, analysis_id 즉시 반환
    ↓
Extension ← Python Backend: { analysis_id, status: "PENDING" }
    ↓
Extension → Webview: 'analysisStarted' 메시지 전송
    ↓
Webview: Phase 2 페이지로 자동 이동
    ↓
Webview ↔ Extension ↔ Backend: HTTP 폴링 (2초마다 상태 확인)
    ↓
분석 완료 시: 상태가 "COMPLETED"로 변경
    ↓
Webview: 결과 조회 및 대시보드 표시 (Phase 2-2)
```

### 2. 메시지 통신 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                  VS Code Extension                       │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Extension (src/extension.ts)                      │ │
│  │                                                     │ │
│  │  역할:                                              │ │
│  │  - Webview ↔ Python Backend 메시지 프록시        │ │
│  │  - 분석 시작/중단 명령 중계                        │ │
│  │  - 폴링 상태 조회 중계                             │ │
│  └────────────────────────────────────────────────────┘ │
│                         ↕                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Webview (React)                                    │ │
│  │                                                     │ │
│  │  - Phase1Page: "Start Analysis" 버튼              │ │
│  │  - Phase2Page: 진행률 표시 및 제어                │ │
│  │                                                     │ │
│  │  상태 관리: phase2Store (Zustand)                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         ↕ HTTP
┌─────────────────────────────────────────────────────────┐
│  Python Backend (FastAPI)                                │
│                                                           │
│  - POST /api/analysis/start                              │
│  - GET /api/analysis/{id}/status                        │
│  - POST /api/analysis/{id}/pause                        │
│  - POST /api/analysis/{id}/resume                       │
│  - POST /api/analysis/{id}/cancel                       │
│  - GET /api/analysis/{id}/result                        │
│                                                           │
│  백그라운드 작업: asyncio.create_task()                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 분석 상태 관리

### 상태 전이 다이어그램

```
IDLE (초기 상태)
    ↓ startAnalysis()
PENDING (분석 대기)
    ↓ 자동
RUNNING (분석 진행 중)
    ↓ pause()         ↓ cancel()
PAUSED               CANCELLED
    ↓ resume()            ↓
RUNNING                (종료)
    ↓ 완료
COMPLETED
    ↓
(Phase 2-2로 이동)

에러 발생 시 → FAILED → (재시도 가능)
```

### 상태별 동작 및 UI

| 상태 | 진행률 | 사용 가능 액션 | UI 표시 |
|------|--------|---------------|---------|
| `IDLE` | 0% | - | Phase 1 페이지 |
| `PENDING` | 0% | [중단] | "분석 준비 중..." |
| `RUNNING` | 1-99% | [일시정지] [중단] | 진행률 바 + 통계 |
| `PAUSED` | 고정 | [재개] [중단] | "일시정지됨" |
| `COMPLETED` | 100% | [결과 보기] | "분석 완료!" |
| `FAILED` | - | [재시도] [닫기] | 에러 메시지 |
| `CANCELLED` | - | [돌아가기] | "분석 취소됨" |

---

## 🖥️ 진행률 표시 UI 설계

### Phase 2 페이지 레이아웃

```
┌───────────────────────────────────────────────────────┐
│  Smart Code Review - Analysis Progress                │
├───────────────────────────────────────────────────────┤
│                                                        │
│  🔍 코드 분석 중...                                    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ████████████████░░░░░░░░░░░░ 60% (27/45)        │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  📄 현재 파일: src/components/Header.tsx              │
│  ⏱️  소요 시간: 00:02:34                              │
│  ⏳ 예상 남은 시간: 00:01:43                           │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 발견된 이슈 (실시간)                              │ │
│  │                                                   │ │
│  │  🔴 Critical: 2                                   │ │
│  │  🟠 High: 5                                       │ │
│  │  🟡 Medium: 12                                    │ │
│  │  🟢 Low: 8                                        │ │
│  │                                                   │ │
│  │  Total: 27 issues found                          │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  [⏸️ 일시 정지]  [⏹️ 중단]                           │
│                                                        │
└───────────────────────────────────────────────────────┘
```

### 컴포넌트 설계

```typescript
// frontend/src/pages/Phase2Page.tsx

export const Phase2Page: React.FC = () => {
  const {
    analysisId,
    status,
    progress,
    currentFile,
    completedFiles,
    totalFiles,
    elapsedTime,
    estimatedRemaining,
    liveSummary,
    error,
    pauseAnalysis,
    resumeAnalysis,
    cancelAnalysis,
  } = usePhase2Store();

  // 2초마다 상태 폴링
  useEffect(() => {
    if (status === 'RUNNING' || status === 'PENDING') {
      const interval = setInterval(() => {
        fetchAnalysisStatus(analysisId);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [status, analysisId]);

  return (
    <div className="analysis-progress">
      {status === 'RUNNING' && (
        <>
          <ProgressBar progress={progress} />
          <StatusInfo
            currentFile={currentFile}
            completedFiles={completedFiles}
            totalFiles={totalFiles}
            elapsedTime={elapsedTime}
            estimatedRemaining={estimatedRemaining}
          />
          <LiveIssueSummary summary={liveSummary} />
          <ControlButtons
            onPause={pauseAnalysis}
            onCancel={cancelAnalysis}
          />
        </>
      )}
      {status === 'PAUSED' && (
        <>
          <PausedMessage />
          <ControlButtons
            onResume={resumeAnalysis}
            onCancel={cancelAnalysis}
          />
        </>
      )}
      {status === 'COMPLETED' && (
        <CompletedMessage
          totalIssues={liveSummary?.total || 0}
          onViewResults={() => router.push('/dashboard')}
        />
      )}
      {status === 'FAILED' && (
        <ErrorMessage
          error={error}
          onRetry={retryAnalysis}
        />
      )}
    </div>
  );
};
```

---

## 🔌 API 설계

### 1. 분석 시작

```http
POST /api/analysis/start

Request:
{
  "project_path": "/Users/k/Documents/PROJECT/frontend",
  "selected_files": [
    "src/components/Header.tsx",
    "src/utils/api.ts",
    ...
  ],
  "filter_config": {
    "language": "typescript",
    "include_patterns": ["*.ts", "*.tsx"],
    "exclude_patterns": ["node_modules/**"]
  },
  "categories": ["security", "performance", "quality"]
}

Response: 202 Accepted
{
  "analysis_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "PENDING",
  "message": "분석이 시작되었습니다",
  "created_at": "2025-10-16T10:30:00Z"
}
```

### 2. 상태 조회 (폴링용)

```http
GET /api/analysis/{analysis_id}/status

Response: 200 OK
{
  "analysis_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "RUNNING",
  "progress": 0.60,  // 0.0 ~ 1.0
  "current_file": "src/components/Header.tsx",
  "completed_files": 27,
  "total_files": 45,
  "elapsed_time": 154,  // seconds
  "estimated_remaining": 103,  // seconds
  "live_summary": {
    "critical": 2,
    "high": 5,
    "medium": 12,
    "low": 8,
    "total": 27
  },
  "updated_at": "2025-10-16T10:32:34Z"
}
```

### 3. 제어 API

```http
# 일시정지
POST /api/analysis/{analysis_id}/pause
Response: 200 OK
{
  "status": "PAUSED",
  "message": "분석이 일시정지되었습니다"
}

# 재개
POST /api/analysis/{analysis_id}/resume
Response: 200 OK
{
  "status": "RUNNING",
  "message": "분석이 재개되었습니다"
}

# 중단
POST /api/analysis/{analysis_id}/cancel
Response: 200 OK
{
  "status": "CANCELLED",
  "message": "분석이 취소되었습니다"
}
```

### 4. 결과 조회 (Phase 2-2에서 사용)

```http
GET /api/analysis/{analysis_id}/result

Response: 200 OK
{
  "analysis_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "COMPLETED",
  "summary": {
    "total_files": 45,
    "total_issues": 27,
    "by_severity": {
      "critical": 2,
      "high": 5,
      "medium": 12,
      "low": 8
    },
    "by_category": {
      "security": 7,
      "performance": 5,
      "quality": 15
    }
  },
  "issues": [
    {
      "id": "issue-001",
      "file": "src/api/users.ts",
      "line": 45,
      "column": 12,
      "severity": "critical",
      "category": "security",
      "rule": "security/detect-sql-injection",
      "message": "Possible SQL injection vulnerability",
      "code_snippet": "const query = `SELECT * FROM users WHERE id=${id}`;",
      "tool": "ESLint"
    },
    ...
  ],
  "completed_at": "2025-10-16T10:35:00Z",
  "elapsed_time": 300
}
```

---

## 🔧 분석 도구 통합

### 도구 선택 및 역할

#### JavaScript/TypeScript
| 도구 | 카테고리 | 설치 방법 | 실행 방식 |
|------|----------|-----------|-----------|
| **ESLint** | Quality, Security | npm install eslint | subprocess |
| **eslint-plugin-security** | Security | npm install eslint-plugin-security | ESLint 플러그인 |
| **@typescript-eslint/eslint-plugin** | Quality | npm install @typescript-eslint/eslint-plugin | ESLint 플러그인 |

#### Python
| 도구 | 카테고리 | 설치 방법 | 실행 방식 |
|------|----------|-----------|-----------|
| **Bandit** | Security | pip install bandit | subprocess |
| **Pylint** | Quality | pip install pylint | subprocess |
| **Flake8** | Quality | pip install flake8 | subprocess |

#### 커스텀 패턴
| 패턴 | 카테고리 | 검사 내용 |
|------|----------|-----------|
| `console.log` | Quality | Production 코드에 남아있는 디버그 로그 |
| `TODO/FIXME` | Quality | 미완성 코드 표시 |
| Hardcoded secrets | Security | API 키, 비밀번호 하드코딩 |

### Python Backend 구현

#### 1. 분석 오케스트레이터

```python
# backend/services/analysis_orchestrator.py

import asyncio
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor
from models.schemas import AnalysisTask, AnalysisStatus, Issue

class AnalysisOrchestrator:
    def __init__(self):
        self.active_tasks: Dict[str, AnalysisTask] = {}
        self.executor = ThreadPoolExecutor(max_workers=3)

    async def start_analysis(
        self,
        analysis_id: str,
        project_path: str,
        selected_files: List[str],
        categories: List[str]
    ) -> None:
        """비동기로 분석 시작"""

        # 태스크 생성
        task = AnalysisTask(
            id=analysis_id,
            project_path=project_path,
            files=selected_files,
            status=AnalysisStatus.PENDING,
            progress=0.0
        )
        self.active_tasks[analysis_id] = task

        # 백그라운드로 실행
        asyncio.create_task(self._run_analysis(task, categories))

    async def _run_analysis(
        self,
        task: AnalysisTask,
        categories: List[str]
    ) -> None:
        """실제 분석 실행"""

        try:
            task.status = AnalysisStatus.RUNNING
            task.total_files = len(task.files)

            # 파일을 언어별로 그룹화
            js_files = [f for f in task.files if f.endswith(('.js', '.ts', '.jsx', '.tsx'))]
            py_files = [f for f in task.files if f.endswith('.py')]

            all_issues = []

            # 병렬 실행
            if js_files:
                js_analyzer = JavaScriptAnalyzer(task.project_path)
                js_issues = await self._analyze_with_progress(
                    js_analyzer, js_files, task
                )
                all_issues.extend(js_issues)

            if py_files:
                py_analyzer = PythonAnalyzer(task.project_path)
                py_issues = await self._analyze_with_progress(
                    py_analyzer, py_files, task
                )
                all_issues.extend(py_issues)

            # 커스텀 패턴 분석
            custom_analyzer = CustomPatternAnalyzer()
            custom_issues = await self._analyze_with_progress(
                custom_analyzer, task.files, task
            )
            all_issues.extend(custom_issues)

            # 완료
            task.status = AnalysisStatus.COMPLETED
            task.progress = 1.0
            task.issues = all_issues
            task.completed_at = datetime.utcnow()

        except Exception as e:
            task.status = AnalysisStatus.FAILED
            task.error = str(e)

    async def _analyze_with_progress(
        self,
        analyzer,
        files: List[str],
        task: AnalysisTask
    ) -> List[Issue]:
        """진행률을 업데이트하며 분석"""

        issues = []

        for i, file_path in enumerate(files):
            # 일시정지 확인
            while task.status == AnalysisStatus.PAUSED:
                await asyncio.sleep(1)

            # 취소 확인
            if task.status == AnalysisStatus.CANCELLED:
                break

            # 파일 분석
            file_issues = await analyzer.analyze_file(file_path)
            issues.extend(file_issues)

            # 진행률 업데이트
            task.completed_files = i + 1
            task.progress = task.completed_files / task.total_files
            task.current_file = file_path

            # 실시간 요약 업데이트
            task.live_summary = self._calculate_summary(task.issues + issues)

        return issues

    def pause_analysis(self, analysis_id: str) -> None:
        """분석 일시정지"""
        if analysis_id in self.active_tasks:
            self.active_tasks[analysis_id].status = AnalysisStatus.PAUSED

    def resume_analysis(self, analysis_id: str) -> None:
        """분석 재개"""
        if analysis_id in self.active_tasks:
            self.active_tasks[analysis_id].status = AnalysisStatus.RUNNING

    def cancel_analysis(self, analysis_id: str) -> None:
        """분석 중단"""
        if analysis_id in self.active_tasks:
            self.active_tasks[analysis_id].status = AnalysisStatus.CANCELLED

    def get_status(self, analysis_id: str) -> Dict:
        """상태 조회"""
        if analysis_id not in self.active_tasks:
            raise ValueError(f"Analysis {analysis_id} not found")

        task = self.active_tasks[analysis_id]

        return {
            "analysis_id": analysis_id,
            "status": task.status.value,
            "progress": task.progress,
            "current_file": task.current_file,
            "completed_files": task.completed_files,
            "total_files": task.total_files,
            "elapsed_time": (datetime.utcnow() - task.created_at).total_seconds(),
            "estimated_remaining": self._estimate_remaining(task),
            "live_summary": task.live_summary,
            "updated_at": datetime.utcnow().isoformat()
        }
```

#### 2. ESLint 분석기

```python
# backend/services/javascript_analyzer.py

import subprocess
import json
from typing import List
from models.schemas import Issue, Severity, Category

class JavaScriptAnalyzer:
    def __init__(self, project_path: str):
        self.project_path = project_path

    async def analyze_file(self, file_path: str) -> List[Issue]:
        """ESLint로 파일 분석"""

        # ESLint 실행
        cmd = [
            'npx', 'eslint',
            '--format', 'json',
            '--config', '.eslintrc.json',
            file_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=self.project_path
        )

        # 결과 파싱
        eslint_output = json.loads(result.stdout)

        issues = []
        for file_result in eslint_output:
            for message in file_result.get('messages', []):
                issue = Issue(
                    file=file_result['filePath'],
                    line=message['line'],
                    column=message['column'],
                    severity=self._map_severity(message['severity']),
                    category=self._map_category(message['ruleId']),
                    rule=message['ruleId'],
                    message=message['message'],
                    tool='ESLint'
                )
                issues.append(issue)

        return issues

    def _map_severity(self, eslint_severity: int) -> Severity:
        """ESLint severity를 내부 형식으로 변환"""
        if eslint_severity == 2:
            return Severity.HIGH
        else:
            return Severity.MEDIUM

    def _map_category(self, rule_id: str) -> Category:
        """Rule ID를 카테고리로 매핑"""
        SECURITY_RULES = ['no-eval', 'security/detect-sql-injection', ...]
        PERFORMANCE_RULES = ['no-loop-func', ...]

        if rule_id in SECURITY_RULES:
            return Category.SECURITY
        elif rule_id in PERFORMANCE_RULES:
            return Category.PERFORMANCE
        else:
            return Category.QUALITY
```

#### 3. Python 분석기 (Bandit)

```python
# backend/services/python_analyzer.py

import subprocess
import json
from typing import List
from models.schemas import Issue, Severity, Category

class PythonAnalyzer:
    async def analyze_file(self, file_path: str) -> List[Issue]:
        """Bandit으로 파일 분석"""

        cmd = [
            'bandit',
            '-f', 'json',
            file_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )

        bandit_output = json.loads(result.stdout)

        issues = []
        for result in bandit_output.get('results', []):
            issue = Issue(
                file=result['filename'],
                line=result['line_number'],
                column=0,
                severity=self._map_severity(result['issue_severity']),
                category=Category.SECURITY,
                rule=result['test_id'],
                message=result['issue_text'],
                code_snippet=result['code'],
                tool='Bandit'
            )
            issues.append(issue)

        return issues

    def _map_severity(self, bandit_severity: str) -> Severity:
        mapping = {
            'HIGH': Severity.CRITICAL,
            'MEDIUM': Severity.HIGH,
            'LOW': Severity.MEDIUM
        }
        return mapping.get(bandit_severity, Severity.LOW)
```

#### 4. FastAPI 엔드포인트

```python
# backend/main.py

from fastapi import FastAPI, HTTPException
from models.schemas import AnalysisStartRequest, AnalysisStartResponse
from services.analysis_orchestrator import AnalysisOrchestrator
import uuid

app = FastAPI()
orchestrator = AnalysisOrchestrator()

@app.post("/api/analysis/start", response_model=AnalysisStartResponse)
async def start_analysis(request: AnalysisStartRequest):
    """분석 시작"""

    analysis_id = str(uuid.uuid4())

    # 비동기로 분석 시작
    await orchestrator.start_analysis(
        analysis_id=analysis_id,
        project_path=request.project_path,
        selected_files=request.selected_files,
        categories=request.categories
    )

    return AnalysisStartResponse(
        analysis_id=analysis_id,
        status="PENDING",
        message="분석이 시작되었습니다"
    )

@app.get("/api/analysis/{analysis_id}/status")
async def get_analysis_status(analysis_id: str):
    """상태 조회"""
    try:
        return orchestrator.get_status(analysis_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/analysis/{analysis_id}/pause")
async def pause_analysis(analysis_id: str):
    """일시정지"""
    orchestrator.pause_analysis(analysis_id)
    return {"status": "PAUSED", "message": "분석이 일시정지되었습니다"}

@app.post("/api/analysis/{analysis_id}/resume")
async def resume_analysis(analysis_id: str):
    """재개"""
    orchestrator.resume_analysis(analysis_id)
    return {"status": "RUNNING", "message": "분석이 재개되었습니다"}

@app.post("/api/analysis/{analysis_id}/cancel")
async def cancel_analysis(analysis_id: str):
    """중단"""
    orchestrator.cancel_analysis(analysis_id)
    return {"status": "CANCELLED", "message": "분석이 취소되었습니다"}
```

---

## 📱 Frontend 구현

### 1. Phase2 Store (Zustand)

```typescript
// frontend/src/stores/phase2Store.ts

import { create } from 'zustand';

export enum AnalysisStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

interface LiveSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface Phase2State {
  // 분석 상태
  analysisId: string | null;
  status: AnalysisStatus;
  progress: number;
  currentFile: string | null;
  completedFiles: number;
  totalFiles: number;
  elapsedTime: number;
  estimatedRemaining: number;
  liveSummary: LiveSummary | null;
  error: string | null;

  // Actions
  startAnalysis: (selectedFiles: string[], projectPath: string) => Promise<void>;
  fetchStatus: () => Promise<void>;
  pauseAnalysis: () => Promise<void>;
  resumeAnalysis: () => Promise<void>;
  cancelAnalysis: () => Promise<void>;
  reset: () => void;
}

export const usePhase2Store = create<Phase2State>((set, get) => ({
  analysisId: null,
  status: AnalysisStatus.IDLE,
  progress: 0,
  currentFile: null,
  completedFiles: 0,
  totalFiles: 0,
  elapsedTime: 0,
  estimatedRemaining: 0,
  liveSummary: null,
  error: null,

  startAnalysis: async (selectedFiles, projectPath) => {
    try {
      const response = await fetch('/api/analysis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_path: projectPath,
          selected_files: selectedFiles,
          categories: ['security', 'performance', 'quality']
        })
      });

      const data = await response.json();

      set({
        analysisId: data.analysis_id,
        status: AnalysisStatus.PENDING,
        progress: 0,
        totalFiles: selectedFiles.length
      });
    } catch (error) {
      set({
        status: AnalysisStatus.FAILED,
        error: error.message
      });
    }
  },

  fetchStatus: async () => {
    const { analysisId } = get();
    if (!analysisId) return;

    try {
      const response = await fetch(`/api/analysis/${analysisId}/status`);
      const data = await response.json();

      set({
        status: data.status,
        progress: data.progress,
        currentFile: data.current_file,
        completedFiles: data.completed_files,
        totalFiles: data.total_files,
        elapsedTime: data.elapsed_time,
        estimatedRemaining: data.estimated_remaining,
        liveSummary: data.live_summary
      });
    } catch (error) {
      set({
        status: AnalysisStatus.FAILED,
        error: error.message
      });
    }
  },

  pauseAnalysis: async () => {
    const { analysisId } = get();
    await fetch(`/api/analysis/${analysisId}/pause`, { method: 'POST' });
    set({ status: AnalysisStatus.PAUSED });
  },

  resumeAnalysis: async () => {
    const { analysisId } = get();
    await fetch(`/api/analysis/${analysisId}/resume`, { method: 'POST' });
    set({ status: AnalysisStatus.RUNNING });
  },

  cancelAnalysis: async () => {
    const { analysisId } = get();
    await fetch(`/api/analysis/${analysisId}/cancel`, { method: 'POST' });
    set({ status: AnalysisStatus.CANCELLED });
  },

  reset: () => {
    set({
      analysisId: null,
      status: AnalysisStatus.IDLE,
      progress: 0,
      currentFile: null,
      completedFiles: 0,
      totalFiles: 0,
      error: null
    });
  }
}));
```

### 2. Phase2 페이지 컴포넌트

```typescript
// frontend/src/pages/Phase2Page.tsx

import React, { useEffect } from 'react';
import { usePhase2Store, AnalysisStatus } from '@/stores/phase2Store';
import { ProgressBar } from '@/components/ProgressBar';
import { LiveIssueSummary } from '@/components/LiveIssueSummary';

export const Phase2Page: React.FC = () => {
  const {
    status,
    progress,
    currentFile,
    completedFiles,
    totalFiles,
    elapsedTime,
    estimatedRemaining,
    liveSummary,
    error,
    fetchStatus,
    pauseAnalysis,
    resumeAnalysis,
    cancelAnalysis,
  } = usePhase2Store();

  // 폴링 (2초마다)
  useEffect(() => {
    if (status === AnalysisStatus.RUNNING || status === AnalysisStatus.PENDING) {
      const interval = setInterval(() => {
        fetchStatus();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [status, fetchStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === AnalysisStatus.IDLE) {
    return <div>No analysis in progress</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-3xl">
        <div className="bg-white rounded-lg shadow-lg p-8">

          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              {status === AnalysisStatus.RUNNING && '🔍 코드 분석 중...'}
              {status === AnalysisStatus.PAUSED && '⏸️ 분석 일시정지됨'}
              {status === AnalysisStatus.COMPLETED && '✅ 분석 완료!'}
              {status === AnalysisStatus.FAILED && '❌ 분석 실패'}
              {status === AnalysisStatus.CANCELLED && '🚫 분석 취소됨'}
            </h1>
          </div>

          {/* 진행률 바 */}
          {(status === AnalysisStatus.RUNNING || status === AnalysisStatus.PAUSED) && (
            <>
              <ProgressBar
                progress={progress * 100}
                completedFiles={completedFiles}
                totalFiles={totalFiles}
              />

              {/* 현재 상태 */}
              <div className="mt-6 space-y-2 text-gray-700">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📄</span>
                  <span>현재 파일: <code className="text-sm bg-gray-100 px-2 py-1 rounded">{currentFile}</code></span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⏱️</span>
                  <span>소요 시간: {formatTime(elapsedTime)}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⏳</span>
                  <span>예상 남은 시간: {formatTime(estimatedRemaining)}</span>
                </div>
              </div>

              {/* 실시간 이슈 요약 */}
              {liveSummary && (
                <LiveIssueSummary summary={liveSummary} />
              )}

              {/* 제어 버튼 */}
              <div className="mt-8 flex gap-4">
                {status === AnalysisStatus.RUNNING && (
                  <>
                    <button
                      onClick={pauseAnalysis}
                      className="px-6 py-3 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                    >
                      ⏸️ 일시 정지
                    </button>
                    <button
                      onClick={cancelAnalysis}
                      className="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      ⏹️ 중단
                    </button>
                  </>
                )}
                {status === AnalysisStatus.PAUSED && (
                  <>
                    <button
                      onClick={resumeAnalysis}
                      className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600"
                    >
                      ▶️ 재개
                    </button>
                    <button
                      onClick={cancelAnalysis}
                      className="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      ⏹️ 중단
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* 완료 메시지 */}
          {status === AnalysisStatus.COMPLETED && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-xl text-gray-700 mb-4">
                분석이 완료되었습니다!
              </p>
              <p className="text-gray-600 mb-6">
                총 {liveSummary?.total || 0}개의 이슈가 발견되었습니다
              </p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                결과 보기 →
              </button>
            </div>
          )}

          {/* 에러 메시지 */}
          {status === AnalysisStatus.FAILED && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 mb-4">{error}</p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                돌아가기
              </button>
            </div>
          )}

          {/* 취소 메시지 */}
          {status === AnalysisStatus.CANCELLED && (
            <div className="text-center py-8">
              <p className="text-gray-700 mb-4">분석이 취소되었습니다</p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 3. 진행률 바 컴포넌트

```typescript
// frontend/src/components/ProgressBar.tsx

import React from 'react';

interface ProgressBarProps {
  progress: number;  // 0-100
  completedFiles: number;
  totalFiles: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  completedFiles,
  totalFiles
}) => {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          진행률
        </span>
        <span className="text-sm font-medium text-gray-700">
          {Math.round(progress)}% ({completedFiles}/{totalFiles})
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
          style={{ width: `${progress}%` }}
        >
          {progress > 5 && (
            <span className="text-xs text-white font-medium">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 4. 실시간 이슈 요약 컴포넌트

```typescript
// frontend/src/components/LiveIssueSummary.tsx

import React from 'react';

interface LiveSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface LiveIssueSummaryProps {
  summary: LiveSummary;
}

export const LiveIssueSummary: React.FC<LiveIssueSummaryProps> = ({ summary }) => {
  return (
    <div className="mt-6 bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        발견된 이슈 (실시간)
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-2xl mr-2">🔴</span>
            <span className="text-gray-700">Critical</span>
          </span>
          <span className="text-xl font-bold text-red-600">{summary.critical}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-2xl mr-2">🟠</span>
            <span className="text-gray-700">High</span>
          </span>
          <span className="text-xl font-bold text-orange-600">{summary.high}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-2xl mr-2">🟡</span>
            <span className="text-gray-700">Medium</span>
          </span>
          <span className="text-xl font-bold text-yellow-600">{summary.medium}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-2xl mr-2">🟢</span>
            <span className="text-gray-700">Low</span>
          </span>
          <span className="text-xl font-bold text-green-600">{summary.low}</span>
        </div>
        <div className="pt-3 border-t border-gray-300">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">Total</span>
            <span className="text-2xl font-bold text-blue-600">{summary.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🔄 Extension 메시지 통신

### Extension에서 추가할 핸들러

```typescript
// src/dashboardPanel.ts 수정

private async _handleMessage(message: any) {
  switch (message.type) {
    // 기존 핸들러들...

    case 'startAnalysis':
      // 분석 시작 요청을 Python Backend로 프록시
      const startResponse = await fetch(
        `${this._serverManager.getServerUrl()}/api/analysis/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.data)
        }
      );

      this._panel.webview.postMessage({
        type: 'analysisStarted',
        data: await startResponse.json()
      });
      break;

    case 'fetchAnalysisStatus':
      // 상태 조회
      const statusResponse = await fetch(
        `${this._serverManager.getServerUrl()}/api/analysis/${message.analysisId}/status`
      );

      this._panel.webview.postMessage({
        type: 'analysisStatus',
        data: await statusResponse.json()
      });
      break;

    case 'pauseAnalysis':
      await fetch(
        `${this._serverManager.getServerUrl()}/api/analysis/${message.analysisId}/pause`,
        { method: 'POST' }
      );
      break;

    case 'resumeAnalysis':
      await fetch(
        `${this._serverManager.getServerUrl()}/api/analysis/${message.analysisId}/resume`,
        { method: 'POST' }
      );
      break;

    case 'cancelAnalysis':
      await fetch(
        `${this._serverManager.getServerUrl()}/api/analysis/${message.analysisId}/cancel`,
        { method: 'POST' }
      );
      break;
  }
}
```

---

## ✅ Phase 2-1 완료 조건

### Backend
- [ ] `AnalysisOrchestrator` 구현
- [ ] `JavaScriptAnalyzer` (ESLint) 구현
- [ ] `PythonAnalyzer` (Bandit) 구현
- [ ] `CustomPatternAnalyzer` 구현
- [ ] 비동기 백그라운드 분석 작업
- [ ] 일시정지/재개/중단 기능
- [ ] 진행률 및 상태 업데이트
- [ ] API 엔드포인트 구현

### Frontend
- [ ] `phase2Store` (Zustand) 구현
- [ ] `Phase2Page` 컴포넌트 구현
- [ ] `ProgressBar` 컴포넌트 구현
- [ ] `LiveIssueSummary` 컴포넌트 구현
- [ ] 2초 폴링 구현
- [ ] 상태별 UI 분기 처리
- [ ] Phase 1에서 Phase 2로 자동 이동

### Extension
- [ ] 분석 관련 메시지 핸들러 추가
- [ ] API 프록시 구현

### 테스트
- [ ] 분석 시작 및 완료 플로우 테스트
- [ ] 일시정지/재개/중단 기능 테스트
- [ ] 진행률 표시 정확도 테스트
- [ ] 에러 처리 테스트
- [ ] 성능 테스트 (1000개 파일 기준 < 5분)

---

## 🔜 다음 단계: Phase 2-2

Phase 2-1 완료 후 Phase 2-2에서 구현할 내용:

- **대시보드 설계**: Summary Cards, Charts (Donut, Bar)
- **이슈 리스트**: 페이지네이션, 가상 스크롤링
- **필터링**: 카테고리, 심각도, 파일별 필터
- **정렬**: 심각도, 파일, 라인별 정렬
- **이슈 상세 모달**: 코드 컨텍스트, 추천 사항
- **리포트 내보내기**: JSON, CSV, HTML

---

## 📦 필요한 라이브러리

### Backend (requirements.txt에 추가)
```
# 기존 의존성
fastapi==0.104.0
uvicorn[standard]==0.24.0
pydantic==2.5.0

# Phase 2-1 추가
pylint==3.0.0
bandit==1.7.5
flake8==6.1.0
```

### Frontend (package.json에 추가)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "zustand": "^4.4.0"
  }
}
```

---

## 🎯 결론

Phase 2-1에서는 VS Code Extension 환경에서 비동기 백그라운드 분석과 실시간 진행률 표시를 구현합니다. Python Backend에서 ESLint, Bandit 등의 도구를 subprocess로 실행하고, Frontend에서는 2초 간격의 HTTP 폴링으로 상태를 업데이트하여 사용자에게 실시간 피드백을 제공합니다.

Phase 2-2에서는 분석 결과를 시각화하는 대시보드와 필터링, 내보내기 기능을 구현할 예정입니다.

---

**작성자**: Claude Code
**검토**: Phase 2-1 설계 완료
**다음 작업**: Phase 2-1 구현 시작
