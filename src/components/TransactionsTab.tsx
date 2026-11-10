import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Download,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
} from 'lucide-react';
import {
  formatBrlCents,
  calculateIncomeVsExpenseComparison,
  type FinancialTransaction,
  type FinancialCategory,
} from '../utils/financeLogic';
import { AVAILABLE_MONTHS, NATURE_LABELS } from '../utils/seedData';

interface TransactionsTabProps {
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  activeMonth: string;
  onOpenNewModal: (defaultType?: 'income' | 'expense') => void;
  onEditTransaction: (tx: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  filteredTransactions?: FinancialTransaction[];
  periodLabel?: string;
}

const PAGE_SIZE = 6;

export function TransactionsTab({
  transactions,
  categories,
  activeMonth,
  onOpenNewModal,
  onEditTransaction,
  onDeleteTransaction,
  filteredTransactions,
  periodLabel,
}: TransactionsTabProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [natureFilter, setNatureFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const baseTransactions = filteredTransactions ?? transactions.filter((t) => t.monthKey === activeMonth);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeMonth, baseTransactions, typeFilter, natureFilter, categoryFilter, searchQuery]);

  const comparison = useMemo(() => {
    return calculateIncomeVsExpenseComparison(baseTransactions);
  }, [baseTransactions]);

  const displayTransactions = useMemo(() => {
    return baseTransactions
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t) => (natureFilter === 'all' ? true : t.expenseNature === natureFilter))
      .filter((t) => (categoryFilter === 'all' ? true : t.categoryId === categoryFilter))
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(q) ||
          t.categoryName.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [baseTransactions, typeFilter, natureFilter, categoryFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(displayTransactions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = displayTransactions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of displayTransactions) {
      if (tx.type === 'income') income += tx.amountCents;
      else expense += tx.amountCents;
    }
    return { income, expense, net: income - expense };
  }, [displayTransactions]);

  const handleExportCsv = () => {
    const headers = ['Data', 'Direcao', 'Descricao', 'Categoria', 'Natureza', 'Valor_BRL', 'Observacoes'];
    const rows = displayTransactions.map((t) => [
      t.dateIso,
      t.type === 'income' ? 'Entrada' : 'Saida',
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.categoryName.replace(/"/g, '""')}"`,
      `"${NATURE_LABELS[t.expenseNature]}"`,
      (t.amountCents / 100).toFixed(2),
      `"${t.notes.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lancamentos_${activeMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const monthLabel = AVAILABLE_MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth;

  return (
    <div className="space-y-2.5">
      {/* 1. Painel Comparativo: Entradas vs. Saídas */}
      <section
        aria-label="Painel Comparativo de Entradas e Saídas"
        className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-3 space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-[#1E273C]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-[#1456FF] text-[#E2FF1A] flex items-center justify-center shrink-0">
              <Scale className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#0A0E17] dark:text-white truncate">
                Painel Comparativo: Entradas vs. Saídas ({periodLabel ?? monthLabel})
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-[#F4F6FB] dark:bg-[#181F32] rounded-full hover:bg-slate-200 dark:hover:bg-[#232D47] transition-colors whitespace-nowrap"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => onOpenNewModal('income')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold text-[#0A0E17] bg-[#E2FF1A] rounded-full hover:bg-[#d5f20d] transition-colors whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              Nova Entrada
            </button>
            <button
              type="button"
              onClick={() => onOpenNewModal('expense')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              Nova Saída
            </button>
          </div>
        </div>

        {/* 3-Column Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          {/* Col 1 (4 cols): Entradas (Receitas) */}
          <div
            onClick={() => setTypeFilter((prev) => (prev === 'income' ? 'all' : 'income'))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTypeFilter((prev) => (prev === 'income' ? 'all' : 'income'));
              }
            }}
            aria-label="Filtrar comparativo por Entradas"
            className={`lg:col-span-4 rounded-xl p-2.5 border transition-colors cursor-pointer flex flex-col justify-between ${
              typeFilter === 'income'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/60'
                : 'bg-[#F4F6FB] dark:bg-[#161D2F] border-slate-200/60 dark:border-[#242F48] hover:border-emerald-500/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#E2FF1A] text-[#0A0E17] flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-extrabold text-[#0A0E17] dark:text-white">
                  Entradas ({comparison.incomeCount})
                </span>
              </div>
              <span className="text-sm sm:text-base font-black font-mono tabular-nums text-emerald-600 dark:text-[#E2FF1A]">
                + {formatBrlCents(comparison.totalIncomeCents)}
              </span>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-[#242F48] grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Recorrente / Fixa</span>
                <strong className="font-mono tabular-nums text-[#0A0E17] dark:text-white">
                  {formatBrlCents(comparison.recurringIncomeCents)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 block">Renda Extra</span>
                <strong className="font-mono tabular-nums text-[#0A0E17] dark:text-white">
                  {formatBrlCents(comparison.extraIncomeCents)}
                </strong>
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span className="truncate">
                Média: <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatBrlCents(comparison.avgIncomeCents)}</strong>
              </span>
              {comparison.largestIncome && (
                <span className="truncate max-w-[160px]">
                  Maior: <strong className="text-slate-700 dark:text-slate-300">{comparison.largestIncome.description}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Col 2 (4 cols): Balanço Direto Entradas x Saídas */}
          <div className="lg:col-span-4 rounded-xl p-2.5 bg-[#1456FF] text-white flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-blue-100">
                Saldo Líquido (Entradas − Saídas)
              </span>
              <span className="text-[11px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-full bg-white/15 text-[#E2FF1A]">
                {comparison.retentionRatePercent >= 0
                  ? `${comparison.retentionRatePercent}% retido`
                  : 'Déficit'}
              </span>
            </div>

            <div className="my-1 flex items-baseline justify-between gap-2">
              <span className="text-base sm:text-lg font-black font-mono tabular-nums text-[#E2FF1A]">
                {formatBrlCents(comparison.netBalanceCents, true)}
              </span>
              <span className="text-[11px] text-blue-100 font-mono tabular-nums">
                Saídas = <strong>{comparison.expenseToIncomeRatioPercent}%</strong> da renda
              </span>
            </div>

            {/* Comparative Visual Bar: Entradas vs Saídas */}
            <div className="space-y-1">
              <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden flex">
                <div
                  className="h-full bg-[#E2FF1A] transition-all duration-200"
                  style={{ width: `${comparison.incomeShareBarPercent}%` }}
                  title={`Proporção Entradas: ${comparison.incomeShareBarPercent}%`}
                />
                <div
                  className="h-full bg-rose-400 transition-all duration-200"
                  style={{ width: `${comparison.expenseShareBarPercent}%` }}
                  title={`Proporção Saídas: ${comparison.expenseShareBarPercent}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-blue-100 font-mono tabular-nums">
                <span>Entradas ({comparison.incomeShareBarPercent}%)</span>
                <span>Saídas ({comparison.expenseShareBarPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Col 3 (4 cols): Saídas (Gastos) */}
          <div
            onClick={() => setTypeFilter((prev) => (prev === 'expense' ? 'all' : 'expense'))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTypeFilter((prev) => (prev === 'expense' ? 'all' : 'expense'));
              }
            }}
            aria-label="Filtrar comparativo por Saídas"
            className={`lg:col-span-4 rounded-xl p-2.5 border transition-colors cursor-pointer flex flex-col justify-between ${
              typeFilter === 'expense'
                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-[#1456FF]'
                : 'bg-[#F4F6FB] dark:bg-[#161D2F] border-slate-200/60 dark:border-[#242F48] hover:border-[#1456FF]/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#1456FF] text-white flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-extrabold text-[#0A0E17] dark:text-white">
                  Saídas ({comparison.expenseCount})
                </span>
              </div>
              <span className="text-sm sm:text-base font-black font-mono tabular-nums text-[#0A0E17] dark:text-white">
                - {formatBrlCents(comparison.totalExpenseCents)}
              </span>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-[#242F48] grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Gastos Fixos</span>
                <strong className="font-mono tabular-nums text-[#0A0E17] dark:text-white">
                  {formatBrlCents(comparison.fixedExpenseCents)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 block">Gastos Variáveis</span>
                <strong className="font-mono tabular-nums text-[#0A0E17] dark:text-white">
                  {formatBrlCents(comparison.variableExpenseCents)}
                </strong>
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span className="truncate">
                Média: <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatBrlCents(comparison.avgExpenseCents)}</strong>
              </span>
              {comparison.largestExpense && (
                <span className="truncate max-w-[160px]">
                  Maior: <strong className="text-slate-700 dark:text-slate-300">{comparison.largestExpense.description}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Compact Filter Bar + Paginated Transactions Table */}
      <section className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl flex flex-col overflow-hidden">
        {/* Inline Filter Controls */}
        <div className="p-2.5 border-b border-slate-200/80 dark:border-[#1E273C] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center">
          <div className="lg:col-span-4 flex items-center gap-1 p-0.5 bg-[#F4F6FB] dark:bg-[#080B12] rounded-full">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`flex-1 py-1 px-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                typeFilter === 'all'
                  ? 'bg-[#1456FF] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({baseTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('income')}
              className={`flex-1 py-1 px-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                typeFilter === 'income'
                  ? 'bg-[#E2FF1A] text-[#0A0E17]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Entradas ({comparison.incomeCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('expense')}
              className={`flex-1 py-1 px-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                typeFilter === 'expense'
                  ? 'bg-[#1456FF] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Saídas ({comparison.expenseCount})
            </button>
          </div>

          <div className="lg:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar descrição ou categoria..."
              aria-label="Buscar lançamentos"
              className="w-full pl-8 pr-3 py-1 text-xs bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-full text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF]"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filtrar por natureza"
              value={natureFilter}
              onChange={(e) => setNatureFilter(e.target.value)}
              className="w-full px-2.5 py-1 text-xs bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-full text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#1456FF]"
            >
              <option value="all">Todas naturezas</option>
              <option value="fixed">Gastos Fixos</option>
              <option value="variable">Gastos Variáveis</option>
              <option value="surplus_allocation">Alocações de Sobra</option>
              <option value="income_recurring">Entradas Fixas</option>
              <option value="income_extra">Entradas Extras</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filtrar por categoria"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1 text-xs bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-full text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#1456FF]"
            >
              <option value="all">Todas categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {displayTransactions.length === 0 ? (
          <div className="my-auto p-6 text-center">
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
              Nenhum lançamento corresponde aos filtros selecionados.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Limpe os filtros de busca ou adicione uma nova entrada/saída neste mês.
            </p>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all');
                setNatureFilter('all');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E273C] bg-[#F4F6FB]/70 dark:bg-[#0C101C] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Data</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Categoria</th>
                  <th className="py-2.5 px-3 hidden lg:table-cell">Classificação</th>
                  <th className="py-2.5 px-3 text-right">Valor (R$)</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-[#1E273C] text-xs">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F4F6FB]/60 dark:hover:bg-[#181F32]/60 transition-colors">
                    <td className="py-2 px-4 font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {tx.dateIso.split('-').reverse().join('/')}
                    </td>
                    <td className="py-2 px-3 max-w-[200px] sm:max-w-xs">
                      <div className="font-bold text-[#0A0E17] dark:text-white truncate">
                        {tx.description}
                      </div>
                      {tx.notes && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {tx.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap hidden md:table-cell">
                      {tx.categoryName}
                    </td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap hidden lg:table-cell">
                      <span>{tx.type === 'income' ? 'Entrada' : 'Saída'}</span>
                      <span className="mx-1 text-slate-300 dark:text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span>{NATURE_LABELS[tx.expenseNature]}</span>
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-[#E2FF1A]'
                          : 'text-[#0A0E17] dark:text-white'
                      }`}
                    >
                      {tx.type === 'income'
                        ? `+ ${formatBrlCents(tx.amountCents)}`
                        : `- ${formatBrlCents(tx.amountCents)}`}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          aria-label={`Editar ${tx.description}`}
                          className="p-1 text-slate-500 dark:text-slate-400 hover:text-[#1456FF] dark:hover:text-[#E2FF1A] rounded-full transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          aria-label={`Excluir ${tx.description}`}
                          className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer: Filtered Totals + Built-in Page Switcher */}
        <div className="shrink-0 px-4 py-2.5 bg-[#F4F6FB]/60 dark:bg-[#0C101C] border-t border-slate-200 dark:border-[#1E273C] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-slate-600 dark:text-slate-400">
            <span>
              Entradas:{' '}
              <strong className="text-emerald-600 dark:text-[#E2FF1A]">
                {formatBrlCents(filteredTotals.income)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Saídas:{' '}
              <strong className="text-[#0A0E17] dark:text-white">
                {formatBrlCents(filteredTotals.expense)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Saldo:{' '}
              <strong
                className={
                  filteredTotals.net >= 0
                    ? 'text-[#1456FF] dark:text-[#E2FF1A]'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {formatBrlCents(filteredTotals.net, true)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Pág. <strong className="text-[#0A0E17] dark:text-white">{safePage}</strong>/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] text-[#0A0E17] dark:text-white disabled:opacity-40 hover:border-[#1456FF] transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              Ant.
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] text-[#0A0E17] dark:text-white disabled:opacity-40 hover:border-[#1456FF] transition-colors"
            >
              Próx.
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
