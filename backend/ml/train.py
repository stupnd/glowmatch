"""Training script for MobileNetV3-Small coarse skin-tone classifier.

Dataset: https://www.kaggle.com/datasets/usamarana/skin-tone-classification-dataset
  3 classes: White / Brown / Black  (500 images each, 1500 total)

Download:
    pip install kaggle
    kaggle datasets download usamarana/skin-tone-classification-dataset -p ml/data --unzip

Then verify the folder names match COARSE_CLASSES below and run:
    cd backend
    python -m ml.train --data_dir ml/data --epochs 30

Exports backend/ml/monk_classifier.pt as a TorchScript model.

Inference contract:
  - Input : (1, 3, 224, 224) float32 tensor, ImageNet-normalised
  - Output: (1, 3) logits  →  argmax maps to COARSE_CLASSES index
  - Coarse class 0 (White) → MST-1..3
  - Coarse class 1 (Brown) → MST-4..7
  - Coarse class 2 (Black) → MST-8..10
"""

import argparse
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, models, transforms

# ---------------------------------------------------------------------------
# Dataset configuration
# ---------------------------------------------------------------------------

# Folder names in the downloaded dataset, in the order they should map to
# coarse class indices 0, 1, 2.
COARSE_CLASSES = ["White", "Brown", "Black"]

_CLASS_TO_IDX = {name: idx for idx, name in enumerate(COARSE_CLASSES)}

NUM_CLASSES = len(COARSE_CLASSES)

# ---------------------------------------------------------------------------
# Transforms
# ---------------------------------------------------------------------------

# ColorJitter is the primary defence against warm studio lighting:
#   - brightness ±50 % simulates over/under-exposed shots
#   - saturation ±30 % simulates warm golden casts
#   - hue ±5 % shifts the colour wheel slightly (warm vs. cool tints)
_IMAGENET_MEAN = [0.485, 0.456, 0.406]
_IMAGENET_STD  = [0.229, 0.224, 0.225]

TRAIN_TF = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.5, contrast=0.5, saturation=0.3, hue=0.05),
    transforms.RandomGrayscale(p=0.05),
    transforms.RandomApply([transforms.GaussianBlur(kernel_size=3)], p=0.3),
    transforms.RandomAffine(degrees=15, translate=(0.1, 0.1)),
    transforms.ToTensor(),
    transforms.Normalize(mean=_IMAGENET_MEAN, std=_IMAGENET_STD),
])

VAL_TF = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=_IMAGENET_MEAN, std=_IMAGENET_STD),
])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _remap(ds: datasets.ImageFolder) -> None:
    """Reorder class indices so they follow COARSE_CLASSES order."""
    old_to_new = {ds.class_to_idx[name]: _CLASS_TO_IDX[name]
                  for name in COARSE_CLASSES if name in ds.class_to_idx}
    if old_to_new == {v: v for v in old_to_new.values()}:
        return  # already in order
    ds.targets = [old_to_new.get(t, t) for t in ds.targets]
    ds.samples = [(p, old_to_new.get(t, t)) for p, t in ds.samples]
    ds.class_to_idx = {k: old_to_new.get(v, v) for k, v in ds.class_to_idx.items()}


def _split_indices(n: int, val_frac: float, seed: int):
    g = torch.Generator().manual_seed(seed)
    perm = torch.randperm(n, generator=g).tolist()
    n_val = max(1, int(n * val_frac))
    return perm[n_val:], perm[:n_val]


def _build_model() -> nn.Module:
    weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1
    model = models.mobilenet_v3_small(weights=weights)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, NUM_CLASSES)
    return model


def _run_epoch(model, loader, criterion, optimizer, device, train: bool):
    model.train() if train else model.eval()
    total_loss = correct = total = 0
    ctx = torch.enable_grad() if train else torch.no_grad()
    with ctx:
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            if train:
                optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            if train:
                loss.backward()
                optimizer.step()
            total_loss += loss.item() * images.size(0)
            correct += (outputs.argmax(1) == labels).sum().item()
            total += images.size(0)
    return total_loss / total, correct / total

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True, type=Path,
                        help="Root folder with White/, Brown/, Black/ sub-dirs")
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).parent / "monk_classifier.pt")
    parser.add_argument("--epochs",     type=int,   default=30)
    parser.add_argument("--batch_size", type=int,   default=32)
    parser.add_argument("--val_split",  type=float, default=0.15)
    parser.add_argument("--seed",       type=int,   default=42)
    args = parser.parse_args()

    if torch.backends.mps.is_available():
        device = torch.device("mps")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")
    print(f"Device: {device}")

    torch.manual_seed(args.seed)

    train_full = datasets.ImageFolder(str(args.data_dir), transform=TRAIN_TF)
    val_full   = datasets.ImageFolder(str(args.data_dir), transform=VAL_TF)
    _remap(train_full)
    _remap(val_full)
    print(f"Classes found: {train_full.class_to_idx}")
    print(f"Total samples: {len(train_full)}")

    train_idx, val_idx = _split_indices(len(train_full), args.val_split, args.seed)
    train_loader = DataLoader(Subset(train_full, train_idx),
                              batch_size=args.batch_size, shuffle=True,
                              num_workers=2, pin_memory=True)
    val_loader   = DataLoader(Subset(val_full,   val_idx),
                              batch_size=args.batch_size, shuffle=False,
                              num_workers=2, pin_memory=True)

    model = _build_model().to(device)
    criterion = nn.CrossEntropyLoss()

    # Phase 1 — head only (backbone frozen)
    for p in model.features.parameters():
        p.requires_grad = False
    optimizer = torch.optim.Adam(model.classifier.parameters(), lr=1e-3)

    head_epochs = min(5, args.epochs // 4)
    print(f"\nPhase 1: classifier head only ({head_epochs} epochs)")
    for epoch in range(head_epochs):
        tl, ta = _run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        vl, va = _run_epoch(model, val_loader,   criterion, optimizer, device, train=False)
        print(f"  [{epoch+1}/{head_epochs}]  train_acc={ta:.3f}  val_acc={va:.3f}")

    # Phase 2 — full fine-tune
    for p in model.features.parameters():
        p.requires_grad = True
    optimizer  = torch.optim.Adam(model.parameters(), lr=1e-4)
    scheduler  = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=args.epochs - head_epochs)

    best_val = 0.0
    remaining = args.epochs - head_epochs
    print(f"\nPhase 2: full fine-tune ({remaining} epochs)")
    for epoch in range(remaining):
        tl, ta = _run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        vl, va = _run_epoch(model, val_loader,   criterion, optimizer, device, train=False)
        scheduler.step()
        marker = ""
        if va > best_val:
            best_val = va
            model.eval()
            example = torch.zeros(1, 3, 224, 224, device=device)
            traced  = torch.jit.trace(model, example)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            traced.save(str(args.output))
            model.train()
            marker = f"  ✓ saved ({args.output.name})"
        print(f"  [{epoch+1}/{remaining}]  train_acc={ta:.3f}  val_acc={va:.3f}{marker}")

    print(f"\nDone. Best val_acc={best_val:.3f}  →  {args.output}")


if __name__ == "__main__":
    main()
