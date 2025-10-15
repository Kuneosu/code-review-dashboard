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

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
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
