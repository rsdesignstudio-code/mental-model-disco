import {
  DIMENSIONS,
  type Dimension,
  type Disco,
  type FlowStep,
  type Level,
  type MentalModel,
  type Stage,
} from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const emptyDims = (): Record<Dimension, Level> =>
  Object.fromEntries(DIMENSIONS.map((d) => [d, "None"])) as Record<Dimension, Level>;

export const emptyOverall = (): Record<Dimension, number> =>
  Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as Record<Dimension, number>;

export const newStep = (): FlowStep => ({
  id: uid(),
  text: "",
  scale: "micro",
  stress: false,
  load: "",
  cause: "",
  resolve: "",
});

export const newStage = (): Stage => ({
  id: uid(),
  flow: "",
  entities: [],
  stress: 0,
  error: 0,
  ease: 0,
  dims: emptyDims(),
  closure: "",
  closureNote: "",
  justification: "",
});

export const emptyMM = (): MentalModel => ({
  userModel: { demographic: "", knowledge: "", abilities: "", mood: "", environment: "" },
  vision: { metaphor: "", rich: "", expectations: "", needs: "", aesthetic: "" },
  visionWriteup: "",
  flow: [newStep()],
  closure: { rating: 0, notes: "" },
});

export const emptyDisco = (): Disco => ({
  stages: [newStage()],
  summary: "",
  suggestedDims: [],
  overall: emptyOverall(),
});

/** Fills in anything a stored JSONB blob is missing, so older rows keep opening. */
export function normaliseMM(raw: unknown): MentalModel {
  const base = emptyMM();
  const v = (raw ?? {}) as Partial<MentalModel>;
  return {
    userModel: { ...base.userModel, ...(v.userModel ?? {}) },
    vision: { ...base.vision, ...(v.vision ?? {}) },
    visionWriteup: v.visionWriteup ?? "",
    flow:
      Array.isArray(v.flow) && v.flow.length
        ? v.flow.map((s) => ({ ...newStep(), ...s }))
        : base.flow,
    closure: { ...base.closure, ...(v.closure ?? {}) },
  };
}

export function normaliseDisco(raw: unknown): Disco {
  const base = emptyDisco();
  const v = (raw ?? {}) as Partial<Disco>;
  return {
    stages:
      Array.isArray(v.stages) && v.stages.length
        ? v.stages.map((s) => ({
            ...newStage(),
            ...s,
            entities: Array.isArray(s?.entities) ? s.entities : [],
            dims: { ...emptyDims(), ...(s?.dims ?? {}) },
          }))
        : base.stages,
    summary: v.summary ?? "",
    suggestedDims: Array.isArray(v.suggestedDims)
      ? v.suggestedDims.filter((d): d is Dimension =>
          (DIMENSIONS as readonly string[]).includes(d)
        )
      : [],
    overall: { ...emptyOverall(), ...(v.overall ?? {}) },
  };
}

export const todayISO = () => new Date().toISOString().slice(0, 10);
