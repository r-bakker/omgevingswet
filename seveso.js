/* ======= Seveso-check prototype (Bijlage I — Deel 1) =======
   - Speciale stoffen (Bijlage I, deel 2) zijn niet opgenomen.
   - Per stof kunnen meerdere categorieën worden gekozen.
   - Per groep (H, P, E) wordt de strengste (laagste) drempel gebruikt.
   - Sommatieregel: som(q / Q_L) en som(q / Q_U) per groep.
============================================================ */

// ---- Dataset: selectie categorieën uit Bijlage I, deel 1 (kolom 2 = lage drempel, kolom 3 = hoge drempel)
const CATEGORIES = [
  // Rubriek H — Gezondheidsgevaren
  { code: "H1", group: "H", low: 5,   high: 20,  label: "H1 Acuut toxisch, cat. 1 (alle routes)" },
  { code: "H2", group: "H", low: 50,  high: 200, label: "H2 Acuut toxisch, cat. 2 (alle routes) óf cat. 3 (inademing)" },
  { code: "H3", group: "H", low: 50,  high: 200, label: "H3 STOT SE cat. 1 (eenmalige blootstelling)" },

  // Rubriek P — Fysische gevaren
  { code: "P1a", group: "P", low: 10,  high: 50,   label: "P1a Ontplofbare stoffen (instabiel; 1.1/1.2/1.3/1.5/1.6; A.14)" },
  { code: "P1b", group: "P", low: 50,  high: 200,  label: "P1b Ontplofbare stoffen subklasse 1.4" },
  { code: "P2",  group: "P", low: 10,  high: 50,   label: "P2 Ontvlambare gassen cat. 1 of 2" },
  { code: "P3a", group: "P", low: 150, high: 500,  label: "P3a Ontvlambare aerosolen (cat.1/2) — met vl. gas (1/2) of vl. vloeistof (cat.1)" },
  { code: "P3b", group: "P", low: 5000,high: 50000,label: "P3b Ontvlambare aerosolen (cat.1/2) — zonder bovenstaande" },

  // Rubriek E — Milieugevaren (drempels hier voorlopig PLACEHOLDER; voeg officiële toe wanneer gewenst)
  // Voorbeeld (te vervangen door officiële waarden uit Bijlage I, deel 1):
  // { code: "E1", group: "E", low: 100, high: 200, label: "E1 Gevaarlijk voor aquatisch milieu, acuut cat. 1 / chronisch cat. 1" },
  // { code: "E2", group: "E", low: 200, high: 500, label: "E2 Gevaarlijk voor aquatisch milieu, chronisch cat. 2" },
];

// ---- Helper: maak een option list voor de multiselect
function renderCategoryOptions() {
  return CATEGORIES.map(c => `<option value="${c.code}">${c.code} — ${c.label}</option>`).join("");
}

// ---- Tabel & UI
const tableBody = document.getElementById("tableBody");
const addRowBtn = document.getElementById("addRowBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const calcBtn = document.getElementById("calcBtn");
const resultsEl = document.getElementById("results");
const assume2Percent = document.getElementById("assume2Percent");

function addRow(initial = {}) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input type="text" placeholder="PAS-xxx" value="${initial.pas ?? ""}" /></td>
    <td><input type="text" placeholder="Stofnaam" value="${initial.name ?? ""}" /></td>
    <td><input class="qty" type="number" min="0" step="0.001" placeholder="0.000" value="${initial.qty ?? ""}" /></td>
    <td>
      <select class="multiselect" multiple size="4" aria-label="Gevaren-categorieën">
        ${renderCategoryOptions()}
      </select>
      <div class="hint">Houd Ctrl/⌘ ingedrukt om meerdere te kiezen.</div>
    </td>
    <td>
      <label class="checkbox">
        <input type="checkbox" class="twoPercent" ${initial.twoPct ?? assume2Percent.checked ? "checked" : ""} />
        2%-regel toepassen (indien ruimtelijk toegestaan)
      </label>
    </td>
    <td class="row-controls">
      <button class="ghost dup">Kopie</button>
      <button class="ghost del">Verwijder</button>
    </td>
  `;

  // events
  tr.querySelector(".del").addEventListener("click", () => tr.remove());
  tr.querySelector(".dup").addEventListener("click", () => {
    const [pas, name, qty] = Array.from(tr.querySelectorAll("input")).map(i => i.type==="checkbox" ? i.checked : i.value);
    const selected = Array.from(tr.querySelector("select").selectedOptions).map(o => o.value);
    const twoPct = tr.querySelector(".twoPercent").checked;
    const clone = addRow({ pas, name, qty, twoPct });
    // select same categories in clone
    const sel = clone.querySelector("select");
    selected.forEach(v => { const opt = Array.from(sel.options).find(o => o.value===v); if (opt) opt.selected = true; });
  });

  tableBody.appendChild(tr);
  return tr;
}

addRowBtn.addEventListener("click", () => addRow());
clearAllBtn.addEventListener("click", () => { tableBody.innerHTML = ""; resultsEl.innerHTML = ""; });
calcBtn.addEventListener("click", calculate);

// ---- Kernberekening
function calculate() {
  // verzamel rijen
  const rows = Array.from(tableBody.querySelectorAll("tr")).map(tr => {
    const tds = tr.querySelectorAll("td");
    const pas = tds[0].querySelector("input").value.trim();
    const name = tds[1].querySelector("input").value.trim();
    const qty = parseFloat(tds[2].querySelector("input").value) || 0;
    const selected = Array.from(tds[3].querySelector("select").selectedOptions).map(o => o.value);
    const twoPct = tds[4].querySelector(".twoPercent").checked;
    return { pas, name, qty, categories: selected, twoPct };
  });

  // groepeer per stof per groep → kies strengste drempel (laagste Q)
  const groups = { H: [], P: [], E: [] }; // items: { qty, QL, QU, info }
  rows.forEach(r => {
    if (r.qty <= 0 || r.categories.length === 0) return;

    const cats = r.categories
      .map(code => CATEGORIES.find(c => c.code === code))
      .filter(Boolean);

    // per groep de laagste drempel (strengste) kiezen
    ["H","P","E"].forEach(G => {
      const inGroup = cats.filter(c => c.group === G);
      if (inGroup.length === 0) return;

      const minQL = Math.min(...inGroup.map(c => c.low));
      const minQU = Math.min(...inGroup.map(c => c.high));

      // 2%-regel: alleen toepassen als de hoeveelheid ≤ 2% van zowel QL als QU
      const eligible2pct = r.qty <= 0.02 * minQL && r.qty <= 0.02 * minQU;
      if (r.twoPct && eligible2pct) return; // buiten beschouwing laten

      groups[G].push({
        qty: r.qty,
        QL: minQL,
        QU: minQU,
        info: { pas: r.pas, name: r.name }
      });
    });
  });

  // sommatieregel per groep
  const sums = { H: { low: 0, high: 0 }, P: { low: 0, high: 0 }, E: { low: 0, high: 0 } };
  ["H","P","E"].forEach(G => {
    groups[G].forEach(item => {
      sums[G].low  += item.qty / item.QL;
      sums[G].high += item.qty / item.QU;
    });
  });

  const reachHigh = Object.values(sums).some(v => v.high >= 1);
  const reachLow  = Object.values(sums).some(v => v.low  >= 1);

  // resultaat UI
  const status = reachHigh ? { cls:"bad",  text:"HOGE drempel (hogedrempelinrichting)" }
               : reachLow  ? { cls:"warn", text:"LAGE drempel (lagedrempelinrichting)" }
                           : { cls:"ok",   text:"Onder drempelwaarden (niet-Seveso)" };

  resultsEl.innerHTML = `
    <div class="badge ${status.cls}">${status.text}</div>
    <div class="grid">
      ${["H","P","E"].map(G => `
        <div class="card" style="padding:12px;">
          <div style="font-weight:600; margin-bottom:6px;">Groep ${G}</div>
          <div>Σ(q/QL) = <b>${sums[G].low.toFixed(3)}</b></div>
          <div>Σ(q/QU) = <b>${sums[G].high.toFixed(3)}</b></div>
          <div class="hint">≥ 1 ⇒ drempel bereikt</div>
          <div class="chips" style="margin-top:8px;">
            ${groups[G].length ? groups[G].map(it => `<span class="chip">${(it.info.pas||"—")}: ${(it.info.name||"—")} (${it.qty} t)</span>`).join("") : '<span class="hint">Geen bijdragen</span>'}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// optioneel: één lege rij bij start
if (!tableBody.children.length) addRow();
