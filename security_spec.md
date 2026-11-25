# Security Specification — NusaKlik.id

## 1. Data Invariants
1. **Product Integrity**: Every product in `/products/{productId}` must have a valid string ID, bounded title/description, non-negative integer `price`, valid category, boolean `active`/`featured`/`isDemo`, and MUST NEVER store private file download URLs or filesystem paths.
2. **Private File Metadata Isolation**: `/product_files/{productId}` stores private file metadata (`fileId`, `fileName`, `mimeType`, `sizeBytes`) and is readable/writable ONLY by verified Admins (`isAdmin()`).
3. **Admin Role Authority**: Admin status is verified exclusively via `request.auth != null && request.auth.token.email_verified == true` AND either membership in `/admins/{uid}` or the bootstrapped owner email (`akunob300@gmail.com`). Client-supplied `role` or `isAdmin` fields are rejected.
4. **Order PII Isolation**: `/orders/{orderId}` contains customer PII (`customerName`, `customerEmail`, `customerWhatsapp`). Public `get` or `list` is strictly denied; only verified Admins or the authenticated `buyerUid` owner can read.
5. **Non-PII Order Receipt & Proof Flow**: `/order_receipts/{orderCode}` contains zero PII (`orderCode`, `orderId`, `status`, `subtotal`, `totalAmount`, `paymentMethod`, `itemSummaries`, `accessKeyHash`, `proofUrl`, `downloadTokens`). `allow list` is strictly `false` to prevent enumeration; single-document `get` requires a valid `orderCode` ID.
6. **Status Transition & Terminal Locking**: Newly created orders and receipts MUST start with `status == 'Menunggu Pembayaran'`. Buyers cannot self-approve orders to `'Dibayar'` or `'Selesai'`; only Admins can transition orders to `'Dibayar'`, `'Ditolak'`, `'Selesai'`, or `'Dibatalkan'`.
7. **Temporal Integrity**: `createdAt` and `updatedAt` timestamps on Firestore writes MUST equal `request.time`.
8. **Download Entitlement**: `/download_tokens/{tokenId}` can ONLY be created/modified/deleted by verified Admins (`isAdmin()`). `allow list` is `false`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Product Create**: `{ id: "p1", title: "Test", ..., isAdminSecret: true }` -> Rejected by `keys().hasOnly(...)`.
2. **Self-Approved Order Create**: `{ orderCode: "NK-1", status: "Dibayar", ... }` -> Rejected because `status` must be `'Menunggu Pembayaran'` on create.
3. **Negative / Zero Price Tampering**: Product `{ price: -5000 }` or Order `{ totalAmount: 0 }` -> Rejected by numeric range check (`price >= 0`, `totalAmount > 0`).
4. **PII Scraping List Query on Orders**: Unauthenticated or non-admin `getDocs(collection(db, 'orders'))` -> Rejected (`allow list` requires admin or `resource.data.buyerUid == request.auth.uid`).
5. **Unverified Email Admin Spoof**: Token with `email: 'akunob300@gmail.com'` and `email_verified: false` -> Rejected by `email_verified == true` guard.
6. **ID Poisoning**: Document ID > 128 chars or containing `../` or `$` -> Rejected by `isValidId()`.
7. **Shadow Update on Order Receipt**: Buyer updating `order_receipts/{id}` with `{ status: 'Dibayar', proofUrl: 'x' }` -> Rejected because buyer action only permits `status == 'Menunggu Verifikasi'` and `affectedKeys().hasOnly(['proofUrl', 'status', 'updatedAt'])`.
8. **Private File Metadata Read by Buyer**: Buyer reading `/product_files/{productId}` -> Rejected (`isAdmin()` only).
9. **Unauthorized Download Token Minting**: Non-admin creating `/download_tokens/{tokenId}` -> Rejected (`isAdmin()` only).
10. **Order Receipt Enumeration**: `getDocs(collection(db, 'order_receipts'))` -> Rejected (`allow list: if false`).
11. **Timestamp Forgery**: Creating order with `createdAt: Timestamp(2020-01-01)` -> Rejected (`createdAt == request.time`).
12. **Unbounded Array Exhaustion**: Order with 100 items or Review with 10KB name -> Rejected by `.size()` bounds.
