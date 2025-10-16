/**
 * Phase 2 Store: Analysis state management
 */
import { create } from 'zustand';

export enum AnalysisStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface LiveSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface Phase2State {
  // Analysis state
  analysisId: string | null;
  status: AnalysisStatus;
  progress: number;
  currentFile: string | null;
  completedFiles: number;
  totalFiles: number;
  selectedFilesCount: number;
  elapsedTime: number;
  estimatedRemaining: number;
  liveSummary: LiveSummary | null;
  error: string | null;

  // Actions
  startAnalysis: (
    selectedFiles: string[],
    projectPath: string
  ) => Promise<void>;
  fetchStatus: () => Promise<void>;
  pauseAnalysis: () => Promise<void>;
  resumeAnalysis: () => Promise<void>;
  cancelAnalysis: () => Promise<void>;
  reset: () => void;
}

export const usePhase2Store = create<Phase2State>((set, get) => ({
  // Initial state
  analysisId: null,
  status: AnalysisStatus.IDLE,
  progress: 0,
  currentFile: null,
  completedFiles: 0,
  totalFiles: 0,
  selectedFilesCount: 0,
  elapsedTime: 0,
  estimatedRemaining: 0,
  liveSummary: null,
  error: null,

  // Start analysis
  startAnalysis: async (selectedFiles, projectPath) => {
    try {
      console.log('[DEBUG] Starting analysis...', {
        selectedFiles: selectedFiles.length,
        projectPath,
      });

      const api = await import('@/utils/api');

      const data = await api.startAnalysis({
        project_path: projectPath,
        selected_files: selectedFiles,
        categories: ['security', 'performance', 'quality'],
      });

      console.log('[DEBUG] Analysis started:', data);

      set({
        analysisId: data.analysis_id,
        status: AnalysisStatus.PENDING,
        progress: 0,
        selectedFilesCount: selectedFiles.length,
        totalFiles: 0,
        completedFiles: 0,
        error: null,
      });
    } catch (error: any) {
      console.error('[DEBUG] Failed to start analysis:', error);
      set({
        status: AnalysisStatus.FAILED,
        error: error.message || 'Failed to start analysis',
      });
    }
  },

  // Fetch status (for polling)
  fetchStatus: async () => {
    const { analysisId } = get();
    if (!analysisId) {
      console.warn('[DEBUG] No analysisId, skipping fetchStatus');
      return;
    }

    try {
      const api = await import('@/utils/api');
      const data = await api.getAnalysisStatus(analysisId);

      console.log('[DEBUG] Status fetched:', {
        status: data.status,
        progress: data.progress,
        completedFiles: data.completed_files,
        totalFiles: data.total_files,
        currentFile: data.current_file,
      });

      set({
        status: data.status as AnalysisStatus,
        progress: data.progress,
        currentFile: data.current_file,
        completedFiles: data.completed_files,
        totalFiles: data.total_files,
        selectedFilesCount: data.selected_files_count,
        elapsedTime: data.elapsed_time,
        estimatedRemaining: data.estimated_remaining,
        liveSummary: data.live_summary,
      });
    } catch (error: any) {
      console.error('[DEBUG] Failed to fetch status:', error);
    }
  },

  // Pause analysis
  pauseAnalysis: async () => {
    const { analysisId } = get();
    if (!analysisId) return;

    try {
      const api = await import('@/utils/api');
      await api.pauseAnalysis(analysisId);
      set({ status: AnalysisStatus.PAUSED });
    } catch (error: any) {
      console.error('Failed to pause analysis:', error);
    }
  },

  // Resume analysis
  resumeAnalysis: async () => {
    const { analysisId } = get();
    if (!analysisId) return;

    try {
      const api = await import('@/utils/api');
      await api.resumeAnalysis(analysisId);
      set({ status: AnalysisStatus.RUNNING });
    } catch (error: any) {
      console.error('Failed to resume analysis:', error);
    }
  },

  // Cancel analysis
  cancelAnalysis: async () => {
    const { analysisId } = get();
    if (!analysisId) return;

    try {
      const api = await import('@/utils/api');
      await api.cancelAnalysis(analysisId);
      set({ status: AnalysisStatus.CANCELLED });
    } catch (error: any) {
      console.error('Failed to cancel analysis:', error);
    }
  },

  // Reset state
  reset: () => {
    set({
      analysisId: null,
      status: AnalysisStatus.IDLE,
      progress: 0,
      currentFile: null,
      completedFiles: 0,
      totalFiles: 0,
      selectedFilesCount: 0,
      elapsedTime: 0,
      estimatedRemaining: 0,
      liveSummary: null,
      error: null,
    });
  },
}));
