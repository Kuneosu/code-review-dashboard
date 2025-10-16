/**
 * Dashboard Store (Zustand)
 *
 * Manages analysis result state, filters, sorting, and modal state
 */
import { create } from 'zustand';
import { getAnalysisResult } from '@/utils/api';
import { AnalysisResult, Issue } from '@/types';

interface DashboardState {
  // Data
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;

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
  setFilter: (type: 'severity' | 'category' | 'file', value: any) => void;
  setSortBy: (field: 'severity' | 'file' | 'line') => void;
  toggleSortOrder: () => void;
  selectIssue: (issue: Issue) => void;
  closeModal: () => void;
  exportResult: (format: 'json' | 'md') => void;
  reset: () => void;
}

const initialState = {
  result: null,
  loading: false,
  error: null,
  filters: {
    severity: [],
    category: [],
    file: null,
  },
  sortBy: 'severity' as const,
  sortOrder: 'asc' as const,
  selectedIssue: null,
  isModalOpen: false,
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  ...initialState,

  loadResult: async (analysisId: string) => {
    set({ loading: true, error: null });

    try {
      console.log('[DEBUG] Loading analysis result:', analysisId);
      const data = await getAnalysisResult(analysisId);

      console.log('[DEBUG] Result loaded:', data);
      set({ result: data, loading: false });
    } catch (error: any) {
      console.error('[ERROR] Failed to load result:', error);
      set({ error: error.message || 'Failed to load analysis result', loading: false });
    }
  },

  setFilter: (type, value) => {
    const { filters } = get();

    set({
      filters: {
        ...filters,
        [type]: value,
      },
    });
  },

  setSortBy: (field) => {
    set({ sortBy: field });
  },

  toggleSortOrder: () => {
    const { sortOrder } = get();
    set({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
  },

  selectIssue: (issue) => {
    set({ selectedIssue: issue, isModalOpen: true });
  },

  closeModal: () => {
    set({ isModalOpen: false, selectedIssue: null });
  },

  exportResult: (format) => {
    const { result } = get();

    if (!result) {
      console.error('[ERROR] No result to export');
      return;
    }

    if (format === 'json') {
      exportJSON(result);
    } else if (format === 'md') {
      exportMarkdown(result);
    }
  },

  reset: () => {
    set(initialState);
  },
}));

// Export functions
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
  md += `- **Total Issues**: ${summary.total}\n`;

  // Calculate affected files
  const affectedFiles = new Set(issues.map((issue) => issue.file)).size;
  md += `- **Affected Files**: ${affectedFiles}\n\n`;

  md += `### By Severity\n\n`;
  md += `- 🔴 Critical: ${summary.critical}\n`;
  md += `- 🟠 High: ${summary.high}\n`;
  md += `- 🟡 Medium: ${summary.medium}\n`;
  md += `- 🟢 Low: ${summary.low}\n\n`;

  // Category distribution
  const categoryCount = issues.reduce<Record<string, number>>(
    (acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    },
    {}
  );

  md += `### By Category\n\n`;
  md += `- Security: ${categoryCount.security || 0}\n`;
  md += `- Performance: ${categoryCount.performance || 0}\n`;
  md += `- Quality: ${categoryCount.quality || 0}\n\n`;

  md += `## Issues\n\n`;

  // Group by file
  const groupedIssues = issues.reduce<Record<string, Issue[]>>(
    (acc, issue) => {
      if (!acc[issue.file]) {
        acc[issue.file] = [];
      }
      acc[issue.file].push(issue);
      return acc;
    },
    {}
  );

  Object.entries(groupedIssues).forEach(([file, fileIssues]) => {
    md += `### ${file}\n\n`;

    fileIssues.forEach((issue: Issue) => {
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
