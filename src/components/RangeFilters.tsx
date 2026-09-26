import type { GameRange } from "@/lib/types";

const shortLabels: Record<GameRange, string> = {
  past7: "7 dern.",
  today: "Aujourd'hui",
  next7: "7 proch.",
};

export function RangeFilters({
  ranges,
  value,
  onChange,
}: {
  ranges: Array<{ id: GameRange; label: string }>;
  value: GameRange;
  onChange: (id: GameRange) => void;
}) {
  return (
    <div className="flex gap-2">
      {ranges.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`min-w-0 flex-1 whitespace-nowrap rounded-full px-2 py-2 text-center text-[13px] transition sm:flex-none sm:px-4 sm:text-sm ${
              active
                ? "bg-white text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
                : "bg-white/6 text-slate-300 hover:bg-white/10"
            }`}
          >
            <span className="sm:hidden">{shortLabels[item.id]}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
