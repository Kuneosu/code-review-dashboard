/**
 * Live Issue Summary Component
 */
import React from 'react';
import type { LiveSummary } from '@/stores/phase2Store';

interface LiveIssueSummaryProps {
  summary: LiveSummary;
}

export const LiveIssueSummary: React.FC<LiveIssueSummaryProps> = ({
  summary,
}) => {
  return (
    <div className="mt-6 bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        발견된 이슈 (실시간)
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-2xl mr-2">🔴</span>
            <span className="text-gray-700">Critical</span>
          </span>
          <span className="text-xl font-bold text-red-600">
            {summary.critical}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-2xl mr-2">🟠</span>
            <span className="text-gray-700">High</span>
          </span>
          <span className="text-xl font-bold text-orange-600">
            {summary.high}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-2xl mr-2">🟡</span>
            <span className="text-gray-700">Medium</span>
          </span>
          <span className="text-xl font-bold text-yellow-600">
            {summary.medium}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span className="text-2xl mr-2">🟢</span>
            <span className="text-gray-700">Low</span>
          </span>
          <span className="text-xl font-bold text-green-600">
            {summary.low}
          </span>
        </div>
        <div className="pt-3 border-t border-gray-300">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">Total</span>
            <span className="text-2xl font-bold text-blue-600">
              {summary.total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
