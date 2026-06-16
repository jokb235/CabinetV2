# CabinetV2

A simple, single-file web app that calculates the square footage of sheet goods
(plywood / MDF panels) needed to build cabinets.

## Usage

Open `index.html` in any web browser — no build step or server required.

1. Enter the overall cabinet **width, height, and depth** (inches).
2. Enter how many **doors, drawers, and shelves** the cabinet has.
3. Choose the **material thickness** for the cabinet back, shelves, drawer
   boxes, and drawer bottoms. The carcass and door/drawer fronts are always
   3/4" material.
4. Enter a **quantity** to multiply the totals across multiple identical cabinets.

Results update live and show:

- Grand total square footage of sheet goods.
- A breakdown **by thickness** (sheet goods are bought by thickness), including an
  estimated number of full sheets needed per thickness.
- An optional **per-component breakdown** of every panel and its size.

## Construction model

The calculator assumes a typical frameless base cabinet. These assumptions are
editable under **Advanced construction assumptions**:

| Component | How it's sized |
|-----------|----------------|
| Sides (×2) | Depth × Height |
| Top & Bottom (×2) | (Width − 2× carcass thickness) × Depth |
| Back | Width × Height |
| Shelves | (Width − 2× carcass thickness) × (Depth − 1") |
| Door fronts | fill the opening above the drawer stack |
| Drawer faces | Width × drawer face height |
| Drawer box sides / front / back | derived from depth, width, and box height |
| Drawer bottoms | inner width × box depth |

The sheet-count estimate rounds up per thickness using the configured sheet size
(default 48" × 96") and does not account for cut layout or waste.
