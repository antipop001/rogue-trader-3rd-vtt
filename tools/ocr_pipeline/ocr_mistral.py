#!/usr/bin/env python3
"""
OCR Rogue Trader PDFs via Mistral's mistral-ocr-latest API.

Reads PDFs from /mnt/project_data/RT/To-Convert/ (or paths passed as argv),
writes output into /mnt/project_data/RT/RT-DOCS/<basename>.pdf/ matching the
existing layout:

    <basename>.pdf/
        markdown.md              # concatenated per-page markdown
        pages/
            page-1/
                markdown.md      # page 1 markdown
                img-0.jpeg       # any inline images on this page
            page-2/
                markdown.md
                img-1.jpeg
            ...

Idempotent: if <target>/markdown.md already exists, the PDF is skipped.

API key read from ~/.config/mistral/key (override with MISTRAL_API_KEY env var).
"""
import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API_BASE = "https://api.mistral.ai/v1"
MODEL = "mistral-ocr-latest"

DEFAULT_SRC = Path("/mnt/project_data/RT/To-Convert")
DEFAULT_DST = Path("/mnt/project_data/RT/RT-DOCS")
KEY_FILE = Path.home() / ".config" / "mistral" / "key"


def load_key() -> str:
    key = os.environ.get("MISTRAL_API_KEY")
    if key:
        return key.strip()
    if KEY_FILE.is_file():
        return KEY_FILE.read_text().strip()
    sys.exit(f"no Mistral API key (set MISTRAL_API_KEY or write to {KEY_FILE})")


def http(method: str, url: str, key: str, *, data=None, files=None, headers=None, timeout=120):
    hdrs = {"Authorization": f"Bearer {key}"}
    if headers:
        hdrs.update(headers)

    if files is not None:
        # multipart/form-data
        boundary = f"----mistral{int(time.time()*1000)}"
        body = bytearray()
        for name, value in (data or {}).items():
            body.extend(f"--{boundary}\r\n".encode())
            body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
            body.extend(f"{value}\r\n".encode())
        for name, (filename, content, ctype) in files.items():
            body.extend(f"--{boundary}\r\n".encode())
            body.extend(
                f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode()
            )
            body.extend(f"Content-Type: {ctype}\r\n\r\n".encode())
            body.extend(content)
            body.extend(b"\r\n")
        body.extend(f"--{boundary}--\r\n".encode())
        hdrs["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        req = urllib.request.Request(url, data=bytes(body), method=method, headers=hdrs)
    elif data is not None:
        payload = json.dumps(data).encode()
        hdrs["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=payload, method=method, headers=hdrs)
    else:
        req = urllib.request.Request(url, method=method, headers=hdrs)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {e.code} {method} {url}: {body}") from e


def upload(pdf: Path, key: str) -> str:
    print(f"  upload {pdf.name} ({pdf.stat().st_size/1e6:.1f} MB)...", flush=True)
    content = pdf.read_bytes()
    resp = http(
        "POST",
        f"{API_BASE}/files",
        key,
        data={"purpose": "ocr"},
        files={"file": (pdf.name, content, "application/pdf")},
        timeout=600,
    )
    return resp["id"]


def signed_url(file_id: str, key: str, expiry_hours: int = 1) -> str:
    q = urllib.parse.urlencode({"expiry": expiry_hours})
    resp = http("GET", f"{API_BASE}/files/{file_id}/url?{q}", key)
    return resp["url"]


def ocr(doc_url: str, key: str) -> dict:
    print(f"  ocr.process...", flush=True)
    return http(
        "POST",
        f"{API_BASE}/ocr",
        key,
        data={
            "model": MODEL,
            "document": {"type": "document_url", "document_url": doc_url},
            "include_image_base64": True,
        },
        timeout=1800,
    )


def write_output(result: dict, target: Path):
    target.mkdir(parents=True, exist_ok=True)
    pages_dir = target / "pages"
    pages_dir.mkdir(exist_ok=True)

    root_md_parts = []
    for page in result.get("pages", []):
        page_num = page.get("index", 0) + 1
        page_dir = pages_dir / f"page-{page_num}"
        page_dir.mkdir(exist_ok=True)
        md = page.get("markdown", "") or ""
        (page_dir / "markdown.md").write_text(md, encoding="utf-8")
        for img in page.get("images", []):
            img_id = img.get("id")
            b64 = img.get("image_base64")
            if not img_id or not b64:
                continue
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            (page_dir / img_id).write_bytes(base64.b64decode(b64))
        root_md_parts.append(md)

    (target / "markdown.md").write_text("\n\n".join(root_md_parts), encoding="utf-8")


def delete_file(file_id: str, key: str):
    try:
        http("DELETE", f"{API_BASE}/files/{file_id}", key, timeout=30)
    except Exception as e:
        print(f"  (cleanup) failed to delete uploaded file {file_id}: {e}")


def process(pdf: Path, dst_root: Path, key: str, *, keep_uploaded=False, force=False):
    target = dst_root / pdf.name
    out_md = target / "markdown.md"
    if out_md.exists() and not force:
        print(f"= {pdf.name}: already done, skipping")
        return
    print(f"+ {pdf.name}")
    t0 = time.time()
    file_id = upload(pdf, key)
    try:
        url = signed_url(file_id, key)
        result = ocr(url, key)
        n_pages = len(result.get("pages", []))
        print(f"  {n_pages} pages -> {target}")
        write_output(result, target)
    finally:
        if not keep_uploaded:
            delete_file(file_id, key)
    print(f"  done in {time.time()-t0:.1f}s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*", help="specific PDFs (default: all in To-Convert)")
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--dst", type=Path, default=DEFAULT_DST)
    ap.add_argument("--force", action="store_true", help="reprocess even if markdown.md exists")
    ap.add_argument("--keep-uploaded", action="store_true",
                    help="don't delete the uploaded file from Mistral after OCR")
    args = ap.parse_args()

    key = load_key()

    if args.paths:
        pdfs = [Path(p) for p in args.paths]
    else:
        pdfs = sorted(p for p in args.src.glob("*.pdf") if p.is_file())

    if not pdfs:
        sys.exit("no PDFs to process")

    print(f"{len(pdfs)} PDF(s) to consider, dst={args.dst}")
    for pdf in pdfs:
        try:
            process(pdf, args.dst, key, keep_uploaded=args.keep_uploaded, force=args.force)
        except Exception as e:
            print(f"! {pdf.name} failed: {e}")


if __name__ == "__main__":
    main()
