export type CoachLevelV1 = 'noob' | 'beginner' | 'intermediate' | 'advanced';
export type CoachResponseStyleV1 = 'short' | 'medium' | 'detailed';

export interface CoachRequestV1 {
  schemaVersion: 'coach.v1';
  question: string;
  fen?: string;
  playerLevel: CoachLevelV1;
  responseStyle?: CoachResponseStyleV1;
}

export interface CoachResponseV1 {
  schemaVersion: 'coach.v1';
  reply: string;
  source: 'llm' | 'basic' | 'unavailable';
  engineSource: 'stockfish_wasm' | 'fallback' | 'none';
  knowledgeSource: 'none';
  evidenceUsed: Array<'position'>;
  suggestedActions: Array<{ type: string; targetId?: string; label: string }>;
}

export const MAX_COACH_BODY_BYTES: number;
export class CoachRequestError extends Error { status: number; }
export function validateCoachRequest(body: unknown): CoachRequestV1;
