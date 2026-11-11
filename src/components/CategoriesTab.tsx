import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  Plus,
  Zap,
  Trash2,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  UserCheck,
  SlidersHorizontal,
  Settings,
  X,
  Brain,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  formatBrlCents,
  parseInputToCents,
  validateCategoryInput,
  type FinancialCategory,
  type TransactionType,
  type ExpenseNature,
} from '../utils/financeLogic';
import { NATURE_LABELS } from '../utils/seedData';
import type { ThemeMode } from '../App';
import { PWAInstallButton } from './PWAInstallButton';

interface CategoriesTabProps {
  categories: FinancialCategory[];
  onCreateCategory: (catData: Omit<FinancialCategory, 'id' | 'uid'>) => Promise<void>;
  onUpdateCategory: (category: FinancialCategory) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onQuickLaunchPreset: (category: FinancialCategory) => Promise<void>;
  theme: ThemeMode;
  onToggleTheme: () => void;
  currentUser: User | null;
  onSignOut: () => void;
  isPredictiveEnabled?: boolean;
  onTogglePredictive?: (enabled: boolean) => void;
  isPrivacyMode?: boolean;
  onTogglePrivacyMode?: () => void;
}

const CAT_PAGE_SIZE = 7;

export function CategoriesTab({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onQuickLaunchPreset,
  theme,
  onToggleTheme,
  currentUser,
  onSignOut,
  isPredictiveEnabled = true,
  onTogglePredictive,
  isPrivacyMode = false,
  onTogglePrivacyMode,
}: CategoriesTabProps) {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [nature, setNature] = useState<ExpenseNature>('variable');
  const [limitInput, setLimitInput] = useState('');
  const [defaultAmountInput, setDefaultAmountInput] = useState('');
  const [isStandardPreset, setIsStandardPreset] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<
    'all' | 'fixed' | 'variable' | 'income_extra' | 'income_recurring'
  >('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filterGroup, categories.length]);

  const handleTypeSelect = (newType: TransactionType) => {
    setType(newType);
    setNature(newType === 'expense' ? 'variable' : 'income_extra');
  };

  const handleStartEdit = (cat: FinancialCategory) => {
    setEditingCategoryId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setNature(cat.nature);
    setLimitInput(
      cat.monthlyLimitCents > 0
        ? (cat.monthlyLimitCents / 100).toFixed(2).replace('.', ',')
        : ''
    );
    setDefaultAmountInput(
      cat.defaultAmountCents > 0
        ? (cat.defaultAmountCents / 100).toFixed(2).replace('.', ',')
        : ''
    );
    setIsStandardPreset(cat.isStandardPreset);
    setError(null);
    setSuccessMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setName('');
    setType('expense');
    setNature('variable');
    setLimitInput('');
    setDefaultAmountInput('');
    setIsStandardPreset(true);
    setError(null);
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
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
      if (editingCategoryId) {
        const existingCat = categories.find((c) => c.id === editingCategoryId);
        if (existingCat) {
          await onUpdateCategory({
            ...existingCat,
            name: name.trim(),
            type,
            nature,
            monthlyLimitCents,
            defaultAmountCents,
            isStandardPreset,
          });
          setSuccessMsg(`Categoria "${name.trim()}" atualizada com sucesso!`);
        }
        handleCancelEdit();
      } else {
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
        setSuccessMsg('Nova categoria salva com sucesso!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar categoria.');
    }
  };

  const handleTogglePresetShortcut = async (cat: FinancialCategory) => {
    await onUpdateCategory({
      ...cat,
      isStandardPreset: !cat.isStandardPreset,
    });
  };

  const displayedCategories = categories.filter((c) => {
    if (filterGroup === 'all') return true;
    return c.nature === filterGroup;
  });

  const totalPages = Math.max(1, Math.ceil(displayedCategories.length / CAT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedCategories = displayedCategories.slice(
    (safePage - 1) * CAT_PAGE_SIZE,
    safePage * CAT_PAGE_SIZE
  );

  const totalPlannedCeilingCents = categories
    .filter((c) => c.type === 'expense' && c.monthlyLimitCents > 0)
    .reduce((acc, c) => acc + c.monthlyLimitCents, 0);

  const activeShortcutsCount = categories.filter((c) => c.isStandardPreset).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* =====================================================================
          SEÇÃO 1: GESTÃO DE CATEGORIAS, TETOS E ATALHOS (⚡)
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left 5 cols: Formulário de Criar / Editar Categoria, Teto Mensal e Atalho ⚡ */}
        <section
          aria-label="Criar ou Editar Categoria e Teto Mensal"
          className="lg:col-span-5 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-[#1E273C]">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[#1860FC] text-white flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-extrabold font-display text-[#000000] dark:text-white leading-tight truncate">
                  {editingCategoryId ? 'Editar Categoria & Teto' : 'Nova Categoria, Teto & Atalho'}
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Configure tetos mensais (R$) e atalhos rápidos de 1-Clique (⚡)
                </p>
              </div>
            </div>

            {editingCategoryId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-rose-500 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitCategory} className="space-y-2.5">
            {error && (
              <div className="flex items-center gap-2 p-2 text-xs text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 p-2 text-xs text-[#000000] bg-[#D4F907] rounded-xl font-bold">
                <Check className="w-3.5 h-3.5 shrink-0 text-[#000000]" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo da Categoria
              </span>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#F8FAFC] dark:bg-[#000000] rounded-full">
                <button
                  type="button"
                  onClick={() => handleTypeSelect('expense')}
                  className={`py-1 px-2.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                    type === 'expense'
                      ? 'bg-[#1860FC] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Saída (Fixo / Variável)
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeSelect('income')}
                  className={`py-1 px-2.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                    type === 'income'
                      ? 'bg-[#D4F907] text-[#000000]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Entrada (Fixa / Extra)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="cat-name"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nome da Categoria
                </label>
                <input
                  id="cat-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Almoço, Café, Pet..."
                  maxLength={60}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1860FC]"
                />
              </div>

              <div>
                <label
                  htmlFor="cat-nature"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Grupo / Natureza
                </label>
                <select
                  id="cat-nature"
                  value={nature}
                  onChange={(e) => setNature(e.target.value as ExpenseNature)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1860FC]"
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
                <label
                  htmlFor="cat-limit"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Teto Mensal (R$)
                </label>
                <input
                  id="cat-limit"
                  type="text"
                  inputMode="decimal"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  placeholder="Ex: 600,00"
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1860FC]"
                />
              </div>

              <div>
                <label
                  htmlFor="cat-default"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Valor 1-Clique ⚡ (R$)
                </label>
                <input
                  id="cat-default"
                  type="text"
                  inputMode="decimal"
                  value={defaultAmountInput}
                  onChange={(e) => setDefaultAmountInput(e.target.value)}
                  placeholder="Ex: 45,00"
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1860FC]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={isStandardPreset}
                onChange={(e) => setIsStandardPreset(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-[#1860FC] focus:ring-[#1860FC]"
              />
              <span className="text-[11px] text-slate-700 dark:text-slate-300">
                Exibir nos atalhos de <strong>⚡ 1-Clique</strong> do botão "+"
              </span>
            </label>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors cursor-pointer shadow-xs"
            >
              {editingCategoryId ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Salvar Alterações da Categoria
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Criar Categoria
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-200/80 dark:border-[#1E273C] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Atalhos ⚡ Ativos:{' '}
              <strong className="text-[#1860FC] dark:text-[#D4F907]">{activeShortcutsCount}</strong>
            </span>
            <span className="font-mono tabular-nums">
              Soma dos Tetos:{' '}
              <strong className="text-[#1860FC] dark:text-[#D4F907]">
                {formatBrlCents(totalPlannedCeilingCents)}
              </strong>
            </span>
          </div>
        </section>

        {/* Right 7 cols: Lista de Categorias com Toggle de Raio ⚡, Edição de Teto e Exclusão */}
        <section
          aria-label="Catálogo de Categorias, Tetos e Atalhos"
          className="lg:col-span-7 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl flex flex-col overflow-hidden shadow-xs"
        >
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200/80 dark:border-[#1E273C]">
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#000000] dark:text-white truncate">
                1. Gestão de Categorias, Tetos e Atalhos ⚡ ({displayedCategories.length})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Toque no ícone ⚡ para ativar/desativar nos atalhos de 1-Clique ou clique no lápis para editar o teto
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#000000] rounded-full shrink-0">
              <button
                type="button"
                onClick={() => setFilterGroup('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  filterGroup === 'all'
                    ? 'bg-[#1860FC] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFilterGroup('fixed')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  filterGroup === 'fixed'
                    ? 'bg-[#1860FC] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Fixos
              </button>
              <button
                type="button"
                onClick={() => setFilterGroup('variable')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  filterGroup === 'variable'
                    ? 'bg-[#1860FC] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Variáveis
              </button>
              <button
                type="button"
                onClick={() => setFilterGroup('income_extra')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  filterGroup === 'income_extra'
                    ? 'bg-[#D4F907] text-[#000000]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Entradas Extras
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 divide-y divide-slate-200/80 dark:divide-[#1E273C] overflow-y-auto">
            {paginatedCategories.map((cat) => (
              <div
                key={cat.id}
                className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC]/70 dark:hover:bg-[#181F32]/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Botão de Ícone de Raio (⚡) para marcar/desmarcar nos atalhos de 1-Clique */}
                  <button
                    type="button"
                    onClick={() => handleTogglePresetShortcut(cat)}
                    title={
                      cat.isStandardPreset
                        ? 'Atalho de 1-Clique ATIVO (clique para desativar)'
                        : 'Atalho de 1-Clique INATIVO (clique para ativar)'
                    }
                    aria-label={`Alternar atalho 1-Clique para ${cat.name}`}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border ${
                      cat.isStandardPreset
                        ? 'bg-[#D4F907] text-[#000000] border-[#D4F907] shadow-xs'
                        : 'bg-[#F8FAFC] dark:bg-[#181F32] text-slate-400 border-slate-200 dark:border-[#242F48] hover:border-[#1860FC]'
                    }`}
                  >
                    <Zap className={`w-4 h-4 ${cat.isStandardPreset ? 'fill-current' : ''}`} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#000000] dark:text-white truncate">
                        {cat.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F8FAFC] dark:bg-[#181F32] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-[#242F48]">
                        {NATURE_LABELS[cat.nature]}
                      </span>
                      {cat.isStandardPreset && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#1860FC]/10 dark:bg-[#1860FC]/20 text-[#1860FC] dark:text-[#D4F907]">
                          ⚡ Atalho 1-Clique
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>
                        Teto Mensal:{' '}
                        <strong className="font-mono tabular-nums text-[#000000] dark:text-white">
                          {cat.monthlyLimitCents > 0
                            ? formatBrlCents(cat.monthlyLimitCents)
                            : 'Sem teto'}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Valor 1-Clique:{' '}
                        <strong className="font-mono tabular-nums text-[#1860FC] dark:text-[#D4F907]">
                          {cat.defaultAmountCents > 0
                            ? formatBrlCents(cat.defaultAmountCents)
                            : 'R$ 100,00'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onQuickLaunchPreset(cat)}
                    title={`Lançar 1-Clique agora: ${cat.name}`}
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#000000] dark:text-white bg-[#F8FAFC] dark:bg-[#181F32] hover:bg-[#1860FC] hover:text-white dark:hover:bg-[#D4F907] dark:hover:text-[#000000] rounded-full transition-colors cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    Testar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(cat)}
                    title={`Editar teto e valores de ${cat.name}`}
                    aria-label={`Editar ${cat.name}`}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#1860FC] dark:hover:text-[#D4F907] rounded-full transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {!cat.isSystemDefault && (
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat.id)}
                      title={`Remover ${cat.name}`}
                      aria-label={`Remover categoria ${cat.name}`}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-full transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="shrink-0 px-4 py-2.5 bg-[#F8FAFC]/60 dark:bg-[#000000]/60 border-t border-slate-200 dark:border-[#1E273C] flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              Pág. <strong className="text-[#000000] dark:text-white">{safePage}</strong>/{totalPages} (
              {displayedCategories.length} categorias)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#242F48] text-[#000000] dark:text-white disabled:opacity-40 hover:border-[#1860FC] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
                Ant.
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#242F48] text-[#000000] dark:text-white disabled:opacity-40 hover:border-[#1860FC] transition-colors cursor-pointer"
              >
                Próx.
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* =====================================================================
          SEÇÃO 2: PREFERÊNCIAS DO SISTEMA (INTELIGÊNCIA PREDITIVA, MODO PRIVACIDADE, DARK MODE, PWA & CONTA)
      ===================================================================== */}
      <section
        aria-label="Preferências do Sistema, Aplicativo PWA e Conta"
        className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs"
      >
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-[#1E273C]">
          <span className="w-8 h-8 rounded-xl bg-[#1860FC] text-[#D4F907] flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#000000] dark:text-white">
              2. Preferências do Sistema, Instalação PWA & Conta
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Inteligência preditiva, modo privacidade, aparência visual (Modo Claro/Escuro), aplicativo instalável e sessão
            </p>
          </div>
        </div>

        {/* Destaque: Switch/Toggle de Inteligência Preditiva de Sobras + Modo Privacidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Toggle 1: Inteligência Preditiva de Sobras */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[#1860FC]/15 text-[#1860FC] dark:text-[#D4F907] flex items-center justify-center shrink-0 mt-0.5">
                <Brain className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-extrabold text-[#000000] dark:text-white">
                    Inteligência Preditiva de Sobras
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isPredictiveEnabled
                        ? 'bg-[#D4F907] text-[#000000]'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isPredictiveEnabled ? 'Ativada' : 'Desativada'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Exibir cálculo de gasto diário seguro e projeção automática de fechamento do mês
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isPredictiveEnabled}
              aria-label="Alternar Inteligência Preditiva de Sobras"
              onClick={() => onTogglePredictive?.(!isPredictiveEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPredictiveEnabled
                  ? 'bg-[#1860FC]'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isPredictiveEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Modo Privacidade Global (Ocultar Valores R$) */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[#1860FC]/15 text-[#1860FC] dark:text-[#D4F907] flex items-center justify-center shrink-0 mt-0.5">
                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-extrabold text-[#000000] dark:text-white">
                    Modo Privacidade Global (R$ ••••)
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isPrivacyMode
                        ? 'bg-[#D4F907] text-[#000000]'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isPrivacyMode ? 'Valores Ocultos' : 'Valores Visíveis'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Ocultar todos os valores monetários em Reais mantendo porcentagens (%) e gráficos visíveis
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isPrivacyMode}
              aria-label="Alternar Modo Privacidade Global"
              onClick={() => onTogglePrivacyMode?.()}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPrivacyMode
                  ? 'bg-[#1860FC]'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isPrivacyMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
          {/* Card 1: Alternância de Modo Claro / Escuro com Adaptação da Logo */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold text-[#000000] dark:text-white">
                  Aparência & Tema Visual
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Logo e superfícies adaptativas ({theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'})
                </p>
              </div>
              <img
                src="./logo-sobramais.png"
                alt="Logo SobraMais Claro"
                className="h-7 w-auto object-contain dark:hidden shrink-0"
              />
              <img
                src="./logo-sobramais-dark.png"
                alt="Logo SobraMais Escuro"
                className="h-7 w-auto object-contain hidden dark:block shrink-0"
              />
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#242F48] hover:border-[#1860FC] dark:hover:border-[#D4F907] text-xs font-bold text-[#000000] dark:text-white transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-[#D4F907]" />
                    <span>Alternar para Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-[#1860FC]" />
                    <span>Alternar para Modo Escuro</span>
                  </>
                )}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#1860FC]/10 dark:bg-[#1860FC]/20 text-[#1860FC] dark:text-[#D4F907]">
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>
          </div>

          {/* Card 2: Instalação do Aplicativo PWA */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold text-[#000000] dark:text-white">
                Aplicativo Instalável (PWA)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Instale o SobraMais na tela inicial do celular ou desktop com suporte offline
              </p>
            </div>
            <div>
              <PWAInstallButton variant="drawer" />
            </div>
          </div>

          {/* Card 3: Gerenciamento da Conta e Logout */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser ? (
                <>
                  <div className="w-9 h-9 rounded-full bg-[#1860FC] text-white flex items-center justify-center text-xs font-black shrink-0 uppercase">
                    {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#000000] dark:text-white truncate">
                      {currentUser.displayName || currentUser.email}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-[#D4F907] flex items-center gap-1 truncate">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Sincronizado na Nuvem Firebase</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-[#D4F907] text-[#000000] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#000000] dark:text-white truncate">
                      Modo Demonstração / Convidado
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Armazenamento local ativo neste dispositivo
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#242F48] hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{currentUser ? 'Encerrar Sessão (Sair)' : 'Sair do Modo Demo / Fazer Login'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
