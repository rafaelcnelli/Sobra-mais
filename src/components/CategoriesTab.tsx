import React, { useState, useEffect } from 'react';
import { Plus, Zap, Trash2, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatBrlCents,
  parseInputToCents,
  validateCategoryInput,
  type FinancialCategory,
  type TransactionType,
  type ExpenseNature,
} from '../utils/financeLogic';
import { NATURE_LABELS } from '../utils/seedData';

interface CategoriesTabProps {
  categories: FinancialCategory[];
  onCreateCategory: (catData: Omit<FinancialCategory, 'id' | 'uid'>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onQuickLaunchPreset: (category: FinancialCategory) => Promise<void>;
}

const CAT_PAGE_SIZE = 6;

export function CategoriesTab({
  categories,
  onCreateCategory,
  onDeleteCategory,
  onQuickLaunchPreset,
}: CategoriesTabProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [nature, setNature] = useState<ExpenseNature>('variable');
  const [limitInput, setLimitInput] = useState('');
  const [defaultAmountInput, setDefaultAmountInput] = useState('');
  const [isStandardPreset, setIsStandardPreset] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterDirection, setFilterDirection] = useState<'all' | 'expense' | 'income'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filterDirection, categories.length]);

  const handleTypeSelect = (newType: TransactionType) => {
    setType(newType);
    setNature(newType === 'expense' ? 'variable' : 'income_recurring');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const monthlyLimitCents = parseInputToCents(limitInput);
    const defaultAmountCents = parseInputToCents(defaultAmountInput);

    const validation = validateCategoryInput({
      name,
      type,
      nature,
      monthlyLimitCents,
      defaultAmountCents,
    });

    if (!validation.valid) {
      setError(validation.error ?? 'Dados inválidos.');
      return;
    }

    try {
      await onCreateCategory({
        name: name.trim(),
        type,
        nature,
        monthlyLimitCents,
        defaultAmountCents,
        isStandardPreset,
      });
      setName('');
      setLimitInput('');
      setDefaultAmountInput('');
      setSuccessMsg('Tipo de gasto/entrada personalizado salvo com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria.');
    }
  };

  const displayedCategories = categories.filter((c) =>
    filterDirection === 'all' ? true : c.type === filterDirection
  );

  const totalPages = Math.max(1, Math.ceil(displayedCategories.length / CAT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedCategories = displayedCategories.slice(
    (safePage - 1) * CAT_PAGE_SIZE,
    safePage * CAT_PAGE_SIZE
  );

  const totalPlannedCeilingCents = categories
    .filter((c) => c.type === 'expense' && c.monthlyLimitCents > 0)
    .reduce((acc, c) => acc + c.monthlyLimitCents, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
      {/* Left 5 cols: Compact Create Custom Expense / Standard Preset Form */}
      <section className="lg:col-span-5 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-3.5 space-y-2.5">
        <div className="pb-2 border-b border-slate-200/80 dark:border-[#1E273C]">
          <h1 className="text-sm font-extrabold font-display text-[#0A0E17] dark:text-white leading-tight">
            Criar Tipo de Gasto Padrão ou Personalizado
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Configure categorias com teto mensal e valor de 1-clique
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-2.5">
          {error && (
            <div className="flex items-center gap-2 p-2 text-xs text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-2 text-xs text-[#0A0E17] bg-[#E2FF1A] rounded-xl font-bold">
              <Check className="w-3.5 h-3.5 shrink-0 text-[#0A0E17]" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Direção da Categoria
            </span>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#F4F6FB] dark:bg-[#080B12] rounded-full">
              <button
                type="button"
                onClick={() => handleTypeSelect('expense')}
                className={`py-1 px-2.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                  type === 'expense'
                    ? 'bg-[#1456FF] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tipo de Saída (Gasto)
              </button>
              <button
                type="button"
                onClick={() => handleTypeSelect('income')}
                className={`py-1 px-2.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                  type === 'income'
                    ? 'bg-[#E2FF1A] text-[#0A0E17]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tipo de Entrada (Renda)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="cat-name" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Tipo
              </label>
              <input
                id="cat-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pet, Educação..."
                maxLength={60}
                className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF]"
              />
            </div>

            <div>
              <label htmlFor="cat-nature" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Comportamento
              </label>
              <select
                id="cat-nature"
                value={nature}
                onChange={(e) => setNature(e.target.value as ExpenseNature)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1456FF]"
              >
                {type === 'expense' ? (
                  <>
                    <option value="fixed">{NATURE_LABELS.fixed}</option>
                    <option value="variable">{NATURE_LABELS.variable}</option>
                    <option value="surplus_allocation">{NATURE_LABELS.surplus_allocation}</option>
                  </>
                ) : (
                  <>
                    <option value="income_recurring">{NATURE_LABELS.income_recurring}</option>
                    <option value="income_extra">{NATURE_LABELS.income_extra}</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="cat-limit" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Teto Mensal (R$)
              </label>
              <input
                id="cat-limit"
                type="text"
                inputMode="decimal"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                placeholder="Ex: 500,00"
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF]"
              />
            </div>

            <div>
              <label htmlFor="cat-default" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor 1-Clique (R$)
              </label>
              <input
                id="cat-default"
                type="text"
                inputMode="decimal"
                value={defaultAmountInput}
                onChange={(e) => setDefaultAmountInput(e.target.value)}
                placeholder="Ex: 180,00"
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
            <input
              type="checkbox"
              checked={isStandardPreset}
              onChange={(e) => setIsStandardPreset(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-[#1456FF] focus:ring-[#1456FF]"
            />
            <span className="text-[11px] text-slate-700 dark:text-slate-300">
              Incluir como <strong>Gasto/Entrada Padrão</strong> na página de 1-Clique
            </span>
          </label>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Salvar Tipo Personalizado
          </button>
        </form>

        {/* Compact Summary Strip */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-[#1E273C] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            Saídas: <strong className="text-[#0A0E17] dark:text-white">{categories.filter((c) => c.type === 'expense').length}</strong> · Entradas:{' '}
            <strong className="text-[#0A0E17] dark:text-white">{categories.filter((c) => c.type === 'income').length}</strong>
          </span>
          <span className="font-mono tabular-nums">
            Soma Tetos: <strong className="text-[#1456FF] dark:text-[#E2FF1A]">{formatBrlCents(totalPlannedCeilingCents)}</strong>
          </span>
        </div>
      </section>

      {/* Right 7 cols: Paginated Catalog of Standard & Custom Expense/Income Types */}
      <section className="lg:col-span-7 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl flex flex-col overflow-hidden">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200/80 dark:border-[#1E273C]">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold font-display text-[#0A0E17] dark:text-white truncate">
              Catálogo de Gastos Padrões e Personalizados ({displayedCategories.length})
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Lance qualquer item no mês atual ou gerencie seus tetos
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F4F6FB] dark:bg-[#080B12] rounded-full shrink-0">
            <button
              type="button"
              onClick={() => setFilterDirection('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                filterDirection === 'all'
                  ? 'bg-[#1456FF] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterDirection('expense')}
              className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                filterDirection === 'expense'
                  ? 'bg-[#1456FF] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Saídas
            </button>
            <button
              type="button"
              onClick={() => setFilterDirection('income')}
              className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                filterDirection === 'income'
                  ? 'bg-[#E2FF1A] text-[#0A0E17]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Entradas
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 divide-y divide-slate-200/80 dark:divide-[#1E273C] overflow-y-auto">
          {paginatedCategories.map((cat) => (
            <div
              key={cat.id}
              className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#F4F6FB]/70 dark:hover:bg-[#181F32]/60 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    cat.type === 'income'
                      ? 'bg-[#E2FF1A] text-[#0A0E17]'
                      : 'bg-[#1456FF] text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#0A0E17] dark:text-white truncate">
                      {cat.name}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {cat.isSystemDefault ? 'Sistema' : 'Personalizado'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{cat.type === 'income' ? 'Entrada' : 'Saída'}</span>
                    {cat.monthlyLimitCents > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          Teto: {formatBrlCents(cat.monthlyLimitCents)}
                        </span>
                      </>
                    )}
                    {cat.defaultAmountCents > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums font-semibold text-[#1456FF] dark:text-[#E2FF1A]">
                          Padrão: {formatBrlCents(cat.defaultAmountCents)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onQuickLaunchPreset(cat)}
                  aria-label={`Lançar agora ${cat.name}`}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-[#0A0E17] dark:text-white bg-[#F4F6FB] dark:bg-[#181F32] hover:bg-[#1456FF] hover:text-white dark:hover:bg-[#E2FF1A] dark:hover:text-[#0A0E17] rounded-full transition-colors whitespace-nowrap"
                >
                  <Zap className="w-3 h-3" />
                  Lançar
                </button>
                {!cat.isSystemDefault && (
                  <button
                    type="button"
                    onClick={() => onDeleteCategory(cat.id)}
                    aria-label={`Remover categoria ${cat.name}`}
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Footer */}
        <div className="shrink-0 px-4 py-2.5 bg-[#F4F6FB]/60 dark:bg-[#0C101C] border-t border-slate-200 dark:border-[#1E273C] flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">
            Pág. <strong className="text-[#0A0E17] dark:text-white">{safePage}</strong>/{totalPages} ({displayedCategories.length} itens)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] text-[#0A0E17] dark:text-white disabled:opacity-40 hover:border-[#1456FF] transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              Ant.
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
