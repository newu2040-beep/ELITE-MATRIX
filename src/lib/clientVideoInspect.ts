import { VideoMetadata } from '../types/video';

export interface ClientInspectedVideo {
  width: number;
  height: number;
  duration: number;
  aspectRatio: string;
  thumbnailDataUrl?: string;
  objectUrl: string;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Inspects a video File directly in the browser using HTML5 Video + Canvas
 * so metadata and thumbnails work reliably even if server-side FFprobe/FFmpeg
 * is unavailable on third-party hosting platforms.
 */
export function inspectVideoFileClient(file: File): Promise<ClientInspectedVideo> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let resolved = false;
    const finish = (result: ClientInspectedVideo) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      finish({
        width: 1920,
        height: 1080,
        duration: 10,
        aspectRatio: '16:9',
        objectUrl,
      });
    }, 4500);

    video.onloadedmetadata = () => {
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const rawDuration = video.duration;
      const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration * 100) / 100 : 10;
      const div = gcd(width, height) || 1;
      const aspectRatio = `${width / div}:${height / div}`;

      // Seek slightly into the clip to capture a thumbnail frame
      const seekTime = Math.min(1, duration / 3);
      try {
        video.currentTime = seekTime;
      } catch {
        finish({ width, height, duration, aspectRatio, objectUrl });
      }
    };

    video.onseeked = () => {
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const rawDuration = video.duration;
      const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration * 100) / 100 : 10;
      const div = gcd(width, height) || 1;
      const aspectRatio = `${width / div}:${height / div}`;

      let thumbnailDataUrl: string | undefined;
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 480 / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.78);
        }
      } catch {
        // Ignore canvas capture error
      }

      finish({ width, height, duration, aspectRatio, thumbnailDataUrl, objectUrl });
    };

    video.onerror = () => {
      finish({
        width: 1920,
        height: 1080,
        duration: 10,
        aspectRatio: '16:9',
        objectUrl,
      });
    };

    video.src = objectUrl;
  });
}

export function buildClientFallbackMetadata(file: File, inspected: ClientInspectedVideo): VideoMetadata {
  const id = `local_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const bitrate = Math.round((file.size * 8) / Math.max(inspected.duration, 1));
  return {
    id,
    filename: file.name,
    filePath: id,
    fileSize: file.size,
    duration: inspected.duration,
    width: inspected.width,
    height: inspected.height,
    fps: 30,
    videoCodec: file.type.includes('webm') ? 'vp9' : 'h264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
    bitrate,
    aspectRatio: inspected.aspectRatio,
    hasAudio: true,
    thumbnailUrl: inspected.thumbnailDataUrl || '',
    streamUrl: inspected.objectUrl,
  };
}
