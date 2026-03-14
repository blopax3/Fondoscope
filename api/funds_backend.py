from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.funds.cli import build_response


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Allow", "OPTIONS, POST")
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length else b"{}"

        try:
            payload = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._send_json({"error": "El cuerpo de la peticion no es JSON valido."}, status=400)
            return

        if not isinstance(payload, dict):
            self._send_json({"error": "El cuerpo de la peticion debe ser un objeto JSON."}, status=400)
            return

        try:
            response_body = build_response(payload)
        except ValueError as error:
            self._send_json({"error": str(error)}, status=400)
            return
        except Exception as error:
            self._send_json({"error": str(error) or "No se pudo obtener el histórico de los fondos."}, status=500)
            return

        self._send_json(response_body, status=200)

    def do_GET(self) -> None:  # noqa: N802
        self._send_json({"error": "Metodo no permitido."}, status=405)

    def _send_json(self, payload: dict[str, object], *, status: int) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
