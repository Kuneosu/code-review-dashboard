/**
 * Phase 2 Page: Analysis Progress
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhase2Store, AnalysisStatus } from '@/stores/phase2Store';
import { ProgressBar } from '@/components/ProgressBar';
import { LiveIssueSummary } from '@/components/LiveIssueSummary';

export const Phase2Page: React.FC = () => {
  const navigate = useNavigate();

  const {
    analysisId,
    status,
    progress,
    currentFile,
    completedFiles,
    totalFiles,
    selectedFilesCount,
    elapsedTime,
    estimatedRemaining,
    liveSummary,
    error,
    fetchStatus,
    pauseAnalysis,
    resumeAnalysis,
    cancelAnalysis,
    reset,
  } = usePhase2Store();

  // Polling every 2 seconds
  useEffect(() => {
    if (status === AnalysisStatus.RUNNING || status === AnalysisStatus.PENDING) {
      console.log('[DEBUG] Starting polling for status:', status);

      // Fetch immediately
      fetchStatus();

      // Then poll every 2 seconds
      const interval = setInterval(() => {
        console.log('[DEBUG] Polling status...');
        fetchStatus();
      }, 2000);

      return () => {
        console.log('[DEBUG] Stopping polling');
        clearInterval(interval);
      };
    }
  }, [status]); // Remove fetchStatus from dependencies

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === AnalysisStatus.IDLE) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No analysis in progress</p>
          <a href="/" className="text-blue-600 hover:underline mt-2 block">
            Go to Phase 1
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-3xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              {status === AnalysisStatus.PENDING && '⏳ 분석 준비 중...'}
              {status === AnalysisStatus.RUNNING && '🔍 코드 분석 중...'}
              {status === AnalysisStatus.PAUSED && '⏸️ 분석 일시정지됨'}
              {status === AnalysisStatus.COMPLETED && '✅ 분석 완료!'}
              {status === AnalysisStatus.FAILED && '❌ 분석 실패'}
              {status === AnalysisStatus.CANCELLED && '🚫 분석 취소됨'}
            </h1>
            <p className="text-gray-600 mt-2">
              Smart Code Review - Analysis Progress
            </p>
          </div>

          {/* Progress Bar */}
          {(status === AnalysisStatus.RUNNING || status === AnalysisStatus.PAUSED) && (
            <>
              <div className="mb-2 text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span>📁 선택된 파일: <strong>{selectedFilesCount}개</strong></span>
                  <span className="text-gray-400">|</span>
                  <span>🔍 분석 단계: <strong>{completedFiles} / {totalFiles}</strong></span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  * 각 파일이 여러 분석기(ESLint, Bandit, Security Pattern)에 의해 처리됩니다
                </div>
              </div>
              <ProgressBar
                progress={progress * 100}
                completedFiles={completedFiles}
                totalFiles={totalFiles}
              />

              {/* Current Status */}
              <div className="mt-6 space-y-2 text-gray-700">
                {currentFile && (
                  <div className="flex items-start">
                    <span className="text-2xl mr-2">📄</span>
                    <div className="flex-1">
                      <span className="block">현재 파일:</span>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded block mt-1 break-all">
                        {currentFile}
                      </code>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⏱️</span>
                  <span>소요 시간: {formatTime(elapsedTime)}</span>
                </div>
                {estimatedRemaining > 0 && (
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">⏳</span>
                    <span>예상 남은 시간: {formatTime(estimatedRemaining)}</span>
                  </div>
                )}
              </div>

              {/* Live Issue Summary */}
              {liveSummary && (
                <div className="mt-6">
                  <LiveIssueSummary summary={liveSummary} />
                </div>
              )}

              {/* Control Buttons */}
              <div className="mt-8 flex gap-4">
                {status === AnalysisStatus.RUNNING && (
                  <>
                    <button
                      onClick={pauseAnalysis}
                      className="px-6 py-3 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                    >
                      ⏸️ 일시 정지
                    </button>
                    <button
                      onClick={cancelAnalysis}
                      className="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      ⏹️ 중단
                    </button>
                  </>
                )}
                {status === AnalysisStatus.PAUSED && (
                  <>
                    <button
                      onClick={resumeAnalysis}
                      className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    >
                      ▶️ 재개
                    </button>
                    <button
                      onClick={cancelAnalysis}
                      className="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      ⏹️ 중단
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Completed Message */}
          {status === AnalysisStatus.COMPLETED && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-xl text-gray-700 mb-4">
                분석이 완료되었습니다!
              </p>
              {liveSummary && (
                <p className="text-gray-600 mb-6">
                  총 {liveSummary.total}개의 이슈가 발견되었습니다
                </p>
              )}
              <button
                onClick={() => {
                  if (analysisId) {
                    navigate(`/dashboard?id=${analysisId}`);
                  } else {
                    console.error('[ERROR] No analysisId available');
                  }
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                결과 보기 →
              </button>
            </div>
          )}

          {/* Error Message */}
          {status === AnalysisStatus.FAILED && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-red-900 font-semibold text-lg mb-3">⚠️ 분석 실패</h3>
              <p className="text-red-800 mb-4 whitespace-pre-line">
                {error || '알 수 없는 오류가 발생했습니다.\n\n프로젝트를 다시 선택하고 분석을 재시도해주세요.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    reset();
                    navigate('/');
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  처음으로 돌아가기
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  페이지 새로고침
                </button>
              </div>
            </div>
          )}

          {/* Cancelled Message */}
          {status === AnalysisStatus.CANCELLED && (
            <div className="text-center py-8">
              <p className="text-gray-700 mb-4">분석이 취소되었습니다</p>
              <button
                onClick={() => {
                  reset();
                  navigate('/');
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
