// Typed error taxonomy for upstream calls
export class UpstreamTimeout extends Error {
  readonly code = "UPSTREAM_TIMEOUT" as const;
  readonly status = 504;
  constructor(message = "The upstream request timed out") {
    super(message);
    this.name = "UpstreamTimeout";
  }
}

export class UpstreamAuthError extends Error {
  readonly code = "UPSTREAM_AUTH" as const;
  readonly status = 401;
  constructor(message = "Authentication failed against upstream") {
    super(message);
    this.name = "UpstreamAuthError";
  }
}

export class UpstreamBadResponse extends Error {
  readonly code = "UPSTREAM_BAD_RESPONSE" as const;
  readonly status: number;
  constructor(
    status: number,
    message = "Upstream responded with an invalid status or body"
  ) {
    super(message);
    this.name = "UpstreamBadResponse";
    this.status = status;
  }
}

export class CorsRedirectLoop extends Error {
  readonly code = "CORS_REDIRECT_LOOP" as const;
  readonly status = 502;
  constructor(message = "Detected CORS or redirect loop from upstream") {
    super(message);
    this.name = "CorsRedirectLoop";
  }
}

export class UpstreamNetworkError extends Error {
  readonly code = "UPSTREAM_NETWORK" as const;
  readonly status = 502;
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
