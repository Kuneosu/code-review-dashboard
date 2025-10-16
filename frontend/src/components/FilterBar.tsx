/**
 * Filter Bar Component
 *
 * Provides filtering, sorting, and export controls
 */
import React from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';

export const FilterBar: React.FC = () => {
  const { filters, setFilter, sortBy, setSortBy, exportResult } =
    useDashboardStore();

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Severity Filter */}
        <div>
          <label className="text-sm text-gray-600 mr-2">Severity:</label>
          <select
            value={filters.severity.length > 0 ? filters.severity[0] : ''}
            onChange={(e) =>
              setFilter('severity', e.target.value ? [e.target.value] : [])
            }
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-sm text-gray-600 mr-2">Category:</label>
          <select
            value={filters.category.length > 0 ? filters.category[0] : ''}
            onChange={(e) =>
              setFilter('category', e.target.value ? [e.target.value] : [])
            }
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
            <option value="quality">Quality</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="text-sm text-gray-600 mr-2">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'severity' | 'file' | 'line')}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="severity">Severity</option>
            <option value="file">File</option>
            <option value="line">Line Number</option>
          </select>
        </div>

        {/* Export Buttons */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportResult('json')}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
          >
            📥 Export JSON
          </button>
          <button
            onClick={() => exportResult('md')}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
          >
            📄 Export Markdown
          </button>
        </div>
      </div>
    </div>
  );
};
