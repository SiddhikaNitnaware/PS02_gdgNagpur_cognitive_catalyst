import type { AnalysisResult } from "./analysis-types";

export type CivicReport = {
  id: string;
  locality: string;
  createdAt: string;
  status: "reported";
  analysis: AnalysisResult;
  complaintText: string;
};

const STORAGE_KEY = "cleanspot.reports.v1";
const SEED_FLAG_KEY = "cleanspot.reports.seeded.v1";

const CATEGORY_LABEL: Record<AnalysisResult["category"], string> = {
  garbage: "Garbage",
  plastic_waste: "Plastic Waste",
  open_burning: "Open Burning",
  dust_construction: "Construction Dust",
  vehicle_smoke: "Vehicle Smoke",
  other: "Other",
};

export function categoryLabel(c: AnalysisResult["category"]) {
  return CATEGORY_LABEL[c];
}

export function trackLabel(t: AnalysisResult["track"]) {
  return t === "clean_street"
    ? "Clean Street"
    : t === "clean_air"
    ? "Clean Air"
    : "Both";
}

export function buildComplaintText(
  analysis: AnalysisResult,
  locality: string,
): string {
  const place = locality.trim() || "the reported area";
  return `Environmental issue reported in ${place}: ${analysis.summary} Category: ${categoryLabel(
    analysis.category,
  )}. Severity: ${analysis.severity}. Requested action: ${analysis.recommendedAction}.`;
}

function newId() {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().split("-")[0]
      : Math.random().toString(36).slice(2, 10);
  return `CSR-${rand.toUpperCase()}`;
}

export function createReport(
  analysis: AnalysisResult,
  locality: string,
): CivicReport {
  return {
    id: newId(),
    locality: locality.trim() || "Unspecified locality",
    createdAt: new Date().toISOString(),
    status: "reported",
    analysis,
    complaintText: buildComplaintText(analysis, locality),
  };
}

function safeParse(raw: string | null): CivicReport[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CivicReport[]) : [];
  } catch {
    return [];
  }
}

export function loadReports(): CivicReport[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function saveReports(reports: CivicReport[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export function persistReport(report: CivicReport): CivicReport[] {
  const all = [report, ...loadReports()];
  saveReports(all);
  return all;
}

const SEED: CivicReport[] = ([
  {
    id: "CSR-SEED01",
    locality: "MG Road, Bengaluru",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: "reported",
    analysis: {
      category: "garbage",
      track: "clean_street",
      severity: "high",
      summary:
        "Overflowing garbage bins spilling onto the footpath near a bus stop.",
      recommendedAction:
        "Dispatch municipal waste collection and add an extra bin at this stop.",
      confidence: 92,
    },
    complaintText: "",
  },
  {
    id: "CSR-SEED02",
    locality: "Andheri West, Mumbai",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    status: "reported",
    analysis: {
      category: "plastic_waste",
      track: "clean_street",
      severity: "medium",
      summary:
        "Plastic bottles and wrappers scattered along a residential lane.",
      recommendedAction:
        "Organize a neighborhood cleanup and add a segregated recycling bin.",
      confidence: 81,
    },
    complaintText: "",
  },
  {
    id: "CSR-SEED03",
    locality: "Sector 21, Gurugram",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    status: "reported",
    analysis: {
      category: "open_burning",
      track: "both",
      severity: "high",
      summary:
        "Open burning of leaves and household waste producing heavy smoke.",
      recommendedAction:
        "Alert local pollution control and issue a no-burning notice for the block.",
      confidence: 88,
    },
    complaintText: "",
  },
  {
    id: "CSR-SEED04",
    locality: "Whitefield, Bengaluru",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    status: "reported",
    analysis: {
      category: "dust_construction",
      track: "clean_air",
      severity: "medium",
      summary:
        "Construction site releasing visible dust without water sprinkling or barriers.",
      recommendedAction:
        "Require dust screens and regular water sprinkling during working hours.",
      confidence: 76,
    },
    complaintText: "",
  },
] as CivicReport[]).map((r) => ({
  ...r,
  complaintText: buildComplaintText(r.analysis, r.locality),
}));

export function ensureSeeded(): CivicReport[] {
  if (typeof window === "undefined") return [];
  const seeded = window.localStorage.getItem(SEED_FLAG_KEY);
  if (!seeded) {
    saveReports(SEED);
    window.localStorage.setItem(SEED_FLAG_KEY, "1");
    return SEED;
  }
  return loadReports();
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
