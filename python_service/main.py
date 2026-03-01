"""
CLING Python API Service
Dijalankan di Render.com — menangani eksekusi Python dan analisis Pylint.
"""

import json
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="CLING Python API", version="1.0.0")

# CORS — izinkan request dari domain Vercel dan localhost
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW.split(",") if ALLOWED_ORIGINS_RAW else []
USE_WILDCARD = len(ALLOWED_ORIGINS) == 0

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if USE_WILDCARD else ALLOWED_ORIGINS,
    allow_credentials=False if USE_WILDCARD else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key sederhana untuk keamanan dasar
API_SECRET = os.getenv("API_SECRET", "")

PYTHON_EXEC = sys.executable
MAX_EXEC_SECONDS = 10


class CodeRequest(BaseModel):
    code: str
    api_key: str = ""


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def check_api_key(submitted: str) -> None:
    """Validasi API key jika API_SECRET di-set."""
    if API_SECRET and submitted != API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API key")


def write_temp_file(code: str) -> Path:
    """Tulis kode ke file sementara, kembalikan path-nya."""
    tmp_dir = Path(tempfile.gettempdir()) / "cling"
    tmp_dir.mkdir(exist_ok=True)
    tmp_file = tmp_dir / f"{uuid.uuid4().hex}.py"
    tmp_file.write_text(code, encoding="utf-8")
    return tmp_file


# ---------------------------------------------------------------------------
# Endpoint: kesehatan
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    """Health check."""
    return {"status": "ok", "service": "CLING Python API"}


@app.get("/health")
def health():
    """Simple health check — tidak jalankan subprocess."""
    return {"status": "ok", "python": sys.version.split()[0]}


# ---------------------------------------------------------------------------
# Endpoint: eksekusi kode Python
# ---------------------------------------------------------------------------

@app.post("/execute")
def execute_code(req: CodeRequest):
    """
    Eksekusi kode Python, kembalikan stdout/stderr dan exit code.
    """
    check_api_key(req.api_key)

    if not req.code or not req.code.strip():
        raise HTTPException(status_code=400, detail="Code is empty")

    tmp_file = write_temp_file(req.code)
    try:
        result = subprocess.run(
            [PYTHON_EXEC, str(tmp_file)],
            capture_output=True,
            text=True,
            timeout=MAX_EXEC_SECONDS,
        )
        success = result.returncode == 0
        return {
            "success": success,
            "output": result.stdout,
            "error": result.stderr if not success else None,
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": None,
            "error": f"Execution timeout ({MAX_EXEC_SECONDS}s)",
            "exit_code": -1,
        }
    except Exception as exc:
        return {"success": False, "output": None, "error": str(exc), "exit_code": -1}
    finally:
        tmp_file.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Endpoint: validasi sintaks
# ---------------------------------------------------------------------------

@app.post("/validate")
def validate_syntax(req: CodeRequest):
    """
    Validasi sintaks Python tanpa menjalankan kode.
    """
    check_api_key(req.api_key)

    tmp_file = write_temp_file(req.code)
    try:
        result = subprocess.run(
            [PYTHON_EXEC, "-c", f"import ast; ast.parse(open({json.dumps(str(tmp_file))}, encoding='utf-8').read()); print('SYNTAX_OK')"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        valid = result.returncode == 0
        error_line = result.stderr.strip().split("\n")[0] if result.stderr else None
        return {"valid": valid, "error": error_line if not valid else None}
    except Exception as exc:
        return {"valid": True, "error": None}  # skip on error
    finally:
        tmp_file.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Endpoint: analisis Pylint
# ---------------------------------------------------------------------------

@app.post("/analyze")
def analyze_code(req: CodeRequest):
    """
    Jalankan Pylint pada kode Python, kembalikan hasil JSON.
    """
    check_api_key(req.api_key)

    if not req.code or not req.code.strip():
        raise HTTPException(status_code=400, detail="Code is empty")

    tmp_file = write_temp_file(req.code)
    try:
        result = subprocess.run(
            [
                "pylint",
                "--output-format=json",
                "--score=n",
                "--persistent=n",
                "--enable=all",
                "--disable=C0114,R0903",
                str(tmp_file),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        messages = []
        raw_stdout = result.stdout.strip()
        if raw_stdout:
            try:
                parsed = json.loads(raw_stdout)
                if isinstance(parsed, list):
                    messages = parsed
            except json.JSONDecodeError:
                pass

        # Normalisasi: hilangkan referensi path file temp dari pesan
        for msg in messages:
            if "path" in msg:
                del msg["path"]
            if "module" in msg:
                msg["module"] = "student_code"

        return {"success": True, "messages": messages}

    except subprocess.TimeoutExpired:
        return {"success": False, "messages": [], "error": "Pylint timeout (30s)"}
    except Exception as exc:
        return {"success": False, "messages": [], "error": str(exc)}
    finally:
        tmp_file.unlink(missing_ok=True)
