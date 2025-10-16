/**
 * Progress Bar Component
 */
import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  completedFiles: number;
  totalFiles: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  completedFiles,
  totalFiles,
}) => {
  const percentage = Math.round(progress);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">진행률</span>
        <span className="text-sm font-medium text-gray-700">
          {percentage}% ({completedFiles}/{totalFiles})
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
          style={{ width: `${percentage}%` }}
        >
          {percentage > 5 && (
            <span className="text-xs text-white font-medium">
              {percentage}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
