# Auth contract

`getCurrentCustomer` uses `GET /api/auth/current`, which forwards only the configured WordPress login cookie to `GET /wp-json/kadochi/v1/customer`. It is `no-store`, runtime-validated, and never retried. `KADOCHI_AUTH_MODE=wordpress-cookie` is an explicit deployment gate; login, logout, and registration are intentionally absent until the identity flow is selected.
