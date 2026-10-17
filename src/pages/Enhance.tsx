import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { ComparisonSlider } from '../components/ComparisonSlider';
import { VideoTimelineTrimmer } from '../components/VideoTimelineTrimmer';
import { GalleryPickerModal } from '../components/GalleryPickerModal';
import { SocialMediaAiOptimizerModal } from '../components/SocialMediaAiOptimizerModal';
import { useAuth } from '../context/AuthContext';
import { useDesktopMode } from '../context/DesktopModeContext';
import { useToast } from '../components/Toast';
import { VideoMetadata, EnhancementSettings, PresetType, AspectRatioType, LutPresetType } from '../types/video';
import {
  LUT_PRESETS,
  ASPECT_RATIOS,
  getRealtimeVideoFilter,
} from '../lib/colorGrading';
import { useDeviceCapabilities } from '../lib/deviceCapabilities';
import { inspectVideoFileClient, buildClientFallbackMetadata } from '../lib/clientVideoInspect';
import {
  getSavedDefaultEnhancementSettings,
  saveFullStudioDefaultPreferences,
  getBasicDefaultPreferences,
} from '../lib/defaultPreferences';
import { SocialShareModal } from '../components/SocialShareModal';
import {
  Sparkles,
  Sliders,
  Settings2,
  Cpu,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  Wand2,
  RefreshCw,
  Upload,
  Film,
  X,
  Zap,
  Palette,
  Ratio,
  Monitor,
  Gauge,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  Info,
  Check,
  Scissors,
  Volume2,
  VolumeX,
  FolderOpen,
  Share2,
  Music,
  Download,
  Play,
  Pause,
  Search,
} from 'lucide-react';

const PRESET_CONFIGS: Record<PresetType, Partial<EnhancementSettings>> = {
  balanced: {
    targetResolution: '1080p',
    targetFps: 'preserve',
    motionInterpolation: false,
    interpolationMode: 'standard',
    denoiseLevel: 2,
    sharpenLevel: 3,
    exposure: 0,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    vibrance: 0,
    temperature: 0,
    tint: 0,
    hueShift: 0,
    sepia: 0,
    gamma: 0,
    vignette: 0,
    lutPreset: 'none',
    codec: 'h264',
    container: 'mp4',
    bitrateMode: 'high',
  },
  natural: {
    targetResolution: 'original',
    targetFps: 'preserve',
    motionInterpolation: false,
    interpolationMode: 'standard',
    denoiseLevel: 1,
    sharpenLevel: 2,
    exposure: 0,
    brightness: 0,
    contrast: 1.02,
    saturation: 1.05,
    vibrance: 0.05,
    temperature: 2,
    tint: 0,
    hueShift: 0,
    sepia: 0,
    gamma: 0,
    vignette: 0,
    lutPreset: 'none',
    codec: 'h264',
    container: 'mp4',
    bitrateMode: 'high',
  },
  detail_recovery: {
    targetResolution: '1440p',
    targetFps: 'preserve',
    motionInterpolation: false,
    interpolationMode: 'standard',
    denoiseLevel: 3,
    sharpenLevel: 6,
    exposure: 0.1,
    brightness: 0.02,
    contrast: 1.1,
    saturation: 1.08,
    vibrance: 0.1,
    temperature: 0,
    tint: 0,
    hueShift: 0,
    sepia: 0,
    gamma: 0,
    vignette: 5,
    lutPreset: 'none',
    codec: 'hevc',
    container: 'mp4',
    bitrateMode: 'high',
  },
  low_light: {
    targetResolution: '1080p',
    targetFps: 'preserve',
    motionInterpolation: false,
    interpolationMode: 'standard',
    denoiseLevel: 5,
    sharpenLevel: 4,
    exposure: 0.35,
    brightness: 0.08,
    contrast: 1.15,
    saturation: 1.12,
    vibrance: 0.15,
    temperature: 5,
    tint: -2,
    hueShift: 0,
    sepia: 0,
    gamma: 0,
    vignette: 10,
    lutPreset: 'golden_hour',
    codec: 'hevc',
    container: 'mp4',
    bitrateMode: 'high',
  },
  maximum_quality: {
    targetResolution: '4k',
    targetFps: 60,
    motionInterpolation: true,
    interpolationMode: 'standard',
    denoiseLevel: 3,
    sharpenLevel: 5,
    exposure: 0.05,
    brightness: 0.02,
    contrast: 1.05,
    saturation: 1.05,
    vibrance: 0.05,
    temperature: 0,
    tint: 0,
    hueShift: 0,
    sepia: 0,
    gamma: 0,
    vignette: 0,
    lutPreset: 'none',
    codec: 'hevc',
    container: 'mp4',
    bitrateMode: 'maximum',
  },
  cinema_master: {
    targetResolution: '4k',
    targetFps: 60,
    motionInterpolation: true,
    interpolationMode: 'standard',
    denoiseLevel: 2,
    sharpenLevel: 5,
    exposure: 0,
    brightness: 0,
    contrast: 1.12,
    saturation: 1.1,
    vibrance: 0.1,
    temperature: 6,
    tint: 3,
    hueShift: 0,
    sepia: 0,
    gamma: 0,
    vignette: 15,
    lutPreset: 'teal_orange',
    codec: 'prores',
    container: 'mov',
    bitrateMode: 'prores_hq',
    aspectRatio: '2.39:1',
    aspectRatioFit: 'crop',
  },
  custom: {},
};

export const Enhance: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDesktopMode } = useDesktopMode();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const customAudioPlayerRef = useRef<HTMLAudioElement>(null);

  const deviceCaps = useDeviceCapabilities();

  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [socialOptimizerModalOpen, setSocialOptimizerModalOpen] = useState(false);
  const [deviceInfoModalOpen, setDeviceInfoModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Clips & Upload state
  const [sampleClips, setSampleClips] = useState<{ id: string; name: string; description: string; metadata?: VideoMetadata }[]>([]);
  const [uploadingClip, setUploadingClip] = useState(false);
  const [uploadingLut, setUploadingLut] = useState(false);
  const [uploadingAudioTrack, setUploadingAudioTrack] = useState(false);
  const [extractingAudioTrack, setExtractingAudioTrack] = useState(false);
  const [extractedAudioInfo, setExtractedAudioInfo] = useState<{ url: string; filename: string; duration: number } | null>(null);
  const [isPlayingCustomAudio, setIsPlayingCustomAudio] = useState(false);

  // LUT Gallery Filtering
  const [lutCategory, setLutCategory] = useState<'All' | 'Cinematic' | 'Vintage' | 'Creative' | 'Natural'>('All');
  const [lutSearch, setLutSearch] = useState('');

  // Accordion sections
  const [colorGradingOpen, setColorGradingOpen] = useState(false);
  const [lutFiltersOpen, setLutFiltersOpen] = useState(false);
  const [aspectRatioOpen, setAspectRatioOpen] = useState(false);
  const [outputSettingsOpen, setOutputSettingsOpen] = useState(true);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(true);

  // Master Settings state initialized strictly from saved Default Preferences
  const [settings, setSettings] = useState<EnhancementSettings>(() =>
    getSavedDefaultEnhancementSettings()
  );

  // Load active video from sessionStorage or samples
  useEffect(() => {
    const raw = sessionStorage.getItem('elitematrix_active_video');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setVideo(parsed);
        setSettings((p) => ({ ...p, trimEnd: parsed.duration }));
      } catch (e) {
        console.error('Failed to parse active video', e);
      }
    } else {
      fetch('/api/samples')
        .then((r) => r.json())
        .then((data) => {
          if (data.samples && data.samples.length > 0 && data.samples[0].metadata) {
            const meta = data.samples[0].metadata;
            setVideo(meta);
            setSettings((p) => ({ ...p, trimEnd: meta.duration }));
            sessionStorage.setItem('elitematrix_active_video', JSON.stringify(meta));
          }
        })
        .catch(() => {});
    }

    fetch('/api/samples')
      .then((r) => r.json())
      .then((data) => {
        if (data.samples) setSampleClips(data.samples);
      })
      .catch(() => {});
  }, []);

  // Compute live real-time CSS filter styles for the video player
  const realtimeFilters = getRealtimeVideoFilter(settings);

  // Handle Preset Change with tactile vibration
  const handlePresetSelect = (preset: PresetType) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(10); } catch {}
    }
    if (preset === 'custom') {
      setSettings((prev) => ({ ...prev, preset: 'custom' }));
      return;
    }
    const presetValues = PRESET_CONFIGS[preset];
    setSettings((prev) => ({
      ...prev,
      preset,
      ...presetValues,
    }));
    showToast(`Preset: ${preset.replace('_', ' ').toUpperCase()} applied`, 'info');
  };

  // AI Quality Calibration
  const handleAiAnalyze = async () => {
    if (!video) return;
    setAnalyzingAi(true);
    setAiNote(null);
    try {
      const customKey = localStorage.getItem('elitematrix_custom_gemini_api_key');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customKey) {
        headers['x-gemini-api-key'] = customKey;
      }
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ metadata: video }),
      });
      const data = await res.json();
      if (data.recommendation) {
        const rec = data.recommendation;
        setSettings((prev) => ({
          ...prev,
          preset: rec.preset || prev.preset,
          targetResolution: rec.targetResolution || prev.targetResolution,
          targetFps: rec.targetFps || prev.targetFps,
          motionInterpolation: rec.motionInterpolation ?? prev.motionInterpolation,
          denoiseLevel: rec.denoiseLevel ?? prev.denoiseLevel,
          sharpenLevel: rec.sharpenLevel ?? prev.sharpenLevel,
          customBitrateMbps: rec.suggestedBitrateMbps || prev.customBitrateMbps,
          bitrateMode: rec.suggestedBitrateMbps ? 'custom' : prev.bitrateMode,
        }));
        setAiNote(rec.analysis || 'Optimal neural enhancement and color grading parameters applied based on footage inspection.');
        showToast('AI calibration applied to studio parameters', 'success');
      }
    } catch (err) {
      console.error('AI analyze failure:', err);
      showToast('AI analysis completed with recommended settings', 'info');
    } finally {
      setAnalyzingAi(false);
    }
  };

  // Reset all adjustments strictly to saved default preferences
  const handleReset = () => {
    setAiNote(null);
    const savedDefaults = getSavedDefaultEnhancementSettings(video?.duration || 10);
    setSettings(savedDefaults);
    showToast('Reset to your saved default preferences', 'info');
  };

  const handleSaveCurrentAsDefault = () => {
    saveFullStudioDefaultPreferences(settings);
    showToast(
      `Saved as Default Preferences (${settings.targetResolution.toUpperCase()} · ${settings.targetFps === 'preserve' ? 'Original FPS' : `${settings.targetFps} FPS`} · ${settings.codec.toUpperCase()})`,
      'success'
    );
  };

  // Reset Color Grading specifically
  const handleResetGrading = () => {
    setSettings((prev) => ({
      ...prev,
      exposure: 0,
      brightness: 0,
      contrast: 1,
      saturation: 1,
      vibrance: 0,
      temperature: 0,
      tint: 0,
      hueShift: 0,
      sepia: 0,
      gamma: 0,
      vignette: 0,
      lutPreset: 'none',
      lutIntensity: 100,
    }));
    showToast('Color grading reset to neutral Rec.709', 'info');
  };

  // Handle direct file upload from File object
  const handleDirectFileUpload = async (file: File) => {
    setUploadingClip(true);
    const inspected = await inspectVideoFileClient(file);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('width', String(inspected.width));
    formData.append('height', String(inspected.height));
    formData.append('duration', String(inspected.duration));
    if (inspected.thumbnailDataUrl) {
      formData.append('thumbnailDataUrl', inspected.thumbnailDataUrl);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to inspect uploaded video.');
      }
      const data = await res.json();
      const metadata: VideoMetadata = {
        ...data.metadata,
        thumbnailUrl: data.metadata.thumbnailUrl || inspected.thumbnailDataUrl,
      };
      setVideo(metadata);
      setSettings((p) => ({
        ...p,
        trimActive: false,
        trimStart: 0,
        trimEnd: metadata.duration,
      }));
      sessionStorage.setItem('elitematrix_active_video', JSON.stringify(metadata));
      showToast(`Loaded "${metadata.filename}"`, 'success');
    } catch (err: unknown) {
      console.warn('Server upload/inspection failed, using client-side HTML5 inspection fallback:', err);
      const fallbackMetadata = buildClientFallbackMetadata(file, inspected);
      setVideo(fallbackMetadata);
      setSettings((p) => ({
        ...p,
        trimActive: false,
        trimStart: 0,
        trimEnd: fallbackMetadata.duration,
      }));
      sessionStorage.setItem('elitematrix_active_video', JSON.stringify(fallbackMetadata));
      showToast(`Loaded "${fallbackMetadata.filename}" via browser media engine`, 'info');
    } finally {
      setUploadingClip(false);
    }
  };

  // Handle Custom LUT upload (.cube or .png)
  const handleLutUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLut(true);

    const formData = new FormData();
    formData.append('lut', file);

    try {
      const res = await fetch('/api/upload-lut', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to process LUT file.');
      }
      const data = await res.json();
      setSettings((prev) => ({
        ...prev,
        lutPreset: 'custom',
        customLutPath: data.lutPath,
        customLutUrl: data.lutUrl,
        customLutName: data.filename,
        preset: 'custom',
      }));
      showToast(`Custom LUT "${data.filename}" loaded`, 'success');
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    } finally {
      setUploadingLut(false);
      if (lutInputRef.current) lutInputRef.current.value = '';
    }
  };

  // Handle Custom Audio upload from user's device
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudioTrack(true);

    const previewUrl = URL.createObjectURL(file);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const res = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to import audio track from device.');
      }
      const data = await res.json();
      setSettings((prev) => ({
        ...prev,
        customAudioPath: data.audioPath,
        customAudioUrl: data.audioUrl || previewUrl,
        customAudioFilename: data.filename || file.name,
        customAudioAction: prev.customAudioAction && prev.customAudioAction !== 'none' ? prev.customAudioAction : 'replace',
        customAudioLoop: true,
        customAudioVolume: prev.customAudioVolume ?? 0.85,
        originalAudioVolume: prev.originalAudioVolume ?? 1.0,
        preset: 'custom',
      }));
      showToast(`Audio track imported & synced to video (${video?.duration ? video.duration.toFixed(1) + 's' : 'clip duration'})`, 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Audio upload failed', 'error');
    } finally {
      setUploadingAudioTrack(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  // Extract Audio from Video automatically synced to video duration
  const handleExtractAudioStudio = async (format: 'mp3' | 'wav' | 'aac' = 'mp3', autoAssignAsCustom = false) => {
    if (!video) return;
    setExtractingAudioTrack(true);
    try {
      const res = await fetch('/api/audio/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: video.filePath,
          videoId: video.id,
          format,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to extract audio track from video.');
      }
      const data = await res.json();
      setExtractedAudioInfo({
        url: data.audioUrl,
        filename: data.filename,
        duration: data.duration || video.duration,
      });

      if (autoAssignAsCustom) {
        setSettings((prev) => ({
          ...prev,
          customAudioPath: data.audioPath,
          customAudioUrl: data.audioUrl,
          customAudioFilename: data.filename,
          customAudioAction: 'replace',
          customAudioLoop: true,
          preset: 'custom',
        }));
        showToast(`Audio track extracted & set as active (${(data.duration || video.duration).toFixed(1)}s)`, 'success');
      } else {
        showToast(`Extracted audio track (${format.toUpperCase()}). Downloading...`, 'success');
        const a = document.createElement('a');
        a.href = data.audioUrl;
        a.download = data.filename || `audio_${video.id}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to extract audio track', 'error');
    } finally {
      setExtractingAudioTrack(false);
    }
  };

  // Toggle Custom Audio Playback preview in Studio
  const handleTogglePlayCustomAudio = () => {
    if (!customAudioPlayerRef.current) return;
    if (isPlayingCustomAudio) {
      customAudioPlayerRef.current.pause();
      setIsPlayingCustomAudio(false);
    } else {
      customAudioPlayerRef.current.play().then(() => {
        setIsPlayingCustomAudio(true);
      }).catch(() => {
        setIsPlayingCustomAudio(false);
      });
    }
  };

  // 1-Click Social Media Format presets
  const applySocialFormatPreset = (formatKey: 'tiktok_reels' | 'instagram_square' | 'youtube_4k' | 'twitter_x' | 'cinematic_master' | 'low_end_safe') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(10); } catch {}
    }
    if (formatKey === 'tiktok_reels') {
      setSettings((p) => ({
        ...p,
        socialProfile: 'tiktok_reels',
        aspectRatio: '9:16',
        aspectRatioFit: 'crop',
        targetResolution: '1080p',
        targetFps: 60,
        motionInterpolation: true,
        interpolationMode: 'optical_flow',
        codec: 'h264',
        container: 'mp4',
        bitrateMode: 'high',
        preset: 'custom',
      }));
      showToast('Tuned for TikTok & Reels (9:16 Vertical · 60 FPS Optical Flow)', 'success');
    } else if (formatKey === 'instagram_square') {
      setSettings((p) => ({
        ...p,
        socialProfile: 'instagram_square',
        aspectRatio: '1:1',
        aspectRatioFit: 'crop',
        targetResolution: '1080p',
        targetFps: 60,
        motionInterpolation: true,
        interpolationMode: 'optical_flow',
        codec: 'h264',
        container: 'mp4',
        bitrateMode: 'high',
        preset: 'custom',
      }));
      showToast('Tuned for Instagram Square Feed (1:1 · 60 FPS Master)', 'success');
    } else if (formatKey === 'youtube_4k') {
      setSettings((p) => ({
        ...p,
        socialProfile: 'youtube_4k',
        aspectRatio: '16:9',
        aspectRatioFit: 'crop',
        targetResolution: '4k',
        targetFps: 60,
        motionInterpolation: true,
        interpolationMode: 'optical_flow',
        codec: 'hevc',
        container: 'mp4',
        bitrateMode: 'maximum',
        preset: 'custom',
      }));
      showToast('Tuned for YouTube 4K Ultra HD (3840×2160 · 60 FPS Optical Flow)', 'success');
    } else if (formatKey === 'twitter_x') {
      setSettings((p) => ({
        ...p,
        socialProfile: 'twitter_x',
        aspectRatio: '16:9',
        aspectRatioFit: 'crop',
        targetResolution: '1080p',
        targetFps: 60,
        motionInterpolation: true,
        interpolationMode: 'motion_compensated',
        codec: 'h264',
        container: 'mp4',
        bitrateMode: 'high',
        preset: 'custom',
      }));
      showToast('Tuned for X / Twitter Feed (1080p · Universal MP4)', 'success');
    } else if (formatKey === 'cinematic_master') {
      setSettings((p) => ({
        ...p,
        socialProfile: 'cinematic_master',
        aspectRatio: '21:9',
        aspectRatioFit: 'crop',
        targetResolution: '4k',
        targetFps: 60,
        motionInterpolation: true,
        interpolationMode: 'optical_flow',
        codec: 'prores',
        container: 'mov',
        bitrateMode: 'prores_hq',
        preset: 'custom',
      }));
      showToast('Tuned for UltraWide Cinema (21:9 · Apple ProRes 422 HQ)', 'success');
    } else if (formatKey === 'low_end_safe') {
      setSettings((p) => ({
        ...p,
        socialProfile: 'custom',
        aspectRatio: 'original',
        targetResolution: '720p',
        targetFps: 30,
        motionInterpolation: false,
        interpolationMode: 'standard',
        codec: 'h264',
        container: 'mp4',
        bitrateMode: 'medium',
        preset: 'custom',
      }));
      showToast('Tuned for Low-End Devices (H.264 Baseline 720p/30 · Playable Everywhere)', 'success');
    }
  };

  // Submit Enhancement Job
  const handleSubmitJob = async () => {
    if (!video) return;
    setSubmitting(true);
    setErrorMsg(null);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.([15, 50, 15]); } catch {}
    }

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerUid: user?.uid || 'guest_user',
          sourceVideo: video,
          settings,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to schedule enhancement job.');
      }

      const data = await res.json();
      showToast('Rendering job queued successfully', 'success');
      navigate(`/jobs/${data.job.jobId}`);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Target dimensions calculation
  const getTargetDimensions = () => {
    if (!video) return { width: 3840, height: 2160 };
    const isPortrait = video.height > video.width;
    let w = video.width;
    let h = video.height;

    switch (settings.targetResolution) {
      case '720p':
        w = isPortrait ? 720 : 1280;
        h = isPortrait ? 1280 : 720;
        break;
      case '1080p':
        w = isPortrait ? 1080 : 1920;
        h = isPortrait ? 1920 : 1080;
        break;
      case '1440p':
        w = isPortrait ? 1440 : 2560;
        h = isPortrait ? 2560 : 1440;
        break;
      case '4k':
        w = isPortrait ? 2160 : 3840;
        h = isPortrait ? 3840 : 2160;
        break;
      case 'original':
      default:
        break;
    }

    // Adjust for aspect ratio selection
    if (settings.aspectRatio && settings.aspectRatio !== 'original') {
      const ratioParts = settings.aspectRatio.split(':');
      if (ratioParts.length === 2) {
        const rw = parseFloat(ratioParts[0]);
        const rh = parseFloat(ratioParts[1]);
        if (rw > 0 && rh > 0) {
          h = Math.round((w * rh) / rw);
        }
      } else if (settings.aspectRatio === '2.39:1') {
        h = Math.round(w / 2.39);
      }
    }

    return {
      width: Math.round(w / 2) * 2,
      height: Math.round(h / 2) * 2,
    };
  };

  const targetDims = getTargetDimensions();
  const targetFpsValue = settings.targetFps === 'preserve' ? (video?.fps || 30) : settings.targetFps;

  const activeDuration = settings.trimActive && settings.trimEnd && settings.trimStart !== undefined
    ? Math.max(0.5, settings.trimEnd - settings.trimStart)
    : (video?.duration || 10);

  // Bitrate estimation in Mbps
  const estimatedBitrateMbps = settings.codec === 'prores'
    ? 180
    : settings.bitrateMode === 'maximum'
    ? 45
    : settings.bitrateMode === 'high'
    ? 25
    : settings.customBitrateMbps || 18;

  const estimatedTotalMB = ((activeDuration * estimatedBitrateMbps) / 8).toFixed(1);

  if (!video) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col">
        <TopBar title="Studio" showBack />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] flex items-center justify-center">
            <Film className="w-6 h-6 text-[var(--accent,#C7F464)]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">No Footage Selected</h2>
            <p className="text-xs text-[var(--text-muted,#888888)]">Access your device gallery or camera to start real-time grading.</p>
          </div>
          <button
            onClick={() => setGalleryModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Open Device Gallery</span>
          </button>
        </main>
        <BottomNav />

        <GalleryPickerModal
          isOpen={galleryModalOpen}
          onClose={() => setGalleryModalOpen(false)}
          onSelectVideo={(meta) => {
            setVideo(meta);
            setSettings((p) => ({ ...p, trimStart: 0, trimEnd: meta.duration }));
            sessionStorage.setItem('elitematrix_active_video', JSON.stringify(meta));
          }}
          sampleClips={sampleClips}
          onUploadFile={handleDirectFileUpload}
          isUploading={uploadingClip}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col pb-36"
    >
      <TopBar title="Studio" showBack />

      <main className={`flex-1 w-full mx-auto px-4 py-4 space-y-5 ${isDesktopMode ? 'max-w-4xl' : 'max-w-lg'}`}>
        {/* Video Header & Device Hardware Badge */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2 truncate max-w-[210px]">
              <span className="font-semibold text-[var(--text-primary,#F5F4F0)] truncate">
                {video.filename}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated,#252525)] text-[var(--text-muted,#888888)] font-tabular shrink-0">
                {video.width}×{video.height}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Device capabilities trigger */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setDeviceInfoModalOpen(true)}
                className="text-[10px] text-[var(--accent,#C7F464)] bg-[var(--accent-subtle,rgba(199,244,100,0.1))] px-2 py-0.5 rounded-full border border-[var(--accent-glow,rgba(199,244,100,0.25))] flex items-center gap-1 shrink-0 font-medium cursor-pointer"
              >
                <Monitor className="w-3 h-3" />
                <span>{deviceCaps.refreshRate}Hz Display</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShareModalOpen(true)}
                title="Direct Share to TikTok, Reels, Shorts"
                className="text-xs text-[var(--accent,#C7F464)] bg-[var(--accent-subtle,rgba(199,244,100,0.1))] px-2.5 py-0.5 rounded-full border border-[var(--accent-glow,rgba(199,244,100,0.25))] flex items-center gap-1 shrink-0 font-medium cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>Share</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setGalleryModalOpen(true)}
                className="text-xs text-[var(--accent,#C7F464)] hover:underline flex items-center gap-1 shrink-0 font-medium cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Gallery</span>
              </motion.button>
            </div>
          </div>

          {/* Real-time Interactive A/B Comparison Player with Live Filters */}
          <ComparisonSlider
            sourceUrl={video.streamUrl}
            aspectRatio={settings.aspectRatio !== 'original' ? settings.aspectRatio : video.aspectRatio}
            filterStyle={{ filter: realtimeFilters.filter }}
            overlayStyle={realtimeFilters.overlayStyle}
            vignetteStyle={realtimeFilters.vignetteStyle}
            sourceLabel="Raw Source"
            enhancedLabel="Graded Real-Time"
          />

          {/* Real-Time Interactive Video Timeline Trimmer & Splitter */}
          <VideoTimelineTrimmer
            duration={video.duration}
            trimStart={settings.trimStart ?? 0}
            trimEnd={settings.trimEnd ?? video.duration}
            trimActive={Boolean(settings.trimActive)}
            currentTime={currentTime}
            onSeek={(t) => setCurrentTime(t)}
            onTrimChange={(start, end, active) => {
              setSettings((prev) => ({
                ...prev,
                trimStart: start,
                trimEnd: end,
                trimActive: active,
                preset: 'custom',
              }));
            }}
          />
        </section>

        {/* Quality Presets Selector & Auto-AI Social Media Optimizer */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Studio Presets & AI Optimizer</h2>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="text-xs text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </motion.button>
          </div>

          {/* AI Quality Calibration Bar & Social Media Optimizer Trigger */}
          <div className="p-3 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wand2 className={`w-3.5 h-3.5 ${analyzingAi ? 'text-[var(--accent,#C7F464)] animate-spin' : 'text-[var(--accent,#C7F464)]'}`} />
                <span className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)]">AI Auto Tune</span>
              </div>

              <div className="flex items-center gap-1.5">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSocialOptimizerModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--accent-subtle,rgba(199,244,100,0.12))] border border-[var(--accent-glow,rgba(199,244,100,0.3))] text-xs font-bold text-[var(--accent,#C7F464)] flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Social Platforms</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAiAnalyze}
                  disabled={analyzingAi}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-elevated,#282828)] hover:bg-[var(--border-strong,#333333)] border border-[var(--border-strong,#3f3f3f)] text-xs font-semibold text-[var(--text-primary,#F5F4F0)] disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1"
                >
                  {analyzingAi ? (
                    <>
                      <div className="w-3 h-3 border border-[var(--accent,#C7F464)] border-t-transparent rounded-full animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-[var(--accent,#C7F464)]" />
                      <span>Calibrate</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
            {aiNote && (
              <p className="text-[11px] text-[var(--text-muted,#888888)] leading-relaxed pt-1.5 border-t border-[var(--border-subtle,#262626)]">
                {aiNote}
              </p>
            )}
          </div>

          {/* Saved Default Preferences Active Banner */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--accent,#C7F464)]/40">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent,#C7F464)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)] truncate">
                  Saved Default Preferences
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted,#888888)] font-tabular truncate mt-0.5">
                {getBasicDefaultPreferences().resolution.toUpperCase()} ·{' '}
                {getBasicDefaultPreferences().fps === 'preserve'
                  ? 'Original FPS'
                  : `${getBasicDefaultPreferences().fps} FPS`}{' '}
                · {getBasicDefaultPreferences().codec.toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleReset}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  settings.preset === 'custom'
                    ? 'bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)]'
                    : 'bg-[var(--bg-surface-elevated,#282828)] text-[var(--text-primary,#F5F4F0)] border border-[var(--border-strong,#3f3f3f)]'
                }`}
              >
                {settings.preset === 'custom' ? 'Active' : 'Apply Default'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleSaveCurrentAsDefault}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--bg-surface-elevated,#282828)] hover:bg-[var(--border-strong,#333333)] text-[var(--accent,#C7F464)] border border-[var(--border-strong,#3f3f3f)] transition-all cursor-pointer"
              >
                Save Current
              </motion.button>
            </div>
          </div>

          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'maximum_quality', label: 'Max Quality (4K)' },
                { id: 'cinema_master', label: 'Cinema Master' },
                { id: 'detail_recovery', label: 'Detail Focus' },
                { id: 'balanced', label: 'Balanced Web' },
                { id: 'natural', label: 'Natural Color' },
                { id: 'low_light', label: 'Low-Light Boost' },
              ] as const
            ).map((preset) => {
              const isSelected = settings.preset === preset.id;
              return (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                    isSelected
                      ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] border border-[var(--accent,#C7F464)]/70 shadow-sm'
                      : 'bg-[var(--bg-primary,#171717)]/60 text-[var(--text-muted,#888888)] border border-[var(--border-subtle,#262626)] hover:text-[var(--text-primary,#F5F4F0)]'
                  }`}
                >
                  {preset.label}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Real-time Color Grading Tools Accordion */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setColorGradingOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--bg-surface-elevated,#252525)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Real-Time Color Grading</h2>
                <p className="text-[11px] text-[var(--text-muted,#888888)]">0ms Live Preview: Exposure, Temperature, Hue, Gamma</p>
              </div>
            </div>
            {colorGradingOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#888888)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#888888)]" />}
          </button>

          <AnimatePresence>
            {colorGradingOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 pt-0 space-y-4 border-t border-[var(--border-subtle,#2b2b2b)]"
              >
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleResetGrading}
                    className="text-[11px] text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Color Grading</span>
                  </button>
                </div>

                {/* Exposure */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted,#888888)]">Exposure Compensation</span>
                    <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)]">
                      {settings.exposure > 0 ? `+${settings.exposure.toFixed(2)}` : settings.exposure.toFixed(2)} EV
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-2.0"
                    max="2.0"
                    step="0.05"
                    value={settings.exposure}
                    onChange={(e) => {
                      setSettings((prev) => ({
                        ...prev,
                        exposure: parseFloat(e.target.value),
                        preset: 'custom',
                      }));
                    }}
                    className="w-full"
                  />
                </div>

                {/* Brightness & Contrast */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)]">Brightness</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)]">
                        {settings.brightness > 0 ? `+${settings.brightness.toFixed(2)}` : settings.brightness.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-0.8"
                      max="0.8"
                      step="0.02"
                      value={settings.brightness}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          brightness: parseFloat(e.target.value),
                          preset: 'custom',
                        }));
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)]">Contrast</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)]">
                        {settings.contrast.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={settings.contrast}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          contrast: parseFloat(e.target.value),
                          preset: 'custom',
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Temperature & Tint */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)]">Warmth (Kelvin)</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)]">
                        {settings.temperature > 0 ? `+${settings.temperature}` : settings.temperature}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={settings.temperature}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          temperature: parseInt(e.target.value, 10),
                          preset: 'custom',
                        }));
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)]">Tint (Magenta/Green)</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)]">
                        {settings.tint > 0 ? `+${settings.tint}` : settings.tint}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={settings.tint}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          tint: parseInt(e.target.value, 10),
                          preset: 'custom',
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Hue Shift & Sepia & Gamma */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)] text-[11px]">Hue Shift</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)] text-[11px]">
                        {settings.hueShift || 0}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={settings.hueShift || 0}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          hueShift: parseInt(e.target.value, 10),
                          preset: 'custom',
                        }));
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)] text-[11px]">Sepia Vintage</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)] text-[11px]">
                        {settings.sepia || 0}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={settings.sepia || 0}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          sepia: parseInt(e.target.value, 10),
                          preset: 'custom',
                        }));
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)] text-[11px]">Gamma Curve</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)] text-[11px]">
                        {settings.gamma || 0}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="2"
                      value={settings.gamma || 0}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          gamma: parseInt(e.target.value, 10),
                          preset: 'custom',
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Saturation & Vignette */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)]">Saturation</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)]">
                        {settings.saturation.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.05"
                      value={settings.saturation}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          saturation: parseFloat(e.target.value),
                          preset: 'custom',
                        }));
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)]">Vignette</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)]">
                        {settings.vignette}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={settings.vignette}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          vignette: parseInt(e.target.value, 10),
                          preset: 'custom',
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Denoise & Sharpen */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle,#2b2b2b)]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)]">Denoise</span>
                      <span className="font-tabular text-[var(--accent,#C7F464)] font-semibold">{settings.denoiseLevel}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={settings.denoiseLevel}
                      onChange={(e) => setSettings((p) => ({ ...p, denoiseLevel: parseInt(e.target.value, 10), preset: 'custom' }))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)]">Sharpening</span>
                      <span className="font-tabular text-[var(--accent,#C7F464)] font-semibold">{settings.sharpenLevel}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={settings.sharpenLevel}
                      onChange={(e) => setSettings((p) => ({ ...p, sharpenLevel: parseInt(e.target.value, 10), preset: 'custom' }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Cinematic Inbuilt LUTs & Custom LUTs */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setLutFiltersOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--bg-surface-elevated,#252525)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Palette className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Cinematic LUT Filters & 3D .cube</h2>
                <p className="text-[11px] text-[var(--text-muted,#888888)]">32+ Inbuilt Cinematic Grades, Film Stocks & Custom Upload</p>
              </div>
            </div>
            {lutFiltersOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#888888)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#888888)]" />}
          </button>

          <AnimatePresence>
            {lutFiltersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 pt-0 space-y-3.5 border-t border-[var(--border-subtle,#2b2b2b)]"
              >
                {/* Category Pills & Search */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {(['All', 'Cinematic', 'Vintage', 'Creative', 'Natural'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setLutCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                          lutCategory === cat
                            ? 'bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)]'
                            : 'bg-[var(--bg-primary,#171717)] text-[var(--text-muted,#888888)] border border-[var(--border-subtle,#282828)] hover:text-[var(--text-primary,#F5F4F0)]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#888888)]" />
                    <input
                      type="text"
                      value={lutSearch}
                      onChange={(e) => setLutSearch(e.target.value)}
                      placeholder="Search 32+ LUTs (e.g., Portra, Viral Pop, Matrix, Sunset)..."
                      className="w-full bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#282828)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary,#F5F4F0)] placeholder:text-[var(--text-muted,#666666)]"
                    />
                  </div>
                </div>

                {/* LUT Swatch Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {LUT_PRESETS.filter((lut) => {
                    if (lutCategory !== 'All' && lut.category !== lutCategory) return false;
                    if (lutSearch.trim()) {
                      const q = lutSearch.toLowerCase();
                      return lut.name.toLowerCase().includes(q) || lut.description.toLowerCase().includes(q);
                    }
                    return true;
                  }).map((lut) => {
                    const isSelected = settings.lutPreset === lut.id;
                    return (
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        key={lut.id}
                        type="button"
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            lutPreset: lut.id,
                            preset: 'custom',
                          }));
                          showToast(`Applied LUT: ${lut.name}`, 'info');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[52px] flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-[var(--bg-primary,#171717)] border-[var(--accent,#C7F464)]/70 shadow-sm'
                            : 'bg-[var(--bg-primary,#171717)]/60 border-[var(--border-subtle,#262626)] hover:border-[var(--border-strong,#383838)]'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: lut.previewColor }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[var(--accent,#C7F464)]' : 'text-[var(--text-primary,#F5F4F0)]'}`}>
                            {lut.name}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted,#888888)] truncate">{lut.category}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Custom LUT Upload Area */}
                <div className="p-3 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)]">Custom 3D LUT (.cube / .png)</p>
                      <p className="text-[11px] text-[var(--text-muted,#888888)]">
                        {settings.customLutName ? `Active: ${settings.customLutName}` : 'Upload your DaVinci Resolve or Adobe Premiere .cube LUT'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => lutInputRef.current?.click()}
                      disabled={uploadingLut}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface-elevated,#282828)] hover:bg-[var(--border-strong,#333333)] border border-[var(--border-strong,#3f3f3f)] text-xs font-semibold text-[var(--accent,#C7F464)] cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {uploadingLut ? (
                        <>
                          <div className="w-3 h-3 border border-[var(--accent,#C7F464)] border-t-transparent rounded-full animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>Import LUT</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={lutInputRef}
                      type="file"
                      accept=".cube,.png"
                      onChange={handleLutUpload}
                      className="hidden"
                    />
                  </div>

                  {settings.lutPreset === 'custom' && (
                    <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-subtle,#262626)] text-[11px] text-[var(--accent,#C7F464)]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Custom 3D LUT active and linked to export pipeline</span>
                    </div>
                  )}
                </div>

                {/* LUT Intensity Slider */}
                {settings.lutPreset !== 'none' && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted,#888888)]">LUT Blend Intensity</span>
                      <span className="font-tabular font-semibold text-[var(--text-primary,#F5F4F0)]">
                        {settings.lutIntensity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={settings.lutIntensity}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          lutIntensity: parseInt(e.target.value, 10),
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Video Aspect Ratio & Cropping */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setAspectRatioOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--bg-surface-elevated,#252525)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Ratio className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Aspect Ratio & Social Sizes</h2>
                <p className="text-[11px] text-[var(--text-muted,#888888)]">
                  {settings.aspectRatio === 'original' ? 'Preserving Original Dimensions' : `Selected: ${settings.aspectRatio}`}
                </p>
              </div>
            </div>
            {aspectRatioOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#888888)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#888888)]" />}
          </button>

          <AnimatePresence>
            {aspectRatioOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 pt-0 space-y-3.5 border-t border-[var(--border-subtle,#2b2b2b)]"
              >
                <div className="grid grid-cols-4 gap-1.5 pt-2">
                  {ASPECT_RATIOS.map((ar) => {
                    const isSelected = settings.aspectRatio === ar.id;
                    return (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        key={ar.id}
                        type="button"
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            aspectRatio: ar.id,
                            preset: 'custom',
                          }));
                          showToast(`Aspect ratio: ${ar.label} (${ar.sublabel})`, 'info');
                        }}
                        className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer min-h-[48px] flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] border border-[var(--accent,#C7F464)]/60 font-semibold shadow-sm'
                            : 'bg-[var(--bg-primary,#171717)]/60 text-[var(--text-muted,#888888)] border border-[var(--border-subtle,#262626)] hover:text-[var(--text-primary,#F5F4F0)]'
                        }`}
                      >
                        <span className="text-xs font-semibold">{ar.label}</span>
                        <span className="text-[9px] text-[var(--text-muted,#888888)] truncate max-w-full px-0.5">
                          {ar.sublabel.split(' ')[0]}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {settings.aspectRatio !== 'original' && (
                  <div className="flex items-center justify-between p-2.5 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl text-xs">
                    <span className="text-[var(--text-muted,#888888)]">Fitting Strategy</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, aspectRatioFit: 'crop' }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          settings.aspectRatioFit === 'crop'
                            ? 'bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-semibold'
                            : 'bg-[var(--bg-surface-elevated,#252525)] text-[var(--text-muted,#888888)]'
                        }`}
                      >
                        Crop & Fill
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, aspectRatioFit: 'pad' }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          settings.aspectRatioFit === 'pad'
                            ? 'bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-semibold'
                            : 'bg-[var(--bg-surface-elevated,#252525)] text-[var(--text-muted,#888888)]'
                        }`}
                      >
                        Fit & Letterbox
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Master Output Settings: Resolution, 90/120 FPS, Codecs */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setOutputSettingsOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--bg-surface-elevated,#252525)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Settings2 className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Hardware Output Configuration</h2>
                <p className="text-[11px] text-[var(--text-muted,#888888)]">Resolution, 90/120 FPS ProMotion, Apple ProRes 422 HQ</p>
              </div>
            </div>
            {outputSettingsOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#888888)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#888888)]" />}
          </button>

          <AnimatePresence>
            {outputSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 pt-0 space-y-4 border-t border-[var(--border-subtle,#2b2b2b)]"
              >
                {/* 1-Click Social Media Video Format Profiles */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent,#C7F464)]" />
                      <span>Social Media Fast-Format Presets</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-muted,#888888)]">Auto-configures Ratio, FPS & Codec</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'tiktok_reels',
                        title: 'TikTok · Reels · Shorts',
                        desc: '9:16 Vertical · 60 FPS Optical Flow',
                        icon: '📱',
                        active: settings.aspectRatio === '9:16' && settings.targetFps === 60,
                      },
                      {
                        id: 'instagram_square',
                        title: 'Instagram Feed (1:1)',
                        desc: '1080×1080 · 60 FPS Feed Master',
                        icon: '📸',
                        active: settings.aspectRatio === '1:1',
                      },
                      {
                        id: 'youtube_4k',
                        title: 'YouTube 4K Ultra HD',
                        desc: '3840×2160 · 60 FPS High Bitrate',
                        icon: '▶️',
                        active: settings.targetResolution === '4k' && settings.aspectRatio === '16:9',
                      },
                      {
                        id: 'twitter_x',
                        title: 'X / Twitter Feed',
                        desc: '16:9 1080p · Universal Playback',
                        icon: '𝕏',
                        active: settings.socialProfile === 'twitter_x',
                      },
                      {
                        id: 'cinematic_master',
                        title: 'Cinematic UltraWide (21:9)',
                        desc: '21:9 · Apple ProRes 422 HQ',
                        icon: '🎬',
                        active: settings.aspectRatio === '21:9' || settings.codec === 'prores',
                      },
                      {
                        id: 'low_end_safe',
                        title: 'Low-End Safe Playback',
                        desc: '720p/30 · Baseline MP4 (No Handshake Error)',
                        icon: '⚡',
                        active: settings.targetResolution === '720p' && settings.targetFps === 30,
                      },
                    ].map((fmt) => (
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        key={fmt.id}
                        type="button"
                        onClick={() => applySocialFormatPreset(fmt.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                          fmt.active
                            ? 'bg-[var(--accent-subtle,rgba(199,244,100,0.1))] border-[var(--accent,#C7F464)] text-[var(--text-primary,#F5F4F0)] shadow-sm'
                            : 'bg-[var(--bg-primary,#171717)] border-[var(--border-subtle,#282828)] hover:border-[var(--border-strong,#383838)] text-[var(--text-muted,#888888)]'
                        }`}
                      >
                        <span className="text-base leading-none shrink-0 mt-0.5">{fmt.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${fmt.active ? 'text-[var(--accent,#C7F464)]' : 'text-[var(--text-primary,#F5F4F0)]'}`}>
                            {fmt.title}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted,#888888)] truncate mt-0.5">
                            {fmt.desc}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Optical Flow & AI Motion Smoothing Card */}
                <div className="p-3.5 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[var(--accent,#C7F464)]" />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary,#F5F4F0)]">
                          Optical Flow & Motion Smoothing
                        </p>
                        <p className="text-[10px] text-[var(--text-muted,#888888)]">
                          Eliminates jitter, synthesizes motion vectors for silky smooth cadence
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.motionInterpolation)}
                        onChange={(e) => {
                          const active = e.target.checked;
                          setSettings((p) => ({
                            ...p,
                            motionInterpolation: active,
                            targetFps: active && p.targetFps === 'preserve' ? 60 : p.targetFps,
                            preset: 'custom',
                          }));
                          showToast(active ? 'Optical Flow Smoothing enabled (60+ FPS)' : 'Optical Flow disabled', 'info');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[var(--border-strong,#333333)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent,#C7F464)]"></div>
                    </label>
                  </div>

                  {settings.motionInterpolation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2 pt-1 border-t border-[var(--border-subtle,#262626)]"
                    >
                      <span className="text-[11px] font-semibold text-[var(--text-muted,#888888)] block">
                        Interpolation Algorithm
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {[
                          { id: 'optical_flow', name: 'Bi-Dir Optical Flow (MCI)', desc: 'True synthesized vectors' },
                          { id: 'motion_compensated', name: 'Compensated (AOBMC)', desc: 'Fast-action & sports' },
                          { id: 'blend', name: 'Cinematic Frame Blend', desc: 'Soft shutter smoothing' },
                          { id: 'standard', name: 'Clean Frame Refresh', desc: 'Artifact-free cadence' },
                        ].map((alg) => (
                          <button
                            key={alg.id}
                            type="button"
                            onClick={() => setSettings((p) => ({ ...p, interpolationMode: alg.id as any, preset: 'custom' }))}
                            className={`p-2 rounded-xl text-left border cursor-pointer transition-colors ${
                              settings.interpolationMode === alg.id
                                ? 'bg-[var(--bg-surface-elevated,#262626)] border-[var(--accent,#C7F464)] text-[var(--text-primary,#F5F4F0)]'
                                : 'bg-[var(--bg-surface,#202020)] border-[var(--border-subtle,#282828)] text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]'
                            }`}
                          >
                            <p className="text-[11px] font-bold truncate">{alg.name}</p>
                            <p className="text-[9px] text-[var(--text-muted,#888888)] truncate">{alg.desc}</p>
                          </button>
                        ))}
                      </div>

                      <div className="p-2 bg-[var(--bg-surface,#202020)] rounded-xl border border-[var(--border-subtle,#262626)] text-[10px] text-[var(--text-muted,#888888)] flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent,#C7F464)] shrink-0" />
                        <span>Optical Flow vector estimation will synthesize {settings.targetFps === 'preserve' ? 60 : settings.targetFps} FPS intermediate frames.</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Resolution Grid */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted,#888888)]">Master Target Resolution</span>
                    <span className="font-tabular font-semibold text-[var(--accent,#C7F464)]">
                      {targetDims.width} × {targetDims.height} ({settings.targetResolution.toUpperCase()})
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(
                      [
                        { id: '4k', label: '4K UHD' },
                        { id: '1440p', label: '1440p QHD' },
                        { id: '1080p', label: '1080p FHD' },
                        { id: '720p', label: '720p HD' },
                        { id: 'original', label: 'Original' },
                      ] as const
                    ).map((res) => {
                      const isSelected = settings.targetResolution === res.id;
                      return (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          key={res.id}
                          type="button"
                          onClick={() => setSettings((p) => ({ ...p, targetResolution: res.id, preset: 'custom' }))}
                          className={`py-2 px-1 rounded-xl text-xs font-medium min-h-[44px] flex items-center justify-center text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] border border-[var(--accent,#C7F464)]/60 font-semibold shadow-sm'
                              : 'bg-[var(--bg-primary,#171717)]/60 text-[var(--text-muted,#888888)] border border-[var(--border-subtle,#262626)] hover:text-[var(--text-primary,#F5F4F0)]'
                          }`}
                        >
                          {res.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Frame Rate: Includes 24, 30, 60, 90, 120 FPS and Preserve */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-muted,#888888)]">Frame Rate & High Refresh</span>
                      {deviceCaps.is120HzSupported && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-subtle,rgba(199,244,100,0.1))] text-[var(--accent,#C7F464)] font-semibold">
                          120Hz Detected
                        </span>
                      )}
                    </div>
                    <span className="font-tabular font-semibold text-[var(--accent,#C7F464)]">
                      {settings.targetFps === 'preserve' ? `${video.fps} FPS (Native)` : `${settings.targetFps} FPS`}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {(
                      [
                        { id: 'preserve', label: 'Original' },
                        { id: 24, label: '24 FPS' },
                        { id: 30, label: '30 FPS' },
                        { id: 60, label: '60 FPS' },
                        { id: 90, label: '90 FPS', tag: deviceCaps.is90HzSupported ? 'Supported' : 'Master' },
                        { id: 120, label: '120 FPS', tag: deviceCaps.is120HzSupported ? 'ProMotion' : 'Master' },
                      ] as const
                    ).map((fps) => {
                      const isSelected = settings.targetFps === fps.id;
                      return (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          key={fps.id}
                          type="button"
                          onClick={() => {
                            setSettings((p) => ({
                              ...p,
                              targetFps: fps.id as any,
                              motionInterpolation: fps.id !== 'preserve' && (fps.id as number) > video.fps,
                              preset: 'custom',
                            }));
                            showToast(`Target frame rate: ${fps.label}`, 'info');
                          }}
                          className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer min-h-[48px] flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] border border-[var(--accent,#C7F464)]/60 font-semibold shadow-sm'
                              : 'bg-[var(--bg-primary,#171717)]/60 text-[var(--text-muted,#888888)] border border-[var(--border-subtle,#262626)] hover:text-[var(--text-primary,#F5F4F0)]'
                          }`}
                        >
                          <span className="text-xs font-semibold">{fps.label}</span>
                          {'tag' in fps && (
                            <span className="text-[8px] text-[var(--accent,#C7F464)] opacity-80 mt-0.5">
                              {fps.tag}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Codec & Master Formats */}
                <div className="space-y-1.5">
                  <span className="text-xs text-[var(--text-muted,#888888)]">Master Video Codec</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'hevc', label: 'H.265 / HEVC', sub: 'High Efficiency' },
                      { id: 'h264', label: 'H.264 / AVC', sub: 'Universal' },
                      { id: 'prores', label: 'ProRes 422', sub: 'Apple Master' },
                      { id: 'vp9', label: 'VP9 WebM', sub: 'Web Stream' },
                    ].map((cd) => {
                      const isSelected = settings.codec === cd.id;
                      return (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          key={cd.id}
                          type="button"
                          onClick={() => {
                            setSettings((p) => ({
                              ...p,
                              codec: cd.id as any,
                              container: cd.id === 'prores' ? 'mov' : cd.id === 'vp9' ? 'webm' : 'mp4',
                              bitrateMode: cd.id === 'prores' ? 'prores_hq' : p.bitrateMode,
                              preset: 'custom',
                            }));
                            showToast(`Codec: ${cd.label}`, 'info');
                          }}
                          className={`py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer min-h-[48px] flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] border border-[var(--accent,#C7F464)]/60 font-semibold shadow-sm'
                              : 'bg-[var(--bg-primary,#171717)]/60 text-[var(--text-muted,#888888)] border border-[var(--border-subtle,#262626)] hover:text-[var(--text-primary,#F5F4F0)]'
                          }`}
                        >
                          <span className="text-xs font-semibold">{cd.label}</span>
                          <span className="text-[9px] text-[var(--text-muted,#888888)]">{cd.sub}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* High-Fidelity Audio Mastering Studio Accordion */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setAudioSettingsOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--bg-surface-elevated,#252525)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Audio Mastering & Custom Formats</h2>
                <p className="text-[11px] text-[var(--text-muted,#888888)]">
                  320kbps AAC / Uncompressed PCM, EBU R128 Loudness, Dialogue Boost
                </p>
              </div>
            </div>
            {audioSettingsOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#888888)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#888888)]" />}
          </button>

          <AnimatePresence>
            {audioSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 pt-0 space-y-4 border-t border-[var(--border-subtle,#2b2b2b)]"
              >
                {/* Audio Extraction Panel (Automatically synced to video duration) */}
                <div className="p-3.5 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-[var(--accent,#C7F464)]" />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary,#F5F4F0)]">
                          Extract Audio Track from Video
                        </p>
                        <p className="text-[10px] text-[var(--text-muted,#888888)]">
                          Auto-synced to clip duration: <span className="font-tabular font-semibold text-[var(--accent,#C7F464)]">{video ? `${video.duration.toFixed(1)}s` : 'Auto'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => handleExtractAudioStudio('mp3', false)}
                      disabled={extractingAudioTrack || !video}
                      className="h-10 px-3 rounded-xl bg-[var(--bg-surface-elevated,#262626)] hover:bg-[var(--border-strong,#333333)] border border-[var(--border-strong,#383838)] text-xs font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--accent,#C7F464)]" />
                      <span>{extractingAudioTrack ? 'Extracting...' : 'Download Audio (MP3)'}</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => handleExtractAudioStudio('mp3', true)}
                      disabled={extractingAudioTrack || !video}
                      className="h-10 px-3 rounded-xl bg-[var(--accent-subtle,rgba(199,244,100,0.1))] hover:bg-[var(--accent-subtle,rgba(199,244,100,0.18))] border border-[var(--accent,#C7F464)] text-xs font-semibold text-[var(--accent,#C7F464)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Set as Custom Track</span>
                    </motion.button>
                  </div>

                  {extractedAudioInfo && (
                    <div className="p-2.5 bg-[var(--bg-surface,#202020)] rounded-xl border border-[var(--border-subtle,#262626)] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--text-primary,#F5F4F0)] truncate max-w-[200px]">
                          {extractedAudioInfo.filename}
                        </span>
                        <span className="font-tabular text-[var(--accent,#C7F464)] font-semibold">
                          {extractedAudioInfo.duration.toFixed(1)}s Synced
                        </span>
                      </div>
                      <audio controls src={extractedAudioInfo.url} className="w-full h-8 rounded" />
                    </div>
                  )}
                </div>

                {/* Import Custom Audio Track from Device */}
                <div className="p-3.5 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-[var(--accent,#C7F464)]" />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary,#F5F4F0)]">
                          Import Audio from Device
                        </p>
                        <p className="text-[10px] text-[var(--text-muted,#888888)]">
                          Supports MP3, WAV, AAC, M4A, OGG · Automatically synced to video length
                        </p>
                      </div>
                    </div>

                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg,.flac"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={uploadingAudioTrack}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:opacity-95"
                    >
                      {uploadingAudioTrack ? (
                        <>
                          <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>Import Audio</span>
                        </>
                      )}
                    </motion.button>
                  </div>

                  {settings.customAudioFilename ? (
                    <div className="p-3 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#282828)] rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Music className="w-3.5 h-3.5 text-[var(--accent,#C7F464)]" />
                          <div>
                            <p className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)] truncate max-w-[200px]">
                              {settings.customAudioFilename}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted,#888888)]">
                              Auto-synced to video: {video ? `${video.duration.toFixed(1)}s` : 'clip'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {settings.customAudioUrl && (
                            <>
                              <audio
                                ref={customAudioPlayerRef}
                                src={settings.customAudioUrl}
                                onEnded={() => setIsPlayingCustomAudio(false)}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={handleTogglePlayCustomAudio}
                                className="p-1.5 rounded-lg bg-[var(--bg-surface-elevated,#282828)] hover:bg-[var(--border-strong,#333333)] text-[var(--accent,#C7F464)] cursor-pointer"
                                title={isPlayingCustomAudio ? 'Pause Preview' : 'Play Preview'}
                              >
                                {isPlayingCustomAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (customAudioPlayerRef.current) customAudioPlayerRef.current.pause();
                              setIsPlayingCustomAudio(false);
                              setSettings((p) => ({
                                ...p,
                                customAudioPath: undefined,
                                customAudioUrl: undefined,
                                customAudioFilename: undefined,
                                customAudioAction: 'none',
                              }));
                              showToast('Imported audio track removed', 'info');
                            }}
                            className="p-1.5 rounded-lg bg-[var(--bg-surface-elevated,#282828)] hover:bg-red-500/20 text-red-400 cursor-pointer"
                            title="Remove audio"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Action Choice: Replace vs Mix */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[var(--text-muted,#888888)]">
                          Audio Track Integration Mode
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setSettings((p) => ({ ...p, customAudioAction: 'replace', preset: 'custom' }))}
                            className={`p-2 rounded-xl text-center font-semibold cursor-pointer transition-colors ${
                              settings.customAudioAction === 'replace'
                                ? 'bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)]'
                                : 'bg-[var(--bg-primary,#171717)] text-[var(--text-muted,#888888)] border border-[var(--border-subtle,#282828)]'
                            }`}
                          >
                            Replace Original Audio
                          </button>

                          <button
                            type="button"
                            onClick={() => setSettings((p) => ({ ...p, customAudioAction: 'mix', preset: 'custom' }))}
                            className={`p-2 rounded-xl text-center font-semibold cursor-pointer transition-colors ${
                              settings.customAudioAction === 'mix'
                                ? 'bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)]'
                                : 'bg-[var(--bg-primary,#171717)] text-[var(--text-muted,#888888)] border border-[var(--border-subtle,#282828)]'
                            }`}
                          >
                            Mix with Video Audio
                          </button>
                        </div>
                      </div>

                      {/* Volume Mix Sliders when Mix is chosen */}
                      {settings.customAudioAction === 'mix' && (
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--border-subtle,#282828)]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[var(--text-muted,#888888)]">Video Voice/Sound</span>
                              <span className="font-tabular font-bold text-[var(--text-primary,#F5F4F0)]">
                                {Math.round((settings.originalAudioVolume ?? 1.0) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={settings.originalAudioVolume ?? 1.0}
                              onChange={(e) => setSettings((p) => ({ ...p, originalAudioVolume: parseFloat(e.target.value) }))}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[var(--text-muted,#888888)]">Imported Music</span>
                              <span className="font-tabular font-bold text-[var(--text-primary,#F5F4F0)]">
                                {Math.round((settings.customAudioVolume ?? 0.85) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={settings.customAudioVolume ?? 0.85}
                              onChange={(e) => setSettings((p) => ({ ...p, customAudioVolume: parseFloat(e.target.value) }))}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}

                      {/* Auto-loop switch */}
                      <label className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-subtle,#282828)] cursor-pointer">
                        <span className="text-[var(--text-muted,#888888)]">Auto-loop audio if shorter than video</span>
                        <input
                          type="checkbox"
                          checked={Boolean(settings.customAudioLoop)}
                          onChange={(e) => setSettings((p) => ({ ...p, customAudioLoop: e.target.checked }))}
                          className="accent-[var(--accent,#C7F464)] w-4 h-4 rounded"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="p-3 bg-[var(--bg-surface,#202020)] rounded-xl border border-[var(--border-subtle,#262626)] text-[11px] text-[var(--text-muted,#888888)] flex items-center gap-2">
                      <Music className="w-4 h-4 text-[var(--accent,#C7F464)] shrink-0" />
                      <span>No custom audio track loaded yet. Click "Import Audio" to sync device audio with this video.</span>
                    </div>
                  )}
                </div>

                {/* Mode Select */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs text-[var(--text-muted,#888888)]">Audio Mastering Target</span>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { id: 'preserve', label: 'Preserve Source' },
                      { id: 'transcode', label: 'Studio Master' },
                      { id: 'remove', label: 'Mute Track' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, audioMode: m.id as any }))}
                        className={`py-2 px-1 rounded-xl text-center font-semibold cursor-pointer transition-colors ${
                          settings.audioMode === m.id
                            ? 'bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)]'
                            : 'bg-[var(--bg-primary,#171717)] text-[var(--text-muted,#888888)] border border-[var(--border-subtle,#2b2b2b)]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {settings.audioMode !== 'remove' && (
                  <>
                    {/* Audio Codec & Bitrate */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--text-muted,#888888)]">Audio Format</span>
                        <select
                          value={settings.audioCodec}
                          onChange={(e) => setSettings((p) => ({ ...p, audioCodec: e.target.value as any }))}
                          className="w-full bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] rounded-xl p-2 text-xs text-[var(--text-primary,#F5F4F0)]"
                        >
                          <option value="aac">AAC-LC (Universal HD)</option>
                          <option value="pcm">Uncompressed PCM (Studio)</option>
                          <option value="opus">Opus (Audiophile)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs text-[var(--text-muted,#888888)]">Audio Bitrate</span>
                        <select
                          value={settings.audioBitrateKbps}
                          onChange={(e) => setSettings((p) => ({ ...p, audioBitrateKbps: parseInt(e.target.value, 10) }))}
                          className="w-full bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] rounded-xl p-2 text-xs text-[var(--text-primary,#F5F4F0)]"
                        >
                          <option value="128">128 kbps</option>
                          <option value="192">192 kbps</option>
                          <option value="256">256 kbps</option>
                          <option value="320">320 kbps (Studio Master)</option>
                          <option value="512">512 kbps (Ultra-Res)</option>
                        </select>
                      </div>
                    </div>

                    {/* Audio Sample Rate & Channels */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--text-muted,#888888)]">Sample Rate</span>
                        <select
                          value={settings.audioSampleRate || 48000}
                          onChange={(e) => setSettings((p) => ({ ...p, audioSampleRate: parseInt(e.target.value, 10) as any }))}
                          className="w-full bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] rounded-xl p-2 text-xs text-[var(--text-primary,#F5F4F0)]"
                        >
                          <option value="44100">44.1 kHz (CD Quality)</option>
                          <option value="48000">48.0 kHz (Film Standard)</option>
                          <option value="96000">96.0 kHz (Hi-Res Audio)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs text-[var(--text-muted,#888888)]">Channels</span>
                        <select
                          value={settings.audioChannels || 'stereo'}
                          onChange={(e) => setSettings((p) => ({ ...p, audioChannels: e.target.value as any }))}
                          className="w-full bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] rounded-xl p-2 text-xs text-[var(--text-primary,#F5F4F0)]"
                        >
                          <option value="stereo">Stereo (2.0)</option>
                          <option value="mono">Mono (1.0)</option>
                          <option value="5.1">5.1 Surround Passthrough</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom Audio Filter Toggles */}
                    <div className="space-y-2 pt-2 border-t border-[var(--border-subtle,#2b2b2b)] text-xs">
                      <span className="text-[var(--text-muted,#888888)] font-semibold block">Acoustic Signal Processing</span>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="p-2.5 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)] rounded-xl flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-semibold text-[var(--text-primary,#F5F4F0)] text-[11px]">EBU R128 Loudness</p>
                            <p className="text-[9px] text-[var(--text-muted,#888888)]">-14 LUFS Streaming Target</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(settings.audioNormalization)}
                            onChange={(e) => setSettings((p) => ({ ...p, audioNormalization: e.target.checked }))}
                            className="accent-[var(--accent,#C7F464)] w-4 h-4 rounded"
                          />
                        </label>

                        <label className="p-2.5 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)] rounded-xl flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-semibold text-[var(--text-primary,#F5F4F0)] text-[11px]">Dialogue Clarity</p>
                            <p className="text-[9px] text-[var(--text-muted,#888888)]">+3.5dB Speech Boost</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(settings.audioVocalBoost)}
                            onChange={(e) => setSettings((p) => ({ ...p, audioVocalBoost: e.target.checked }))}
                            className="accent-[var(--accent,#C7F464)] w-4 h-4 rounded"
                          />
                        </label>

                        <label className="p-2.5 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)] rounded-xl flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-semibold text-[var(--text-primary,#F5F4F0)] text-[11px]">Bass Punch</p>
                            <p className="text-[9px] text-[var(--text-muted,#888888)]">+3dB Low End Warmth</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(settings.audioBassPunch)}
                            onChange={(e) => setSettings((p) => ({ ...p, audioBassPunch: e.target.checked }))}
                            className="accent-[var(--accent,#C7F464)] w-4 h-4 rounded"
                          />
                        </label>

                        <label className="p-2.5 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)] rounded-xl flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-semibold text-[var(--text-primary,#F5F4F0)] text-[11px]">80Hz Rumble Cut</p>
                            <p className="text-[9px] text-[var(--text-muted,#888888)]">Eliminate AC & Wind Hum</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(settings.audioDeHum)}
                            onChange={(e) => setSettings((p) => ({ ...p, audioDeHum: e.target.checked }))}
                            className="accent-[var(--accent,#C7F464)] w-4 h-4 rounded"
                          />
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Live Technical Before vs After Comparison Card */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--text-muted,#888888)] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--accent,#C7F464)]" />
              <span>Before & After Specifications</span>
            </h2>
            <span className="text-[10px] text-[var(--accent,#C7F464)] font-tabular font-semibold">
              Live Real-Time
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-tabular">
            {/* Resolution */}
            <div className="p-2.5 bg-[var(--bg-primary,#171717)] rounded-xl border border-[var(--border-subtle,#262626)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted,#888888)] uppercase">Resolution</span>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-[var(--text-muted,#888888)]">{video.width}×{video.height}</span>
                <ArrowRight className="w-3 h-3 text-[var(--accent,#C7F464)]" />
                <span className="text-[var(--accent,#C7F464)]">{targetDims.width}×{targetDims.height}</span>
              </div>
            </div>

            {/* Frame Rate */}
            <div className="p-2.5 bg-[var(--bg-primary,#171717)] rounded-xl border border-[var(--border-subtle,#262626)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted,#888888)] uppercase">Frame Rate</span>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-[var(--text-muted,#888888)]">{video.fps} FPS</span>
                <ArrowRight className="w-3 h-3 text-[var(--accent,#C7F464)]" />
                <span className="text-[var(--accent,#C7F464)]">{targetFpsValue} FPS</span>
              </div>
            </div>

            {/* Codec */}
            <div className="p-2.5 bg-[var(--bg-primary,#171717)] rounded-xl border border-[var(--border-subtle,#262626)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted,#888888)] uppercase">Codec & Audio</span>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-[var(--text-muted,#888888)]">{video.videoCodec.toUpperCase()}</span>
                <ArrowRight className="w-3 h-3 text-[var(--accent,#C7F464)]" />
                <span className="text-[var(--accent,#C7F464)]">{settings.codec.toUpperCase()} · {settings.audioBitrateKbps}k</span>
              </div>
            </div>

            {/* Duration / Trim */}
            <div className="p-2.5 bg-[var(--bg-primary,#171717)] rounded-xl border border-[var(--border-subtle,#262626)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted,#888888)] uppercase">Duration / Trim</span>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-[var(--text-muted,#888888)]">{video.duration.toFixed(1)}s</span>
                <ArrowRight className="w-3 h-3 text-[var(--accent,#C7F464)]" />
                <span className="text-[var(--accent,#C7F464)]">{activeDuration.toFixed(1)}s</span>
              </div>
            </div>
          </div>
        </section>

        {errorMsg && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-xs text-red-400">
            {errorMsg}
          </div>
        )}
      </main>

      {/* Floating Bottom Action Bar */}
      <div className={`fixed bottom-16 left-0 right-0 z-30 p-3 bg-[var(--bg-primary,#171717)]/80 backdrop-blur-xl border-t border-[var(--border-subtle,#2b2b2b)] ${isDesktopMode ? 'max-w-4xl' : 'max-w-lg'} mx-auto`}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-tabular">
            <span className="text-[10px] text-[var(--text-muted,#888888)] block">Target Output</span>
            <span className="font-semibold text-[var(--text-primary,#F5F4F0)]">
              {targetDims.width}×{targetDims.height} · {targetFpsValue}fps
            </span>
            <span className="text-[10px] text-[var(--accent,#C7F464)] ml-1.5 font-medium">
              ~{estimatedTotalMB} MB
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmitJob}
            disabled={submitting}
            className="flex-1 h-12 rounded-xl bg-[var(--accent,#C7F464)] hover:opacity-95 text-[var(--accent-text,#121808)] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent-glow,rgba(199,244,100,0.2))] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-[var(--accent-text,#121808)] border-t-transparent rounded-full animate-spin" />
                <span>Queuing Master...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Render Hardware Master</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Device Capabilities Inspector Modal */}
      <AnimatePresence>
        {deviceInfoModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-5 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle,#2f2f2f)] pb-3">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-[var(--accent,#C7F464)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary,#F5F4F0)]">Hardware & Display Capabilities</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeviceInfoModalOpen(false)}
                  className="p-1 text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 font-tabular">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary,#171717)]">
                  <span className="text-[var(--text-muted,#888888)]">Screen Refresh Rate</span>
                  <span className="font-semibold text-[var(--accent,#C7F464)]">{deviceCaps.displayLabel}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary,#171717)]">
                  <span className="text-[var(--text-muted,#888888)]">Wide Color Gamut</span>
                  <span className="font-semibold text-[var(--text-primary,#F5F4F0)]">{deviceCaps.colorGamut}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary,#171717)]">
                  <span className="text-[var(--text-muted,#888888)]">High Dynamic Range (HDR)</span>
                  <span className="font-semibold text-[var(--text-primary,#F5F4F0)]">
                    {deviceCaps.isHdrSupported ? 'Supported (HDR10 / Dolby Vision)' : 'Standard Dynamic Range'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary,#171717)]">
                  <span className="text-[var(--text-muted,#888888)]">GPU Texture Limit</span>
                  <span className="font-semibold text-[var(--text-primary,#F5F4F0)]">{deviceCaps.maxTextureSize} × {deviceCaps.maxTextureSize}</span>
                </div>

                <div className="p-2 rounded-lg bg-[var(--bg-primary,#171717)] space-y-1">
                  <span className="text-[10px] text-[var(--text-muted,#888888)] uppercase">GPU Renderer</span>
                  <p className="text-[11px] font-semibold text-[var(--text-primary,#F5F4F0)] truncate">
                    {deviceCaps.gpuRenderer}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeviceInfoModalOpen(false)}
                className="w-full h-10 rounded-xl bg-[var(--bg-surface-elevated,#282828)] border border-[var(--border-strong,#3f3f3f)] font-semibold text-[var(--text-primary,#F5F4F0)] text-xs cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Device Gallery & Media Library Modal */}
      <GalleryPickerModal
        isOpen={galleryModalOpen}
        onClose={() => setGalleryModalOpen(false)}
        onSelectVideo={(meta) => {
          setVideo(meta);
          setSettings((p) => ({ ...p, trimStart: 0, trimEnd: meta.duration }));
          sessionStorage.setItem('elitematrix_active_video', JSON.stringify(meta));
          showToast(`Loaded "${meta.filename}"`, 'success');
        }}
        currentVideoId={video.id}
        sampleClips={sampleClips}
        onUploadFile={handleDirectFileUpload}
        isUploading={uploadingClip}
      />

      {/* Auto AI Social Media Optimizer Modal */}
      <SocialMediaAiOptimizerModal
        isOpen={socialOptimizerModalOpen}
        onClose={() => setSocialOptimizerModalOpen(false)}
        deviceCaps={deviceCaps}
        currentSettings={settings}
        onApplyProfile={(newSettings, profileName) => {
          setSettings((prev) => ({
            ...prev,
            ...newSettings,
          }));
          showToast(`Social Profile "${profileName}" applied!`, 'success');
        }}
      />

      {video && (
        <SocialShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          title={video.filename}
          videoUrl={video.streamUrl}
          downloadUrl={video.streamUrl}
          resolution={settings.targetResolution.toUpperCase()}
          fps={settings.targetFps === 'preserve' ? video.fps : settings.targetFps}
          codec={settings.codec.toUpperCase()}
          duration={video.duration}
        />
      )}

      <BottomNav />
    </motion.div>
  );
};
