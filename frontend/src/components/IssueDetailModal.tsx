/**
 * Issue Detail Modal Component
 *
 * Displays detailed information about a specific issue with code snippet
 */
import React from 'react';
import { Issue } from '@/types';

interface IssueDetailModalProps {
  issue: Issue;
  projectPath: string;
  onClose: () => void;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issue,
  projectPath,
  onClose,
}) => {
  const handleOpenInVSCode = () => {
    // VS Code Extension으로 메시지 전송
    if (window.vscodeApi) {
      window.vscodeApi.postMessage({
        type: 'openFile',
        projectPath: projectPath,  // Add project path
        file: issue.file,
        line: issue.line,
        column: issue.column,
      });
    } else {
      console.warn('[WARN] VS Code API not available');
      alert('VS Code integration not available in this context');
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(issue.code_snippet);
    alert('Code snippet copied to clipboard!');
  };

  const severityIcon =
    issue.severity === 'critical'
      ? '🔴'
      : issue.severity === 'high'
      ? '🟠'
      : issue.severity === 'medium'
      ? '🟡'
      : '🟢';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Issue Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Issue Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">{severityIcon}</span>
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
              <div>
                <span className="text-gray-600">⚠️ Severity:</span>
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    issue.severity === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : issue.severity === 'high'
                      ? 'bg-orange-100 text-orange-700'
                      : issue.severity === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {issue.severity.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">🏷️ Category:</span>
                <span className="ml-2 capitalize">{issue.category}</span>
              </div>
            </div>
          </div>

          {/* Code Snippet */}
          {issue.code_snippet && (
            <div>
              <h4 className="text-lg font-semibold mb-2">Code Context</h4>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {issue.code_snippet}
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleOpenInVSCode}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Open in VS Code
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
