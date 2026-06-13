# Presence detection model

Presence detection (`src/presence.py`) uses **OpenCV DNN MobileNet-SSD** (Caffe)
to detect the "person" class. Drop the two model files here:

```
firmware/models/
├── MobileNetSSD_deploy.prototxt
└── MobileNetSSD_deploy.caffemodel
```

If these files are **missing**, presence detection automatically falls back to
OpenCV's built-in HOG people detector (no download needed) — lower accuracy, but
the firmware still runs.

## Download

MobileNet-SSD (VOC, 21 classes incl. `person`) is widely mirrored. For example:

```bash
cd firmware/models

# Network definition (~30 KB)
curl -L -o MobileNetSSD_deploy.prototxt \
  https://raw.githubusercontent.com/chuanqi305/MobileNet-SSD/master/deploy.prototxt

# Weights (~23 MB)
curl -L -o MobileNetSSD_deploy.caffemodel \
  https://github.com/chuanqi305/MobileNet-SSD/raw/master/mobilenet_iter_73000.caffemodel
```

> Verify the URLs resolve to the real files (mirrors move). The model files are
> git-ignored (see `firmware/.gitignore`) so they don't bloat the repo.

## Verify it loaded

```bash
cd firmware
python -m src.presence --image some_photo_with_a_person.jpg
```

You should see the DNN backend log line and `detected=True`. A photo of a pet
should report `detected=False`.

## Tuning

Detection thresholds (confidence, ROI, min box size, debounce) are set via env
vars — see `firmware/.env.example`.
