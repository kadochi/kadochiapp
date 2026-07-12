# Content contract

`getHomepageContent` reads `GET /wp-json/kadochi/v1/content/home` server-to-server. It has no authentication/session input, validates the normalized DTO, uses a five-minute shared cache, and is safe to retry as a bounded read.
