// server.js
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import Bytez from "bytez.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // adjust origin in production
app.use(bodyParser.json());
app.use(express.static("public"));

// ensure API key present
if (!process.env.BYTEZ_API_KEY) {
  console.warn("WARNING: BYTEZ_API_KEY not set. Set it in .env before running.");
}

const sdk = new Bytez(process.env.BYTEZ_API_KEY);
const model = sdk.model("Qwen/Qwen3-0.6B");

// Helper to build prompt
function buildPrompt({ grade, subject, objective }) {
  return `Generate a brief lesson plan for Philippine K–12.

Output must be a 2-column table (Markdown or HTML table OK) with:
Left column: Lesson Part
Right column: Brief Description (teacher-ready)

Lesson Parts (in this order):
- Drill
- Review
- Establishing a Purpose for the Lesson
- Presenting Examples
- Discussion 1
- Discussion 2
- Developing Mastery
- Finding Practical Applications
- Generalization
- Evaluation
- Additional Activities

User inputs:
Grade Level: ${grade}
Subject: ${subject}
Objective: ${objective}

Make each description brief (1-2 sentences). Return just the table and nothing else. If possible return both Markdown table and an HTML table separated by a marker '---HTML---' so the client can use HTML directly.`;
}

// API: generate lesson
app.post("/api/generate-lesson", async (req, res) => {
  try {
    const { grade, subject, objective } = req.body || {};
    if (!grade || !subject || !objective) {
      return res.status(400).json({ error: "grade, subject, and objective are required" });
    }

    const prompt = buildPrompt({ grade, subject, objective });

    const { error, output } = await model.run([
      { role: "user", content: prompt }
    ]);

    if (error) {
      console.error("Bytez API error:", error);
      return res.status(500).json({ error: "Model error", details: error });
    }

    // `output` may be an array/string depending on SDK; normalize:
    const text = Array.isArray(output) ? output.map(o => (o.content ?? o)).join("\n") : (output?.content ?? output);

    // Try to extract HTML block after '---HTML---' if model included that
    let htmlTable = null;
    const htmlMarker = "---HTML---";
    if (text.includes(htmlMarker)) {
      htmlTable = text.split(htmlMarker)[1].trim();
    } else {
      // Fallback: try to convert Markdown table to HTML (simple conversion)
      htmlTable = markdownTableToHtml(text) || text;
    }

    return res.json({ raw: text, html: htmlTable });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Very small helper: convert a Markdown table to simple HTML table
function markdownTableToHtml(md) {
  // naive parser - expects a standard markdown table
  // Split lines
  try {
    const lines = md.split("\n").map(l => l.trim()).filter(l => l);
    if (!lines.length) return null;

    // find the header line (first line with |)
    const tableLines = lines.filter(l => l.includes("|"));
    if (tableLines.length < 2) return null;

    // first line = header, second line = separator
    const header = tableLines[0].split("|").map(s => s.trim()).filter(Boolean);
    const rows = tableLines.slice(2).map(r => r.split("|").map(s => s.trim()).filter(Boolean));

    let html = "<table class=\"lesson-table\">\n<thead><tr>";
    header.forEach(h => { html += `<th>${escapeHtml(h)}</th>`; });
    html += "</tr></thead>\n<tbody>\n";
    rows.forEach(row => {
      html += "<tr>";
      row.forEach(cell => { html += `<td>${escapeHtml(cell)}</td>`; });
      html += "</tr>\n";
    });
    html += "</tbody>\n</table>";
    return html;
  } catch (e) {
    return null;
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* Optional: Google Sheets saving (requires service account credentials)
   This code is intentionally left out of dependencies by default.
   If you want to enable saving to Google Sheets:
   1) npm install googleapis
   2) uncomment the code below and set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID in .env
*/

// import { google } from "googleapis";
// async function saveToSheet(rowArray) {
//   const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
//   const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
//   const sheetId = process.env.GOOGLE_SHEET_ID;
//   if (!clientEmail || !privateKey || !sheetId) throw new Error("Google Sheets env variables not set");

//   const jwtClient = new google.auth.JWT(clientEmail, null, privateKey, [
//     "https://www.googleapis.com/auth/spreadsheets"
//   ]);
//   await jwtClient.authorize();
//   const sheets = google.sheets({ version: "v4", auth: jwtClient });
//   await sheets.spreadsheets.values.append({
//     spreadsheetId: sheetId,
//     range: "Sheet1!A:Z",
//     valueInputOption: "RAW",
//     requestBody: { values: [rowArray] }
//   });
// }

// API: optional save endpoint
app.post("/api/save-lesson", async (req, res) => {
  // Example: req.body should include { grade, subject, objective, raw, html }
  // This endpoint currently returns 501 (not implemented) unless you wire Google Sheets.
  return res.status(501).json({ error: "Saving not configured. See server.js comments to enable Google Sheets." });
});

app.listen(port, () => {
  console.log(`Lesson Planner server listening on http://localhost:${port}`);
});

