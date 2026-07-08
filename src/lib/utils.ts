import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const PRIORITY_CURRENCIES = ["USD", "EUR"];

export function sortPricesByCurrency<
  T extends { currency: string; territory?: string },
>(prices: T[]): T[] {
  return [...prices].sort((a, b) => {
    const ai = PRIORITY_CURRENCIES.indexOf(a.currency);
    const bi = PRIORITY_CURRENCIES.indexOf(b.currency);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return (a.territory ?? "").localeCompare(b.territory ?? "");
  });
}
