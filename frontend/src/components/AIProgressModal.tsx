/**
 * AI Progress Modal Component
 *
 * Shows real-time progress of AI analysis with progress bar and status
 */
import React, { useEffect } from 'react';
import { useAIAnalysisStore, AIAnalysisStatus } from '@/stores/aiAnalysisStore';

interface AIProgressModalProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const AIProgressModal: React.FC<AIProgressModalProps> = ({
  onComplete,
  onCancel,
}) => {
  const {
    status,
    progress,
    completedCount,
    totalCount,
    estimatedRemaining,
    error,
    queueId,
    fetchQueueStatus,
  } = useAIAnalysisStore();

  // Poll for status updates
  useEffect(() => {
    if (!queueId) return;

    // Auto-complete when analysis is done
    if (status === AIAnalysisStatus.COMPLETED) {
      onComplete();
      return;
    }

    // Poll every 2 seconds
    const interval = setInterval(() => {
      if (status === AIAnalysisStatus.ANALYZING) {
        fetchQueueStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [queueId, status, fetchQueueStatus, onComplete]);

  // Format time helper
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            AI Analysis in Progress
          </h2>
          <p className="text-gray-600">
            {status === AIAnalysisStatus.INITIALIZING && 'Initializing Ollama...'}
            {status === AIAnalysisStatus.ANALYZING && 'Analyzing code issues...'}
            {status === AIAnalysisStatus.FAILED && 'Analysis failed'}
          </p>
        </div>

        {/* Progress Bar */}
        {status === AIAnalysisStatus.ANALYZING && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                {completedCount} / {totalCount} issues
              </span>
              <span>{progress}%</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              >
                <div className="h-full w-full animate-pulse bg-blue-400 opacity-50"></div>
              </div>
            </div>

            {estimatedRemaining > 0 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Estimated time remaining: {formatTime(estimatedRemaining)}
              </p>
            )}
          </div>
        )}

        {/* Loading Animation */}
        {status === AIAnalysisStatus.INITIALIZING && (
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          </div>
        )}

        {/* Error Message */}
        {status === AIAnalysisStatus.FAILED && error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Status Messages */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Status</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Connected to Ollama
            </li>
            <li className="flex items-center gap-2">
              <span className={status === AIAnalysisStatus.ANALYZING ? 'text-blue-500' : 'text-gray-400'}>
                {status === AIAnalysisStatus.ANALYZING ? '⟳' : '○'}
              </span>
              Analyzing code issues
            </li>
            <li className="flex items-center gap-2">
              <span className={status === AIAnalysisStatus.COMPLETED ? 'text-green-500' : 'text-gray-400'}>
                {status === AIAnalysisStatus.COMPLETED ? '✓' : '○'}
              </span>
              Generating recommendations
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            disabled={status === AIAnalysisStatus.COMPLETED}
          >
            {status === AIAnalysisStatus.FAILED ? 'Close' : 'Cancel'}
          </button>
          {status === AIAnalysisStatus.COMPLETED && (
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View Results →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
