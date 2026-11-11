export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'completed' | 'pending';

export type ExpenseNature =
  | 'fixed'
  | 'variable'
  | 'surplus_allocation'
  | 'income_recurring'
  | 'income_extra';

export interface FinancialCategory {
  id: string;
  uid: string;
  name: string;
  type: TransactionType;
  nature: ExpenseNature;
  monthlyLimitCents: number;
  defaultAmountCents: number;
  isStandardPreset: boolean;
  isSystemDefault?: boolean;
}

export interface FinancialTransaction {
  id: string;
  uid: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  expenseNature: ExpenseNature;
  dateIso: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  isStandardTemplate: boolean;
  notes: string;
  status?: TransactionStatus; // Retrocompatible: defaults to 'completed' when undefined
  isRecurring?: boolean; // Retrocompatible: defaults to fixed/income_recurring when undefined
}

export interface MonthlySurplusPlan {
  id: string;
  uid: string;
  monthKey: string;
  targetSurplusPercent: number;
  targetSurplusCents: number;
  emergencySharePercent: number;
  investmentsSharePercent: number;
  goalsSharePercent: number;
}

export interface MonthlyFinancialSummary {
  monthKey: string;
  totalIncomeCents: number; // Realized (completed) income
  totalExpenseCents: number; // Realized (completed) expenses
  fixedExpenseCents: number; // Realized fixed expenses
  variableExpenseCents: number; // Realized variable expenses
  surplusAssignedCents: number;
  netSurplusCents: number; // Saldo Real Atual (Realized Income - Realized Expenses)
  freeUnallocatedSurplusCents: number; // Realized Net Surplus - Surplus Assigned
  surplusRatePercent: number; // (netSurplusCents / totalIncomeCents) * 100
  fixedCommitmentPercent: number; // (fixedExpenseCents / totalIncomeCents) * 100
  variableCommitmentPercent: number; // (variableExpenseCents / totalIncomeCents) * 100
  targetSurplusCents: number;
  targetProgressPercent: number;
  status: 'surplus_healthy' | 'surplus_tight' | 'deficit';
  // Pending & Projected fields (Sistema de Contas Fixas / Pendentes)
  pendingIncomeCents: number;
  pendingExpenseCents: number;
  pendingFixedExpenseCents: number;
  pendingVariableExpenseCents: number;
  pendingCount: number;
  projectedIncomeCents: number; // Realized + Pending Income
  projectedExpenseCents: number; // Realized + Pending Expense
  projectedNetSurplusCents: number; // Saldo Previsto (considerando pendentes)
  projectedFreeSurplusCents: number; // Saldo Livre Previsto
}

export interface PredictiveInsights {
  monthKey: string;
  periodStatus: 'current' | 'past' | 'future';
  monthStatus: 'current' | 'past' | 'future';
  totalDaysInMonth: number;
  daysInMonth: number;
  elapsedDays: number;
  remainingDays: number;
  targetSurplusCents: number;
  currentRealSurplusCents: number;
  projectedWithPendingSurplusCents: number;
  availableMarginCents: number; // Saldo/Sobra considerada - Meta do Mês
  isAboveOrAtTarget: boolean;
  safeDailySpendCents: number; // Valor seguro para gastar por dia nos próximos X dias
  dailyRecoveryNeededCents: number; // Quanto economizar/gerar por dia se abaixo da meta
  dailyVariableBurnRateCents: number; // Média diária de gastos variáveis até hoje
  averageDailyVariableExpenseCents: number;
  projectedTotalVariableCents: number; // Projeção total de variáveis até o fim do mês
  projectedVariableExpenseCents: number;
  projectedClosingSurplusCents: number; // Run-rate: sobra estimada no último dia do mês
  estimatedClosingSurplusCents: number;
  projectedVsTargetDiffCents: number; // Diferença da sobra projetada vs meta
  forecastVsTargetDiffCents: number;
  isProjectedAboveTarget: boolean;
  isForecastAboveTarget: boolean;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  nature: ExpenseNature;
  type: TransactionType;
  spentCents: number;
  monthlyLimitCents: number;
  shareOfTypePercent: number;
  limitUsagePercent: number;
  isOverLimit: boolean;
  transactionCount: number;
}

export interface SurplusAllocationSimulation {
  availableSurplusCents: number;
  emergencyCents: number;
  investmentsCents: number;
  goalsCents: number;
  projected12MonthsCents: number; // With conservative 0.85% monthly compound on investments + emergency
}

/**
 * Global Privacy Mode state for currency formatting wrapper.
 * Defaults to false in Node/tests and syncs with React state in browser.
 */
let globalPrivacyMode = false;

export function setGlobalPrivacyMode(enabled: boolean): void {
  globalPrivacyMode = enabled;
}

export function getGlobalPrivacyMode(): boolean {
  return globalPrivacyMode;
}

/**
 * Retrocompatible helper: returns 'completed' when `tx.status` is undefined or 'completed',
 * and 'pending' when explicitly set to 'pending'.
 */
export function getTransactionStatus(
  tx: Pick<FinancialTransaction, 'status'>
): TransactionStatus {
  return tx.status === 'pending' ? 'pending' : 'completed';
}

/**
 * Retrocompatible helper: returns boolean `tx.isRecurring` if defined,
 * otherwise infers true for fixed expenses or recurring income.
 */
export function isTransactionRecurring(
  tx: Pick<FinancialTransaction, 'isRecurring' | 'expenseNature'>
): boolean {
  if (typeof tx.isRecurring === 'boolean') return tx.isRecurring;
  return tx.expenseNature === 'fixed' || tx.expenseNature === 'income_recurring';
}

/**
 * Formats integer cents into BRL currency string (e.g., 125050 -> "R$ 1.250,50").
 * Automatically respects globalPrivacyMode ("R$ ••••") unless forceReveal is true.
 */
export function formatBrlCents(
  cents: number,
  showSign = false,
  forceReveal = false
): string {
  const isNegative = cents < 0;
  if (globalPrivacyMode && !forceReveal) {
    if (isNegative) return '- R$ ••••';
    if (showSign && cents > 0) return '+ R$ ••••';
    return 'R$ ••••';
  }

  const absReais = Math.abs(cents) / 100;
  const formatted = absReais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (isNegative) return `- ${formatted}`;
  if (showSign && cents > 0) return `+ ${formatted}`;
  return formatted;
}

/**
 * Explicit currency formatting wrapper that accepts `isPrivacyMode` directly.
 */
export function formatCurrencyWithPrivacy(
  cents: number,
  isPrivacyMode: boolean,
  showSign = false
): string {
  if (isPrivacyMode) {
    if (cents < 0) return '- R$ ••••';
    if (showSign && cents > 0) return '+ R$ ••••';
    return 'R$ ••••';
  }
  return formatBrlCents(cents, showSign, true);
}

/**
 * Parses user currency input (e.g., "1.250,50" or "1250.50" or "450") into integer cents.
 */
export function parseInputToCents(raw: string): number {
  const cleaned = raw.trim().replace(/[R$\s]/g, '');
  if (!cleaned) return 0;

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Validates and sanitizes transaction input before local or Firestore persistence.
 * Enforces exact constraints from firebase-blueprint.json.
 */
export function validateTransactionInput(input: {
  description: string;
  amountCents: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  expenseNature: ExpenseNature;
  dateIso: string;
  notes?: string;
  status?: TransactionStatus;
  isRecurring?: boolean;
}): { valid: boolean; error?: string; monthKey: string } {
  const desc = input.description.trim();
  if (desc.length < 1) {
    return { valid: false, error: 'Informe uma descrição para o lançamento.', monthKey: '' };
  }
  if (desc.length > 120) {
    return { valid: false, error: 'A descrição deve ter no máximo 120 caracteres.', monthKey: '' };
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1) {
    return { valid: false, error: 'O valor deve ser maior que R$ 0,00.', monthKey: '' };
  }
  if (input.amountCents > 100000000000) {
    return { valid: false, error: 'O valor informado excede o limite permitido.', monthKey: '' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateIso)) {
    return { valid: false, error: 'Data inválida. Utilize o formato AAAA-MM-DD.', monthKey: '' };
  }
  if (!input.categoryId || !/^[a-zA-Z0-9_\-]+$/.test(input.categoryId)) {
    return { valid: false, error: 'Selecione uma categoria válida.', monthKey: '' };
  }
  if ((input.notes ?? '').length > 240) {
    return { valid: false, error: 'A observação deve ter no máximo 240 caracteres.', monthKey: '' };
  }
  if (input.status !== undefined && input.status !== 'completed' && input.status !== 'pending') {
    return { valid: false, error: 'Status de lançamento inválido.', monthKey: '' };
  }

  const monthKey = input.dateIso.slice(0, 7);
  return { valid: true, monthKey };
}

/**
 * Validates custom category / standard preset creation.
 */
export function validateCategoryInput(input: {
  name: string;
  type: TransactionType;
  nature: ExpenseNature;
  monthlyLimitCents: number;
  defaultAmountCents: number;
}): { valid: boolean; error?: string } {
  const name = input.name.trim();
  if (name.length < 1) {
    return { valid: false, error: 'Informe o nome do tipo de gasto ou entrada.' };
  }
  if (name.length > 60) {
    return { valid: false, error: 'O nome da categoria deve ter no máximo 60 caracteres.' };
  }
  if (input.monthlyLimitCents < 0 || input.defaultAmountCents < 0) {
    return { valid: false, error: 'Os valores de teto ou padrão não podem ser negativos.' };
  }
  return { valid: true };
}

/**
 * Internal shared accumulator for calculateMonthlySummary & calculateDynamicSummary.
 * Separates 'completed' (Saldo Real Atual) from 'pending' (Saldo Previsto).
 */
function buildSummaryFromList(
  txList: FinancialTransaction[],
  labelKey: string,
  plan?: MonthlySurplusPlan
): MonthlyFinancialSummary {
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;
  let fixedExpenseCents = 0;
  let variableExpenseCents = 0;
  let surplusAssignedCents = 0;

  let pendingIncomeCents = 0;
  let pendingExpenseCents = 0;
  let pendingFixedExpenseCents = 0;
  let pendingVariableExpenseCents = 0;
  let pendingCount = 0;

  for (const tx of txList) {
    const txStatus = getTransactionStatus(tx);

    if (txStatus === 'pending') {
      pendingCount += 1;
      if (tx.type === 'income') {
        pendingIncomeCents += tx.amountCents;
      } else if (tx.expenseNature !== 'surplus_allocation') {
        pendingExpenseCents += tx.amountCents;
        if (tx.expenseNature === 'fixed') {
          pendingFixedExpenseCents += tx.amountCents;
        } else {
          pendingVariableExpenseCents += tx.amountCents;
        }
      }
      continue;
    }

    // Completed / Efetivado
    if (tx.type === 'income') {
      totalIncomeCents += tx.amountCents;
    } else {
      if (tx.expenseNature === 'surplus_allocation') {
        surplusAssignedCents += tx.amountCents;
      } else {
        totalExpenseCents += tx.amountCents;
        if (tx.expenseNature === 'fixed') {
          fixedExpenseCents += tx.amountCents;
        } else {
          variableExpenseCents += tx.amountCents;
        }
      }
    }
  }

  const netSurplusCents = totalIncomeCents - totalExpenseCents;
  const freeUnallocatedSurplusCents = netSurplusCents - surplusAssignedCents;

  const projectedIncomeCents = totalIncomeCents + pendingIncomeCents;
  const projectedExpenseCents = totalExpenseCents + pendingExpenseCents;
  const projectedNetSurplusCents = projectedIncomeCents - projectedExpenseCents;
  const projectedFreeSurplusCents = projectedNetSurplusCents - surplusAssignedCents;

  const surplusRatePercent =
    totalIncomeCents > 0 ? Math.round((netSurplusCents / totalIncomeCents) * 1000) / 10 : 0;

  const fixedCommitmentPercent =
    totalIncomeCents > 0 ? Math.round((fixedExpenseCents / totalIncomeCents) * 1000) / 10 : 0;

  const variableCommitmentPercent =
    totalIncomeCents > 0 ? Math.round((variableExpenseCents / totalIncomeCents) * 1000) / 10 : 0;

  const targetPercent = plan?.targetSurplusPercent ?? 25;
  const explicitTarget = plan?.targetSurplusCents ?? 0;
  const targetSurplusCents =
    explicitTarget > 0
      ? explicitTarget
      : Math.round((totalIncomeCents * targetPercent) / 100);

  const targetProgressPercent =
    targetSurplusCents > 0
      ? Math.max(0, Math.min(150, Math.round((netSurplusCents / targetSurplusCents) * 100)))
      : netSurplusCents > 0
      ? 100
      : 0;

  let status: 'surplus_healthy' | 'surplus_tight' | 'deficit' = 'surplus_healthy';
  if (netSurplusCents < 0) {
    status = 'deficit';
  } else if (netSurplusCents < targetSurplusCents * 0.75 || surplusRatePercent < 10) {
    status = 'surplus_tight';
  }

  return {
    monthKey: labelKey,
    totalIncomeCents,
    totalExpenseCents,
    fixedExpenseCents,
    variableExpenseCents,
    surplusAssignedCents,
    netSurplusCents,
    freeUnallocatedSurplusCents,
    surplusRatePercent,
    fixedCommitmentPercent,
    variableCommitmentPercent,
    targetSurplusCents,
    targetProgressPercent,
    status,
    pendingIncomeCents,
    pendingExpenseCents,
    pendingFixedExpenseCents,
    pendingVariableExpenseCents,
    pendingCount,
    projectedIncomeCents,
    projectedExpenseCents,
    projectedNetSurplusCents,
    projectedFreeSurplusCents,
  };
}

/**
 * Computes full monthly summary including Net Surplus (Sobras), Fixed vs Variable ratio,
 * Target progress, and Pending vs Completed projections.
 */
export function calculateMonthlySummary(
  transactions: FinancialTransaction[],
  monthKey: string,
  plan?: MonthlySurplusPlan
): MonthlyFinancialSummary {
  const monthTxs = transactions.filter((t) => t.monthKey === monthKey);
  return buildSummaryFromList(monthTxs, monthKey, plan);
}

/**
 * Computes Predictive Intelligence metrics:
 * 1. Orçamento Diário Seguro (Safe-to-Spend)
 * 2. Previsão de Fechamento (Run-rate Mensal)
 */
export function calculatePredictiveInsights(
  transactions: FinancialTransaction[],
  monthKey: string,
  plan?: MonthlySurplusPlan,
  referenceDateIso = '2026-11-11'
): PredictiveInsights {
  const summary = calculateMonthlySummary(transactions, monthKey, plan);
  const effectiveTargetCents =
    plan?.targetSurplusCents && plan.targetSurplusCents > 0
      ? plan.targetSurplusCents
      : summary.targetSurplusCents;

  // Parse monthKey (e.g. '2026-11')
  const parts = monthKey.split('-');
  const year = parts.length === 2 ? Number(parts[0]) || 2026 : 2026;
  const month = parts.length === 2 ? Number(parts[1]) || 11 : 11;
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  const refMonthKey = referenceDateIso.slice(0, 7);
  const refDay = Number(referenceDateIso.slice(8, 10)) || 11;

  let periodStatus: 'current' | 'past' | 'future' = 'current';
  let elapsedDays = Math.min(totalDaysInMonth, Math.max(1, refDay));
  let remainingDays = Math.max(1, totalDaysInMonth - elapsedDays);

  if (monthKey < refMonthKey) {
    periodStatus = 'past';
    elapsedDays = totalDaysInMonth;
    remainingDays = 0;
  } else if (monthKey > refMonthKey) {
    periodStatus = 'future';
    elapsedDays = 0;
    remainingDays = totalDaysInMonth;
  }

  // Use projectedNetSurplusCents (which accounts for pending bills/income) as the safe baseline
  const baselineSurplusCents = summary.projectedNetSurplusCents;
  const availableMarginCents = baselineSurplusCents - effectiveTargetCents;
  const activeDaysDivider = remainingDays > 0 ? remainingDays : totalDaysInMonth;

  const safeDailySpendCents =
    availableMarginCents >= 0 ? Math.floor(availableMarginCents / activeDaysDivider) : 0;
  const dailyRecoveryNeededCents =
    availableMarginCents < 0
      ? Math.ceil(Math.abs(availableMarginCents) / activeDaysDivider)
      : 0;

  // Run-rate Mensal (Previsão de Fechamento)
  // Average daily variable spending so far + all fixed expenses (realized + pending)
  const totalVariableSoFar =
    summary.variableExpenseCents + summary.pendingVariableExpenseCents;
  const totalFixedForMonth =
    summary.fixedExpenseCents + summary.pendingFixedExpenseCents;

  let dailyVariableBurnRateCents = 0;
  let projectedTotalVariableCents = totalVariableSoFar;

  if (periodStatus === 'current') {
    dailyVariableBurnRateCents = Math.round(totalVariableSoFar / Math.max(1, elapsedDays));
    projectedTotalVariableCents = Math.round(
      (totalVariableSoFar / Math.max(1, elapsedDays)) * totalDaysInMonth
    );
  } else if (periodStatus === 'past') {
    dailyVariableBurnRateCents = Math.round(totalVariableSoFar / totalDaysInMonth);
    projectedTotalVariableCents = totalVariableSoFar;
  } else {
    dailyVariableBurnRateCents = Math.round(totalVariableSoFar / totalDaysInMonth);
    projectedTotalVariableCents = totalVariableSoFar;
  }

  const projectedClosingSurplusCents =
    summary.projectedIncomeCents - (totalFixedForMonth + projectedTotalVariableCents);
  const projectedVsTargetDiffCents = projectedClosingSurplusCents - effectiveTargetCents;
  const isProjectedAboveTarget = projectedClosingSurplusCents >= effectiveTargetCents;

  const isAboveOrAtTarget = availableMarginCents >= 0;

  return {
    monthKey,
    periodStatus,
    monthStatus: periodStatus,
    totalDaysInMonth,
    daysInMonth: totalDaysInMonth,
    elapsedDays,
    remainingDays,
    targetSurplusCents: effectiveTargetCents,
    currentRealSurplusCents: summary.netSurplusCents,
    projectedWithPendingSurplusCents: summary.projectedNetSurplusCents,
    availableMarginCents,
    isAboveOrAtTarget,
    safeDailySpendCents,
    dailyRecoveryNeededCents,
    dailyVariableBurnRateCents,
    averageDailyVariableExpenseCents: dailyVariableBurnRateCents,
    projectedTotalVariableCents,
    projectedVariableExpenseCents: projectedTotalVariableCents,
    projectedClosingSurplusCents,
    estimatedClosingSurplusCents: projectedClosingSurplusCents,
    projectedVsTargetDiffCents,
    forecastVsTargetDiffCents: projectedVsTargetDiffCents,
    isProjectedAboveTarget,
    isForecastAboveTarget: isProjectedAboveTarget,
  };
}

export interface CustomFilterCriteria {
  periodMode: 'month' | 'range' | 'all';
  monthKey: string; // e.g. '2026-11' or 'all'
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  direction: 'all' | 'income' | 'expense';
  nature: 'all' | ExpenseNature;
  categoryId: 'all' | string;
  minAmountCents?: number;
  maxAmountCents?: number;
  searchQuery?: string;
}

export const DEFAULT_FILTER_CRITERIA: CustomFilterCriteria = {
  periodMode: 'month',
  monthKey: '2026-11',
  startDate: '',
  endDate: '',
  direction: 'all',
  nature: 'all',
  categoryId: 'all',
  minAmountCents: undefined,
  maxAmountCents: undefined,
  searchQuery: '',
};

/**
 * Normalizes text for accent-insensitive real-time search (e.g. "salario" matches "Salário").
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filters transactions across the entire loaded dataset by description, category, or notes in real time.
 */
export function searchTransactionsAcrossDataset(
  transactions: FinancialTransaction[],
  rawQuery: string
): FinancialTransaction[] {
  const q = normalizeSearchText(rawQuery);
  if (!q) return transactions;
  return transactions.filter((t) => {
    const descMatch = normalizeSearchText(t.description).includes(q);
    const catMatch = normalizeSearchText(t.categoryName).includes(q);
    const notesMatch = t.notes ? normalizeSearchText(t.notes).includes(q) : false;
    return descMatch || catMatch || notesMatch;
  });
}

/**
 * Filters transactions based on standard months or custom period, direction, nature, category, value range, and search.
 * When `searchQuery` is provided, it searches across the entire loaded dataset (all months) unless a custom date range is explicitly set.
 */
export function filterTransactionsByCriteria(
  transactions: FinancialTransaction[],
  criteria: CustomFilterCriteria
): FinancialTransaction[] {
  const normalizedQuery = criteria.searchQuery ? normalizeSearchText(criteria.searchQuery) : '';
  const hasSearchQuery = normalizedQuery.length > 0;

  return transactions.filter((t) => {
    if (!hasSearchQuery) {
      if (criteria.periodMode === 'month') {
        if (criteria.monthKey !== 'all' && t.monthKey !== criteria.monthKey) {
          return false;
        }
      } else if (criteria.periodMode === 'range') {
        if (criteria.startDate && t.dateIso < criteria.startDate) {
          return false;
        }
        if (criteria.endDate && t.dateIso > criteria.endDate) {
          return false;
        }
      }
    } else if (criteria.periodMode === 'range') {
      if (criteria.startDate && t.dateIso < criteria.startDate) {
        return false;
      }
      if (criteria.endDate && t.dateIso > criteria.endDate) {
        return false;
      }
    }

    if (criteria.direction !== 'all' && t.type !== criteria.direction) {
      return false;
    }

    if (criteria.nature !== 'all' && t.expenseNature !== criteria.nature) {
      return false;
    }

    if (criteria.categoryId !== 'all' && t.categoryId !== criteria.categoryId) {
      return false;
    }

    if (criteria.minAmountCents !== undefined && criteria.minAmountCents > 0) {
      if (t.amountCents < criteria.minAmountCents) return false;
    }

    if (criteria.maxAmountCents !== undefined && criteria.maxAmountCents > 0) {
      if (t.amountCents > criteria.maxAmountCents) return false;
    }

    if (hasSearchQuery) {
      const match =
        normalizeSearchText(t.description).includes(normalizedQuery) ||
        normalizeSearchText(t.categoryName).includes(normalizedQuery) ||
        (t.notes && normalizeSearchText(t.notes).includes(normalizedQuery));
      if (!match) return false;
    }

    return true;
  });
}

/**
 * Computes financial summary on any filtered array of transactions.
 */
export function calculateDynamicSummary(
  filteredTxs: FinancialTransaction[],
  periodLabel: string,
  plan?: MonthlySurplusPlan
): MonthlyFinancialSummary {
  return buildSummaryFromList(filteredTxs, periodLabel, plan);
}

/**
 * Computes category breakdown on any pre-filtered array of transactions.
 */
export function calculateDynamicCategoryBreakdown(
  filteredTxs: FinancialTransaction[],
  categories: FinancialCategory[],
  filterType: TransactionType = 'expense'
): CategoryBreakdownItem[] {
  const matchingTxs = filteredTxs.filter(
    (t) => t.type === filterType && t.expenseNature !== 'surplus_allocation'
  );

  const totalTypeCents = matchingTxs.reduce((acc, t) => acc + t.amountCents, 0);
  const byCat = new Map<
    string,
    {
      categoryName: string;
      nature: ExpenseNature;
      spentCents: number;
      count: number;
    }
  >();

  for (const tx of matchingTxs) {
    const existing = byCat.get(tx.categoryId);
    if (existing) {
      existing.spentCents += tx.amountCents;
      existing.count += 1;
    } else {
      byCat.set(tx.categoryId, {
        categoryName: tx.categoryName,
        nature: tx.expenseNature,
        spentCents: tx.amountCents,
        count: 1,
      });
    }
  }

  for (const cat of categories) {
    if (
      cat.type === filterType &&
      cat.nature !== 'surplus_allocation' &&
      !byCat.has(cat.id) &&
      cat.monthlyLimitCents > 0
    ) {
      byCat.set(cat.id, {
        categoryName: cat.name,
        nature: cat.nature,
        spentCents: 0,
        count: 0,
      });
    }
  }

  const breakdown: CategoryBreakdownItem[] = [];
  for (const [catId, data] of byCat.entries()) {
    const catDef = categories.find((c) => c.id === catId);
    const limitCents = catDef?.monthlyLimitCents ?? 0;
    const shareOfTotalPercent =
      totalTypeCents > 0 ? Math.round((data.spentCents / totalTypeCents) * 1000) / 10 : 0;
    const limitUsedPercent =
      limitCents > 0 ? Math.round((data.spentCents / limitCents) * 100) : 0;

    breakdown.push({
      categoryId: catId,
      categoryName: data.categoryName,
      nature: data.nature,
      type: filterType,
      spentCents: data.spentCents,
      monthlyLimitCents: limitCents,
      shareOfTypePercent: shareOfTotalPercent,
      limitUsagePercent: limitUsedPercent,
      isOverLimit: limitCents > 0 && data.spentCents > limitCents,
      transactionCount: data.count,
    });
  }

  return breakdown.sort((a, b) => b.spentCents - a.spentCents);
}

/**
 * Computes category-level spending vs monthly limit breakdown for a given month.
 */
export function calculateCategoryBreakdown(
  transactions: FinancialTransaction[],
  categories: FinancialCategory[],
  monthKey: string,
  filterType: TransactionType = 'expense'
): CategoryBreakdownItem[] {
  const monthTxs = transactions.filter(
    (t) =>
      t.monthKey === monthKey &&
      t.type === filterType &&
      t.expenseNature !== 'surplus_allocation'
  );

  const totalTypeCents = monthTxs.reduce((acc, t) => acc + t.amountCents, 0);
  const byCat = new Map<
    string,
    {
      categoryName: string;
      nature: ExpenseNature;
      spentCents: number;
      count: number;
    }
  >();

  for (const tx of monthTxs) {
    const existing = byCat.get(tx.categoryId);
    if (existing) {
      existing.spentCents += tx.amountCents;
      existing.count += 1;
    } else {
      byCat.set(tx.categoryId, {
        categoryName: tx.categoryName,
        nature: tx.expenseNature,
        spentCents: tx.amountCents,
        count: 1,
      });
    }
  }

  for (const cat of categories) {
    if (
      cat.type === filterType &&
      cat.nature !== 'surplus_allocation' &&
      !byCat.has(cat.id) &&
      cat.monthlyLimitCents > 0
    ) {
      byCat.set(cat.id, {
        categoryName: cat.name,
        nature: cat.nature,
        spentCents: 0,
        count: 0,
      });
    }
  }

  const results: CategoryBreakdownItem[] = [];
  for (const [categoryId, stats] of byCat.entries()) {
    const catDef = categories.find((c) => c.id === categoryId);
    const monthlyLimitCents = catDef?.monthlyLimitCents ?? 0;
    const shareOfTypePercent =
      totalTypeCents > 0 ? Math.round((stats.spentCents / totalTypeCents) * 1000) / 10 : 0;
    const limitUsagePercent =
      monthlyLimitCents > 0 ? Math.round((stats.spentCents / monthlyLimitCents) * 100) : 0;

    results.push({
      categoryId,
      categoryName: catDef?.name ?? stats.categoryName,
      nature: catDef?.nature ?? stats.nature,
      type: filterType,
      spentCents: stats.spentCents,
      monthlyLimitCents,
      shareOfTypePercent,
      limitUsagePercent,
      isOverLimit: monthlyLimitCents > 0 && stats.spentCents > monthlyLimitCents,
      transactionCount: stats.count,
    });
  }

  return results.sort((a, b) => b.spentCents - a.spentCents);
}

/**
 * Simulates how the monthly surplus ("Sobra Líquida") is distributed across Emergency, Investments, and Goals,
 * and projects 12-month compound accumulation.
 */
export function simulateSurplusAllocation(
  netSurplusCents: number,
  emergencySharePercent: number,
  investmentsSharePercent: number,
  goalsSharePercent: number
): SurplusAllocationSimulation {
  const availableSurplusCents = Math.max(0, netSurplusCents);
  const emergencyCents = Math.round((availableSurplusCents * emergencySharePercent) / 100);
  const investmentsCents = Math.round((availableSurplusCents * investmentsSharePercent) / 100);
  const goalsCents = Math.max(0, availableSurplusCents - emergencyCents - investmentsCents);

  const monthlyRate = 0.0085;
  let accumulated = 0;
  for (let m = 0; m < 12; m++) {
    accumulated = (accumulated + availableSurplusCents) * (1 + monthlyRate);
  }

  return {
    availableSurplusCents,
    emergencyCents,
    investmentsCents,
    goalsCents,
    projected12MonthsCents: Math.round(accumulated),
  };
}

export interface IncomeVsExpenseComparison {
  totalIncomeCents: number;
  recurringIncomeCents: number;
  extraIncomeCents: number;
  incomeCount: number;
  avgIncomeCents: number;
  largestIncome: { description: string; amountCents: number } | null;
  totalExpenseCents: number;
  fixedExpenseCents: number;
  variableExpenseCents: number;
  surplusAllocatedCents: number;
  expenseCount: number;
  avgExpenseCents: number;
  largestExpense: { description: string; amountCents: number } | null;
  netBalanceCents: number;
  expenseToIncomeRatioPercent: number;
  retentionRatePercent: number;
  incomeShareBarPercent: number;
  expenseShareBarPercent: number;
  pendingIncomeCents: number;
  pendingExpenseCents: number;
  pendingCount: number;
}

/**
 * Computes a comprehensive side-by-side comparison between Entradas (Income) and Saídas (Expenses)
 * for any transaction list.
 */
export function calculateIncomeVsExpenseComparison(
  transactions: FinancialTransaction[]
): IncomeVsExpenseComparison {
  let totalIncomeCents = 0;
  let recurringIncomeCents = 0;
  let extraIncomeCents = 0;
  let incomeCount = 0;
  let largestIncome: { description: string; amountCents: number } | null = null;

  let totalExpenseCents = 0;
  let fixedExpenseCents = 0;
  let variableExpenseCents = 0;
  let surplusAllocatedCents = 0;
  let expenseCount = 0;
  let largestExpense: { description: string; amountCents: number } | null = null;

  let pendingIncomeCents = 0;
  let pendingExpenseCents = 0;
  let pendingCount = 0;

  for (const tx of transactions) {
    if (getTransactionStatus(tx) === 'pending') {
      pendingCount += 1;
      if (tx.type === 'income') {
        pendingIncomeCents += tx.amountCents;
      } else if (tx.expenseNature !== 'surplus_allocation') {
        pendingExpenseCents += tx.amountCents;
      }
    }

    if (tx.type === 'income') {
      totalIncomeCents += tx.amountCents;
      incomeCount += 1;
      if (tx.expenseNature === 'income_recurring') {
        recurringIncomeCents += tx.amountCents;
      } else {
        extraIncomeCents += tx.amountCents;
      }
      if (!largestIncome || tx.amountCents > largestIncome.amountCents) {
        largestIncome = { description: tx.description, amountCents: tx.amountCents };
      }
    } else {
      if (tx.expenseNature === 'surplus_allocation') {
        surplusAllocatedCents += tx.amountCents;
      } else {
        totalExpenseCents += tx.amountCents;
        expenseCount += 1;
        if (tx.expenseNature === 'fixed') {
          fixedExpenseCents += tx.amountCents;
        } else {
          variableExpenseCents += tx.amountCents;
        }
        if (!largestExpense || tx.amountCents > largestExpense.amountCents) {
          largestExpense = { description: tx.description, amountCents: tx.amountCents };
        }
      }
    }
  }

  const avgIncomeCents = incomeCount > 0 ? Math.round(totalIncomeCents / incomeCount) : 0;
  const avgExpenseCents = expenseCount > 0 ? Math.round(totalExpenseCents / expenseCount) : 0;
  const netBalanceCents = totalIncomeCents - totalExpenseCents;

  const expenseToIncomeRatioPercent =
    totalIncomeCents > 0
      ? Math.round((totalExpenseCents / totalIncomeCents) * 1000) / 10
      : totalExpenseCents > 0
      ? 100
      : 0;

  const retentionRatePercent =
    totalIncomeCents > 0
      ? Math.round((netBalanceCents / totalIncomeCents) * 1000) / 10
      : 0;

  const totalVolume = totalIncomeCents + totalExpenseCents;
  const incomeShareBarPercent =
    totalVolume > 0 ? Math.round((totalIncomeCents / totalVolume) * 100) : 50;
  const expenseShareBarPercent = totalVolume > 0 ? 100 - incomeShareBarPercent : 50;

  return {
    totalIncomeCents,
    recurringIncomeCents,
    extraIncomeCents,
    incomeCount,
    avgIncomeCents,
    largestIncome,
    totalExpenseCents,
    fixedExpenseCents,
    variableExpenseCents,
    surplusAllocatedCents,
    expenseCount,
    avgExpenseCents,
    largestExpense,
    netBalanceCents,
    expenseToIncomeRatioPercent,
    retentionRatePercent,
    incomeShareBarPercent,
    expenseShareBarPercent,
    pendingIncomeCents,
    pendingExpenseCents,
    pendingCount,
  };
}

export interface PersonalizedSavingsTip {
  id: string;
  type: 'alert' | 'warning' | 'opportunity' | 'success';
  title: string;
  categoryName?: string;
  message: string;
  impactCents?: number;
  highlightText: string;
  actionHint?: string;
}

export function getPreviousMonthKey(monthKey: string): string {
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month)) return monthKey;
  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Uses real transaction context and category spending behavior to generate
 * 3 highly tailored, actionable personalized savings recommendations.
 */
export function generatePersonalizedSavingsTips(
  transactions: FinancialTransaction[],
  categories: FinancialCategory[],
  activeMonth: string,
  summary: MonthlyFinancialSummary,
  targetSurplusCents?: number
): PersonalizedSavingsTip[] {
  const effectiveTarget =
    targetSurplusCents !== undefined && targetSurplusCents > 0
      ? targetSurplusCents
      : summary.targetSurplusCents;

  const currentTxs = transactions.filter(
    (t) =>
      t.monthKey === activeMonth &&
      t.type === 'expense' &&
      t.expenseNature !== 'surplus_allocation'
  );

  const prevMonthKey = getPreviousMonthKey(activeMonth);
  const prevTxs = transactions.filter(
    (t) =>
      t.monthKey === prevMonthKey &&
      t.type === 'expense' &&
      t.expenseNature !== 'surplus_allocation'
  );

  const currentCatSpend = new Map<string, number>();
  for (const t of currentTxs) {
    currentCatSpend.set(t.categoryId, (currentCatSpend.get(t.categoryId) || 0) + t.amountCents);
  }

  const prevCatSpend = new Map<string, number>();
  for (const t of prevTxs) {
    prevCatSpend.set(t.categoryId, (prevCatSpend.get(t.categoryId) || 0) + t.amountCents);
  }

  interface CandidateTip extends PersonalizedSavingsTip {
    priority: number;
  }

  const candidates: CandidateTip[] = [];

  // 1. Month-over-Month Increases in categories
  let maxDiffCents = 0;
  let maxDiffCat: {
    category: FinancialCategory;
    diff: number;
    current: number;
    prev: number;
  } | null = null;
  const increases: Array<{
    category: FinancialCategory;
    diff: number;
    current: number;
    prev: number;
  }> = [];

  for (const cat of categories) {
    if (cat.type !== 'expense') continue;
    const current = currentCatSpend.get(cat.id) || 0;
    const prev = prevCatSpend.get(cat.id) || 0;
    const diff = current - prev;
    if (diff > 3000 && current > 0) {
      increases.push({ category: cat, diff, current, prev });
      if (diff > maxDiffCents) {
        maxDiffCents = diff;
        maxDiffCat = { category: cat, diff, current, prev };
      }
    }
  }

  increases.sort((a, b) => b.diff - a.diff);

  if (maxDiffCat) {
    candidates.push({
      id: `mom-increase-${maxDiffCat.category.id}`,
      type: 'warning',
      title: `Aumento em ${maxDiffCat.category.name}`,
      categoryName: maxDiffCat.category.name,
      message: `Você gastou ${formatBrlCents(maxDiffCat.diff)} a mais em ${maxDiffCat.category.name} este mês (${formatBrlCents(maxDiffCat.current)} vs ${formatBrlCents(maxDiffCat.prev)} no mês anterior). Considere conter saídas nessa área ou ajustar sua meta para preservar a sobra.`,
      impactCents: maxDiffCat.diff,
      highlightText: `+${formatBrlCents(maxDiffCat.diff)} vs mês anterior`,
      actionHint: 'Ajustar meta ou conter gastos',
      priority: 95 + Math.min(10, maxDiffCat.diff / 50000),
    });
  }

  // 2. Over-Limit Categories
  const overLimits: Array<{
    category: FinancialCategory;
    spent: number;
    limit: number;
    excess: number;
  }> = [];
  for (const cat of categories) {
    if (cat.type !== 'expense' || cat.monthlyLimitCents <= 0) continue;
    const spent = currentCatSpend.get(cat.id) || 0;
    if (spent > cat.monthlyLimitCents) {
      overLimits.push({
        category: cat,
        spent,
        limit: cat.monthlyLimitCents,
        excess: spent - cat.monthlyLimitCents,
      });
    }
  }
  overLimits.sort((a, b) => b.excess - a.excess);

  if (overLimits.length > 0) {
    const topOver = overLimits[0];
    candidates.push({
      id: `overlimit-${topOver.category.id}`,
      type: 'alert',
      title: `Teto excedido em ${topOver.category.name}`,
      categoryName: topOver.category.name,
      message: `Você ultrapassou o teto de ${formatBrlCents(topOver.limit)} em ${topOver.category.name} em ${formatBrlCents(topOver.excess)} (${Math.round((topOver.spent / topOver.limit) * 100)}% do limite). Reduzir as próximas saídas nessa categoria protege imediatamente suas sobras.`,
      impactCents: topOver.excess,
      highlightText: `${formatBrlCents(topOver.excess)} acima do teto`,
      actionHint: 'Rever teto na Auditoria',
      priority: 92 + Math.min(10, topOver.excess / 50000),
    });
  }

  if (increases.length > 1) {
    const secondIncrease = increases[1];
    if (
      (!maxDiffCat || secondIncrease.category.id !== maxDiffCat.category.id) &&
      (!overLimits.length || secondIncrease.category.id !== overLimits[0].category.id)
    ) {
      candidates.push({
        id: `mom-increase-2-${secondIncrease.category.id}`,
        type: 'warning',
        title: `Variação em ${secondIncrease.category.name}`,
        categoryName: secondIncrease.category.name,
        message: `Os desembolsos com ${secondIncrease.category.name} subiram ${formatBrlCents(secondIncrease.diff)} neste mês. Estabelecer um teto semanal pode evitar surpresas no fechamento das contas.`,
        impactCents: secondIncrease.diff,
        highlightText: `+${formatBrlCents(secondIncrease.diff)} neste mês`,
        actionHint: 'Definir teto semanal',
        priority: 75,
      });
    }
  }

  // 3. Target Gap / Sobras reais vs Meta
  const netSurplus = summary.netSurplusCents;
  if (netSurplus < 0) {
    candidates.push({
      id: 'deficit-recovery-tip',
      type: 'alert',
      title: 'Ajuste emergencial do mês',
      message: `Suas despesas superaram as entradas em ${formatBrlCents(Math.abs(netSurplus))}. Priorize cobrir custos essenciais fixos e congele temporariamente gastos de estilo de vida para não comprometer sua reserva.`,
      impactCents: Math.abs(netSurplus) + effectiveTarget,
      highlightText: `Déficit de ${formatBrlCents(Math.abs(netSurplus))}`,
      actionHint: 'Congelar despesas variáveis',
      priority: 100,
    });
  } else if (effectiveTarget > 0 && netSurplus < effectiveTarget) {
    const gap = effectiveTarget - netSurplus;
    candidates.push({
      id: 'target-gap-tip',
      type: 'opportunity',
      title: 'Foco na Meta de Economia',
      message: `Faltam ${formatBrlCents(gap)} em sobras líquidas para bater a meta mensal de ${formatBrlCents(effectiveTarget)}. Economizar pequenos valores no estilo de vida diário é o caminho mais rápido para atingir 100% da meta.`,
      impactCents: gap,
      highlightText: `Faltam ${formatBrlCents(gap)} para a meta`,
      actionHint: 'Pequenas economias diárias',
      priority: 85,
    });
  } else if (effectiveTarget > 0 && netSurplus >= effectiveTarget) {
    const surplusExcess = netSurplus - effectiveTarget;
    candidates.push({
      id: 'surplus-optimization-tip',
      type: 'success',
      title: 'Potencialize suas Sobras Batidas',
      message: `Você alcançou sua meta e possui ${formatBrlCents(netSurplus)} em sobras reais (+${formatBrlCents(surplusExcess)} além da meta). Efetive o aporte nas caixinhas de Reserva e Investimentos para proteger seu dinheiro da inflação.`,
      impactCents: surplusExcess > 0 ? surplusExcess : netSurplus,
      highlightText: `Meta atingida (${formatBrlCents(netSurplus)})`,
      actionHint: 'Efetivar aporte nas caixinhas',
      priority: 80,
    });
  }

  // 4. Variable Lifestyle Spending Ratio
  if (summary.variableCommitmentPercent > 28 && summary.totalIncomeCents > 0) {
    candidates.push({
      id: 'variable-commitment-tip',
      type: 'warning',
      title: 'Atenção aos Gastos com Estilo de Vida',
      message: `Seus gastos variáveis somam ${formatBrlCents(summary.variableExpenseCents)} (${summary.variableCommitmentPercent}% da sua renda). Na regra de ouro 50-30-20, manter o estilo de vida em até 30% da renda é o segredo para ter sobras consistentes todo mês.`,
      impactCents: Math.max(
        0,
        summary.variableExpenseCents - Math.round(summary.totalIncomeCents * 0.3)
      ),
      highlightText: `${summary.variableCommitmentPercent}% da renda em estilo de vida`,
      actionHint: 'Meta: manter em até 30%',
      priority: 70,
    });
  }

  // 5. Small Frequent Transactions
  const smallTxs = currentTxs.filter(
    (t) =>
      t.amountCents <= 7500 &&
      (t.expenseNature === 'variable' || t.categoryId === 'cat_dining')
  );
  if (smallTxs.length >= 3) {
    const smallTotal = smallTxs.reduce((sum, t) => sum + t.amountCents, 0);
    candidates.push({
      id: 'micro-expenses-tip',
      type: 'opportunity',
      title: 'Atenção às Micro-despesas',
      message: `Você realizou ${smallTxs.length} pequenas compras de até R$ 75,00 que somam ${formatBrlCents(smallTotal)} no mês. Pequenos cafezinhos, entregas e corridas são gastos silenciosos que somados fazem grande diferença na sua sobra final.`,
      impactCents: Math.round(smallTotal * 0.4),
      highlightText: `${smallTxs.length} micro-gastos = ${formatBrlCents(smallTotal)}`,
      actionHint: 'Economia estimada de até 40%',
      priority: 65,
    });
  }

  // 6. Fallback smart tips
  if (candidates.length < 3) {
    candidates.push({
      id: 'emergency-fund-tip',
      type: 'opportunity',
      title: 'Fortaleça sua Reserva de Emergência',
      message:
        'Mantenha pelo menos 6 meses do seu custo de vida fixo em aplicações de liquidez diária (100% CDI ou Tesouro Selic) para ter tranquilidade financeira contra imprevistos.',
      highlightText: 'Segurança financeira 100% CDI',
      actionHint: 'Alocar sobras na Reserva',
      priority: 50,
    });
  }

  if (candidates.length < 3) {
    candidates.push({
      id: 'recurring-review-tip',
      type: 'opportunity',
      title: 'Auditoria de Assinaturas e Recorrências',
      message:
        'Revise assinaturas de streaming, clubes de vantagens e serviços que você usa pouco. Cancelar apenas um serviço esquecido pode gerar economia acumulada de mais de R$ 500 no ano.',
      highlightText: 'Economia anual de R$ 300 a R$ 600',
      actionHint: 'Revisar cartões e cobranças',
      priority: 45,
    });
  }

  if (candidates.length < 3) {
    candidates.push({
      id: 'first-hour-rule-tip',
      type: 'opportunity',
      title: 'Pague-se Primeiro',
      message:
        'Assim que suas receitas entrarem no início do mês, separe imediatamente a meta de sobras antes de começar a gastar com o estilo de vida.',
      highlightText: 'Hábito dos investidores',
      actionHint: 'Poupar antes de gastar',
      priority: 40,
    });
  }

  const topTips = candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map(({ priority: _p, ...rest }) => rest);

  return topTips;
}
