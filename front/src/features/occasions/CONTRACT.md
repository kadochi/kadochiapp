# Occasions contract

All occasion methods go through explicit same-origin `/api/occasions` routes and the owner-scoped WordPress API. Inputs exclude owner/user IDs, data is `no-store`, and mutations are never retried. Updates/deletes require a version for optimistic concurrency; deletion moves the record to WordPress trash (rollback-safe retention policy). Authentication is unavailable until the selected `wordpress-cookie` bridge has been verified.
