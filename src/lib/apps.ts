import { type App, APP_STORE_LANGUAGES } from "@/lib/types";

/** True for an app created here that is not published in any store yet. */
export function isLocalApp(app: App | undefined | null): boolean {
  return app?.rawData?.notInStore === true;
}

/**
 * The store locale a listing must use for an audited market language.
 * The audit speaks bare ISO-639 ("de"); App Store listings are keyed by
 * locale ("de-DE"), and Google Play by language-REGION ("de-DE", "pl-PL").
 */
export function storeLocaleFor(
  language: string,
  country: string,
  platform: App["platform"],
): string {
  const lang = language.trim().toLowerCase();
  const region = country.trim().toUpperCase();
  if (!lang) return "";
  if (platform === "android") return `${lang}-${region}`;
  const locales = APP_STORE_LANGUAGES.map((l) => l.locale as string);
  if (locales.includes(lang)) return lang;
  const sameBase = locales.filter((l) => l.toLowerCase().split("-")[0] === lang);
  return sameBase.find((l) => l.endsWith(`-${region}`)) ?? sameBase[0] ?? lang;
}

/**
 * Where a store-side setting (category, age rating) is changed for an app
 * we cannot write to. Null for apps that are in no store yet.
 */
export function storeConsoleUrl(app: App): string | null {
  if (isLocalApp(app) || !app.externalId) return null;
  if (app.platform === "ios") {
    return `https://appstoreconnect.apple.com/apps/${app.externalId}/distribution/info`;
  }
  return "https://play.google.com/console/";
}
