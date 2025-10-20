/**
 * TypeScript type definitions
 */

export enum FileType {
  FILE = 'file',
  DIRECTORY = 'directory',
}

export enum Language {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  UNKNOWN = 'unknown',
}

export interface FileNode {
  name: string;
  path: string;
  type: FileType;
  children?: FileNode[];
  size?: number;
  filtered?: boolean;
}

export interface FilterRule {
  pattern: string;
  exclude: boolean;
  description?: string;
}

export interface FilterPreset {
  language: Language;
  rules: FilterRule[];
}

export interface FilterConfig {
  project_path: string;
  presets: FilterPreset[];
  gitignore_rules: FilterRule[];
  custom_rules: FilterRule[];
  use_presets: boolean;
  use_gitignore: boolean;
}

export interface FilterStats {
  total_files: number;
  selected_files: number;
  filtered_files: number;
}

export interface ErrorState {
  type: 'permission_denied' | 'parse_error' | 'network_error' | 'unknown';
  message: string;
  path?: string;
  recoverable: boolean;
}

export enum Analyzer {
  ESLINT = 'eslint',
  BANDIT = 'bandit',
  CUSTOM_PATTERN = 'custom_pattern',
  SEMGREP = 'semgrep',
}

// API Request/Response types
export interface ScanProjectRequest {
  project_path: string;
}

export interface ScanProjectResponse {
  file_tree: FileNode;
  total_files: number;
  gitignore_found: boolean;
}

export interface ApplyFiltersRequest {
  project_path: string;
  filter_config: FilterConfig;
}

export interface ApplyFiltersResponse {
  filtered_tree: FileNode;
  stats: FilterStats;
  selected_file_paths: string[];
}

export interface ExportConfigResponse {
  config_json: string;
  exported_at: string;
}

// Phase 2: Analysis types
export interface Issue {
  id: string;
  file: string;
  line: number;
  column: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'quality';
  rule: string;
  message: string;
  code_snippet: string;
  tool: string;
}

export interface AnalysisResult {
  analysis_id: string;
  status: 'COMPLETED';
  project_path: string;  // Project path for VS Code file opening
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  issues: Issue[];
  completed_at: string;
  elapsed_time: number;
  total_files: number;
}
