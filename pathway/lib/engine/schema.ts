// PRD 数据模型，所有模块共享此类型定义

export type SectionType =
  | "background"
  | "goals"
  | "personas"
  | "scenarios"
  | "requirements"
  | "metrics"
  | "open_questions";

export type SectionStatus = "draft" | "edited" | "regenerating";

export type PRDSection = {
  id: string;
  title: string;
  type: SectionType;
  content: string; // markdown
  status: SectionStatus;
};

export type PRD = {
  id: string;
  sourceFragment: string;
  template: string;
  sections: PRDSection[];
  createdAt: string;
};
