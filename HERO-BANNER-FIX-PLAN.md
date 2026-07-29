# Restore Production Hero Banners with SCF

## Summary

Read hero banners from the same core WordPress endpoint used by `kadochi.old`: `GET /wp-json/wp/v2/hero?acf_format=standard`. Keep the call behind the current server/BFF boundary and stop making heroes dependent on the custom homepage aggregate endpoint.

## Implementation Changes

- Enable `show_in_rest` for the Hero SCF field group in Kadochi Core. SCF retains the `acf` REST property and supports `acf_format=standard`; REST exposure requires the field group to opt in.
- Add a server-side hero service that requests `/wp-json/wp/v2/hero?acf_format=standard&per_page=50` through `WORDPRESS_INTERNAL_URL`.
- Validate and map the raw SCF response using the legacy structure:
  - `acf.title` → `title`
  - `acf.subtitle` → `subtitle`
  - `acf.cta_text` → `ctaText`
  - `acf.cta_link` → `ctaLink`
  - `acf.background_image` → `backgroundImage`
- Accept `background_image` as either a URL string or an object containing `url`, preserving compatibility with existing SCF return formats. Drop records lacking a title or usable image.
- Add `GET /api/content/heroes`, returning normalized `HeroSlide[]` with `id`, `title`, `subtitle`, `ctaText`, `ctaLink`, and `backgroundImage`.
- Fetch heroes independently during homepage server rendering. Prefer direct Hero posts; retain the current aggregate `heroes`/`banners`/`sliders` mapping only as compatibility fallback for existing installations.
- Point the slider’s hydration retry at `/api/content/heroes`; retain the existing placeholder, autoplay, pagination, and rendering behavior.
- Reuse the existing `homepage-content` cache tag and 60-second revalidation policy so editorial cache invalidation continues to refresh heroes.

## Test Plan

- Unit-test mapping for SCF image URL strings, image objects, optional fields, malformed records, and records missing title/image.
- Verify the WordPress Hero REST schema includes `acf` after the field-group change.
- Verify published local Hero records appear from both `/wp-json/wp/v2/hero?acf_format=standard` and `/api/content/heroes`.
- Verify homepage SSR renders heroes when `/kadochi/v1/content/home` fails or contains no heroes.
- Verify legacy banner/slider fallback still works when no valid Hero records exist.
- Run frontend tests, lint, production build, and PHP syntax validation.
- Production acceptance: publish one and multiple Hero records in SCF and confirm image, title, subtitle, CTA, autoplay, pagination, and cache refresh.

## Assumptions

- Use the server/BFF approach; do not expose a direct browser-to-WordPress fallback.
- Production Hero content uses the existing SCF field names and `hero` post type from `kadochi.old`.
- The observed production-wide 502/origin timeout is an infrastructure issue outside this code fix; deployment validation requires the frontend and internal WordPress services to be reachable.

## References

- [SCF REST API class](https://developer.wordpress.org/secure-custom-fields/code-reference/class-acf-rest-api-file/)
- [SCF field-group REST guidance](https://developer.wordpress.org/secure-custom-fields/tutorials/first-custom-field/)
