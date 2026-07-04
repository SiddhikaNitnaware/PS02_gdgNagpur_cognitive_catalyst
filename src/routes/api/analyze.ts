import { createFileRoute } from "@tanstack/react-router";
import { isAnalysisResult } from "@/lib/analysis-types";

const GEMINI_INSTRUCTION = `You analyze visible urban environmental issues from photos. Classify only what is visibly supported. Return valid JSON only, with no markdown or explanation outside JSON. Category must be exactly one of: garbage, plastic_waste, open_burning, dust_construction, vehicle_smoke, other. Track must be exactly clean_street, clean_air, or both. Severity must be exactly low, medium, or high. Summary must be one concise factual sentence. RecommendedAction must be one practical civic action. Confidence must be an integer from 0 to 100. If the image is unclear, use category other and a lower confidence score.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: [
        "garbage",
        "plastic_waste",
        "open_burning",
        "dust_construction",
        "vehicle_smoke",
        "other",
      ],
    },
    track: { type: "string", enum: ["clean_street", "clean_air", "both"] },
    severity: { type: "string", enum: ["low", "medium", "high"] },
    summary: { type: "string" },
    recommendedAction: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: [
    "category",
    "track",
    "severity",
    "summary",
    "recommendedAction",
    "confidence",
  ],
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return errorResponse("Server missing GEMINI_API_KEY", 500);
        }

        let imageBase64: string | null = null;
        let mimeType = "image/jpeg";

        const contentType = request.headers.get("content-type") || "";
        try {
          if (contentType.includes("application/json")) {
            const body = (await request.json()) as {
              imageBase64?: string;
              mimeType?: string;
            };
            if (body.imageBase64) {
              const stripped = body.imageBase64.replace(
                /^data:([^;]+);base64,/,
                (_m, mt) => {
                  mimeType = mt || mimeType;
                  return "";
                },
              );
              imageBase64 = stripped;
              if (body.mimeType) mimeType = body.mimeType;
            }
          } else if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const file = form.get("image");
            if (file instanceof File) {
              mimeType = file.type || mimeType;
              const buf = new Uint8Array(await file.arrayBuffer());
              let binary = "";
              for (let i = 0; i < buf.length; i++)
                binary += String.fromCharCode(buf[i]);
              imageBase64 = btoa(binary);
            }
          }
        } catch {
          return errorResponse("Could not parse request body", 400);
        }

        if (!imageBase64) {
          return errorResponse("No image provided", 400);
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let geminiRes: Response;
        try {
          geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: GEMINI_INSTRUCTION },
                    { inlineData: { mimeType, data: imageBase64 } },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: RESPONSE_SCHEMA,
                temperature: 0.2,
              },
            }),
          });
        } catch {
          return errorResponse("Failed to reach Gemini", 502);
        }

        if (!geminiRes.ok) {
          const text = await geminiRes.text().catch(() => "");
          console.error("Gemini error", geminiRes.status, text);
          return errorResponse("Gemini API request failed", 502);
        }

        let gemJson: unknown;
        try {
          gemJson = await geminiRes.json();
        } catch {
          return errorResponse("Gemini returned invalid JSON", 502);
        }

        const rawText =
          (gemJson as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          })?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        let parsed: unknown;
        try {
          const cleaned = rawText
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```$/i, "")
            .trim();
          parsed = JSON.parse(cleaned);
        } catch {
          return errorResponse("Model output was not valid JSON", 502);
        }

        if (parsed && typeof parsed === "object") {
          const p = parsed as Record<string, unknown>;
          if (typeof p.confidence === "number")
            p.confidence = Math.max(
              0,
              Math.min(100, Math.round(p.confidence as number)),
            );
        }

        if (!isAnalysisResult(parsed)) {
          return errorResponse("Model output failed validation", 502);
        }

        return Response.json(parsed);
      },
    },
  },
});
