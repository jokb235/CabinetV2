# CabinetV2

A simple, single-file web app that calculates the square footage of sheet goods
(plywood / MDF panels) needed to build cabinets.

## Usage

Open `index.html` in any web browser — no build step or server required.

0. (Optional) Fill in **Project Information** (Project #, Name, Address) — it is
   saved in your browser and printed on the report header / exports.
1. Enter the overall cabinet **width, height, and depth** (inches).
2. Enter how many **doors, drawers, and shelves** the cabinet has.
3. Set the **Job-Specific Options** (Dust Panels, Full Sub-Top, Toe Kicks,
   Semi-Exposed, Locks, Hinge Type, Shelf Supports) and a **Material** for each
   component under **Cabinet Box Construction** (Plywood / MDF / Particleboard /
   Marine Grade Plywood). Sheet goods are grouped by material **and** thickness,
   so e.g. an MDF ¾" total is reported separately from a Plywood ¾" total.
4. Choose the **material thickness** for the cabinet back, shelves, drawer
   boxes, and drawer bottoms. The carcass and door/drawer fronts are always
   3/4" material.
4. Choose the **toe kick material**: 3/4" plywood, 3/4" PVC, or 2x4 treated
   lumber. Plywood and PVC are counted as sheet goods (tracked separately by
   material); 2x4 lumber is reported in linear feet with an estimated count of
   eight-foot boards.
5. Enter a **quantity** to multiply the totals across multiple identical cabinets.

## Building a report

1. Give the cabinet a **name** and click **Save to Report**. It's added to the
   Report section at the bottom (and saved in your browser so it survives a reload).
2. Each saved cabinet shows its dimensions, quantity, sheet-goods total, and an
   **Edit** button (loads it back into the form to change and update) plus a
   **Delete** button.
3. The **Project Totals** table aggregates every saved cabinet by material and
   thickness, with the total sheet count and any toe-kick lumber.
4. Export the report:
   - **Export PDF** downloads a formatted `cabinet-report.pdf` directly.
   - **Export CSV** downloads a `cabinet-report.csv` for spreadsheets.
   Both contain every cabinet plus the aggregated project totals. The PDF is
   generated entirely in the browser (no external libraries or network needed).

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

Check **Drawer Bank** when the cabinet front is an even stack of drawers (no
doors): the drawer faces are then divided evenly across the full cabinet height.

Door and drawer fronts are tracked as their own material, **Plywood (Fronts)**,
separate from the rest of the carcass sheets — so the grain-matched faces can be
ordered separately.

Check **Grain Match** when all faces must keep the grain running the same
direction. Parts then can't be rotated to nest tightly, so the sheet-count
estimate adds a layout waste allowance (default 15%, editable under Advanced).
The allowance applies only to the **Plywood (Fronts)** sheets; part square
footage is unchanged — only the number of front sheets to buy increases.

## Plastic laminate

Check **Calculate plastic laminate** to estimate laminate sheets for the
finished/exposed surfaces. Laminate is ordered as its own sheets (with its own
sheet-size selector), separate from the plywood sheet goods. Surfaces accounted
for (each toggleable):

| Surface | How it's sized |
|---------|----------------|
| Finished ends (0–2) | Height × Depth per exposed end |
| Cabinet faces | front-edge perimeter (2×Height + 2×Width) × 3/4" |
| Wall cabinet bottom *(toggleable)* | Width × Depth |

The laminate total (area and estimated sheets) appears in the live results, the
saved-cabinet report, and both the CSV and PDF exports.

## Edge banding & hardware

The app also estimates **PVC edge banding** (linear feet) and **hardware counts**,
shown in the live results and aggregated in the report and exports.

Edge banding (grouped by tape, per the spec):

| Edge | Tape | Length |
|------|------|--------|
| Cabinet box front edges | 0.5mm PVC | 2×Height + 2×Width |
| Shelf front edges | 0.5mm PVC | Width per shelf |
| Door / drawer-front perimeters | 3mm PVC | full perimeter of each front |

Hardware counts (assumptions, per cabinet × quantity):

| Item | Count |
|------|-------|
| Hinges | 2 per door |
| Hinge plates | 1 per hinge (European hinges only) |
| Drawer slides | 1 pair per drawer (Standard or Heavy per the option) |
| Cabinet pulls | 1 per door + 1 per drawer |
| Shelf supports | 4 per shelf |
| Magnetic catches | 1 per door (5-Knuckle hinges only) |
| Locks | 1 per door + drawer when Locks = Yes |
| Drawer faces | Width × drawer face height (default 6") |
| Drawer box sides / front / back | box height is always 2" shorter than the face |
| Drawer bottoms | inner width × box depth |
| Toe kick | base frame: front/back rails (×Width) + 2 ends (×Depth) |

The sheet-count estimate rounds up per thickness using the selected sheet size
— 4' × 8' (default), 5' × 10', or 5' × 12' — and does not account for cut
layout or waste.
