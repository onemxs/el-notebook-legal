import fs from "fs";
import path from "path";
import os from "os";

async function transcribeWithWhisper(filePath, apiKey, baseURL = "https://api.openai.com/v1") {
  const fileStream = fs.createReadStream(filePath);
  const FormData = (await import("form-data")).default;
  const formData = new FormData();

  formData.append("file", fileStream);
  formData.append("model", "whisper-1");
  formData.append("language", "es");
  formData.append("response_format", "verbose_json");

  const response = await fetch(`${baseURL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${error}`);
  }

  const result = await response.json();

  if (result.segments && result.segments.length > 0) {
    return result.segments
      .map((seg) => {
        const start = formatTimestamp(seg.start);
        return `[${start}] ${seg.text.trim()}`;
      })
      .join("\n");
  }

  return result.text;
}

function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

async function saveUploadedFile(req) {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `video-${Date.now()}.tmp`);
    const stream = fs.createWriteStream(tmpFile);

    stream.on("finish", () => resolve(tmpFile));
    stream.on("error", reject);
    req.on("data", (chunk) => stream.write(chunk));
    req.on("end", () => stream.end());
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const openaiBaseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  if (!openaiKey) {
    return res.status(400).json({
      error: "not_configured",
      message: "OPENAI_API_KEY environment variable not set",
    });
  }

  let tmpFile = null;

  try {
    tmpFile = await saveUploadedFile(req);
    const transcription = await transcribeWithWhisper(tmpFile, openaiKey, openaiBaseURL);

    const result = {
      id: `transcription-${Date.now()}`,
      fileName: "video",
      duration: 0,
      transcription,
      language: "es-MX",
      createdAt: Date.now(),
    };

    return res.status(200).json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/transcribe-video]", msg);
    return res.status(500).json({ error: msg });
  } finally {
    if (tmpFile) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // ignore
      }
    }
  }
}
