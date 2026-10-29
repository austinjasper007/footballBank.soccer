# FootballBank Media Portal v1

## Summary

Create an independently deployed Next.js media portal at `media.footballbank.soccer`, housed as a separate app within this repository. The existing FootballBank app remains the authenticated admin/control plane; the portal serves only recipient-specific, expiring player-media links.

## Implementation Changes

- Add a standalone `apps/media-portal` Next.js 16 / React 19 app with its own package manifest, environment configuration, build, and Hostinger VPS deployment.
- Add portal media records to the existing MongoDB schema:
  - Player publication record: player reference, published state, consent confirmation/audit data, featured media.
  - Bunny asset record: Bunny ID, upload/processing state, duration, technical metadata, and deletion state.
  - Player-media placement: player reference, reusable asset reference, Full Match/Highlight type, football metadata, publish state, featured flag, display order, and playlist membership.
  - Player playlist: player reference, title, ordering, and media membership.
  - Recipient share: hashed opaque token, player reference, recipient name/email/organization, custom message, sender, sent time, UTC expiry, active/revoked/expired state, and first/last open times.
- Extend the current `[lang]/admin` area with a Media Portal section for:
  - Selecting existing players; confirming consent; publishing/unpublishing profiles.
  - Creating playlists, selecting featured media, and drag-ordering media.
  - Direct resumable Bunny uploads for MP4/MOV sources up to 20 GB and 1080p.
  - Processing status, automatic publication once Bunny reports readiness, unpublish, and confirmed permanent deletion from Bunny and MongoDB.
  - Sending individual official access emails through Resend; links remain inactive when Resend rejects a send and expose a retry path.
  - Viewing, revoking, and auditing recipient shares.
- Keep current player records as the live source for professional profile data. The portal displays football/physical/career/statistics data and existing player images, but excludes email, phone, exact date of birth, and CV downloads.
- Implement Bunny direct uploads, verified processing webhooks, adaptive streaming, domain restriction to `media.footballbank.soccer`, and no download UI. Store only Bunny identifiers and media metadata in MongoDB; delete original uploads after successful processing.
- Implement recipient route `/p/<opaque-token>`:
  - Validate the hashed share token, publication state, UTC expiry, and available published media.
  - Record first/last access.
  - Render player summary and featured video first, then categorized Full Matches/Highlights and optional playlists.
  - Return a neutral unavailable page for expired, revoked, invalid, or unpublished shares.
  - Apply `noindex`, no social preview metadata, and no sitemap inclusion.
  - Mint Bunny playback tokens server-side, expiring after 15 minutes or at the share expiry—whichever comes first.
- Provision local, staging, and production environments. Run main app and media portal as separate Node processes on the Hostinger VPS, behind hostname-based reverse-proxy routes. Deploy and roll back either app independently.
- Add structured logs for upload, Bunny webhook, email, share, expiry, and revocation events; connect a hosted error tracker.

## Public Interfaces

- Admin-only media/share operations remain in the main app and enforce the existing admin authorization.
- The portal exposes only tokenized recipient pages; it has no public player directory, login, API, or search index.
- Bunny webhooks are authenticated, idempotent, and update asset processing states.
- Email access links are unique per recipient and may use any admin-selected future UTC expiry.

## Test Plan

- Unit/integration coverage for token hashing, expiry, revocation, consent/publication checks, profile-field filtering, share activation after email success, and Bunny webhook idempotency.
- Integration coverage for direct-upload state transitions, automatic publication, reusable assets across players, playlist ordering, and permanent deletion.
- Manual staging QA for successful/failed/resumed large uploads, email delivery/retry, expired/revoked links, desktop/mobile playback, and domain-restricted video access.
- Pilot rollout with a controlled library of roughly 50–100 players and up to 500 videos; monitor Bunny, VPS, Resend, and error-tracking usage before expanding.

## Assumptions

- Initial pilot capacity is constrained to fit the under-$50/month operating target; scaling beyond it requires usage-based budget review.
- `media@footballbank.soccer` will be verified in Resend.
- Bunny Stream credentials, webhook endpoint, Hostinger staging/production DNS, and error-tracker credentials will be provisioned before staging.
- Share audit records remain indefinitely; source videos are deleted after Bunny processing succeeds.