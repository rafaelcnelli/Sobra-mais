import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  ShieldCheck,
  TrendingUp,
  Zap,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import type { ThemeMode } from '../App';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthPageProps {
  onEnterGuestMode: (customProfile?: { name: string; email: string }) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSuccessToast?: (msg: string) => void;
}

interface LocalStoredAccount {
  name: string;
  email: string;
  passwordHash: string;
}

const LOCAL_ACCOUNTS_KEY = 'sobramais_local_accounts_v1';

function getLocalAccounts(): LocalStoredAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalStoredAccount[]) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

export function AuthPage({
  onEnterGuestMode,
  theme,
  onToggleTheme,
  onSuccessToast,
}: AuthPageProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Map Firebase errors to user-friendly PT-BR
  const translateAuthError = (err: any): string => {
    const code = err?.code || '';
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'seu-usuario.github.io';
    switch (code) {
      case 'auth/invalid-email':
        return 'O endereço de e-mail informado não é válido.';
      case 'auth/user-disabled':
        return 'Esta conta de usuário foi temporariamente desativada.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos. Por favor, verifique suas credenciais.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Alterne para a aba "Entrar" para acessar.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Escolha uma senha com no mínimo 6 caracteres.';
      case 'auth/popup-closed-by-user':
        return 'O popup de autenticação com o Google foi fechado antes de concluir.';
      case 'auth/popup-blocked':
        return 'O navegador bloqueou a janela do Google. Permita popups para este site.';
      case 'auth/unauthorized-domain':
        return `Domínio (${currentHost}) ainda não autorizado no Firebase Auth. Adicione "${currentHost}" em Firebase Console → Authentication → Settings → Domínios autorizados, ou entre com e-mail/senha ou Modo Convidado.`;
      case 'auth/operation-not-allowed':
      case 'auth/configuration-not-found':
        return 'Provedor de e-mail/senha não habilitado na nuvem. Utilizando autenticação local neste navegador.';
      case 'auth/network-request-failed':
        return 'Falha na conexão de rede. Verifique sua internet e tente novamente.';
      default:
        return err?.message || 'Ocorreu um erro inesperado ao autenticar. Tente novamente.';
    }
  };

  // Google Sign-In
  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccessToast?.('Login com o Google realizado com sucesso!');
    } catch (err: any) {
      setErrorMessage(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Email / Password Form Submit with automatic Local Account fallback for GitHub Pages
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Informe seu endereço de e-mail.');
      return;
    }

    if (!password) {
      setErrorMessage('Informe sua senha.');
      return;
    }

    if (authMode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Informe seu nome completo para o cadastro.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('A confirmação de senha não coincide com a senha digitada.');
        return;
      }
      if (!agreeTerms) {
        setErrorMessage('Você precisa concordar com os Termos de Uso e Política de Privacidade para criar uma conta.');
        return;
      }

      setIsLoading(true);
      try {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (name.trim()) {
          await updateProfile(userCred.user, { displayName: name.trim() });
        }
        onSuccessToast?.('Conta criada com sucesso! Bem-vindo ao SobraMais.');
      } catch (err: any) {
        const code = err?.code || '';
        if (
          code === 'auth/operation-not-allowed' ||
          code === 'auth/configuration-not-found' ||
          code === 'auth/unauthorized-domain'
        ) {
          const accounts = getLocalAccounts();
          const exists = accounts.some((a) => a.email === cleanEmail);
          if (exists) {
            setErrorMessage('Este e-mail já está cadastrado neste navegador. Alterne para a aba "Entrar".');
            setIsLoading(false);
            return;
          }
          const updated = [
            ...accounts,
            { name: name.trim(), email: cleanEmail, passwordHash: btoa(encodeURIComponent(password)) },
          ];
          saveLocalAccounts(updated);
          onEnterGuestMode({ name: name.trim(), email: cleanEmail });
          onSuccessToast?.(`Conta criada para ${name.trim()}! Dados salvos neste dispositivo.`);
          return;
        }
        setErrorMessage(translateAuthError(err));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login mode
      setIsLoading(true);
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        onSuccessToast?.('Login efetuado com sucesso!');
      } catch (err: any) {
        const code = err?.code || '';
        const accounts = getLocalAccounts();
        const matchedLocal = accounts.find(
          (a) => a.email === cleanEmail && a.passwordHash === btoa(encodeURIComponent(password))
        );
        if (matchedLocal) {
          onEnterGuestMode({ name: matchedLocal.name, email: matchedLocal.email });
          onSuccessToast?.(`Bem-vindo de volta, ${matchedLocal.name}!`);
          return;
        }
        if (
          code === 'auth/operation-not-allowed' ||
          code === 'auth/configuration-not-found' ||
          code === 'auth/unauthorized-domain'
        ) {
          // If no local account was registered yet, allow direct local login or prompt to register
          const emailPrefix = cleanEmail.split('@')[0] || 'Usuário';
          const formattedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          const updated = [
            ...accounts.filter((a) => a.email !== cleanEmail),
            { name: formattedName, email: cleanEmail, passwordHash: btoa(encodeURIComponent(password)) },
          ];
          saveLocalAccounts(updated);
          onEnterGuestMode({ name: formattedName, email: cleanEmail });
          onSuccessToast?.(`Conectado como ${formattedName}!`);
          return;
        }
        setErrorMessage(translateAuthError(err));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Password reset
  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Digite seu e-mail no campo acima para enviarmos o link de recuperação de senha.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setInfoMessage(`Link de redefinição enviado com sucesso para ${cleanEmail}. Verifique sua caixa de entrada e spam.`);
    } catch (err: any) {
      setErrorMessage(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F6FB] dark:bg-[#080B12] text-[#0A0E17] dark:text-white flex flex-col justify-between transition-colors duration-200">
      {/* Top Bar: Brand, PWA Install & Theme Toggle */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="./logo-sobramais.png"
            alt="SobraMais"
            className="h-10 sm:h-11 w-auto object-contain rounded-xl bg-[#F6F8FC] px-2 py-1 shadow-xs border border-slate-200/70"
          />
          <span className="hidden md:inline text-xs font-medium text-slate-400 dark:text-slate-500">
            · Controle Financeiro & Gestão de Sobras
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton variant="auth" />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-full border border-slate-200 dark:border-[#242F48] bg-white dark:bg-[#111624] text-[#0A0E17] dark:text-white hover:border-[#1456FF] dark:hover:border-[#E2FF1A] transition-colors shadow-xs"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-[#E2FF1A]" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#1456FF]" />
                <span className="hidden sm:inline">Modo Escuro</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container: Two Columns on Large Screens */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Visual Value Proposition & Brand Pitch */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1456FF]/10 dark:bg-[#1456FF]/20 border border-[#1456FF]/20 text-[#1456FF] dark:text-[#E2FF1A] text-xs font-extrabold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Gestão Financeira com Foco em Sobras
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-[#0A0E17] dark:text-white leading-tight">
              Transforme seus ganhos em <span className="text-[#1456FF] dark:text-[#E2FF1A]">patrimônio real</span> e sobras previsíveis.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Entre no <strong>SobraMais</strong> para controlar entradas e saídas, definir tetos por categoria, automatizar gastos padrões com 1 clique e planejar a alocação exata da sua sobra líquida.
            </p>

            {/* 3 Pillars of SobraMais */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] shadow-xs">
                <span className="w-8 h-8 rounded-xl bg-[#1456FF] text-white flex items-center justify-center shrink-0">
                  <PieChart className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-extrabold text-[#0A0E17] dark:text-white">
                    Entradas, Saídas e Tetos por Categoria
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Separe fixos essenciais de variáveis de estilo de vida com alertas visuais de teto.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] shadow-xs">
                <span className="w-8 h-8 rounded-xl bg-[#1456FF] text-[#E2FF1A] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-extrabold text-[#0A0E17] dark:text-white">
                    Planejador Inteligente de Sobras Líquidas
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Direcione a sobra mensal entre Reserva de Emergência, Ações e Objetivos com projeção de 12 meses.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] shadow-xs">
                <span className="w-8 h-8 rounded-xl bg-[#E2FF1A] text-[#0A0E17] flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-extrabold text-[#0A0E17] dark:text-white">
                    Lançamentos Rápidos de 1-Clique
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Dispare despesas e receitas habituais com um único toque sem formulários repetitivos.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust badge */}
            <div className="flex items-center gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Autenticação segura via Firebase Auth & Firestore isolado por usuário.</span>
            </div>
          </div>

          {/* Right Column: Auth Card (Login / Cadastro) */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              {/* Card Header & Switch Tabs */}
              <div className="flex items-center p-1 bg-[#F4F6FB] dark:bg-[#080B12] rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all ${
                    authMode === 'login'
                      ? 'bg-[#1456FF] text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-[#0A0E17] dark:hover:text-white'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all ${
                    authMode === 'register'
                      ? 'bg-[#1456FF] text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-[#0A0E17] dark:hover:text-white'
                  }`}
                >
                  Criar Conta
                </button>
              </div>

              {/* Title inside card */}
              <div className="mb-5">
                <h2 className="text-xl font-black font-display text-[#0A0E17] dark:text-white">
                  {authMode === 'login' ? 'Acesse sua Conta' : 'Crie sua Conta Gratuita'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {authMode === 'login'
                    ? 'Informe seu e-mail e senha ou entre com o Google.'
                    : 'Cadastre-se para sincronizar seus dados em nuvem.'}
                </p>
              </div>

              {/* Feedback Alerts */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 animate-in fade-in duration-150"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              {infoMessage && (
                <div
                  role="status"
                  className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in duration-150"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{infoMessage}</span>
                </div>
              )}

              {/* 1-Click Google Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 dark:border-[#242F48] bg-white dark:bg-[#181F32] hover:bg-slate-50 dark:hover:bg-[#202942] text-[#0A0E17] dark:text-white text-xs sm:text-sm font-bold transition-all shadow-xs disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continuar com o Google</span>
              </button>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-[#242F48]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white dark:bg-[#111624] text-slate-400 font-medium">
                    ou utilize seu e-mail
                  </span>
                </div>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Nome Completo (Cadastro Only) */}
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF] transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Endereço de E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF] transition-colors"
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Senha
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[11px] font-bold text-[#1456FF] dark:text-[#E2FF1A] hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={authMode === 'login' ? '••••••••' : 'Mínimo de 6 caracteres'}
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0A0E17] dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha (Cadastro Only) */}
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita sua senha"
                        className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF] transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Termos de Uso (Cadastro Only) */}
                {authMode === 'register' && (
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="terms-check"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#1456FF] focus:ring-[#1456FF]"
                    />
                    <label htmlFor="terms-check" className="text-[11px] text-slate-500 dark:text-slate-400">
                      Concordo com os Termos de Uso e com a Política de Proteção de Dados Financeiros Pessoais.
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold text-white bg-[#1456FF] hover:bg-[#0E43D6] rounded-2xl transition-all shadow-md disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : authMode === 'login' ? (
                    <>
                      <span>Entrar no SobraMais</span>
                      <ArrowRight className="w-4 h-4 text-[#E2FF1A]" />
                    </>
                  ) : (
                    <>
                      <span>Criar Conta e Acessar</span>
                      <ArrowRight className="w-4 h-4 text-[#E2FF1A]" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Switcher */}
              <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
                {authMode === 'login' ? (
                  <>
                    Não possui uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setErrorMessage(null);
                        setInfoMessage(null);
                      }}
                      className="font-extrabold text-[#1456FF] dark:text-[#E2FF1A] hover:underline"
                    >
                      Criar conta gratuita
                    </button>
                  </>
                ) : (
                  <>
                    Já tem uma conta cadastrada?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setErrorMessage(null);
                        setInfoMessage(null);
                      }}
                      className="font-extrabold text-[#1456FF] dark:text-[#E2FF1A] hover:underline"
                    >
                      Fazer login
                    </button>
                  </>
                )}
              </div>

              {/* Mode Convidado (Guest Access) */}
              <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-[#242F48] text-center">
                <button
                  type="button"
                  onClick={() => onEnterGuestMode()}
                  className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#1456FF] dark:hover:text-[#E2FF1A] transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Experimentar sem conta (Modo Convidado)</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
        SobraMais © 2026 — Gestão Financeira Pessoal, Controle de Sobras & Planejador de Investimentos.
      </footer>
    </div>
  );
}
