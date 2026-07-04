# CleanSpot AI - Urban Environmental Issue Analyzer & Civic Report Generator

🌱 CleanSpot AI is a citizen-tech hackathon application designed to turn photos of urban environmental issues into structured, submission-ready civic complaints. It supports both Clean Street (litter, garbage dumps, plastic waste) and Clean Air (open burning, vehicle smoke, construction dust) tracks.

---

## 1. Problem Statement

Modern cities suffer from frequent environmental infractions (such as garbage piles on sidewalks, burning dry leaves/plastics, and heavy construction dust). However, reporting these issues is often complex for citizens because:
* Citizens struggle to formulate structured complaints containing the right terminology, tracks, and severity assessments.
* Reporting pipelines are manually intensive, leading to incomplete or vague complaints.
* Public complaint feeds lack visual summarization, making it hard to see community trends at a glance.

## 2. The Solution

CleanSpot AI solves this by using generative vision intelligence to analyze photo evidence:
1. Upload & Analyze: Citizens drag-and-drop or select an image of the environmental problem, optionally specify the locality, and click "Analyze Issue."
2. AI Categorization & Extraction: Gemini 1.5 Flash processes the photo and instantly categorizes the issue, determines its track, assesses severity, outputs a concise summary, and lists a recommended civic action.
3. Draft & Copy Complaints: A structured, formatted civic complaint text is generated. Citizens can copy this text to their clipboard with one click and submit it manually to the respective local authorities.
4. Community Feed & Insights: Shows real-time insights (total reports, severity counts, top category trends) and a filterable history of community-reported issues.

---

## 3. Architecture Overview

The system uses a highly secure, modern, and lightweight serverless architecture:

graph TD
    User([Citizen User]) -->|Uploads image & locality| FE[React + TS + Tailwind v4 Frontend]
    FE -->|POST /api/analyze| CFW[Cloudflare Worker API Proxy]
    CFW -->|Reads secret GEMINI_API_KEY| Secret[(Cloudflare Worker Secret)]
    CFW -->|POST contents + inlineData| Gemini[Gemini 1.5 Flash API]
    Gemini -->|Returns JSON text| CFW
    CFW -->|Validates and normalizes schema| FE
    FE -->|Generates complaint & saves| LS[(localStorage)]
    FE -->|Exposes callback| Dev2[Developer 2 Integration]

### Component Roles:
* Frontend Client (Vite + React + TypeScript + Tailwind CSS v4): Renders the premium dark UI, handles file upload/preview, local state machine (loading, errors, success), and renders the community feed with filter chips.
* Backend Proxy (Cloudflare Worker): Acts as a security proxy to hide the Gemini API key from browser inspection, handles pre-flight CORS options, and parses Gemini's output defensively against malformed JSON or invalid schema values.
* Generative Engine (Gemini 1.5 Flash): Analyzes the base64-encoded image and classifies the category, track, severity, and confidence levels.

---

## 4. Shared API Response Contract

Both Feature 1 and Feature 2 share a strict typescript contract:

export type AnalysisResult = {
  category: "garbage" | "plastic_waste" | "open_burning" | "dust_construction" | "vehicle_smoke" | "other";
  track: "clean_street" | "clean_air" | "both";
  severity: "low" | "medium" | "high";
  summary: string;
  recommendedAction: string;
  confidence: number;
};

export type CivicReport = {
  id: string;
  locality: string;
  createdAt: string;
  status: "reported";
  analysis: AnalysisResult;
  complaintText: string;
};

---

## 5. Local Setup & Running Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* A Gemini API Key from Google AI Studio

### Installation

1. Clone the project repository and navigate into the folder:
   ```bash
   cd gdg
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Install worker backend dependencies:
   ```bash
   cd worker
   npm install
   cd ..
   ```

### Configuration
