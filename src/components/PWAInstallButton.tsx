import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, Monitor, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'sidebar' | 'drawer' | 'auth';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    if (variant === 'sidebar' || variant === 'drawer') {
      return (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>App SobraMais Instalado</span>
          </div>
          <span className="text-[10px] uppercase font-extrabold">PWA</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'navbar' && (
        <button
          type="button"
          onClick={handleClick}
          title="Instalar aplicativo SobraMais no dispositivo"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-full bg-[#E2FF1A] text-[#0A0E17] hover:bg-[#d5f20d] transition-colors whitespace-nowrap shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold bg-[#E2FF1A] text-[#0A0E17] hover:bg-[#d5f20d] transition-colors shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 shrink-0" />
            <span>Instalar App (PWA)</span>
          </div>
          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0A0E17]/10">
            Grátis
          </span>
        </button>
      )}

      {variant === 'drawer' && (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-between p-3.5 bg-[#E2FF1A] text-[#0A0E17] rounded-2xl text-xs font-extrabold hover:bg-[#d5f20d] transition-colors shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Instalar Aplicativo SobraMais</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#0A0E17] text-[#E2FF1A] text-[10px] font-black uppercase">
            Instalar
          </span>
        </button>
      )}

      {variant === 'auth' && (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-full bg-[#E2FF1A] text-[#0A0E17] hover:bg-[#d5f20d] transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Instalar App</span>
        </button>
      )}

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Como instalar o aplicativo SobraMais"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#1E273C] p-5 sm:p-6 shadow-2xl text-[#0A0E17] dark:text-white space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="./logo-icon.png"
                  alt="Ícone SobraMais"
                  className="w-12 h-12 rounded-2xl border border-slate-200 dark:border-[#242F48] shadow-xs object-contain bg-[#F6F8FC]"
                />
                <div>
                  <h3 className="text-base font-black font-display">
                    Instalar SobraMais (PWA)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Acesse direto da tela inicial com suporte offline
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Fechar guia de instalação"
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#192034]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await install();
                  if (ok) setShowGuideModal(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-[#1456FF] hover:bg-[#0D44D9] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors"
              >
                <Download className="w-4 h-4 text-[#E2FF1A]" />
                <span>Instalar Agora com 1 Clique</span>
              </button>
            )}

            <div className="space-y-2.5 text-xs">
              {isIOS ? (
                <div className="p-3.5 rounded-2xl bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200/80 dark:border-[#242F48] space-y-2">
                  <div className="font-extrabold text-[#1456FF] dark:text-[#E2FF1A] flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Como instalar no iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>
                      Toque no botão <strong>Compartilhar</strong>{' '}
                      <Share className="w-3.5 h-3.5 inline text-[#1456FF] dark:text-[#E2FF1A]" /> na barra do Safari.
                    </li>
                    <li>
                      Role as opções e toque em <strong>Adicionar à Tela de Início</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline text-[#1456FF] dark:text-[#E2FF1A]" />.
                    </li>
                    <li>
                      Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
                    </li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200/80 dark:border-[#242F48] space-y-1.5">
                    <div className="font-extrabold text-[#1456FF] dark:text-[#E2FF1A] flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>No Android (Chrome / Edge / Samsung):</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Abra o menu do navegador (<strong>⋮</strong>) e selecione{' '}
                      <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200/80 dark:border-[#242F48] space-y-1.5">
                    <div className="font-extrabold text-[#1456FF] dark:text-[#E2FF1A] flex items-center gap-1.5">
                      <Monitor className="w-4 h-4" />
                      <span>No Computador (Chrome / Edge):</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Clique no ícone de instalação <strong>(⊕ / Instalar SobraMais)</strong> no lado direito da barra de endereços do navegador.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-[#192034] hover:bg-slate-200 dark:hover:bg-[#242F48] text-xs font-extrabold text-slate-700 dark:text-slate-200 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-extrabold text-[#0A0E17] shadow-lg"
    >
      <span className="h-2 w-2 rounded-full bg-[#0A0E17] animate-pulse" />
      <span>Modo Offline — Usando dados salvos no dispositivo</span>
    </div>
  );
};
