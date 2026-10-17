import { EnhancementSettings } from '../types/video';

export interface BasicDefaultPreferences {
  resolution: EnhancementSettings['targetResolution'];
  fps: string; // '120' | '90' | '60' | '30' | '24' | 'preserve'
  codec: EnhancementSettings['codec'];
}

const KEY_RES = 'elitematrix_pref_resolution';
const KEY_FPS = 'elitematrix_pref_fps';
const KEY_CODEC = 'elitematrix_pref_codec';
const KEY_FULL = 'elitematrix_studio_defaults_json';

export function getBasicDefaultPreferences(): BasicDefaultPreferences {
  const resolution = (localStorage.getItem(KEY_RES) as EnhancementSettings['targetResolution']) || '1080p';
  const fps = localStorage.getItem(KEY_FPS) || '60';
  const codec = (localStorage.getItem(KEY_CODEC) as EnhancementSettings['codec']) || 'h264';
  return { resolution, fps, codec };
}

export function saveBasicDefaultPreferences(prefs: BasicDefaultPreferences): void {
  localStorage.setItem(KEY_RES, prefs.resolution);
  localStorage.setItem(KEY_FPS, prefs.fps);
  localStorage.setItem(KEY_CODEC, prefs.codec);
  // Clear full snapshot override so strictly these saved preferences apply in Studio
  localStorage.removeItem(KEY_FULL);
}

export function saveFullStudioDefaultPreferences(settings: EnhancementSettings): void {
  localStorage.setItem(KEY_RES, settings.targetResolution);
  localStorage.setItem(KEY_FPS, String(settings.targetFps));
  localStorage.setItem(KEY_CODEC, settings.codec);
  localStorage.setItem(KEY_FULL, JSON.stringify(settings));
}

/**
 * Builds the exact Studio EnhancementSettings from the user's saved Default Preferences,
 * with all other adjustments kept strictly neutral (no unrequested presets, denoise, sharpen, or LUTs).
 */
export function getSavedDefaultEnhancementSettings(duration = 10): EnhancementSettings {
  const { resolution, fps, codec } = getBasicDefaultPreferences();

  const parsedFps: EnhancementSettings['targetFps'] =
    fps === 'preserve' ? 'preserve' : (Number(fps) as EnhancementSettings['targetFps']) || 60;

  const container: EnhancementSettings['container'] =
    codec === 'prores' ? 'mov' : codec === 'vp9' ? 'webm' : 'mp4';

  const bitrateMode: EnhancementSettings['bitrateMode'] =
    codec === 'prores' ? 'prores_hq' : 'high';

  const baseSettings: EnhancementSettings = {
    preset: 'custom',
    targetResolution: resolution,
    targetFps: parsedFps,
    motionInterpolation: false,
    interpolationMode: 'standard',
    denoiseLevel: 0,
    sharpenLevel: 0,
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
    highlights: 0,
    shadows: 0,
    vignette: 0,
    lutPreset: 'none',
    lutIntensity: 100,
    aspectRatio: 'original',
    aspectRatioFit: 'crop',
    codec,
    container,
    bitrateMode,
    customBitrateMbps: 25,
    trimActive: false,
    trimStart: 0,
    trimEnd: duration,
    audioMode: 'preserve',
    audioCodec: codec === 'prores' ? 'pcm' : codec === 'vp9' ? 'opus' : 'aac',
    audioBitrateKbps: 320,
    audioSampleRate: 48000,
    audioChannels: 'stereo',
    audioNormalization: false,
    audioVocalBoost: false,
    audioBassPunch: false,
    audioDeHum: false,
  };

  const fullRaw = localStorage.getItem(KEY_FULL);
  if (fullRaw) {
    try {
      const parsed = JSON.parse(fullRaw) as Partial<EnhancementSettings>;
      return {
        ...baseSettings,
        ...parsed,
        targetResolution: resolution,
        targetFps: parsedFps,
        codec,
        container,
        trimStart: 0,
        trimEnd: duration,
        trimActive: false,
      };
    } catch {
      // Ignore invalid JSON
    }
  }

  return baseSettings;
}
