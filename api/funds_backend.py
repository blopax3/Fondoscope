from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.funds.cli import build_response
from backend.funds.morningstar_client import normalize_language


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Allow", "OPTIONS, POST")
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length else b"{}"

        language = normalize_language(self.headers.get("Accept-Language", "en"))
        try:
            payload = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            message = "El cuerpo de la petición no es JSON válido." if language == "es" else "The request body is not valid JSON."
            self._send_json({"error": message}, status=400)
            return

        if not isinstance(payload, dict):
            message = "El cuerpo de la petición debe ser un objeto JSON." if language == "es" else "The request body must be a JSON object."
            self._send_json({"error": message}, status=400)
            return

        language = normalize_language(str(payload.get("language", "en")))

        try:
            response_body = build_response(payload)
        except ValueError as error:
            self._send_json({"error": str(error)}, status=400)
            return
        except Exception as error:
            fallback = "No se pudo obtener el histórico de los fondos." if language == "es" else "Could not fetch the fund history."
            self._send_json({"error": str(error) or fallback}, status=500)
            return

        self._send_json(response_body, status=200)

    def do_GET(self) -> None:  # noqa: N802
        language = normalize_language(self.headers.get("Accept-Language", "en"))
        self._send_json({"error": "Método no permitido." if language == "es" else "Method not allowed."}, status=405)

    def _send_json(self, payload: dict[str, object], *, status: int) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
