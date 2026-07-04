import { useEffect, useMemo, useState } from "react";
import type { AnalysisResult } from "@/lib/analysis-types";
import {
  buildComplaintText,
  categoryLabel,
  createReport,
  ensureSeeded,
  formatRelativeTime,
  loadReports,
  persistReport,
  trackLabel,
  type CivicReport,
} from "@/lib/civic-reports";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Copy,
  Check,
  Inbox,
  Wind,
  Trash2,
  Filter,
  BarChart3,
} from "lucide-react";

export type { CivicReport };

type Props = {
  analysisResult?: AnalysisResult;
  locality?: string;
};

type FilterKey = "all" | "clean_street" | "clean_air" | "high";

function severityClasses(s: AnalysisResult["severity"]) {
  if (s === "high")
    return "bg-red-500/15 text-red-300 border border-red-500/40";
  if (s === "medium")
    return "bg-amber-500/15 text-amber-300 border border-amber-500/40";
  return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40";
}

function severityStripe(s: AnalysisResult["severity"]) {
  if (s === "high") return "bg-red-500";
  if (s === "medium") return "bg-amber-500";
  return "bg-emerald-500";
}

export function CivicReportSection({ analysisResult, locality = "" }: Props) {
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [createdReport, setCreatedReport] = useState<CivicReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    setReports(ensureSeeded());
  }, []);

  // If the analysis input changes, clear the last created card
  useEffect(() => {
    setCreatedReport(null);
    setCopied(false);
  }, [analysisResult, locality]);

  const previewText = useMemo(
    () =>
      analysisResult ? buildComplaintText(analysisResult, locality) : "",
    [analysisResult, locality],
  );

  const handleCreate = () => {
    if (!analysisResult) return;
    const report = createReport(analysisResult, locality);
    const updated = persistReport(report);
    setReports(updated);
    setCreatedReport(report);
    setCopied(false);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; fall back to selecting text via a temp textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const filtered = useMemo(() => {
    const sorted = [...reports].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (filter === "all") return sorted;
    if (filter === "high") return sorted.filter((r) => r.analysis.severity === "high");
    return sorted.filter(
      (r) => r.analysis.track === filter || r.analysis.track === "both",
    );
  }, [reports, filter]);

  const insights = useMemo(() => {
    const total = reports.length;
    const high = reports.filter((r) => r.analysis.severity === "high").length;
    const counts = new Map<string, number>();
    for (const r of reports) {
      counts.set(r.analysis.category, (counts.get(r.analysis.category) ?? 0) + 1);
    }
    let topCat: AnalysisResult["category"] | null = null;
    let topN = 0;
    for (const [k, v] of counts) {
      if (v > topN) {
        topN = v;
        topCat = k as AnalysisResult["category"];
      }
    }
    return { total, high, topCat };
  }, [reports]);

  return (
    <div className="space-y-8">
      {/* Report generator */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Civic Report
          </h3>
        </div>

        {!analysisResult ? (
          <Card className="border-dashed p-6 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">
              No analysis yet
            </p>
            <p className="text-xs text-muted-foreground">
              Analyze a photo above to generate a civic report.
            </p>
          </Card>
        ) : createdReport ? (
          <SuccessCard
            report={createdReport}
            copied={copied}
            onCopy={() => handleCopy(createdReport.complaintText)}
          />
        ) : (
          <Card className="space-y-4 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Preview complaint
              </p>
              <p className="mt-1 text-sm text-foreground">{previewText}</p>
            </div>
            <Button onClick={handleCreate} className="w-full sm:w-auto">
              <FileText className="mr-2 h-4 w-4" />
              Create Civic Report
            </Button>
          </Card>
        )}
      </section>

      {/* Insights */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Insights
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <InsightTile label="Total reports" value={String(insights.total)} />
          <InsightTile label="High severity" value={String(insights.high)} />
          <InsightTile
            label="Most common"
            value={insights.topCat ? categoryLabel(insights.topCat) : "—"}
          />
        </div>
      </section>

      {/* Feed */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Community Reports
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterChip>
            <FilterChip
              active={filter === "clean_street"}
              onClick={() => setFilter("clean_street")}
            >
              <Trash2 className="mr-1 h-3 w-3" /> Clean Street
            </FilterChip>
            <FilterChip
              active={filter === "clean_air"}
              onClick={() => setFilter("clean_air")}
            >
              <Wind className="mr-1 h-3 w-3" /> Clean Air
            </FilterChip>
            <FilterChip
              active={filter === "high"}
              onClick={() => setFilter("high")}
            >
              High Severity
            </FilterChip>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No community-reported issues match this filter yet.
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((r) => (
              <FeedCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InsightTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </Card>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

function SuccessCard({
  report,
  copied,
  onCopy,
}: {
  report: CivicReport;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Card className="relative overflow-hidden p-6">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${severityStripe(
          report.analysis.severity,
        )}`}
      />
      <div className="space-y-4 pl-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Report created · Ready to submit
            </p>
            <p className="font-mono text-sm font-semibold text-foreground">
              {report.id}
            </p>
          </div>
          <Badge variant="secondary" className="uppercase">
            Status: Reported
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label="Locality" value={report.locality} />
          <Field label="Category" value={categoryLabel(report.analysis.category)} />
          <Field label="Track" value={trackLabel(report.analysis.track)} />
          <Field
            label="Severity"
            value={
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs ${severityClasses(
                  report.analysis.severity,
                )}`}
              >
                {report.analysis.severity.toUpperCase()}
              </span>
            }
          />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Generated complaint
          </p>
          <p className="mt-1 rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
            {report.complaintText}
          </p>
        </div>

        <Button
          type="button"
          variant={copied ? "secondary" : "default"}
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Copied
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" /> Copy Complaint
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function FeedCard({ report }: { report: CivicReport }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${severityStripe(
          report.analysis.severity,
        )}`}
      />
      <div className="space-y-2 pl-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {categoryLabel(report.analysis.category)}
            </p>
            <p className="text-xs text-muted-foreground">{report.locality}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityClasses(
              report.analysis.severity,
            )}`}
          >
            {report.analysis.severity.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Community-reported issue · {report.analysis.summary}
        </p>
        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
          <span>{trackLabel(report.analysis.track)}</span>
          <span>{formatRelativeTime(report.createdAt)}</span>
        </div>
      </div>
    </Card>
  );
}

// Re-export helpers for integration use.
export { createReport, persistReport, loadReports, buildComplaintText };
