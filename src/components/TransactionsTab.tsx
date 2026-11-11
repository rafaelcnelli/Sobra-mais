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
  X,
  CheckCircle2,
  Clock,
  Repeat,
} from 'lucide-react';
import {
  formatBrlCents,
  calculateIncomeVsExpenseComparison,
  getTransactionStatus,
  isTransactionRecurring,
  type FinancialTransaction,
  type FinancialCategory,
} from '../utils/financeLogic';
import { AVAILABLE_MONTHS, NATURE_LABELS } from '../utils/seedData';

interface TransactionsTabProps {
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  activeMonth: string;
  onOpenNewModal: (defaultType?: 'income' | 'expense', initialTab?: 'quick' | 'detailed') => void;
  onEditTransaction: (tx: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onToggleTransactionStatus?: (tx: FinancialTransaction) => Promise<void>;
  filteredTransactions?: FinancialTransaction[];
  periodLabel?: string;
  globalSearchQuery?: string;
  onChangeGlobalSearchQuery?: (query: string) => void;
  externalCategoryFilter?: string;
  onChangeExternalCategoryFilter?: (catId: string) => void;
  isPrivacyMode?: boolean;
}

const PAGE_SIZE = 7;

export function TransactionsTab({
  transactions,
  categories,
  activeMonth,
  onOpenNewModal,
  onEditTransaction,
  onDeleteTransaction,
  onToggleTransactionStatus,
  filteredTransactions,
  periodLabel,
  globalSearchQuery,
  onChangeGlobalSearchQuery,
  externalCategoryFilter,
  onChangeExternalCategoryFilter,
}: TransactionsTabProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [natureFilter, setNatureFilter] = useState<string>('all');
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string>('all');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categoryFilter =
    externalCategoryFilter !== undefined ? externalCategoryFilter : localCategoryFilter;

  const setCategoryFilter = (val: string) => {
    if (onChangeExternalCategoryFilter) {
      onChangeExternalCategoryFilter(val);
    } else {
      setLocalCategoryFilter(val);
    }
  };

  const searchQuery = globalSearchQuery !== undefined ? globalSearchQuery : localSearchQuery;
  const setSearchQuery = (val: string) => {
    if (onChangeGlobalSearchQuery) {
      onChangeGlobalSearchQuery(val);
    } else {
      setLocalSearchQuery(val);
    }
  };

  const baseTransactions =
    filteredTransactions ?? transactions.filter((t) => t.monthKey === activeMonth);

  const statusCounts = useMemo(() => {
    let completed = 0;
    let pending = 0;
    for (const tx of baseTransactions) {
      if (getTransactionStatus(tx) === 'pending') pending += 1;
      else completed += 1;
    }
    return { all: baseTransactions.length, completed, pending };
  }, [baseTransactions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeMonth, baseTransactions, typeFilter, statusFilter, natureFilter, categoryFilter, searchQuery]);

  const displayTransactions = useMemo(() => {
    return baseTransactions
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t) => (statusFilter === 'all' ? true : getTransactionStatus(t) === statusFilter))
      .filter((t) => (natureFilter === 'all' ? true : t.expenseNature === natureFilter))
      .filter((t) => (categoryFilter === 'all' ? true : t.categoryId === categoryFilter))
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
        const norm = (s: string) =>
          s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        return (
          norm(t.description).includes(q) ||
          norm(t.categoryName).includes(q) ||
          norm(t.notes).includes(q)
        );
      })
      .sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [baseTransactions, typeFilter, statusFilter, natureFilter, categoryFilter, searchQuery]);

  // Dynamic Summary updated according to active filters
  const comparison = useMemo(() => {
    return calculateIncomeVsExpenseComparison(displayTransactions);
  }, [displayTransactions]);

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
    const headers = [
      'Data',
      'Direcao',
      'Status',
      'Descricao',
      'Categoria',
      'Natureza',
      'Valor_BRL',
      'Observacoes',
    ];
    const rows = displayTransactions.map((t) => [
      t.dateIso,
      t.type === 'income' ? 'Entrada' : 'Saida',
      getTransactionStatus(t) === 'pending'
        ? 'Pendente'
        : t.type === 'income'
        ? 'Recebido'
        : 'Pago',
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
    link.setAttribute('download', `extrato_sobramais_${activeMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const monthLabel = AVAILABLE_MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth;
  const activeCatObj =
    categoryFilter !== 'all' ? categories.find((c) => c.id === categoryFilter) : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* =====================================================================
          1. CABEÇALHO DE CONTROLE: BARRA DE BUSCA EM TEMPO REAL + FILTROS RÁPIDOS + BOTÃO EXPORTAR CSV À DIREITA
      ===================================================================== */}
      <section
        aria-label="Cabeçalho de Controle e Filtros do Extrato"
        className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-200/70 dark:border-[#1E273C]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-[#1860FC] text-[#D4F907] flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold font-display text-[#000000] dark:text-white truncate">
                Extrato & Gestão de Transações ({periodLabel ?? monthLabel})
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Busca instantânea, controle de contas fixas (Pago/Pendente em 1-clique) e auditoria
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => onOpenNewModal('income', 'detailed')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-extrabold text-[#000000] bg-[#D4F907] rounded-full hover:bg-[#C0E206] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Nova Entrada
            </button>
            <button
              type="button"
              onClick={() => onOpenNewModal('expense', 'detailed')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Nova Saída
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold text-[#000000] dark:text-white bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-full hover:border-[#1860FC] dark:hover:border-[#D4F907] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#1860FC] dark:text-[#D4F907]" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Filtro Rápido de Status no Topo do Extrato: [ Todos | ✅ Efetivados | ⏳ Pendentes ] */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <div
            role="group"
            aria-label="Filtrar por status de efetivação"
            className="inline-flex items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200/80 dark:border-[#1E273C] rounded-full"
          >
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-extrabold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#1860FC] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({statusCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-extrabold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>✅ Efetivados ({statusCounts.completed})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-extrabold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-[#000000] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⏳ Pendentes ({statusCounts.pending})</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Dica: Clique no selo <strong>⏳ Pendente</strong> ou <strong>✅ Pago/Recebido</strong> na linha para alternar em 1-clique
          </span>
        </div>

        {/* Barra de Busca em Tempo Real + Filtros Rápidos (Tipo, Categoria, Natureza) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center">
          {/* Busca por Descrição */}
          <div className="lg:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por descrição, nota ou categoria..."
              aria-label="Buscar lançamentos em tempo real"
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-full text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1860FC]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Rápido Tipo: Todos / Entrada / Saída */}
          <div className="lg:col-span-4 flex items-center gap-1 p-0.5 bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200/70 dark:border-[#1E273C] rounded-full">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`flex-1 py-1 px-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-[#1860FC] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({baseTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('income')}
              className={`flex-1 py-1 px-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'income'
                  ? 'bg-[#D4F907] text-[#000000]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Entradas
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('expense')}
              className={`flex-1 py-1 px-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'expense'
                  ? 'bg-[#1860FC] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Saídas
            </button>
          </div>

          {/* Filtro por Categoria */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filtrar por categoria"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-full text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#1860FC]"
            >
              <option value="all">Todas categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Natureza */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filtrar por natureza"
              value={natureFilter}
              onChange={(e) => setNatureFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-full text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#1860FC]"
            >
              <option value="all">Todas naturezas</option>
              <option value="fixed">Gastos Fixos</option>
              <option value="variable">Gastos Variáveis</option>
              <option value="surplus_allocation">Alocações de Sobra</option>
              <option value="income_recurring">Entradas Fixas</option>
              <option value="income_extra">Entradas Extras</option>
            </select>
          </div>
        </div>

        {/* Active category pill if pre-filtered from Pie Chart */}
        {activeCatObj && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#1860FC]/10 dark:bg-[#1860FC]/20 border border-[#1860FC]/30 text-xs">
            <span className="font-bold text-[#1860FC] dark:text-[#D4F907]">
              Filtrando por categoria: <strong>{activeCatObj.name}</strong> ({displayTransactions.length}{' '}
              lançamento{displayTransactions.length === 1 ? '' : 's'})
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className="inline-flex items-center gap-1 font-extrabold text-[#1860FC] dark:text-[#D4F907] hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Mostrar todas
            </button>
          </div>
        )}
      </section>

      {/* =====================================================================
          2. RESUMO DINÂMICO: PAINEL COMPARATIVO DE ENTRADAS VS. SAÍDAS
             (Atualizado conforme os filtros ativos)
      ===================================================================== */}
      <section
        aria-label="Resumo Dinâmico Comparativo de Entradas e Saídas"
        className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl p-4 sm:p-5 shadow-xs"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          {/* Col 1 (4 cols): Entradas */}
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
            className={`lg:col-span-4 rounded-2xl p-4 border transition-colors cursor-pointer flex flex-col justify-between ${
              typeFilter === 'income'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-[#D4F907]'
                : 'bg-[#F8FAFC] dark:bg-[#181F32] border-slate-200/60 dark:border-[#1E273C] hover:border-[#D4F907]/70'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#D4F907] text-[#000000] flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-extrabold text-[#000000] dark:text-white">
                  Entradas ({comparison.incomeCount})
                </span>
              </div>
              <span className="text-sm sm:text-base font-black font-mono tabular-nums text-emerald-600 dark:text-[#D4F907]">
                + {formatBrlCents(comparison.totalIncomeCents)}
              </span>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-[#1E273C] grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Recorrente / Fixa</span>
                <strong className="font-mono tabular-nums text-[#000000] dark:text-white">
                  {formatBrlCents(comparison.recurringIncomeCents)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 block">Renda Extra</span>
                <strong className="font-mono tabular-nums text-[#000000] dark:text-white">
                  {formatBrlCents(comparison.extraIncomeCents)}
                </strong>
              </div>
            </div>
          </div>

          {/* Col 2 (4 cols): Balanço Direto Entradas x Saídas */}
          <div className="lg:col-span-4 rounded-2xl p-4 bg-gradient-to-r from-[#1860FC] to-[#0D48D9] text-white flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-blue-100">
                Resumo Dinâmico (Entradas − Saídas)
              </span>
              <span className="text-[11px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-full bg-white/15 text-[#D4F907]">
                {comparison.retentionRatePercent >= 0
                  ? `${comparison.retentionRatePercent}% retido`
                  : 'Déficit'}
              </span>
            </div>

            <div className="my-2 flex items-baseline justify-between gap-2">
              <span className="text-base sm:text-lg font-black font-mono tabular-nums text-[#D4F907]">
                {formatBrlCents(comparison.netBalanceCents, true)}
              </span>
              <span className="text-[11px] text-blue-100 font-mono tabular-nums">
                Saídas = <strong>{comparison.expenseToIncomeRatioPercent}%</strong> da renda
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden flex">
                <div
                  className="h-full bg-[#D4F907] transition-all duration-200"
                  style={{ width: `${comparison.incomeShareBarPercent}%` }}
                />
                <div
                  className="h-full bg-rose-400 transition-all duration-200"
                  style={{ width: `${comparison.expenseShareBarPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-blue-100 font-mono tabular-nums">
                <span>Entradas ({comparison.incomeShareBarPercent}%)</span>
                <span>Saídas ({comparison.expenseShareBarPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Col 3 (4 cols): Saídas */}
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
            className={`lg:col-span-4 rounded-2xl p-4 border transition-colors cursor-pointer flex flex-col justify-between ${
              typeFilter === 'expense'
                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-[#1860FC]'
                : 'bg-[#F8FAFC] dark:bg-[#181F32] border-slate-200/60 dark:border-[#1E273C] hover:border-[#1860FC]/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#1860FC] text-white flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-extrabold text-[#000000] dark:text-white">
                  Saídas ({comparison.expenseCount})
                </span>
              </div>
              <span className="text-sm sm:text-base font-black font-mono tabular-nums text-[#000000] dark:text-white">
                - {formatBrlCents(comparison.totalExpenseCents)}
              </span>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-[#1E273C] grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Gastos Fixos</span>
                <strong className="font-mono tabular-nums text-[#000000] dark:text-white">
                  {formatBrlCents(comparison.fixedExpenseCents)}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 block">Gastos Variáveis</span>
                <strong className="font-mono tabular-nums text-[#000000] dark:text-white">
                  {formatBrlCents(comparison.variableExpenseCents)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. LISTAGEM DETALHADA: LISTA DE TRANSAÇÕES COM STATUS 1-CLIQUE, EDIÇÃO E EXCLUSÃO RÁPIDA
      ===================================================================== */}
      <section className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl flex flex-col overflow-hidden shadow-xs">
        {displayTransactions.length === 0 ? (
          <div className="my-auto p-6 text-center">
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
              Nenhum lançamento corresponde aos filtros selecionados.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Limpe os filtros ativos ou registre uma nova entrada/saída neste mês.
            </p>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setNatureFilter('all');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E273C] bg-[#F8FAFC]/70 dark:bg-[#000000]/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Data</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3">Status (1-Clique)</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Categoria</th>
                  <th className="py-2.5 px-3 hidden lg:table-cell">Classificação</th>
                  <th className="py-2.5 px-3 text-right">Valor (R$)</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-[#1E273C] text-xs">
                {paginatedTransactions.map((tx) => {
                  const txStatus = getTransactionStatus(tx);
                  const isPending = txStatus === 'pending';
                  const recurring = isTransactionRecurring(tx);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-[#F8FAFC]/60 dark:hover:bg-[#181F32]/60 transition-colors ${
                        isPending ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.dateIso.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2.5 px-3 max-w-[190px] sm:max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#000000] dark:text-white truncate">
                            {tx.description}
                          </span>
                          {recurring && (
                            <span
                              title="Conta Fixa / Recorrente Mensal"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-[#1860FC]/10 dark:bg-[#1860FC]/25 text-[#1860FC] dark:text-[#D4F907] shrink-0"
                            >
                              <Repeat className="w-2.5 h-2.5" />
                              Fixa
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {tx.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleTransactionStatus?.(tx)}
                          title={
                            isPending
                              ? `Clique para marcar como ${tx.type === 'income' ? 'Recebido' : 'Pago'}`
                              : 'Clique para alterar para Pendente'
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border ${
                            isPending
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500 hover:text-[#000000]'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                          }`}
                        >
                          {isPending ? (
                            <>
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>⏳ Pendente</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>{tx.type === 'income' ? '✅ Recebido' : '✅ Pago'}</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap hidden md:table-cell">
                        {tx.categoryName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap hidden lg:table-cell">
                        <span>{tx.type === 'income' ? 'Entrada' : 'Saída'}</span>
                        <span className="mx-1 text-slate-300 dark:text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span>{NATURE_LABELS[tx.expenseNature]}</span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                          isPending
                            ? 'text-amber-600 dark:text-amber-400'
                            : tx.type === 'income'
                            ? 'text-emerald-600 dark:text-[#D4F907]'
                            : 'text-[#000000] dark:text-white'
                        }`}
                      >
                        {tx.type === 'income'
                          ? `+ ${formatBrlCents(tx.amountCents)}`
                          : `- ${formatBrlCents(tx.amountCents)}`}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            aria-label={`Editar ${tx.description}`}
                            className="p-1 text-slate-500 dark:text-slate-400 hover:text-[#1860FC] dark:hover:text-[#D4F907] rounded-full transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            aria-label={`Excluir ${tx.description}`}
                            className="p-1 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-full transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="shrink-0 px-4 py-2.5 bg-[#F8FAFC]/60 dark:bg-[#000000]/60 border-t border-slate-200 dark:border-[#1E273C] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-slate-600 dark:text-slate-400">
            <span>
              Entradas:{' '}
              <strong className="text-emerald-600 dark:text-[#D4F907]">
                {formatBrlCents(filteredTotals.income)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Saídas:{' '}
              <strong className="text-[#000000] dark:text-white">
                {formatBrlCents(filteredTotals.expense)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Saldo:{' '}
              <strong
                className={
                  filteredTotals.net >= 0
                    ? 'text-[#1860FC] dark:text-[#D4F907]'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {formatBrlCents(filteredTotals.net, true)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Pág. <strong className="text-[#000000] dark:text-white">{safePage}</strong>/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#242F48] text-[#000000] dark:text-white disabled:opacity-40 hover:border-[#1860FC] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3 h-3" />
              Ant.
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#242F48] text-[#000000] dark:text-white disabled:opacity-40 hover:border-[#1860FC] transition-colors cursor-pointer"
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
