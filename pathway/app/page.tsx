"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLACEHOLDER = `例如：
用户投诉说在手机端找不到历史订单，每次都要从头找。
目前只有 PC 端有入口，移动端完全没有。
Q3 之前要解决。`;

export default function HomePage() {
  const router = useRouter();
  const [fragment, setFragment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clarifyQuestions, setClarifyQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [clarifyDone, setClarifyDone] = useState(false);

  async function generate(fullFragment: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragment: fullFragment }),
      });
      const prd = await res.json();
      if (prd.error) throw new Error(prd.error);
      sessionStorage.setItem("pathway_prd", JSON.stringify(prd));
      router.push("/generate");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const input = fragment.trim();
    if (!input) return;

    if (!clarifyDone) {
      setLoading(true);
      setError("");
      try {
        const clarifyRes = await fetch("/api/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fragment: input }),
        });
        const clarifyData = await clarifyRes.json();
        if (clarifyData.needsClarification && clarifyData.questions?.length) {
          setClarifyQuestions(clarifyData.questions);
          setAnswers(new Array(clarifyData.questions.length).fill(""));
          setLoading(false);
          return;
        }
      } catch {
        // 澄清失败就直接生成
      } finally {
        setLoading(false);
      }
    }

    await generate(input);
  }

  async function handleClarifySubmit() {
    const input = fragment.trim();
    const fullFragment =
      clarifyQuestions.length > 0
        ? `${input}\n\n补充信息：\n${clarifyQuestions
            .map((q, i) => `Q: ${q}\nA: ${answers[i] || "暂无"}`)
            .join("\n")}`
        : input;
    setClarifyDone(true);
    setClarifyQuestions([]);
    await generate(fullFragment);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">路径 Pathway</h1>
          <p className="text-neutral-400 text-base">
            把零散的需求碎片，一键生成结构化 PRD 草稿
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <textarea
            value={fragment}
            onChange={(e) => setFragment(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={8}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-100 placeholder:text-neutral-600 resize-none focus:outline-none focus:ring-1 focus:ring-neutral-600 leading-relaxed"
          />

          {clarifyQuestions.length > 0 && (
            <div className="flex flex-col gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-sm text-neutral-300 font-medium">
                补充几个信息，生成会更准确：
              </p>
              {clarifyQuestions.map((q, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <label className="text-xs text-neutral-400">{q}</label>
                  <input
                    value={answers[i]}
                    onChange={(e) => {
                      const next = [...answers];
                      next[i] = e.target.value;
                      setAnswers(next);
                    }}
                    className="bg-neutral-800 text-sm text-neutral-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neutral-600 placeholder:text-neutral-600"
                    placeholder="可以不填，跳过"
                  />
                </div>
              ))}
              <div className="flex gap-2 self-end">
                <button
                  onClick={() => {
                    setClarifyDone(true);
                    setClarifyQuestions([]);
                    generate(fragment.trim());
                  }}
                  className="text-xs text-neutral-400 hover:text-neutral-200 px-3 py-1.5 transition-colors"
                >
                  跳过，直接生成
                </button>
                <button
                  onClick={handleClarifySubmit}
                  disabled={loading}
                  className="text-sm bg-white text-neutral-950 font-medium px-4 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {loading ? "生成中…" : "确认生成"}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {clarifyQuestions.length === 0 && (
            <button
              onClick={handleSubmit}
              disabled={loading || !fragment.trim()}
              className="self-end text-sm bg-white text-neutral-950 font-semibold px-5 py-2.5 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-40"
            >
              {loading ? "生成中…" : "生成 PRD"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
