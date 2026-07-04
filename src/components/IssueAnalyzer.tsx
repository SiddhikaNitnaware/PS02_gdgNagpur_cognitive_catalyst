import { useCallback, useRef, useState } from "react";
import {
  DEMO_RESULT,
  isAnalysisResult,
  type AnalysisResult,
} from "@/lib/analysis-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";

export type { AnalysisResult };

type Props = {
  onAnalysisComplete?: (result: AnalysisResult, locality: string) => void;
};

const MAX_BYTES = 8 * 1024 * 1024;

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, data] = result.split(",");
      const mimeType = /data:([^;]+);/.exec(meta)?.[1] ?? file.type;
      resolve({ base64: data, mimeType });
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

const CATEGORY_LABEL: Record<AnalysisResult["category"], string> = {
  garbage: "Garbage",
  plastic_waste: "Plastic Waste",
  open_burning: "Open Burning",
  dust_construction: "Construction Dust",
  vehicle_smoke: "Vehicle Smoke",
  other: "Other",
};
const TRACK_LABEL: Record<AnalysisResult["track"], string> = {
  clean_street: "Clean Street",
  clean_air: "Clean Air",
  both: "Both",
};

export function IssueAnalyzer({ onAnalysisComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locality, setLocality] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | null) => {
    setError(null);
    setResult(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Image is larger than 8 MB. Please choose a smaller one.");
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }, [previewUrl]);

  const clearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  const analyze = async () => {
    if (!file) {
      setError("Please upload an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      if (!isAnalysisResult(data)) {
        throw new Error("Received a malformed response from the analyzer.");
      }
      setResult(data);
      onAnalysisComplete?.(data, locality);
    } catch (e) {
      const msg =
        e instanceof TypeError
          ? "Network error. Please check your connection and try again."
          : e instanceof Error
          ? e.message
          : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = () => {
    setResult(DEMO_RESULT);
    setError(null);
    onAnalysisComplete?.(DEMO_RESULT, locality);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          <div className="relative w-full">
            <img
              src={previewUrl}
              alt="Selected upload preview"
              className="mx-auto max-h-80 rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              className="absolute right-2 top-2 rounded-full bg-background/90 p-1 text-foreground shadow"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Drop a photo here or click to upload
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPG or PNG, up to 8 MB
            </p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="locality">Locality (optional)</Label>
        <Input
          id="locality"
          placeholder="e.g. Andheri West, Mumbai"
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={analyze} disabled={loading || !file} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              AI is analyzing the issue…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze Issue
            </>
          )}
        </Button>
        <Button variant="outline" onClick={loadDemo} disabled={loading}>
          Load demo result
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && <ResultCard result={result} locality={locality} />}
    </div>
  );
}

function severityColor(s: AnalysisResult["severity"]) {
  if (s === "high") return "bg-destructive text-destructive-foreground";
  if (s === "medium") return "bg-chart-5 text-primary-foreground";
  return "bg-chart-2 text-primary-foreground";
}

function ResultCard({
  result,
  locality,
}: {
  result: AnalysisResult;
  locality: string;
}) {
  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight text-foreground">
              {CATEGORY_LABEL[result.category]}
            </h3>
            {locality && (
              <p className="text-xs text-muted-foreground">{locality}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">
            {result.confidence}%
          </div>
          <div className="text-xs text-muted-foreground">confidence</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{TRACK_LABEL[result.track]}</Badge>
        <Badge className={severityColor(result.severity)}>
          {result.severity.toUpperCase()} severity
        </Badge>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Summary
        </p>
        <p className="mt-1 text-sm text-foreground">{result.summary}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recommended action
        </p>
        <p className="mt-1 text-sm text-foreground">
          {result.recommendedAction}
        </p>
      </div>
    </Card>
  );
}
