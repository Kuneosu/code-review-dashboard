/**
 * Issue List Component
 *
 * Displays issues grouped by file
 */
import React from 'react';
import { Issue } from '@/types';

interface IssueListProps {
  groupedIssues: Record<string, Issue[]>;
  onSelectIssue: (issue: Issue) => void;
  selectedIssueIds?: Set<string>;
  onToggleSelection?: (issueId: string) => void;
  selectAll?: boolean;
  onToggleSelectAll?: () => void;
}

export const IssueList: React.FC<IssueListProps> = ({
  groupedIssues,
  onSelectIssue,
  selectedIssueIds = new Set(),
  onToggleSelection,
  selectAll = false,
  onToggleSelectAll,
}) => {
  const severityIcons: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  const severityColors: Record<string, string> = {
    critical: 'text-red-600 bg-red-50',
    high: 'text-orange-600 bg-orange-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50',
  };

  if (Object.keys(groupedIssues).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">✅</span>
          <p className="text-gray-600 text-lg">
            No issues found! Your code looks great.
          </p>
        </div>
      </div>
    );
  }

  const showSelection = onToggleSelection !== undefined;
  const totalIssues = Object.values(groupedIssues).reduce((sum, issues) => sum + issues.length, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Issues by File</h2>
        {showSelection && onToggleSelectAll && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={onToggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Select All ({totalIssues} issues)
          </label>
        )}
      </div>

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
                className="border-l-4 border-gray-200 pl-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {showSelection && onToggleSelection && (
                      <input
                        type="checkbox"
                        checked={selectedIssueIds.has(issue.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleSelection(issue.id);
                        }}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onSelectIssue(issue)}
                    >
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
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIssue(issue);
                    }}
                    className="ml-4 text-sm text-blue-600 hover:underline"
                  >
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
