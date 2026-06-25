"""
CLING Python API Service
Dijalankan di Railway.com — menangani eksekusi Python dan analisis Pylint.
"""

import json
import os
import subprocess
import sys
import tempfile
import textwrap
import uuid
from pathlib import Path

try:
    import resource
except ImportError:
    # resource is a Unix-only module; ignore if on Windows
    resource = None


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

# ---------------------------------------------------------------------------
# Konstanta sandbox
# ---------------------------------------------------------------------------

# Modul yang DIBLOKIR — tidak boleh di-import siswa
BLOCKED_MODULES = {
    "os", "sys", "subprocess", "socket", "shutil", "pathlib",
    "importlib", "builtins", "ctypes", "multiprocessing", "threading",
    "signal", "resource", "pty", "tty", "termios", "fcntl", "mmap",
    "gc", "inspect", "ast", "dis", "code", "codeop", "compileall",
    "pickle", "shelve", "marshal", "copyreg",
    "http", "urllib", "ftplib", "smtplib", "poplib", "imaplib",
    "xmlrpc", "socketserver", "ssl",
    "nt", "posix", "winreg", "winsound", "_thread",
}

# Batas ukuran output (bytes) — cegah OOM dari infinite print
MAX_OUTPUT_BYTES = 100_000      # 100 KB
MAX_CODE_LENGTH  = 20_000       # 20 KB — batasi panjang kode input
MAX_MEMORY_MB    = 128          # batas RSS memory child process

# Template wrapper sandbox — membungkus kode siswa
# Cara kerja:
#   1. Override __import__ untuk blokir modul berbahaya
#   2. Hapus built-in berbahaya dari __builtins__
#   3. Jalankan kode siswa di dalam exec() dengan globals terbatas
SANDBOX_WRAPPER = textwrap.dedent("""
import sys as _sys
import builtins as _builtins

_BLOCKED = {blocked_set}

_original_import = _builtins.__import__

def _safe_import(name, *args, **kwargs):
    top = name.split('.')[0]
    if top in _BLOCKED:
        raise ImportError(
            f"Import '{{name}}' tidak diizinkan. "
            f"Modul ini diblokir demi keamanan platform CLING."
        )
    return _original_import(name, *args, **kwargs)

_builtins.__import__ = _safe_import

# Hapus built-in berbahaya
for _attr in ("__import__", "open", "compile", "eval", "exec",
              "breakpoint", "input", "__loader__", "__spec__"):
    try:
        delattr(_builtins, _attr)
    except AttributeError:
        pass

# Kembalikan __import__ yang aman sebagai satu-satunya jalur import
_builtins.__import__ = _safe_import

# ── Kode siswa di bawah ini ──────────────────────────────────────────────
{student_code}
""")


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


def check_code_length(code: str) -> None:
    """Tolak kode yang terlalu panjang sebelum menulis file."""
    if len(code.encode("utf-8")) > MAX_CODE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Kode terlalu panjang (maks {MAX_CODE_LENGTH // 1000} KB).",
        )


def write_temp_file(code: str, wrap_sandbox: bool = True) -> Path:
    """
    Tulis kode ke file sementara.
    Jika wrap_sandbox=True, kode dibungkus template sandbox terlebih dahulu.
    """
    tmp_root = Path(tempfile.gettempdir()) / "cling"
    request_dir = tmp_root / uuid.uuid4().hex
    request_dir.mkdir(parents=True, exist_ok=True)
    tmp_file = request_dir / "student_code.py"

    if wrap_sandbox:
        blocked_repr = repr(BLOCKED_MODULES)
        wrapped = SANDBOX_WRAPPER.format(
            blocked_set=blocked_repr,
            student_code=code,
        )
        tmp_file.write_text(wrapped, encoding="utf-8")
    else:
        tmp_file.write_text(code, encoding="utf-8")

    return tmp_file


def cleanup_temp_file(tmp_file: Path) -> None:
    """Hapus file dan folder sementara untuk request ini."""
    try:
        tmp_file.unlink(missing_ok=True)
    finally:
        try:
            tmp_dir = tmp_file.parent
            if tmp_dir.parent.name == "cling":
                tmp_dir.rmdir()
        except OSError:
            pass


def _set_resource_limits():
    """
    Dipanggil di child process sebelum exec — pasang batas resource.
    Hanya berjalan di Linux/macOS (Railway menggunakan Linux).
    """
    if resource is None:
        return
    try:
        # Batas CPU time (detik) — hard kill jika melampaui
        resource.setrlimit(resource.RLIMIT_CPU, (MAX_EXEC_SECONDS, MAX_EXEC_SECONDS + 2))  # type: ignore
        # Batas RSS memory
        mem_bytes = MAX_MEMORY_MB * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))  # type: ignore
        # Batas jumlah file yang bisa dibuka
        resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))  # type: ignore
        # Batas ukuran file yang bisa ditulis (cegah fork bomb via file)
        resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))  # type: ignore
    except Exception:
        # Jika platform tidak mendukung (misal Windows dev), lanjut saja
        pass


def run_sandboxed(
    cmd: list[str],
    timeout: int,
    capture_output: bool = True,
) -> tuple[str, str, int]:
    """
    Jalankan perintah dengan:
      - preexec_fn: pasang resource limits di child process
      - Popen + communicate: bisa dibunuh jika timeout
      - Potong output agar tidak OOM
    Kembalikan (stdout, stderr, returncode).
    """
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE if capture_output else subprocess.DEVNULL,
            stderr=subprocess.PIPE if capture_output else subprocess.DEVNULL,
            text=True,
            preexec_fn=_set_resource_limits,   # <-- resource limits di child
            env={"PATH": os.environ.get("PATH", "")},  # env minimal — tidak ada HOME/USER/dll
        )
    except Exception as exc:
        return "", str(exc), -1

    try:
        out, err = proc.communicate(timeout=timeout)
        stdout = out or ""
        stderr = err or ""
    except subprocess.TimeoutExpired:
        proc.kill()
        try:
            proc.communicate(timeout=3)
        except Exception:
            pass
        return "", f"Timeout: eksekusi melebihi {timeout} detik.", -1

    # Potong output jika terlalu besar
    if len(stdout) > MAX_OUTPUT_BYTES:
        stdout = stdout[:MAX_OUTPUT_BYTES] + "\n\n[OUTPUT TERPOTONG — melebihi batas]"

    if len(stderr) > MAX_OUTPUT_BYTES:
        stderr = stderr[:MAX_OUTPUT_BYTES] + "\n[STDERR TERPOTONG]"

    return stdout, stderr, proc.returncode


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
    Eksekusi kode Python di dalam sandbox, kembalikan stdout/stderr dan exit code.
    """
    check_api_key(req.api_key)

    if not req.code or not req.code.strip():
        raise HTTPException(status_code=400, detail="Code is empty")

    check_code_length(req.code)

    tmp_file = write_temp_file(req.code, wrap_sandbox=True)
    try:
        stdout, stderr, returncode = run_sandboxed(
            [PYTHON_EXEC, str(tmp_file)],
            timeout=MAX_EXEC_SECONDS,
        )

        # Bersihkan referensi path temp dari pesan error
        tmp_path_str = str(tmp_file)
        stderr = stderr.replace(tmp_path_str, "<student_code>")

        success = returncode == 0
        return {
            "success": success,
            "output": stdout,
            "error": stderr if not success else None,
            "exit_code": returncode,
        }
    except Exception as exc:
        return {"success": False, "output": None, "error": str(exc), "exit_code": -1}
    finally:
        cleanup_temp_file(tmp_file)


# ---------------------------------------------------------------------------
# Endpoint: validasi sintaks
# ---------------------------------------------------------------------------

@app.post("/validate")
def validate_syntax(req: CodeRequest):
    """
    Validasi sintaks Python tanpa menjalankan kode.
    Tidak perlu sandbox penuh — hanya parse AST, tidak exec.
    """
    check_api_key(req.api_key)
    check_code_length(req.code)

    tmp_file = write_temp_file(req.code, wrap_sandbox=False)
    try:
        # Gunakan -c ast.parse — tidak ada eksekusi kode siswa
        stdout, stderr, returncode = run_sandboxed(
            [
                PYTHON_EXEC,
                "-c",
                f"import ast; ast.parse(open({json.dumps(str(tmp_file))}, encoding='utf-8').read()); print('SYNTAX_OK')",
            ],
            timeout=5,
        )
        valid = returncode == 0
        error_line = stderr.strip().split("\n")[0] if stderr else None
        return {"valid": valid, "error": error_line if not valid else None}
    except Exception:
        return {"valid": True, "error": None}
    finally:
        cleanup_temp_file(tmp_file)


# ---------------------------------------------------------------------------
# Endpoint: analisis Pylint
# ---------------------------------------------------------------------------

@app.post("/analyze")
def analyze_code(req: CodeRequest):
    """
    Jalankan Pylint pada kode Python mentah (TANPA sandbox wrapper).
    Pylint menganalisis kode siswa — bukan mengeksekusinya.
    """
    check_api_key(req.api_key)

    if not req.code or not req.code.strip():
        raise HTTPException(status_code=400, detail="Code is empty")

    check_code_length(req.code)

    # Pylint menganalisis kode asli siswa (tanpa wrapper agar hasil akurat)
    tmp_file = write_temp_file(req.code, wrap_sandbox=False)
    try:
        stdout, stderr, _ = run_sandboxed(
            [
                "pylint",
                "--output-format=json",
                "--score=n",
                "--persistent=n",
                "--enable=all",
                "--disable=C0114,R0903",
                str(tmp_file),
            ],
            timeout=30,
        )

        messages = []
        raw_stdout = stdout.strip()
        if raw_stdout:
            try:
                parsed = json.loads(raw_stdout)
                if isinstance(parsed, list):
                    messages = parsed
            except json.JSONDecodeError:
                pass

        # Normalisasi: hilangkan referensi path file temp dari pesan
        tmp_path_str = str(tmp_file)
        for msg in messages:
            if "path" in msg:
                del msg["path"]
            if "module" in msg:
                msg["module"] = "student_code"
            if "message" in msg:
                msg["message"] = msg["message"].replace(tmp_path_str, "<student_code>")

        return {"success": True, "messages": messages}

    except Exception as exc:
        return {"success": False, "messages": [], "error": str(exc)}
    finally:
        cleanup_temp_file(tmp_file)