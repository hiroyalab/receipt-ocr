import sys
import numpy as np
from paddleocr import PaddleOCR

ocr = PaddleOCR(
    lang="japan",
    ocr_version="PP-OCRv5",
    use_textline_orientation=True,
    text_det_thresh=0.3,
    text_det_box_thresh=0.5,
    text_rec_score_thresh=0.0,
)

result = ocr.predict(sys.argv[1])
words = []
for res in (result or []):
    for text, conf, poly in zip(res["rec_texts"], res["rec_scores"], res["rec_polys"]):
        pts = np.array(poly)
        cy = pts[:, 1].mean()
        cx = pts[:, 0].mean()
        h = pts[:, 1].max() - pts[:, 1].min()
        words.append((cy, cx, h, text, conf))

if not words:
    print("テキストが検出されませんでした")
    sys.exit(0)

avg_h = np.mean([w[2] for w in words])
threshold = avg_h * 0.6

words.sort(key=lambda w: w[0])

lines = []
current = [words[0]]
for word in words[1:]:
    if abs(word[0] - current[0][0]) < threshold:
        current.append(word)
    else:
        lines.append(current)
        current = [word]
lines.append(current)

for line in lines:
    line.sort(key=lambda w: w[1])
    text = " ".join(w[3] for w in line)
    conf = min(w[4] for w in line)
    print(f"{conf:.2f}  {text}")
