"""Read-only audit for differently cropped/re-encoded copies of one photograph.

Requires opencv-python-headless (local import vendor path is also supported).
ORB locates shared details; homography and pixel agreement confirm duplicates.
Reports candidates for human review. Does not alter photographs or catalogue data.
"""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".local-editor/image-import/vendor"))
import cv2
import numpy as np
from PIL import Image
import json
import hashlib
from collections import defaultdict

def main():
    manifest = json.loads((ROOT / "data/program-image-sources.json").read_text(encoding="utf8"))
    entries = list(manifest["images"].items())
    collection = hashlib.sha256("".join(f"{pid}:{record['sha256']}\n" for pid, record in sorted(entries)).encode()).hexdigest()
    orb = cv2.ORB_create(nfeatures=700, fastThreshold=10)
    features, rasters, points, records = [], [], [], []
    for pid, record in entries:
        with Image.open(ROOT / record["local_path"].lstrip("/")) as im:
            im = im.convert("RGB")
            im.thumbnail((640, 640))
            rgb = np.asarray(im)
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        keypoints, descriptors = orb.detectAndCompute(gray, None)
        if descriptors is None or len(keypoints) < 30:
            continue
        features.append(descriptors)
        rasters.append(rgb)
        points.append(np.asarray([p.pt for p in keypoints], dtype=np.float32))
        records.append((pid, record))
    matcher = cv2.FlannBasedMatcher(dict(algorithm=6, table_number=6, key_size=16, multi_probe_level=1), {})
    matcher.add(features)
    matcher.train()
    pairs = []
    for i, descriptors in enumerate(features):
        groups = defaultdict(list)
        for group in matcher.knnMatch(descriptors, k=8):
            seen = set()
            for match in group:
                j = match.imgIdx
                if j >= i or j in seen or match.distance > 35:
                    continue
                seen.add(j)
                groups[j].append(match)
        for j, matches in groups.items():
            if len(matches) < 35:
                continue
            source = np.float32([points[i][m.queryIdx] for m in matches]).reshape(-1,1,2)
            target = np.float32([points[j][m.trainIdx] for m in matches]).reshape(-1,1,2)
            matrix, inliers = cv2.findHomography(source, target, cv2.RANSAC, 3)
            if matrix is None or inliers is None or inliers.sum() < 30 or inliers.mean() < .55:
                continue
            h, w = rasters[j].shape[:2]
            aligned = cv2.warpPerspective(rasters[i], matrix, (w,h))
            valid = cv2.warpPerspective(np.ones(rasters[i].shape[:2], dtype=np.uint8), matrix, (w,h)) > 0
            if valid.mean() < .25:
                continue
            left, right = aligned[valid].astype(np.float32), rasters[j][valid].astype(np.float32)
            difference = float(np.abs(left-right).mean())
            agreement = float((np.abs(left-right).mean(axis=1) < 15).mean())
            correlation = float(np.corrcoef(left.flatten(), right.flatten())[0,1])
            if difference < 18 and correlation > .93 and agreement > .7:
                pairs.append({"first":records[j][0], "second":records[i][0], "matches":len(matches), "inliers":int(inliers.sum()),
                    "mean_pixel_difference":round(difference,2), "correlation":round(correlation,4), "pixel_agreement":round(agreement,4)})
        if (i+1)%50 == 0:
            print(f"Compared {i+1}/{len(features)} photos; {len(pairs)} crop/re-encoding duplicates flagged", flush=True)
    out = ROOT / ".local-editor/image-import/crop-duplicates.json"
    out.write_text(json.dumps({"input_photos":len(entries), "photos_checked":len(records), "collection_sha256":collection, "pairs":pairs}, indent=2)+"\n", encoding="utf8")
    print(f"Flagged {len(pairs)} matching photograph pairs. Review: {out}", flush=True)

if __name__ == "__main__":
    main()
