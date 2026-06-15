// LLM provider 抽象层，业务代码只依赖这里，换模型不动其他文件

import Anthropic from "@anthropic-ai/sdk";

// 服务端单例，Next.js API route 里调用
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const DEFAULT_MODEL = "claude-sonnet-4-6";
export const FAST_MODEL = "claude-haiku-4-5-20251001";
