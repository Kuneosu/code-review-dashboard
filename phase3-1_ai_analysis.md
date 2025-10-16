# Phase 3-1: AI 심층 분석 (Ollama 통합)

## 📋 개요

### 목표
Phase 2에서 발견된 이슈에 대해 **Ollama 로컬 LLM**을 활용한 심층 분석을 제공하여 구체적인 개선 방안, 코드 예시, 영향도 평가를 사용자에게 제공

### 주요 기능
- **이슈 선택형 AI 분석**: 사용자가 분석할 이슈 선택 (개별/일괄)
- **Ollama 로컬 LLM 연동**: CodeLlama 7B 기반 분석
- **실시간 진행률 표시**: 배치 처리 진행상황 실시간 업데이트
- **구조화된 AI 응답**: 요약, 원인, 영향, 권장사항, 코드 예시
- **결과 캐싱**: 중복 분석 방지 및 성능 최적화
- **히스토리 관리**: 분석 결과 저장 및 비교

### 아키텍처 요약
```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Frontend (React)                      │ │
│  │  ┌──────────────────┐  ┌──────────────────┐       │ │
│  │  │ DashboardPage    │  │ AIAnalysisModal  │       │ │
│  │  │ - Issue List     │  │ - AI Result      │       │ │
│  │  │ - Select Issues  │  │ - Progress       │       │ │
│  │  │ - Start AI       │  │ - History        │       │ │
│  │  └──────────────────┘  └──────────────────┘       │ │
│  │           ↕                      ↕                  │ │
│  │  ┌──────────────────────────────────────────┐      │ │
│  │  │      aiAnalysisStore (Zustand)           │      │ │
│  │  │  - Queue management                      │      │ │
│  │  │  - Progress tracking                     │      │ │
│  │  │  - Results storage                       │      │ │
│  │  └──────────────────────────────────────────┘      │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↕                               │
│                   Webview Messaging                      │
│                          ↕                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │            dashboardPanel.ts                       │ │
│  │  - API 프록시                                       │ │
│  │  - VS Code 통합                                     │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↕
                   HTTP (localhost:8000)
                           ↕
┌─────────────────────────────────────────────────────────┐
│              Backend (FastAPI Python)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │                api/phase3.py                       │ │
│  │  POST /api/ai-analysis/start                       │ │
│  │  GET  /api/ai-analysis/{queue_id}/status           │ │
│  │  GET  /api/ai-analysis/result/{issue_id}           │ │
│  │  GET  /api/history/list                            │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↕                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │          services/ai_analyzer.py                   │ │
│  │  - Ollama client                                   │ │
│  │  - Prompt engineering                              │ │
│  │  - Batch processing                                │ │
│  │  - Response parsing                                │ │
│  │  - Cache management                                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↕
                   HTTP (localhost:11434)
                           ↕
              ┌────────────────────────┐
              │    Ollama Service      │
              │  - CodeLlama 7B        │
              │  - Local inference     │
              └────────────────────────┘
```

---

## 🎯 구현 단계 (Stages)

### Stage 1: Ollama 연동 및 헬스체크

**Backend: Ollama 클라이언트 구현**

```python
# backend/services/ollama_client.py
import httpx
import json
from typing import AsyncGenerator, Optional, List, Dict, Any
from enum import Enum

class OllamaModel(str, Enum):
    CODELLAMA_7B = "codellama:7b"
    DEEPSEEK_CODER = "deepseek-coder:6.7b"
    QWEN_CODER = "qwen2.5-coder:7b"

class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.model = OllamaModel.CODELLAMA_7B

    async def health_check(self) -> Dict[str, Any]:
        """Ollama 서비스 연결 확인"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "status": "healthy",
                        "models": [m["name"] for m in data.get("models", [])]
                    }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }

    async def select_best_model(self) -> str:
        """사용 가능한 최적 모델 선택"""
        health = await self.health_check()

        if health["status"] != "healthy":
            raise Exception("Ollama service not available")

        available_models = health["models"]

        # 우선순위 순서로 확인
        for model in [OllamaModel.CODELLAMA_7B, OllamaModel.DEEPSEEK_CODER, OllamaModel.QWEN_CODER]:
            if model.value in available_models:
                self.model = model
                return model.value

        raise Exception("No suitable code model found. Please install: ollama pull codellama:7b")

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.3,
        max_tokens: int = 2000
    ) -> AsyncGenerator[str, None]:
        """스트리밍 방식으로 응답 생성"""
        url = f"{self.base_url}/api/generate"

        payload = {
            "model": self.model.value,
            "prompt": prompt,
            "system": system_prompt,
            "stream": True,
            "options": {
                "temperature": temperature,
                "top_p": 0.9,
                "num_predict": max_tokens
            }
        }

        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream('POST', url, json=payload) as response:
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if not data.get('done'):
                                yield data.get('response', '')
                        except json.JSONDecodeError:
                            continue

    async def generate_complete(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.3,
        max_tokens: int = 2000
    ) -> str:
        """전체 응답을 한 번에 받기"""
        full_response = ""
        async for chunk in self.generate(prompt, system_prompt, temperature, max_tokens):
            full_response += chunk
        return full_response
```

**API Endpoint: 헬스체크**

```python
# backend/api/phase3.py
from fastapi import APIRouter, HTTPException
from services.ollama_client import OllamaClient

router = APIRouter(prefix="/api/ai", tags=["Phase 3: AI Analysis"])

ollama = OllamaClient()

@router.get("/health")
async def check_ollama_health():
    """Ollama 서비스 상태 확인"""
    health = await ollama.health_check()

    if health["status"] == "healthy":
        return {
            "status": "healthy",
            "available_models": health["models"],
            "selected_model": ollama.model.value
        }
    else:
        return {
            "status": "unhealthy",
            "error": health.get("error"),
            "suggestion": "Please start Ollama: ollama serve"
        }

@router.post("/initialize")
async def initialize_ai():
    """AI 분석 초기화 (모델 선택)"""
    try:
        model = await ollama.select_best_model()
        return {
            "status": "ready",
            "model": model,
            "message": f"AI analysis ready with {model}"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
```

---

### Stage 2: AI 분석 큐 관리 (Frontend Store)

**Zustand Store: AI 분석 상태 관리**

```typescript
// frontend/src/stores/aiAnalysisStore.ts
import { create } from 'zustand';
import { apiRequest } from '@/utils/api';

export interface AIAnalysisResult {
  issue_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';

  // AI 분석 결과
  summary?: string;
  root_cause?: string;
  impact?: string;
  ai_severity?: string;
  recommendations?: string[];
  code_before?: string;
  code_after?: string;
  additional_notes?: string;

  // 메타데이터
  analyzed_at?: string;
  model_used?: string;
  processing_time?: number;
  error?: string;
}

export interface AIAnalysisQueue {
  queue_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_issues: number;
  completed_issues: number;
  current_issue_id?: string;
  progress: number;
  estimated_remaining_seconds?: number;
}

interface AIAnalysisState {
  // Ollama 상태
  ollamaHealthy: boolean;
  ollamaModel: string | null;
  checkingHealth: boolean;

  // 분석 큐
  currentQueue: AIAnalysisQueue | null;

  // 분석 결과
  results: Record<string, AIAnalysisResult>;

  // UI 상태
  selectedIssueIds: Set<string>;
  showProgressModal: boolean;
  showResultModal: boolean;
  currentResultIssueId: string | null;

  // Actions
  checkOllamaHealth: () => Promise<void>;
  initializeAI: () => Promise<void>;
  toggleIssueSelection: (issueId: string) => void;
  selectAllIssues: (issueIds: string[]) => void;
  clearSelection: () => void;
  startAnalysis: (analysisId: string, issueIds: string[]) => Promise<void>;
  pollQueueStatus: (queueId: string) => Promise<void>;
  loadResult: (issueId: string) => Promise<void>;
  showResult: (issueId: string) => void;
  closeResultModal: () => void;
  reset: () => void;
}

export const useAIAnalysisStore = create<AIAnalysisState>((set, get) => ({
  // Initial state
  ollamaHealthy: false,
  ollamaModel: null,
  checkingHealth: false,
  currentQueue: null,
  results: {},
  selectedIssueIds: new Set(),
  showProgressModal: false,
  showResultModal: false,
  currentResultIssueId: null,

  // Check Ollama health
  checkOllamaHealth: async () => {
    set({ checkingHealth: true });

    try {
      const response = await apiRequest('/api/ai/health', 'GET');

      set({
        ollamaHealthy: response.status === 'healthy',
        ollamaModel: response.selected_model || null,
        checkingHealth: false,
      });
    } catch (error) {
      console.error('[AI] Health check failed:', error);
      set({
        ollamaHealthy: false,
        ollamaModel: null,
        checkingHealth: false,
      });
    }
  },

  // Initialize AI
  initializeAI: async () => {
    try {
      const response = await apiRequest('/api/ai/initialize', 'POST');

      set({
        ollamaHealthy: response.status === 'ready',
        ollamaModel: response.model,
      });
    } catch (error: any) {
      console.error('[AI] Initialization failed:', error);
      throw new Error(error.message || 'Failed to initialize AI');
    }
  },

  // Toggle issue selection
  toggleIssueSelection: (issueId: string) => {
    const { selectedIssueIds } = get();
    const newSelection = new Set(selectedIssueIds);

    if (newSelection.has(issueId)) {
      newSelection.delete(issueId);
    } else {
      newSelection.add(issueId);
    }

    set({ selectedIssueIds: newSelection });
  },

  // Select all issues
  selectAllIssues: (issueIds: string[]) => {
    set({ selectedIssueIds: new Set(issueIds) });
  },

  // Clear selection
  clearSelection: () => {
    set({ selectedIssueIds: new Set() });
  },

  // Start AI analysis
  startAnalysis: async (analysisId: string, issueIds: string[]) => {
    try {
      const response = await apiRequest('/api/ai/analyze', 'POST', {
        analysis_id: analysisId,
        issue_ids: issueIds,
      });

      set({
        currentQueue: {
          queue_id: response.queue_id,
          status: 'pending',
          total_issues: issueIds.length,
          completed_issues: 0,
          progress: 0,
        },
        showProgressModal: true,
      });

      // Start polling
      get().pollQueueStatus(response.queue_id);
    } catch (error: any) {
      console.error('[AI] Failed to start analysis:', error);
      throw new Error(error.message || 'Failed to start AI analysis');
    }
  },

  // Poll queue status
  pollQueueStatus: async (queueId: string) => {
    const poll = async () => {
      try {
        const status = await apiRequest(`/api/ai/queue/${queueId}/status`, 'GET');

        set({ currentQueue: status });

        // Load completed results
        if (status.completed_issues > 0) {
          const { selectedIssueIds, results } = get();

          for (const issueId of Array.from(selectedIssueIds)) {
            if (!results[issueId] || results[issueId].status === 'pending') {
              await get().loadResult(issueId);
            }
          }
        }

        // Continue polling if not done
        if (status.status === 'processing' || status.status === 'pending') {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          // Completed or failed
          set({ showProgressModal: false });
        }
      } catch (error) {
        console.error('[AI] Polling failed:', error);
      }
    };

    poll();
  },

  // Load result
  loadResult: async (issueId: string) => {
    try {
      const result = await apiRequest(`/api/ai/result/${issueId}`, 'GET');

      set((state) => ({
        results: {
          ...state.results,
          [issueId]: result,
        },
      }));
    } catch (error) {
      console.error(`[AI] Failed to load result for ${issueId}:`, error);
    }
  },

  // Show result modal
  showResult: (issueId: string) => {
    set({
      showResultModal: true,
      currentResultIssueId: issueId,
    });
  },

  // Close result modal
  closeResultModal: () => {
    set({
      showResultModal: false,
      currentResultIssueId: null,
    });
  },

  // Reset
  reset: () => {
    set({
      currentQueue: null,
      results: {},
      selectedIssueIds: new Set(),
      showProgressModal: false,
      showResultModal: false,
      currentResultIssueId: null,
    });
  },
}));
```

---

### Stage 3: 프롬프트 엔지니어링

**시스템 프롬프트 및 이슈별 프롬프트 생성**

```python
# backend/services/prompt_builder.py
from models.schemas import Issue
from typing import Optional
import os

SYSTEM_PROMPT_TEMPLATE = """You are an expert code reviewer and security analyst specializing in {language}.

Your role is to:
1. Analyze code issues in depth
2. Explain the root cause and potential impact
3. Provide specific, actionable recommendations
4. Suggest concrete code improvements with examples

Response format (use this exact structure):
## Summary
[Brief overview of the issue in 2-3 sentences]

## Root Cause
[Detailed explanation of why this is problematic and how it occurs]

## Impact
[Potential consequences if not fixed - security, performance, maintainability]

## Severity Assessment
[Your assessment: CRITICAL/HIGH/MEDIUM/LOW and detailed reasoning]

## Recommendations
[Step-by-step improvement suggestions, numbered list]

## Code Example
### Before
```{language}
[problematic code]
```

### After
```{language}
[improved code with explanations]
```

## Additional Notes
[Any other relevant information, best practices, or resources]
"""

class PromptBuilder:
    LANGUAGE_MAP = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.php': 'php',
    }

    def get_language_from_file(self, file_path: str) -> str:
        """파일 확장자로 언어 감지"""
        _, ext = os.path.splitext(file_path)
        return self.LANGUAGE_MAP.get(ext.lower(), 'code')

    def extract_code_context(
        self,
        file_content: str,
        target_line: int,
        context_lines: int = 10
    ) -> str:
        """이슈 라인 주변 코드 컨텍스트 추출"""
        lines = file_content.split('\n')

        start = max(0, target_line - context_lines - 1)
        end = min(len(lines), target_line + context_lines)

        context = []
        for i in range(start, end):
            line_num = i + 1
            marker = '>>> ' if line_num == target_line else '    '
            context.append(f"{marker}{line_num:4d} | {lines[i]}")

        return '\n'.join(context)

    def build_system_prompt(self, language: str) -> str:
        """시스템 프롬프트 생성"""
        return SYSTEM_PROMPT_TEMPLATE.format(language=language)

    def build_analysis_prompt(
        self,
        issue: Issue,
        file_content: str,
        context_lines: int = 10
    ) -> str:
        """이슈별 분석 프롬프트 생성"""
        language = self.get_language_from_file(issue.file)
        code_context = self.extract_code_context(file_content, issue.line, context_lines)

        prompt = f"""# Code Analysis Request

## Issue Information
- **File**: {issue.file}
- **Line**: {issue.line}, Column: {issue.column}
- **Rule**: {issue.rule}
- **Category**: {issue.category.value}
- **Severity**: {issue.severity.value}
- **Tool**: {issue.tool}
- **Description**: {issue.message}

## Code Context (±{context_lines} lines)
```{language}
{code_context}
```

## Code Snippet
```{language}
{issue.code_snippet if issue.code_snippet else '(No snippet available)'}
```

Please analyze this issue thoroughly and provide your structured response following the format above.
Focus on practical, actionable advice that a developer can immediately apply.
"""

        return prompt
```

---

### Stage 4: AI 분석 엔진 구현

**AI Analyzer with Batch Processing**

```python
# backend/services/ai_analyzer.py
import asyncio
import hashlib
import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from models.schemas import Issue, Severity, Category
from services.ollama_client import OllamaClient
from services.prompt_builder import PromptBuilder

class AIAnalysisResult:
    def __init__(
        self,
        issue_id: str,
        status: str,
        summary: Optional[str] = None,
        root_cause: Optional[str] = None,
        impact: Optional[str] = None,
        ai_severity: Optional[str] = None,
        recommendations: Optional[List[str]] = None,
        code_before: Optional[str] = None,
        code_after: Optional[str] = None,
        additional_notes: Optional[str] = None,
        analyzed_at: Optional[str] = None,
        model_used: Optional[str] = None,
        processing_time: Optional[float] = None,
        error: Optional[str] = None
    ):
        self.issue_id = issue_id
        self.status = status
        self.summary = summary
        self.root_cause = root_cause
        self.impact = impact
        self.ai_severity = ai_severity
        self.recommendations = recommendations or []
        self.code_before = code_before
        self.code_after = code_after
        self.additional_notes = additional_notes
        self.analyzed_at = analyzed_at
        self.model_used = model_used
        self.processing_time = processing_time
        self.error = error

    def to_dict(self) -> Dict[str, Any]:
        return {
            'issue_id': self.issue_id,
            'status': self.status,
            'summary': self.summary,
            'root_cause': self.root_cause,
            'impact': self.impact,
            'ai_severity': self.ai_severity,
            'recommendations': self.recommendations,
            'code_before': self.code_before,
            'code_after': self.code_after,
            'additional_notes': self.additional_notes,
            'analyzed_at': self.analyzed_at,
            'model_used': self.model_used,
            'processing_time': self.processing_time,
            'error': self.error
        }

class AIAnalyzer:
    def __init__(
        self,
        project_path: str,
        cache_dir: Optional[Path] = None,
        batch_size: int = 3,
        max_concurrent: int = 2
    ):
        self.project_path = project_path
        self.cache_dir = cache_dir or Path.home() / '.code_review_data' / 'cache' / 'ai_analysis'
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.batch_size = batch_size
        self.semaphore = asyncio.Semaphore(max_concurrent)

        self.ollama = OllamaClient()
        self.prompt_builder = PromptBuilder()

    def get_cache_key(self, issue: Issue, file_content: str) -> str:
        """캐시 키 생성"""
        content_hash = hashlib.sha256(file_content.encode()).hexdigest()
        issue_hash = hashlib.sha256(
            f"{issue.rule}:{issue.line}:{issue.message}".encode()
        ).hexdigest()

        return f"{issue_hash}_{content_hash[:16]}"

    def get_cached_result(
        self,
        issue: Issue,
        file_content: str
    ) -> Optional[AIAnalysisResult]:
        """캐시된 결과 조회 (7일 유효)"""
        cache_key = self.get_cache_key(issue, file_content)
        cache_file = self.cache_dir / f"{cache_key}.json"

        if cache_file.exists():
            # 7일 이내 캐시만 유효
            if time.time() - cache_file.stat().st_mtime < 7 * 86400:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    return AIAnalysisResult(**data)

        return None

    def save_to_cache(
        self,
        issue: Issue,
        file_content: str,
        result: AIAnalysisResult
    ):
        """결과 캐시 저장"""
        cache_key = self.get_cache_key(issue, file_content)
        cache_file = self.cache_dir / f"{cache_key}.json"

        with open(cache_file, 'w') as f:
            json.dump(result.to_dict(), f, indent=2)

    def parse_ai_response(self, response: str) -> Dict[str, Any]:
        """AI 응답 파싱"""
        sections = {
            'summary': '',
            'root_cause': '',
            'impact': '',
            'ai_severity': '',
            'recommendations': [],
            'code_before': '',
            'code_after': '',
            'additional_notes': ''
        }

        current_section = None
        code_block = None
        buffer = []

        for line in response.split('\n'):
            line_lower = line.lower().strip()

            # Section headers
            if line_lower.startswith('## summary'):
                current_section = 'summary'
                buffer = []
            elif line_lower.startswith('## root cause'):
                current_section = 'root_cause'
                buffer = []
            elif line_lower.startswith('## impact'):
                current_section = 'impact'
                buffer = []
            elif line_lower.startswith('## severity'):
                current_section = 'ai_severity'
                buffer = []
            elif line_lower.startswith('## recommendations'):
                current_section = 'recommendations'
                buffer = []
            elif line_lower.startswith('## code example'):
                current_section = 'code_example'
                buffer = []
            elif line_lower.startswith('### before'):
                code_block = 'before'
                buffer = []
            elif line_lower.startswith('### after'):
                code_block = 'after'
                buffer = []
            elif line_lower.startswith('## additional'):
                current_section = 'additional_notes'
                buffer = []
            elif line.strip().startswith('```'):
                # Code block delimiter
                if code_block and buffer:
                    if code_block == 'before':
                        sections['code_before'] = '\n'.join(buffer[1:])  # Skip first line (language)
                    elif code_block == 'after':
                        sections['code_after'] = '\n'.join(buffer[1:])
                    buffer = []
                continue
            else:
                # Content
                if current_section == 'recommendations':
                    if line.strip().startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '-', '*')):
                        sections['recommendations'].append(line.strip())
                elif current_section and current_section != 'code_example':
                    buffer.append(line)
                    sections[current_section] = '\n'.join(buffer).strip()

        return sections

    async def analyze_issue(
        self,
        issue_id: str,
        issue: Issue,
        file_content: str
    ) -> AIAnalysisResult:
        """단일 이슈 분석"""
        start_time = time.time()

        try:
            # Check cache
            cached = self.get_cached_result(issue, file_content)
            if cached:
                print(f"[AI] Using cached result for {issue_id}")
                return cached

            # Build prompts
            language = self.prompt_builder.get_language_from_file(issue.file)
            system_prompt = self.prompt_builder.build_system_prompt(language)
            user_prompt = self.prompt_builder.build_analysis_prompt(issue, file_content)

            # Generate AI response
            print(f"[AI] Analyzing {issue_id} with {self.ollama.model.value}...")
            response = await self.ollama.generate_complete(user_prompt, system_prompt)

            # Parse response
            parsed = self.parse_ai_response(response)

            # Create result
            result = AIAnalysisResult(
                issue_id=issue_id,
                status='completed',
                summary=parsed['summary'],
                root_cause=parsed['root_cause'],
                impact=parsed['impact'],
                ai_severity=parsed['ai_severity'],
                recommendations=parsed['recommendations'],
                code_before=parsed['code_before'],
                code_after=parsed['code_after'],
                additional_notes=parsed['additional_notes'],
                analyzed_at=datetime.utcnow().isoformat(),
                model_used=self.ollama.model.value,
                processing_time=time.time() - start_time
            )

            # Save to cache
            self.save_to_cache(issue, file_content, result)

            print(f"[AI] Completed {issue_id} in {result.processing_time:.1f}s")
            return result

        except Exception as e:
            print(f"[AI] Error analyzing {issue_id}: {e}")
            return AIAnalysisResult(
                issue_id=issue_id,
                status='failed',
                error=str(e),
                processing_time=time.time() - start_time
            )

    async def analyze_batch(
        self,
        issues: List[Tuple[str, Issue, str]]
    ) -> List[AIAnalysisResult]:
        """배치 분석 (세마포어로 동시 실행 제한)"""

        async def analyze_with_semaphore(issue_data):
            async with self.semaphore:
                issue_id, issue, file_content = issue_data
                return await self.analyze_issue(issue_id, issue, file_content)

        # Create tasks
        tasks = [analyze_with_semaphore(issue_data) for issue_data in issues]

        # Execute with progress
        results = []
        for i, task in enumerate(asyncio.as_completed(tasks)):
            result = await task
            results.append(result)
            print(f"[AI] Batch progress: {i+1}/{len(issues)} ({(i+1)/len(issues)*100:.1f}%)")

            # Small delay between completions
            if i < len(issues) - 1:
                await asyncio.sleep(0.5)

        return results
```

---

### Stage 5: Backend API 구현

**Phase 3 API Endpoints**

```python
# backend/api/phase3.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from services.ai_analyzer import AIAnalyzer, AIAnalysisResult
from services.analysis_orchestrator import AnalysisOrchestrator
from models.schemas import Issue

router = APIRouter(prefix="/api/ai", tags=["Phase 3: AI Analysis"])

# Global instances
orchestrator = AnalysisOrchestrator()
ai_queues: Dict[str, Dict[str, Any]] = {}
ai_results: Dict[str, AIAnalysisResult] = {}

class AIAnalysisRequest(BaseModel):
    analysis_id: str
    issue_ids: List[str]

@router.post("/analyze")
async def start_ai_analysis(request: AIAnalysisRequest, background_tasks: BackgroundTasks):
    """AI 분석 시작"""

    # Validate analysis
    if request.analysis_id not in orchestrator.active_tasks:
        raise HTTPException(status_code=404, detail="Analysis not found")

    task = orchestrator.active_tasks[request.analysis_id]

    # Find issues
    issues_to_analyze = []
    for issue_id in request.issue_ids:
        # Find issue in task.issues
        for i, issue in enumerate(task.issues):
            if f"{task.id}-{i}" == issue_id:
                issues_to_analyze.append((issue_id, issue))
                break

    if not issues_to_analyze:
        raise HTTPException(status_code=400, detail="No valid issues found")

    # Create queue
    queue_id = str(uuid.uuid4())
    ai_queues[queue_id] = {
        'queue_id': queue_id,
        'status': 'pending',
        'total_issues': len(issues_to_analyze),
        'completed_issues': 0,
        'current_issue_id': None,
        'progress': 0.0,
        'started_at': datetime.utcnow().isoformat()
    }

    # Start background processing
    background_tasks.add_task(
        process_ai_analysis,
        queue_id,
        task.project_path,
        issues_to_analyze
    )

    return {
        'queue_id': queue_id,
        'status': 'pending',
        'total_issues': len(issues_to_analyze)
    }

async def process_ai_analysis(
    queue_id: str,
    project_path: str,
    issues: List[tuple]
):
    """Background AI 분석 처리"""
    import os

    try:
        ai_queues[queue_id]['status'] = 'processing'

        analyzer = AIAnalyzer(project_path)

        # Prepare issue data with file content
        issues_with_content = []
        for issue_id, issue in issues:
            file_path = os.path.join(project_path, issue.file)

            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    file_content = f.read()

                issues_with_content.append((issue_id, issue, file_content))
            except Exception as e:
                print(f"[AI] Failed to read file {issue.file}: {e}")
                # Create failed result
                ai_results[issue_id] = AIAnalysisResult(
                    issue_id=issue_id,
                    status='failed',
                    error=f"Failed to read file: {str(e)}"
                )

        # Analyze in batch
        results = await analyzer.analyze_batch(issues_with_content)

        # Store results
        for result in results:
            ai_results[result.issue_id] = result

            ai_queues[queue_id]['completed_issues'] += 1
            ai_queues[queue_id]['progress'] = ai_queues[queue_id]['completed_issues'] / ai_queues[queue_id]['total_issues']

        ai_queues[queue_id]['status'] = 'completed'
        ai_queues[queue_id]['completed_at'] = datetime.utcnow().isoformat()

        print(f"[AI] Queue {queue_id} completed: {len(results)} issues analyzed")

    except Exception as e:
        print(f"[AI] Queue {queue_id} failed: {e}")
        ai_queues[queue_id]['status'] = 'failed'
        ai_queues[queue_id]['error'] = str(e)

@router.get("/queue/{queue_id}/status")
async def get_queue_status(queue_id: str):
    """AI 분석 큐 상태 조회"""
    if queue_id not in ai_queues:
        raise HTTPException(status_code=404, detail="Queue not found")

    return ai_queues[queue_id]

@router.get("/result/{issue_id}")
async def get_ai_result(issue_id: str):
    """AI 분석 결과 조회"""
    if issue_id not in ai_results:
        return {
            'issue_id': issue_id,
            'status': 'pending'
        }

    return ai_results[issue_id].to_dict()
```

**Register Router in main.py**

```python
# backend/main.py (추가)
from api.phase3 import router as phase3_router

app.include_router(phase3_router)
```

---

### Stage 6: 이슈 선택 UI (Dashboard Page 확장)

**DashboardPage에 AI 분석 기능 추가**

```typescript
// frontend/src/pages/DashboardPage.tsx (추가)
import { use AIAnalysisStore } from '@/stores/aiAnalysisStore';

// 컴포넌트 내부
const {
  ollamaHealthy,
  ollamaModel,
  checkingHealth,
  selectedIssueIds,
  checkOllamaHealth,
  initializeAI,
  toggleIssueSelection,
  selectAllIssues,
  clearSelection,
  startAnalysis,
} = useAIAnalysisStore();

// Ollama 헬스체크 (컴포넌트 마운트 시)
useEffect(() => {
  checkOllamaHealth();
}, []);

// AI 분석 UI (필터바 아래에 추가)
<div className="bg-white rounded-lg shadow p-4 mb-6">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <h3 className="text-lg font-semibold">🤖 AI Analysis</h3>

      {/* Ollama 상태 */}
      <div className="flex items-center gap-2">
        {checkingHealth ? (
          <span className="text-sm text-gray-500">Checking...</span>
        ) : ollamaHealthy ? (
          <span className="text-sm text-green-600">
            ✅ Ready ({ollamaModel})
          </span>
        ) : (
          <span className="text-sm text-red-600">
            ❌ Ollama not available
          </span>
        )}

        {!ollamaHealthy && !checkingHealth && (
          <button
            onClick={async () => {
              try {
                await initializeAI();
              } catch (error: any) {
                alert(error.message);
              }
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Initialize
          </button>
        )}
      </div>
    </div>

    {/* 선택된 이슈 수 */}
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">
        {selectedIssueIds.size} issues selected
      </span>

      <button
        onClick={() => {
          const allIssueIds = filteredAndSortedIssues.map(
            (_, i) => `${result.analysis_id}-${i}`
          );
          selectAllIssues(allIssueIds);
        }}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
      >
        Select All
      </button>

      <button
        onClick={clearSelection}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        disabled={selectedIssueIds.size === 0}
      >
        Clear
      </button>

      <button
        onClick={async () => {
          if (selectedIssueIds.size === 0) {
            alert('Please select at least one issue');
            return;
          }

          if (!ollamaHealthy) {
            alert('Ollama is not available. Please start Ollama service.');
            return;
          }

          try {
            await startAnalysis(
              result.analysis_id,
              Array.from(selectedIssueIds)
            );
          } catch (error: any) {
            alert(error.message);
          }
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        disabled={selectedIssueIds.size === 0 || !ollamaHealthy}
      >
        🤖 Analyze Selected ({selectedIssueIds.size})
      </button>
    </div>
  </div>
</div>

// 이슈 카드에 체크박스 및 AI 상태 추가
<div className="flex items-start gap-3">
  {/* 체크박스 */}
  <input
    type="checkbox"
    checked={selectedIssueIds.has(issueId)}
    onChange={() => toggleIssueSelection(issueId)}
    className="mt-1"
  />

  {/* 기존 이슈 카드 */}
  <div className="flex-1">
    {/* ... 기존 내용 ... */}

    {/* AI 분석 상태 */}
    {aiResults[issueId] && (
      <div className="mt-2">
        {aiResults[issueId].status === 'completed' && (
          <button
            onClick={() => showResult(issueId)}
            className="text-sm text-blue-600 hover:underline"
          >
            ✅ View AI Analysis
          </button>
        )}
        {aiResults[issueId].status === 'processing' && (
          <span className="text-sm text-gray-600">
            ⏳ AI analyzing...
          </span>
        )}
        {aiResults[issueId].status === 'failed' && (
          <span className="text-sm text-red-600">
            ❌ AI analysis failed
          </span>
        )}
      </div>
    )}
  </div>
</div>
```

---

### Stage 7: AI 진행률 모달

**AIProgressModal 컴포넌트**

```typescript
// frontend/src/components/AIProgressModal.tsx
import React from 'react';
import { useAIAnalysisStore } from '@/stores/aiAnalysisStore';

export const AIProgressModal: React.FC = () => {
  const { currentQueue, showProgressModal } = useAIAnalysisStore();

  if (!showProgressModal || !currentQueue) return null;

  const progressPercent = Math.round(currentQueue.progress * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">🤖 AI Analysis in Progress</h2>

        {/* 진행률 바 */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 상태 정보 */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium">{currentQueue.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Completed:</span>
            <span className="font-medium">
              {currentQueue.completed_issues} / {currentQueue.total_issues}
            </span>
          </div>
          {currentQueue.current_issue_id && (
            <div className="flex justify-between">
              <span className="text-gray-600">Current:</span>
              <span className="font-medium text-xs">
                {currentQueue.current_issue_id}
              </span>
            </div>
          )}
          {currentQueue.estimated_remaining_seconds && (
            <div className="flex justify-between">
              <span className="text-gray-600">Est. remaining:</span>
              <span className="font-medium">
                ~{Math.ceil(currentQueue.estimated_remaining_seconds / 60)} min
              </span>
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-gray-700">
          💡 AI analysis is running in the background. You can continue working.
        </div>
      </div>
    </div>
  );
};
```

---

### Stage 8: AI 결과 모달

**AIResultModal 컴포넌트**

```typescript
// frontend/src/components/AIResultModal.tsx
import React from 'react';
import { useAIAnalysisStore } from '@/stores/aiAnalysisStore';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const AIResultModal: React.FC = () => {
  const { results, showResultModal, currentResultIssueId, closeResultModal } =
    useAIAnalysisStore();

  if (!showResultModal || !currentResultIssueId) return null;

  const result = results[currentResultIssueId];

  if (!result || result.status !== 'completed') return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={closeResultModal}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <h2 className="text-2xl font-bold">AI Analysis Result</h2>
              <p className="text-sm text-gray-600">
                Model: {result.model_used} •
                Time: {result.processing_time?.toFixed(1)}s
              </p>
            </div>
          </div>
          <button
            onClick={closeResultModal}
            className="text-2xl text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          {result.summary && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                📋 Summary
              </h3>
              <p className="text-gray-700">{result.summary}</p>
            </section>
          )}

          {/* Root Cause */}
          {result.root_cause && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                🔍 Root Cause
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {result.root_cause}
              </p>
            </section>
          )}

          {/* Impact */}
          {result.impact && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                ⚠️ Impact
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{result.impact}</p>
            </section>
          )}

          {/* AI Severity Assessment */}
          {result.ai_severity && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                🎯 AI Severity Assessment
              </h3>
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">{result.ai_severity}</p>
              </div>
            </section>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                💡 Recommendations
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-gray-700">
                    {rec}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Code Example */}
          {(result.code_before || result.code_after) && (
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                📝 Code Suggestion
              </h3>

              {result.code_before && (
                <div className="mb-4">
                  <h4 className="text-md font-medium mb-2 text-red-600">
                    ❌ Before:
                  </h4>
                  <SyntaxHighlighter
                    language="javascript"
                    style={vscDarkPlus}
                    customStyle={{ borderRadius: '8px' }}
                  >
                    {result.code_before}
                  </SyntaxHighlighter>
                </div>
              )}

              {result.code_after && (
                <div>
                  <h4 className="text-md font-medium mb-2 text-green-600">
                    ✅ After:
                  </h4>
                  <SyntaxHighlighter
                    language="javascript"
                    style={vscDarkPlus}
                    customStyle={{ borderRadius: '8px' }}
                  >
                    {result.code_after}
                  </SyntaxHighlighter>
                </div>
              )}
            </section>
          )}

          {/* Additional Notes */}
          {result.additional_notes && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                📌 Additional Notes
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {result.additional_notes}
              </p>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-3">
          <button
            onClick={() => {
              if (result.code_after) {
                navigator.clipboard.writeText(result.code_after);
                alert('Improved code copied to clipboard!');
              }
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            disabled={!result.code_after}
          >
            Copy Improved Code
          </button>
          <button
            onClick={closeResultModal}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
```

**App.tsx에 모달 추가**

```typescript
// frontend/src/App.tsx (추가)
import { AIProgressModal } from '@/components/AIProgressModal';
import { AIResultModal } from '@/components/AIResultModal';

// JSX 최하단에 추가
<AIProgressModal />
<AIResultModal />
```

---

### Stage 9: 필수 라이브러리 설치

```bash
# Backend
cd backend
pip install httpx tenacity

# Frontend
cd frontend
npm install react-markdown react-syntax-highlighter
npm install --save-dev @types/react-syntax-highlighter
```

---

### Stage 10: 통합 테스트

**테스트 시나리오**:

1. **Ollama 설치 및 실행**:
   ```bash
   # macOS/Linux
   brew install ollama
   ollama serve

   # 다른 터미널에서
   ollama pull codellama:7b
   ```

2. **Backend 서버 시작**:
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```

3. **Extension Development Host 시작**:
   - VS Code에서 F5

4. **전체 워크플로우 테스트**:
   - ① Phase 1: 프로젝트 선택 및 필터링
   - ② Phase 2-1: 분석 실행
   - ③ Phase 2-2: 결과 대시보드 표시
   - ④ Ollama 헬스체크 (자동)
   - ⑤ 이슈 선택 (체크박스)
   - ⑥ AI 분석 시작
   - ⑦ 진행률 모달 표시
   - ⑧ 결과 확인 (View AI Analysis)
   - ⑨ AI 결과 모달에서 상세 정보 확인

5. **캐싱 테스트**:
   - 동일한 이슈 재분석 → 즉시 캐시된 결과 반환 확인

6. **에러 처리 테스트**:
   - Ollama 서비스 중단 → 에러 메시지 표시 확인
   - 모델 미설치 → 안내 메시지 표시 확인

---

## ✅ Phase 3-1 완료 조건

### 필수 기능
- [ ] Ollama 클라이언트 구현 및 헬스체크
- [ ] AI 분석 큐 관리 (Zustand Store)
- [ ] 프롬프트 엔지니어링 (시스템/사용자 프롬프트)
- [ ] AI 분석 엔진 (배치 처리, 캐싱)
- [ ] Backend API (POST /api/ai/analyze, GET /api/ai/queue/{id}/status, GET /api/ai/result/{id})
- [ ] 이슈 선택 UI (체크박스, 전체 선택, 일괄 분석)
- [ ] AI 진행률 모달
- [ ] AI 결과 모달 (구조화된 응답 표시)
- [ ] 코드 하이라이팅 (react-syntax-highlighter)
- [ ] 결과 캐싱 (7일 유효)

### 성능 최적화
- [ ] 배치 처리 (세마포어 기반 동시 실행 제한)
- [ ] 응답 파싱 (구조화된 섹션 추출)
- [ ] 캐시 히트율 측정

### 사용자 경험
- [ ] Ollama 상태 표시 (Ready/Not Available)
- [ ] 선택된 이슈 수 표시
- [ ] 실시간 진행률 업데이트
- [ ] 분석 완료 후 자동으로 결과 로드
- [ ] 코드 복사 기능

---

## 📊 예상 성능

| 이슈 수 | 배치 처리 시간 | 캐시 활용 시 |
|--------|--------------|-------------|
| 5개 | ~5분 | ~30초 (60% hit) |
| 10개 | ~8분 | ~1분 (50% hit) |
| 20개 | ~15분 | ~3분 (40% hit) |

**최적화 기법**:
- 배치 크기: 3개 (동시 처리)
- 최대 동시 요청: 2개 (세마포어)
- 캐싱: 7일 유효, 파일 내용 + 이슈 해시 기반

---

## 🔜 다음 단계 (Optional / Phase 4+)

- **WebSocket 스트리밍**: 실시간 AI 응답 스트리밍
- **히스토리 비교**: 이전 분석과 비교 기능
- **커스텀 프롬프트**: 사용자 정의 프롬프트 템플릿
- **다중 모델 비교**: CodeLlama vs DeepSeek 비교 분석
- **CI/CD 통합**: 자동 AI 분석 트리거

---

## 📦 필요한 Dependencies

### Backend
```txt
# requirements.txt에 추가
httpx>=0.25.0
tenacity>=8.2.0
```

### Frontend
```json
// package.json dependencies
{
  "react-markdown": "^9.0.0",
  "react-syntax-highlighter": "^15.5.0"
}

// package.json devDependencies
{
  "@types/react-syntax-highlighter": "^15.5.0"
}
```

---

## 🎓 개발 가이드

### Ollama 설치 및 설정

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# 서비스 시작
ollama serve

# 모델 다운로드
ollama pull codellama:7b

# 대체 모델 (선택)
ollama pull deepseek-coder:6.7b
ollama pull qwen2.5-coder:7b
```

### 개발 환경 설정

```bash
# 1. Backend dependencies
cd backend
pip install -r requirements.txt

# 2. Frontend dependencies
cd frontend
npm install

# 3. Frontend build
npm run build

# 4. Backend 실행
cd backend
python -m uvicorn main:app --reload

# 5. Extension 실행
# VS Code에서 F5
```

### 디버깅

- **Backend 로그**: `backend/` 터미널에서 API 호출 및 AI 분석 진행 확인
- **Frontend 로그**: Extension Development Host 개발자 도구 콘솔 확인
- **Ollama 로그**: `ollama serve` 실행 터미널 확인

---

## ✨ 완료!

Phase 3-1 문서 작성이 완료되었습니다. 이 문서를 기반으로 Ollama 로컬 LLM을 활용한 AI 심층 분석 기능을 구현할 수 있습니다.
