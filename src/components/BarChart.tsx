const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

// "2024-01" -> "janv."
function monthLabel(ym: string) {
  const m = parseInt(ym.slice(5, 7), 10);
  return MONTHS[m - 1] ?? ym.slice(5);
}

export function BarChart({ data }: { data: [string, number][] }) {
  const W = 560;
  const H = 200;
  const padX = 26;
  const padTop = 28;
  const padBottom = 34;
  const plotH = H - padTop - padBottom;
  const max = Math.max(...data.map(([, v]) => v), 1);
  const bw = (W - padX * 2) / data.length;
  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      role="img"
      aria-label="Consommation mensuelle"
    >
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>

      {grid.map((g) => {
        const y = padTop + g * plotH;
        return (
          <line
            key={g}
            x1={padX}
            x2={W - padX}
            y1={y}
            y2={y}
            strokeWidth={1}
            strokeDasharray="3 4"
            className="stroke-slate-200 dark:stroke-slate-800"
          />
        );
      })}

      {data.map(([month, value], i) => {
        const bh = Math.max(3, (value / max) * plotH);
        const x = padX + i * bw + bw * 0.15;
        const y = H - padBottom - bh;
        return (
          <g key={month}>
            <rect
              x={x}
              y={y}
              width={bw * 0.7}
              height={bh}
              rx={5}
              fill="url(#barGrad)"
            />
            <text
              x={x + bw * 0.35}
              y={y - 6}
              fontSize={10}
              fontWeight={600}
              textAnchor="middle"
              className="fill-slate-500"
            >
              {value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
            </text>
            <text
              x={x + bw * 0.35}
              y={H - 12}
              fontSize={10}
              textAnchor="middle"
              className="fill-slate-400"
            >
              {monthLabel(month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}