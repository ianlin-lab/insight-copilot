"use client";

import { useState } from "react";
import type { PRDSection } from "@/lib/engine/schema";

type Props = {
  section: PRDSection;
  originalFragment: string;
  onUpdate: (id: string, content: string) => void;
};

export default function SectionCard({ section, originalFragment, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.content);
  const [refining, setRefining] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [showRefine, setShowRefine] = useState(false);

  async function handleRefine() {
    if (!refineInstruction.trim()) return;
    setRefining(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType: section.type,
          sectionTitle: section.title,
          currentContent: section.content,
          instruction: refineInstruction,
          originalFragment,
        }),
      });
      const data = await res.json();
      if (data.content) {
        onUpdate(section.id, data.content);
        setDraft(data.content);
        setShowRefine(false);
        setRefineInstruction("");
      }
    } finally {
      setRefining(false);
    }
  }

  function handleSaveEdit() {
    onUpdate(section.id, draft);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-200">{section.title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRefine((v) => !v)}
            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            重生成
          </button>
          <button
            onClick={() => {
              setEditing((v) => !v);
              setDraft(section.content);
            }}
            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {editing ? "取消" : "编辑"}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(section.content)}
            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            复制
          </button>
        </div>
      </div>

      <div className="p-4">
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              className="w-full bg-neutral-800 text-neutral-100 text-sm rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <button
              onClick={handleSaveEdit}
              className="self-end text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        ) : (
          <div className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
            {section.content}
          </div>
        )}

        {showRefine && (
          <div className="mt-3 flex flex-col gap-2">
            <input
              value={refineInstruction}
              onChange={(e) => setRefineInstruction(e.target.value)}
              placeholder="告诉 AI 如何改这一节，例如：更简洁、补充用户场景…"
              className="w-full bg-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neutral-500 placeholder:text-neutral-600"
            />
            <button
              onClick={handleRefine}
              disabled={refining}
              className="self-end text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {refining ? "生成中…" : "确认重生成"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
