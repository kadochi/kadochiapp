// Typed error taxonomy for upstream calls
export class UpstreamTimeout extends Error {
  readonly code = "UPSTREAM_TIMEOUT" as const;
  constructor(message = "The upstream request timed out") {
    super(message);
    this.name = "UpstreamTimeout";
  }
}

export class UpstreamAuthError extends Error {
  readonly code = "UPSTREAM_AUTH" as const;
  constructor(message = "Authentication failed against upstream") {
    super(message);
    this.name = "UpstreamAuthError";
  }
}

export class UpstreamBadResponse extends Error {
  readonly code = "UPSTREAM_BAD_RESPONSE" as const;
  constructor(message = "Upstream responded with an invalid status or body") {
    super(message);
    this.name = "UpstreamBadResponse";
  }
}

export class CorsRedirectLoop extends Error {
  readonly code = "CORS_REDIRECT_LOOP" as const;
  constructor(message = "Detected CORS or redirect loop from upstream") {
    super(message);
    this.name = "CorsRedirectLoop";
  }
}

export class UpstreamNetworkError extends Error {
  readonly code = "UPSTREAM_NETWORK" as const;
  constructor(message = "A network error occurred talking to upstream") {
    super(message);
    this.name = "UpstreamNetworkError";
  }
}

export type UpstreamError =
  | UpstreamTimeout
  | UpstreamAuthError
  | UpstreamBadResponse
  | CorsRedirectLoop
  | UpstreamNetworkError;
