import { protegerModulo } from "../../../module-guard.js";

await protegerModulo("comex");

const state = {
  rows: [],
  filtered: [],
  sourceName: "",
  view: "entregas"
};

const $ = (selector) => document.querySelector(selector);
const els = {
  material: $("#materialFilter"),
  color: $("#colorFilter"),
  fabric: $("#fabricFilter"),
  invoice: $("#invoiceFilter"),
  invoiceOptions: $("#invoiceOptions"),
  file: $("#fileInput"),
  rows: $("#deliveryRows"),
  empty: $("#emptyState"),
  totalMaterial: $("#totalMaterial"),
  totalInvoices: $("#totalInvoices"),
  nextArrival: $("#nextArrival"),
  nextArrivalPlace: $("#nextArrivalPlace"),
  nextDelivery: $("#nextDelivery"),
  tableTotal: $("#tableTotal"),
  summary: $("#resultSummary"),
  timeline: $("#timeline"),
  lastUpdate: $("#lastUpdate"),
  currentDate: $("#currentDate"),
  unitLabel: $("#unitLabel"),
  toast: $("#toast"),
  dashboardView: $("#dashboardView"),
  dashboardEmpty: $("#dashboardEmpty"),
  dashInvoices: $("#dashInvoices"),
  dashInvoicesNote: $("#dashInvoicesNote"),
  dashMaterials: $("#dashMaterials"),
  dashQuantity: $("#dashQuantity"),
  dashQuantityUnit: $("#dashQuantityUnit"),
  dashOnTimeRate: $("#dashOnTimeRate"),
  dashLate: $("#dashLate"),
  dashNext7: $("#dashNext7"),
  dashNoDelivery: $("#dashNoDelivery"),
  dashSuppliers: $("#dashSuppliers"),
  dashStatusList: $("#dashStatusList"),
  dashUpcoming: $("#dashUpcoming"),
  dashCriticalMaterials: $("#dashCriticalMaterials"),
  dashSupplierList: $("#dashSupplierList")
};

const VIEW_META = {
  dashboard: ["Dashboard COMEX", "Visão consolidada das operações de comércio exterior.", "fa-chart-pie"],
  entregas: ["Entregas por Material", "Acompanhe o detalhamento das importações por material em tempo real.", "fa-boxes-stacked"],
  containers: ["Containers", "Controle de containers, armadores, free time e devoluções.", "fa-box"],
  invoices: ["Invoices", "Gestão e conferência das invoices de importação.", "fa-file-invoice"],
  embarques: ["Embarques", "Acompanhamento de embarques marítimos e aéreos.", "fa-ship"],
  fornecedores: ["Fornecedores", "Cadastro e desempenho dos fornecedores internacionais.", "fa-building"],
  documentos: ["Documentos", "Central de documentos e arquivos das operações.", "fa-folder-open"],
  historico: ["Histórico", "Registro das importações e alterações realizadas.", "fa-clock-rotate-left"],
  relatorios: ["Relatórios", "Indicadores e relatórios gerenciais do COMEX.", "fa-chart-column"]
};

const ALIASES = {
  material: ["material", "descricao material", "descrição material", "produto", "item", "descricao", "descrição"],
  color: ["cor", "color", "colour"],
  fabric: ["tecido", "cor tecido", "cor do tecido", "fabric color", "backing color"],
  invoice: ["invoice", "nr invoice", "n r invoice", "n invoice", "nº invoice", "numero invoice", "número invoice", "fatura"],
  supplier: ["fornecedor", "supplier", "fabricante"],
  qty: ["qtd", "quantidade", "qty", "quantity", "quantidade mts", "qtd mts", "saldo"],
  unit: ["unidade", "und", "unit", "um", "u.m."],
  arrival: ["chegada porto aeroporto", "chegada porto / aeroporto", "chegada porto", "chegada aeroporto", "data chegada", "eta"],
  place: ["porto aeroporto", "porto / aeroporto", "porto", "aeroporto", "local chegada", "destino"],
  delivery: ["previsao entrega na smart", "previsão entrega na smart", "previsao entrega", "previsão entrega", "entrega smart", "data entrega"],
  status: ["status", "situacao", "situação"],
  origin: ["origem", "origin", "pais origem", "país origem"],
  order: ["n pedido", "nº pedido", "numero pedido", "número pedido", "pedido", "oc"]
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function findColumn(headers, aliases) {
  const normalized = headers.map(normalizeText);
  for (const alias of aliases.map(normalizeText)) {
    const exact = normalized.indexOf(alias);
    if (exact >= 0) return headers[exact];
  }
  for (let i = 0; i < normalized.length; i++) {
    if (aliases.map(normalizeText).some(alias => normalized[i].includes(alias))) return headers[i];
  }
  return null;
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = String(value ?? "").trim().replace(/\s/g, "");
  if (!text) return 0;
  if (text.includes(",") && text.includes(".")) {
    text = text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }
  return Number(text.replace(/[^\d.-]/g, "")) || 0;
}

function excelDateToDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "number" && window.XLSX?.SSF) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  const text = String(value).trim();
  if (!text) return null;

  // As células da planilha podem conter textos como:
  // "Embarcou 5/7/2026 e chegada prevista no porto 12/08/2026".
  // Para os indicadores usamos a última data informada no texto.
  const matches = [...text.matchAll(/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/g)];
  if (matches.length) {
    let fallbackYear = null;
    for (const match of matches) {
      if (match[3]) {
        fallbackYear = Number(match[3]);
        if (fallbackYear < 100) fallbackYear += 2000;
      }
    }
    const match = matches[matches.length - 1];
    let year = match[3] ? Number(match[3]) : fallbackYear;
    if (year != null && year < 100) year += 2000;
    if (year == null) year = new Date().getFullYear();
    const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
    return isNaN(date) ? null : date;
  }

  const parsed = new Date(text);
  return isNaN(parsed) ? null : parsed;
}

function cellText(value) {
  if (value == null) return "";
  if (value instanceof Date && !isNaN(value)) return formatDate(value);
  return String(value).trim();
}

function headerScore(row) {
  const headers = row.map(cellText);
  let score = 0;
  Object.values(ALIASES).forEach(aliases => {
    if (findColumn(headers, aliases)) score += 1;
  });
  return score;
}

function findHeaderRow(matrix) {
  let bestIndex = -1;
  let bestScore = 0;
  const limit = Math.min(matrix.length, 30);
  for (let index = 0; index < limit; index++) {
    const score = headerScore(matrix[index] || []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestScore >= 3 ? { index: bestIndex, score: bestScore } : null;
}

function matrixToObjects(matrix, headerIndex) {
  const rawHeaders = matrix[headerIndex] || [];
  const headers = rawHeaders.map((value, index) => cellText(value) || `__COL_${index}`);
  return matrix.slice(headerIndex + 1).map(row => {
    const result = {};
    headers.forEach((header, index) => result[header] = row?.[index] ?? "");
    return result;
  });
}

function fillDownRows(rawRows, cols) {
  // Na planilha Smart_STK_TH, os valores mesclados são expandidos antes
  // desta etapa. Aqui mantemos somente campos auxiliares, evitando que
  // datas de um bloco sejam copiadas indevidamente para o bloco seguinte.
  const fillKeys = ["order", "place", "status", "origin", "supplier"];
  const last = {};

  return rawRows.map(row => {
    const copy = { ...row };

    // Linhas de separação/título encerram o contexto anterior.
    const hasMaterial = cols.material && cellText(copy[cols.material]);
    const hasInvoice = cols.invoice && cellText(copy[cols.invoice]);
    const hasQty = cols.qty && parseNumber(copy[cols.qty]) !== 0;

    if (!hasMaterial && !hasInvoice && !hasQty) {
      Object.keys(last).forEach(key => delete last[key]);
      return copy;
    }

    fillKeys.forEach(key => {
      const column = cols[key];
      if (!column) return;
      const value = copy[column];
      const hasValue = value !== "" && value != null;
      if (hasValue) last[key] = value;
      else if (last[key] !== undefined) copy[column] = last[key];
    });

    return copy;
  });
}

function formatDate(date) {
  return date ? new Intl.DateTimeFormat("pt-BR").format(date) : "—";
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value || 0);
}

function statusInfo(raw, delivery) {
  const value = normalizeText(raw);
  if (value.includes("atras")) return ["Atrasado", "status-atrasado"];
  if (value.includes("trans")) return ["Em Trânsito", "status-transito"];
  if (value.includes("program")) return ["Programado", "status-programado"];
  if (value.includes("prev")) return ["Previsto", "status-previsto"];
  if (delivery && delivery < startOfToday()) return ["Atrasado", "status-atrasado"];
  return ["Previsto", "status-previsto"];
}

function startOfToday() {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}

function mapRows(rawRows) {
  if (!rawRows.length) return [];
  const headers = Object.keys(rawRows.find(row => Object.keys(row).length) || {});
  const cols = {};
  Object.entries(ALIASES).forEach(([key, aliases]) => cols[key] = findColumn(headers, aliases));

  const required = ["material", "invoice", "qty"];
  const missing = required.filter(key => !cols[key]);
  if (missing.length) {
    throw new Error("Não encontrei as colunas obrigatórias: Material, Nr. Invoice e Quantidade.");
  }

  const completedRows = fillDownRows(rawRows, cols);

  return completedRows.map((row, index) => {
    const arrivalRaw = cols.arrival ? row[cols.arrival] : null;
    const deliveryRaw = cols.delivery ? row[cols.delivery] : null;
    return {
      id: index + 1,
      material: cellText(row[cols.material]),
      color: cellText(cols.color ? row[cols.color] : ""),
      fabric: cellText(cols.fabric ? row[cols.fabric] : ""),
      invoice: cellText(row[cols.invoice]),
      supplier: cellText(cols.supplier ? row[cols.supplier] : ""),
      qty: parseNumber(row[cols.qty]),
      unit: cellText(cols.unit ? row[cols.unit] : "MTS") || "MTS",
      arrival: excelDateToDate(arrivalRaw),
      arrivalNote: cellText(arrivalRaw),
      place: cellText(cols.place ? row[cols.place] : ""),
      delivery: excelDateToDate(deliveryRaw),
      deliveryNote: cellText(deliveryRaw),
      status: cellText(cols.status ? row[cols.status] : ""),
      origin: cellText(cols.origin ? row[cols.origin] : ""),
      order: cellText(cols.order ? row[cols.order] : "")
    };
  }).filter(row =>
    row.material &&
    row.invoice &&
    row.qty !== 0 &&
    normalizeText(row.material) !== "material"
  );
}

function expandMergedCells(sheet, matrix) {
  const merges = sheet["!merges"] || [];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  merges.forEach(merge => {
    const sourceRow = merge.s.r - range.s.r;
    const sourceCol = merge.s.c - range.s.c;
    const value = matrix[sourceRow]?.[sourceCol] ?? "";

    for (let row = merge.s.r; row <= merge.e.r; row++) {
      const matrixRow = row - range.s.r;
      if (!matrix[matrixRow]) matrix[matrixRow] = [];

      for (let col = merge.s.c; col <= merge.e.c; col++) {
        const matrixCol = col - range.s.c;
        matrix[matrixRow][matrixCol] = value;
      }
    }
  });

  return matrix;
}

function getSmartSheet(workbook) {
  // Prioridade absoluta para a aba oficial do COMEX.
  const exactName = workbook.SheetNames.find(
    name => normalizeText(name) === normalizeText("Smart_STK_TH")
  );

  if (!exactName) {
    throw new Error(
      'A aba obrigatória "Smart_STK_TH" não foi encontrada. ' +
      'Confira o nome da aba e carregue novamente a planilha.'
    );
  }

  return {
    name: exactName,
    sheet: workbook.Sheets[exactName]
  };
}

async function readFile(file) {
  if (!window.XLSX) {
    throw new Error("Biblioteca de leitura do Excel não carregada.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellText: true
  });

  const selected = getSmartSheet(workbook);

  let matrix = XLSX.utils.sheet_to_json(selected.sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: true
  });

  // Replica o conteúdo das células mescladas em todas as linhas do bloco.
  // Isso é necessário para as colunas OC, Chegada e Previsão de Entrega.
  matrix = expandMergedCells(selected.sheet, matrix);

  const header = findHeaderRow(matrix);
  if (!header) {
    throw new Error(
      'A aba "Smart_STK_TH" foi encontrada, mas o cabeçalho esperado não foi localizado. ' +
      'São necessárias as colunas Nr. Invoice, Material e Quantidade.'
    );
  }

  const rawRows = matrixToObjects(matrix, header.index);
  const rows = mapRows(rawRows);

  if (!rows.length) {
    throw new Error(
      'A aba "Smart_STK_TH" foi localizada, porém nenhuma linha válida foi encontrada.'
    );
  }

  return rows;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b, "pt-BR"));
}

function populateFilters() {
  const selectedInvoice = els.invoice?.value || "";

  els.material.value = "";
  els.color.value = "";
  if (els.fabric) els.fabric.value = "";

  updateMaterialOptions();
  updateColorOptions();
  updateFabricOptions();
  updateInvoiceOptions();

  if (els.invoice && selectedInvoice) {
    els.invoice.value = selectedInvoice;
  }
}

function updateInvoiceOptions() {
  if (!els.invoiceOptions) return;

  const invoices = uniqueSorted(
    state.rows
      .map(row => row.invoice)
      .filter(Boolean)
  );

  els.invoiceOptions.innerHTML = invoices
    .map(invoice => `<option value="${escapeHtml(invoice)}"></option>`)
    .join("");
}

function updateMaterialOptions() {
  const selectedMaterial = els.material.value;
  const fabric = els.fabric?.value || "";
  const materials = uniqueSorted(
    state.rows
      .filter(row => !fabric || row.fabric === fabric)
      .map(row => row.material)
  );

  els.material.innerHTML = `<option value="">Todos os materiais</option>` +
    materials.map(value => `<option>${escapeHtml(value)}</option>`).join("");

  if (materials.includes(selectedMaterial)) {
    els.material.value = selectedMaterial;
  }
}

function updateColorOptions() {
  const selectedColor = els.color.value;
  const material = els.material.value;
  const fabric = els.fabric?.value || "";
  const colors = uniqueSorted(
    state.rows
      .filter(row => (!material || row.material === material) && (!fabric || row.fabric === fabric))
      .map(row => row.color)
  );

  els.color.innerHTML = `<option value="">Todas as cores</option>` +
    colors.map(v => `<option>${escapeHtml(v)}</option>`).join("");
  if (colors.includes(selectedColor)) els.color.value = selectedColor;
}

function updateFabricOptions() {
  if (!els.fabric) return;

  const selectedFabric = els.fabric.value;
  const material = els.material.value;
  const color = els.color.value;
  const fabrics = uniqueSorted(
    state.rows
      .filter(row => (!material || row.material === material) && (!color || row.color === color))
      .map(row => row.fabric)
  );

  els.fabric.innerHTML = `<option value="">Todos os tecidos</option>` +
    fabrics.map(value => `<option>${escapeHtml(value)}</option>`).join("");

  if (fabrics.includes(selectedFabric)) {
    els.fabric.value = selectedFabric;
  }
}

function applyFilters() {
  const material = els.material.value;
  const color = els.color.value;
  const fabric = els.fabric?.value || "";
  const invoiceSearch = normalizeText(els.invoice?.value || "");

  state.filtered = state.rows.filter(row => {
    const rowInvoice = normalizeText(row.invoice || "");

    return (
      (!material || row.material === material) &&
      (!color || row.color === color) &&
      (!fabric || row.fabric === fabric) &&
      (!invoiceSearch || rowInvoice.includes(invoiceSearch))
    );
  });

  render();
}

function render() {
  const rows = state.filtered;
  const total = rows.reduce((sum, row) => sum + row.qty, 0);
  const invoices = new Set(rows.map(r => r.invoice).filter(Boolean));
  const arrivals = rows.filter(r => r.arrival).sort((a,b) => a.arrival - b.arrival);
  const deliveries = rows.filter(r => r.delivery).sort((a,b) => a.delivery - b.delivery);
  const units = uniqueSorted(rows.map(r => r.unit));

  els.totalMaterial.textContent = `${formatNumber(total)}${units.length === 1 ? " " + units[0] : ""}`;
  els.unitLabel.textContent = units.length > 1 ? `Unidades: ${units.join(", ")}` : "Quantidade consolidada";
  els.totalInvoices.textContent = invoices.size;
  els.nextArrival.textContent = arrivals.length ? formatDate(arrivals[0].arrival) : "—";
  els.nextArrivalPlace.textContent = arrivals[0]?.place || "Sem previsão";
  els.nextDelivery.textContent = deliveries.length ? formatDate(deliveries[0].delivery) : "—";
  els.tableTotal.textContent = formatNumber(total);
  els.summary.textContent = rows.length
    ? `${rows.length} registro(s) · ${invoices.size} invoice(s)${state.sourceName ? " · " + state.sourceName : ""}`
    : "Nenhum registro encontrado";

  els.rows.innerHTML = rows.map(row => {
    const [status, css] = statusInfo(row.status, row.delivery);
    return `<tr>
      <td>${escapeHtml(row.invoice || "—")}</td>
      <td>${escapeHtml(row.supplier || "—")}</td>
      <td>${formatNumber(row.qty)} ${escapeHtml(row.unit)}</td>
      <td>${formatDate(row.arrival)}${row.place ? `<br><small>${escapeHtml(row.place)}</small>` : ""}${row.arrivalNote && row.arrivalNote !== formatDate(row.arrival) ? `<br><small title="${escapeHtml(row.arrivalNote)}">${escapeHtml(row.arrivalNote)}</small>` : ""}</td>
      <td>${formatDate(row.delivery)}${row.deliveryNote && row.deliveryNote !== formatDate(row.delivery) ? `<br><small title="${escapeHtml(row.deliveryNote)}">${escapeHtml(row.deliveryNote)}</small>` : ""}</td>
      <td><span class="status ${css}">${status}</span></td>
      <td>${escapeHtml(row.origin || "—")}</td>
      <td>${escapeHtml(row.order || "—")}</td>
    </tr>`;
  }).join("");

  els.empty.classList.toggle("hide", rows.length > 0);
  renderTimeline(rows);
  renderDashboard();
  renderContainers();
  renderInvoices();
}

function renderTimeline(rows) {
  const events = [];
  rows.forEach(row => {
    if (row.arrival) events.push({ date: row.arrival, title: "Chegada prevista", detail: row.place || row.invoice });
    if (row.delivery) events.push({ date: row.delivery, title: "Entrega na Smart", detail: row.invoice });
  });
  events.sort((a,b) => a.date - b.date);
  const unique = [];
  const seen = new Set();
  for (const event of events) {
    const key = `${event.date.toISOString().slice(0,10)}|${event.title}|${event.detail}`;
    if (!seen.has(key)) { seen.add(key); unique.push(event); }
    if (unique.length === 6) break;
  }
  els.timeline.innerHTML = unique.length ? unique.map(event => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <strong>${formatDate(event.date)}</strong>
      <span>${escapeHtml(event.title)}<br>${escapeHtml(event.detail || "")}</span>
    </div>`).join("") :
    `<div class="empty-state" style="width:100%;min-height:120px"><p>As principais datas aparecerão aqui.</p></div>`;
}


function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dashboardStatusKey(row) {
  const [label] = statusInfo(row.status, row.delivery);
  return normalizeText(label);
}

function renderDashboard() {
  if (!els.dashboardView) return;

  const rows = state.filtered;
  const hasData = rows.length > 0;

  els.dashboardEmpty?.classList.toggle("show", !hasData);
  els.dashboardView.querySelectorAll(
    ".dashboard-kpi-grid,.dashboard-alert-grid,.dashboard-columns,.dashboard-actions"
  ).forEach(element => element.classList.toggle("dashboard-data-hidden", !hasData));

  if (!hasData) {
    if (els.dashInvoices) els.dashInvoices.textContent = "0";
    if (els.dashMaterials) els.dashMaterials.textContent = "0";
    if (els.dashQuantity) els.dashQuantity.textContent = "0";
    if (els.dashOnTimeRate) els.dashOnTimeRate.textContent = "0%";
    return;
  }

  const invoices = new Set(rows.map(row => row.invoice).filter(Boolean));
  const materials = new Set(rows.map(row => row.material).filter(Boolean));
  const suppliers = new Set(rows.map(row => row.supplier).filter(Boolean));
  const units = uniqueSorted(rows.map(row => row.unit));
  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);

  const classified = rows.map(row => ({
    row,
    status: statusInfo(row.status, row.delivery)[0],
    key: dashboardStatusKey(row)
  }));

  const lateRows = classified.filter(item => item.key.includes("atras")).map(item => item.row);
  const noDelayCount = rows.length - lateRows.length;
  const noDelayRate = rows.length ? Math.round((noDelayCount / rows.length) * 100) : 0;

  const today = startOfToday();
  const sevenDays = addDays(today, 7);
  const next7 = rows.filter(row =>
    row.delivery &&
    row.delivery >= today &&
    row.delivery <= sevenDays
  );
  const noDelivery = rows.filter(row => !row.delivery);

  els.dashInvoices.textContent = invoices.size;
  els.dashInvoicesNote.textContent = state.sourceName ? state.sourceName : `${rows.length} registro(s) na base`;
  els.dashMaterials.textContent = materials.size;
  els.dashQuantity.textContent = formatNumber(totalQty);
  els.dashQuantityUnit.textContent = units.length === 1 ? `Unidade: ${units[0]}` : (units.length ? `Unidades: ${units.join(", ")}` : "Quantidade consolidada");
  els.dashOnTimeRate.textContent = `${noDelayRate}%`;
  els.dashLate.textContent = lateRows.length;
  els.dashNext7.textContent = next7.length;
  els.dashNoDelivery.textContent = noDelivery.length;
  els.dashSuppliers.textContent = suppliers.size;

  const statusOrder = [
    ["Em Trânsito", "transito"],
    ["Programado", "programado"],
    ["Previsto", "previsto"],
    ["Atrasado", "atrasado"]
  ];

  els.dashStatusList.innerHTML = statusOrder.map(([label, key]) => {
    const count = classified.filter(item => item.key === normalizeText(label)).length;
    const percent = rows.length ? Math.round((count / rows.length) * 100) : 0;
    return `
      <div class="dashboard-status-row ${key}">
        <div class="dashboard-status-meta">
          <span>${label}</span>
          <strong>${count} · ${percent}%</strong>
        </div>
        <div class="dashboard-progress"><div style="width:${percent}%"></div></div>
      </div>`;
  }).join("");

  const upcoming = rows
    .filter(row => row.delivery && row.delivery >= today)
    .sort((a, b) => a.delivery - b.delivery)
    .slice(0, 5);

  els.dashUpcoming.innerHTML = upcoming.length
    ? upcoming.map(row => {
        const [status, css] = statusInfo(row.status, row.delivery);
        const month = row.delivery.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
        return `
          <div class="dashboard-upcoming-item">
            <div class="dashboard-date-box">
              <strong>${String(row.delivery.getDate()).padStart(2, "0")}</strong>
              <span>${escapeHtml(month)}</span>
            </div>
            <div class="dashboard-upcoming-info">
              <strong title="${escapeHtml(row.material)}">${escapeHtml(row.material || "Material não informado")}</strong>
              <span>${escapeHtml(row.invoice || "Sem invoice")} · ${formatNumber(row.qty)} ${escapeHtml(row.unit || "")}</span>
            </div>
            <span class="status ${css}">${status}</span>
          </div>`;
      }).join("")
    : `<div class="empty-state" style="min-height:180px"><p>Nenhuma entrega futura com data identificada.</p></div>`;

  const lateByMaterial = new Map();
  lateRows.forEach(row => {
    const key = row.material || "Material não informado";
    const current = lateByMaterial.get(key) || { count: 0, qty: 0, unit: row.unit || "" };
    current.count += 1;
    current.qty += row.qty;
    lateByMaterial.set(key, current);
  });

  const critical = [...lateByMaterial.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].qty - a[1].qty)
    .slice(0, 5);

  els.dashCriticalMaterials.innerHTML = critical.length
    ? critical.map(([material, info]) => `
        <div class="dashboard-list-row">
          <div>
            <strong title="${escapeHtml(material)}">${escapeHtml(material)}</strong>
            <small>${formatNumber(info.qty)} ${escapeHtml(info.unit)} em registros atrasados</small>
          </div>
          <div class="dashboard-list-value">
            <span class="dashboard-mini-badge">${info.count} atraso(s)</span>
          </div>
        </div>`).join("")
    : `<div class="empty-state" style="min-height:180px"><p>Nenhum material com atraso identificado.</p></div>`;

  const supplierMap = new Map();
  rows.forEach(row => {
    const supplier = row.supplier || "Fornecedor não informado";
    const current = supplierMap.get(supplier) || { invoices: new Set(), rows: 0, late: 0 };
    if (row.invoice) current.invoices.add(row.invoice);
    current.rows += 1;
    if (dashboardStatusKey(row).includes("atras")) current.late += 1;
    supplierMap.set(supplier, current);
  });

  const topSuppliers = [...supplierMap.entries()]
    .sort((a, b) => b[1].invoices.size - a[1].invoices.size || b[1].rows - a[1].rows)
    .slice(0, 5);

  els.dashSupplierList.innerHTML = topSuppliers.length
    ? topSuppliers.map(([supplier, info]) => `
        <div class="dashboard-list-row">
          <div>
            <strong title="${escapeHtml(supplier)}">${escapeHtml(supplier)}</strong>
            <small>${info.rows} registro(s) · ${info.late} atraso(s)</small>
          </div>
          <div class="dashboard-list-value">
            <strong>${info.invoices.size}</strong>
            <small>invoice(s)</small>
          </div>
        </div>`).join("")
    : `<div class="empty-state" style="min-height:180px"><p>Nenhum fornecedor identificado na base.</p></div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 3500);
}

function saveLocal() {
  try {
    const serializable = state.rows.map(r => ({
      ...r,
      arrival: r.arrival?.toISOString() || null,
      delivery: r.delivery?.toISOString() || null
    }));
    localStorage.setItem("smart-comex-deliveries", JSON.stringify({ rows: serializable, sourceName: state.sourceName, updatedAt: new Date().toISOString() }));
  } catch (error) {
    console.warn("Não foi possível salvar a importação localmente.", error);
  }
}

function restoreLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem("smart-comex-deliveries") || "null");
    if (!saved?.rows?.length) return;
    state.rows = saved.rows.map(r => ({ ...r, arrival: r.arrival ? new Date(r.arrival) : null, delivery: r.delivery ? new Date(r.delivery) : null }));
    state.sourceName = saved.sourceName || "";
    els.lastUpdate.textContent = `Dados atualizados em ${formatDate(new Date(saved.updatedAt))}`;
    populateFilters();
    applyFilters();
  } catch (error) {
    console.warn("Importação local inválida.", error);
  }
}

function exportFiltered() {
  if (!state.filtered.length) return showToast("Não há dados para exportar.");
  const data = state.filtered.map(row => ({
    Material: row.material, Cor: row.color, Tecido: row.fabric, Invoice: row.invoice, Fornecedor: row.supplier,
    Quantidade: row.qty, Unidade: row.unit, "Chegada Porto / Aeroporto": formatDate(row.arrival),
    "Porto / Aeroporto": row.place, "Previsão Entrega na Smart": formatDate(row.delivery),
    Status: statusInfo(row.status, row.delivery)[0], Origem: row.origin, "Nº Pedido": row.order
  }));
  const sheet = XLSX.utils.json_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Entregas");
  XLSX.writeFile(book, "COMEX_Entregas_por_Material.xlsx");
}



// ============================================================
// ETAPA 2 + 3 - PROCESSOS / CONTAINERS E INVOICES
// ============================================================

function groupByInvoice(rows) {
  const map = new Map();

  rows.forEach(row => {
    const key = row.invoice || "Sem Invoice";

    if (!map.has(key)) {
      map.set(key, {
        invoice: key,
        orders: new Set(),
        materials: new Set(),
        rows: [],
        qty: 0,
        units: new Set(),
        arrivals: [],
        deliveries: [],
        arrivalNotes: [],
        places: new Set()
      });
    }

    const item = map.get(key);

    item.rows.push(row);
    item.qty += row.qty || 0;

    if (row.order) item.orders.add(row.order);
    if (row.material) item.materials.add(row.material);
    if (row.unit) item.units.add(row.unit);
    if (row.arrival) item.arrivals.push(row.arrival);
    if (row.delivery) item.deliveries.push(row.delivery);
    if (row.arrivalNote) item.arrivalNotes.push(row.arrivalNote);
    if (row.place) item.places.add(row.place);
  });

  return [...map.values()]
    .map(item => {
      const statuses = item.rows.map(row =>
        statusInfo(row.status, row.delivery)[0]
      );

      let status = "Previsto";

      if (statuses.includes("Atrasado")) {
        status = "Atrasado";
      } else if (statuses.includes("Em Trânsito")) {
        status = "Em Trânsito";
      } else if (statuses.includes("Programado")) {
        status = "Programado";
      }

      return {
        ...item,
        order: [...item.orders].join(", "),
        materialList: [...item.materials],
        unitList: [...item.units],
        placeList: [...item.places],
        arrival: item.arrivals.length
          ? new Date(Math.min(...item.arrivals.map(date => date.getTime())))
          : null,
        delivery: item.deliveries.length
          ? new Date(Math.min(...item.deliveries.map(date => date.getTime())))
          : null,
        status
      };
    })
    .sort((a, b) => {
      const da = a.arrival?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const db = b.arrival?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });
}

function statusCssByLabel(label) {
  switch (normalizeText(label)) {
    case "atrasado":
      return "status-atrasado";
    case "em transito":
      return "status-transito";
    case "programado":
      return "status-programado";
    default:
      return "status-previsto";
  }
}

function renderContainers() {
  const groups = groupByInvoice(state.filtered);

  const totalQty = groups.reduce(
    (sum, group) => sum + group.qty,
    0
  );

  const withArrival = groups.filter(
    group => group.arrival || group.arrivalNotes.length
  );

  const late = groups.filter(
    group => group.status === "Atrasado"
  );

  const countEl = document.getElementById("containersCount");
  const qtyEl = document.getElementById("containersQty");
  const arrivalEl = document.getElementById("containersArrival");
  const lateEl = document.getElementById("containersLate");
  const summaryEl = document.getElementById("containersSummary");
  const rowsEl = document.getElementById("containersRows");
  const emptyEl = document.getElementById("containersEmpty");

  if (!rowsEl) return;

  if (countEl) countEl.textContent = groups.length;
  if (qtyEl) qtyEl.textContent = formatNumber(totalQty);
  if (arrivalEl) arrivalEl.textContent = withArrival.length;
  if (lateEl) lateEl.textContent = late.length;

  if (summaryEl) {
    summaryEl.textContent = groups.length
      ? `${groups.length} processo(s) consolidados por Invoice`
      : "Nenhuma base carregada";
  }

  rowsEl.innerHTML = groups.map(group => {
    const css = statusCssByLabel(group.status);

    const note =
      group.arrivalNotes[0] ||
      group.placeList.join(", ") ||
      "";

    return `
      <tr>
        <td>
          <strong>${escapeHtml(group.invoice)}</strong>
          <small class="cell-note">
            Nº do container não existe na planilha atual
          </small>
        </td>

        <td>${escapeHtml(group.order || "—")}</td>

        <td>${group.rows.length}</td>

        <td>
          ${formatNumber(group.qty)}
          ${escapeHtml(group.unitList.join(", "))}
        </td>

        <td>
          ${formatDate(group.arrival)}
          ${
            note
              ? `<small class="cell-note">${escapeHtml(note)}</small>`
              : ""
          }
        </td>

        <td>${formatDate(group.delivery)}</td>

        <td>
          <span class="status ${css}">
            ${group.status}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  emptyEl?.classList.toggle(
    "hide",
    groups.length > 0
  );
}

function renderInvoices() {
  const groups = groupByInvoice(state.filtered);

  const materials = new Set(
    state.filtered
      .map(row => row.material)
      .filter(Boolean)
  );

  const totalQty = state.filtered.reduce(
    (sum, row) => sum + row.qty,
    0
  );

  const late = groups.filter(
    group => group.status === "Atrasado"
  );

  const countEl = document.getElementById("invoiceCount");
  const materialsEl = document.getElementById("invoiceMaterials");
  const qtyEl = document.getElementById("invoiceQty");
  const lateEl = document.getElementById("invoiceLate");
  const summaryEl = document.getElementById("invoiceSummary");
  const rowsEl = document.getElementById("invoiceRows");
  const emptyEl = document.getElementById("invoiceEmpty");

  if (!rowsEl) return;

  if (countEl) countEl.textContent = groups.length;
  if (materialsEl) materialsEl.textContent = materials.size;
  if (qtyEl) qtyEl.textContent = formatNumber(totalQty);
  if (lateEl) lateEl.textContent = late.length;

  if (summaryEl) {
    summaryEl.textContent = groups.length
      ? `${groups.length} Invoice(s) distintas na base`
      : "Nenhuma base carregada";
  }

  rowsEl.innerHTML = groups.map(group => {
    const css = statusCssByLabel(group.status);

    const materialText =
      group.materialList.length <= 3
        ? group.materialList.join(", ")
        : `${group.materialList.slice(0, 3).join(", ")} +${group.materialList.length - 3}`;

    return `
      <tr>
        <td>
          <strong>${escapeHtml(group.invoice)}</strong>
        </td>

        <td>${escapeHtml(group.order || "—")}</td>

        <td>${escapeHtml(materialText || "—")}</td>

        <td>${formatNumber(group.qty)}</td>

        <td>${escapeHtml(group.unitList.join(", ") || "—")}</td>

        <td>${formatDate(group.arrival)}</td>

        <td>${formatDate(group.delivery)}</td>

        <td>
          <span class="status ${css}">
            ${group.status}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  emptyEl?.classList.toggle(
    "hide",
    groups.length > 0
  );
}

function exportContainers() {
  const groups = groupByInvoice(state.filtered);

  if (!groups.length) {
    showToast("Não há processos para exportar.");
    return;
  }

  const data = groups.map(group => ({
    "Invoice / Processo": group.invoice,
    "OC": group.order,
    "Nº Container": "Não disponível na planilha atual",
    "Itens": group.rows.length,
    "Quantidade": group.qty,
    "Unidade": group.unitList.join(", "),
    "Chegada": formatDate(group.arrival),
    "Entrega Smart": formatDate(group.delivery),
    "Status": group.status
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Processos");
  XLSX.writeFile(workbook, "COMEX_Containers_Processos.xlsx");
}

function exportInvoices() {
  const groups = groupByInvoice(state.filtered);

  if (!groups.length) {
    showToast("Não há Invoices para exportar.");
    return;
  }

  const data = groups.map(group => ({
    "Invoice": group.invoice,
    "OC": group.order,
    "Materiais": group.materialList.join(" | "),
    "Itens": group.rows.length,
    "Quantidade": group.qty,
    "Unidade": group.unitList.join(", "),
    "Chegada": formatDate(group.arrival),
    "Entrega Smart": formatDate(group.delivery),
    "Status": group.status
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
  XLSX.writeFile(workbook, "COMEX_Invoices.xlsx");
}




// ============================================================
// ETAPA 4 CORRIGIDA - EMBARQUES
// Executa somente quando a guia Embarques é aberta.
// ============================================================

function startOfTodayForShipments() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function renderShipments() {
  const cardsEl = document.getElementById("shipmentCards");
  if (!cardsEl) return;

  const groups = groupByInvoice(state.filtered);
  const today = startOfTodayForShipments();

  const future = groups.filter(
    group =>
      group.arrival &&
      group.arrival >= today
  );

  const noDate = groups.filter(
    group => !group.arrival
  );

  const late = groups.filter(
    group => group.status === "Atrasado"
  );

  const countEl = document.getElementById("shipmentCount");
  const futureEl = document.getElementById("shipmentFuture");
  const noDateEl = document.getElementById("shipmentNoDate");
  const lateEl = document.getElementById("shipmentLate");
  const summaryEl = document.getElementById("shipmentSummary");
  const emptyEl = document.getElementById("shipmentEmpty");

  if (countEl) countEl.textContent = groups.length;
  if (futureEl) futureEl.textContent = future.length;
  if (noDateEl) noDateEl.textContent = noDate.length;
  if (lateEl) lateEl.textContent = late.length;

  if (summaryEl) {
    summaryEl.textContent = groups.length
      ? `${groups.length} processo(s) acompanhados`
      : "Nenhuma base carregada";
  }

  const sorted = [...groups].sort((a, b) => {
    const aDate = a.arrival?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDate = b.arrival?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });

  cardsEl.innerHTML = sorted.map(group => {
    const css = statusCssByLabel(group.status);

    const note =
      group.arrivalNotes?.[0] ||
      group.placeList?.join(", ") ||
      "Sem observação registrada";

    return `
      <article class="shipment-card">

        <div class="shipment-card-head">
          <div class="shipment-icon">
            <i class="fa-solid fa-ship"></i>
          </div>

          <div>
            <span>Invoice</span>
            <strong>${escapeHtml(group.invoice)}</strong>
          </div>

          <span class="status ${css}">
            ${group.status}
          </span>
        </div>

        <div class="shipment-dates">

          <div>
            <span>Chegada Porto / Aeroporto</span>
            <strong>${formatDate(group.arrival)}</strong>
          </div>

          <div>
            <span>Entrega na Smart</span>
            <strong>${formatDate(group.delivery)}</strong>
          </div>

        </div>

        <p class="shipment-note">
          ${escapeHtml(note)}
        </p>

        <div class="shipment-footer">
          <span>${group.rows.length} item(ns)</span>

          <strong>
            ${formatNumber(group.qty)}
            ${escapeHtml(group.unitList.join(", "))}
          </strong>
        </div>

      </article>
    `;
  }).join("");

  emptyEl?.classList.toggle(
    "hide",
    groups.length > 0
  );
}

function exportEmbarques() {
  const groups = groupByInvoice(state.filtered);

  if (!groups.length) {
    showToast("Não há embarques para exportar.");
    return;
  }

  const data = groups.map(group => ({
    "Invoice": group.invoice,
    "OC": group.order,
    "Itens": group.rows.length,
    "Quantidade": group.qty,
    "Unidade": group.unitList.join(", "),
    "Chegada Porto / Aeroporto": formatDate(group.arrival),
    "Observação de Chegada": group.arrivalNotes.join(" | "),
    "Entrega Smart": formatDate(group.delivery),
    "Status": group.status
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Embarques"
  );

  XLSX.writeFile(
    workbook,
    "COMEX_Embarques.xlsx"
  );
}




// ============================================================
// ETAPA 5 - FORNECEDORES
// Executa somente quando a guia Fornecedores é aberta.
// ============================================================

function groupBySupplier(rows) {
  const map = new Map();

  rows
    .filter(row => row.supplier)
    .forEach(row => {
      const key = row.supplier;

      if (!map.has(key)) {
        map.set(key, {
          supplier: key,
          invoices: new Set(),
          rows: 0,
          qty: 0,
          late: 0,
          deliveries: [],
          units: new Set()
        });
      }

      const item = map.get(key);

      item.rows += 1;
      item.qty += row.qty || 0;

      if (row.invoice) {
        item.invoices.add(row.invoice);
      }

      if (row.unit) {
        item.units.add(row.unit);
      }

      if (
        statusInfo(
          row.status,
          row.delivery
        )[0] === "Atrasado"
      ) {
        item.late += 1;
      }

      if (row.delivery) {
        item.deliveries.push(row.delivery);
      }
    });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...map.values()]
    .map(item => {
      const futureDeliveries =
        item.deliveries
          .filter(date => date >= today)
          .sort((a, b) => a - b);

      return {
        ...item,
        unitList: [...item.units],
        nextDelivery:
          futureDeliveries[0] || null
      };
    })
    .sort(
      (a, b) =>
        b.qty - a.qty ||
        b.invoices.size - a.invoices.size
    );
}


function supplierStatus(item) {
  if (item.late > 0) {
    return {
      label: "Atenção",
      css: "status-atrasado"
    };
  }

  return {
    label: "Regular",
    css: "status-transito"
  };
}


function renderSuppliers() {
  const rowsEl =
    document.getElementById(
      "supplierRows"
    );

  if (!rowsEl) {
    return;
  }

  const suppliers =
    groupBySupplier(
      state.filtered
    );

  const rowsWithSupplier =
    state.filtered.filter(
      row => row.supplier
    );

  const invoicesWithSupplier =
    new Set(
      rowsWithSupplier
        .map(row => row.invoice)
        .filter(Boolean)
    );

  const qty =
    rowsWithSupplier.reduce(
      (sum, row) =>
        sum + (row.qty || 0),
      0
    );

  const missing =
    state.filtered.filter(
      row => !row.supplier
    ).length;


  const countEl =
    document.getElementById(
      "supplierCount"
    );

  const invoiceEl =
    document.getElementById(
      "supplierInvoices"
    );

  const qtyEl =
    document.getElementById(
      "supplierQty"
    );

  const missingEl =
    document.getElementById(
      "supplierMissing"
    );

  const summaryEl =
    document.getElementById(
      "supplierSummary"
    );

  const rankingEl =
    document.getElementById(
      "supplierRanking"
    );

  const attentionEl =
    document.getElementById(
      "supplierAttention"
    );

  const emptyEl =
    document.getElementById(
      "supplierEmpty"
    );


  if (countEl) {
    countEl.textContent =
      suppliers.length;
  }

  if (invoiceEl) {
    invoiceEl.textContent =
      invoicesWithSupplier.size;
  }

  if (qtyEl) {
    qtyEl.textContent =
      formatNumber(qty);
  }

  if (missingEl) {
    missingEl.textContent =
      missing;
  }


  if (summaryEl) {
    summaryEl.textContent =
      suppliers.length
        ? `${suppliers.length} fornecedor(es) identificado(s)`
        : (
            state.filtered.length
              ? "A coluna Fornecedor não existe ou está vazia na planilha atual"
              : "Nenhuma base carregada"
          );
  }


  rowsEl.innerHTML =
    suppliers
      .map(item => {
        const status =
          supplierStatus(item);

        return `
          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  item.supplier
                )}
              </strong>
            </td>

            <td>
              ${item.invoices.size}
            </td>

            <td>
              ${item.rows}
            </td>

            <td>
              ${formatNumber(
                item.qty
              )}
              ${escapeHtml(
                item.unitList.join(", ")
              )}
            </td>

            <td>
              ${item.late}
            </td>

            <td>
              ${formatDate(
                item.nextDelivery
              )}
            </td>

            <td>
              <span
                class="status ${status.css}"
              >
                ${status.label}
              </span>
            </td>

          </tr>
        `;
      })
      .join("");


  if (rankingEl) {
    const maxQty =
      Math.max(
        1,
        ...suppliers.map(
          item => item.qty
        )
      );

    rankingEl.innerHTML =
      suppliers.length
        ? suppliers
            .slice(0, 8)
            .map(
              (item, index) => {

                const percent =
                  Math.round(
                    (
                      item.qty /
                      maxQty
                    ) * 100
                  );

                return `
                  <div class="supplier-ranking-row">

                    <div class="supplier-ranking-order">
                      ${index + 1}
                    </div>

                    <div class="supplier-ranking-main">

                      <div class="supplier-ranking-meta">
                        <strong
                          title="${escapeHtml(
                            item.supplier
                          )}"
                        >
                          ${escapeHtml(
                            item.supplier
                          )}
                        </strong>

                        <span>
                          ${formatNumber(
                            item.qty
                          )}
                          ${escapeHtml(
                            item.unitList.join(", ")
                          )}
                        </span>
                      </div>

                      <div class="supplier-ranking-bar">
                        <div
                          style="width:${percent}%"
                        ></div>
                      </div>

                      <small>
                        ${item.invoices.size}
                        invoice(s)
                        ·
                        ${item.rows}
                        registro(s)
                      </small>

                    </div>

                  </div>
                `;
              }
            )
            .join("")
        : `
            <div
              class="empty-state"
              style="min-height:180px"
            >
              <p>
                Nenhum fornecedor identificado.
              </p>
            </div>
          `;
  }


  if (attentionEl) {
    const attention =
      suppliers
        .filter(
          item => item.late > 0
        )
        .sort(
          (a, b) =>
            b.late - a.late ||
            b.qty - a.qty
        )
        .slice(0, 8);

    attentionEl.innerHTML =
      attention.length
        ? attention
            .map(item => `
              <div class="supplier-attention-row">

                <div>
                  <strong
                    title="${escapeHtml(
                      item.supplier
                    )}"
                  >
                    ${escapeHtml(
                      item.supplier
                    )}
                  </strong>

                  <small>
                    ${item.invoices.size}
                    invoice(s)
                  </small>
                </div>

                <span class="supplier-late-badge">
                  ${item.late}
                  atraso(s)
                </span>

              </div>
            `)
            .join("")
        : `
            <div
              class="empty-state"
              style="min-height:180px"
            >
              <p>
                Nenhum fornecedor com atraso identificado.
              </p>
            </div>
          `;
  }


  emptyEl?.classList.toggle(
    "hide",
    suppliers.length > 0
  );
}


function exportFornecedores() {
  const suppliers =
    groupBySupplier(
      state.filtered
    );

  if (!suppliers.length) {
    showToast(
      "A planilha atual não possui fornecedor informado."
    );

    return;
  }

  const data =
    suppliers.map(
      item => ({
        "Fornecedor":
          item.supplier,

        "Invoices":
          item.invoices.size,

        "Registros":
          item.rows,

        "Quantidade":
          item.qty,

        "Unidade":
          item.unitList.join(", "),

        "Atrasos":
          item.late,

        "Próxima entrega":
          formatDate(
            item.nextDelivery
          ),

        "Status":
          item.late > 0
            ? "Atenção"
            : "Regular"
      })
    );

  const workbook =
    XLSX.utils.book_new();

  const worksheet =
    XLSX.utils.json_to_sheet(
      data
    );

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Fornecedores"
  );

  XLSX.writeFile(
    workbook,
    "COMEX_Fornecedores.xlsx"
  );
}




// ============================================================
// ETAPA 6 - DOCUMENTOS
// Executa somente quando a guia Documentos é aberta.
// ============================================================

function buildDocumentInfo(group) {
  const noteText =
    [
      ...(group.arrivalNotes || []),
      ...(group.deliveryNotes || [])
    ]
      .filter(Boolean)
      .join(" | ");

  const normalized =
    normalizeText(
      noteText
    );

  const hasDuimp =
    normalized.includes("duimp");

  const hasBl =
    /\bbl\b/.test(normalized)
    ||
    normalized.includes("bill of lading");

  const hasPacking =
    normalized.includes("packing list")
    ||
    normalized.includes("packinglist");

  const hasDi =
    /\bdi\b/.test(normalized)
    ||
    normalized.includes("declaracao de importacao");

  const hasXml =
    /\bxml\b/.test(normalized);

  const hasAnyDocument =
    hasDuimp
    ||
    hasBl
    ||
    hasPacking
    ||
    hasDi
    ||
    hasXml;

  return {
    invoice:
      group.invoice,

    order:
      group.order,

    hasInvoice:
      Boolean(
        group.invoice
      ),

    hasOrder:
      Boolean(
        group.order
      ),

    hasDuimp,

    hasBl,

    hasPacking,

    hasDi,

    hasXml,

    hasAnyDocument,

    note:
      noteText
  };
}


function documentBadge(
  ok,
  positive = "Identificado",
  negative = "Não identificado"
) {
  return `
    <span
      class="
        document-badge
        ${
          ok
            ? "ok"
            : "neutral"
        }
      "
    >
      <i
        class="
          fa-solid
          ${
            ok
              ? "fa-circle-check"
              : "fa-minus"
          }
        "
      ></i>

      ${
        ok
          ? positive
          : negative
      }
    </span>
  `;
}


function renderDocuments() {
  const rowsEl =
    document.getElementById(
      "docsRows"
    );

  if (!rowsEl) {
    return;
  }

  const groups =
    groupByInvoice(
      state.filtered
    );

  const documents =
    groups.map(
      buildDocumentInfo
    );

  const withOrder =
    documents.filter(
      item => item.hasOrder
    );

  const withMention =
    documents.filter(
      item => item.hasAnyDocument
    );

  const pending =
    documents.filter(
      item =>
        !item.hasAnyDocument
    );

  const duimpCount =
    documents.filter(
      item => item.hasDuimp
    ).length;

  const blCount =
    documents.filter(
      item => item.hasBl
    ).length;

  const packingCount =
    documents.filter(
      item => item.hasPacking
    ).length;

  const diCount =
    documents.filter(
      item => item.hasDi
    ).length;

  const xmlCount =
    documents.filter(
      item => item.hasXml
    ).length;


  const setText = (
    id,
    value
  ) => {
    const element =
      document.getElementById(
        id
      );

    if (element) {
      element.textContent =
        value;
    }
  };


  setText(
    "docsInvoices",
    documents.length
  );

  setText(
    "docsOrder",
    withOrder.length
  );

  setText(
    "docsMentioned",
    withMention.length
  );

  setText(
    "docsPending",
    pending.length
  );

  setText(
    "docsDuimp",
    duimpCount
  );

  setText(
    "docsBl",
    blCount
  );

  setText(
    "docsPacking",
    packingCount
  );

  setText(
    "docsDi",
    diCount
  );

  setText(
    "docsXml",
    xmlCount
  );


  const summaryEl =
    document.getElementById(
      "docsSummary"
    );

  if (summaryEl) {
    summaryEl.textContent =
      documents.length
        ? `${documents.length} processo(s) analisado(s) com base apenas nas informações existentes`
        : "Nenhuma base carregada";
  }


  rowsEl.innerHTML =
    documents
      .map(item => `
        <tr>

          <td>
            <strong>
              ${escapeHtml(
                item.invoice || "—"
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              item.order || "—"
            )}
          </td>

          <td>
            ${documentBadge(
              item.hasDuimp,
              "Mencionada",
              "Não mencionada"
            )}
          </td>

          <td>
            ${documentBadge(
              item.hasBl,
              "Mencionado",
              "Não mencionado"
            )}
          </td>

          <td>
            ${documentBadge(
              item.hasPacking,
              "Mencionado",
              "Não mencionado"
            )}
          </td>

          <td>
            ${documentBadge(
              item.hasDi,
              "Mencionada",
              "Não mencionada"
            )}
          </td>

          <td>
            ${documentBadge(
              item.hasXml,
              "Mencionado",
              "Não mencionado"
            )}
          </td>

          <td class="document-note">
            ${escapeHtml(
              item.note
              ||
              "Nenhuma observação documental encontrada"
            )}
          </td>

        </tr>
      `)
      .join("");


  const emptyEl =
    document.getElementById(
      "docsEmpty"
    );

  emptyEl?.classList.toggle(
    "hide",
    documents.length > 0
  );
}


function exportDocumentos() {
  const groups =
    groupByInvoice(
      state.filtered
    );

  if (!groups.length) {
    showToast(
      "Não há processos para exportar."
    );

    return;
  }

  const data =
    groups
      .map(
        buildDocumentInfo
      )
      .map(
        item => ({
          "Invoice":
            item.invoice,

          "OC":
            item.order,

          "DUIMP mencionada":
            item.hasDuimp
              ? "Sim"
              : "Não",

          "BL mencionado":
            item.hasBl
              ? "Sim"
              : "Não",

          "Packing List mencionado":
            item.hasPacking
              ? "Sim"
              : "Não",

          "DI mencionada":
            item.hasDi
              ? "Sim"
              : "Não",

          "XML mencionado":
            item.hasXml
              ? "Sim"
              : "Não",

          "Observação encontrada":
            item.note
        })
      );

  const workbook =
    XLSX.utils.book_new();

  const worksheet =
    XLSX.utils.json_to_sheet(
      data
    );

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Documentos"
  );

  XLSX.writeFile(
    workbook,
    "COMEX_Documentos.xlsx"
  );
}


function openView(view) {
  state.view = view;

  document
    .querySelectorAll(".comex-nav button")
    .forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.view === view
      );
    });

  const meta =
    VIEW_META[view] ||
    VIEW_META.entregas;

  const [title, subtitle, icon] = meta;

  $("#pageTitle").textContent = title;
  $("#pageSubtitle").textContent = subtitle;

  document
    .querySelectorAll(".view")
    .forEach(viewElement => {
      viewElement.classList.remove("active");
    });

  const directView =
    document.getElementById(`${view}View`);

  if (directView) {
    directView.classList.add("active");
  } else {
    const placeholder =
      document.getElementById("placeholderView");

    placeholder?.classList.add("active");

    if ($("#placeholderTitle")) {
      $("#placeholderTitle").textContent = title;
    }

    if ($("#placeholderText")) {
      $("#placeholderText").textContent =
        `${subtitle} A estrutura desta área já está criada e pode ser implementada por etapas.`;
    }

    if ($("#placeholderIcon")) {
      $("#placeholderIcon").className =
        `fa-solid ${icon}`;
    }
  }

  if (view === "dashboard") {
    renderDashboard();
  }

  if (view === "entregas") {
    render();
  }

  if (view === "containers") {
    renderContainers();
  }

  if (view === "invoices") {
    renderInvoices();
  }

  if (view === "embarques") {
    renderShipments();
  }

  if (view === "fornecedores") {
    renderSuppliers();
  }

  if (view === "documentos") {
    renderDocuments();
  }
}

document.querySelectorAll(".comex-nav button").forEach(btn => btn.addEventListener("click", () => openView(btn.dataset.view)));

$("#dashboardDeliveriesButton")?.addEventListener("click", () => openView("entregas"));
$("#dashboardSeeAll")?.addEventListener("click", () => openView("entregas"));
$("#dashboardUploadButton")?.addEventListener("click", () => els.file.click());
$("#dashboardEmptyUpload")?.addEventListener("click", () => els.file.click());
els.material.addEventListener("change", () => {
  updateColorOptions();
  updateFabricOptions();
  applyFilters();
});

els.color.addEventListener("change", () => {
  updateFabricOptions();
  applyFilters();
});

els.fabric?.addEventListener("change", () => {
  if (!els.fabric.value) {
    els.material.value = "";
    els.color.value = "";
    updateFabricOptions();
  }

  updateMaterialOptions();
  updateColorOptions();
  applyFilters();
});

els.invoice?.addEventListener("input", applyFilters);
els.invoice?.addEventListener("change", applyFilters);

$("#clearFilters").addEventListener("click", () => {
  els.material.value = "";
  els.color.value = "";
  if (els.fabric) els.fabric.value = "";

  if (els.invoice) {
    els.invoice.value = "";
  }

  updateMaterialOptions();
  updateColorOptions();
  updateFabricOptions();
  applyFilters();
});
$("#exportButton").addEventListener("click", exportFiltered);
els.file.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    els.lastUpdate.textContent = "Processando documento...";
    const rows = await readFile(file);
    state.rows = rows;
    state.sourceName = file.name;
    populateFilters();
    applyFilters();
    saveLocal();
    els.lastUpdate.textContent = `Dados atualizados agora · ${rows.length} registros`;
    showToast(`Documento importado com sucesso: ${rows.length} registros.`);
  } catch (error) {
    console.error(error);
    els.lastUpdate.textContent = "Falha ao processar documento";
    showToast(error.message || "Não foi possível ler o documento.");
  } finally {
    event.target.value = "";
  }
});

const upload = document.querySelector(".upload-card");
["dragenter","dragover"].forEach(type => upload.addEventListener(type, e => { e.preventDefault(); upload.style.borderColor = "#7fc0ff"; }));
["dragleave","drop"].forEach(type => upload.addEventListener(type, e => { e.preventDefault(); upload.style.borderColor = ""; }));
upload.addEventListener("drop", e => {
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  const dt = new DataTransfer(); dt.items.add(file); els.file.files = dt.files; els.file.dispatchEvent(new Event("change"));
});

document
  .getElementById("exportContainersButton")
  ?.addEventListener(
    "click",
    exportContainers
  );

document
  .getElementById("exportInvoicesButton")
  ?.addEventListener(
    "click",
    exportInvoices
  );

document
  .getElementById("exportEmbarquesButton")
  ?.addEventListener(
    "click",
    exportEmbarques
  );

document
  .getElementById("exportFornecedoresButton")
  ?.addEventListener(
    "click",
    exportFornecedores
  );

document
  .getElementById("exportDocumentosButton")
  ?.addEventListener(
    "click",
    exportDocumentos
  );

els.currentDate.textContent = formatDate(new Date());
render();
restoreLocal();
