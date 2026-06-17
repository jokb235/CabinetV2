// ===========================================================================
// Affiliate link configuration.
//
// HOW TO USE: sign up for an affiliate program (e.g. Amazon Associates or a
// hardware/sheet-goods supplier), then set `tag` and `base` below. The "Buy"
// links in the results will then point to that program with your tag attached.
//
// Until you set a real tag the links still work as plain product searches.
// Links use rel="sponsored nofollow" per search-engine guidelines, and an
// affiliate disclosure is shown in the page footer (FTC requirement).
// ===========================================================================

const AFFILIATE = {
  enabled: true,
  base: 'https://www.amazon.com/s',   // your program's search/landing URL
  tag: '',                            // <-- put your affiliate tag here, e.g. 'myshop-20'

  // Build a search URL for a query (no URL constructor, so it also runs in tests).
  url(query) {
    let u = this.base + '?k=' + encodeURIComponent(query);
    if (this.tag) u += '&tag=' + encodeURIComponent(this.tag);
    return u;
  },
};

// Map result labels -> good search terms.
const AFFILIATE_QUERIES = {
  // toe-kick lumber / laminate
  'Lumber': '2x4 treated lumber',
  'Laminate': 'plastic laminate sheet 4x8',
  // edge banding
  '0.5mm PVC': '0.5mm PVC edge banding roll',
  '3mm PVC': '3mm PVC edge banding roll',
  // hardware
  'Hinges': 'cabinet door hinges',
  'Hinge plates': 'cabinet hinge mounting plates',
  'Drawer slides (std, pair)': 'drawer slides',
  'Drawer slides (HD, pair)': 'heavy duty drawer slides',
  'Cabinet pulls': 'cabinet pulls',
  'Shelf supports': 'shelf support pins',
  'Magnetic catches': 'magnetic cabinet catch',
  'Locks': 'cabinet lock',
  'Elbow catches': 'cabinet elbow catch',
  'ADA panel supports': 'ADA sink base panel support bracket',
  'Coat rod': 'closet coat rod',
  'Coat rod flanges': 'coat rod flange',
};

// Query for a sheet-goods material + thickness (e.g. 3/4" Plywood -> "3/4 in Plywood 4x8 sheet")
function affiliateSheetQuery(material, thicknessLabel) {
  const m = String(material).replace(' (Fronts)', '');
  return `${(thicknessLabel || '').replace(/"/g, ' in')} ${m} 4x8 sheet`.trim();
}

// Return an HTML "Buy" anchor for a query, or '' when affiliate links are off.
function affiliateLink(query) {
  if (!AFFILIATE.enabled || !query) return '';
  return `<a class="buy" href="${AFFILIATE.url(query)}" target="_blank" rel="noopener sponsored nofollow">Buy</a>`;
}
