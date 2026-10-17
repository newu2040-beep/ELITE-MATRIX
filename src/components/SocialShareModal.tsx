import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  Film,
  ExternalLink,
  Sparkles,
  Smartphone,
  Video,
} from 'lucide-react';
import { useToast } from './Toast';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl: string;
  downloadUrl: string;
  resolution?: string;
  fps?: number | string;
  codec?: string;
  duration?: number;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  title,
  videoUrl,
  downloadUrl,
  resolution = '4K UHD',
  fps = 60,
  codec = 'H.264',
  duration = 10,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fullShareUrl = typeof window !== 'undefined' ? `${window.location.origin}${downloadUrl}` : downloadUrl;
  const captionText = `Enhanced in pristine ${resolution} (${fps} FPS · ${codec}) using ELITE MATRIX Mobile Studio #elitematrix #remaster #4k #60fps #opticalflow`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopied(true);
      showToast('Master video link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `EliteMatrix Enhanced: ${title}`,
          text: captionText,
          url: fullShareUrl,
        });
        showToast('Shared successfully!', 'success');
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          showToast('Native share opened', 'info');
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const platforms = [
    {
      id: 'tiktok',
      name: 'TikTok',
      color: '#00F2FE',
      bgColor: 'rgba(0, 242, 254, 0.1)',
      border: 'rgba(0, 242, 254, 0.3)',
      subtitle: '9:16 Vertical · 60 FPS Optical Flow',
      icon: '🎵',
      action: () => {
        handleCopyLink();
        window.open('https://www.tiktok.com/upload', '_blank', 'noopener,noreferrer');
        showToast('Opening TikTok Upload (Link copied)', 'info');
      },
    },
    {
      id: 'reels',
      name: 'Instagram Reels',
      color: '#E1306C',
      bgColor: 'rgba(225, 48, 108, 0.1)',
      border: 'rgba(225, 48, 108, 0.3)',
      subtitle: 'Reels / Stories · 1080×1920 HDR',
      icon: '📸',
      action: () => {
        handleNativeShare();
      },
    },
    {
      id: 'shorts',
      name: 'YouTube Shorts',
      color: '#FF0000',
      bgColor: 'rgba(255, 0, 0, 0.1)',
      border: 'rgba(255, 0, 0, 0.3)',
      subtitle: 'Shorts & Studio 4K60 Upload',
      icon: '▶️',
      action: () => {
        window.open('https://studio.youtube.com/channel/videos/upload?d=sd', '_blank', 'noopener,noreferrer');
        showToast('Opening YouTube Studio Upload', 'info');
      },
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp HD',
      color: '#25D366',
      bgColor: 'rgba(37, 211, 102, 0.1)',
      border: 'rgba(37, 211, 102, 0.3)',
      subtitle: 'Direct HD Video Chat & Status',
      icon: '💬',
      action: () => {
        const text = encodeURIComponent(`Watch this enhanced ${resolution} ${fps}FPS video: ${fullShareUrl}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
      },
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      color: '#38BDF8',
      bgColor: 'rgba(56, 189, 248, 0.1)',
      border: 'rgba(56, 189, 248, 0.3)',
      subtitle: 'Viral 60 FPS Feed Post',
      icon: '𝕏',
      action: () => {
        const text = encodeURIComponent(captionText);
        const url = encodeURIComponent(fullShareUrl);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
      },
    },
    {
      id: 'telegram',
      name: 'Telegram',
      color: '#229ED9',
      bgColor: 'rgba(34, 158, 217, 0.1)',
      border: 'rgba(34, 158, 217, 0.3)',
      subtitle: 'Lossless Uncompressed Channel Video',
      icon: '✈️',
      action: () => {
        const text = encodeURIComponent(captionText);
        const url = encodeURIComponent(fullShareUrl);
        window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
      },
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2e2e2e)] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle,#282828)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-subtle,rgba(199,244,100,0.12))] text-[var(--accent,#C7F464)] flex items-center justify-center">
                <Share2 className="w-4 h-4 stroke-[2.4]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary,#F5F4F0)]">
                  Share Enhanced Master
                </h3>
                <p className="text-[11px] text-[var(--text-muted,#888888)]">
                  {resolution} · {fps} FPS · {codec} · {duration.toFixed(1)}s
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

          {/* Master Device Share Banner */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleNativeShare}
            className="w-full p-3.5 rounded-2xl bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-[var(--accent-glow,rgba(199,244,100,0.2))] cursor-pointer hover:opacity-95 transition-all"
          >
            <Smartphone className="w-4 h-4 stroke-[2.4]" />
            <span>Open Phone Share Sheet (TikTok, Reels, Apps)</span>
          </motion.button>

          {/* 1-Click Platform Grid */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-muted,#888888)] uppercase tracking-wider block">
              Direct Platform Destination
            </span>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((p) => (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  key={p.id}
                  onClick={p.action}
                  className="p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer group hover:border-[var(--accent,#C7F464)]"
                  style={{
                    backgroundColor: 'var(--bg-primary, #171717)',
                    borderColor: 'var(--border-subtle, #282828)',
                  }}
                >
                  <span className="text-lg leading-none shrink-0 mt-0.5">{p.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-[var(--text-primary,#F5F4F0)] group-hover:text-[var(--accent,#C7F464)] transition-colors truncate">
                        {p.name}
                      </p>
                      <ExternalLink className="w-3 h-3 text-[var(--text-muted,#666666)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted,#888888)] truncate mt-0.5">
                      {p.subtitle}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Shareable Link Box */}
          <div className="p-3 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#282828)] rounded-xl space-y-1.5">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted,#888888)]">
              Direct Stream & Master Link
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullShareUrl}
                className="flex-1 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#282828)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted,#888888)] font-mono truncate select-all"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface-elevated,#282828)] hover:bg-[var(--border-strong,#333333)] border border-[var(--border-strong,#3a3a3a)] text-xs font-semibold text-[var(--accent,#C7F464)] flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </motion.button>
            </div>
          </div>

          {/* Direct Download Button */}
          <div className="pt-1">
            <a
              href={downloadUrl}
              download
              className="w-full h-11 rounded-xl bg-[var(--bg-surface-elevated,#262626)] hover:bg-[var(--border-strong,#333333)] border border-[var(--border-strong,#3a3a3a)] text-xs font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <span>Download Master to Device Storage</span>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
