import type { App } from "@/lib/types";

/** True for an app created here that is not published in any store yet. */
export function isLocalApp(app: App | undefined | null): boolean {
  return app?.rawData?.notInStore === true;
}
