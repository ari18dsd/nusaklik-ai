/**
 * Security Rule Verification Scenarios ("Dirty Dozen")
 * Designed to validate NusaKlik.id Firestore security boundaries.
 */
export interface RuleTestScenario {
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED' | 'ALLOWED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_SCENARIOS: RuleTestScenario[] = [
  {
    name: '01. Shadow Field Injection on Product Create',
    collection: 'products/prod_shadow',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'prod_shadow', title: 'Test', isAdminSecret: true }
  },
  {
    name: '02. Self-Approved Order Create',
    collection: 'orders/NK-FAKE-01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { orderCode: 'NK-FAKE-01', status: 'Dibayar', totalAmount: 29000 }
  },
  {
    name: '03. Negative Price Tampering on Product',
    collection: 'products/prod_neg',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'prod_neg', price: -5000 }
  },
  {
    name: '04. PII Scraping List Query on Orders by Unauthenticated User',
    collection: 'orders',
    operation: 'list',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '05. Unverified Email Admin Spoof',
    collection: 'settings/store',
    operation: 'update',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '06. ID Poisoning with Path Traversal Characters',
    collection: 'products/..%2Fetc%2Fpasswd',
    operation: 'get',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '07. Shadow Update on Order Receipt (Buyer Self-Approval)',
    collection: 'order_receipts/NK-1001',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { status: 'Dibayar', proofUrl: '/uploads/fake.png' }
  },
  {
    name: '08. Private File Metadata Read by Non-Admin',
    collection: 'product_files/prod_excel',
    operation: 'get',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '09. Unauthorized Download Token Minting',
    collection: 'download_tokens/tok_malicious_123456',
    operation: 'create',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '10. Order Receipt Collection Enumeration',
    collection: 'order_receipts',
    operation: 'list',
    expected: 'PERMISSION_DENIED'
  },
  {
    name: '11. Timestamp Forgery on Order Create',
    collection: 'orders/NK-TIME-01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { orderCode: 'NK-TIME-01', createdAt: '2020-01-01T00:00:00Z' }
  },
  {
    name: '12. Unbounded Array Exhaustion on Product Benefits',
    collection: 'products/prod_arr',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'prod_arr', benefits: new Array(50).fill('spam') }
  }
];
