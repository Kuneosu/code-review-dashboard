# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Smart Code Review** is a local AI-powered code analysis tool that detects security vulnerabilities, performance issues, and code quality problems. It runs entirely locally using React + Vite frontend, FastAPI backend, and Ollama for AI analysis.

### Core Value Proposition
- Complete security: all data processed locally, no external uploads
- AI-powered insights using local LLM (Ollama with CodeLlama)
- Developer-friendly with real-time feedback
- Scalable from individual use to team server deployment

### Target Languages
- Primary: JavaScript/TypeScript, Python
- Future: Java, Go, Rust

## Architecture

### System Components

```
Frontend (React + Vite)
    ↓ HTTP/REST API
Backend (Python FastAPI)
    ↓
├─ Static Analysis Tools (ESLint, Bandit, Pylint, etc.)
└─ AI Analysis (Ollama - CodeLlama 7B)
```

### Three-Phase Analysis Process

**Phase 1: Project Upload & File Filtering**
- User selects project folder to analyze
- Smart file filtering with language presets and .gitignore parsing
- File tree visualization with react-arborist
- Filter configuration export/import

**Phase 2: Static Analysis & Dashboard**
- Asynchronous background analysis with progress tracking
- Multiple tool integration: ESLint, Bandit, Pylint, Flake8, Safety, Radon
- Custom regex pattern matching
- Interactive dashboard with filtering, sorting, and export capabilities
- Performance optimizations: batching, parallel processing, caching

**Phase 3: AI Deep Analysis**
- Selective AI analysis on user-chosen issues
- Local LLM integration via Ollama (CodeLlama 7B preferred)
- Batch optimization with priority-based processing
- Structured AI responses with code examples
- Analysis history and comparison features

## Technology Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Zustand (state management)
- TailwindCSS (styling)
- Key libraries:
  - react-arborist: file tree with virtual scrolling
  - recharts: data visualization
  - react-syntax-highlighter: code highlighting
  - react-window: virtual scrolling for large lists

### Backend
- FastAPI (Python 3.9+)
- Poetry (package management)
- asyncio for async operations
- Static analysis tools:
  - JavaScript/TypeScript: ESLint + eslint-plugin-security
  - Python: Bandit, Pylint, Flake8, Safety, Radon
- Ollama client via httpx

### AI/LLM
- Platform: Ollama (local)
- Recommended models (priority order):
  1. codellama:7b (primary)
  2. deepseek-coder:6.7b (alternative 1)
  3. qwen2.5-coder:7b (alternative 2)

### Data Storage
- Format: JSON files
- Location: `.code_review_data/` (local, gitignored)
- Structure:
  ```
  .code_review_data/
  ├── analyses/{analysis_id}/
  │   ├── metadata.json
  │   ├── static_results.json
  │   ├── ai_results/{issue_id}.json
  │   └── report.html
  ├── cache/ai_analysis/
  └── history.json
  ```

## Data Models

### Core Issue Schema
```typescript
interface Issue {
  id: string;
  file: string;
  line: number;
  column?: number;
  category: 'security' | 'performance' | 'quality';
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  message: string;
  code?: string;
  tool: string;
}
```

### AI Analysis Result
```typescript
interface AIAnalysisResult {
  issue_id: string;
  timestamp: datetime;
  summary: string;
  severity: Severity;
  root_cause: string;
  impact: string;
  suggestions: CodeSuggestion[];
  recommendations: string[];
}
```

## Development Workflow

### Phase-Based Development
This project follows a three-phase architecture. When implementing features:
1. **Phase 1 changes**: File selection, filtering logic, tree visualization
2. **Phase 2 changes**: Static analysis integration, dashboard UI, performance optimization
3. **Phase 3 changes**: AI integration, Ollama client, result parsing, history management

### Key Design Principles
- **Security First**: All data stays local, no external API calls except to localhost Ollama
- **Performance**: Target <5min for 100-file analysis, <2min per AI issue analysis
- **Error Handling**: Graceful degradation, clear user feedback
- **Async by Default**: Backend uses async processing, frontend polls for status

### Performance Requirements
- Project scan: <5s (1000 files)
- Static analysis: <5min (100 files)
- AI analysis: <2min/issue
- Dashboard loading: <2s
- Memory: <2GB (static), <4GB (with AI)
- Support up to 10,000 files

### Color System
```typescript
// Severity colors (consistent throughout UI)
critical: '#EF4444' (Red-500)
high: '#F97316' (Orange-500)
medium: '#F59E0B' (Amber-500)
low: '#10B981' (Green-500)

// Category colors
security: '#DC2626' (Red-600)
performance: '#2563EB' (Blue-600)
quality: '#7C3AED' (Purple-600)
```

## Critical Implementation Patterns

### Static Analysis Tool Integration
- Run tools as subprocesses, not as libraries
- Parse JSON output from tools (use `--format json` flags)
- Map tool-specific severity/categories to unified Issue schema
- Handle missing tools gracefully (skip with warning)
- Parallel execution: run different tools simultaneously, batch files within same tool

### Category/Severity Mapping
Each static analysis tool has different severity levels. Always map to our unified schema:
- ESLint: severity 2 → HIGH, severity 1 → MEDIUM
- Bandit: HIGH → CRITICAL, MEDIUM → HIGH, LOW → MEDIUM
- Use `RULE_CATEGORY_MAP` to classify rules into security/performance/quality

### AI Analysis Patterns
- Always include rich context: code snippet (±10 lines), full file content, project structure
- Use structured system prompts requesting specific format (Summary, Root Cause, Impact, Recommendations, Code Example)
- Parse AI responses into structured `AIAnalysisResult`
- Implement caching: hash file content + issue to avoid redundant analysis
- Batch processing: max 2-3 concurrent Ollama requests to prevent resource exhaustion

### Ollama Client Best Practices
```python
# Use streaming for responsiveness
async with client.stream('POST', url, json=payload) as response:
    async for line in response.aiter_lines():
        # Process streaming response

# Always set timeout (Ollama can be slow)
httpx.AsyncClient(timeout=300.0)

# Check model availability before analysis
await httpx.get(f"{base_url}/api/tags")
```

### Frontend State Management
Use Zustand stores per phase:
- `phase1Store`: project path, file tree, filter config
- `phase2Store`: analysis results, filters, selected issues
- `phase3Store`: AI queue, AI results, history

### Error Handling Strategy
Backend: Use custom exception types (e.g., `AIAnalysisException`) with error codes
Frontend: Display errors with recovery actions (Retry, Skip, Use Alternative)

Critical error types:
- `CONNECTION_FAILED`: Ollama not running
- `MODEL_NOT_FOUND`: Required model not installed
- `TIMEOUT`: Analysis taking too long
- `INSUFFICIENT_MEMORY`: System resources exhausted

## Testing Strategy

### Test Coverage Requirements
- Unit tests: >80% coverage (pytest for backend, Jest for frontend)
- Integration tests: >60% coverage (API endpoints, tool integrations)
- E2E tests: Critical user flows (Playwright)

### Key Test Scenarios
1. Happy path: project selection → analysis → AI analysis → results
2. Error handling: Ollama not running, missing tools, large projects
3. Performance: 1000+ file projects
4. Concurrency: multiple analyses simultaneously

## File Structure Conventions

### Backend Module Organization
```
backend/
├── api/              # FastAPI routes
├── analyzers/        # Static analysis tool wrappers
├── ai/              # Ollama client and AI logic
├── models/          # Pydantic models
├── services/        # Business logic
├── storage/         # File system operations
└── utils/           # Helpers
```

### Frontend Component Structure
```
frontend/src/
├── components/      # Reusable UI components
├── pages/          # Phase-specific pages
├── stores/         # Zustand stores
├── hooks/          # Custom React hooks
├── utils/          # Helpers
└── types/          # TypeScript types
```

## Configuration Files

### ESLint Configuration (.eslintrc.json)
```json
{
  "extends": ["airbnb-base", "plugin:security/recommended"],
  "plugins": ["security"],
  "rules": {
    "no-eval": "error",
    "complexity": ["warn", 10]
  }
}
```

### Bandit Configuration (.bandit)
```yaml
tests:
  - B201  # flask_debug_true
  - B301  # pickle
  - B307  # eval
```

## Development Notes

### When Adding New Static Analysis Tools
1. Create wrapper in `backend/analyzers/`
2. Implement result parser to map to `Issue` schema
3. Add category/severity mapping rules
4. Update `AnalysisOrchestrator` to include new tool
5. Add tool configuration to project docs

### When Modifying AI Prompts
- Keep system prompt structure consistent (Summary → Root Cause → Impact → Recommendations → Code Example)
- Test with multiple issue types (security, performance, quality)
- Validate parsing logic handles edge cases
- Update prompt version in metadata

### Performance Optimization Priorities
1. Batch processing (20-30% improvement)
2. Parallel execution (40-60% improvement)
3. Caching (50-80% on re-analysis)
4. Virtual scrolling in UI (90%+ render improvement)
5. Code splitting for lazy loading

### Security Considerations
- Never send code to external APIs
- Validate all file paths to prevent traversal attacks
- Sanitize user input in custom filter rules
- Ensure .code_review_data/ is in .gitignore
- No API keys or secrets in code

## Roadmap Context

### MVP Scope (4 weeks)
All three phases with basic functionality for JavaScript and Python projects

### Version 1.0 (8 weeks)
Complete Phase 3, history comparison, performance optimization, comprehensive error handling

### Future (Version 2.0+)
- Additional language support (Java, Go, Rust)
- Multiple LLM model comparison
- Plugin system for custom analyzers
- CI/CD integration guides
- Team collaboration features
