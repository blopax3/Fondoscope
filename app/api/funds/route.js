import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { getI18n, normalizeLanguage, resolveRequestLanguage } from "../../../lib/i18n";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPythonExecutable() {
  const localVenvPython = `${process.cwd()}/.venv/bin/python`;
  if (existsSync(localVenvPython)) {
    return localVenvPython;
  }

  return "python3";
}

async function forwardToPythonFunction(request, body) {
  const language = normalizeLanguage(body?.language ?? resolveRequestLanguage(request.headers.get("accept-language")));
  const { api } = getI18n(language);
  const endpoint = new URL("/api/funds_backend", request.url);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const rawResponse = await response.text();

  try {
    const payload = JSON.parse(rawResponse);
    return Response.json(payload, { status: response.status });
  } catch {
    return Response.json(
      {
        error: api.invalidPythonResponse,
        details: rawResponse.slice(0, 500),
      },
      { status: 502 }
    );
  }
}

async function runLocalPython(body) {
  const pythonExecutable = getPythonExecutable();
  const payload = JSON.stringify(body);

  const { stdout, stderr } = await execFileAsync(
    pythonExecutable,
    ["-m", "backend.funds.cli", payload],
    {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  if (stderr && stderr.trim()) {
    console.error(stderr);
  }

  return Response.json(JSON.parse(stdout));
}

export async function POST(request) {
  let api = getI18n("en").api;

  try {
    const body = await request.json();
    const language = normalizeLanguage(body?.language ?? resolveRequestLanguage(request.headers.get("accept-language")));
    api = getI18n(language).api;

    if (process.env.VERCEL === "1") {
      return await forwardToPythonFunction(request, body);
    }

    return await runLocalPython(body);
  } catch (error) {
    const message =
      error?.stderr?.toString?.().trim() ||
      error?.message ||
      api.historyFetchFailed;

    return Response.json({ error: message }, { status: 500 });
  }
}
