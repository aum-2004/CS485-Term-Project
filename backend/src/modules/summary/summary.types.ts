export interface DebateSummary {
  id: string;
  threadId: string;
  mainPositions: string[];
  supportingEvidence: string[];
  areasOfDisagreement: string[];
  generatedAt: string;
  updatedAt: string;
}

export interface DebateSummaryRow {
  id: string;
  thread_id: string;
  main_positions: string[];
  supporting_evidence: string[];
  areas_of_disagreement: string[];
  generated_at: Date;
  updated_at: Date;
}
