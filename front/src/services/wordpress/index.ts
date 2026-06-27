import "server-only"
import {
  CorsRedirectLoop,
  UpstreamBadResponse,
  UpstreamNetworkError,
} from "@/services/http/errors"
import { retry } from "@/services/http/retry"
import {
  buildWordPressURL, createHeaders, DEFAULT_TIMEOUT_MS, DEFAULT_RETRIES,
  shouldRetryError, resolveCacheMode, resolveNextConfig, parseWithSchema,
} from "./utils"
import { fetchDirect, fetchViaProxy } from "./fetchers"
import type { WordPressFetchOptions, WordPressJsonOptions, WordPressJsonResult } from "./types"

export type { WordPressFetchOptions, WordPressJsonOptions, WordPressJsonResult } from "./types"

const inflight = new Map<string, Promise<Response>>()
const inflightJson = new Map<string, Promise<WordPressJsonResult<unknown>>>()

export async function wordpressFetch(
  input: string | URL,
  options: WordPressFetchOptions = {},
): Promise<Response> {
  const url = buildWordPressURL(input)
  const headers = createHeaders(options.headers, options.skipWordPressAuth)
  if (options.ifNoneMatch) headers.set("If-None-Match", options.ifNoneMatch)

  const requestInit: RequestInit = {
    ...options,
    headers,
    cache: resolveCacheMode(options),
    next: resolveNextConfig(options) as NextFetchRequestConfig | undefined,
  }

  const method = (requestInit.method || "GET").toUpperCase()
  const idempotent = ["GET", "HEAD", "OPTIONS"].includes(method)
  const retries = options.retries ?? (idempotent ? DEFAULT_RETRIES : 1)
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const key = options.dedupeKey || (idempotent ? `${method}:${url.toString()}` : undefined)

  if (key && inflight.has(key)) {
    const cached = inflight.get(key)!
    return cached.then((res) => res.clone())
  }

  const runner = retry(
    async (attempt) => {
      try {
        return await fetchDirect(url, requestInit, timeoutMs)
      } catch (err) {
        if (options.allowProxyFallback && err instanceof CorsRedirectLoop) {
          return fetchViaProxy(url, requestInit, timeoutMs)
        }
        if (options.allowProxyFallback && err instanceof UpstreamNetworkError) {
          return fetchViaProxy(url, requestInit, timeoutMs)
        }
        throw err
      }
    },
    { retries, shouldRetry: (err, attempt) => shouldRetryError(err, attempt), jitterRatio: 0.3, minDelayMs: 200, maxDelayMs: 5_000 },
  )

  const promise = runner.catch((err: unknown) => {
    if (key) inflight.delete(key)
    throw err
  })

  if (key) inflight.set(key, promise)

  try {
    return await promise
  } finally {
    if (key) inflight.delete(key)
  }
}

export async function wordpressJson<T>(
  input: string | URL,
  options: WordPressJsonOptions<T> = {},
): Promise<WordPressJsonResult<T>> {
  const method = (options.method || "GET").toUpperCase()
  const idempotent = ["GET", "HEAD", "OPTIONS"].includes(method)
  const key = options.dedupeKey || (idempotent ? `${method}:${buildWordPressURL(input).toString()}` : undefined)

  if (key && inflightJson.has(key)) {
    return inflightJson.get(key)! as Promise<WordPressJsonResult<T>>
  }

  const runner = (async () => {
    const response = await wordpressFetch(input, options)
    const etag = response.headers.get("etag")
    if (response.status === 304) {
      return { data: null, response, etag, notModified: true } satisfies WordPressJsonResult<T>
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new UpstreamBadResponse(response.status, `Unexpected WordPress status ${response.status} (${text.slice(0, 200)})`)
    }

    const raw = await response.json()
    const data = parseWithSchema<T>(raw, options)

    return { data, response, etag, notModified: false } satisfies WordPressJsonResult<T>
  })().catch((err: unknown) => {
    if (key) inflightJson.delete(key)
    throw err
  })

  if (key) inflightJson.set(key, runner as Promise<WordPressJsonResult<unknown>>)

  try {
    return await runner
  } finally {
    if (key) inflightJson.delete(key)
  }
}
