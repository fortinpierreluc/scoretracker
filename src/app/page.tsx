"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-4xl px-4 pt-8">
        <div className="mb-8 h-16 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="mb-6 h-12 animate-pulse rounded-full bg-white/5" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  return <AppShell />;
}
