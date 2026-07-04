import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { IssueAnalyzer } from "@/components/IssueAnalyzer";
import { CivicReportSection } from "@/components/CivicReportSection";
import type { AnalysisResult } from "@/lib/analysis-types";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [analysis, setAnalysis] = useState<AnalysisResult | undefined>();
  const [locality, setLocality] = useState<string>("");

  const handleComplete = (result: AnalysisResult, loc: string) => {
    setAnalysis(result);
    setLocality(loc);
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                CleanSpot AI
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-powered civic reporting
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-14 px-4 py-10">
        <section className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Turn a photo into a civic report
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Upload a photo of garbage, open burning, dust, or smoke. Our AI
            classifies the issue and drafts a report you can submit.
          </p>
        </section>

        <IssueAnalyzer onAnalysisComplete={handleComplete} />

        <CivicReportSection analysisResult={analysis} locality={locality} />
      </main>
    </div>
  );
}
