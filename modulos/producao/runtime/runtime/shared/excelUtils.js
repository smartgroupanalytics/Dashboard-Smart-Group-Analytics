export function normalize(s) {
    return String(s ?? '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}
export function parseNum(v) {
    if (v == null || v === '')
        return 0;
    if (typeof v === 'number')
        return v;
    const s = String(v).trim().replace(/\s/g, '').replace(/r\$/gi, '').replace(/kg/gi, '').replace(/[^\d,.-]/g, '');
    if (s.includes(',') && s.includes('.')) {
        const n = Number(s.replace(/\./g, '').replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }
    if (s.includes(',')) {
        const parts = s.split(',');
        if (parts.length === 2 && parts[0].length <= 3 && !parts[0].includes('.')) {
            const n = Number(s.replace(',', '.'));
            return isNaN(n) ? 0 : n;
        }
        const n = Number(s.replace(/\./g, '').replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }
    const n = Number(s);
    return isNaN(n) ? 0 : n;
}
const MES_MAP = {
    janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};
export function parseMes(v) {
    if (v == null || v === '')
        return null;
    if (typeof v === 'number') {
        if (v >= 1 && v <= 12)
            return Math.round(v);
        return null;
    }
    const s = normalize(v);
    if (MES_MAP[s])
        return MES_MAP[s];
    for (const [key, val] of Object.entries(MES_MAP)) {
        if (s.includes(key))
            return val;
    }
    return null;
}
export const MESES_LABELS = ['', 'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
export function num(v) {
    if (v == null || v === '')
        return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
}
export function norm(s) {
    return String(s ?? '').toLowerCase().trim()
        .replace(/[áàâã]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íìî]/g, 'i')
        .replace(/[óòôõ]/g, 'o').replace(/[úùû]/g, 'u').replace(/ç/g, 'c')
        .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
}
export function parseDate(v) {
    if (v == null || v === '')
        return null;
    if (v instanceof Date)
        return v;
    if (typeof v === 'number' && v > 0 && v < 100000) {
        const date = new Date(Math.round((v - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime()))
            return date;
    }
    const s = String(v).trim();
    const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
        let day = parseInt(match[1], 10);
        let month = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        if (year < 100)
            year += 2000;
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()))
            return date;
    }
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        const date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        if (!isNaN(date.getTime()))
            return date;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime()))
        return d;
    return null;
}
export function formatDate(date) {
    if (!date)
        return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
export function findHeaderRow(rows, keys = ['op']) {
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (!Array.isArray(row))
            continue;
        const cells = row.map(c => norm(c));
        const hasOp = cells.some(c => keys.some(k => c === k || c.includes(k)));
        if (hasOp)
            return i;
    }
    return -1;
}
export function findCol(headers, ...keys) {
    for (let i = 0; i < headers.length; i++) {
        const h = norm(headers[i]);
        if (!h)
            continue;
        for (const key of keys) {
            if (h === key || h.includes(key))
                return i;
        }
    }
    return -1;
}
