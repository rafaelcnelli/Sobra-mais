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
  generatePersonalizedSavingsTips,
  calculatePredictiveInsights,
  formatCurrencyWithPrivacy,
  setGlobalPrivacyMode,
  formatBrlCents,
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

test('generatePersonalizedSavingsTips generates exactly 3 contextual tips with MoM increase and limit checks', () => {
  const cats: FinancialCategory[] = [
    {
      id: 'cat_leisure',
      uid: 'u1',
      name: 'Lazer & Entretenimento',
      type: 'expense',
      nature: 'variable',
      monthlyLimitCents: 40000, // R$ 400,00
      defaultAmountCents: 15000,
      isStandardPreset: true,
    },
    {
      id: 'cat_dining',
      uid: 'u1',
      name: 'Restaurantes & Delivery',
      type: 'expense',
      nature: 'variable',
      monthlyLimitCents: 60000, // R$ 600,00
      defaultAmountCents: 20000,
      isStandardPreset: true,
    },
  ];

  const txs: FinancialTransaction[] = [
    // Previous month (2026-10): R$ 200 on leisure
    {
      id: 't_oct_1',
      uid: 'u1',
      description: 'Cinema Outubro',
      amountCents: 20000,
      type: 'expense',
      categoryId: 'cat_leisure',
      categoryName: 'Lazer & Entretenimento',
      expenseNature: 'variable',
      dateIso: '2026-10-15',
      monthKey: '2026-10',
      isStandardTemplate: false,
      notes: '',
    },
    // Current month (2026-11): R$ 550 on leisure (+R$ 350 MoM increase, and R$ 150 over limit!)
    {
      id: 't_nov_1',
      uid: 'u1',
      description: 'Show e Ingressos Lazer',
      amountCents: 55000,
      type: 'expense',
      categoryId: 'cat_leisure',
      categoryName: 'Lazer & Entretenimento',
      expenseNature: 'variable',
      dateIso: '2026-11-05',
      monthKey: '2026-11',
      isStandardTemplate: false,
      notes: '',
    },
  ];

  const summary = calculateMonthlySummary(txs, '2026-11');
  const tips = generatePersonalizedSavingsTips(txs, cats, '2026-11', summary, 100000);

  assert.equal(tips.length, 3);
  // Check that one of the tips mentions the increase or overlimit in Lazer
  const hasLeisureTip = tips.some((t) => t.categoryName?.includes('Lazer') || t.message.includes('Lazer'));
  assert.equal(hasLeisureTip, true);
  // Verify tip properties
  for (const tip of tips) {
    assert.ok(tip.id);
    assert.ok(tip.title);
    assert.ok(tip.message);
    assert.ok(tip.highlightText);
  }
});

test('formatCurrencyWithPrivacy and setGlobalPrivacyMode mask monetary BRL values while preserving signs', () => {
  assert.equal(formatCurrencyWithPrivacy(150000, true), 'R$ ••••');
  assert.equal(formatCurrencyWithPrivacy(150000, true, true), '+ R$ ••••');
  assert.equal(formatCurrencyWithPrivacy(-45000, true, true), '- R$ ••••');

  setGlobalPrivacyMode(true);
  assert.equal(formatBrlCents(250000), 'R$ ••••');
  assert.equal(formatBrlCents(250000, true), '+ R$ ••••');
  setGlobalPrivacyMode(false);
  assert.ok(formatBrlCents(250000).includes('2.500,00'));
});

test('calculateMonthlySummary computes Saldo Real (completed) vs Saldo Previsto (with pending)', () => {
  const txs: FinancialTransaction[] = [
    {
      id: 'tx_c1',
      uid: 'u1',
      description: 'Salário Recebido',
      amountCents: 600000,
      type: 'income',
      categoryId: 'cat_inc_salary',
      categoryName: 'Salário',
      expenseNature: 'income_recurring',
      dateIso: '2026-11-05',
      monthKey: '2026-11',
      isStandardTemplate: true,
      status: 'completed',
      isRecurring: true,
      notes: '',
    },
    {
      id: 'tx_c2',
      uid: 'u1',
      description: 'Aluguel Pago',
      amountCents: 200000,
      type: 'expense',
      categoryId: 'cat_exp_housing',
      categoryName: 'Moradia',
      expenseNature: 'fixed',
      dateIso: '2026-11-06',
      monthKey: '2026-11',
      isStandardTemplate: true,
      status: 'completed',
      isRecurring: true,
      notes: '',
    },
    {
      id: 'tx_p1',
      uid: 'u1',
      description: 'Conta de Luz Agendada',
      amountCents: 35000,
      type: 'expense',
      categoryId: 'cat_exp_utilities',
      categoryName: 'Luz',
      expenseNature: 'fixed',
      dateIso: '2026-11-20',
      monthKey: '2026-11',
      isStandardTemplate: true,
      status: 'pending',
      isRecurring: true,
      notes: '',
    },
    {
      id: 'tx_p2',
      uid: 'u1',
      description: 'Freelance a Receber',
      amountCents: 80000,
      type: 'income',
      categoryId: 'cat_inc_extra',
      categoryName: 'Extra',
      expenseNature: 'income_extra',
      dateIso: '2026-11-25',
      monthKey: '2026-11',
      isStandardTemplate: true,
      status: 'pending',
      isRecurring: false,
      notes: '',
    },
  ];

  const summary = calculateMonthlySummary(txs, '2026-11');
  // Saldo Real (apenas completed): 6000 - 2000 = 4000 (400000 cents)
  assert.equal(summary.totalIncomeCents, 600000);
  assert.equal(summary.totalExpenseCents, 200000);
  assert.equal(summary.netSurplusCents, 400000);

  // Pendentes: +800 (80000) e -350 (35000)
  assert.equal(summary.pendingCount, 2);
  assert.equal(summary.pendingIncomeCents, 80000);
  assert.equal(summary.pendingExpenseCents, 35000);

  // Saldo Previsto: 6800 - 2350 = 4450 (445000 cents)
  assert.equal(summary.projectedIncomeCents, 680000);
  assert.equal(summary.projectedExpenseCents, 235000);
  assert.equal(summary.projectedNetSurplusCents, 445000);
});

test('calculatePredictiveInsights computes Safe-to-Spend daily budget and Run-rate closing forecast', () => {
  const txs: FinancialTransaction[] = [
    {
      id: 'p_inc',
      uid: 'u1',
      description: 'Salário',
      amountCents: 800000, // R$ 8.000,00
      type: 'income',
      categoryId: 'cat_salary',
      categoryName: 'Salário',
      expenseNature: 'income_recurring',
      dateIso: '2026-11-05',
      monthKey: '2026-11',
      isStandardTemplate: true,
      status: 'completed',
      notes: '',
    },
    {
      id: 'p_fix',
      uid: 'u1',
      description: 'Aluguel',
      amountCents: 200000, // R$ 2.000,00 fixo
      type: 'expense',
      categoryId: 'cat_housing',
      categoryName: 'Moradia',
      expenseNature: 'fixed',
      dateIso: '2026-11-06',
      monthKey: '2026-11',
      isStandardTemplate: true,
      status: 'completed',
      notes: '',
    },
    {
      id: 'p_var',
      uid: 'u1',
      description: 'Mercado',
      amountCents: 100000, // R$ 1.000,00 variável até dia 10 (R$ 100/dia)
      type: 'expense',
      categoryId: 'cat_food',
      categoryName: 'Mercado',
      expenseNature: 'variable',
      dateIso: '2026-11-10',
      monthKey: '2026-11',
      isStandardTemplate: true,
      status: 'completed',
      notes: '',
    },
  ];

  // Reference date: 2026-11-10 (10 days elapsed, 20 days remaining in 30-day November)
  // Target surplus: R$ 3.000,00 (300000 cents)
  // Current surplus: R$ 8.000 - R$ 3.000 = R$ 5.000 (500000 cents)
  // Margin over target: R$ 5.000 - R$ 3.000 = R$ 2.000 (200000 cents)
  // Safe daily spend over 20 remaining days: 200000 / 20 = 10000 cents (R$ 100,00/dia)
  const insights = calculatePredictiveInsights(
    txs,
    '2026-11',
    {
      id: 'plan_nov',
      uid: 'u1',
      monthKey: '2026-11',
      targetSurplusPercent: 30,
      targetSurplusCents: 300000,
      emergencySharePercent: 40,
      investmentsSharePercent: 40,
      goalsSharePercent: 20,
    },
    '2026-11-10'
  );

  assert.equal(insights.daysInMonth, 30);
  assert.equal(insights.elapsedDays, 10);
  assert.equal(insights.remainingDays, 20);
  assert.equal(insights.availableMarginCents, 200000);
  assert.equal(insights.safeDailySpendCents, 10000);
  assert.equal(insights.isAboveOrAtTarget, true);
  // Daily variable average = 100000 / 10 = 10000 (R$ 100/dia) -> 30 days = 300000 (R$ 3.000)
  // Projected total expenses = 200000 (fixed) + 300000 (variable) = 500000
  // Estimated closing surplus = 800000 - 500000 = 300000 (R$ 3.000,00)
  assert.equal(insights.averageDailyVariableExpenseCents, 10000);
  assert.equal(insights.projectedVariableExpenseCents, 300000);
  assert.equal(insights.estimatedClosingSurplusCents, 300000);
  assert.equal(insights.isForecastAboveTarget, true);
});




