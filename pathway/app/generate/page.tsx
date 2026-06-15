"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/prd/section-card";
import type { PRD, PRDSection } from "@/lib/engine/schema";

export default function GeneratePage() {
  const router = useRouter();
  const [prd, setPrd] = useState<PRD | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("pathway_prd");
    if (!raw) {
      router.replace("/");
      return;
    }
    setPrd(JSON.parse(raw));
  }, [router]);

  function handleUpdate(id: string, content: string) {
    setPrd((prev) => {
      if (!prev) return prev;
      const next: PRD = {
        ...prev,
        sections: prev.sections.map((s: PRDSection) =>
          s.id === id ? { ...s, content, status: "edited" } : s
        ),
      };
      sessionStorage.setItem("pathway_prd", JSON.stringify(next));
      return next;
    });
  }

  function handleCopyAll() {
    if (!prd) return;
    const text = prd.sections
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
  }

  if (!prd) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500 text-sm">加载中…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">PRD 草稿</h1>
            <p className="text-xs text-neutral-500 mt-1 truncate max-w-xs">
              原始碎片：{prd.sourceFragment.slice(0, 60)}…
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="text-xs text-neutral-400 hover:text-neutral-200 px-3 py-1.5 border border-neutral-800 rounded-lg transition-colors"
            >
              重新生成
            </button>
            <button
              onClick={handleCopyAll}
              className="text-xs bg-white text-neutral-950 font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              复制全部
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {prd.sections.map((section: PRDSection) => (
            <SectionCard
              key={section.id}
              section={section}
              originalFragment={prd.sourceFragment}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
