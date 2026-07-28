# Editorial automation

The publishing bridge lives inside the `kadochi-core` WordPress plugin. A
single authenticated request creates a standard WordPress post, its categories
and tags, uploads the cover, assigns it as the featured image, and returns the
new post's dashboard link. It can create either a `draft` or a `publish`ed
article.

## One-time deployment

On the production server, generate two separate long random values and store
them in the deployment secret manager (or the root `.env`, which must not be
committed):

```dotenv
KADOCHI_EDITORIAL_API_SECRET=...
KADOCHI_REVALIDATE_SECRET=...
```

Deploy this repository normally. The Compose stack passes the first secret only
to WordPress. It passes the second secret to both WordPress and Next.js, so the
WordPress plugin can clear the magazine cache through the internal Docker
network. Nothing is stored in WordPress options, in the frontend bundle, or on
a personal computer.

## Request contract

Send `POST https://api.kadochi.com/wp-json/kadochi/v1/editorial/articles` with
these headers:

```text
Content-Type: application/json
X-Kadochi-Editorial-Key: <KADOCHI_EDITORIAL_API_SECRET>
```

The route accepts this JSON shape. `idempotencyKey` must be unique for the
intended article; repeating the exact request returns the original post rather
than creating a duplicate.

```json
{
  "idempotencyKey": "2026-07-28-gift-for-close-friend-v1",
  "status": "draft",
  "title": "راهنمای خرید هدیه برای دوست صمیمی؛ ۱۲ ایده که واقعاً به دل می‌نشیند",
  "slug": "gift-for-close-friend",
  "excerpt": "۱۲ ایدهٔ کاربردی برای انتخاب هدیه‌ای شخصی و به‌یادماندنی.",
  "content": "<h2>هدیه‌ای که به دل می‌نشیند</h2><p>...</p>",
  "categories": ["راهنمای خرید هدیه"],
  "tags": ["هدیه برای دوست", "ایده هدیه"],
  "cover": {
    "alt": "بستهٔ هدیه برای دوست صمیمی روی میز",
    "url": "https://images.example.com/kadochi/friend-gift-cover.webp"
  }
}
```

For an image generated directly by an automation, replace `cover.url` with
`cover.data`: a base64-encoded JPEG, PNG, or WebP payload (up to 8 MB). An
optional `cover.filename` sets the file name. The endpoint never needs, reads,
or exposes a WordPress application password.

## Responses

The successful response has HTTP `201` and contains `postId`, `mediaId`,
`status`, `editUrl`, and `url`. A repeated `idempotencyKey` has HTTP `200` and
`created: false` with the existing post details. Invalid data returns `400`, an
invalid secret returns `401`, and more than 30 requests from one source in an
hour returns `429`.

## Automation instructions

Give the scheduled editorial worker only the endpoint URL and the editorial
secret. For each article, it should:

1. Produce original Persian HTML and a matching cover image.
2. Submit the JSON request with a fresh, stable `idempotencyKey`.
3. Treat `201` or `200` as success and retain the returned `editUrl` for the
   daily report.

Use `status: "draft"` while reviewing the workflow. Change it to
`"publish"` only when unattended publishing is approved.
