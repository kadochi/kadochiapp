# Occasion vs. `kadochi.old` compatibility audit

**Audit date:** 2026-07-27  
**Scope:** Source-code comparison only. This audit does not inspect a WordPress database, installed plugins, or live API responses.

## Verdict

The current implementation uses the **same WordPress post-type slug** as `kadochi.old`: `occasion`. It is **not field-for-field compatible** with the legacy occasion data model, however. Two legacy ACF keys were renamed and the ownership model was moved from a custom field to the WordPress post author.

Existing legacy records will retain their post type and still expose their shared `title` and `occasion_date` metadata, but the current code will not read legacy `repeat_yearly` or `user_id` values. Without a migration/backfill, those records will be interpreted with different repeat and ownership semantics.

## Post type

| Aspect | `kadochi.old` | Current codebase | Compatible? |
| --- | --- | --- | --- |
| Post type slug | Requests use `/wp-json/wp/v2/occasion` | Registers `occasion` | Yes |
| Standard WordPress title | Used when creating a record | Used when creating and updating a record | Yes |
| Post author | Legacy creation assigns a service-account author | Current creation assigns the authenticated customer as `post_author` | No — changed ownership source |
| Public REST endpoint | Legacy reads the default `wp/v2/occasion` endpoint | Current code disables default `wp/v2/occasion` routes and provides `kadochi/v1/occasions` | No — intentional API-contract change |

Evidence: legacy creation is in `kadochi.old/app/api/occasions/new/route.ts`; the current post-type registration and REST hardening are in `plugins/kadochi-core/kadochi-core.php`.

## Persisted field comparison

| Meaning | `kadochi.old` field | Current field | Status and impact |
| --- | --- | --- | --- |
| Display title | `title` (legacy readers use `acf.title`; the legacy create route stopped writing it) | `title` (current DTO falls back to `post_title`) | Partially compatible. Both have the same key, but legacy records that only have `post_title` remain readable because of the fallback. |
| Occasion date | `occasion_date` | `occasion_date` | Compatible. Both represent a Gregorian calendar date. Legacy readers accept either `YYYYMMDD` or `YYYY-MM-DD`; current writes and validates `YYYY-MM-DD`. |
| Annual repeat flag | `repeat_yearly` | `repeat_annually` | **Incompatible.** The current API does not read `repeat_yearly`; a migrated legacy record will be returned with `repeatsAnnually: false` unless `repeat_annually` is populated. |
| Owner/customer reference | `user_id` | `user` | **Incompatible.** The current API does not read `user_id`; it determines access from `post_author`, then merely writes `user` as duplicate metadata. |

The legacy TypeScript model declares `title`, `occasion_date`, `repeat_yearly`, and `user_id` in `kadochi.old/types/wordpress.ts`. The current SCF group declares `title`, `occasion_date`, `repeat_annually`, and `user` in `plugins/kadochi-core/kadochi-core.php`.

## Current external API shape

The new protected API intentionally uses a different transport model:

| Legacy client input/output | Current API input/output |
| --- | --- |
| Create input: `title`, `date`, `repeatYearly` | Create input: `title`, `occasionDate`, `repeatsAnnually` |
| Data read from default WP REST with nested `acf` data | Data returned as a flat DTO: `id`, `title`, `occasionDate`, `isPersonal`, `repeatsAnnually`, `version` |
| `user_id` supplied as metadata by the application | Owner is derived server-side from the authenticated user and not accepted from client input |
| Delete uses the default WP REST endpoint | Delete requires a `version` and sends the record to WordPress trash |

These differences are expected in the current codebase and are not evidence of a broken implementation. They do mean that code or integrations written for `kadochi.old` cannot call the current occasion API unchanged.

## Migration risk assessment

### Safe without a data migration

- The `occasion` post-type slug remains unchanged.
- Standard `post_title` remains supported.
- `occasion_date` remains unchanged and can be read when stored as `YYYY-MM-DD`.

### Requires migration or compatibility handling

- Copy legacy `repeat_yearly` values to `repeat_annually`.
- Copy legacy `user_id` values to `user` if the metadata must remain available to administrators or other tooling.
- Set each personal legacy record's `post_author` to its actual `user_id`; this is required for the current owner-only authorization logic.
- Normalize any legacy `occasion_date` values stored as `YYYYMMDD` to `YYYY-MM-DD`, because the current date validation accepts only the dashed form.
- Do not depend on `/wp-json/wp/v2/occasion` or ACF REST responses after the current plugin is active; use `/wp-json/kadochi/v1/occasions` through the application's `/api/occasions` routes.

## Conclusion

`occasion` is the same post type by slug, but the occasion **field schema and ownership semantics changed**. It should be treated as a partial, not full, data-model match to `kadochi.old`. A migration is necessary to preserve annual-repeat settings and personal-record ownership for existing legacy records.
