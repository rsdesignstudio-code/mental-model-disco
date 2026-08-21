/**
 * Reference content for the three modals: About, 5 Foci of Design,
 * 14 Universal Principles of Design.
 *
 * The attribution block below is required and must not be stripped.
 */

export const ATTRIBUTION_LINES = [
  "Reference Source — User Mental Model Framework developed by Nijoo Dubey & VS Ravishankar and 7-Step DISCO Cognitive Task Analysis Framework developed by VS Ravishankar — Course Work, MDes Universal Design, NID Bangalore, India.",
  "Interactive Framework Conceptualised and Developed by VS Ravishankar, Industrial Design + Academic, RS Design, Bangalore.",
];

export interface AboutSection {
  title: string;
  body: string[];
}

export const ABOUT: AboutSection[] = [
  {
    title: "What this tool is",
    body: [
      "Mental Model × DISCO brings two cognitive-ergonomics frameworks into a single working instrument. You analyse one artifact or task at a time, for one user archetype at a time, and the tool carries your findings forward into a Final Cognitive Design Brief you can hand to concept development.",
      "The two frameworks are deliberately kept distinct as you work — one is about the user's inner picture of the task, the other is a stage-by-stage audit of the task as performed. They converge only at the end, on the Final Brief tab, where the Interaction Timeline shows them side by side against the same journey.",
    ],
  },
  {
    title: "① The Mental Model Mapper",
    body: [
      "Developed by Nijoo Dubey & VS Ravishankar. It captures the user's mental image, expectations and past experience of a product or task — what they bring with them before they touch it, and what shifts while they use it.",
      "You describe the user (knowledge, abilities, mood, environment), then the metaphor and expectations they arrive with, then map the interaction flow step by step, flagging the points where the artifact and the user's mental model pull apart. Every flagged stress point becomes a card in Resolve / Clarify, where you write the design direction that closes the gap.",
      "The output of this half is the Design Vision: what the user needs, wants, wishes for, expects, and finds aesthetically right.",
    ],
  },
  {
    title: "② The 7-Step DISCO Cognitive Task Analysis",
    body: [
      "Developed by VS Ravishankar. Where the Mental Model Mapper is empathic, DISCO is forensic: a stage-by-stage cognitive-compatibility audit of the task as it is actually performed.",
      "For each stage of the task flow you record the entities of interaction, rate stress, error and ease, and mark which of the six cognitive dimensions — Attention, Memory, Language, Reasoning, Problem Solving, Decision Making — are loaded at that specific moment. You then note whether the stage reaches closure, and what design pointer it suggests.",
      "The output of this half is the Design Consideration: the requirements and recommendations the audit produces, with the cognitive dimensions that most need addressing named explicitly.",
    ],
  },
  {
    title: "③ The Final Cognitive Design Brief",
    body: [
      "Design Vision plus Design Consideration equals the Final Cognitive Design Brief — the complete design requirement for concept development.",
      "The brief merges every Resolve entry from the Mental Model side with every Design-Brief Justification from the DISCO side, tagged by source so you can always trace a direction back to the evidence that produced it. Nothing in the brief should be a surprise; everything in it should be something you can point at in the two preceding tabs.",
    ],
  },
  {
    title: "On the AI writeups",
    body: [
      "Three buttons in the tool ask a language model to synthesise a draft from what you have already entered: the Design Vision narrative, the Summary & Design Considerations, and the Final Brief. Each lands in an editable field, and the edited text — not the generated text — is what flows onward.",
      "Treat these as a first draft written by a diligent but uninformed assistant. The analysis is yours. If a generation fails, the field stays editable and you write it yourself; nothing in the tool depends on the AI being available.",
    ],
  },
  {
    title: "Attribution",
    body: ATTRIBUTION_LINES,
  },
];

export interface Focus {
  n: number;
  title: string;
  subtitle: string;
  question: string;
  body: string;
}

export const FIVE_FOCI: Focus[] = [
  {
    n: 1,
    title: "Preoccupations & State of Mind",
    subtitle: "Empathise with the user's mind",
    question: "What is already occupying this person before my product ever speaks?",
    body:
      "The designer arrives with a mental model built from making the thing. The user arrives with something else entirely — a half-finished errand, a worry, an assumption carried over from a product they used last year. Designing well begins with setting your own model aside and holding the user's shifting inner state in view: their anxieties, their impatience, what they are afraid of getting wrong. This state is not constant. A first-time user is orienting and looking for permission to proceed; a repeat user is looking for speed and resents being re-taught. The same screen must serve both without condescending to either.",
  },
  {
    n: 2,
    title: "Interfaces & Comprehension",
    subtitle: "Mediation & legibility",
    question: "Is this understood, or merely readable?",
    body:
      "Every surface, label, hierarchy and control is a mediating layer between an intention and an outcome, and each one is a place where meaning can be lost. Comprehension cannot be assumed from literacy: a user may read every word on a panel and still not know what will happen when they press it. Design for genuine understanding — plain language, honest hierarchy, states that announce themselves — and treat the interface as the product's standing contract with the user, one it is obliged to keep every single time.",
  },
  {
    n: 3,
    title: "Dignity & Independence",
    subtitle: "The core ethical directive",
    question: "Does using this cost the user any part of their independence?",
    body:
      "A product must never require a person to surrender their agency or their worth in order to use it. If completing a task obliges someone to ask for help they did not want to ask for, to disclose more than the task requires, or to be seen struggling in public, the design has taken something from them. Dignity is not an accessibility feature bolted on at review stage — it is a precondition the concept must satisfy before it is worth developing at all.",
  },
  {
    n: 4,
    title: "Self-worth & Pride",
    subtitle: "Affective outcome",
    question: "How does the user feel about themselves after using this?",
    body:
      "Beyond task success there is an affective residue: the user comes away either affirmed in their competence or quietly diminished. Good design confers pride of use — the sense of having handled something well-made well. Bad design makes a capable adult feel foolish for missing a cue the designer thought was obvious. When a user makes an error, the design made it possible; the interface's job at that moment is to absorb the fault gracefully and return the person to competence.",
  },
  {
    n: 5,
    title: "Experience & its Closure",
    subtitle: "Experiential wholeness",
    question: "Does this end, or does it just stop?",
    body:
      "User experience is a complete arc, not a sequence of successful clicks, and an arc needs an ending the user can feel. Closure is the felt sense that the thing is done, correctly, and that nothing further is owed — confirmation that resolves rather than merely appears. An interaction that stops without closing leaves the user checking, re-checking, and carrying the task in their head long after the product has forgotten it. Closure is designed deliberately; it is never a by-product.",
  },
];

export interface Principle {
  name: string;
  definition: string;
  why: string;
}

/**
 * After Lidwell, Holden & Butler, Universal Principles of Design.
 * Summaries compiled and rewritten by VS Ravishankar for academic input —
 * these are short original paraphrases, not reproductions of the source text.
 */
export const PRINCIPLES: Principle[] = [
  {
    name: "Fitts's Law",
    definition:
      "The time to reach a target depends on how far away it is and how large it is.",
    why:
      "Frequent and critical controls should be big and close to the hand or cursor; destructive ones should be neither. On touch screens this is the argument for 44pt targets and for putting primary actions within thumb reach.",
  },
  {
    name: "Hick's Law",
    definition:
      "Decision time grows with the number and complexity of the choices offered.",
    why:
      "Every option added to a screen taxes every user who did not want it. Grouping, defaults and staged choices convert one impossible decision into several easy ones.",
  },
  {
    name: "Affordance",
    definition:
      "A property of a thing that suggests how it can be acted upon.",
    why:
      "A handle asks to be pulled; a flat plate asks to be pushed. When the affordance contradicts the actual action, users fail confidently and repeatedly — and blame themselves for it.",
  },
  {
    name: "Constraint",
    definition:
      "Deliberately limiting the actions available at a given moment.",
    why:
      "The cheapest error to recover from is the one the design made impossible. Physical, logical and cultural constraints narrow the field before the user can go wrong, rather than scolding them afterwards.",
  },
  {
    name: "Mapping",
    definition:
      "The correspondence between a control and the thing it controls.",
    why:
      "When the arrangement of controls mirrors the arrangement of what they operate, the interface needs no instructions and no memory. Poor mapping converts every use into a small act of trial and error.",
  },
  {
    name: "Visibility",
    definition:
      "Making the relevant options and the current system state perceivable.",
    why:
      "Users cannot act on what they cannot see, and cannot trust what they cannot verify. Hidden state is the origin of most anxious re-checking.",
  },
  {
    name: "Signal-to-Noise Ratio",
    definition:
      "The proportion of meaningful information to irrelevant information.",
    why:
      "Every decorative element competes for the same attention the task needs. Raising the ratio — by removing noise rather than amplifying signal — is usually the fastest legibility gain available.",
  },
  {
    name: "Chunking",
    definition:
      "Grouping information into a small number of meaningful units.",
    why:
      "Working memory holds only a handful of items at once. Structuring a long number, a form or a procedure into chunks respects that limit instead of testing it.",
  },
  {
    name: "Consistency",
    definition:
      "Similar things behave similarly, within the product and across its context.",
    why:
      "Consistency lets knowledge transfer — learn one control, know twenty. Inconsistency spends the user's attention on re-learning what they already knew.",
  },
  {
    name: "Progressive Disclosure",
    definition:
      "Showing only what is needed now, revealing complexity on demand.",
    why:
      "It lets a single interface serve both the novice and the expert without punishing either: the simple path stays simple, the deep path stays available.",
  },
  {
    name: "Feedback Loop",
    definition:
      "Every action produces a perceptible response that confirms what happened.",
    why:
      "Without feedback, users repeat actions, doubt outcomes, and abandon tasks midway. The response must be immediate enough to be attributed to the action that caused it.",
  },
  {
    name: "Legibility",
    definition:
      "How easily text and symbols can be perceived and distinguished.",
    why:
      "Size, contrast, spacing and typeface set the floor for whether anything else in the design can work at all. Legibility failures fall hardest on exactly the users least able to compensate.",
  },
  {
    name: "Proximity",
    definition:
      "Elements placed near one another are perceived as related.",
    why:
      "Spacing is a semantic tool, not a cosmetic one. A label nearer the wrong field is read as belonging to it, whatever the code says.",
  },
  {
    name: "Similarity",
    definition:
      "Elements sharing visual characteristics are perceived as a group.",
    why:
      "Shape, colour and size carry grouping information before any text is read. Used carelessly, similarity implies relationships that do not exist and hides ones that do.",
  },
];

export const PRINCIPLES_CLOSING =
  "These map closely onto Don Norman's framework of Affordances, Signifiers, Constraints, Mapping, Feedback and Conceptual Models — read them together rather than as competing lists. Affordance and Constraint are shared outright; Visibility and Feedback Loop cover Norman's Signifiers and Feedback; Consistency, Chunking and Progressive Disclosure are the means by which a coherent Conceptual Model is built in the user's head.";
