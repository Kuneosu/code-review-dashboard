/**
 * Dashboard Page: Analysis Results Visualization
 *
 * Displays analysis results with summary cards, charts, filters, and issue list
 */
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDashboardStore } from '@/stores/dashboardStore';
import { SummaryCards } from '@/components/SummaryCards';
import { Charts } from '@/components/Charts';
import { FilterBar } from '@/components/FilterBar';
import { IssueList } from '@/components/IssueList';
import { IssueDetailModal } from '@/components/IssueDetailModal';
import { Issue } from '@/types';

export const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    result,
    loading,
    error,
    filters,
    sortBy,
    sortOrder,
    selectedIssue,
    isModalOpen,
    loadResult,
    selectIssue,
    closeModal,
    reset,
  } = useDashboardStore();

  const analysisId = searchParams.get('id');

  useEffect(() => {
    if (analysisId) {
      console.log('[DEBUG] DashboardPage: Loading result for:', analysisId);
      loadResult(analysisId);
    } else {
      console.warn('[WARN] DashboardPage: No analysis ID provided');
    }

    return () => {
      // Cleanup on unmount
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <span className="text-6xl mb-4 block">⚠️</span>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Failed to Load Results
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No result state
  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">📊</span>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            No Results Available
          </h2>
          <p className="text-gray-600 mb-6">
            Please run an analysis first to see results.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Analysis
          </button>
        </div>
      </div>
    );
  }

  // Format date helper
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  // Format duration helper
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Apply filters and sorting (no useMemo needed for small datasets)
  let filteredAndSortedIssues: Issue[] = [];

  if (result) {
    let filtered = result.issues;

    // Apply severity filter
    if (filters.severity.length > 0) {
      filtered = filtered.filter((issue) =>
        filters.severity.includes(issue.severity)
      );
    }

    // Apply category filter
    if (filters.category.length > 0) {
      filtered = filtered.filter((issue) =>
        filters.category.includes(issue.category)
      );
    }

    // Apply file filter
    if (filters.file) {
      filtered = filtered.filter((issue) => issue.file === filters.file);
    }

    // Apply sorting
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    filteredAndSortedIssues = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'severity':
          comparison =
            severityOrder[a.severity] - severityOrder[b.severity];
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

  // Group issues by file
  const groupedIssues = filteredAndSortedIssues.reduce<Record<string, Issue[]>>(
    (acc, issue) => {
      if (!acc[issue.file]) {
        acc[issue.file] = [];
      }
      acc[issue.file].push(issue);
      return acc;
    },
    {}
  );

  // Calculate affected files
  const affectedFiles = result
    ? new Set(result.issues.map((issue) => issue.file)).size
    : 0;

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
        <SummaryCards
          summary={result.summary}
          affectedFiles={affectedFiles}
        />

        {/* Charts */}
        <Charts summary={result.summary} issues={result.issues} />

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
            projectPath={result.project_path}
            onClose={closeModal}
          />
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            ← Back to Analysis
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            🔄 Analyze Again
          </button>
        </div>
      </div>
    </div>
  );
};
