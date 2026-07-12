# Cart contract

All cart methods use their explicit `/api/cart…` same-origin BFF action, validate input/output, use `no-store`, and never retry mutations. The BFF accepts and rotates Woo Store API cart tokens only in an HttpOnly cookie; it forwards no generic upstream path or headers.
