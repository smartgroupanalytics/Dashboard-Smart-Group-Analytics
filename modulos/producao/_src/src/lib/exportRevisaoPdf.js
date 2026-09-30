import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// Recorta as bordas do canvas que contêm apenas a cor de fundo,
// devolvendo um novo canvas com o conteúdo real (sem margens vazias).
function trimCanvas(canvas, bg, tol = 10) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const [bgR, bgG, bgB] = bg;

  const isBg = (x, y) => {
    const i = (y * width + x) * 4;
    return (
      Math.abs(data[i] - bgR) <= tol &&
      Math.abs(data[i + 1] - bgG) <= tol &&
      Math.abs(data[i + 2] - bgB) <= tol
    );
  };

  let top = 0;
  outerTop: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isBg(x, y)) { top = y; break outerTop; }
    }
  }
  let bottom = height - 1;
  outerBottom: for (let y = height - 1; y >= top; y--) {
    for (let x = 0; x < width; x++) {
      if (!isBg(x, y)) { bottom = y; break outerBottom; }
    }
  }
  let left = 0;
  outerLeft: for (let x = 0; x < width; x++) {
    for (let y = top; y <= bottom; y++) {
      if (!isBg(x, y)) { left = x; break outerLeft; }
    }
  }
  let right = width - 1;
  outerRight: for (let x = width - 1; x >= left; x--) {
    for (let y = top; y <= bottom; y++) {
      if (!isBg(x, y)) { right = x; break outerRight; }
    }
  }

  const cropW = right - left + 1;
  const cropH = bottom - top + 1;
  if (cropW <= 0 || cropH <= 0) return canvas;

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const octx = out.getContext("2d");
  octx.drawImage(canvas, left, top, cropW, cropH, 0, 0, cropW, cropH);
  return out;
}

// Captura um elemento para canvas já recortando margens.
async function captureElement(element, bg, opts = {}) {
  const { hideSelector, hideButtons, injectTitle, expandScroll, trim = true } = opts;

  const hidden = [];
  if (hideSelector) {
    element.querySelectorAll(hideSelector).forEach((el) => {
      el.style.display = "none";
      hidden.push(el);
    });
  }
  if (hideButtons) {
    element.querySelectorAll("button").forEach((el) => {
      el.style.display = "none";
      hidden.push(el);
    });
  }

  // Força o estado final visível (framer-motion/entradas com opacity 0 ou transform)
  const forced = [];
  element.querySelectorAll("*").forEach((el) => {
    const cs = window.getComputedStyle(el);
    if (cs.opacity !== "1" || cs.transform !== "none" || cs.willChange !== "auto") {
      forced.push({ el, opacity: el.style.opacity, transform: el.style.transform, willChange: el.style.willChange });
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.willChange = "auto";
    }
  });

  let titleEl = null;
  if (injectTitle) {
    titleEl = document.createElement("div");
    titleEl.style.cssText =
      "text-align:center;font-size:22px;font-weight:800;color:#0f172a;margin-bottom:8px;padding:4px 0;";
    titleEl.textContent = injectTitle;
    element.insertBefore(titleEl, element.firstChild);
  }

  let prev = null;
  if (expandScroll) {
    prev = {
      height: element.style.height,
      maxHeight: element.style.maxHeight,
      overflow: element.style.overflow,
    };
    element.style.height = "auto";
    element.style.maxHeight = "none";
    element.style.overflow = "visible";
  }

  const rawCanvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: `rgb(${bg[0]},${bg[1]},${bg[2]})`,
    useCORS: true,
    logging: false,
  });

  const canvas = trim ? trimCanvas(rawCanvas, bg) : rawCanvas;

  hidden.forEach((el) => (el.style.display = ""));
  forced.forEach(({ el, opacity, transform, willChange }) => {
    el.style.opacity = opacity;
    el.style.transform = transform;
    el.style.willChange = willChange;
  });
  if (titleEl) titleEl.remove();
  if (expandScroll) {
    element.style.height = prev.height;
    element.style.maxHeight = prev.maxHeight;
    element.style.overflow = prev.overflow;
  }

  return canvas;
}

// Gera um único PDF de apresentação com 2 páginas fixas (dashboard + relatório)
// seguidas de páginas extras (prints de outros dashboards) e abre em modo de apresentação.
export async function exportRevisaoPresentationToPdf(
  dashboardEl,
  relatorioEl,
  relatorioTitle,
  extraPages = []
) {
  if (!dashboardEl) throw new Error("Elemento do dashboard não encontrado.");
  if (!relatorioEl) throw new Error("Elemento do relatório não encontrado.");

  const dashCanvas = await captureElement(dashboardEl, [248, 249, 250], {
    hideSelector: ".pdf-hide",
  });
  const relCanvas = await captureElement(relatorioEl, [255, 255, 255], {
    injectTitle: relatorioTitle,
    expandScroll: true,
  });

  // Todas as páginas em A4 paisagem (297 x 210 mm), mesmo tamanho, sem cortes.
  const PAGE_W = 297;
  const PAGE_H = 210;
  const MARGIN = 5; // margem lateral/superior pequena para não colar na borda
  const usableW = PAGE_W - MARGIN * 2;
  const usableH = PAGE_H - MARGIN * 2;

  // Ajusta um canvas à página mantendo proporção (sem cortar), centralizado.
  const fitToPage = (canvas) => {
    const pxToMm = 0.264583;
    const imgW = canvas.width * pxToMm;
    const imgH = canvas.height * pxToMm;
    const ratio = Math.min(usableW / imgW, usableH / imgH);
    const drawW = imgW * ratio;
    const drawH = imgH * ratio;
    const x = (PAGE_W - drawW) / 2;
    const y = (PAGE_H - drawH) / 2;
    return { data: canvas.toDataURL("image/png"), x, y, w: drawW, h: drawH };
  };

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Página 1: dashboard
  const p1 = fitToPage(dashCanvas);
  doc.addImage(p1.data, "PNG", p1.x, p1.y, p1.w, p1.h, undefined, "FAST");

  // Página 2: relatório da semana
  const p2 = fitToPage(relCanvas);
  doc.addPage("a4", "landscape");
  doc.addImage(p2.data, "PNG", p2.x, p2.y, p2.w, p2.h, undefined, "FAST");

  // Páginas 3+: dashboards extras (cada captura é isolada — falha em uma não derruba o PDF)
  for (let idx = 0; idx < extraPages.length; idx++) {
    const page = extraPages[idx];
    if (!page || !page.el) continue;
    try {
      const canvas = await captureElement(page.el, page.bg || [255, 255, 255], {
        hideButtons: true,
        hideSelector: page.hideSelector || ".print-hide",
        trim: page.trim ?? false,
        expandScroll: page.expandScroll ?? false,
      });
      const p = fitToPage(canvas);
      doc.addPage("a4", "landscape");
      doc.addImage(p.data, "PNG", p.x, p.y, p.w, p.h, undefined, "FAST");
    } catch (err) {
      console.warn(`Página extra ${idx + 3} ignorada:`, err);
    }
  }

  doc.save("Revisao-Apresentacao.pdf");
}