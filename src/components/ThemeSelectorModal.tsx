import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Palette, Check, Sparkles, Sun, Moon } from 'lucide-react';
import { useTheme, PASTEL_THEMES, PastelPalette } from '../context/ThemeContext';
import { useToast } from './Toast';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ isOpen, onClose }) => {
  const { theme, palette, setPalette, setColorMode } = useTheme();
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSelectPalette = (pId: PastelPalette, pName: string) => {
    setPalette(pId);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(12); } catch {}
    }
    showToast(`Switched theme to ${pName}`, 'success');
  };

  const pastelThemes = PASTEL_THEMES.filter((t) =>
    ['blush', 'sage', 'lavender', 'sky', 'buttercup', 'mint_creme', 'sakura', 'sorbet', 'lilac', 'glacier', 'champagne', 'dune'].includes(t.id)
  );

  const boldThemes = PASTEL_THEMES.filter((t) =>
    ['titanium', 'obsidian_gold', 'electric_cyan', 'bold_crimson', 'neo_brutalist', 'matcha'].includes(t.id)
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle,#282828)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-subtle,rgba(199,244,100,0.1))] text-[var(--accent,#C7F464)] flex items-center justify-center">
                <Palette className="w-4 h-4 stroke-[2.4]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary,#F5F4F0)]">
                  Pastel & Bold Studio Themes
                </h3>
                <p className="text-[11px] text-[var(--text-muted,#888888)]">
                  Instant real-time theme & colorway switching
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--bg-surface-elevated,#2a2a2a)] text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Color Mode Switcher (Dark / Light) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#282828)]">
            <span className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent,#C7F464)]" /> Lighting Mode
            </span>
            <div className="flex items-center gap-1 bg-[var(--bg-surface,#202020)] p-1 rounded-lg border border-[var(--border-subtle,#282828)]">
              <button
                type="button"
                onClick={() => setColorMode('dark')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)]'
                    : 'text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]'
                }`}
              >
                <Moon className="w-3 h-3" /> Dark
              </button>
              <button
                type="button"
                onClick={() => setColorMode('light')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  theme === 'light'
                    ? 'bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)]'
                    : 'text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]'
                }`}
              >
                <Sun className="w-3 h-3" /> Light
              </button>
            </div>
          </div>

          {/* Bold & High-Contrast Themes */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[var(--text-muted,#888888)] uppercase tracking-wider block">
              Bold & High-Contrast Studio Noir
            </span>
            <div className="grid grid-cols-2 gap-2">
              {boldThemes.map((t) => {
                const isSelected = palette === t.id;
                return (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectPalette(t.id, t.name)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 relative overflow-hidden ${
                      isSelected
                        ? 'border-[var(--accent,#C7F464)] ring-1 ring-[var(--accent,#C7F464)] bg-[var(--bg-surface-elevated,#262626)]'
                        : 'border-[var(--border-subtle,#282828)] bg-[var(--bg-primary,#171717)] hover:border-[var(--border-strong,#383838)]'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full shrink-0 shadow-md mt-0.5 border border-white/20 flex items-center justify-center"
                      style={{ backgroundColor: t.accentColor }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-[var(--accent,#C7F464)]' : 'text-[var(--text-primary,#F5F4F0)]'}`}>
                        {t.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted,#888888)] truncate mt-0.5">
                        {t.subtitle}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Delicate Pastel Themes */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[var(--text-muted,#888888)] uppercase tracking-wider block">
              Pastel Aesthetic Colorways
            </span>
            <div className="grid grid-cols-2 gap-2">
              {pastelThemes.map((t) => {
                const isSelected = palette === t.id;
                return (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectPalette(t.id, t.name)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 relative overflow-hidden ${
                      isSelected
                        ? 'border-[var(--accent,#C7F464)] ring-1 ring-[var(--accent,#C7F464)] bg-[var(--bg-surface-elevated,#262626)]'
                        : 'border-[var(--border-subtle,#282828)] bg-[var(--bg-primary,#171717)] hover:border-[var(--border-strong,#383838)]'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full shrink-0 shadow-md mt-0.5 border border-white/20 flex items-center justify-center"
                      style={{ backgroundColor: t.accentColor }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-[var(--accent,#C7F464)]' : 'text-[var(--text-primary,#F5F4F0)]'}`}>
                        {t.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted,#888888)] truncate mt-0.5">
                        {t.subtitle}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
