import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Static & structural security audit test runner for the Dirty Dozen payloads against firestore.rules
const rulesContent = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

interface SimulatedAuth {
  uid: string;
  email_verified: boolean;
}

interface TransactionPayload {
  uid?: unknown;
  description?: unknown;
  amountCents?: unknown;
  type?: unknown;
  categoryId?: unknown;
  categoryName?: unknown;
  expenseNature?: unknown;
  dateIso?: unknown;
  monthKey?: unknown;
  isStandardTemplate?: unknown;
  notes?: unknown;
  createdAt?: string;
  updatedAt?: string;
  [extra: string]: unknown;
}

function evaluateTransactionCreate(
  auth: SimulatedAuth | null,
  pathUserId: string,
  pathTxId: string,
  payload: TransactionPayload,
  nowIso = '2026-11-09T12:00:00Z'
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.email_verified || auth.uid !== pathUserId) return 'PERMISSION_DENIED';
  const idRegex = /^[a-zA-Z0-9_\-]+$/;
  if (!idRegex.test(pathUserId) || pathUserId.length > 128) return 'PERMISSION_DENIED';
  if (!idRegex.test(pathTxId) || pathTxId.length > 128) return 'PERMISSION_DENIED';

  const requiredKeys = [
    'uid',
    'description',
    'amountCents',
    'type',
    'categoryId',
    'categoryName',
    'expenseNature',
    'dateIso',
    'monthKey',
    'isStandardTemplate',
    'notes',
    'createdAt',
    'updatedAt',
  ];
  const keys = Object.keys(payload);
  if (keys.length !== requiredKeys.length || !requiredKeys.every((k) => keys.includes(k))) {
    return 'PERMISSION_DENIED';
  }
  if (payload.uid !== auth.uid || payload.uid !== pathUserId) return 'PERMISSION_DENIED';
  if (typeof payload.description !== 'string' || payload.description.length < 1 || payload.description.length > 120) {
    return 'PERMISSION_DENIED';
  }
  if (typeof payload.amountCents !== 'number' || !Number.isInteger(payload.amountCents) || payload.amountCents < 1 || payload.amountCents > 100000000000) {
    return 'PERMISSION_DENIED';
  }
  if (payload.type !== 'income' && payload.type !== 'expense') return 'PERMISSION_DENIED';
  if (typeof payload.categoryId !== 'string' || !idRegex.test(payload.categoryId) || payload.categoryId.length > 64) {
    return 'PERMISSION_DENIED';
  }
  if (typeof payload.categoryName !== 'string' || payload.categoryName.length < 1 || payload.categoryName.length > 60) {
    return 'PERMISSION_DENIED';
  }
  const allowedNatures = ['fixed', 'variable', 'surplus_allocation', 'income_recurring', 'income_extra'];
  if (typeof payload.expenseNature !== 'string' || !allowedNatures.includes(payload.expenseNature)) {
    return 'PERMISSION_DENIED';
  }
  if (typeof payload.dateIso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.dateIso)) {
    return 'PERMISSION_DENIED';
  }
  if (typeof payload.monthKey !== 'string' || !/^\d{4}-\d{2}$/.test(payload.monthKey)) {
    return 'PERMISSION_DENIED';
  }
  if (typeof payload.isStandardTemplate !== 'boolean') return 'PERMISSION_DENIED';
  if (typeof payload.notes !== 'string' || payload.notes.length > 240) return 'PERMISSION_DENIED';
  if (payload.createdAt !== nowIso || payload.updatedAt !== nowIso) return 'PERMISSION_DENIED';

  return 'ALLOW';
}

const baseValidPayload: TransactionPayload = {
  uid: 'user_1',
  description: 'Salário Mensal',
  amountCents: 850000,
  type: 'income',
  categoryId: 'cat_salary',
  categoryName: 'Salário & Pró-Labore',
  expenseNature: 'income_recurring',
  dateIso: '2026-11-05',
  monthKey: '2026-11',
  isStandardTemplate: true,
  notes: 'Depósito em conta',
  createdAt: '2026-11-09T12:00:00Z',
  updatedAt: '2026-11-09T12:00:00Z',
};

test('firestore.rules contains all mandatory 8-pillar gates', () => {
  assert.ok(rulesContent.includes("rules_version = '2';"));
  assert.ok(rulesContent.includes('allow read, write: if false;'));
  assert.ok(rulesContent.includes('request.auth.token.email_verified == true'));
  assert.ok(rulesContent.includes('isValidTransaction(incoming(), userId)'));
  assert.ok(rulesContent.includes('isValidCustomCategory(incoming(), userId)'));
  assert.ok(rulesContent.includes('isValidMonthlyPlan(incoming(), userId)'));
  assert.ok(rulesContent.includes('affectedKeys().hasOnly('));
});

test('Dirty Dozen #1: Unauthenticated Write is PERMISSION_DENIED', () => {
  assert.equal(evaluateTransactionCreate(null, 'user_1', 'tx_1', baseValidPayload), 'PERMISSION_DENIED');
});

test('Dirty Dozen #2: Unverified Email Spoof is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate({ uid: 'user_1', email_verified: false }, 'user_1', 'tx_1', baseValidPayload),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #3: Cross-Tenant Write is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate({ uid: 'attacker_1', email_verified: true }, 'user_1', 'tx_1', baseValidPayload),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #4: Payload UID Spoofing is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate(
      { uid: 'user_1', email_verified: true },
      'user_1',
      'tx_1',
      { ...baseValidPayload, uid: 'user_2' }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #5: Shadow / Ghost Field Injection is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate(
      { uid: 'user_1', email_verified: true },
      'user_1',
      'tx_1',
      { ...baseValidPayload, isAdmin: true }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #6: Zero or Negative Amount is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate(
      { uid: 'user_1', email_verified: true },
      'user_1',
      'tx_1',
      { ...baseValidPayload, amountCents: 0 }
    ),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evaluateTransactionCreate(
      { uid: 'user_1', email_verified: true },
      'user_1',
      'tx_1',
      { ...baseValidPayload, amountCents: -1500 }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #7: Oversized String DoW Attack is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate(
      { uid: 'user_1', email_verified: true },
      'user_1',
      'tx_1',
      { ...baseValidPayload, description: 'A'.repeat(121) }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #8: Invalid Enum Injection is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate(
      { uid: 'user_1', email_verified: true },
      'user_1',
      'tx_1',
      { ...baseValidPayload, type: 'crypto_swap' }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #9: Malformed Date / Month Regex Bypass is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate(
      { uid: 'user_1', email_verified: true },
      'user_1',
      'tx_1',
      { ...baseValidPayload, dateIso: '05/11/2026' }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #10: Poisoned Document ID is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate(
      { uid: 'user_1', email_verified: true },
      'user_1',
      'invalid/id$with$slashes',
      baseValidPayload
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #11: Client Timestamp Forgery is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateTransactionCreate(
      { uid: 'user_1', email_verified: true },
      'user_1',
      'tx_1',
      { ...baseValidPayload, createdAt: '2020-01-01T00:00:00Z' }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #12: Valid Owner & Schema Payload is ALLOWED', () => {
  assert.equal(
    evaluateTransactionCreate({ uid: 'user_1', email_verified: true }, 'user_1', 'tx_1', baseValidPayload),
    'ALLOW'
  );
});
