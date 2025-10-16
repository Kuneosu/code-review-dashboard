/**
 * API client functions
 */
import type {
  ScanProjectRequest,
  ScanProjectResponse,
  ApplyFiltersRequest,
  ApplyFiltersResponse,
  ExportConfigResponse,
  FilterConfig,
} from '@/types';

// API Base URL - VS Code Webview에서는 프록시를 통해 호출됨
const API_BASE = '/api';

class APIError extends Error {
  error_type: string;
  recoverable: boolean;
  path?: string;

  constructor(data: any) {
    super(data.message || 'API Error');
    this.error_type = data.error_type || 'unknown';
    this.recoverable = data.recoverable ?? false;
    this.path = data.path;
  }
}

// VS Code Webview에서 실행 중인지 확인
function isVSCodeWebview(): boolean {
  // @ts-ignore - vscodeApi is injected by VS Code
  return typeof window.vscodeApi !== 'undefined';
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // VS Code Webview에서는 Extension을 통해 API 호출
  if (isVSCodeWebview()) {
    return vscodeAPIRequest<T>(endpoint, options);
  }

  // 일반 브라우저에서는 직접 fetch
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data.detail || data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError({
      error_type: 'network_error',
      message: error instanceof Error ? error.message : 'Network error',
      recoverable: true,
    });
  }
}

// VS Code Extension을 통한 API 요청
async function vscodeAPIRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).substring(7);

    // 응답 대기 핸들러
    const handleResponse = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'apiResponse' && message.id === requestId) {
        window.removeEventListener('message', handleResponse);

        if (message.error) {
          reject(
            new APIError({
              error_type: 'api_error',
              message: message.error,
              recoverable: true,
            })
          );
        } else if (message.status && message.status >= 400) {
          reject(new APIError(message.data?.detail || message.data));
        } else {
          resolve(message.data as T);
        }
      }
    };

    window.addEventListener('message', handleResponse);

    // Extension으로 요청 전송 (API_BASE prefix 추가)
    // @ts-ignore
    window.vscodeApi.postMessage({
      type: 'apiRequest',
      id: requestId,
      endpoint: `${API_BASE}${endpoint}`,  // /api prefix 추가
      method: options?.method || 'GET',
      body: options?.body ? JSON.parse(options.body as string) : undefined,
    });

    // 타임아웃 설정 (30초)
    setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      reject(
        new APIError({
          error_type: 'timeout',
          message: 'Request timeout',
          recoverable: true,
        })
      );
    }, 30000);
  });
}

export async function scanProject(
  request: ScanProjectRequest
): Promise<ScanProjectResponse> {
  return fetchAPI<ScanProjectResponse>('/scan-project', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function applyFilters(
  request: ApplyFiltersRequest
): Promise<ApplyFiltersResponse> {
  return fetchAPI<ApplyFiltersResponse>('/apply-filters', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function exportFilterConfig(request: {
  filter_config: FilterConfig;
}): Promise<ExportConfigResponse> {
  return fetchAPI<ExportConfigResponse>('/filter-config/export', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function importFilterConfig(request: {
  config_json: string;
}): Promise<FilterConfig> {
  return fetchAPI<FilterConfig>('/filter-config/import', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Phase 2: Analysis APIs

export async function startAnalysis(request: {
  project_path: string;
  selected_files: string[];
  categories: string[];
}): Promise<any> {
  return fetchAPI<any>('/analysis/start', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getAnalysisStatus(analysisId: string): Promise<any> {
  return fetchAPI<any>(`/analysis/${analysisId}/status`);
}

export async function pauseAnalysis(analysisId: string): Promise<any> {
  return fetchAPI<any>(`/analysis/${analysisId}/pause`, {
    method: 'POST',
  });
}

export async function resumeAnalysis(analysisId: string): Promise<any> {
  return fetchAPI<any>(`/analysis/${analysisId}/resume`, {
    method: 'POST',
  });
}

export async function cancelAnalysis(analysisId: string): Promise<any> {
  return fetchAPI<any>(`/analysis/${analysisId}/cancel`, {
    method: 'POST',
  });
}

export async function getAnalysisResult(analysisId: string): Promise<any> {
  return fetchAPI<any>(`/analysis/${analysisId}/result`);
}
