/**
 * Phase 1 Page: Project Upload & File Filtering
 */
import React from 'react';
import { usePhase1Store } from '@/stores/phase1Store';
import { ProjectSelector } from '@/components/ProjectSelector';
import { FilterConfiguration } from '@/components/FilterConfiguration';
import { FileTreeViewer } from '@/components/FileTreeViewer';

export const Phase1Page: React.FC = () => {
  const {
    fileTree,
    filteredTree,
    filterStats,
    selectedFiles,
    projectPath,
    reset,
  } = usePhase1Store();

  // Show project selector if no file tree
  if (!fileTree) {
    return <ProjectSelector />;
  }

  // Handle reset/back button
  const handleReset = () => {
    // VS Code Webview에서는 confirm이 제대로 작동하지 않을 수 있으므로
    // 직접 reset 호출
    console.log('Reset button clicked');
    reset();
    console.log('Reset completed, fileTree should be null now');
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

            {/* Action Buttons */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => alert('Phase 2 will be implemented next!')}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Start Analysis →
                </button>
              </div>
            )}
          </div>

          {/* Right: File Tree Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">File Tree Preview</h2>
              <FileTreeViewer
                tree={filteredTree || fileTree}
                className="max-h-[600px]"
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
