/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Plus,
  Cloud,
  LogOut,
  Calendar,
  CheckCircle2,
  Sun,
  Moon,
  LayoutGrid,
  Zap,
  ArrowLeftRight,
  SlidersHorizontal,
  PiggyBank,
  Menu,
  Search,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  OperationType,
  handleFirestoreError,
} from './firebase';
import {
  formatBrlCents,
  calculateMonthlySummary,
  calculateDynamicSummary,
  filterTransactionsByCriteria,
  searchTransactionsAcrossDataset,
  DEFAULT_FILTER_CRITERIA,
  type FinancialCategory,
  type FinancialTransaction,
  type MonthlySurplusPlan,
  type CustomFilterCriteria,
} from './utils/financeLogic';
import {
  AVAILABLE_MONTHS,
  getDefaultCategories,
  getDefaultTransactions,
  getDefaultMonthlyPlan,
} from './utils/seedData';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OverviewTab } from './components/OverviewTab';
import { QuickLaunchTab } from './components/QuickLaunchTab';
import { TransactionsTab } from './components/TransactionsTab';
import { CategoriesTab } from './components/CategoriesTab';
import { MonthlyAnalysisTab } from './components/MonthlyAnalysisTab';
import { TransactionModal } from './components/TransactionModal';
import { SidebarDrawer } from './components/SidebarDrawer';
import { DesktopSidebar } from './components/DesktopSidebar';
import { PageFilterBar } from './components/PageFilterBar';
import { AuthPage } from './components/AuthPage';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';

export type ActiveTab = 'overview' | 'quick_launch' | 'transactions' | 'categories' | 'analysis';
export type ThemeMode = 'light' | 'dark';

const LOCAL_TX_KEY = 'sobramais_local_transactions_v1';
const LOCAL_CAT_KEY = 'sobramais_local_categories_v1';
const LOCAL_PLAN_KEY = 'sobramais_local_plans_v1';
const LOCAL_THEME_KEY = 'sobramais_theme_mode_v1';
const GUEST_SESSION_KEY = 'sobramais_guest_session_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [filterCriteria, setFilterCriteria] = useState<CustomFilterCriteria>(DEFAULT_FILTER_CRITERIA);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(GUEST_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const activeMonth =
    filterCriteria.periodMode === 'month' && filterCriteria.monthKey !== 'all'
      ? filterCriteria.monthKey
      : '2026-11';

  const setActiveMonth = useCallback((monthKey: string) => {
    setFilterCriteria((prev) => ({
      ...prev,
      periodMode: 'month',
      monthKey,
      startDate: '',
      endDate: '',
    }));
  }, []);

  const [isNavbarSearchFocused, setIsNavbarSearchFocused] = useState(false);

  const handleNavbarSearchChange = useCallback((value: string) => {
    setFilterCriteria((prev) => ({
      ...prev,
      searchQuery: value,
    }));
  }, []);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(LOCAL_THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Local / Cloud state
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_TX_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return getDefaultTransactions('demo_user');
  });

  const [categories, setCategories] = useState<FinancialCategory[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CAT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getDefaultCategories('demo_user');
  });

  const [monthlyPlans, setMonthlyPlans] = useState<Record<string, MonthlySurplusPlan>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_PLAN_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      '2026-09': getDefaultMonthlyPlan('demo_user', '2026-09'),
      '2026-10': getDefaultMonthlyPlan('demo_user', '2026-10'),
      '2026-11': getDefaultMonthlyPlan('demo_user', '2026-11'),
      '2026-12': getDefaultMonthlyPlan('demo_user', '2026-12'),
    };
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Persist local state when in demo/local mode
  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(transactions));
      } catch {
        // ignore
      }
    }
  }, [transactions, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(LOCAL_CAT_KEY, JSON.stringify(categories));
      } catch {
        // ignore
      }
    }
  }, [categories, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify(monthlyPlans));
      } catch {
        // ignore
      }
    }
  }, [monthlyPlans, currentUser]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore real-time synchronization when authenticated
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const uid = currentUser.uid;
    const txPath = `users/${uid}/transactions`;
    const catPath = `users/${uid}/categories`;
    const planPath = `users/${uid}/monthlyPlans`;

    const txQuery = query(collection(db, txPath), where('uid', '==', uid));
    const catQuery = query(collection(db, catPath), where('uid', '==', uid));
    const planQuery = query(collection(db, planPath), where('uid', '==', uid));

    const unsubTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const loaded: FinancialTransaction[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.uid,
            description: data.description,
            amountCents: data.amountCents,
            type: data.type,
            categoryId: data.categoryId,
            categoryName: data.categoryName,
            expenseNature: data.expenseNature,
            dateIso: data.dateIso,
            monthKey: data.monthKey,
            isStandardTemplate: Boolean(data.isStandardTemplate),
            notes: data.notes ?? '',
          };
        });
        setTransactions(loaded);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, txPath)
    );

    const unsubCat = onSnapshot(
      catQuery,
      (snapshot) => {
        const customCats: FinancialCategory[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.uid,
            name: data.name,
            type: data.type,
            nature: data.nature,
            monthlyLimitCents: data.monthlyLimitCents,
            defaultAmountCents: data.defaultAmountCents,
            isStandardPreset: Boolean(data.isStandardPreset),
            isSystemDefault: false,
          };
        });
        const defaults = getDefaultCategories(uid);
        const merged = [
          ...customCats.filter((c) => !defaults.some((d) => d.id === c.id)),
          ...defaults,
        ];
        setCategories(merged);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, catPath)
    );

    const unsubPlan = onSnapshot(
      planQuery,
      (snapshot) => {
        const plansMap: Record<string, MonthlySurplusPlan> = {
          '2026-09': getDefaultMonthlyPlan(uid, '2026-09'),
          '2026-10': getDefaultMonthlyPlan(uid, '2026-10'),
          '2026-11': getDefaultMonthlyPlan(uid, '2026-11'),
          '2026-12': getDefaultMonthlyPlan(uid, '2026-12'),
        };
        for (const d of snapshot.docs) {
          const data = d.data();
          plansMap[data.monthKey] = {
            id: d.id,
            uid: data.uid,
            monthKey: data.monthKey,
            targetSurplusPercent: data.targetSurplusPercent,
            targetSurplusCents: data.targetSurplusCents,
            emergencySharePercent: data.emergencySharePercent,
            investmentsSharePercent: data.investmentsSharePercent,
            goalsSharePercent: data.goalsSharePercent,
          };
        }
        setMonthlyPlans(plansMap);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, planPath)
    );

    return () => {
      unsubTx();
      unsubCat();
      unsubPlan();
    };
  }, [isAuthReady, currentUser]);

  const handleEnterGuestMode = (customProfile?: { name: string; email: string }) => {
    setIsGuestMode(true);
    try {
      sessionStorage.setItem(GUEST_SESSION_KEY, 'true');
    } catch {
      // ignore
    }
    if (!customProfile) {
      showToast('Você entrou no Modo Convidado. Os dados são salvos localmente.');
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Conectado ao Firebase! Sincronização em nuvem ativa.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha na autenticação com Google.';
      setAuthErrorMsg(msg);
    }
  };

  const handleSignOut = async () => {
    setIsGuestMode(false);
    try {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    } catch {
      // ignore
    }
    if (currentUser) {
      try {
        await signOut(auth);
      } catch (err: any) {
        // ignore
      }
    }
    setTransactions(getDefaultTransactions('demo_user'));
    setCategories(getDefaultCategories('demo_user'));
    showToast('Sessão encerrada com sucesso. Retornando ao login.');
  };

  const handleSaveTransaction = async (
    txData: Omit<FinancialTransaction, 'id' | 'uid'>,
    existingId?: string
  ) => {
    const txId = existingId ?? `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (currentUser) {
      const path = `users/${currentUser.uid}/transactions/${txId}`;
      try {
        if (existingId) {
          await updateDoc(doc(db, path), {
            description: txData.description,
            amountCents: txData.amountCents,
            type: txData.type,
            categoryId: txData.categoryId,
            categoryName: txData.categoryName,
            expenseNature: txData.expenseNature,
            dateIso: txData.dateIso,
            monthKey: txData.monthKey,
            isStandardTemplate: txData.isStandardTemplate,
            notes: txData.notes,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, path), {
            uid: currentUser.uid,
            description: txData.description,
            amountCents: txData.amountCents,
            type: txData.type,
            categoryId: txData.categoryId,
            categoryName: txData.categoryName,
            expenseNature: txData.expenseNature,
            dateIso: txData.dateIso,
            monthKey: txData.monthKey,
            isStandardTemplate: txData.isStandardTemplate,
            notes: txData.notes,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(
          err,
          existingId ? OperationType.UPDATE : OperationType.CREATE,
          path
        );
      }
    } else {
      const newTx: FinancialTransaction = {
        ...txData,
        id: txId,
        uid: 'demo_user',
      };
      setTransactions((prev) =>
        existingId ? prev.map((t) => (t.id === existingId ? newTx : t)) : [newTx, ...prev]
      );
    }

    showToast(
      existingId
        ? `Lançamento "${txData.description}" atualizado!`
        : `${txData.type === 'income' ? 'Entrada' : 'Saída'} "${txData.description}" (${formatBrlCents(txData.amountCents)}) registrada!`
    );
  };

  const handleDeleteTransaction = async (id: string) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/transactions/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
    showToast('Lançamento removido.');
  };

  const handleQuickLaunchPreset = async (preset: FinancialCategory) => {
    const amountCents = preset.defaultAmountCents > 0 ? preset.defaultAmountCents : 10000;
    await handleSaveTransaction({
      description: preset.name,
      amountCents,
      type: preset.type,
      categoryId: preset.id,
      categoryName: preset.name,
      expenseNature: preset.nature,
      dateIso: `${activeMonth}-09`,
      monthKey: activeMonth,
      isStandardTemplate: true,
      notes: 'Lançamento rápido via padrão 1-clique',
    });
  };

  const handleCreateCategory = async (catData: Omit<FinancialCategory, 'id' | 'uid'>) => {
    const catId = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (currentUser) {
      const path = `users/${currentUser.uid}/categories/${catId}`;
      try {
        await setDoc(doc(db, path), {
          uid: currentUser.uid,
          name: catData.name,
          type: catData.type,
          nature: catData.nature,
          monthlyLimitCents: catData.monthlyLimitCents,
          defaultAmountCents: catData.defaultAmountCents,
          isStandardPreset: catData.isStandardPreset,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const newCat: FinancialCategory = {
        ...catData,
        id: catId,
        uid: 'demo_user',
        isSystemDefault: false,
      };
      setCategories((prev) => [newCat, ...prev]);
    }
    showToast(`Categoria personalizada "${catData.name}" criada!`);
  };

  const handleDeleteCategory = async (id: string) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/categories/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
    showToast('Categoria personalizada removida.');
  };

  const handleSaveMonthlyPlan = async (planData: Omit<MonthlySurplusPlan, 'id' | 'uid'>) => {
    const planId = `plan_${planData.monthKey}`;
    if (currentUser) {
      const path = `users/${currentUser.uid}/monthlyPlans/${planId}`;
      try {
        await setDoc(doc(db, path), {
          uid: currentUser.uid,
          monthKey: planData.monthKey,
          targetSurplusPercent: planData.targetSurplusPercent,
          targetSurplusCents: planData.targetSurplusCents,
          emergencySharePercent: planData.emergencySharePercent,
          investmentsSharePercent: planData.investmentsSharePercent,
          goalsSharePercent: planData.goalsSharePercent,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setMonthlyPlans((prev) => ({
        ...prev,
        [planData.monthKey]: {
          ...planData,
          id: planId,
          uid: 'demo_user',
        },
      }));
    }
    showToast('Diretriz de sobras do mês salva!');
  };

  const handleRecordSurplusAllocation = async (amountCents: number, label: string) => {
    if (amountCents <= 0) return;
    await handleSaveTransaction({
      description: label,
      amountCents,
      type: 'expense',
      categoryId: 'cat_surplus_reserve',
      categoryName: 'Caixinha de Sobra / Investimento',
      expenseNature: 'surplus_allocation',
      dateIso: `${activeMonth}-09`,
      monthKey: activeMonth,
      isStandardTemplate: false,
      notes: 'Alocação planejada da sobra mensal',
    });
  };

  const filteredTransactions = useMemo(() => {
    return filterTransactionsByCriteria(transactions, filterCriteria);
  }, [transactions, filterCriteria]);

  const navbarSearchQuery = filterCriteria.searchQuery ?? '';
  const hasActiveNavbarSearch = navbarSearchQuery.trim().length > 0;

  const globalDatasetSearchResults = useMemo(() => {
    if (!hasActiveNavbarSearch) return [];
    return searchTransactionsAcrossDataset(transactions, navbarSearchQuery).sort((a, b) =>
      b.dateIso.localeCompare(a.dateIso)
    );
  }, [transactions, navbarSearchQuery, hasActiveNavbarSearch]);

  const activePeriodLabel = useMemo(() => {
    if (hasActiveNavbarSearch) {
      return `Busca Global: "${navbarSearchQuery.trim()}" (${filteredTransactions.length} de ${transactions.length})`;
    }
    if (filterCriteria.periodMode === 'range' && filterCriteria.startDate && filterCriteria.endDate) {
      const [sy, sm, sd] = filterCriteria.startDate.split('-');
      const [ey, em, ed] = filterCriteria.endDate.split('-');
      return `${sd}/${sm}/${sy} a ${ed}/${em}/${ey}`;
    }
    if (filterCriteria.periodMode === 'month') {
      if (filterCriteria.monthKey === 'all') return 'Todos os Meses';
      const m = AVAILABLE_MONTHS.find((item) => item.key === filterCriteria.monthKey);
      return m ? m.label : filterCriteria.monthKey;
    }
    return 'Filtro Personalizado';
  }, [filterCriteria, hasActiveNavbarSearch, navbarSearchQuery, filteredTransactions.length, transactions.length]);

  const activePlan =
    monthlyPlans[activeMonth] ?? getDefaultMonthlyPlan(currentUser?.uid ?? 'demo_user', activeMonth);

  const filteredSummary = useMemo(() => {
    return calculateDynamicSummary(filteredTransactions, activePeriodLabel, activePlan);
  }, [filteredTransactions, activePeriodLabel, activePlan]);

  // 1. Initial auth state loading splash
  if (!isAuthReady) {
    return (
      <div className="h-screen w-full bg-[#F4F6FB] dark:bg-[#080B12] flex flex-col items-center justify-center gap-4 transition-colors">
        <img
          src="./logo-sobramais.png"
          alt="SobraMais"
          className="h-14 w-auto object-contain rounded-2xl bg-[#F6F8FC] px-3 py-1.5 shadow-lg animate-pulse"
        />
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <div className="w-3.5 h-3.5 border-2 border-[#1456FF] border-t-transparent rounded-full animate-spin" />
          <span>Iniciando SobraMais...</span>
        </div>
      </div>
    );
  }

  // 2. If not authenticated and not in guest mode, show the dedicated Login/Cadastro Page!
  if (!currentUser && !isGuestMode) {
    return (
      <ErrorBoundary>
        <AuthPage
          onEnterGuestMode={handleEnterGuestMode}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSuccessToast={showToast}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen overflow-hidden flex flex-row bg-[#F4F6FB] dark:bg-[#080B12] text-[#0A0E17] dark:text-white transition-colors duration-200">
        {/* Desktop Left Navigation Sidebar */}
        <DesktopSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeMonth={activeMonth}
          theme={theme}
          onToggleTheme={toggleTheme}
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onOpenNewModal={(defaultType = 'expense') => {
            setEditingTransaction(null);
            setModalDefaultType(defaultType);
            setIsModalOpen(true);
          }}
          categoriesCount={categories.length}
          transactionsCount={filteredTransactions.length}
          netSurplusCents={filteredSummary.netSurplusCents}
          activePeriodLabel={activePeriodLabel}
        />

        {/* Workspace Content Area */}
        <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
          {/* Top Navbar Header */}
          <header className="shrink-0 bg-white dark:bg-[#111624] border-b border-slate-200/80 dark:border-[#1E273C] px-4 sm:px-6 py-2.5 z-30 transition-colors">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              {/* Zone 1: Brand Logo (Mobile) / Active Page Indicator (Desktop) */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="#visao-geral"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('overview');
                  }}
                  className="md:hidden flex items-center gap-1.5 shrink-0"
                >
                  <img
                    src="./logo-sobramais.png"
                    alt="SobraMais"
                    className="h-7 w-auto object-contain rounded-lg bg-[#F6F8FC] px-1 py-0.5"
                  />
                </a>

                <div className="hidden md:flex items-center gap-2">
                  <img
                    src="./logo-icon.png"
                    alt="S+"
                    className="w-6 h-6 rounded-lg object-contain bg-[#F6F8FC] border border-slate-200/70 dark:border-[#242F48] shrink-0"
                  />
                  <span className="text-sm font-extrabold text-[#0A0E17] dark:text-white font-display whitespace-nowrap">
                    {activeTab === 'overview' && 'Visão Geral'}
                    {activeTab === 'quick_launch' && 'Gastos Padrões (1-Clique)'}
                    {activeTab === 'transactions' && 'Entradas e Saídas'}
                    {activeTab === 'categories' && 'Tipos de Gastos & Tetos'}
                    {activeTab === 'analysis' && 'Análise Mensal & Sobras'}
                  </span>
                  <span className="hidden xl:inline text-xs font-medium text-slate-400 dark:text-slate-500 truncate max-w-[220px]">
                    — {activePeriodLabel}
                  </span>
                </div>
              </div>

              {/* Zone 2: Real-Time Global Search Bar Across Entire Loaded Dataset */}
              <div className="relative flex-1 max-w-md mx-1 sm:mx-2">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={navbarSearchQuery}
                    onFocus={() => setIsNavbarSearchFocused(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsNavbarSearchFocused(false), 180);
                    }}
                    onChange={(e) => handleNavbarSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        handleNavbarSearchChange('');
                      } else if (e.key === 'Enter' && hasActiveNavbarSearch) {
                        setIsNavbarSearchFocused(false);
                        setActiveTab('transactions');
                      }
                    }}
                    placeholder="Buscar transação em todo o histórico..."
                    aria-label="Buscar transações por descrição em tempo real"
                    className={`w-full pl-8 ${
                      hasActiveNavbarSearch ? 'pr-20' : 'pr-3'
                    } py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#192034] border ${
                      hasActiveNavbarSearch
                        ? 'border-[#1456FF] dark:border-[#E2FF1A] ring-1 ring-[#1456FF]/20 dark:ring-[#E2FF1A]/20'
                        : 'border-slate-200 dark:border-[#242F48]'
                    } rounded-full text-[#0A0E17] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1456FF] dark:focus:border-[#E2FF1A] transition-colors`}
                  />

                  {hasActiveNavbarSearch && (
                    <div className="absolute right-1.5 flex items-center gap-1">
                      <span
                        title={`${filteredTransactions.length} transações encontradas em todo o conjunto de dados`}
                        className="px-1.5 py-0.5 text-[10px] font-mono tabular-nums font-extrabold rounded-full bg-[#1456FF] text-[#E2FF1A]"
                      >
                        {filteredTransactions.length}/{transactions.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleNavbarSearchChange('')}
                        aria-label="Limpar busca"
                        className="p-0.5 rounded-full text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Instant Real-Time Search Results Dropdown across the entire loaded dataset */}
                {isNavbarSearchFocused && hasActiveNavbarSearch && (
                  <div
                    role="region"
                    aria-label="Resultados da busca em tempo real"
                    className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#242F48] rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="px-3 py-2 bg-[#F4F6FB] dark:bg-[#161D2F] border-b border-slate-200/80 dark:border-[#242F48] flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-slate-600 dark:text-slate-300 truncate">
                        Todo o Conjunto ({globalDatasetSearchResults.length} de {transactions.length})
                      </span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setActiveTab('transactions');
                          setIsNavbarSearchFocused(false);
                        }}
                        className="font-extrabold text-[#1456FF] dark:text-[#E2FF1A] hover:underline whitespace-nowrap"
                      >
                        Ver na tabela →
                      </button>
                    </div>

                    {globalDatasetSearchResults.length === 0 ? (
                      <div className="p-3.5 text-center text-xs text-slate-500 dark:text-slate-400">
                        Nenhuma transação encontrada para <strong>"{navbarSearchQuery}"</strong> em todo o conjunto de dados carregado.
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E273C]">
                        {globalDatasetSearchResults.slice(0, 6).map((tx) => (
                          <button
                            key={tx.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setActiveTab('transactions');
                              setIsNavbarSearchFocused(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-[#F4F6FB] dark:hover:bg-[#192034] flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0A0E17] dark:text-white truncate">
                                {tx.description}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {tx.dateIso.split('-').reverse().join('/')} · {tx.categoryName}
                              </div>
                            </div>
                            <span
                              className={`text-xs font-mono tabular-nums font-extrabold whitespace-nowrap shrink-0 ${
                                tx.type === 'income'
                                  ? 'text-emerald-600 dark:text-[#E2FF1A]'
                                  : 'text-[#0A0E17] dark:text-white'
                              }`}
                            >
                              {tx.type === 'income'
                                ? `+ ${formatBrlCents(tx.amountCents)}`
                                : `- ${formatBrlCents(tx.amountCents)}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Zone 3: PWA Install, Theme Toggle, User Profile & New Launch CTA */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <PWAInstallButton variant="navbar" />

                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-slate-200 dark:border-[#242F48] bg-[#F4F6FB] dark:bg-[#192034] text-[#0A0E17] dark:text-white hover:border-[#1456FF] dark:hover:border-[#E2FF1A] transition-colors whitespace-nowrap"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-[#E2FF1A]" />
                      <span className="hidden lg:inline">Modo Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-[#1456FF]" />
                      <span className="hidden lg:inline">Modo Escuro</span>
                    </>
                  )}
                </button>

                {currentUser ? (
                  <div className="flex items-center gap-2">
                    <div
                      title={currentUser.displayName || currentUser.email || ''}
                      className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-[#F4F6FB] dark:bg-[#192034] rounded-full border border-slate-200 dark:border-[#242F48] max-w-[150px]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#1456FF] text-[#E2FF1A] flex items-center justify-center text-[10px] font-black shrink-0 uppercase">
                        {(currentUser.displayName?.[0] || currentUser.email?.[0] || 'U')}
                      </span>
                      <span className="truncate">{currentUser.displayName || currentUser.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      title="Sair da conta e voltar ao login"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-[#F4F6FB] dark:bg-[#192034] rounded-full hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors whitespace-nowrap"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sair</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title="Encerrar modo convidado e ir para login"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-[#F4F6FB] dark:bg-[#192034] border border-slate-200 dark:border-[#242F48] rounded-full hover:border-[#1456FF] transition-colors whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#1456FF] dark:text-[#E2FF1A]" />
                    <span className="hidden lg:inline">Convidado · Sair</span>
                    <span className="lg:hidden">Sair</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditingTransaction(null);
                    setModalDefaultType('expense');
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-white bg-[#1456FF] rounded-full hover:bg-[#0E43D6] transition-colors whitespace-nowrap shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Novo Lançamento</span>
                  <span className="sm:hidden">Lançar</span>
                </button>
              </div>
            </div>

            {authErrorMsg && (
              <div className="max-w-7xl mx-auto mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                Aviso de autenticação: {authErrorMsg}
              </div>
            )}
          </header>

          {/* Offline Connectivity Indicator */}
          <OfflineIndicator />

          {/* Floating Non-Displacing Toast Feedback Banner */}
          {toastMessage && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
              <div
                role="status"
                className="pointer-events-auto flex items-center justify-between px-4 py-2 bg-[#1456FF] text-white text-xs font-bold rounded-full shadow-lg border border-white/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#E2FF1A] shrink-0" />
                  <span className="truncate">{toastMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-white/80 hover:text-white ml-3 font-extrabold shrink-0"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* Main Workspace Container with In-Page Filtering */}
          <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 overflow-y-auto overflow-x-hidden">
            {/* In-Page Filter Bar: Standard Months, All-Time & Custom Date/Nature/Category Filter */}
            <PageFilterBar
              criteria={filterCriteria}
              onChangeCriteria={setFilterCriteria}
              categories={categories}
              summary={filteredSummary}
              totalFilteredCount={filteredTransactions.length}
            />

            {activeTab === 'overview' && (
              <OverviewTab
                transactions={transactions}
                categories={categories}
                activeMonth={activeMonth}
                monthlyPlan={activePlan}
                onQuickLaunchPreset={handleQuickLaunchPreset}
                onOpenNewModal={(defaultType = 'expense') => {
                  setEditingTransaction(null);
                  setModalDefaultType(defaultType);
                  setIsModalOpen(true);
                }}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setIsModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onNavigateTab={setActiveTab}
                filteredTransactions={filteredTransactions}
                summary={filteredSummary}
                periodLabel={activePeriodLabel}
              />
            )}

            {activeTab === 'quick_launch' && (
              <QuickLaunchTab
                transactions={transactions}
                categories={categories}
                activeMonth={activeMonth}
                monthlyPlan={activePlan}
                onQuickLaunchPreset={handleQuickLaunchPreset}
                onOpenNewModal={(defaultType = 'expense') => {
                  setEditingTransaction(null);
                  setModalDefaultType(defaultType);
                  setIsModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onNavigateTab={setActiveTab}
                periodLabel={activePeriodLabel}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsTab
                transactions={transactions}
                categories={categories}
                activeMonth={activeMonth}
                onOpenNewModal={(defaultType = 'expense') => {
                  setEditingTransaction(null);
                  setModalDefaultType(defaultType);
                  setIsModalOpen(true);
                }}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setIsModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                filteredTransactions={filteredTransactions}
                periodLabel={activePeriodLabel}
                globalSearchQuery={navbarSearchQuery}
                onChangeGlobalSearchQuery={handleNavbarSearchChange}
              />
            )}

            {activeTab === 'categories' && (
              <CategoriesTab
                categories={categories}
                onCreateCategory={handleCreateCategory}
                onDeleteCategory={handleDeleteCategory}
                onQuickLaunchPreset={handleQuickLaunchPreset}
              />
            )}

            {activeTab === 'analysis' && (
              <MonthlyAnalysisTab
                transactions={transactions}
                categories={categories}
                activeMonth={activeMonth}
                monthlyPlan={activePlan}
                onSaveMonthlyPlan={handleSaveMonthlyPlan}
                onRecordSurplusAllocation={handleRecordSurplusAllocation}
                filteredTransactions={filteredTransactions}
                periodLabel={activePeriodLabel}
              />
            )}
          </main>

          {/* Bottom Navigation Bar: Visible ONLY on mobile screens (md:hidden) */}
          <nav
            aria-label="Navegação Principal Inferior"
            className="md:hidden shrink-0 bg-white dark:bg-[#111624] border-t border-slate-200/80 dark:border-[#1E273C] px-4 py-1.5 z-30 transition-colors"
          >
          <div className="max-w-xl mx-auto grid grid-cols-4 gap-2">
            {/* Botão 1: Visão Geral */}
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#1456FF] text-white font-extrabold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-[#F4F6FB] dark:hover:bg-[#192034] hover:text-[#0A0E17] dark:hover:text-white font-semibold'
              }`}
            >
              <LayoutGrid
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'overview' ? 'text-[#E2FF1A]' : 'text-[#1456FF] dark:text-[#E2FF1A]'
                }`}
              />
              <span className="text-[11px] leading-none truncate">Visão Geral</span>
            </button>

            {/* Botão 2: Gastos Padrões */}
            <button
              type="button"
              onClick={() => setActiveTab('quick_launch')}
              className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-colors ${
                activeTab === 'quick_launch'
                  ? 'bg-[#1456FF] text-white font-extrabold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-[#F4F6FB] dark:hover:bg-[#192034] hover:text-[#0A0E17] dark:hover:text-white font-semibold'
              }`}
            >
              <Zap
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'quick_launch' ? 'text-[#E2FF1A]' : 'text-[#1456FF] dark:text-[#E2FF1A]'
                }`}
              />
              <span className="text-[11px] leading-none truncate">Gastos Padrões</span>
            </button>

            {/* Botão 3: Entradas e Saídas */}
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-colors ${
                activeTab === 'transactions'
                  ? 'bg-[#1456FF] text-white font-extrabold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-[#F4F6FB] dark:hover:bg-[#192034] hover:text-[#0A0E17] dark:hover:text-white font-semibold'
              }`}
            >
              <ArrowLeftRight
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'transactions' ? 'text-[#E2FF1A]' : 'text-[#1456FF] dark:text-[#E2FF1A]'
                }`}
              />
              <span className="text-[11px] leading-none truncate">Entradas e Saídas</span>
            </button>

            {/* Botão 4: Aba Lateral */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir aba lateral com o restante dos recursos"
              className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-colors ${
                isSidebarOpen || activeTab === 'categories' || activeTab === 'analysis'
                  ? 'bg-[#1456FF] text-white font-extrabold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-[#F4F6FB] dark:hover:bg-[#192034] hover:text-[#0A0E17] dark:hover:text-white font-semibold'
              }`}
            >
              <Menu
                className={`w-4 h-4 shrink-0 ${
                  isSidebarOpen || activeTab === 'categories' || activeTab === 'analysis'
                    ? 'text-[#E2FF1A]'
                    : 'text-[#1456FF] dark:text-[#E2FF1A]'
                }`}
              />
              <span className="text-[11px] leading-none truncate">
                {activeTab === 'categories'
                  ? 'Tipos de Gastos'
                  : activeTab === 'analysis'
                  ? 'Análise & Sobras'
                  : 'Aba Lateral'}
              </span>
            </button>
          </div>
        </nav>

        {/* Lateral Drawer ("Aba Lateral" acessada pelo 4º botão) */}
        <SidebarDrawer
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeMonth={activeMonth}
          onChangeMonth={setActiveMonth}
          theme={theme}
          onToggleTheme={toggleTheme}
          currentUser={currentUser}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
          onOpenNewModal={(defaultType = 'expense') => {
            setEditingTransaction(null);
            setModalDefaultType(defaultType);
            setIsModalOpen(true);
          }}
          categoriesCount={categories.length}
          transactionsCount={filteredTransactions.length}
          netSurplusCents={filteredSummary.netSurplusCents}
        />

        {/* Transaction Modal */}
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          onSave={handleSaveTransaction}
          categories={categories}
          activeMonth={activeMonth}
          initialTransaction={editingTransaction}
          defaultType={modalDefaultType}
        />
        </div>
      </div>
    </ErrorBoundary>
  );
}
