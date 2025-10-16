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

// API Request/Response types
export interface ScanProjectRequest {
  project_path: string;
}

export interface ScanProjectResponse {
  file_tree: FileNode;
  detected_language: Language;
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
