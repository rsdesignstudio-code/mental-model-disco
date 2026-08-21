/** Canonical shapes for the Mental Model × DISCO tool. */

export const DIMENSIONS = [
  "Attention",
  "Memory",
  "Language",
  "Reasoning",
  "Problem Solving",
  "Decision Making",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const LEVELS = ["None", "Low", "Medium", "High"] as const;
export type Level = (typeof LEVELS)[number];

export type ClosureState = "" | "Complete" | "Partial" | "Incomplete";

/* ---------------- Tab ① Mental Model ---------------- */

export interface FlowStep {
  id: string;
  text: string;
  scale: "micro" | "macro";
  stress: boolean;
  load: string;    // what is cognitively difficult here
  cause: string;   // probable cause
  resolve: string; // design direction to resolve it
}

export interface MentalModel {
  userModel: {
    demographic: string;
    knowledge: string;
    abilities: string;
    mood: string;
    environment: string;
  };
  vision: {
    metaphor: string;
    rich: string;
    expectations: string;
    needs: string;
    aesthetic: string;
  };
  visionWriteup: string;
  flow: FlowStep[];
  closure: { rating: number; notes: string }; // rating 0–5 (0 = unrated)
}

/* ---------------- Tab ② DISCO ---------------- */

export interface Stage {
  id: string;
  flow: string;
  entities: string[];
  stress: number; // 0–5
  error: number;  // 0–5
  ease: number;   // 0–5
  dims: Record<Dimension, Level>;
  closure: ClosureState;
  closureNote: string;
  justification: string;
}

export interface Disco {
  stages: Stage[];
  summary: string;
  suggestedDims: Dimension[];
  overall: Record<Dimension, number>; // designer's own 0–10 judgment per dimension
}

/* ---------------- Case study ---------------- */

export interface CaseStudy {
  id: string;
  user_id: string;
  session_id: string | null;
  title: string;
  archetype: string;
  student: string;
  case_date: string | null; // yyyy-mm-dd
  mm: MentalModel;
  disco: Disco;
  final_cognitive_brief: string;
  created_at: string;
  updated_at: string;
}

export interface GallerySubmission {
  id: string;
  case_id: string | null;
  user_id: string;
  student: string | null;
  title: string | null;
  archetype: string | null;
  submitted_at: string;
  data: CaseStudy;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: "student" | "faculty";
  created_at: string;
}

export interface A11ySettings {
  textScale: number; // 1.0 – 1.45
  highContrast: boolean;
  dyslexicFont: boolean;
  reduceMotion: boolean;
}

export type TabKey = "mm" | "disco" | "brief" | "gallery";
