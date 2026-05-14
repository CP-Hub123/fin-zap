// FinZap app release metadata + platform detection helpers.
// Update APK_FILE_NAME / APP_VERSION / APK_SIZE_MB / CHANGELOG when shipping a new build.
// The APK should be uploaded to the public Supabase Storage bucket: app-releases.

import { supabase } from "@/integrations/supabase/client";

export const APP_VERSION = "1.0.0";
export const APP_BUILD = "1";
export const APK_FILE_NAME = "finzap-latest.apk";
export const APK_SIZE_MB = 18.4;
export const RELEASE_DATE = "2026-05-14";
export const RELEASE_CHANNEL: "stable" | "beta" = "stable";

export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-05-14",
    highlights: [
      "Lançamento oficial do FinZap para Android",
      "Modo Decisão e copiloto financeiro inteligente",
      "Notificações contextuais e fechamento automático do mês",
    ],
  },
];

export function getApkPublicUrl(): string {
  const { data } = supabase.storage.from("app-releases").getPublicUrl(APK_FILE_NAME);
  return data.publicUrl;
}

export type Platform = "android" | "ios" | "desktop" | "unknown";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (/Mac/i.test(ua) && "ontouchend" in document)) return "ios";
  return "desktop";
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}