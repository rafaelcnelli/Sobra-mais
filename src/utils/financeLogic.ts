export type TransactionType = 'income' | 'expense';

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
  totalIncomeCents: number;
  totalExpenseCents: number;
  fixedExpenseCents: number;
  variableExpenseCents: number;
  surplusAssignedCents: number;
  netSurplusCents: number; // Total Income - Total Expenses
  freeUnallocatedSurplusCents: number; // Net Surplus - Surplus Assigned
  surplusRatePercent: number; // (netSurplusCents / totalIncomeCents) * 100
  fixedCommitmentPercent: number; // (fixedExpenseCents / totalIncomeCents) * 100
  variableCommitmentPercent: number; // (variableExpenseCents / totalIncomeCents) * 100
  targetSurplusCents: number;
  targetProgressPercent: number;
  status: 'surplus_healthy' | 'surplus_tight' | 'deficit';
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
 * Formats integer cents into BRL currency string (e.g., 125050 -> "R$ 1.250,50")
 */
export function formatBrlCents(cents: number, showSign = false): string {
  const isNegative = cents < 0;
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
 * Parses user currency input (e.g., "1.250,50" or "1250.50" or "450") into integer cents.
 */
export function parseInputToCents(raw: string): number {
  const cleaned = raw.trim().replace(/[R$\s]/g, '');
  if (!cleaned) return 0;

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // e.g. "1.250,50" -> "1250.50"
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // e.g. "450,90" -> "450.90"
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
 * Computes full monthly summary including Net Surplus (Sobras), Fixed vs Variable ratio, and Target progress.
 */
export function calculateMonthlySummary(
  transactions: FinancialTransaction[],
  monthKey: string,
  plan?: MonthlySurplusPlan
): MonthlyFinancialSummary {
  const monthTxs = transactions.filter((t) => t.monthKey === monthKey);

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;
  let fixedExpenseCents = 0;
  let variableExpenseCents = 0;
  let surplusAssignedCents = 0;

  for (const tx of monthTxs) {
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
    monthKey,
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
    // 1. Period filter: when searching in real time, search across all loaded months unless an explicit date range was set
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

    // 2. Direction filter
    if (criteria.direction !== 'all' && t.type !== criteria.direction) {
      return false;
    }

    // 3. Nature filter
    if (criteria.nature !== 'all' && t.expenseNature !== criteria.nature) {
      return false;
    }

    // 4. Category filter
    if (criteria.categoryId !== 'all' && t.categoryId !== criteria.categoryId) {
      return false;
    }

    // 5. Min amount filter
    if (criteria.minAmountCents !== undefined && criteria.minAmountCents > 0) {
      if (t.amountCents < criteria.minAmountCents) return false;
    }

    // 6. Max amount filter
    if (criteria.maxAmountCents !== undefined && criteria.maxAmountCents > 0) {
      if (t.amountCents > criteria.maxAmountCents) return false;
    }

    // 7. Real-time search query filter (accent-insensitive across description, category, and notes)
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
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;
  let fixedExpenseCents = 0;
  let variableExpenseCents = 0;
  let surplusAssignedCents = 0;

  for (const tx of filteredTxs) {
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
    monthKey: periodLabel,
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
  };
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
    (t) => t.monthKey === monthKey && t.type === filterType && t.expenseNature !== 'surplus_allocation'
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

  // Also include categories with a monthly limit even if 0 spent this month
  for (const cat of categories) {
    if (cat.type === filterType && cat.nature !== 'surplus_allocation' && !byCat.has(cat.id) && cat.monthlyLimitCents > 0) {
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

  // 12-month projection with 0.85% monthly yield on total monthly savings
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

  for (const tx of transactions) {
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
  };
}

