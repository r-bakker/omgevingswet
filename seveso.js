// Dataset: Alle H-, P- en E-categorieën (Bijlage I deel 1, kolom 1 + kolom 2/3)
const CATEGORIES = [
  // Gezondheidsgevaren (H)
  { code: "H1", group: "H", low: 5, high: 20, desc: "Acuut toxisch, cat. 1 (alle routes)" },
  { code: "H2", group: "H", low: 50, high: 200, desc: "Acuut toxisch, cat. 2 (alle routes) of cat. 3 (inademing)" },
  { code: "H3", group: "H", low: 50, high: 200, desc: "STOT SE cat. 1" },

  // Fysische gevaren (P)
  { code: "P1a", group: "P", low: 10, high: 50, desc: "Ontplofbaar instabiel of 1.1, 1.2, 1.3, 1.5, 1.6" },
  { code: "P1b", group: "P", low: 50, high: 200, desc: "Ontplofbaar subklasse 1.4" },
  { code: "P2", group: "P", low: 10, high: 50, desc: "Ontvlambare gassen cat. 1 of 2" },
  { code: "P3a", group: "P", low: 150, high: 500, desc: "Ontvlambare aerosolen cat. 1 of 2 met vl. gas/vloeistof" },
  { code: "P3b", group: "P", low: 5000, high: 50000, desc: "Ontvlambare aerosolen cat. 1 of 2 zonder vl. gas/vloeistof" },
  { code: "P4", group: "P", low: 10, high: 50, desc: "Ontvlambare vloeistoffen cat. 1" },
  { code: "P5a", group: "P", low: 10, high: 50, desc: "Ontvlambare vloeistoffen cat. 2/3 met vl.punt ≤ 23°C" },
  { code: "P5b", group: "P", low: 50, high: 200, desc: "Ontvlambare vloeistoffen cat. 3 met vl.punt ≤ 60°C" },
  { code: "P5c", group: "P", low: 5000, high: 50000, desc: "Ontvlambare vloeistoffen cat. 2/3 met vl.punt > 60°C" },
  { code: "P6a", group: "P", low: 5, high: 20, desc: "Zelfontledende stoffen cat. 1, org. peroxiden type A/B" },
  { code: "P6b", group: "P", low: 50, high: 200, desc: "Zelfontledende stoffen cat. 2/3, org. peroxiden type C–F" },
  { code: "P7", group: "P", low: 50, high: 200, desc: "Pyrofore vloeistoffen/vaste stoffen" },
  { code: "P8", group: "P", low: 50, high: 200, desc: "Oxiderende vloeistoffen/vaste stoffen cat. 1/2/3" },

  // Milieugevaren (E)
  { code: "E1", group: "E", low: 100, high: 200, desc: "Gevaarlijk voor aquatisch milieu, acuut cat. 1 / chronisch cat. 1" },
  { code: "E2", group: "E", low: 200, high: 500, desc: "Gevaarlijk voor aquatisch milieu, chronisch cat. 2" }
];

// DOM-elementen
const tbody = document.getElementById("tabelbody");
document.getElementById("addRow").addEventListener("click", () => addRow());
document.getElementById("bereken").addEventListener("click", bereken);

// Maak dropdown
function createSelect() {
  const select = document.createElement("select");
  CATEGORIES.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.code;
    opt.textContent = `${cat.code} - ${cat.desc}`;
    select.appendChild(opt);
  });
  return select;
}

// Voeg nieuwe rij toe
function addRow() {
  const tr = document.createElement("tr");

  const casTd = document.createElement("td");
  const casInput = document.createElement("input");
  casTd.appendChild(casInput);

  const nameTd = document.createElement("td");
  const nameInput = document.createElement("input");
  nameTd.appendChild(nameInput);

  const qtyTd = document.createElement("td");
  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyTd.appendChild(qtyInput);

  const gevaarTd = document.createElement("td");
  gevaarTd.appendChild(createSelect());

  const plusTd = document.createElement("td");
  const plusBtn = document.createElement("button");
  plusBtn.textContent = "+";
  plusBtn.addEventListener("click", () => {
    gevaarTd.appendChild(document.createElement("br"));
    gevaarTd.appendChild(createSelect());
  });
  plusTd.appendChild(plusBtn);

  const delTd = document.createElement("td");
  const delBtn = document.createElement("button");
  delBtn.textContent = "X";
  delBtn.addEventListener("click", () => tr.remove());
  delTd.appendChild(delBtn);

  tr.append(casTd, nameTd, qtyTd, gevaarTd, plusTd, delTd);
  tbody.appendChild(tr);
}

// Bereken Seveso-status
function bereken() {
  const groups = { H: [], P: [], E: [] };

  Array.from(tbody.querySelectorAll("tr")).forEach(row => {
    const qty = parseFloat(row.cells[2].querySelector("input").value) || 0;
    if (!qty) return;

    const selects = row.cells[3].querySelectorAll("select");

    // groepeer per groep en kies strengste drempel
    const perGroup = {};
    selects.forEach(sel => {
      const cat = CATEGORIES.find(c => c.code === sel.value);
      if (!cat) return;
      if (!perGroup[cat.group]) perGroup[cat.group] = { low: cat.low, high: cat.high };
      else {
        perGroup[cat.group].low = Math.min(perGroup[cat.group].low, cat.low);
        perGroup[cat.group].high = Math.min(perGroup[cat.group].high, cat.high);
      }
    });

    Object.keys(perGroup).forEach(g => {
      groups[g].push({ qty, QL: perGroup[g].low, QU: perGroup[g].high });
    });
  });

  const sums = { H: { low: 0, high: 0 }, P: { low: 0, high: 0 }, E: { low: 0, high: 0 } };
  ["H", "P", "E"].forEach(g => {
    groups[g].forEach(item => {
      sums[g].low += item.qty / item.QL;
      sums[g].high += item.qty / item.QU;
    });
  });

  let status = "Onder de drempelwaarden";
  if (Object.values(sums).some(v => v.high >= 1)) status = "HOGE drempel overschreden";
  else if (Object.values(sums).some(v => v.low >= 1)) status = "LAGE drempel overschreden";

  document.getElementById("resultaat").textContent =
    `${status} | Σ(H): ${sums.H.low.toFixed(2)}/${sums.H.high.toFixed(2)}, Σ(P): ${sums.P.low.toFixed(2)}/${sums.P.high.toFixed(2)}, Σ(E): ${sums.E.low.toFixed(2)}/${sums.E.high.toFixed(2)}`;
}

// Start met één lege rij
addRow();
