export type AnalysisType = 'positive' | 'general' | 'negative' | 'risk' | 'unclear'

export type RiskLevel = 'none' | 'low' | 'medium' | 'high'

export type EvidenceItem = {
  text: string
  reason: string
}

export type AnalysisTags = {
  focusObjects: string[]
  emotionStates: string[]
  evaluationTendencies: string[]
  issueTypes: string[]
  userDemands: string[]
  riskSignals: string[]
  suggestedActions: string[]
}

export type AnalysisResult = {
  analysisType: AnalysisType
  riskLevel: RiskLevel
  summary: string
  tags: AnalysisTags
  evidence: EvidenceItem[]
  recommendedActions: string[]
  confidence: number
}
