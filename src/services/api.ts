import axios, { type AxiosError, type AxiosInstance } from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export interface ApiError {
  error: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

/**
 * Makes a POST request to the backend API using axios
 * @param endpoint - The API endpoint (e.g., '/api/UserAuthentication/login')
 * @param body - The request body as a JSON object
 * @returns Promise with the response data or error
 */
export async function apiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<ApiResponse<T>> {
  try {
    const response = await axiosInstance.post<T>(endpoint, body);

    // Check if response has an error field (backend error)
    if (response.data && typeof response.data === 'object' && 'error' in response.data) {
      return { error: (response.data as { error: string }).error };
    }

    return { data: response.data };
  } catch (error) {
    // Handle axios errors
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;

      // Check if server returned an error response
      if (axiosError.response?.data?.error) {
        return { error: axiosError.response.data.error };
      }

      // Handle HTTP status errors
      if (axiosError.response) {
        return {
          error: `Server error: ${axiosError.response.status} ${axiosError.response.statusText}`,
        };
      }

      // Handle network errors
      if (axiosError.request) {
        return { error: 'Network error: Unable to reach server' };
      }
    }

    // Handle other errors
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Helper to call concept actions
 * @param concept - The concept name (e.g., 'UserAuthentication')
 * @param action - The action name (e.g., 'login')
 * @param body - The request body
 */
export async function callConceptAction<T>(
  concept: string,
  action: string,
  body: Record<string, unknown>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(`/api/${concept}/${action}`, body);
}

/**
 * Helper to call concept queries (queries return arrays)
 * @param concept - The concept name
 * @param query - The query name (should start with '_')
 * @param body - The request body
 */
export async function callConceptQuery<T>(
  concept: string,
  query: string,
  body: Record<string, unknown>
): Promise<ApiResponse<T[]>> {
  const response = await apiRequest<{ results?: T[] } | T[]>(`/api/${concept}/${query}`, body);
  
  // Handle responses that come through Requesting concept (wrapped in results)
  if (response.data) {
    if (Array.isArray(response.data)) {
      // Direct passthrough response (array)
      return { data: response.data };
    } else if ('results' in response.data) {
      // Response wrapped in results field (via Requesting)
      const results = response.data.results;
      if (Array.isArray(results)) {
        return { data: results };
      } else if (results && typeof results === 'object' && 'error' in results) {
        // Error in results field
        return { error: (results as { error: string }).error };
      }
    }
  }
  
  return response as ApiResponse<T[]>;
}

