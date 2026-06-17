// ===========================================================================
// Tests for the cabinet calculation engine (calc.js).
//
// Pure-Node, no dependencies. Run with:   node test.js   (or: npm test)
// Exits non-zero if any assertion fails, so it works in CI.
// ===========================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load calc.js and expose its symbols (calc.js uses top-level const/function,
// so we re-export them onto the VM global to grab them here).
const src = fs.readFileSync(path.join(__dirname, 'calc.js'), 'utf8') +
  '\n;Object.assign(globalThis, { calc, summarize, sheetsFor, isFrontMat, round2, mergeInto });';
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const { calc, summarize, sheetsFor, isFrontMat, round2, mergeInto } = ctx;

// ---- tiny test harness -------------------------------------------------
let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ FAIL: ' + name); }
}
function approx(name, actual, expected, eps = 0.01) {
  check(`${name} (${round2(actual)} ≈ ${expected})`, Math.abs(actual - expected) <= eps);
}
function eq(name, actual, expected) {
  check(`${name} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`, actual === expected);
}

// A complete default state; override fields per test.
function state(over) {
  return Object.assign({
    name: 'Test', width: 30, height: 34.5, depth: 24, doors: 2, drawers: 2, shelves: 1, qty: 1,
    tBack: 0.25, tShelf: 0.75, tBox: 0.5, tBottom: 0.25, tDust: 0.5,
    mCore: 'Plywood', mBack: 'Plywood', mFront: 'Plywood', mBox: 'Plywood',
    mBottom: 'Plywood', mShelf: 'Plywood', mDust: 'Plywood',
    drawerBank: false, grainMatch: false, grainWaste: 15,
    drawerFaceH: 6, clearance: 0.5, toeKickH: 4,
    sheetSize: '48x96', toeKick: 'ply',
    optDustPanels: 'No', optSubTop: 'Yes', optToeKicks: 'Individual', optSemiExposed: 'None',
    optLocks: 'No', optHinge: 'European Style', optShelfSup: '5mm Pins', optSlideDuty: 'Standard',
    optAdaSink: false, optWardrobe: false,
    lamEnabled: false, lamFinEnds: 0, lamFaces: true, lamBottom: false, lamSheet: '48x96',
  }, over);
}
const area = (r, material, thick) => { const g = r.byGroup[material + '|' + thick]; return g ? g.area : 0; };

// ---- helper-function tests --------------------------------------------
eq('isFrontMat true', isFrontMat('Plywood (Fronts)'), true);
eq('isFrontMat false', isFrontMat('Plywood'), false);
eq('round2', round2(1.23456), 1.23);
eq('sheetsFor non-front ignores waste', sheetsFor(30, 32, 'Plywood', 1.15), 1);
eq('sheetsFor front applies waste', sheetsFor(30, 32, 'Plywood (Fronts)', 1.15), 2);
eq('sheetsFor zero sheet area', sheetsFor(30, 0, 'Plywood', 1), 0);

// ---- carcass sheet goods (default cabinet) ----------------------------
{
  const r = calc(state());
  approx('default carcass 3/4 plywood', area(r, 'Plywood', 0.75), 28.55);
  approx('default 1/4 plywood (back + drawer bottoms)', area(r, 'Plywood', 0.25), 15.97);
  approx('default 1/2 plywood (drawer box)', area(r, 'Plywood', 0.5), 5.61);
  approx('fronts tracked separately', area(r, 'Plywood (Fronts)', 0.75), 7.19);
}

// ---- materials group separately ---------------------------------------
{
  const r = calc(state({ mCore: 'MDF', mBack: 'Particleboard' }));
  approx('MDF core grouped on its own', area(r, 'MDF', 0.75), 21.0);
  approx('Particleboard back grouped on its own', area(r, 'Particleboard', 0.25), 7.19);
  check('plywood core no longer present at 3/4 except toe kick + shelves',
    area(r, 'Plywood', 0.75) > 0 && area(r, 'MDF', 0.75) > area(r, 'Plywood', 0.75));
}

// ---- full sub-top vs stretchers ---------------------------------------
{
  const full = calc(state()), strip = calc(state({ optSubTop: 'No' }));
  check('sub-top No reduces 3/4 area', area(strip, 'Plywood', 0.75) < area(full, 'Plywood', 0.75));
  approx('sub-top No delta ~3.17 ft2',
    area(full, 'Plywood', 0.75) - area(strip, 'Plywood', 0.75), 3.17);
}

// ---- dust panels -------------------------------------------------------
{
  const r = calc(state({ optDustPanels: 'Yes' }));      // 2 drawers -> 2 panels at 1/2"
  approx('dust panels add ~9.11 ft2 at 1/2"', area(r, 'Plywood', 0.5), 5.61 + 9.11, 0.05);
}

// ---- toe kick variants -------------------------------------------------
{
  approx('toe kick ply included in 3/4', area(calc(state()), 'Plywood', 0.75), 28.55);
  approx('toe kick None removes 3 ft2', area(calc(state({ optToeKicks: 'None' })), 'Plywood', 0.75), 25.55);
  const lum = calc(state({ toeKick: 'lumber' }));
  approx('toe kick lumber linear ft', lum.lumberLF, 9);
  approx('toe kick lumber leaves no 3/4 toe-kick area', area(lum, 'Plywood', 0.75), 25.55);
}

// ---- drawer bank -------------------------------------------------------
{
  const r = calc(state({ doors: 0, drawers: 4, shelves: 0, drawerBank: true }));
  // 4 faces split full height: 4 * 30 * (34.5/4) / 144 = 7.1875
  approx('drawer bank faces fill full height', area(r, 'Plywood (Fronts)', 0.75), 7.19);
}

// ---- plastic laminate --------------------------------------------------
{
  const off = calc(state({ lamEnabled: false }));
  eq('laminate disabled = 0', off.laminateArea, 0);
  const on = calc(state({ lamEnabled: true, lamFinEnds: 1, lamFaces: true, lamBottom: true }));
  approx('laminate finished end + faces + bottom', on.laminateArea, 5.75 + 0.6719 + 5.0);
}

// ---- edge banding ------------------------------------------------------
{
  const r = calc(state());
  approx('0.5mm PVC = box + shelf edges', r.edgeBanding['0.5mm PVC'], 13.125);
  approx('3mm PVC = door + drawer front perimeters', r.edgeBanding['3mm PVC'], 24.5);
}

// ---- hardware ----------------------------------------------------------
{
  const h = calc(state()).hardware;
  eq('hinges = 2 per door', h['Hinges'], 4);
  eq('hinge plates (European)', h['Hinge plates'], 4);
  eq('standard slides per drawer', h['Drawer slides (std, pair)'], 2);
  eq('heavy slides 0 by default', h['Drawer slides (HD, pair)'], 0);
  eq('pulls = doors + drawers', h['Cabinet pulls'], 4);
  eq('shelf supports = 4 per shelf', h['Shelf supports'], 4);
  eq('magnetic catches 0 for European', h['Magnetic catches'], 0);

  const k = calc(state({ optHinge: '5-Knuckle' })).hardware;
  eq('5-knuckle: no hinge plates', k['Hinge plates'], 0);
  eq('5-knuckle: magnetic catches per door', k['Magnetic catches'], 2);

  const hd = calc(state({ optSlideDuty: 'Heavy' })).hardware;
  eq('heavy slides selected', hd['Drawer slides (HD, pair)'], 2);
  eq('standard slides 0 when heavy', hd['Drawer slides (std, pair)'], 0);

  const locked = calc(state({ optLocks: 'Yes' })).hardware;     // 2 doors + 2 drawers
  eq('locks = 1 door bank + 1 per drawer', locked['Locks'], 3);
  eq('elbow catches = doors - 1', locked['Elbow catches'], 1);

  const doorsOnly = calc(state({ doors: 3, drawers: 0, shelves: 0, optLocks: 'Yes' })).hardware;
  eq('door-only locks = 1', doorsOnly['Locks'], 1);
  eq('door-only elbow catches = 2', doorsOnly['Elbow catches'], 2);

  const ada = calc(state({ optAdaSink: true })).hardware;
  eq('ADA panel supports = 2', ada['ADA panel supports'], 2);
  const wr = calc(state({ optWardrobe: true })).hardware;
  eq('coat rod = 1', wr['Coat rod'], 1);
  eq('coat rod flanges = 2', wr['Coat rod flanges'], 2);
}

// ---- grain match waste -------------------------------------------------
{
  eq('no waste factor by default', calc(state()).wasteFactor, 1);
  approx('grain match waste factor', calc(state({ grainMatch: true, grainWaste: 15 })).wasteFactor, 1.15);
}

// ---- summarize: quantity scaling + aggregation -------------------------
{
  const s = state({ qty: 3, toeKick: 'lumber', lamEnabled: true, lamFinEnds: 1,
    optLocks: 'Yes', optAdaSink: true });
  const one = summarize(state(Object.assign({}, s, { qty: 1 })), {});
  const three = summarize(s, {});
  approx('summarize area scales with qty', three.area, one.area * 3);
  approx('summarize lumber scales with qty', three.lumberLF, one.lumberLF * 3);
  eq('summarize hardware scales with qty', three.hardware['Hinges'], one.hardware['Hinges'] * 3);
  approx('summarize laminate scales with qty', three.laminateArea, one.laminateArea * 3);

  // aggregation across two cabinets via mergeInto
  const acc = {};
  mergeInto(acc, { Hinges: 4 });
  mergeInto(acc, { Hinges: 2, Pulls: 1 });
  eq('mergeInto sums shared keys', acc.Hinges, 6);
  eq('mergeInto adds new keys', acc.Pulls, 1);

  // summarize writes a material+thickness aggregate into `agg`
  const agg = {};
  summarize(state(), agg);
  check('summarize populates agg by material|thickness', !!agg['Plywood|0.75']);
}

// ---- report ------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
