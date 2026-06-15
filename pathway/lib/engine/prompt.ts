// 纯函数：模板 + 风格规则 + 碎片 → Anthropic messages 数组
// 不依赖任何外部状态，方便测试和换模型

import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import prdTemplate from "../templates/prd.default.json";

type TemplateSection = {
  type: string;
  title: string;
  prompt: string;
};

function buildSystemPrompt(): string {
  const styleRules = prdTemplate.styleRules.map((r) => `- ${r}`).join("\n");
  const sectionList = prdTemplate.sections
    .map((s: TemplateSection) => `### ${s.title}\n${s.prompt}`)
    .join("\n\n");

  return `你是一位资深产品经理，擅长把零散的需求碎片整理成清晰的 PRD 草稿。

## 风格规则
${styleRules}

## 输出格式
严格按以下 JSON 结构输出，不要输出其他任何内容：
{
  "sections": [
    { "type": "background", "title": "背景与问题", "content": "..." },
    { "type": "goals", "title": "目标与成功标准", "content": "..." },
    { "type": "personas", "title": "目标用户", "content": "..." },
    { "type": "scenarios", "title": "核心使用场景", "content": "..." },
    { "type": "requirements", "title": "功能要求", "content": "..." },
    { "type": "metrics", "title": "度量指标", "content": "..." },
    { "type": "open_questions", "title": "待决策问题", "content": "..." }
  ]
}

## 各节写作指引
${sectionList}`;
}

export function buildGenerateMessages(fragment: string): MessageParam[] {
  return [
    {
      role: "user",
      content: `以下是我的需求碎片，请帮我生成 PRD 草稿：\n\n${fragment}`,
    },
  ];
}

export function buildRefineMessages(
  sectionType: string,
  sectionTitle: string,
  currentContent: string,
  instruction: string,
  originalFragment: string
): MessageParam[] {
  return [
    {
      role: "user",
      content: `原始需求碎片：\n${originalFragment}\n\n当前「${sectionTitle}」节内容：\n${currentContent}\n\n请根据以下指令重新生成这一节（只输出该节的 markdown 内容，不要 JSON 包装）：\n${instruction}`,
    },
  ];
}

export function getSystemPrompt(): string {
  return buildSystemPrompt();
}
