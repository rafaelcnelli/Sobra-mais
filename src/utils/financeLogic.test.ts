import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseInputToCents,
  validateTransactionInput,
  calculateMonthlySummary,
  calculateCategoryBreakdown,
  simulateSurplusAllocation,
  filterTransactionsByCriteria,
  calculateDynamicSummary,
  calculateIncomeVsExpenseComparison,
  type FinancialTransaction,
  type FinancialCategory,
} from './financeLogic';

test('parseInputToCents parses Brazilian and decimal formats accurately', () => {
  assert.equal(parseInputToCents('1.250,50'), 125050);
  assert.equal(parseInputToCents('R$ 380,00'), 38000);
  assert.equal(parseInputToCents('450.75'), 45075);
  assert.equal(parseInputToCents('90'), 9000);
  assert.equal(parseInputToCents(''), 0);
});

test('validateTransactionInput enforces schema rules and extracts monthKey', () => {
  const valid = validateTransactionInput({
    description: 'Supermercado Mensal',
    amountCents: 65000,
    type: 'expense',
    categoryId: 'cat_food',
    categoryName: 'Alimentação & Mercado',
    expenseNature: 'variable',
    dateIso: '2026-11-09',
    notes: 'Compra quinzenal',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.monthKey, '2026-11');

  const emptyDesc = validateTransactionInput({
    description: '   ',
    amountCents: 5000,
    type: 'expense',
    categoryId: 'cat_food',
    categoryName: 'Alimentação',
    expenseNature: 'variable',
    dateIso: '2026-11-09',
  });
  assert.equal(emptyDesc.valid, false);
});

test('calculateMonthlySummary computes entradas, saidas, fixed/variable ratio, and sobras', () => {
  const txs: FinancialTransaction[] = [
    {
      id: '1',
      uid: 'u1',
      description: 'Salário Líquido',
      amountCents: 1000000, // R$ 10.000,00
      type: 'income',
      categoryId: 'cat_salary',
      categoryName: 'Salário',
      expenseNature: 'income_recurring',
      dateIso: '2026-11-05',
      monthKey: '2026-11',
      isStandardTemplate: true,
      notes: '',
    },
    {
      id: '2',
      uid: 'u1',
      description: 'Aluguel + Condomínio',
      amountCents: 300000, // R$ 3.000,00
      type: 'expense',
      categoryId: 'cat_housing',
      categoryName: 'Moradia',
      expenseNature: 'fixed',
      dateIso: '2026-11-06',
      monthKey: '2026-11',
      isStandardTemplate: true,
      notes: '',
    },
    {
      id: '3',
      uid: 'u1',
      description: 'Supermercado',
      amountCents: 150000, // R$ 1.500,00
      type: 'expense',
      categoryId: 'cat_food',
      categoryName: 'Alimentação',
      expenseNature: 'variable',
      dateIso: '2026-11-08',
      monthKey: '2026-11',
      isStandardTemplate: false,
      notes: '',
    },
  ];

  const summary = calculateMonthlySummary(txs, '2026-11');
  assert.equal(summary.totalIncomeCents, 1000000);
  assert.equal(summary.totalExpenseCents, 450000);
  assert.equal(summary.fixedExpenseCents, 300000);
  assert.equal(summary.variableExpenseCents, 150000);
  assert.equal(summary.netSurplusCents, 550000); // R$ 5.500,00 sobra
  assert.equal(summary.surplusRatePercent, 55);
  assert.equal(summary.status, 'surplus_healthy');
});

test('calculateCategoryBreakdown detects category limit usage and over-limit status', () => {
  const categories: FinancialCategory[] = [
    {
      id: 'cat_food',
      uid: 'u1',
      name: 'Alimentação',
      type: 'expense',
      nature: 'variable',
      monthlyLimitCents: 100000, // R$ 1.000,00 limit
      defaultAmountCents: 40000,
      isStandardPreset: true,
    },
  ];

  const txs: FinancialTransaction[] = [
    {
      id: 'tx1',
      uid: 'u1',
      description: 'Mercado',
      amountCents: 120000, // R$ 1.200,00 spent
      type: 'expense',
      categoryId: 'cat_food',
      categoryName: 'Alimentação',
      expenseNature: 'variable',
      dateIso: '2026-11-09',
      monthKey: '2026-11',
      isStandardTemplate: false,
      notes: '',
    },
  ];

  const breakdown = calculateCategoryBreakdown(txs, categories, '2026-11', 'expense');
  assert.equal(breakdown.length, 1);
  assert.equal(breakdown[0].isOverLimit, true);
  assert.equal(breakdown[0].limitUsagePercent, 120);
});

test('simulateSurplusAllocation splits monthly surplus into buckets and projects 12m total', () => {
  const sim = simulateSurplusAllocation(200000, 50, 30, 20); // R$ 2.000,00 surplus
  assert.equal(sim.emergencyCents, 100000);
  assert.equal(sim.investmentsCents, 60000);
  assert.equal(sim.goalsCents, 40000);
  assert.ok(sim.projected12MonthsCents > 2400000); // > 12 * R$ 2.000 due to yield
});

test('filterTransactionsByCriteria filters by custom date range, category, nature and direction', () => {
  const sampleTxs: FinancialTransaction[] = [
    {
      id: 'tx1',
      uid: 'u1',
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
    {
      id: 'tx2',
      uid: 'u1',
      description: 'Aluguel',
      amountCents: 200000,
      type: 'expense',
      categoryId: 'cat_housing',
      categoryName: 'Moradia',
      expenseNature: 'fixed',
      dateIso: '2026-11-10',
      monthKey: '2026-11',
      isStandardTemplate: true,
      notes: '',
    },
    {
      id: 'tx3',
      uid: 'u1',
      description: 'Jantar',
      amountCents: 15000,
      type: 'expense',
      categoryId: 'cat_dining',
      categoryName: 'Restaurante',
      expenseNature: 'variable',
      dateIso: '2026-11-20',
      monthKey: '2026-11',
      isStandardTemplate: false,
      notes: 'Comemoração',
    },
  ];

  // Custom date range: only 2026-11-01 to 2026-11-15
  const rangeFiltered = filterTransactionsByCriteria(sampleTxs, {
    periodMode: 'range',
    monthKey: '2026-11',
    startDate: '2026-11-01',
    endDate: '2026-11-15',
    direction: 'all',
    nature: 'all',
    categoryId: 'all',
  });
  assert.equal(rangeFiltered.length, 2);

  // Direction filter: only expenses
  const expenseOnly = filterTransactionsByCriteria(sampleTxs, {
    periodMode: 'month',
    monthKey: '2026-11',
    direction: 'expense',
    nature: 'all',
    categoryId: 'all',
  });
  assert.equal(expenseOnly.length, 2);

  // Dynamic summary
  const dynSummary = calculateDynamicSummary(rangeFiltered, '01/11 a 15/11');
  assert.equal(dynSummary.totalIncomeCents, 500000);
  assert.equal(dynSummary.totalExpenseCents, 200000);
  assert.equal(dynSummary.netSurplusCents, 300000);

  // Comparison between Entradas and Saídas
  const cmp = calculateIncomeVsExpenseComparison(sampleTxs);
  assert.equal(cmp.totalIncomeCents, 500000);
  assert.equal(cmp.recurringIncomeCents, 500000);
  assert.equal(cmp.extraIncomeCents, 0);
  assert.equal(cmp.totalExpenseCents, 215000);
  assert.equal(cmp.fixedExpenseCents, 200000);
  assert.equal(cmp.variableExpenseCents, 15000);
  assert.equal(cmp.netBalanceCents, 285000);
  assert.equal(cmp.retentionRatePercent, 57);
  assert.equal(cmp.largestExpense?.description, 'Aluguel');

  // Cross-dataset real-time search by description across different months
  const multiMonthTxs: FinancialTransaction[] = [
    ...sampleTxs,
    {
      id: 'tx4',
      uid: 'u1',
      description: 'Salário Outubro',
      amountCents: 480000,
      type: 'income',
      categoryId: 'cat_salary',
      categoryName: 'Salário',
      expenseNature: 'income_recurring',
      dateIso: '2026-10-05',
      monthKey: '2026-10',
      isStandardTemplate: true,
      notes: '',
    },
  ];

  const globalSearchMatches = filterTransactionsByCriteria(multiMonthTxs, {
    periodMode: 'month',
    monthKey: '2026-11',
    direction: 'all',
    nature: 'all',
    categoryId: 'all',
    searchQuery: 'salario', // accent-insensitive match across 2026-10 and 2026-11
  });
  assert.equal(globalSearchMatches.length, 2);
});



