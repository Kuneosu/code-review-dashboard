# Phase 1: 프로젝트 업로드 & 파일 필터링

## 📋 개요

### 목표
사용자가 분석할 프로젝트를 선택하고, 스마트한 필터링을 통해 분석 대상 파일을 명확히 정하는 단계

### 주요 기능
- 프로젝트 폴더 선택
- 파일 트리 시각화
- 언어별 필터링 preset 자동 적용
- .gitignore 자동 파싱 및 적용
- 커스텀 필터 룰 추가/관리
- 필터 설정 Export/Import
- 실시간 필터링 미리보기

---

## 🎨 UI/UX 설계

### 1. 프로젝트 선택 화면

```
┌─────────────────────────────────────┐
│  Smart Code Review                  │
├─────────────────────────────────────┤
│                                     │
│  📁 Select Project Folder           │
│  ┌───────────────────────────────┐ │
│  │  Browse...                    │ │
│  └───────────────────────────────┘ │
│                                     │
│  or                                 │
│                                     │
│  Recent Projects:                   │
│  • /home/user/project-a             │
│  • /home/user/project-b             │
│                                     │
└─────────────────────────────────────┘
```

**기능:**
- 폴더 브라우저 (OS 네이티브 다이얼로그)
- 최근 프로젝트 목록 (로컬 스토리지)
- 드래그 앤 드롭 지원 (선택 사항)

### 2. 파일 트리 + 필터링 설정 화면

```
┌─────────────────────────────────────────────────────┐
│  Project: /home/user/my-project          [Next →]   │
├──────────────────┬──────────────────────────────────┤
│ Filter Settings  │  File Tree Preview               │
├──────────────────┤                                  │
│                  │  📁 my-project                   │
│ Language: JS/TS  │    ├─ 📁 src                    │
│ ☑ Apply presets  │    │   ├─ 📄 index.js          │
│                  │    │   ├─ 📄 app.js             │
│ ☑ Use .gitignore │    │   └─ 📁 components         │
│                  │    ├─ 📁 node_modules (filtered)│
│ Custom Rules:    │    ├─ 📄 package.json           │
│ + Add rule       │    └─ 📄 README.md              │
│                  │                                  │
│ [Import Config]  │  Selected: 45 files              │
│ [Export Config]  │  Filtered: 1,234 files           │
└──────────────────┴──────────────────────────────────┘
```

**기능:**
- 2단 레이아웃 (필터 설정 | 파일 트리)
- 파일 트리 가상 스크롤링 (react-arborist)
- 필터링된 파일은 회색 표시
- 실시간 카운팅 (선택/필터링 파일 수)

### 3. 확인 및 시작 화면

```
┌─────────────────────────────────────┐
│  Ready to Analyze                   │
├─────────────────────────────────────┤
│                                     │
│  Project: /home/user/my-project     │
│  Files to analyze: 45               │
│                                     │
│  Categories:                        │
│  ☑ Security                         │
│  ☑ Performance                      │
│  ☑ Quality                          │
│                                     │
│  [← Back]  [Start Analysis →]      │
│                                     │
└─────────────────────────────────────┘
```

**기능:**
- 최종 요약 정보
- 분석 카테고리 선택
- 이전 단계 복귀 가능

---

## 🔌 API 설계

### 1. 프로젝트 스캔

**Endpoint:** `POST /api/scan-project`

**Request:**
```json
{
  "project_path": "/home/user/my-project"
}
```

**Response:**
```json
{
  "file_tree": {
    "name": "my-project",
    "path": "/home/user/my-project",
    "type": "directory",
    "children": [...]
  },
  "detected_language": "javascript",
  "total_files": 1279,
  "gitignore_found": true
}
```

**에러:**
- `400`: 잘못된 경로
- `403`: 권한 없음
- `500`: 스캔 실패

### 2. 필터 적용 미리보기

**Endpoint:** `POST /api/apply-filters`

**Request:**
```json
{
  "project_path": "/home/user/my-project",
  "filter_config": {
    "project_path": "/home/user/my-project",
    "filter": {
      "presets": [...],
      "gitignore_rules": [...],
      "custom_rules": [...]
    }
  }
}
```

**Response:**
```json
{
  "filtered_tree": {...},
  "stats": {
    "total_files": 1279,
    "selected_files": 45,
    "filtered_files": 1234
  },
  "selected_file_paths": [
    "/home/user/my-project/src/index.js",
    "/home/user/my-project/src/app.js"
  ]
}
```

### 3. 필터 설정 Export/Import

**Export:** `POST /api/filter-config/export`

**Request:** `FilterConfig`

**Response:**
```json
{
  "config_json": "{...}",
  "exported_at": "2025-10-15T10:30:00Z"
}
```

**Import:** `POST /api/filter-config/import`

**Request:**
```json
{
  "config_json": "{...}"
}
```

**Response:** `FilterConfig`

---

## 🏗️ 기술 구현

### Frontend 컴포넌트 구조

```
App
├─ ProjectSelector
│   ├─ FolderBrowser
│   └─ RecentProjects
├─ FilterConfiguration
│   ├─ LanguageDetector
│   ├─ PresetSelector
│   ├─ GitignoreToggle
│   ├─ CustomRuleEditor
│   └─ ConfigImportExport
├─ FileTreeViewer (react-arborist)
│   ├─ FileNode (재귀 컴포넌트)
│   └─ FilterStats
└─ ConfirmationScreen
```

### Zustand Store

```typescript
interface Phase1Store {
  // State
  projectPath: string;
  fileTree: FileNode | null;
  filterConfig: FilterConfig;
  selectedFiles: string[];
  isScanning: boolean;
  isApplyingFilters: boolean;
  error: ErrorState | null;
  
  // Actions
  setProjectPath: (path: string) => void;
  loadFileTree: () => Promise<void>;
  updateFilterConfig: (config: FilterConfig) => void;
  applyFilters: () => Promise<void>;
  exportConfig: () => void;
  importConfig: (json: string) => void;
  clearError: () => void;
}
```

### Backend 주요 함수

```python
# 파일 트리 생성
def scan_project_directory(path: str) -> FileNode:
    """
    프로젝트 디렉토리를 재귀적으로 스캔하여 
    파일 트리 구조 생성
    """
    pass

# .gitignore 파싱
def parse_gitignore(project_path: str) -> List[FilterRule]:
    """
    .gitignore 파일을 파싱하여 
    FilterRule 리스트로 변환
    """
    pass

# 언어 감지
def detect_language(project_path: str) -> Language:
    """
    package.json, requirements.txt 등을 기반으로
    프로젝트 주 언어 감지
    """
    pass

# 필터 적용
def apply_filters(
    file_tree: FileNode, 
    filter_config: FilterConfig
) -> Tuple[FileNode, List[str]]:
    """
    필터 설정을 파일 트리에 적용하고
    선택된 파일 경로 목록 반환
    """
    pass

# Preset 로드
def load_language_preset(language: Language) -> FilterPreset:
    """
    언어별 기본 필터링 preset 로드
    """
    pass
```

---

## ⚠️ 에러 처리

### 에러 타입 정의

```typescript
interface ErrorState {
  type: 'permission_denied' | 'parse_error' | 'network_error' | 'unknown';
  message: string;
  path?: string;
  recoverable: boolean;
}
```

### 주요 에러 케이스

| 에러 타입 | 상황 | 사용자 메시지 | 조치 |
|----------|------|--------------|------|
| `permission_denied` | 폴더 접근 권한 없음 | "이 폴더에 접근할 수 없습니다" | 다른 폴더 선택 유도 |
| `parse_error` | .gitignore 파싱 실패 | ".gitignore를 읽을 수 없습니다" | 기본 설정으로 진행 제안 |
| `network_error` | API 통신 실패 | "서버 연결에 실패했습니다" | 재시도 버튼 제공 |
| `large_project` | 파일 10,000개 초과 | "분석에 시간이 오래 걸릴 수 있습니다" | 경고 후 진행 |

### 에러 UI 표시

```typescript
// Toast 알림
<Toast 
  type="error" 
  message={error.message} 
  onClose={clearError}
/>

// 인라인 에러 배너
<ErrorBanner 
  error={error} 
  onRetry={handleRetry}
  onDismiss={clearError}
/>
```

---

## 🔄 로딩 상태 관리

### 로딩이 필요한 시점

1. **프로젝트 스캔 중**
   - 파일 시스템 탐색
   - 파일 개수 카운팅
   - 메타데이터 수집

2. **필터 적용 중**
   - 필터 룰 계산
   - 파일 트리 재구성
   - 통계 업데이트

3. **파일 트리 렌더링**
   - 대량 DOM 업데이트
   - 가상 스크롤 초기화

4. **설정 Import/Export**
   - 파일 읽기/쓰기
   - JSON 파싱

### 로딩 UI 컴포넌트

```typescript
interface LoadingProps {
  text?: string;
  progress?: number;  // 0-100
  variant: 'spinner' | 'overlay' | 'skeleton' | 'inline';
}

// 사용 예시
<Loading 
  text="프로젝트 스캔 중..." 
  progress={65} 
  variant="overlay" 
/>
```

### 로딩 화면 예시

```
┌─────────────────────────────────────────────┐
│  📁 프로젝트 스캔 중...                     │
│                                             │
│  ████████████░░░░░░░░░░ 65%                │
│                                             │
│  현재: src/components/Header.tsx            │
│  발견된 파일: 1,234개                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎯 필터링 전략

### 기본 Preset (언어별)

**JavaScript/TypeScript:**
```
node_modules/**
dist/**
build/**
coverage/**
.next/**
*.log
*.min.js
*.bundle.js
```

**Python:**
```
__pycache__/**
*.pyc
.venv/**
venv/**
.pytest_cache/**
*.egg-info/**
dist/**
build/**
```

### 적용 우선순위

```
1. 언어별 Preset (자동)
2. .gitignore 룰 (있으면 자동)
3. 커스텀 룰 (사용자 정의)
```

### 필터 룰 문법

```
# Glob 패턴 지원
*.log           # 모든 .log 파일
node_modules/** # node_modules 하위 전체
!important.js   # 제외 예외 (느낌표로 시작)
```

---

## ✅ Phase 1 완료 조건

- [ ] 프로젝트 폴더 선택 가능
- [ ] 파일 트리 시각화 (스크롤 지원)
- [ ] 언어 자동 감지 동작
- [ ] Preset 자동 적용
- [ ] .gitignore 자동 파싱 및 적용
- [ ] 커스텀 룰 추가/삭제 가능
- [ ] 필터링 실시간 미리보기
- [ ] 필터 통계 표시 (선택/필터링 파일 수)
- [ ] 로딩 인디케이터 표시
- [ ] 에러 처리 (권한, 파싱 실패 등)
- [ ] Export/Import 기능 동작
- [ ] 최종 선택 파일 목록 확인 가능

---

## 📦 필요한 라이브러리

### Frontend
- `react-arborist`: 파일 트리 가상 스크롤
- `zustand`: 상태 관리
- `tailwindcss`: 스타일링
- `react-hot-toast`: Toast 알림

### Backend
- `pathspec`: .gitignore 파싱
- `pathlib`: 파일 시스템 처리
- `pydantic`: 데이터 검증

---

## 🔜 다음 단계

Phase 1 완료 후 Phase 2로 이동:
- 정적 분석 도구 통합 (ESLint, Bandit 등)
- 보안/성능/품질 이슈 탐지
- 분석 결과 대시보드 구현
