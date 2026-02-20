import { cn } from "@/lib/utils";

export function CharacterCounter({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const ratio = current / max;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        ratio < 0.8
          ? "text-muted-foreground"
          : ratio < 0.95
            ? "text-yellow-500"
            : "text-red-500",
      )}
    >
      {current}/{max}
    </span>
  );
}
