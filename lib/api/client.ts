const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiClientOptions {
  accessToken: string
}

interface ApiResponse<T> {
  data: T | null
  error: Error | null
}

export function createApiClient({ accessToken }: ApiClientOptions) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
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
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error occurred'),
      }
    }
  }

  return {
    get<T>(path: string) {
      return request<T>('GET', path)
    },
    patch<T>(path: string, body: unknown) {
      return request<T>('PATCH', path, body)
    },
  }
}
