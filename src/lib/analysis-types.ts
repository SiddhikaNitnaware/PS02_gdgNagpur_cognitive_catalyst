export type AnalysisResult = {
  category:
    | "garbage"
    | "plastic_waste"
    | "open_burning"
    | "dust_construction"
    | "vehicle_smoke"
    | "other";
  track: "clean_street" | "clean_air" | "both";
  severity: "low" | "medium" | "high";
  summary: string;
  recommendedAction: string;
  confidence: number;
};

export const DEMO_RESULT: AnalysisResult = {
  category: "garbage",
  track: "clean_street",
  severity: "high",
  summary: "A large pile of mixed waste is visible beside a public roadside.",
  recommendedAction:
    "Arrange waste removal and inspect the area for repeat dumping.",
  confidence: 94,
};

const CATEGORIES = [
  "garbage",
  "plastic_waste",
  "open_burning",
  "dust_construction",
  "vehicle_smoke",
  "other",
] as const;
const TRACKS = ["clean_street", "clean_air", "both"] as const;
const SEVERITIES = ["low", "medium", "high"] as const;

export function isAnalysisResult(v: unknown): v is AnalysisResult {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.category === "string" &&
    (CATEGORIES as readonly string[]).includes(o.category) &&
    typeof o.track === "string" &&
    (TRACKS as readonly string[]).includes(o.track) &&
    typeof o.severity === "string" &&
    (SEVERITIES as readonly string[]).includes(o.severity) &&
    typeof o.summary === "string" &&
    typeof o.recommendedAction === "string" &&
    typeof o.confidence === "number" &&
    o.confidence >= 0 &&
    o.confidence <= 100
  );
}
