/**
 * Charts Component
 *
 * Displays severity and category distribution charts using Recharts
 */
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Issue } from '@/types';

interface ChartsProps {
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  issues: Issue[];
}

export const Charts: React.FC<ChartsProps> = ({ summary, issues }) => {
  // Severity distribution data
  const severityData = [
    { name: 'Critical', value: summary.critical, color: '#dc2626' },
    { name: 'High', value: summary.high, color: '#ea580c' },
    { name: 'Medium', value: summary.medium, color: '#ca8a04' },
    { name: 'Low', value: summary.low, color: '#16a34a' },
  ].filter((item) => item.value > 0); // Only show non-zero values

  // Calculate category distribution
  const categoryCount = issues.reduce<Record<string, number>>(
    (acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    },
    {}
  );

  const categoryData = [
    { name: 'Security', count: categoryCount.security || 0 },
    { name: 'Performance', count: categoryCount.performance || 0 },
    { name: 'Quality', count: categoryCount.quality || 0 },
  ].filter((item) => item.count > 0); // Only show non-zero values

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Severity Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Severity Distribution</h3>
        {severityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No severity data available
          </div>
        )}
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No category data available
          </div>
        )}
      </div>
    </div>
  );
};
