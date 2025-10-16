# Phase 2-2: 결과 대시보드 및 시각화

**작성일**: 2025-10-16
**상태**: 설계 진행 중
**목적**: 분석 결과를 시각화하고 필터링, 정렬, 내보내기 기능 제공

---

## 📋 개요

Phase 2-1에서 완료된 분석 결과를 사용자가 이해하기 쉽게 시각화하고, 이슈를 효과적으로 탐색하고 관리할 수 있는 대시보드를 구현합니다.

### Phase 2-2의 범위

**구현할 기능**:
- ✅ 결과 요약 대시보드 (Summary Cards, Charts)
- ✅ 이슈 목록 표시 (파일별, 심각도별 그룹핑)
- ✅ 필터링 및 정렬 기능
- ✅ 이슈 상세 정보 모달
- ✅ 코드 스니펫 표시
- ✅ 결과 내보내기 (JSON, Markdown)
- ✅ VS Code에서 파일 열기 통합

---

## 🎨 대시보드 UI 설계

### 1. 전체 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│  Smart Code Review - Analysis Results                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Summary Cards (4개)                                     ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  ││
│  │  │ 📊 Total │ │ 🔴 Crit. │ │ 🟠 High  │ │ 📁 Files │  ││
│  │  │    27    │ │    2     │ │    5     │ │    45    │  ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Charts (2개)                                            ││
│  │  ┌──────────────────┐  ┌──────────────────────────┐    ││
│  │  │  Severity        │  │  Category Distribution   │    ││
│  │  │  Distribution    │  │                          │    ││
│  │  │  (Donut Chart)   │  │  (Bar Chart)             │    ││
│  │  └──────────────────┘  └──────────────────────────┘    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Filters & Actions                                       ││
│  │  [Severity ▼] [Category ▼] [File ▼] [Sort ▼] [Export ▼]││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Issue List (Grouped by File)                            ││
│  │                                                           ││
│  │  📁 src/components/Header.tsx (3 issues)                ││
│  │    🔴 [Critical] Possible SQL injection (Line 45)       ││
│  │    🟠 [High] Unsafe eval usage (Line 78)                ││
│  │    🟡 [Medium] Missing error handling (Line 102)        ││
│  │                                                           ││
│  │  📁 src/utils/api.ts (2 issues)                         ││
│  │    🟠 [High] Hardcoded API key (Line 12)                ││
│  │    🟢 [Low] console.log in production (Line 56)         ││
│  │                                                           ││
│  │  ...                                                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  [← Back to Analysis] [🔄 Analyze Again]                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Summary Cards

4개의 주요 지표 카드:

```typescript
interface SummaryCard {
  icon: string;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

const summaryCards: SummaryCard[] = [
  {
    icon: '📊',
    label: 'Total Issues',
    value: 27,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: '🔴',
    label: 'Critical',
    value: 2,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    icon: '🟠',
    label: 'High',
    value: 5,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    icon: '📁',
    label: 'Affected Files',
    value: 15,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  }
];
```

### 3. Charts (Recharts 사용)

#### Severity Distribution (Donut Chart)

```typescript
<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={severityData}
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={80}
      dataKey="value"
    >
      {severityData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={entry.color} />
      ))}
    </Pie>
    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

#### Category Distribution (Bar Chart)

```typescript
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={categoryData}>
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="count" fill="#3b82f6" />
  </BarChart>
</ResponsiveContainer>
```

### 4. Issue List 컴포넌트 구조

```
IssueList
├── FileGroup (파일별 그룹)
│   ├── FileHeader (파일명 + 이슈 개수)
│   └── IssueItem[] (이슈 목록)
│       ├── Severity Badge
│       ├── Rule Name
│       ├── Message
│       ├── Location (Line:Column)
│       └── [View Details] 버튼
```

### 5. Issue Detail Modal

```
┌───────────────────────────────────────────────────────┐
│  Issue Details                                   [✕]  │
├───────────────────────────────────────────────────────┤
│                                                        │
│  🔴 Critical - Possible SQL injection                │
│                                                        │
│  📁 File: src/api/users.ts                           │
│  📍 Location: Line 45, Column 12                     │
│  🔧 Tool: ESLint                                      │
│  📋 Rule: security/detect-sql-injection              │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ Code Context                                    │  │
│  │                                                 │  │
│  │  43 | function getUser(id) {                   │  │
│  │  44 |   // Vulnerable code                     │  │
│  │  45 |   const query = `SELECT * FROM users     │  │
│  │     |                  WHERE id=${id}`;        │  │
│  │  46 |   return db.query(query);                │  │
│  │  47 | }                                         │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  💡 Recommendation:                                   │
│  Use parameterized queries to prevent SQL injection:  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ const query = 'SELECT * FROM users WHERE id=?';│  │
│  │ return db.query(query, [id]);                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  [Open in VS Code] [Copy to Clipboard]               │
│                                                        │
└───────────────────────────────────────────────────────┘
```

---

## 📊 데이터 구조

### 1. Analysis Result Response

```typescript
interface AnalysisResult {
  analysis_id: string;
  status: 'COMPLETED';
  summary: {
    total_files: number;
    total_issues: number;
    affected_files: number;
    by_severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    by_category: {
      security: number;
      performance: number;
      quality: number;
    };
  };
  issues: Issue[];
  completed_at: string;
  elapsed_time: number;
}

interface Issue {
  id: string;
  file: string;
  line: number;
  column: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'quality';
  rule: string;
  message: string;
  code_snippet: string;
  tool: string;
}
```

### 2. Frontend State (Zustand)

```typescript
interface DashboardState {
  // Data
  result: AnalysisResult | null;

  // Filters
  filters: {
    severity: string[];
    category: string[];
    file: string | null;
  };

  // Sort
  sortBy: 'severity' | 'file' | 'line';
  sortOrder: 'asc' | 'desc';

  // UI State
  selectedIssue: Issue | null;
  isModalOpen: boolean;

  // Actions
  loadResult: (analysisId: string) => Promise<void>;
  setFilter: (type: string, value: any) => void;
  setSortBy: (field: string) => void;
  toggleSortOrder: () => void;
  selectIssue: (issue: Issue) => void;
  closeModal: () => void;
  exportResult: (format: 'json' | 'md') => void;
}
```

---

## 🔌 API 설계

### 결과 조회 API

**Endpoint**: `GET /api/analysis/{analysis_id}/result`

**Response**:

```json
{
  "analysis_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "COMPLETED",
  "summary": {
    "total_files": 45,
    "total_issues": 27,
    "affected_files": 15,
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
    }
  ],
  "completed_at": "2025-10-16T10:35:00Z",
  "elapsed_time": 300
}
```

---

## 🎯 Frontend 컴포넌트 설계

### 1. Dashboard Page

```typescript
// frontend/src/pages/DashboardPage.tsx

import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { SummaryCards } from '@/components/SummaryCards';
import { Charts } from '@/components/Charts';
import { IssueList } from '@/components/IssueList';
import { IssueDetailModal } from '@/components/IssueDetailModal';
import { FilterBar } from '@/components/FilterBar';

export const DashboardPage: React.FC = () => {
  const {
    result,
    filters,
    sortBy,
    sortOrder,
    selectedIssue,
    isModalOpen,
    loadResult,
    selectIssue,
    closeModal,
  } = useDashboardStore();

  const analysisId = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    if (analysisId) {
      loadResult(analysisId);
    }
  }, [analysisId, loadResult]);

  if (!result) {
    return <LoadingSpinner />;
  }

  const filteredIssues = applyFilters(result.issues, filters);
  const sortedIssues = applySorting(filteredIssues, sortBy, sortOrder);
  const groupedIssues = groupByFile(sortedIssues);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            📊 Analysis Results
          </h1>
          <p className="text-gray-600 mt-2">
            Completed at {formatDate(result.completed_at)} •
            Duration: {formatDuration(result.elapsed_time)}
          </p>
        </div>

        {/* Summary Cards */}
        <SummaryCards summary={result.summary} />

        {/* Charts */}
        <Charts summary={result.summary} />

        {/* Filter Bar */}
        <FilterBar />

        {/* Issue List */}
        <IssueList
          groupedIssues={groupedIssues}
          onSelectIssue={selectIssue}
        />

        {/* Issue Detail Modal */}
        {isModalOpen && selectedIssue && (
          <IssueDetailModal
            issue={selectedIssue}
            onClose={closeModal}
          />
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gray-600 text-white rounded-md"
          >
            ← Back to Analysis
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-md"
          >
            🔄 Analyze Again
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 2. Summary Cards Component

```typescript
// frontend/src/components/SummaryCards.tsx

import React from 'react';

interface SummaryCardsProps {
  summary: {
    total_issues: number;
    affected_files: number;
    by_severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const cards = [
    {
      icon: '📊',
      label: 'Total Issues',
      value: summary.total_issues,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: '🔴',
      label: 'Critical',
      value: summary.by_severity.critical,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      icon: '🟠',
      label: 'High',
      value: summary.by_severity.high,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: '📁',
      label: 'Affected Files',
      value: summary.affected_files,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} rounded-lg p-6 shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.label}</p>
              <p className={`text-3xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </div>
            <span className="text-4xl">{card.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 3. Charts Component

```typescript
// frontend/src/components/Charts.tsx

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartsProps {
  summary: {
    by_severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    by_category: {
      security: number;
      performance: number;
      quality: number;
    };
  };
}

export const Charts: React.FC<ChartsProps> = ({ summary }) => {
  const severityData = [
    { name: 'Critical', value: summary.by_severity.critical, color: '#dc2626' },
    { name: 'High', value: summary.by_severity.high, color: '#ea580c' },
    { name: 'Medium', value: summary.by_severity.medium, color: '#ca8a04' },
    { name: 'Low', value: summary.by_severity.low, color: '#16a34a' },
  ];

  const categoryData = [
    { name: 'Security', count: summary.by_category.security },
    { name: 'Performance', count: summary.by_category.performance },
    { name: 'Quality', count: summary.by_category.quality },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Severity Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Severity Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={severityData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
              label
            >
              {severityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

### 4. Filter Bar Component

```typescript
// frontend/src/components/FilterBar.tsx

import React from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';

export const FilterBar: React.FC = () => {
  const { filters, setFilter, sortBy, setSortBy, exportResult } =
    useDashboardStore();

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Severity Filter */}
        <div>
          <label className="text-sm text-gray-600 mr-2">Severity:</label>
          <select
            value={filters.severity.join(',')}
            onChange={(e) =>
              setFilter('severity', e.target.value.split(','))
            }
            className="border rounded px-3 py-2"
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-sm text-gray-600 mr-2">Category:</label>
          <select
            value={filters.category.join(',')}
            onChange={(e) =>
              setFilter('category', e.target.value.split(','))
            }
            className="border rounded px-3 py-2"
          >
            <option value="">All</option>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
            <option value="quality">Quality</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="text-sm text-gray-600 mr-2">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="severity">Severity</option>
            <option value="file">File</option>
            <option value="line">Line Number</option>
          </select>
        </div>

        {/* Export */}
        <div className="ml-auto">
          <button
            onClick={() => exportResult('json')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md mr-2"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportResult('md')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md"
          >
            Export Markdown
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 5. Issue List Component

```typescript
// frontend/src/components/IssueList.tsx

import React from 'react';
import { Issue } from '@/types';

interface IssueListProps {
  groupedIssues: Record<string, Issue[]>;
  onSelectIssue: (issue: Issue) => void;
}

export const IssueList: React.FC<IssueListProps> = ({
  groupedIssues,
  onSelectIssue,
}) => {
  const severityIcons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  const severityColors = {
    critical: 'text-red-600 bg-red-50',
    high: 'text-orange-600 bg-orange-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Issues by File</h2>

      {Object.entries(groupedIssues).map(([file, issues]) => (
        <div key={file} className="mb-6">
          {/* File Header */}
          <div className="flex items-center mb-3 pb-2 border-b">
            <span className="text-lg mr-2">📁</span>
            <span className="font-medium text-gray-800">{file}</span>
            <span className="ml-2 text-sm text-gray-500">
              ({issues.length} issue{issues.length > 1 ? 's' : ''})
            </span>
          </div>

          {/* Issues */}
          <div className="space-y-3 ml-6">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="border-l-4 border-gray-200 pl-4 py-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectIssue(issue)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">
                        {severityIcons[issue.severity]}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          severityColors[issue.severity]
                        }`}
                      >
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        Line {issue.line}:{issue.column}
                      </span>
                    </div>
                    <p className="text-gray-800 mb-1">{issue.message}</p>
                    <p className="text-xs text-gray-500">
                      {issue.rule} • {issue.tool}
                    </p>
                  </div>
                  <button className="ml-4 text-sm text-blue-600 hover:underline">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 6. Issue Detail Modal Component

```typescript
// frontend/src/components/IssueDetailModal.tsx

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Issue } from '@/types';

interface IssueDetailModalProps {
  issue: Issue;
  onClose: () => void;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issue,
  onClose,
}) => {
  const handleOpenInVSCode = () => {
    // VS Code Extension으로 메시지 전송
    if (window.vscodeApi) {
      window.vscodeApi.postMessage({
        type: 'openFile',
        file: issue.file,
        line: issue.line,
        column: issue.column,
      });
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(issue.code_snippet);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Issue Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Issue Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">
                {issue.severity === 'critical' ? '🔴' : ''}
                {issue.severity === 'high' ? '🟠' : ''}
                {issue.severity === 'medium' ? '🟡' : ''}
                {issue.severity === 'low' ? '🟢' : ''}
              </span>
              <h3 className="text-xl font-semibold">{issue.message}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">📁 File:</span>
                <span className="ml-2 font-mono">{issue.file}</span>
              </div>
              <div>
                <span className="text-gray-600">📍 Location:</span>
                <span className="ml-2">
                  Line {issue.line}, Column {issue.column}
                </span>
              </div>
              <div>
                <span className="text-gray-600">🔧 Tool:</span>
                <span className="ml-2">{issue.tool}</span>
              </div>
              <div>
                <span className="text-gray-600">📋 Rule:</span>
                <span className="ml-2 font-mono">{issue.rule}</span>
              </div>
            </div>
          </div>

          {/* Code Snippet */}
          <div>
            <h4 className="text-lg font-semibold mb-2">Code Context</h4>
            <SyntaxHighlighter
              language="typescript"
              style={vscDarkPlus}
              showLineNumbers
              startingLineNumber={Math.max(1, issue.line - 2)}
              wrapLines
              lineProps={(lineNumber) => {
                const style = { display: 'block' };
                if (lineNumber === issue.line) {
                  style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                  style.borderLeft = '4px solid #dc2626';
                }
                return { style };
              }}
            >
              {issue.code_snippet}
            </SyntaxHighlighter>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleOpenInVSCode}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Open in VS Code
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🔍 필터링 및 정렬 로직

### 필터링

```typescript
function applyFilters(
  issues: Issue[],
  filters: {
    severity: string[];
    category: string[];
    file: string | null;
  }
): Issue[] {
  return issues.filter((issue) => {
    // Severity filter
    if (
      filters.severity.length > 0 &&
      !filters.severity.includes(issue.severity)
    ) {
      return false;
    }

    // Category filter
    if (
      filters.category.length > 0 &&
      !filters.category.includes(issue.category)
    ) {
      return false;
    }

    // File filter
    if (filters.file && issue.file !== filters.file) {
      return false;
    }

    return true;
  });
}
```

### 정렬

```typescript
function applySorting(
  issues: Issue[],
  sortBy: 'severity' | 'file' | 'line',
  sortOrder: 'asc' | 'desc'
): Issue[] {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  return [...issues].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'severity':
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
        break;
      case 'file':
        comparison = a.file.localeCompare(b.file);
        break;
      case 'line':
        comparison = a.line - b.line;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}
```

### 파일별 그룹핑

```typescript
function groupByFile(issues: Issue[]): Record<string, Issue[]> {
  return issues.reduce((groups, issue) => {
    const file = issue.file;
    if (!groups[file]) {
      groups[file] = [];
    }
    groups[file].push(issue);
    return groups;
  }, {} as Record<string, Issue[]>);
}
```

---

## 💾 Export 기능

### 1. JSON Export

```typescript
function exportJSON(result: AnalysisResult): void {
  const json = JSON.stringify(result, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `analysis-${result.analysis_id}.json`;
  a.click();

  URL.revokeObjectURL(url);
}
```

### 2. Markdown Export

```typescript
function exportMarkdown(result: AnalysisResult): void {
  const md = generateMarkdownReport(result);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `analysis-report-${result.analysis_id}.md`;
  a.click();

  URL.revokeObjectURL(url);
}

function generateMarkdownReport(result: AnalysisResult): string {
  const { summary, issues } = result;

  let md = `# Code Analysis Report\n\n`;
  md += `**Analysis ID**: ${result.analysis_id}\n`;
  md += `**Completed**: ${result.completed_at}\n`;
  md += `**Duration**: ${result.elapsed_time}s\n\n`;

  md += `## Summary\n\n`;
  md += `- **Total Issues**: ${summary.total_issues}\n`;
  md += `- **Affected Files**: ${summary.affected_files}\n\n`;

  md += `### By Severity\n\n`;
  md += `- 🔴 Critical: ${summary.by_severity.critical}\n`;
  md += `- 🟠 High: ${summary.by_severity.high}\n`;
  md += `- 🟡 Medium: ${summary.by_severity.medium}\n`;
  md += `- 🟢 Low: ${summary.by_severity.low}\n\n`;

  md += `### By Category\n\n`;
  md += `- Security: ${summary.by_category.security}\n`;
  md += `- Performance: ${summary.by_category.performance}\n`;
  md += `- Quality: ${summary.by_category.quality}\n\n`;

  md += `## Issues\n\n`;

  const groupedIssues = groupByFile(issues);

  Object.entries(groupedIssues).forEach(([file, fileIssues]) => {
    md += `### ${file}\n\n`;

    fileIssues.forEach((issue) => {
      const icon =
        issue.severity === 'critical'
          ? '🔴'
          : issue.severity === 'high'
          ? '🟠'
          : issue.severity === 'medium'
          ? '🟡'
          : '🟢';

      md += `#### ${icon} ${issue.message}\n\n`;
      md += `- **Severity**: ${issue.severity}\n`;
      md += `- **Category**: ${issue.category}\n`;
      md += `- **Location**: Line ${issue.line}, Column ${issue.column}\n`;
      md += `- **Rule**: ${issue.rule}\n`;
      md += `- **Tool**: ${issue.tool}\n\n`;

      if (issue.code_snippet) {
        md += `\`\`\`\n${issue.code_snippet}\n\`\`\`\n\n`;
      }
    });
  });

  return md;
}
```

---

## 🔗 VS Code Integration

### Open File in VS Code

Extension에서 메시지 핸들러 추가:

```typescript
// src/dashboardPanel.ts

private async _handleMessage(message: any) {
  switch (message.type) {
    // ... 기존 핸들러들

    case 'openFile':
      // VS Code에서 파일 열기
      const document = await vscode.workspace.openTextDocument(
        message.file
      );
      const editor = await vscode.window.showTextDocument(document);

      // 특정 라인으로 이동
      const position = new vscode.Position(
        message.line - 1,
        message.column - 1
      );
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter
      );
      break;
  }
}
```

---

## 📦 추가 의존성

### Frontend (package.json)

```json
{
  "dependencies": {
    "recharts": "^2.10.0",
    "react-syntax-highlighter": "^15.5.0"
  },
  "devDependencies": {
    "@types/react-syntax-highlighter": "^15.5.10"
  }
}
```

---

## ✅ Phase 2-2 구현 계획

### Stage 1: 기본 대시보드 구조
- [ ] DashboardPage 컴포넌트 생성
- [ ] dashboardStore (Zustand) 구현
- [ ] API 결과 조회 기능
- [ ] 라우팅 설정 (Phase2Page → DashboardPage)

### Stage 2: Summary & Charts
- [ ] SummaryCards 컴포넌트 구현
- [ ] Charts 컴포넌트 구현 (Recharts)
- [ ] Severity/Category 데이터 변환

### Stage 3: Issue List
- [ ] IssueList 컴포넌트 구현
- [ ] 파일별 그룹핑 로직
- [ ] Severity 뱃지 및 아이콘

### Stage 4: Filter & Sort
- [ ] FilterBar 컴포넌트 구현
- [ ] 필터링 로직 (Severity, Category, File)
- [ ] 정렬 로직 (Severity, File, Line)

### Stage 5: Issue Detail Modal
- [ ] IssueDetailModal 컴포넌트 구현
- [ ] 코드 스니펫 하이라이팅 (react-syntax-highlighter)
- [ ] VS Code 파일 열기 통합

### Stage 6: Export
- [ ] JSON Export 기능
- [ ] Markdown Export 기능
- [ ] 다운로드 트리거

### Stage 7: VS Code Integration
- [ ] Extension 메시지 핸들러 추가 (openFile)
- [ ] 파일 열기 및 라인 이동

### Stage 8: UX 개선
- [ ] 로딩 상태 표시
- [ ] 에러 핸들링
- [ ] 빈 상태 처리 (이슈 없음)

### Stage 9: 의존성 설치 및 빌드
- [ ] recharts, react-syntax-highlighter 설치
- [ ] Frontend 빌드
- [ ] Extension 컴파일

### Stage 10: 통합 테스트
- [ ] 전체 플로우 테스트 (Phase 1 → Phase 2-1 → Phase 2-2)
- [ ] 필터링/정렬 테스트
- [ ] Export 테스트
- [ ] VS Code 통합 테스트

---

## ✅ Phase 2-2 완료 조건

### 기능 완성도
- [ ] 분석 결과 대시보드 표시
- [ ] Summary Cards (4개)
- [ ] Charts (Severity/Category 분포)
- [ ] Issue List (파일별 그룹핑)
- [ ] 필터링 (Severity, Category, File)
- [ ] 정렬 (Severity, File, Line)
- [ ] Issue Detail Modal (코드 스니펫)
- [ ] JSON/Markdown Export
- [ ] VS Code에서 파일 열기

### 테스트
- [ ] 전체 워크플로우 (Phase 1 → 2-1 → 2-2)
- [ ] 다양한 이슈 개수 테스트 (0개, 소수, 대량)
- [ ] 필터링/정렬 조합 테스트
- [ ] Export 파일 검증
- [ ] VS Code 파일 열기 동작 확인

### 성능
- [ ] 1000개 이슈 렌더링 < 2초
- [ ] 필터링/정렬 < 500ms
- [ ] Export 생성 < 1초

---

## 🎯 결론

Phase 2-2에서는 분석 결과를 사용자가 이해하기 쉽게 시각화하고, 필터링/정렬/Export를 통해 효과적으로 관리할 수 있는 대시보드를 구현합니다.

Recharts를 활용한 차트, react-syntax-highlighter를 활용한 코드 스니펫 하이라이팅, VS Code 통합을 통한 파일 열기 등 사용자 경험을 극대화하는 기능들을 제공합니다.

Phase 2-2 완료 시 전체 Phase 2가 마무리되며, 다음 Phase 3 (필터 프리셋 및 설정 관리)로 진행할 수 있습니다.

---

**작성자**: Claude Code
**검토**: Phase 2-2 설계 완료
**다음 작업**: Phase 2-2 구현 시작
