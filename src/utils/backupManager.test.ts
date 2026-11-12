import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBackupPayload,
  validateAndParseBackupJson,
  formatBackupDate,
} from './backupManager';
import type {
  FinancialTransaction,
  FinancialCategory,
  MonthlySurplusPlan,
} from './financeLogic';

test('buildBackupPayload creates valid SobraMais metadata and stats', () => {
  const txs: FinancialTransaction[] = [
    {
      id: 'tx_1',
      uid: 'u_test',
      description: 'Salário',
      amountCents: 500000,
      type: 'income',
      categoryId: 'cat_salary',
      categoryName: 'Salário',
      expenseNature: 'income_recurring',
      dateIso: '2026-11-05',
      monthKey: '2026-11',
      isStandardTemplate: true,
      notes: '',
    },
  ];

  const cats: FinancialCategory[] = [
    {
      id: 'cat_salary',
      uid: 'u_test',
      name: 'Salário',
      type: 'income',
      nature: 'income_recurring',
      monthlyLimitCents: 0,
      defaultAmountCents: 500000,
      isStandardPreset: true,
    },
  ];

  const plans: Record<string, MonthlySurplusPlan> = {
    '2026-11': {
      id: 'plan_2026-11',
      uid: 'u_test',
      monthKey: '2026-11',
      targetSurplusPercent: 20,
      targetSurplusCents: 100000,
      emergencySharePercent: 40,
      investmentsSharePercent: 40,
      goalsSharePercent: 20,
    },
  };

  const payload = buildBackupPayload(txs, cats, plans);

  assert.equal(payload.app, 'SobraMais');
  assert.equal(payload.version, '1.0');
  assert.equal(payload.stats.transactionsCount, 1);
  assert.equal(payload.stats.categoriesCount, 1);
  assert.equal(payload.stats.monthlyPlansCount, 1);
  assert.equal(payload.transactions.length, 1);
  assert.equal(payload.categories.length, 1);
  assert.ok(payload.exportedAt);
});

test('validateAndParseBackupJson validates structure and flags corrupted or alien payloads', () => {
  // 1. Invalid JSON string
  const invalidJson = validateAndParseBackupJson('{ bad json');
  assert.equal(invalidJson.valid, false);
  assert.match(invalidJson.error || '', /sintaxe JSON/i);

  // 2. Non-SobraMais JSON
  const alienJson = validateAndParseBackupJson(
    JSON.stringify({ app: 'OtherApp', transactions: [] })
  );
  assert.equal(alienJson.valid, false);
  assert.match(alienJson.error || '', /não pertence ao SobraMais/i);

  // 3. Corrupted transaction in array
  const corruptedTx = validateAndParseBackupJson(
    JSON.stringify({
      app: 'SobraMais',
      transactions: [{ id: '1', description: 'Mercado' }], // missing amountCents, dateIso
      categories: [],
      monthlyPlans: {},
    })
  );
  assert.equal(corruptedTx.valid, false);
  assert.match(corruptedTx.error || '', /Transação #1/i);

  // 4. Valid payload
  const validJson = validateAndParseBackupJson(
    JSON.stringify({
      app: 'SobraMais',
      version: '1.0',
      exportedAt: '2026-11-12T04:00:00.000Z',
      transactions: [
        {
          id: 'tx_ok',
          uid: 'u1',
          description: 'Padaria',
          amountCents: 2500,
          type: 'expense',
          categoryId: 'cat_food',
          categoryName: 'Alimentação',
          expenseNature: 'variable',
          dateIso: '2026-11-09',
          monthKey: '2026-11',
          isStandardTemplate: false,
          notes: '',
        },
      ],
      categories: [
        {
          id: 'cat_food',
          uid: 'u1',
          name: 'Alimentação',
          type: 'expense',
          nature: 'variable',
          monthlyLimitCents: 100000,
          defaultAmountCents: 5000,
          isStandardPreset: true,
        },
      ],
      monthlyPlans: {},
    })
  );

  assert.equal(validJson.valid, true);
  assert.equal(validJson.data?.stats.transactionsCount, 1);
  assert.equal(validJson.data?.stats.categoriesCount, 1);
});

test('formatBackupDate handles null, invalid, and valid dates', () => {
  assert.equal(formatBackupDate(null), 'Nenhum backup baixado ainda');
  assert.equal(formatBackupDate('invalid-date'), 'Data desconhecida');
  const formatted = formatBackupDate('2026-11-12T10:30:00.000Z');
  assert.ok(formatted.includes('12/11/2026') || formatted.includes('11/12/2026'));
});
