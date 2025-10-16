/**
 * AI Analysis Store: Ollama-based AI analysis state management
 */
import { create } from 'zustand';

export enum AIAnalysisStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Issue {
  id: string;
  file: string;
  line: number;
  column: number;
  severity: string;
  category: string;
  rule: string;
  message: string;
  tool: string;
}

export interface AIAnalysisResult {
  issue_id: string;
  summary: string;
  root_cause: string;
  impact: string;
  recommendations: string[];
  code_examples?: {
    before: string;
    after: string;
    language: string;
  };
  analysis_time: number;
  error?: string;
}

export interface AIQueueStatus {
  queue_id: string;
  status: string;
  total_issues: number;
  completed: number;
  failed: number;
  progress: number;
  estimated_remaining: number;
  results: AIAnalysisResult[];
}

interface AIAnalysisState {
  // Ollama service state
  isOllamaAvailable: boolean;
  selectedModel: string | null;
  availableModels: string[];

  // Analysis state
  queueId: string | null;
  status: AIAnalysisStatus;
  selectedIssues: Issue[];
  progress: number;
  completedCount: number;
  totalCount: number;
  estimatedRemaining: number;
  error: string | null;

  // Results
  results: AIAnalysisResult[];
  currentResultIndex: number;

  // Actions
  checkOllamaHealth: () => Promise<void>;
  initializeOllama: () => Promise<void>;
  startAIAnalysis: (issues: Issue[], projectPath: string) => Promise<void>;
  fetchQueueStatus: () => Promise<void>;
  cancelAnalysis: () => Promise<void>;
  setCurrentResultIndex: (index: number) => void;
  reset: () => void;
}

export const useAIAnalysisStore = create<AIAnalysisState>((set, get) => ({
  // Initial state
  isOllamaAvailable: false,
  selectedModel: null,
  availableModels: [],

  queueId: null,
  status: AIAnalysisStatus.IDLE,
  selectedIssues: [],
  progress: 0,
  completedCount: 0,
  totalCount: 0,
  estimatedRemaining: 0,
  error: null,

  results: [],
  currentResultIndex: 0,

  // Check Ollama health
  checkOllamaHealth: async () => {
    try {
      console.log('[AI] Checking Ollama health...');

      const api = await import('@/utils/api');
      const data = await api.checkOllamaHealth();

      console.log('[AI] Health check result:', data);

      set({
        isOllamaAvailable: data.ollama.status === 'healthy',
        availableModels: data.ollama.models || [],
      });
    } catch (error: any) {
      console.error('[AI] Failed to check Ollama health:', error);
      set({
        isOllamaAvailable: false,
        availableModels: [],
        error: error.message || 'Failed to connect to Ollama service',
      });
    }
  },

  // Initialize Ollama
  initializeOllama: async () => {
    try {
      console.log('[AI] Initializing Ollama...');
      set({ status: AIAnalysisStatus.INITIALIZING });

      const api = await import('@/utils/api');
      const data = await api.initializeOllama();

      console.log('[AI] Initialization result:', data);

      set({
        selectedModel: data.model,
        availableModels: data.available_models || [],
        isOllamaAvailable: true,
        status: AIAnalysisStatus.IDLE,
        error: null,
      });
    } catch (error: any) {
      console.error('[AI] Failed to initialize Ollama:', error);
      set({
        status: AIAnalysisStatus.FAILED,
        error: error.message || 'Failed to initialize Ollama',
      });
    }
  },

  // Start AI analysis
  startAIAnalysis: async (issues, projectPath) => {
    try {
      console.log('[AI] Starting AI analysis...', {
        issueCount: issues.length,
        projectPath,
      });

      set({
        status: AIAnalysisStatus.ANALYZING,
        selectedIssues: issues,
        totalCount: issues.length,
        completedCount: 0,
        progress: 0,
        error: null,
      });

      const api = await import('@/utils/api');
      const data = await api.startAIAnalysis({
        project_path: projectPath,
        issues: issues.map((issue) => ({
          file: issue.file,
          line: issue.line,
          column: issue.column,
          severity: issue.severity,
          category: issue.category,
          rule: issue.rule,
          message: issue.message,
          tool: issue.tool,
        })),
      });

      console.log('[AI] AI analysis started:', data);

      set({
        queueId: data.queue_id,
      });
    } catch (error: any) {
      console.error('[AI] Failed to start AI analysis:', error);
      set({
        status: AIAnalysisStatus.FAILED,
        error: error.message || 'Failed to start AI analysis',
      });
    }
  },

  // Fetch queue status (for polling)
  fetchQueueStatus: async () => {
    const { queueId } = get();
    if (!queueId) {
      console.warn('[AI] No queueId, skipping fetchQueueStatus');
      return;
    }

    try {
      const api = await import('@/utils/api');
      const data = await api.getAIQueueStatus(queueId);

      console.log('[AI] Queue status:', {
        status: data.status,
        progress: data.progress,
        completed: data.completed,
        total: data.total_issues,
      });

      const newStatus =
        data.status === 'completed'
          ? AIAnalysisStatus.COMPLETED
          : data.status === 'failed'
          ? AIAnalysisStatus.FAILED
          : AIAnalysisStatus.ANALYZING;

      set({
        status: newStatus,
        progress: data.progress,
        completedCount: data.completed,
        totalCount: data.total_issues,
        estimatedRemaining: data.estimated_remaining || 0,
        results: data.results || [],
      });
    } catch (error: any) {
      console.error('[AI] Failed to fetch queue status:', error);
      set({
        status: AIAnalysisStatus.FAILED,
        error: error.message || 'Failed to fetch analysis status',
      });
    }
  },

  // Cancel analysis
  cancelAnalysis: async () => {
    const { queueId } = get();
    if (!queueId) {
      console.warn('[AI] No queueId to cancel');
      return;
    }

    try {
      console.log('[AI] Cancelling analysis:', queueId);
      const api = await import('@/utils/api');
      await api.cancelAIAnalysis(queueId);

      set({
        status: AIAnalysisStatus.IDLE,
        error: null,
      });

      console.log('[AI] Analysis cancelled successfully');
    } catch (error: any) {
      console.error('[AI] Failed to cancel analysis:', error);
      // Still reset the state even if cancel request failed
      set({
        status: AIAnalysisStatus.IDLE,
        error: null,
      });
    }
  },

  // Set current result index
  setCurrentResultIndex: (index: number) => {
    set({ currentResultIndex: index });
  },

  // Reset state
  reset: () => {
    set({
      queueId: null,
      status: AIAnalysisStatus.IDLE,
      selectedIssues: [],
      progress: 0,
      completedCount: 0,
      totalCount: 0,
      estimatedRemaining: 0,
      error: null,
      results: [],
      currentResultIndex: 0,
    });
  },
}));
