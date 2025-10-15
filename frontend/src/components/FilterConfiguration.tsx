/**
 * Filter Configuration Component
 * Allows users to configure file filtering rules
 */
import React, { useState } from 'react';
import { usePhase1Store } from '@/stores/phase1Store';
import { FilterRule } from '@/types';

export const FilterConfiguration: React.FC = () => {
  const {
    filterConfig,
    updateFilterConfig,
    applyFilters,
    isApplyingFilters,
    detectedLanguage,
    gitignoreFound,
    exportConfig,
    importConfig,
  } = usePhase1Store();

  const [newRulePattern, setNewRulePattern] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  if (!filterConfig) return null;

  const handleAddCustomRule = () => {
    if (newRulePattern.trim()) {
      const newRule: FilterRule = {
        pattern: newRulePattern.trim(),
        exclude: true,
        description: 'Custom rule',
      };

      updateFilterConfig({
        custom_rules: [...filterConfig.custom_rules, newRule],
      });

      setNewRulePattern('');
    }
  };

  const handleRemoveCustomRule = (index: number) => {
    const updated = filterConfig.custom_rules.filter((_, i) => i !== index);
    updateFilterConfig({ custom_rules: updated });
  };

  const handleExport = async () => {
    try {
      const json = await exportConfig();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'filter-config.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = async () => {
    try {
      await importConfig(importJson);
      setShowImport(false);
      setImportJson('');
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Filter Settings</h2>

      <div className="space-y-4">
        {/* Language Info */}
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            Detected Language: <span className="font-medium">{detectedLanguage}</span>
          </p>
          {gitignoreFound && (
            <p className="text-sm text-gray-600 mt-1">
              ✓ .gitignore file found
            </p>
          )}
        </div>

        {/* Presets Toggle */}
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filterConfig.use_presets}
            onChange={(e) => updateFilterConfig({ use_presets: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">Apply language presets</span>
        </label>

        {/* Gitignore Toggle */}
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filterConfig.use_gitignore}
            onChange={(e) => updateFilterConfig({ use_gitignore: e.target.checked })}
            className="mr-2"
            disabled={!gitignoreFound}
          />
          <span className="text-sm">Use .gitignore rules</span>
        </label>

        {/* Custom Rules */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Custom Rules:</p>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newRulePattern}
              onChange={(e) => setNewRulePattern(e.target.value)}
              placeholder="*.log, node_modules/**, etc."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomRule()}
            />
            <button
              onClick={handleAddCustomRule}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Add
            </button>
          </div>

          {filterConfig.custom_rules.length > 0 && (
            <ul className="space-y-1">
              {filterConfig.custom_rules.map((rule, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-sm"
                >
                  <span>{rule.pattern}</span>
                  <button
                    onClick={() => handleRemoveCustomRule(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Apply Filters Button */}
        <button
          onClick={() => applyFilters()}
          disabled={isApplyingFilters}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isApplyingFilters ? 'Applying...' : 'Apply Filters'}
        </button>

        {/* Export/Import */}
        <div className="border-t pt-4 mt-4">
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Export Config
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Import Config
            </button>
          </div>

          {showImport && (
            <div className="mt-3">
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste JSON configuration here..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                rows={4}
              />
              <button
                onClick={handleImport}
                className="mt-2 w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Import
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
