export interface IntelligenceSignal {
  id: string;
  label: string;
  score: number;
  reason: string;
}

export const localIntelligence = {
  rankSignals(signals: IntelligenceSignal[]): IntelligenceSignal[] {
    return [...signals].sort((a, b) => b.score - a.score);
  }
};
