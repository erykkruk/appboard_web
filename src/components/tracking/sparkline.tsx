"use client";

/**
 * A trend line small enough to live inside a table cell. Direction is the
 * whole message, so the line is coloured by where it ended up relative to
 * where it started - and "lower is better" (difficulty, rank) is the common
 * case here, not the exception.
 */
export function Sparkline({
  values,
  lowerIsBetter = true,
  width = 64,
  height = 18,
  title,
}: {
  values: Array<number | null>;
  lowerIsBetter?: boolean;
  width?: number;
  height?: number;
  title?: string;
}) {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const min = Math.min(...known);
  const max = Math.max(...known);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const y = (v: number) => height - ((v - min) / span) * (height - 2) - 1;

  // A gap in the data is a gap in the line: joining across a missing
  // measurement would draw a movement that was never observed.
  const segments: string[] = [];
  let run: string[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (run.length > 1) segments.push(run.join(" "));
      run = [];
      return;
    }
    run.push(`${i * step},${y(v)}`);
  });
  if (run.length > 1) segments.push(run.join(" "));

  const first = known[0];
  const last = known[known.length - 1];
  const improved = lowerIsBetter ? last < first : last > first;
  const worsened = lowerIsBetter ? last > first : last < first;
  const stroke = improved
    ? "stroke-green-600 dark:stroke-green-500"
    : worsened
      ? "stroke-red-600 dark:stroke-red-500"
      : "stroke-muted-foreground";

  return (
    <svg
      aria-hidden="true"
      className="inline-block align-middle"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      {title ? <title>{title}</title> : null}
      {segments.map((points) => (
        <polyline
          key={points}
          className={stroke}
          fill="none"
          points={points}
          strokeWidth={1.6}
        />
      ))}
    </svg>
  );
}
