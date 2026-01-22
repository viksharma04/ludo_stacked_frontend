const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const DEFAULT_TIMEOUT_MS = 30000

interface ApiClientOptions {
  accessToken: string
  timeoutMs?: number
}

interface ApiResponse<T> {
  data: T | null
  error: Error | null
}

export function createApiClient({ accessToken, timeoutMs = DEFAULT_TIMEOUT_MS }: ApiClientOptions) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    // If an external signal is provided, abort when it aborts
    if (signal) {
      signal.addEventListener('abort', () => controller.abort())
    }

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          data: null,
          error: new Error(errorData.detail || `Request failed with status ${response.status}`),
        }
      }

      const data = await response.json()
      return { data, error: null }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        const message = signal?.aborted ? 'Request was cancelled' : 'Request timed out'
        return { data: null, error: new Error(message) }
      }
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error occurred'),
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return {
    get<T>(path: string, options?: { signal?: AbortSignal }) {
      return request<T>('GET', path, undefined, options?.signal)
    },
    post<T>(path: string, body: unknown, options?: { signal?: AbortSignal }) {
      return request<T>('POST', path, body, options?.signal)
    },
    patch<T>(path: string, body: unknown, options?: { signal?: AbortSignal }) {
      return request<T>('PATCH', path, body, options?.signal)
    },
  }
}
