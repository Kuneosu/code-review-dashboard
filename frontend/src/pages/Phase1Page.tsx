/**
 * Phase 1 Page: Project Upload & File Filtering
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhase1Store } from '@/stores/phase1Store';
import { usePhase2Store } from '@/stores/phase2Store';
import { ProjectSelector } from '@/components/ProjectSelector';
import { FilterConfiguration } from '@/components/FilterConfiguration';
import { FileTreeViewer } from '@/components/FileTreeViewer';
import { Analyzer } from '@/types';

export const Phase1Page: React.FC = () => {
  const navigate = useNavigate();
  const {
    fileTree,
    filteredTree,
    filterStats,
    selectedFiles,
    projectPath,
    reset,
  } = usePhase1Store();
  const { startAnalysis, reset: resetPhase2 } = usePhase2Store();

  // Analyzer selection state
  const [selectedAnalyzers, setSelectedAnalyzers] = useState<Analyzer[]>([
    Analyzer.ESLINT,
    Analyzer.BANDIT,
    Analyzer.CUSTOM_PATTERN,
    Analyzer.SEMGREP,
  ]);

  // Show project selector if no file tree
  if (!fileTree) {
    return <ProjectSelector />;
  }

  // Handle reset/back button
  const handleReset = () => {
    console.log('Reset button clicked');
    reset();
    console.log('Reset completed, fileTree should be null now');
  };

  // Handle analyzer toggle
  const handleAnalyzerToggle = (analyzer: Analyzer) => {
    setSelectedAnalyzers((prev) =>
      prev.includes(analyzer)
        ? prev.filter((a) => a !== analyzer)
        : [...prev, analyzer]
    );
  };

  // Handle start analysis
  const handleStartAnalysis = async () => {
    if (!projectPath || selectedFiles.length === 0) {
      alert('프로젝트 경로와 파일을 먼저 선택해주세요');
      return;
    }

    if (selectedAnalyzers.length === 0) {
      alert('최소 1개 이상의 분석기를 선택해주세요');
      return;
    }

    try {
      // Reset Phase2 state before starting new analysis
      resetPhase2();
      await startAnalysis(selectedFiles, projectPath, selectedAnalyzers);
      // Navigate to Phase 2 page
      navigate('/analysis');
    } catch (error: any) {
      alert(`분석 시작 실패: ${error.message}`);
    }
  };

  // Analyzer metadata
  const analyzerInfo: Record<Analyzer, { label: string; description: string; fileTypes: string }> = {
    [Analyzer.ESLINT]: {
      label: 'ESLint',
      description: 'JavaScript/TypeScript 정적 분석',
      fileTypes: '.js, .ts, .jsx, .tsx',
    },
    [Analyzer.BANDIT]: {
      label: 'Bandit',
      description: 'Python 보안 취약점 분석',
      fileTypes: '.py',
    },
    [Analyzer.CUSTOM_PATTERN]: {
      label: 'Custom Pattern',
      description: '커스텀 보안 패턴 매칭',
      fileTypes: 'All files',
    },
    [Analyzer.SEMGREP]: {
      label: 'Semgrep',
      description: '고급 다중 언어 보안 분석 (5000+ 규칙)',
      fileTypes: 'All files',
    },
  };

  // Show filter configuration and file tree
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header with Reset Button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Smart Code Review</h1>
            <p className="text-gray-600 mt-2">Phase 1: Project Upload & File Filtering</p>
            <p className="text-sm text-gray-500 mt-1">
              📁 Project: <span className="font-mono">{projectPath}</span>
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            ← Change Project
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Filter Configuration */}
          <div className="lg:col-span-1">
            <FilterConfiguration />

            {/* Statistics */}
            {filterStats && (
              <div className="mt-4 bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Files:</span>
                    <span className="font-medium">{filterStats.total_files}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Selected:</span>
                    <span className="font-medium text-green-600">
                      {filterStats.selected_files}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Filtered:</span>
                    <span className="font-medium text-gray-500">
                      {filterStats.filtered_files}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Analyzer Selection */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Select Analyzers</h3>
                <div className="space-y-3">
                  {Object.entries(analyzerInfo).map(([analyzer, info]) => (
                    <label
                      key={analyzer}
                      className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAnalyzers.includes(analyzer as Analyzer)}
                        onChange={() => handleAnalyzerToggle(analyzer as Analyzer)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">{info.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{info.description}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Files: {info.fileTypes}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedAnalyzers.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">⚠️ 최소 1개 이상 선택해주세요</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={handleStartAnalysis}
                  disabled={selectedAnalyzers.length === 0}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Start Analysis →
                </button>
              </div>
            )}
          </div>

          {/* Right: File Tree Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <FileTreeViewer
                tree={filteredTree || fileTree}
                className=""
              />
            </div>
          </div>
        </div>

        {/* Bottom: Selected Files Summary */}
        {selectedFiles.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-3">
              Selected Files ({selectedFiles.length})
            </h3>
            <div className="max-h-40 overflow-auto">
              <ul className="text-sm space-y-1">
                {selectedFiles.slice(0, 20).map((path, index) => (
                  <li key={index} className="text-gray-600">
                    {path}
                  </li>
                ))}
                {selectedFiles.length > 20 && (
                  <li className="text-gray-500 italic">
                    ... and {selectedFiles.length - 20} more files
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
