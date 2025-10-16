/**
 * AI Result Modal Component
 *
 * Displays AI-generated analysis results with navigation between multiple results
 */
import React from 'react';
import { useAIAnalysisStore, AIAnalysisResult } from '@/stores/aiAnalysisStore';

interface AIResultModalProps {
  onClose: () => void;
}

export const AIResultModal: React.FC<AIResultModalProps> = ({ onClose }) => {
  const {
    results,
    currentResultIndex,
    selectedIssues,
    setCurrentResultIndex,
  } = useAIAnalysisStore();

  if (results.length === 0) {
    return null;
  }

  const currentResult: AIAnalysisResult = results[currentResultIndex];
  const currentIssue = selectedIssues[currentResultIndex];

  const handlePrevious = () => {
    if (currentResultIndex > 0) {
      setCurrentResultIndex(currentResultIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentResultIndex < results.length - 1) {
      setCurrentResultIndex(currentResultIndex + 1);
    }
  };

  const formatTime = (seconds: number) => {
    return seconds < 1 ? '<1s' : `${seconds.toFixed(1)}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
              <span>🤖</span>
              AI Analysis Result
            </h2>
            <p className="text-sm text-gray-600">
              {currentIssue?.file} • Line {currentIssue?.line} • {currentResult.analysis_time && formatTime(currentResult.analysis_time)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error State */}
          {currentResult.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Analysis Error</h3>
              <p className="text-red-600 text-sm">{currentResult.error}</p>
            </div>
          )}

          {/* Summary */}
          {currentResult.summary && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>📋</span>
                Summary
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700">{currentResult.summary}</p>
              </div>
            </div>
          )}

          {/* Root Cause */}
          {currentResult.root_cause && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>🔍</span>
                Root Cause
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{currentResult.root_cause}</p>
              </div>
            </div>
          )}

          {/* Impact */}
          {currentResult.impact && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>⚠️</span>
                Impact
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-gray-700">{currentResult.impact}</p>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {currentResult.recommendations && currentResult.recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>💡</span>
                Recommendations
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {currentResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span className="text-gray-700 flex-1">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Code Example */}
          {currentResult.code_examples && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>💻</span>
                Code Example
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  <code>{currentResult.code_examples.before}</code>
                </pre>
                {currentResult.code_examples.after && (
                  <>
                    <div className="my-3 text-center text-sm text-gray-500">↓ Suggested Fix ↓</div>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto bg-green-50 p-3 rounded">
                      <code>{currentResult.code_examples.after}</code>
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Original Issue Info */}
          <div className="border-t pt-4 mt-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Original Issue</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Severity:</strong> {currentIssue?.severity}</p>
              <p><strong>Category:</strong> {currentIssue?.category}</p>
              <p><strong>Rule:</strong> {currentIssue?.rule}</p>
              <p><strong>Tool:</strong> {currentIssue?.tool}</p>
              <p><strong>Message:</strong> {currentIssue?.message}</p>
            </div>
          </div>
        </div>

        {/* Footer with Navigation */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Result {currentResultIndex + 1} of {results.length}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentResultIndex === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentResultIndex === results.length - 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
