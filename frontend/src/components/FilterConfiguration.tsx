/**
 * Filter Configuration Component
 * Allows users to configure file filtering rules
 */
import React, { useState, useEffect } from 'react';
import { usePhase1Store } from '@/stores/phase1Store';
import { FilterRule, FilterPreset, Language } from '@/types';

// Common preset rules (matches backend COMMON_PRESET)
const COMMON_PRESET_RULES: Record<string, FilterRule[]> = {
  'Version Control': [
    { pattern: '**/.git/**', exclude: true, description: 'Git repository' },
    { pattern: '**/.svn/**', exclude: true, description: 'SVN repository' },
  ],
  'IDE & Editor': [
    { pattern: '**/.idea/**', exclude: true, description: 'IntelliJ IDEA' },
    { pattern: '**/.vscode/**', exclude: true, description: 'VS Code settings' },
    { pattern: '**/*.swp', exclude: true, description: 'Vim swap files' },
    { pattern: '**/*.swo', exclude: true, description: 'Vim swap files' },
  ],
  'OS Files': [
    { pattern: '**/.DS_Store', exclude: true, description: 'macOS metadata' },
    { pattern: '**/Thumbs.db', exclude: true, description: 'Windows metadata' },
  ],
  'Environment & Secrets': [
    { pattern: '**/.env', exclude: true, description: 'Environment variables' },
    { pattern: '**/.env.local', exclude: true, description: 'Local environment' },
    { pattern: '**/.env.*.local', exclude: true, description: 'Environment files' },
  ],
  'Logs': [
    { pattern: '**/*.log', exclude: true, description: 'Log files' },
    { pattern: '**/logs/**', exclude: true, description: 'Log directory' },
  ],
  'JavaScript/TypeScript': [
    { pattern: '**/node_modules/**', exclude: true, description: 'Node modules' },
    { pattern: '**/dist/**', exclude: true, description: 'Distribution files' },
    { pattern: '**/build/**', exclude: true, description: 'Build output' },
    { pattern: '**/out/**', exclude: true, description: 'Output directory' },
    { pattern: '**/.next/**', exclude: true, description: 'Next.js build' },
    { pattern: '**/coverage/**', exclude: true, description: 'Coverage reports' },
    { pattern: '**/*.min.js', exclude: true, description: 'Minified JavaScript' },
    { pattern: '**/*.bundle.js', exclude: true, description: 'Bundle files' },
    { pattern: '**/*.map', exclude: true, description: 'Source maps' },
    { pattern: '**/*.tsbuildinfo', exclude: true, description: 'TypeScript build info' },
  ],
  'Python': [
    { pattern: '**/__pycache__/**', exclude: true, description: 'Python cache' },
    { pattern: '**/*.pyc', exclude: true, description: 'Compiled Python' },
    { pattern: '**/*.pyo', exclude: true, description: 'Optimized Python' },
    { pattern: '**/.venv/**', exclude: true, description: 'Virtual environment' },
    { pattern: '**/venv/**', exclude: true, description: 'Virtual environment' },
    { pattern: '**/env/**', exclude: true, description: 'Environment directory' },
    { pattern: '**/.pytest_cache/**', exclude: true, description: 'Pytest cache' },
    { pattern: '**/*.egg-info/**', exclude: true, description: 'Python egg info' },
    { pattern: '**/.mypy_cache/**', exclude: true, description: 'MyPy cache' },
    { pattern: '**/.ruff_cache/**', exclude: true, description: 'Ruff cache' },
  ],
  'Package Locks': [
    { pattern: '**/package-lock.json', exclude: true, description: 'NPM lock file' },
    { pattern: '**/yarn.lock', exclude: true, description: 'Yarn lock file' },
    { pattern: '**/pnpm-lock.yaml', exclude: true, description: 'PNPM lock file' },
  ],
  'Documentation & Config': [
    { pattern: '**/*.md', exclude: true, description: 'Markdown files' },
    { pattern: '**/*.json', exclude: true, description: 'JSON files' },
  ],
  'Images': [
    { pattern: '**/*.png', exclude: true, description: 'PNG images' },
    { pattern: '**/*.jpg', exclude: true, description: 'JPG images' },
    { pattern: '**/*.jpeg', exclude: true, description: 'JPEG images' },
    { pattern: '**/*.gif', exclude: true, description: 'GIF images' },
    { pattern: '**/*.svg', exclude: true, description: 'SVG images' },
    { pattern: '**/*.ico', exclude: true, description: 'Icon files' },
    { pattern: '**/*.webp', exclude: true, description: 'WebP images' },
  ],
  'Videos & Audio': [
    { pattern: '**/*.mp4', exclude: true, description: 'MP4 videos' },
    { pattern: '**/*.mov', exclude: true, description: 'MOV videos' },
    { pattern: '**/*.avi', exclude: true, description: 'AVI videos' },
    { pattern: '**/*.webm', exclude: true, description: 'WebM videos' },
    { pattern: '**/*.m4a', exclude: true, description: 'M4A audio' },
    { pattern: '**/*.mp3', exclude: true, description: 'MP3 audio' },
    { pattern: '**/*.wav', exclude: true, description: 'WAV audio' },
  ],
};

export const FilterConfiguration: React.FC = () => {
  const {
    filterConfig,
    updateFilterConfig,
    applyFilters,
    isApplyingFilters,
    gitignoreFound,
    exportConfig,
    importConfig,
  } = usePhase1Store();

  const [newRulePattern, setNewRulePattern] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Track which preset rules are enabled (pattern -> enabled)
  const [enabledPresetRules, setEnabledPresetRules] = useState<Record<string, boolean>>({});

  // Initialize all rules as enabled on first load
  useEffect(() => {
    const initialState: Record<string, boolean> = {};
    Object.values(COMMON_PRESET_RULES).forEach(rules => {
      rules.forEach(rule => {
        initialState[rule.pattern] = true; // All enabled by default
      });
    });
    setEnabledPresetRules(initialState);
  }, []);

  if (!filterConfig) return null;

  const handleTogglePresetRule = (pattern: string) => {
    setEnabledPresetRules(prev => ({
      ...prev,
      [pattern]: !prev[pattern],
    }));
  };

  const handleToggleCategoryAll = (category: string, enabled: boolean) => {
    const rules = COMMON_PRESET_RULES[category];
    const updates: Record<string, boolean> = {};
    rules.forEach(rule => {
      updates[rule.pattern] = enabled;
    });
    setEnabledPresetRules(prev => ({
      ...prev,
      ...updates,
    }));
  };

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

  const handleApplyFilters = () => {
    // Create a preset with only enabled rules
    const enabledRules: FilterRule[] = [];
    Object.values(COMMON_PRESET_RULES).forEach(rules => {
      rules.forEach(rule => {
        if (enabledPresetRules[rule.pattern]) {
          enabledRules.push(rule);
        }
      });
    });

    const customPreset: FilterPreset = {
      language: Language.UNKNOWN,
      rules: enabledRules,
    };

    // Update filter config with custom preset
    updateFilterConfig({
      presets: [customPreset],
      use_presets: true,
    });

    // Apply filters
    setTimeout(() => {
      applyFilters();
    }, 100);
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

  const getCategoryStats = (category: string) => {
    const rules = COMMON_PRESET_RULES[category];
    const enabledCount = rules.filter(rule => enabledPresetRules[rule.pattern]).length;
    const totalCount = rules.length;
    return { enabled: enabledCount, total: totalCount, allEnabled: enabledCount === totalCount };
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Filter Settings</h2>

      <div className="space-y-4">
        {/* Gitignore Info */}
        {gitignoreFound && (
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">
              ✓ .gitignore file found
            </p>
          </div>
        )}

        {/* Preset Rules with Checkboxes */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Common Filter Presets:</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-3">
            {Object.entries(COMMON_PRESET_RULES).map(([category, rules]) => {
              const stats = getCategoryStats(category);
              return (
                <div key={category} className="border-b border-gray-100 pb-3 last:border-b-0">
                  {/* Category Header with Select All */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stats.allEnabled}
                        onChange={(e) => handleToggleCategoryAll(category, e.target.checked)}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {category}
                      </span>
                    </label>
                    <span className="text-xs text-gray-500">
                      {stats.enabled}/{stats.total}
                    </span>
                  </div>

                  {/* Individual Rules */}
                  <div className="ml-6 space-y-1">
                    {rules.map((rule) => (
                      <label
                        key={rule.pattern}
                        className="flex items-start cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={enabledPresetRules[rule.pattern] || false}
                          onChange={() => handleTogglePresetRule(rule.pattern)}
                          className="mr-2 mt-0.5 w-3.5 h-3.5"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-mono text-gray-700">{rule.pattern}</span>
                          {rule.description && (
                            <span className="text-xs text-gray-500 ml-2">- {rule.description}</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
          onClick={handleApplyFilters}
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
