// Velocidades previstas (metros por minuto) por máquina e processo.
export const MACHINE_SPEEDS = {
    JR: { Recobrimento: 10, "Recobrimento 1": 10, "Recobrimento 2": 10, Rama: 11, "Rama 2": 11 },
    Gravadora: { Padrão: 13 },
    "Estampa 1": { Padrão: 10 },
    "Estampa 2": { Padrão: 13 },
    GR2: { Padrão: 4 },
    "Digital Solvente": { Padrão: 0.8 },
    "Digital UV": { Padrão: 0.6 },
    Tumbler: { Padrão: 5 },
};
export function getProcessos(maquina) {
    return Object.keys(MACHINE_SPEEDS[maquina] || {});
}
export function getSpeed(maquina, processo) {
    const map = MACHINE_SPEEDS[maquina] || {};
    if (processo && map[processo])
        return map[processo];
    // busca case-insensitive (ex.: "RAMA" -> "Rama")
    if (processo) {
        const key = Object.keys(map).find((k) => k.toLowerCase() === String(processo).toLowerCase());
        if (key)
            return map[key];
    }
    return map["Padrão"] || Object.values(map)[0] || 0;
}
// Tempo esperado em HORAS = (metragem / velocidade em m/min) / 60
export function tempoEsperadoHoras(metragem, maquina, processo) {
    const speed = getSpeed(maquina, processo);
    if (!speed || !metragem)
        return 0;
    return Math.round((metragem / speed / 60) * 1000) / 1000;
}
// Tempo real em HORAS = (hora final - hora inicial em minutos) / 60
export function tempoRealHoras(hi, hf) {
    if (!hi || !hf)
        return 0;
    const [h1, m1] = hi.split(":").map(Number);
    const [h2, m2] = hf.split(":").map(Number);
    return Math.round((((h2 * 60 + m2) - (h1 * 60 + m1)) / 60) * 1000) / 1000;
}
// Tempo previsto de SETUP (minutos) por máquina e processo.
// Regras:
// - JR + Rama/Rama 2 → 15 min; JR + Recobrimento/Recobrimento 2 → 25 min
// - Gravadora → 40 min
// - Estampa 1 / Estampa 2 → 60 min
// - GR2 → 40 min
// - Digitais (Solvente/UV) → 30 min
export function setupPrevistoMinutos(maquina, processo) {
    if (!maquina)
        return 0;
    const m = String(maquina).trim().toLowerCase();
    const p = String(processo || "").trim().toLowerCase();
    // JR — depende do processo
    if (m === "jr") {
        if (p === "rama" || p === "rama 2" || p === "rama2")
            return 15;
        if (p.includes("recobr"))
            return 25;
        return 0;
    }
    // Gravadora
    if (m === "gravadora")
        return 40;
    // Estampa 1 e Estampa 2
    if (m === "estampa 1" || m === "estampa1")
        return 40;
    if (m === "estampa 2" || m === "estampa2")
        return 40;
    // GR2
    if (m === "gr2" || m === "gr 2")
        return 40;
    // Digitais
    if (m.includes("digital"))
        return 30;
    return 0;
}
