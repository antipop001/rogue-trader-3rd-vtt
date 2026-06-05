#!/usr/bin/env python3
"""
Audit framing of every NPC portrait under src/images/npcs/<book>/<slug>.png.

For each PNG:
  - Run Haar cascade for frontal + profile faces.
  - If face found, classify by position/size:
      GOOD             — face area > 1.5% and vertical center in [8%, 55%]
                         and no edge touch
      FACE_LOW         — face vertical center > 55% (body framed, face near bottom)
      FACE_CROPPED_TOP — face bbox top within 4px of image top (head cut off)
      FACE_CROPPED_BTM — face bbox bottom within 4px of image bottom (chin cut off)
      FACE_TINY        — face area < 1.5% of image area
      FACE_EDGE_LR     — face bbox touches left or right edge (profile crop)
  - If no face detected → NO_FACE  (could be legit xenos/creature; goes to manual queue)

Output: prints a markdown table to stdout, suitable for review or piping into
BAD_FRAMING.md alongside the existing BAD_PORTRAITS.md manual queue.

Usage:
    audit_face_framing.py                  # audit every PNG
    audit_face_framing.py --book corebook  # limit to one pack
    audit_face_framing.py --json out.json  # write structured findings
"""
import argparse, json, os
from collections import Counter
from pathlib import Path

import cv2

REPO = Path("/home/ahermon/rogue-trader-3rd-vtt")
NPC_ROOT = REPO / "src/images/npcs"

HAAR = cv2.data.haarcascades
FRONTAL = cv2.CascadeClassifier(HAAR + "haarcascade_frontalface_default.xml")
PROFILE = cv2.CascadeClassifier(HAAR + "haarcascade_profileface.xml")


def detect_faces(gray):
    """Try frontal, then profile (both directions). Return list of (x,y,w,h)."""
    rects = list(FRONTAL.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40)))
    if not rects:
        rects = list(PROFILE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40)))
    if not rects:
        # Mirror for the other-side profile
        flipped = cv2.flip(gray, 1)
        mirrored = PROFILE.detectMultiScale(flipped, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40))
        h, w = gray.shape
        rects = [(w - x - fw, y, fw, fh) for (x, y, fw, fh) in mirrored]
    return rects


def classify(img_path):
    img = cv2.imread(str(img_path))
    if img is None:
        return {"status": "UNREADABLE", "detail": ""}
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = detect_faces(gray)
    if not faces:
        return {"status": "NO_FACE", "detail": f"{w}x{h}"}
    # Take the largest face by area
    fx, fy, fw, fh = max(faces, key=lambda r: r[2] * r[3])
    cx, cy = fx + fw / 2, fy + fh / 2
    face_area_pct = (fw * fh) / (w * h) * 100
    y_center_pct = cy / h * 100
    detail = (f"{w}x{h}  face=({fx},{fy},{fw},{fh})  "
              f"area={face_area_pct:.1f}%  y_center={y_center_pct:.0f}%")
    # Classify in priority order
    if fy <= 4:
        return {"status": "FACE_CROPPED_TOP", "detail": detail}
    if fy + fh >= h - 4:
        return {"status": "FACE_CROPPED_BTM", "detail": detail}
    if fx <= 4 or fx + fw >= w - 4:
        return {"status": "FACE_EDGE_LR", "detail": detail}
    if face_area_pct < 1.5:
        return {"status": "FACE_TINY", "detail": detail}
    if y_center_pct > 55:
        return {"status": "FACE_LOW", "detail": detail}
    return {"status": "GOOD", "detail": detail}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", help="restrict to one book slug")
    ap.add_argument("--json", help="write JSON findings to this path")
    args = ap.parse_args()

    findings = []
    for book_dir in sorted(NPC_ROOT.iterdir()):
        if not book_dir.is_dir():
            continue
        if args.book and book_dir.name != args.book:
            continue
        for png in sorted(book_dir.glob("*.png")):
            r = classify(png)
            findings.append({"book": book_dir.name, "slug": png.stem, "path": str(png.relative_to(REPO)), **r})

    counts = Counter(f["status"] for f in findings)
    total = len(findings)

    print(f"# Face-framing audit — {total} portraits across {len({f['book'] for f in findings})} books\n")
    print("## Counts")
    for status in ["GOOD", "NO_FACE", "FACE_LOW", "FACE_CROPPED_TOP", "FACE_CROPPED_BTM",
                   "FACE_TINY", "FACE_EDGE_LR", "UNREADABLE"]:
        n = counts.get(status, 0)
        bar = "#" * (n * 50 // max(total, 1))
        print(f"- {status:18s} {n:3d}  {bar}")

    print("\n## Action queues\n")
    # Things to rerun with reframed prompt: TOP/BTM crops, TINY, EDGE_LR, LOW
    rerun = [f for f in findings if f["status"] in
             ("FACE_CROPPED_TOP", "FACE_CROPPED_BTM", "FACE_LOW", "FACE_TINY", "FACE_EDGE_LR")]
    manual = [f for f in findings if f["status"] in ("NO_FACE", "UNREADABLE")]

    print(f"### Auto-rerun candidates ({len(rerun)})")
    if rerun:
        print("\n| Status | Book | NPC | Detail |\n|---|---|---|---|")
        for f in rerun:
            print(f"| {f['status']} | {f['book']} | {f['slug']} | {f['detail']} |")

    print(f"\n### Manual triage ({len(manual)}) — likely xenos/creature; verify by eye")
    if manual:
        print("\n| Status | Book | NPC | Detail |\n|---|---|---|---|")
        for f in manual:
            print(f"| {f['status']} | {f['book']} | {f['slug']} | {f['detail']} |")

    if args.json:
        Path(args.json).write_text(json.dumps(findings, indent=2))
        print(f"\nWrote {args.json}", file=os.sys.stderr)


if __name__ == "__main__":
    main()
