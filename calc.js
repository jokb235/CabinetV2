// ===========================================================================
// Cabinet sheet-goods calculation engine.
//
// Pure logic only — these functions never touch the DOM. They take a plain
// "state" object (produced by readForm() in index.html) and return computed
// quantities. Kept in a separate file purely for organization.
//
// NOTE: this file is downloaded to and runs in the visitor's browser, so its
// contents are fully visible to anyone who views the page source. Moving the
// math here does NOT hide it. To keep the formulas private they would need to
// run on a server and only return results to the page.
// ===========================================================================

const SQIN_PER_SQFT = 144;

// Door & drawer fronts are tracked as their own material ("… (Fronts)") so they
// can be ordered separately (grain-matched). Grain-match waste applies only here.
const FRONT_SUFFIX = ' (Fronts)';
const isFrontMat = m => typeof m === 'string' && m.endsWith(FRONT_SUFFIX);

// Sheets for one material group; grain-match waste applies only to front material.
const sheetsFor = (area, sheetArea, material, wasteFactor) =>
  sheetArea > 0 ? Math.ceil((area * (isFrontMat(material) ? wasteFactor : 1)) / sheetArea) : 0;

const round2 = n => Math.round(n * 100) / 100;

// Merge a per-cabinet {label: value} map into an accumulator.
function mergeInto(acc, obj) {
  Object.entries(obj || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
}

// ---- calculation (pure: works from a state object) ---------------------
function calc(s) {
  const W = s.width, H = s.height, D = s.depth;
  const doors = s.doors, drawers = s.drawers, shelves = s.shelves, qty = s.qty;

  const tCar = 0.75; // carcass & door/drawer fronts are always 3/4"
  const tBack = s.tBack, tShelf = s.tShelf, tBox = s.tBox, tBottom = s.tBottom;

  const drawerBank = s.drawerBank;
  // In a drawer bank the faces evenly split the full cabinet height (no doors).
  // Otherwise each face uses the configured face height. Box height is always 2" shorter.
  const faceH = (drawerBank && drawers > 0) ? (H / drawers) : s.drawerFaceH;
  const boxH = Math.max(0, faceH - 2);
  const clr = s.clearance;
  const [sheetW, sheetH] = s.sheetSize.split('x').map(Number);
  const sheetArea = (sheetW * sheetH) / SQIN_PER_SQFT;

  // Grain matching forces parts to be cut with the grain in one direction,
  // so they can't be rotated to nest tightly — apply a layout waste factor.
  const grainMatch = s.grainMatch;
  const wasteFactor = grainMatch ? 1 + Math.max(0, s.grainWaste) / 100 : 1;

  // interior width between the two carcass sides
  const innerW = Math.max(0, W - 2 * tCar);
  // drawer box internal width (with clearance on each side)
  const boxW = Math.max(0, innerW - 2 * clr);
  const boxD = Math.max(0, D - 1); // drawer box slightly shallower than cabinet

  // height of the door region = opening height minus total drawer-face stack
  const drawerStack = drawers * faceH;
  const doorH = Math.max(0, H - (drawers > 0 ? drawerStack : 0));

  // Per-component materials (default Plywood for older saved data)
  const mCore = s.mCore || 'Plywood';
  const mBack = s.mBack || 'Plywood';
  const mFront = (s.mFront || 'Plywood') + FRONT_SUFFIX; // ordered separately
  const mBox = s.mBox || 'Plywood';
  const mBottom = s.mBottom || 'Plywood';
  const mShelf = s.mShelf || 'Plywood';
  const mDust = s.mDust || 'Plywood';

  const parts = [];
  const add = (name, qty, w, h, thick, material = mCore) => {
    if (qty <= 0 || w <= 0 || h <= 0) return;
    const area = (qty * w * h) / SQIN_PER_SQFT;
    parts.push({ name, qty, w, h, thick, material, area });
  };

  // Carcass
  add('Sides', 2, D, H, tCar, mCore);
  add('Bottom', 1, innerW, D, tCar, mCore);
  // Top: full sub-top panel, or two ~4" stretchers front & back when "No"
  if ((s.optSubTop || 'Yes') === 'No') add('Top stretchers', 2, innerW, 4, tCar, mCore);
  else add('Top (sub-top)', 1, innerW, D, tCar, mCore);
  // Back
  add('Back', 1, W, H, tBack, mBack);
  // Shelves (span between sides)
  add('Shelves', shelves, innerW, Math.max(0, D - 1), tShelf, mShelf);
  // Doors (fill area above drawers; split across door count for sizing display)
  if (doors > 0 && doorH > 0) {
    add('Door fronts', doors, W / doors, doorH, tCar, mFront);
  }
  // Drawers
  if (drawers > 0) {
    add('Drawer faces', drawers, W, faceH, tCar, mFront);
    add('Drawer box sides', drawers * 2, boxD, boxH, tBox, mBox);
    add('Drawer box front/back', drawers * 2, boxW, boxH, tBox, mBox);
    add('Drawer bottoms', drawers, boxW, boxD, tBottom, mBottom);
  }
  // Dust panels — one horizontal divider per drawer when enabled
  if ((s.optDustPanels || 'No') === 'Yes' && drawers > 0) {
    add('Dust panels', drawers, innerW, Math.max(0, D - 1), s.tDust || 0.5, mDust);
  }

  // Toe kick — a base frame of front/back rails plus two end pieces.
  // Plywood/PVC are sheet goods (3/4"); 2x4 lumber is measured in linear feet.
  // Suppressed when the Toe Kicks option is set to "None".
  const toeKickOpt = s.toeKick;
  const toeKickH = s.toeKickH;
  let lumberLF = 0;
  if ((s.optToeKicks || 'Individual') !== 'None') {
    if (toeKickOpt === 'ply' || toeKickOpt === 'pvc') {
      const mat = toeKickOpt === 'ply' ? 'Plywood' : 'PVC';
      add('Toe kick front/back', 2, W, toeKickH, 0.75, mat);
      add('Toe kick ends', 2, D, toeKickH, 0.75, mat);
    } else if (toeKickOpt === 'lumber') {
      lumberLF = (2 * W + 2 * D) / 12;
    }
  }

  // Group sheet goods by material + thickness
  const byGroup = {};
  parts.forEach(p => {
    const key = p.material + '|' + p.thick;
    if (!byGroup[key]) byGroup[key] = { material: p.material, thick: p.thick, area: 0 };
    byGroup[key].area += p.area;
  });

  // Plastic laminate — applied to selected exposed surfaces. Ordered as its
  // own sheets (its own sheet size), so tracked separately from sheet goods.
  const laminateParts = [];
  let laminateArea = 0;
  const [lamW, lamH] = (s.lamSheet || '48x96').split('x').map(Number);
  const laminateSheetArea = (lamW * lamH) / SQIN_PER_SQFT;
  if (s.lamEnabled) {
    const addLam = (name, a) => { if (a > 0) { laminateParts.push({ name, area: a }); laminateArea += a; } };
    const finEnds = Math.max(0, Math.min(2, Math.floor(s.lamFinEnds || 0)));
    addLam('Finished ends', finEnds * H * D / SQIN_PER_SQFT);
    if (s.lamFaces) addLam('Cabinet faces', (2 * H + 2 * W) * tCar / SQIN_PER_SQFT);
    if (s.lamBottom) addLam('Wall cabinet bottom', W * D / SQIN_PER_SQFT);
  }

  // PVC edge banding (linear feet). Box & shelf edges = 0.5mm; fronts = 3mm.
  const edgeBanding = {};
  const addEB = (lbl, lf) => { if (lf > 0) edgeBanding[lbl] = (edgeBanding[lbl] || 0) + lf; };
  addEB('0.5mm PVC', (2 * H + 2 * W) / 12);            // cabinet box front edges
  addEB('0.5mm PVC', shelves * innerW / 12);           // shelf front edges
  if (doors > 0 && doorH > 0) addEB('3mm PVC', doors * 2 * (W / doors + doorH) / 12); // door perimeters
  if (drawers > 0) addEB('3mm PVC', drawers * 2 * (W + faceH) / 12);                  // drawer-face perimeters

  // Hardware counts (per cabinet). Assumptions documented in the UI/README.
  const european = (s.optHinge || 'European Style') === 'European Style';
  const locked = (s.optLocks || 'No') === 'Yes';
  // One lock on the active door bank, plus one lock per drawer.
  const locks = locked ? ((doors >= 1 ? 1 : 0) + drawers) : 0;
  // In a locking multi-door cabinet, the non-locking doors get elbow catches.
  const elbowCatches = (locked && doors >= 2) ? doors - 1 : 0;
  const hardware = {
    'Hinges': doors * 2,
    'Hinge plates': european ? doors * 2 : 0,
    'Drawer slides (std, pair)': (s.optSlideDuty || 'Standard') === 'Standard' ? drawers : 0,
    'Drawer slides (HD, pair)': (s.optSlideDuty || 'Standard') === 'Heavy' ? drawers : 0,
    'Cabinet pulls': doors + drawers,
    'Shelf supports': shelves * 4,
    'Magnetic catches': european ? 0 : doors,
    'Locks': locks,
    'Elbow catches': elbowCatches,
    'ADA panel supports': s.optAdaSink ? 2 : 0,
    'Coat rod': s.optWardrobe ? 1 : 0,
    'Coat rod flanges': s.optWardrobe ? 2 : 0,
  };

  return { parts, byGroup, qty, sheetArea, sheetW, sheetH, lumberLF, grainMatch, wasteFactor,
    laminateParts, laminateArea, laminateSheetArea, lamW, lamH, edgeBanding, hardware };
}

// Totals for one saved cabinet (× its quantity), aggregating sheets into `agg`.
function summarize(s, agg) {
  const r = calc(s);
  let area = 0, sheets = 0;
  Object.values(r.byGroup).forEach(g => {
    const a = g.area * s.qty;
    const sh = sheetsFor(a, r.sheetArea, g.material, r.wasteFactor);
    area += a; sheets += sh;
    if (agg) {
      const key = g.material + '|' + g.thick;
      if (!agg[key]) agg[key] = { material: g.material, thick: g.thick, area: 0, sheets: 0 };
      agg[key].area += a; agg[key].sheets += sh;
    }
  });
  const laminateArea = r.laminateArea * s.qty;
  const laminateSheets = r.laminateSheetArea > 0 ? Math.ceil(laminateArea / r.laminateSheetArea) : 0;
  const edgeBanding = {}; Object.entries(r.edgeBanding).forEach(([k, v]) => edgeBanding[k] = v * s.qty);
  const hardware = {}; Object.entries(r.hardware).forEach(([k, v]) => { if (v > 0) hardware[k] = v * s.qty; });
  return { area, sheets, lumberLF: r.lumberLF * s.qty, laminateArea, laminateSheets, edgeBanding, hardware };
}
