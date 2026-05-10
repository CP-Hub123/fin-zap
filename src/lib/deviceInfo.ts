import { APP_VERSION } from './constants';

export interface CapturedContext {
  route: string;
  device_info: Record<string, unknown>;
  browser_info: Record<string, unknown>;
  screen_size: string;
  theme: string;
  app_version: string;
}

const detectBrowser = (ua: string) => {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\//i.test(ua)) return 'Opera';
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  return 'Unknown';
};

const detectOS = (ua: string) => {
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
};

const detectDevice = (ua: string) => {
  if (/iPad/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
};

export function captureContext(): CapturedContext {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return {
    route: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
    device_info: {
      type: detectDevice(ua),
      os: detectOS(ua),
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      pixel_ratio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    },
    browser_info: {
      name: detectBrowser(ua),
      user_agent: ua,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    },
    screen_size:
      typeof window !== 'undefined'
        ? `${window.innerWidth}x${window.innerHeight}`
        : '0x0',
    theme: isDark ? 'dark' : 'light',
    app_version: APP_VERSION,
  };
}