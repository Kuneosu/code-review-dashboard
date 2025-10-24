/**
 * Phase 1 Zustand Store: Project selection and file filtering
 */
import { create } from 'zustand';
import {
  FileNode,
  FilterConfig,
  ErrorState,
  FilterStats,
} from '@/types';
import * as api from '@/utils/api';

interface Phase1State {
  // State
  projectPath: string;
  fileTree: FileNode | null;
  filterConfig: FilterConfig | null;
  filteredTree: FileNode | null;
  selectedFiles: string[];
  filterStats: FilterStats | null;
  gitignoreFound: boolean;

  isScanning: boolean;
  scanningMessage: string;
  scannedFilesCount: number;
  isApplyingFilters: boolean;
  error: ErrorState | null;

  // Recent projects (stored in localStorage)
  recentProjects: string[];

  // Actions
  setProjectPath: (path: string) => void;
  loadFileTree: () => Promise<void>;
  initializeFilterConfig: () => void;
  updateFilterConfig: (config: Partial<FilterConfig>) => void;
  applyFilters: () => Promise<void>;
  exportConfig: () => Promise<string>;
  importConfig: (json: string) => Promise<void>;
  clearError: () => void;
  addToRecentProjects: (path: string) => void;
  reset: () => void;
}

const RECENT_PROJECTS_KEY = 'smart-code-review-recent-projects';
const MAX_RECENT = 10;

const loadRecentProjects = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentProjects = (projects: string[]) => {
  try {
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save recent projects:', e);
  }
};

export const usePhase1Store = create<Phase1State>((set, get) => ({
  // Initial state
  projectPath: '',
  fileTree: null,
  filterConfig: null,
  filteredTree: null,
  selectedFiles: [],
  filterStats: null,
  gitignoreFound: false,

  isScanning: false,
  scanningMessage: '',
  scannedFilesCount: 0,
  isApplyingFilters: false,
  error: null,

  recentProjects: loadRecentProjects(),

  // Actions
  setProjectPath: (path: string) => {
    set({ projectPath: path, error: null });
  },

  loadFileTree: async () => {
    const { projectPath } = get();

    if (!projectPath) {
      set({
        error: {
          type: 'parse_error',
          message: 'Please select a project path',
          recoverable: true,
        },
      });
      return;
    }

    set({
      isScanning: true,
      scanningMessage: '프로젝트 스캔 중...',
      scannedFilesCount: 0,
      error: null,
    });

    try {
      // Update message for gitignore parsing
      set({ scanningMessage: '.gitignore 규칙 확인 중...' });

      const response = await api.scanProject({ project_path: projectPath });

      // Calculate total scanned files
      const countFiles = (node: FileNode): number => {
        if (node.type === 'file') return 1;
        return (node.children || []).reduce((sum, child) => sum + countFiles(child), 0);
      };

      const totalFiles = countFiles(response.file_tree);

      set({
        fileTree: response.file_tree,
        gitignoreFound: response.gitignore_found,
        scannedFilesCount: totalFiles,
        scanningMessage: `${totalFiles.toLocaleString()}개 파일 스캔 완료`,
        isScanning: false,
      });

      // Initialize filter config
      get().initializeFilterConfig();

      // Add to recent projects
      get().addToRecentProjects(projectPath);

      // Clear scanning message after 2 seconds
      setTimeout(() => {
        set({ scanningMessage: '' });
      }, 2000);

    } catch (error: any) {
      set({
        isScanning: false,
        scanningMessage: '',
        scannedFilesCount: 0,
        error: {
          type: error.error_type || 'unknown',
          message: error.message || 'Failed to scan project',
          path: projectPath,
          recoverable: error.recoverable ?? true,
        },
      });
    }
  },

  initializeFilterConfig: () => {
    const { projectPath } = get();

    set({
      filterConfig: {
        project_path: projectPath,
        presets: [],
        gitignore_rules: [],
        custom_rules: [],
        use_presets: true,
        use_gitignore: true,
      },
    });
  },

  updateFilterConfig: (config: Partial<FilterConfig>) => {
    const current = get().filterConfig;
    if (current) {
      set({
        filterConfig: { ...current, ...config },
      });
    }
  },

  applyFilters: async () => {
    const { projectPath, filterConfig } = get();

    if (!filterConfig) {
      set({
        error: {
          type: 'parse_error',
          message: 'Filter configuration not initialized',
          recoverable: true,
        },
      });
      return;
    }

    set({ isApplyingFilters: true, error: null });

    try {
      const response = await api.applyFilters({
        project_path: projectPath,
        filter_config: filterConfig,
      });

      set({
        filteredTree: response.filtered_tree,
        selectedFiles: response.selected_file_paths,
        filterStats: response.stats,
        isApplyingFilters: false,
      });

    } catch (error: any) {
      set({
        isApplyingFilters: false,
        error: {
          type: error.error_type || 'unknown',
          message: error.message || 'Failed to apply filters',
          recoverable: error.recoverable ?? true,
        },
      });
    }
  },

  exportConfig: async (): Promise<string> => {
    const { filterConfig } = get();

    if (!filterConfig) {
      throw new Error('No filter configuration to export');
    }

    try {
      const response = await api.exportFilterConfig({ filter_config: filterConfig });
      return response.config_json;
    } catch (error: any) {
      set({
        error: {
          type: 'unknown',
          message: error.message || 'Failed to export configuration',
          recoverable: true,
        },
      });
      throw error;
    }
  },

  importConfig: async (json: string) => {
    try {
      const config = await api.importFilterConfig({ config_json: json });
      set({ filterConfig: config, error: null });
    } catch (error: any) {
      set({
        error: {
          type: 'parse_error',
          message: error.message || 'Failed to import configuration',
          recoverable: true,
        },
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  addToRecentProjects: (path: string) => {
    const { recentProjects } = get();

    // Remove if already exists
    const filtered = recentProjects.filter(p => p !== path);

    // Add to front
    const updated = [path, ...filtered].slice(0, MAX_RECENT);

    set({ recentProjects: updated });
    saveRecentProjects(updated);
  },

  reset: () => {
    set({
      projectPath: '',
      fileTree: null,
      filterConfig: null,
      filteredTree: null,
      selectedFiles: [],
      filterStats: null,
      gitignoreFound: false,
      isScanning: false,
      scanningMessage: '',
      scannedFilesCount: 0,
      isApplyingFilters: false,
      error: null,
    });
  },
}));
