/**
 * Summary Cards Component
 *
 * Displays 4 summary cards with key metrics
 */
import React from 'react';

interface SummaryCardsProps {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  affectedFiles: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  affectedFiles,
}) => {
  const cards = [
    {
      icon: '📊',
      label: 'Total Issues',
      value: summary.total,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: '🔴',
      label: 'Critical',
      value: summary.critical,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      icon: '🟠',
      label: 'High',
      value: summary.high,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: '📁',
      label: 'Affected Files',
      value: affectedFiles,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.label}</p>
              <p className={`text-3xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </div>
            <span className="text-4xl">{card.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
