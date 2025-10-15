# Phase 3: AI 심층 분석

## 📋 개요

### 목표
Phase 2에서 발견된 이슈 중 사용자가 선택한 것들을 Ollama 로컬 LLM으로 심층 분석하여 구체적인 개선 방안과 코드 예시 제공

### 주요 기능
- 선택적 AI 분석 (사용자가 이슈 선택)
- Ollama 로컬 LLM 연동 (CodeLlama 7B)
- 컨텍스트 풍부한 프롬프트 생성
- 구조화된 AI 응답 파싱
- AI 분석 결과 시각화
- 결과 저장 및 히스토리 관리

---

## 🎯 Part 1: AI 분석 트리거

### 분석 요청 방법

#### 방법 1: 개별 이슈 분석
```
[Issue Card]
┌────────────────────────────────────────┐
│ 🔴 security/detect-sql-injection       │
│ src/api/users.js:45                    │
│                                        │
│ [View Details] [🤖 AI Analysis →]      │
└────────────────────────────────────────┘
```

#### 방법 2: 일괄 분석
```
[Dashboard Controls]
┌────────────────────────────────────────┐
│ ☑ Issue 1 (Critical)                   │
│ ☑ Issue 2 (High)                       │
│ ☐ Issue 3 (Medium)                     │
│                                        │
│ [🤖 Analyze Selected (2 issues)]       │
└────────────────────────────────────────┘
```

### AI 분석 큐 관리

```typescript
interface AIAnalysisQueue {
  pending: string[];      // 대기 중인 이슈 ID
  processing: string[];   // 처리 중인 이슈 ID
  completed: string[];    // 완료된 이슈 ID
  failed: string[];       // 실패한 이슈 ID
}

interface AIAnalysisStore {
  queue: AIAnalysisQueue;
  results: Record<string, AIAnalysisResult>;
  
  addToQueue: (issueIds: string[]) => void;
  processNext: () => Promise<void>;
  getResult: (issueId: string) => AIAnalysisResult | null;
}
```

---

## 🧠 Part 2: Ollama 연동

### Ollama API 호출

```python
import httpx
from typing import AsyncGenerator

class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.model = "codellama:7b"
    
    async def generate(
        self, 
        prompt: str,
        system_prompt: str = ""
    ) -> AsyncGenerator[str, None]:
        """스트리밍 방식으로 응답 생성"""
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": True,
            "options": {
                "temperature": 0.3,  # 일관된 분석
                "top_p": 0.9,
                "max_tokens": 2000
            }
        }
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream('POST', url, json=payload) as response:
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if not data.get('done'):
                            yield data.get('response', '')
    
    async def generate_complete(self, prompt: str, system_prompt: str = "") -> str:
        """전체 응답을 한 번에 받기"""
        full_response = ""
        async for chunk in self.generate(prompt, system_prompt):
            full_response += chunk
        return full_response
```

### 모델 선택

**추천 모델 우선순위:**
1. `codellama:7b` (추천 - 빠르고 정확)
2. `deepseek-coder:6.7b` (대안 1)
3. `qwen2.5-coder:7b` (대안 2)

```python
async def select_best_model() -> str:
    """사용 가능한 모델 중 최적 선택"""
    ollama = OllamaClient()
    
    response = await httpx.get(f"{ollama.base_url}/api/tags")
    installed = [m['name'] for m in response.json()['models']]
    
    for model in AVAILABLE_MODELS:
        if model in installed:
            return model
    
    raise Exception("No suitable code model found")
```

---

## 📝 Part 3: 프롬프트 엔지니어링

### 시스템 프롬프트

```python
SYSTEM_PROMPT = """You are an expert code reviewer and security analyst specializing in {language}.

Your role is to:
1. Analyze code issues in depth
2. Explain the root cause and potential impact
3. Provide specific, actionable recommendations
4. Suggest concrete code improvements with examples

Response format (use this exact structure):
## Summary
[Brief overview of the issue]

## Root Cause
[Detailed explanation of why this is problematic]

## Impact
[Potential consequences if not fixed]

## Severity Assessment
[Your assessment: CRITICAL/HIGH/MEDIUM/LOW and why]

## Recommendations
[Step-by-step improvement suggestions]

## Code Example
### Before
```{language}
[problematic code]
```

### After
```{language}
[improved code]
```

## Additional Notes
[Any other relevant information]
"""
```

### 이슈별 프롬프트 생성

```python
def build_analysis_prompt(
    issue: Issue,
    file_content: str,
    project_structure: Optional[str] = None
) -> str:
    """이슈 컨텍스트를 포함한 프롬프트 생성"""
    
    code_context = extract_code_context(file_content, issue.line, context_lines=10)
    
    prompt = f"""# Code Analysis Request

## Issue Information
- **File**: {issue.file}
- **Line**: {issue.line}
- **Rule**: {issue.rule}
- **Category**: {issue.category}
- **Severity**: {issue.severity}
- **Description**: {issue.message}

## Code Context
```{get_language_from_file(issue.file)}
{code_context}
```

## Full File Content
```{get_language_from_file(issue.file)}
{file_content}
```
"""
    
    if project_structure:
        prompt += f"""
## Project Structure
{project_structure}
"""
    
    prompt += """
Please analyze this issue thoroughly and provide your structured response.
"""
    
    return prompt
```

---

## ⚠️ Part 4: 에러 처리

### 주요 에러 타입

```python
class AIErrorType(str, Enum):
    CONNECTION_FAILED = 'connection_failed'
    MODEL_NOT_FOUND = 'model_not_found'
    TIMEOUT = 'timeout'
    INSUFFICIENT_MEMORY = 'insufficient_memory'
    PARSING_FAILED = 'parsing_failed'
    RATE_LIMIT = 'rate_limit'
    UNKNOWN = 'unknown'

class AIAnalysisException(Exception):
    def __init__(
        self,
        error_type: AIErrorType,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        issue_id: Optional[str] = None,
        recoverable: bool = False
    ):
        self.error_type = error_type
        self.message = message
        self.details = details or {}
        self.issue_id = issue_id
        self.recoverable = recoverable
```

### 에러별 처리 전략

| 에러 타입 | 복구 방법 | UI 액션 |
|----------|----------|---------|
| `CONNECTION_FAILED` | Ollama 실행 확인, 재연결 | [Retry Connection] |
| `MODEL_NOT_FOUND` | 대체 모델 사용 | [Use Alternative] [Install Model] |
| `TIMEOUT` | 재시도 (3회) | [Retry] [Skip] |
| `INSUFFICIENT_MEMORY` | 메모리 대기, 작은 모델 사용 | [Wait] [Use Smaller Model] |
| `PARSING_FAILED` | 부분 파싱, 원본 표시 | [View Raw] [Retry] |

### 재시도 로직

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type(httpx.TimeoutException),
    reraise=True
)
async def analyze_with_retry(
    issue_id: str,
    issue: Issue,
    file_content: str
) -> AIAnalysisResult:
    """재시도 로직이 포함된 AI 분석"""
    # 분석 로직
```

---

## 🚀 Part 5: 배치 최적화

### 배치 처리 전략

**권장: 배치 순차 처리**
- 배치 크기: 3개 (동시 처리)
- 최대 동시 요청: 2개 (세마포어)

```python
class BatchAIAnalyzer:
    def __init__(
        self,
        batch_size: int = 3,
        max_concurrent: int = 2
    ):
        self.batch_size = batch_size
        self.semaphore = asyncio.Semaphore(max_concurrent)
    
    async def analyze_batch(
        self,
        issues: List[Tuple[str, Issue, str]]
    ) -> List[AIAnalysisResult]:
        """이슈들을 배치로 분석"""
        
        results = []
        total = len(issues)
        
        for i in range(0, total, self.batch_size):
            batch = issues[i:i + self.batch_size]
            
            batch_results = await self._process_batch_parallel(batch)
            results.extend(batch_results)
            
            progress = min(1.0, (i + len(batch)) / total)
            await self.update_progress(progress)
            
            if i + self.batch_size < total:
                await asyncio.sleep(1)
        
        return results
```

### 동적 배치 크기 조정

```python
def calculate_optimal_batch_size(self) -> int:
    """시스템 리소스 기반 배치 크기 계산"""
    
    available_memory_mb = self.resource_monitor.get_available_memory_mb()
    cpu_percent = psutil.cpu_percent(interval=1)
    
    if available_memory_mb < 2000:
        batch_size = 1
    elif available_memory_mb < 4000:
        batch_size = 2
    else:
        batch_size = 3
    
    if cpu_percent > 80:
        batch_size = max(1, batch_size - 1)
    
    return batch_size
```

### 우선순위 기반 처리

```python
def sort_by_priority(
    self,
    issues: List[Tuple[str, Issue, str]]
) -> List[Tuple[str, Issue, str]]:
    """심각도 우선순위로 정렬"""
    
    return sorted(
        issues,
        key=lambda x: (
            SEVERITY_PRIORITY.get(x[1].severity, 99),
            x[1].category == Category.SECURITY,  # 보안 우선
            x[1].file
        )
    )
```

### AI 분석 결과 캐싱

```python
class AIAnalysisCache:
    def get_cache_key(self, issue: Issue, file_content: str) -> str:
        """이슈와 파일 내용으로 캐시 키 생성"""
        content_hash = hashlib.sha256(file_content.encode()).hexdigest()
        issue_hash = hashlib.sha256(
            f"{issue.rule}:{issue.line}:{issue.message}".encode()
        ).hexdigest()
        
        return f"{issue_hash}_{content_hash[:16]}"
    
    def get_cached_analysis(
        self,
        issue: Issue,
        file_content: str
    ) -> Optional[AIAnalysisResult]:
        """캐시된 분석 결과 조회 (7일 유효)"""
        cache_key = self.get_cache_key(issue, file_content)
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if cache_file.exists():
            if time.time() - cache_file.stat().st_mtime < 7 * 86400:
                with open(cache_file, 'r') as f:
                    return AIAnalysisResult(**json.load(f))
        
        return None
```

### 컨텍스트 최적화

```python
class ContextOptimizer:
    def optimize_file_content(
        self,
        file_content: str,
        issue_line: int,
        max_lines: int = 100
    ) -> str:
        """파일 내용 최적화 (이슈 주변만 포함)"""
        
        lines = file_content.split('\n')
        
        if len(lines) <= max_lines:
            return file_content
        
        context_lines = max_lines // 2
        start = max(0, issue_line - context_lines - 1)
        end = min(len(lines), issue_line + context_lines)
        
        # 함수 시작점 찾기
        important_start = self._find_function_start(lines, issue_line)
        if important_start is not None:
            start = min(start, important_start)
        
        return '\n'.join(lines[start:end])
```

---

## 💾 Part 6: 결과 저장 및 히스토리

### 저장 구조

```
.code_review_data/
├── analyses/
│   ├── {analysis_id}/
│   │   ├── metadata.json
│   │   ├── static_results.json
│   │   ├── ai_results/
│   │   │   ├── {issue_id_1}.json
│   │   │   └── {issue_id_2}.json
│   │   └── report.html
│   └── ...
├── cache/
│   └── ai_analysis/
├── config/
└── history.json
```

### 분석 메타데이터

```python
class AnalysisMetadata(BaseModel):
    analysis_id: str
    project_path: str
    project_name: str
    created_at: datetime
    completed_at: Optional[datetime]
    
    total_files: int
    analyzed_files: int
    selected_files: List[str]
    
    filter_config: FilterConfig
    
    static_analysis: Dict[str, Any]
    ai_analysis: Dict[str, Any]
    
    app_version: str
    tools_version: Dict[str, str]
    
    duration_seconds: float
    static_analysis_time: float
    ai_analysis_time: float
```

### 저장 서비스

```python
class AnalysisStorage:
    def save_analysis(
        self,
        analysis_id: str,
        metadata: AnalysisMetadata,
        static_results: AnalysisResult,
        ai_results: Optional[List[AIAnalysisResult]] = None
    ):
        """분석 결과 저장"""
        
        analysis_dir = self.analyses_dir / analysis_id
        analysis_dir.mkdir(exist_ok=True)
        
        # 메타데이터
        with open(analysis_dir / 'metadata.json', 'w') as f:
            json.dump(metadata.dict(), f, indent=2, default=str)
        
        # 정적 분석 결과
        with open(analysis_dir / 'static_results.json', 'w') as f:
            json.dump(static_results.dict(), f, indent=2, default=str)
        
        # AI 분석 결과
        if ai_results:
            ai_dir = analysis_dir / 'ai_results'
            ai_dir.mkdir(exist_ok=True)
            
            for ai_result in ai_results:
                file_path = ai_dir / f"{ai_result.issue_id}.json"
                with open(file_path, 'w') as f:
                    json.dump(ai_result.dict(), f, indent=2, default=str)
        
        self._update_history_index(metadata)
    
    def load_analysis(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """분석 결과 로드"""
        # 로드 로직
    
    def list_analyses(
        self,
        project_path: Optional[str] = None,
        limit: int = 20
    ) -> List[AnalysisMetadata]:
        """분석 목록 조회"""
        # 목록 조회 로직
```

### 히스토리 비교

```python
class AnalysisComparator:
    def compare_analyses(
        self,
        analysis_id_1: str,
        analysis_id_2: str
    ) -> Dict[str, Any]:
        """두 분석 결과 비교"""
        
        return {
            'issues': self._compare_issue_counts(),
            'severity': self._compare_severity_distribution(),
            'diff': self._diff_issues(),  # 새로운/해결된 이슈
            'categories': self._compare_categories()
        }
```

---

## 🎨 Part 7: AI 결과 UI

### AI 분석 상태 표시

```
[대기 중]
┌────────────────────────────────────────┐
│ 🔴 security/detect-sql-injection       │
│ [🤖 AI Analysis: Queued (3/5)]         │
└────────────────────────────────────────┘

[분석 중]
┌────────────────────────────────────────┐
│ 🔴 security/detect-sql-injection       │
│ [🤖 Analyzing... ⏳]                   │
│ ████████░░░░░░░░░░░░ Generating...     │
└────────────────────────────────────────┘

[완료]
┌────────────────────────────────────────┐
│ 🔴 security/detect-sql-injection       │
│ [✅ AI Analysis Complete - View]       │
└────────────────────────────────────────┘
```

### AI 결과 모달

```
┌─────────────────────────────────────────────────────┐
│ 🤖 AI Analysis Result                      [✕ Close]│
├─────────────────────────────────────────────────────┤
│                                                      │
│ 📋 Summary                                          │
│ This SQL injection vulnerability occurs because...  │
│                                                      │
│ 🔍 Root Cause                                       │
│ The application constructs SQL queries using...     │
│                                                      │
│ ⚠️ Impact                                            │
│ • Unauthorized data access                          │
│ • Data modification or deletion                     │
│                                                      │
│ 🎯 AI Severity: 🔴 CRITICAL                         │
│                                                      │
│ 💡 Recommendations                                   │
│ 1. Use parameterized queries                        │
│ 2. Implement input validation                       │
│                                                      │
│ 📝 Code Suggestion                                  │
│ ❌ Before:                                           │
│ ```javascript                                       │
│ const query = `SELECT * FROM users WHERE id=${id}`;│
│ ```                                                  │
│                                                      │
│ ✅ After:                                            │
│ ```javascript                                       │
│ const query = 'SELECT * FROM users WHERE id = ?';  │
│ return await db.execute(query, [id]);              │
│ ```                                                  │
│                                                      │
│ [Copy Code] [Apply to File] [Dismiss]               │
└─────────────────────────────────────────────────────┘
```

### 진행률 UI

```
┌─────────────────────────────────────────────┐
│ 🤖 AI Analysis Progress                     │
│                                             │
│ ████████████░░░░░░░░░░ 60% (3/5)           │
│                                             │
│ ✅ Completed: 3                             │
│ ⏳ Processing: 1 (security/detect-sqli)     │
│ 📋 Pending: 1                               │
│                                             │
│ Estimated time remaining: ~2 minutes        │
│                                             │
│ [Cancel Remaining]                          │
└─────────────────────────────────────────────┘
```

### 히스토리 비교 UI

```
┌─────────────────────────────────────────────────────┐
│  Comparison: Oct 14 vs Oct 15                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📊 Overall Change                                  │
│  Total Issues: 32 → 27 (↓ 5, -15%)                 │
│                                                      │
│  🎯 By Severity                                     │
│  Critical:  3 → 2  (↓ 1)                            │
│  High:      7 → 5  (↓ 2)                            │
│  Medium:   15 → 12 (↓ 3)                            │
│  Low:       7 → 8  (↑ 1)                            │
│                                                      │
│  ✅ Resolved Issues (5)                             │
│  • security/sql-injection (src/api/users.js:45)     │
│  • quality/complexity (src/utils/parser.js:120)     │
│                                                      │
│  ⚠️ New Issues (0)                                  │
│  No new issues detected!                            │
│                                                      │
│  [Export Report] [Close]                            │
└─────────────────────────────────────────────────────┘
```

---

## ⚙️ Part 8: 설정 및 커스터마이징

### AI 분석 설정

```typescript
interface AIAnalysisConfig {
  model: string;              // 사용할 모델
  temperature: number;        // 0.0 - 1.0
  maxTokens: number;          // 응답 최대 길이
  timeout: number;            // 초 단위
  includeProjectStructure: boolean;
  contextLines: number;       // 코드 컨텍스트 라인 수
}

const DEFAULT_AI_CONFIG: AIAnalysisConfig = {
  model: 'codellama:7b',
  temperature: 0.3,
  maxTokens: 2000,
  timeout: 300,
  includeProjectStructure: true,
  contextLines: 10
};
```

---

## 📊 Part 9: 성능 메트릭

### 예상 처리 시간

| 이슈 수 | 순차 처리 | 배치 처리 | 캐시 활용 | 최적화 통합 |
|--------|----------|----------|----------|------------|
| 5개 | 10분 | 5분 | 2분 (60% hit) | 3분 |
| 10개 | 20분 | 8분 | 3분 (50% hit) | 5분 |
| 20개 | 40분 | 15분 | 6분 (40% hit) | 10분 |
| 50개 | 100분 | 35분 | 12분 (30% hit) | 20분 |

### 최적화 효과

| 최적화 기법 | 예상 개선률 |
|------------|------------|
| 배치 처리 | 40-50% |
| 우선순위 정렬 | 10-20% (체감) |
| 캐싱 | 50-80% (재분석) |
| 컨텍스트 최적화 | 20-30% |
| 동적 배치 크기 | 10-15% |

---

## 📡 Part 10: API 설계

### AI 분석 API

```
POST /api/ai-analysis/start
Request:
{
  "analysis_id": "uuid-1234",
  "issue_ids": ["issue-1", "issue-2"]
}

Response:
{
  "queue_id": "queue-5678",
  "status": "pending",
  "total_issues": 2
}
```

```
GET /api/ai-analysis/{queue_id}/status
Response:
{
  "queue_id": "queue-5678",
  "status": "processing",
  "progress": 0.5,
  "completed": 1,
  "total": 2,
  "current_issue": "issue-2",
  "estimated_remaining_seconds": 120
}
```

```
GET /api/ai-analysis/result/{issue_id}
Response:
{
  "issue_id": "issue-1",
  "status": "completed",
  "result": {
    "summary": "...",
    "root_cause": "...",
    "suggestions": [...]
  }
}
```

### 히스토리 API

```
GET /api/history/list?project_path=/path&limit=20
GET /api/history/{analysis_id}
DELETE /api/history/{analysis_id}
POST /api/history/compare
GET /api/history/export/{analysis_id}?format=json
POST /api/history/cleanup?days=90
GET /api/history/storage/size
```

---

## ✅ Phase 3 완료 조건

### Part 1-3: 기본 AI 분석
- [ ] 이슈 선택 UI (개별/일괄)
- [ ] AI 분석 큐 관리
- [ ] Ollama 연결 및 모델 선택
- [ ] 시스템 프롬프트 구현
- [ ] 이슈별 프롬프트 생성

### Part 4: 에러 처리
- [ ] 연결 에러 처리
- [ ] 모델 미설치 처리
- [ ] 타임아웃 재시도
- [ ] 메모리 부족 처리
- [ ] 파싱 에러 폴백
- [ ] 통합 에러 클래스

### Part 5: 배치 최적화
- [ ] 배치 순차 처리
- [ ] 동적 배치 크기 조정
- [ ] 우선순위 정렬
- [ ] AI 결과 캐싱
- [ ] 컨텍스트 최적화
- [ ] 상세 진행률 추적

### Part 6: 저장 및 히스토리
- [ ] 로컬 저장 구조
- [ ] 메타데이터 저장/로드
- [ ] AI 결과 저장
- [ ] 히스토리 목록 조회
- [ ] 분석 결과 비교
- [ ] 리포트 내보내기
- [ ] 오래된 분석 정리

### Part 7: UI
- [ ] AI 분석 상태 표시
- [ ] AI 결과 모달
- [ ] 진행률 표시
- [ ] 히스토리 목록 화면
- [ ] 비교 결과 화면

---

## 📦 필요한 라이브러리

### Backend
- `httpx`: Ollama API 호출
- `asyncio`: 비동기 처리
- `tenacity`: 재시도 로직
- `psutil`: 리소스 모니터링
- `hashlib`: 캐시 키 생성

### Frontend
- `react-markdown`: AI 응답 렌더링
- `react-syntax-highlighter`: 코드 표시
- `zustand`: AI 분석 상태 관리

---

## 🔜 다음 단계

Phase 3 완료 후:
- 전체 시스템 통합 테스트
- 성능 벤치마크
- 사용자 피드백 수집
- 문서화 완성

---

## 💡 추가 개선 아이디어 (Phase 4+)

- WebSocket을 통한 실시간 스트리밍 응답
- 여러 모델 동시 비교 (CodeLlama vs DeepSeek)
- AI 학습 피드백 (좋아요/싫어요)
- 커스텀 프롬프트 템플릿
- 팀 공유용 AI 분석 리포트
- CI/CD 통합 (자동 AI 분석)
