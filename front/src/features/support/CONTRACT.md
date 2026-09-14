# Support chat contract

The browser calls only same-origin `/api/support/*` handlers. Customer JWTs and the
`kadochi_support_guest` token remain HttpOnly and are forwarded to Kadochi Core by
server code. WordPress returns only UUID resource identifiers.

Conversation status is `open`, `pending`, or `closed`. Customer messages move an
active conversation to `open`; staff replies move it to `pending`; closed threads
are read-only and a customer explicitly starts a new thread.

Messages are plain text with a 2,000-character maximum. `operationId` is a UUID
idempotency key and must be reused when retrying an ambiguous send. Message pages
use UUID `before`/`after` cursors, default to 30 items, and never exceed 50.

Polling runs only while the dialog and document are visible. The first retry is
five seconds and temporary failures back off to thirty seconds.
