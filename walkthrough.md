# Security Summary

**Reviewed Files**: 22
**Issues Resolved**: 7

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Cross-Order Proof Access | `server.ts` | 573 | Proof downloads checked only that an order code and access key matched an existing receipt without verifying the requested filename belonged to that order. | High | Fixed | Enforced exact match between `storedProofUrl` on the verified `order_receipts` document and `/api/proofs/${filename}` alongside constant-time hash comparison. |
| Buyer Receipt Overwrite | `firestore.rules` | 287 | Unauthenticated buyer receipt updates did not block repeated overwrites of `proofUrl` or restrict changed fields strictly after initial submission. | High | Fixed | Restricted buyer `order_receipts` updates to a single transition from `Menunggu Pembayaran` with empty `proofUrl` to `Menunggu Verifikasi`, enforcing `/api/proofs/proof_*.(jpg\|jpeg\|png\|webp\|pdf)` format and immutable `affectedKeys`. |
| Production Signing Secret Fallback | `server.ts` | 36 | Missing `ORDER_SIGNING_SECRET` fell back to a random runtime secret even in production, invalidating HMAC order signatures across restarts. | High | Fixed | Enforced minimum 32-character secret check and fail-closed HTTP `503` guard in `NODE_ENV=production` on `/api/orders/prepare` and `/api/orders/verify-signature` when unset; preview retains an in-memory key and surfaces readiness warnings in Admin. |
| Download Token Status & Expiry | `server.ts` | 770 | `/api/download/:productId` previously checked only token `enabled` and `productId`, without validating token expiration or cross-checking `order_receipts` payment status (`Dibayar`/`Selesai`), and admin status revocation did not disable existing `download_tokens`. | High | Fixed | Enforced 30-day token TTL (`DOWNLOAD_TOKEN_TTL_MS` + optional `expiresAt`) and server-side `order_receipts/{orderCode}` status verification (`Dibayar` or `Selesai`) on `/api/download/:productId`, and updated `updateOrderStatusAdmin` (`src/lib/firestoreService.ts:430`) to disable existing `download_tokens` when orders are revoked/rejected/cancelled. |
| MIME Spoofing on Uploads | `server/objectStorage.ts` | 410 | Upload filtering relied only on HTTP multipart MIME headers and file extensions, which could be spoofed by arbitrary file contents. | Medium | Fixed | Added `validateMagicBytes` header signature verification for PDF, JPG, PNG, WebP, ZIP/Office/EPUB archives, SVG (rejecting `<script`), ICO, XLS, and CSV before storing files. |
| Ephemeral Container File Loss | `server/objectStorage.ts` | 15 | Product deliverables, payment proofs, and uploaded brand assets were tied only to local container disk paths that reset across Cloud Run redeploys. | Medium | Needs Live Verify | Implemented S3-compatible persistent object storage adapter (supporting Supabase Storage S3 via `OBJECT_STORAGE_*` Secrets with 10s timeouts and safe error extraction) without enabling paid GCP billing; live round-trip bucket test must be confirmed by owner in Admin. |
| Placeholder Contact & Destructive Seeding | `src/data/catalogData.ts` | 22 | Default store settings previously included sample phone/email/bank strings and initial seeding risked overwriting existing catalog documents. | Medium | Fixed | Cleared unconfigured contact/bank defaults to empty strings shown cleanly as unconfigured, and converted `seedInitialCatalogToFirestore` (`src/lib/firestoreService.ts:495`) to check `getDoc` idempotently so existing records are never overwritten. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Admin Authentication & Role Enforcement | `server.ts` | Verifies Firebase ID tokens with `adminAuth.verifyIdToken`, requires verified email, and authorizes only `BOOTSTRAP_ADMIN_EMAIL` or verified entries in Firestore `admins/{uid}` (`server.ts:135`). |
| Authoritative Checkout Pricing | `server.ts` | Ignores browser-submitted totals, fetches authoritative product prices from Firestore (or demo catalog fallback), recalculates totals server-side, and signs canonical payloads with HMAC-SHA256 (`server.ts:315`). |
| Private Digital Deliverables | `server.ts` | Stores paid e-books and archives outside static public roots (`private_storage/products` or private object storage bucket) and serves downloads only through admin-minted, non-expired `download_tokens` verified against `productId` and approved `order_receipts` status (`server.ts:778`). |
| Firestore Rules & Storage Rules | `firestore.rules` | Enforces global default-deny (`firestore.rules:5`), strict schema keys/types/sizes, buyer-scoped `orders` PII isolation, and private-by-default `storage.rules` ready if Storage is later activated (`storage.rules:4`). |
| Legacy Google Sheets Sync | `server.ts` | Connects to the legacy Apps Script endpoint exclusively via read-only `GET ?action=products` proxy with timeout and field sanitization (`server.ts:845`). |

## PoC Verification

### 1. Cross-Order Payment Proof Access Blocked

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Ownership Binding on Proof Retrieval |
| Impact | High |
| Affected File | `server.ts:573` |
| Test Scenario | `GET /api/proofs/proof_other-order-uuid.jpg?orderCode=NK-20261124-ABC123&key=<validKeyForOrderA>` |

#### How It Was Fixed
The `/api/proofs/:filename` route now reads both `accessKeyHash` and `proofUrl` from the targeted `order_receipts/{orderCode}` document and grants access only when the proof URL matches `/api/proofs/${filename}` exactly and the SHA-256 access key digest matches using constant-time comparison.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request reaches `GET /api/proofs/:filename` (`server.ts:538`) without an admin Bearer token. | Enters buyer proof verification branch |
| 2 | Fetches `order_receipts/{orderCode}` (`server.ts:571`) and compares `storedProofUrl === "/api/proofs/" + filename` (`server.ts:577`). | Mismatch detected when accessing another order's proof |
| 3 | Fails authorization and reaches `if (!authorized)` guard (`server.ts:587`). | **Handled Safely** (`403 Forbidden`) |

#### Conclusion
**Fix Verified** - A valid buyer access key for one order can no longer retrieve payment proof files belonging to any other order.

---

### 2. Single-Submission Enforcement on Buyer Payment Receipts

#### Summary
| Field | Value |
|---|---|
| Issue Type | Unrestricted Unauthenticated Document Update |
| Impact | High |
| Affected File | `firestore.rules:287` |
| Test Scenario | Repeated `updateDoc` on `order_receipts/{orderCode}` attempting to overwrite an already-submitted `proofUrl` or alter `downloadGrants`. |

#### How It Was Fixed
Firestore rules for `order_receipts` now allow non-admin updates only when the existing status is `Menunggu Pembayaran`, no `proofUrl` has been set yet, the incoming status is `Menunggu Verifikasi`, the incoming `proofUrl` matches the strict `/api/proofs/proof_*.(jpg|jpeg|png|webp|pdf)` pattern, and only `['proofUrl', 'status', 'updatedAt']` are modified.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Second or tampered `updateDoc` hits `match /order_receipts/{orderCode}` (`firestore.rules:269`). | Enters `allow update` evaluation |
| 2 | Rules check `existing().status == 'Menunggu Pembayaran'` and empty `proofUrl` (`firestore.rules:287-288`). | Fails check because prior proof is already recorded |
| 3 | Rules check `incoming().diff(existing()).affectedKeys().hasOnly(['proofUrl', 'status', 'updatedAt'])` (`firestore.rules:293`). | **Handled Safely** (Firestore rejects write) |

#### Conclusion
**Fix Verified** - Unauthenticated buyers cannot overwrite submitted proofs or tamper with order totals and download grants in Firestore.

---

### 3. Production Fail-Closed Guard When `ORDER_SIGNING_SECRET` Is Missing

#### Summary
| Field | Value |
|---|---|
| Issue Type | Ephemeral Secret Fallback in Production |
| Impact | High |
| Affected File | `server.ts:36` |
| Test Scenario | Start server with `NODE_ENV=production` and empty `ORDER_SIGNING_SECRET`, then `POST /api/orders/prepare`. |

#### How It Was Fixed
`getActiveSigningSecret()` (`server.ts:42`) requires a configured `ORDER_SIGNING_SECRET` of at least 32 characters in production and returns `null` otherwise, causing `/api/orders/prepare` and `/api/orders/verify-signature` to fail closed with HTTP `503`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `POST /api/orders/prepare` executes under `NODE_ENV=production` with `ORDER_SIGNING_SECRET=""`. | Calls `getActiveSigningSecret()` (`server.ts:281`) |
| 2 | `IS_SIGNING_SECRET_CONFIGURED` is `false` and `IS_PRODUCTION` is `true` (`server.ts:46`). | Returns `null` |
| 3 | Handler hits `if (!signingSecret)` (`server.ts:282`) before creating order signatures. | **Handled Safely** (`503 Service Unavailable`) |

#### Conclusion
**Fix Verified** - Production deployments cannot silently mint unrecoverable ephemeral order signatures when `ORDER_SIGNING_SECRET` is omitted.

---

### 4. Magic-Byte Validation Defeating Disguised File Uploads

#### Summary
| Field | Value |
|---|---|
| Issue Type | Client-Controlled Extension & MIME Spoofing |
| Impact | Medium |
| Affected File | `server/objectStorage.ts:214` |
| Test Scenario | `POST /api/orders/proof` uploading plain text bytes (`"not a real jpeg file"`) named `fake.jpg` with MIME `image/jpeg`. |

#### How It Was Fixed
`validateMagicBytes` inspects the actual binary header bytes (`%PDF`, JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`, ZIP/Office `50 4B`, SVG `<svg` without `<script`) after `multer` buffers the upload in memory (`server.ts:486`, `server.ts:626`, `server.ts:663`).

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Spoofed upload passes extension filter (`server.ts:173`) and enters `/api/orders/proof` (`server.ts:469`). | Buffered safely in memory |
| 2 | Calls `validateMagicBytes(req.file.buffer, safeExt)` (`server.ts:486`) checking JPEG bytes `0xFF 0xD8 0xFF` (`server/objectStorage.ts:228`). | Returns `false` |
| 3 | Route aborts before reading Firestore or writing storage (`server.ts:487`). | **Handled Safely** (`400 Bad Request`) |

#### Conclusion
**Fix Verified** - Disguised text or script payloads with image or PDF extensions are rejected before reaching persistent storage.

---

### 5. Download Token Expiry & Revoked Order Enforcement

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Token Expiration & Order Status Cross-Check |
| Impact | High |
| Affected File | `server.ts:778` |
| Test Scenario | `GET /api/download/:productId?token=<validTokenForRejectedOrExpiredOrder>` |

#### How It Was Fixed
`GET /api/download/:productId` now parses `createdAt` (enforcing a 30-day TTL and optional `expiresAt`) and queries `order_receipts/{orderCode}` to confirm the order status is still `Dibayar` or `Selesai`, while `updateOrderStatusAdmin` disables existing `download_tokens` whenever status leaves `Dibayar`/`Selesai`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request reaches `GET /api/download/:productId` (`server.ts:778`) with a previously minted token ID. | Fetches `download_tokens/{tokenId}` |
| 2 | Evaluates `createdAt` age against `DOWNLOAD_TOKEN_TTL_MS` (`server.ts:803-813`). | Expired tokens rejected with `403` |
| 3 | Fetches `order_receipts/{orderCode}` and checks `status` is `Dibayar` or `Selesai` (`server.ts:815-822`). | **Handled Safely** (`403 Forbidden` if unpaid/rejected/cancelled) |

#### Conclusion
**Fix Verified** - Expired tokens and tokens belonging to rejected or cancelled orders can no longer download private product files.

