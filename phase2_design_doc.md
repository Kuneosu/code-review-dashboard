# Phase 2: 정적 분석 및 대시보드

## 📋 개요

### 목표
Phase 1에서 선택된 파일들을 정적 분석 도구로 분석하여 보안/성능/품질 이슈를 탐지하고, 결과를 직관적인 대시보드로 시각화

### 주요 기능
- 비동기 백그라운드 분석
- 실시간 진행률 표시
- 여러 분석 도구 통합 (ESLint, Bandit, Pylint 등)
- 인터랙티브 대시보드
- 필터링 및 정렬
- 리포트 내보내기
- 대규모 프로젝트 성능 최적화

---

## 🔄 Part 1: 분석 실행 흐름

### 분석 방식: 비동기 백그라운드 분석

**실행 플로우:**
```
사용자 "분석 시작" 클릭
    ↓
Backend에 분석 작업 요청
    ↓
분석 ID 즉시 반환 (비동기 작업 시작)
    ↓
Frontend HTTP 폴링 (2초마다 상태 확인)
    ↓
분석 완료 시 대시보드 자동 이동
```

### 분석 상태 관리

#### 상태 전이:
```
IDLE → PENDING → RUNNING ⇄ PAUSED
                    ↓         ↓
                COMPLETED  CANCELLED
                    ↓         ↓
                 (종료)   FAILED
```

#### 상태별 동작:

| 상태 | 진행률 | 사용 가능 액션 | 설명 |
|------|--------|---------------|------|
| `PENDING` | 0% | [중단] | 분석 대기 중 |
| `RUNNING` | 1-99% | [일시정지] [중단] | 분석 진행 중 |
| `PAUSED` | 고정 | [재개] [중단] | 일시정지 상태 |
| `COMPLETED` | 100% | [결과 보기] | 분석 완료 |
| `FAILED` | - | [재시도] [닫기] | 에러 발생 |
| `CANCELLED` | - | [닫기] | 사용자가 취소 |

### 진행률 표시 UI

```
┌─────────────────────────────────────────────┐
│  🔍 코드 분석 중...                         │
│                                             │
│  ████████████░░░░░░░░░░ 60% (27/45)        │
│                                             │
│  현재 파일: src/components/Header.tsx       │
│  소요 시간: 00:02:34                        │
│                                             │
│  발견된 이슈:                                │
│  🔴 Critical: 2                             │
│  🟠 High: 5                                 │
│  🟡 Medium: 12                              │
│  🟢 Low: 8                                  │
│                                             │
│  [일시 정지]  [중단]                        │
└─────────────────────────────────────────────┘
```

### API 설계

#### 분석 시작
```
POST /api/analysis/start

Request:
{
  "project_path": "/home/user/my-project",
  "selected_files": [...],
  "categories": ["security", "performance", "quality"]
}

Response:
{
  "analysis_id": "uuid-1234-5678",
  "status": "PENDING",
  "message": "분석이 시작되었습니다"
}
```

#### 상태 조회 (폴링용)
```
GET /api/analysis/{analysis_id}/status

Response:
{
  "analysis_id": "uuid-1234-5678",
  "status": "RUNNING",
  "progress": 0.65,
  "current_file": "src/components/Header.tsx",
  "completed_files": 29,
  "total_files": 45,
  "elapsed_time": 154,
  "estimated_remaining": 83,
  "issues_found": 27,
  "live_summary": {
    "critical": 2,
    "high": 5,
    "medium": 12,
    "low": 8
  }
}
```

#### 제어 API
```
POST /api/analysis/{analysis_id}/pause
POST /api/analysis/{analysis_id}/resume
POST /api/analysis/{analysis_id}/cancel
GET /api/analysis/{analysis_id}/result
```

---

## 🔧 Part 2: 분석 도구 통합

### 도구 선택

#### JavaScript/TypeScript
| 도구 | 카테고리 | 역할 |
|------|----------|------|
| ESLint + Airbnb config | Quality, Security | 코드 품질, 보안 패턴 |
| eslint-plugin-security | Security | XSS, SQL injection 등 |
| typescript-eslint | Quality | TypeScript 전용 규칙 |

#### Python
| 도구 | 카테고리 | 역할 |
|------|----------|------|
| Bandit | Security | 보안 취약점 스캔 |
| Pylint | Quality | 코드 품질, 복잡도 |
| Flake8 | Quality | PEP8 스타일 가이드 |
| Safety | Security | 의존성 취약점 |
| Radon | Performance | 순환 복잡도 |

#### 커스텀
| 도구 | 카테고리 | 역할 |
|------|----------|------|
| 정규식 패턴 매칭 | All | console.log, TODO, 하드코딩된 시크릿 |

### 도구 실행 아키텍처

```
Python Backend
    ↓
AnalysisOrchestrator
    ↓
├─ JavaScriptAnalyzer
│   ├─ ESLint (subprocess)
│   └─ Custom Patterns
├─ PythonAnalyzer
│   ├─ Bandit (subprocess)
│   ├─ Pylint (subprocess)
│   ├─ Flake8 (subprocess)
│   └─ Radon (library)
└─ ResultAggregator
    └─ 통합 결과 생성
```

### Subprocess 실행 예시

```python
import subprocess
import json

def run_eslint(file_paths: List[str]) -> List[Issue]:
    """ESLint를 subprocess로 실행"""
    cmd = [
        'npx', 'eslint',
        '--format', 'json',
        '--config', '.eslintrc.json',
        *file_paths
    ]
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=project_path
    )
    
    eslint_output = json.loads(result.stdout)
    return parse_eslint_results(eslint_output)
```

### 결과 통합 및 매핑

#### 카테고리 매핑
```python
RULE_CATEGORY_MAP = {
    # Security
    'no-eval': Category.SECURITY,
    'security/detect-sql-injection': Category.SECURITY,
    
    # Performance
    'no-loop-func': Category.PERFORMANCE,
    
    # Quality (default)
    'no-unused-vars': Category.QUALITY,
    'complexity': Category.QUALITY,
}
```

#### 심각도 매핑
```python
def map_eslint_severity(eslint_severity: int) -> Severity:
    if eslint_severity == 2:
        return Severity.HIGH
    else:
        return Severity.MEDIUM

def map_bandit_severity(bandit_severity: str) -> Severity:
    mapping = {
        'HIGH': Severity.CRITICAL,
        'MEDIUM': Severity.HIGH,
        'LOW': Severity.MEDIUM
    }
    return mapping.get(bandit_severity, Severity.LOW)
```

### 병렬 처리 전략

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def analyze_project(files: List[str]) -> AnalysisResult:
    """여러 도구를 병렬로 실행"""
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        js_files = [f for f in files if f.endswith(('.js', '.ts'))]
        py_files = [f for f in files if f.endswith('.py')]
        
        futures = []
        
        if js_files:
            futures.append(executor.submit(run_eslint, js_files))
        
        if py_files:
            futures.append(executor.submit(run_bandit, py_files))
            futures.append(executor.submit(run_pylint, py_files))
        
        results = []
        for future in futures:
            results.extend(future.result())
        
        return aggregate_results(results)
```

### 커스텀 패턴 분석

```python
CUSTOM_PATTERNS = [
    {
        'id': 'console-log',
        'pattern': r'console\.(log|debug|info)',
        'category': Category.QUALITY,
        'severity': Severity.LOW,
        'message': 'Remove console.log before production'
    },
    {
        'id': 'hardcoded-secret',
        'pattern': r'(password|secret|api_key)\s*=\s*["\'][^"\']+["\']',
        'category': Category.SECURITY,
        'severity': Severity.CRITICAL,
        'message': 'Possible hardcoded secret'
    },
]
```

### 도구 설정 관리

#### ESLint (.eslintrc.json)
```json
{
  "extends": [
    "airbnb-base",
    "plugin:security/recommended"
  ],
  "plugins": ["security"],
  "rules": {
    "no-console": "warn",
    "no-eval": "error",
    "complexity": ["warn", 10]
  }
}
```

#### Bandit (.bandit)
```yaml
tests:
  - B201  # flask_debug_true
  - B301  # pickle
  - B307  # eval

skips:
  - B404  # import_subprocess
```

---

## 📊 Part 3: 대시보드 설계

### 전체 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  Smart Code Review - Analysis Result                │
├─────────────────────────────────────────────────────┤
│  [Summary Cards]                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │Total   │ │Security│ │Perform │ │Quality │      │
│  └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                     │
│  [Charts]                                          │
│  ┌──────────────┐  ┌──────────────┐              │
│  │Severity Pie  │  │Category Bar  │              │
│  └──────────────┘  └──────────────┘              │
│                                                     │
│  [Filters & Controls]                              │
│  Category: [All▼] Severity: [All▼]                │
│                                                     │
│  [Issues List]                                     │
│  🔴 security/detect-sql-injection                  │
│  src/api/users.js:45                               │
│  [View Details] [AI Analysis]                      │
└─────────────────────────────────────────────────────┘
```

### 1. Summary Cards

```
┌─────────────────┐  ┌─────────────────┐
│  🔍 Total       │  │  🔐 Security    │
│  27 Issues      │  │  7 Issues       │
│  ───────────    │  │  ───────────    │
│  45 files       │  │  🔴 2  🟠 3    │
└─────────────────┘  └─────────────────┘
```

**인터랙션:**
- 카드 클릭 시 해당 카테고리로 필터링
- 호버 시 상세 툴팁

### 2. Charts

#### Donut Chart (심각도 분포)
```typescript
<PieChart width={300} height={300}>
  <Pie
    data={severityData}
    cx="50%"
    cy="50%"
    innerRadius={60}
    outerRadius={80}
    dataKey="value"
  />
</PieChart>
```

#### Bar Chart (카테고리별)
- 카테고리별 이슈 수
- 클릭 시 해당 카테고리 필터링

### 3. Filter & Controls

```typescript
interface FilterOptions {
  category: Category | 'all';
  severity: Severity | 'all';
  file: string | 'all';
  tool: string | 'all';
  searchQuery: string;
}
```

**UI:**
```
Category: [All ▼] [Security] [Performance] [Quality]
Severity: [All ▼] [Critical] [High] [Medium] [Low]
File: [All files ▼]
Search: [________________] 🔍

Sort by: [Severity ▼] Order: [Desc ▼]

[Clear Filters] [Export Report] [Select for AI →]
```

### 4. Issues List

#### 이슈 카드
```
┌────────────────────────────────────────────────────┐
│ 🔴 CRITICAL                                [☐ Select]│
│ security/detect-sql-injection               ESLint │
│                                                     │
│ 📄 src/api/users.js:45:12                          │
│ ───────────────────────────────────────────────────│
│ Possible SQL injection vulnerability detected      │
│                                                     │
│ 💾 Code:                                            │
│   const query = `SELECT * FROM users WHERE id=${id}`;│
│                                                     │
│ [View Details] [View File] [AI Analysis →]         │
└────────────────────────────────────────────────────┘
```

**기능:**
- 페이지네이션 (20개/페이지)
- 가상 스크롤링
- 다중 선택 (AI 분석용)
- 정렬 (심각도, 파일, 라인)

### 5. Issue Detail Modal

```
┌─────────────────────────────────────────────────────┐
│ Issue Details                              [✕ Close] │
├─────────────────────────────────────────────────────┤
│ 🔴 CRITICAL - security/detect-sql-injection         │
│ Tool: ESLint (eslint-plugin-security)               │
│                                                      │
│ Location: src/api/users.js:45:12                    │
│                                                      │
│ ─────────────────────────────────────────────────── │
│ Description:                                        │
│ Possible SQL injection vulnerability...             │
│                                                      │
│ ─────────────────────────────────────────────────── │
│ Code Context:                                       │
│ 43 | async function getUserById(id) {               │
│ 44 |   try {                                        │
│ 45 |     const query = `SELECT * FROM users ...`;   │
│ 46 |     return await db.execute(query);            │
│                                                      │
│ ─────────────────────────────────────────────────── │
│ Recommendation:                                     │
│ Use parameterized queries...                        │
│                                                      │
│ [Open in Editor] [Request AI Analysis]              │
└─────────────────────────────────────────────────────┘
```

### 6. Export Report

**지원 포맷:**
- JSON (전체 데이터)
- CSV (표 형식)
- HTML (보고서)
- PDF (추후)

```typescript
interface ExportOptions {
  format: 'json' | 'csv' | 'html';
  includeCodeSnippets: boolean;
  filterOptions: FilterOptions;
}
```

### 색상 시스템

```typescript
// 심각도 색상
const SEVERITY_COLORS = {
  critical: '#EF4444',  // Red
  high: '#F97316',      // Orange
  medium: '#F59E0B',    // Amber
  low: '#10B981'        // Green
};

// 카테고리 색상
const CATEGORY_COLORS = {
  security: '#DC2626',    // Red
  performance: '#2563EB', // Blue
  quality: '#7C3AED'      // Purple
};
```

---

## ⚡ Part 4: 성능 최적화

### 성능 목표

| 프로젝트 규모 | 파일 수 | 목표 분석 시간 | 목표 대시보드 로딩 |
|--------------|---------|----------------|-------------------|
| Small | ~50 | < 30초 | < 1초 |
| Medium | 50-500 | < 3분 | < 2초 |
| Large | 500-2000 | < 10분 | < 3초 |
| Very Large | 2000+ | < 30분 | < 5초 |

### 1. 배치 처리

```python
class BatchAnalyzer:
    def __init__(self, batch_size: int = 50):
        self.batch_size = batch_size
    
    async def analyze_in_batches(
        self, 
        files: List[str],
        progress_callback: Callable
    ) -> List[Issue]:
        """파일을 배치로 나눠서 분석"""
        all_issues = []
        total_batches = math.ceil(len(files) / self.batch_size)
        
        for i, batch_start in enumerate(range(0, len(files), self.batch_size)):
            batch = files[batch_start:batch_start + self.batch_size]
            
            batch_issues = await self.analyze_batch(batch)
            all_issues.extend(batch_issues)
            
            progress = (i + 1) / total_batches
            progress_callback(progress, batch[-1])
            
            gc.collect()
        
        return all_issues
```

### 2. 병렬 처리

**멀티레벨 병렬화:**
- Level 1: 도구별 병렬 (ESLint, Bandit 동시 실행)
- Level 2: 파일별 병렬 (같은 도구 내 병렬)

```python
# CPU 코어 활용
MAX_WORKERS = multiprocessing.cpu_count()
OPTIMAL_WORKERS = max(1, MAX_WORKERS - 1)
```

### 3. 결과 캐싱

```python
class AnalysisCache:
    def get_file_hash(self, file_path: str) -> str:
        """파일 내용의 SHA256 해시"""
        with open(file_path, 'rb') as f:
            return hashlib.sha256(f.read()).hexdigest()
    
    def get_cached_result(
        self, 
        file_path: str, 
        tool: str
    ) -> Optional[List[Issue]]:
        """캐시된 결과 조회 (파일 해시 기반)"""
        file_hash = self.get_file_hash(file_path)
        cache_key = f"{tool}_{file_hash}"
        # 캐시 조회 로직
```

**캐시 무효화:**
- 파일 수정 시간이 캐시보다 최신
- 캐시가 24시간 이상 경과
- 분석 도구 버전 변경

### 4. Frontend 최적화

#### 가상 스크롤링
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={issues.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <IssueCard issue={issues[index]} />
    </div>
  )}
</FixedSizeList>
```

#### 메모이제이션
```typescript
const IssueCard = memo<IssueCardProps>(({ issue }) => {
  // 컴포넌트 내용
}, (prev, next) => prev.issue.id === next.issue.id);

// 계산 결과 캐싱
const stats = useMemo(() => {
  return calculateStats(issues);
}, [issues]);
```

#### 코드 스플리팅
```typescript
const AIAnalysisModal = lazy(() => import('./AIAnalysisModal'));

{showAIModal && (
  <Suspense fallback={<LoadingSpinner />}>
    <AIAnalysisModal />
  </Suspense>
)}
```

### 5. 데이터 페이지네이션

```python
@app.get("/api/analysis/{analysis_id}/issues")
async def get_issues(
    analysis_id: str,
    page: int = 1,
    size: int = 20,
    category: Optional[Category] = None,
    severity: Optional[Severity] = None
):
    """이슈 페이지네이션 조회"""
    issues = get_analysis_issues(analysis_id)
    
    # 필터 적용
    if category:
        issues = [i for i in issues if i.category == category]
    
    # 페이지네이션
    start = (page - 1) * size
    end = start + size
    
    return {
        "page": page,
        "total": len(issues),
        "items": issues[start:end]
    }
```

### 6. 메모리 관리

```python
class MemoryEfficientAnalyzer:
    async def analyze_with_memory_limit(
        self, 
        files: List[str]
    ) -> List[Issue]:
        """메모리 사용량 모니터링하며 분석"""
        for i, file in enumerate(files):
            if self.get_memory_usage() > self.max_memory_mb:
                self.save_partial_results()
                gc.collect()
            
            issues = await self.analyze_file(file)
            
            if i % 50 == 0:
                gc.collect()
```

### 예상 성능 개선

| 최적화 기법 | 예상 개선률 |
|------------|------------|
| 배치 처리 | 20-30% |
| 병렬 처리 | 40-60% |
| 캐싱 | 50-80% (재분석) |
| 가상 스크롤 | 90%+ (UI) |
| 메모이제이션 | 30-50% (리렌더링) |

---

## ✅ Phase 2 완료 조건

### Part 1: 분석 실행
- [ ] 비동기 분석 작업 시작/관리
- [ ] 실시간 진행률 표시
- [ ] HTTP 폴링 (2초 간격)
- [ ] 일시정지/재개/중단 기능
- [ ] 에러 처리

### Part 2: 도구 통합
- [ ] ESLint 실행 및 파싱
- [ ] Bandit, Pylint 실행 및 파싱
- [ ] 통일된 Issue 형식 변환
- [ ] 카테고리/심각도 자동 매핑
- [ ] 병렬 실행
- [ ] 커스텀 패턴 분석
- [ ] 도구 실패 처리

### Part 3: 대시보드
- [ ] Summary Cards (4개)
- [ ] 차트 (Donut, Bar)
- [ ] 필터링 시스템
- [ ] 이슈 리스트 (페이지네이션)
- [ ] 이슈 상세 모달
- [ ] 정렬 기능
- [ ] 다중 선택
- [ ] 리포트 내보내기

### Part 4: 성능 최적화
- [ ] 배치 처리
- [ ] 멀티레벨 병렬 처리
- [ ] 파일 캐싱
- [ ] 페이지네이션
- [ ] 가상 스크롤링
- [ ] 메모이제이션
- [ ] 메모리 관리

---

## 📦 필요한 라이브러리

### Backend
- `asyncio`: 비동기 처리
- `concurrent.futures`: 병렬 처리
- `psutil`: 메모리 모니터링
- `hashlib`: 파일 해싱

### Frontend
- `recharts`: 차트 라이브러리
- `react-window`: 가상 스크롤링
- `react-syntax-highlighter`: 코드 하이라이팅
- `zustand`: 상태 관리

---

## 🔜 다음 단계

Phase 2 완료 후 Phase 3로 이동:
- Ollama 연동
- AI 심층 분석
- 코드 개선 제안
- AI 결과 시각화
