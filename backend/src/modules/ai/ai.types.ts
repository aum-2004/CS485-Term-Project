export interface CommentAnalysis {
  reasoningScore: number; // 0–100
  summary: string;
}

export interface DebateSummaryData {
  mainPositions: string[];
  supportingEvidence: string[];
  areasOfDisagreement: string[];
}
