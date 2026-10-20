"use client";

function formatUpdatedAt(timestamp: number) {
  return new Intl.DateTimeFormat("fr-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Toronto",
  }).format(new Date(timestamp));
}

export function RefreshFooter({
  onRefresh,
  refreshing,
  updatedAt,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  updatedAt: number | null;
}) {
  return (
    <div className="pt-2 text-center">
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-300 transition hover:bg-white/8 hover:text-white disabled:cursor-wait disabled:opacity-60"
      >
        {refreshing ? "Mise à jour…" : "Mise à jour"}
      </button>
      {updatedAt ? (
        <p className="mt-2 text-[11px] text-slate-600">
          Dernière mise à jour · {formatUpdatedAt(updatedAt)}
        </p>
      ) : null}
    </div>
  );
}
