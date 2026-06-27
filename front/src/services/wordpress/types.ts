export interface WordPressFetchOptions extends RequestInit {
  timeoutMs?: number
  retries?: number
  dedupeKey?: string
  allowProxyFallback?: boolean
  revalidate?: number
  ifNoneMatch?: string
  skipWordPressAuth?: boolean
}

export interface WordPressJsonOptions<T> extends WordPressFetchOptions {
  schema?: { parse(data: unknown): T } | ((data: unknown) => T)
  transform?: (data: unknown) => T
}

export interface WordPressJsonResult<T> {
  data: T | null
  response: Response
  etag: string | null
  notModified: boolean
}
