// Cálculo de tempo ocioso em tempo real baseado no horário de trabalho:
// Manhã: 07:30 às 12:00 (4:30h)
// Almoço: 12:00 às 13:00 (não conta como ocioso)
// Tarde: 13:00 às 17:18 (4:18h)
// Total do dia: 8:48h (8.8h)
//
// Para o dia atual, calcula proporcional ao horário atual.
// Para dias passados, usa o dia completo.
// Tempo ocioso padrão de dia completo por máquina
const TEMPO_DIA_COMPLETO = (maq) => (maq === "Estampa 1" ? 1.533 : 8.8);
// Horários (em horas decimais)
const INICIO_MANHA = 7.5; // 07:30
const FIM_MANHA = 12.0; // 12:00
const INICIO_TARDE = 13.0; // 13:00
const FIM_TARDE = 17.3; // 17:18 (17 + 18/60)
function agoraSaoPaulo() {
    const agora = new Date();
    return new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}
function hojeIsoSP() {
    const d = agoraSaoPaulo();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Calcula o tempo ocioso (em horas) para uma máquina sem apontamento.
// Se for hoje, calcula em tempo real; se for dia passado, usa o dia completo.
export function tempoOciosoTempoReal(maq, data) {
    const hoje = hojeIsoSP();
    // Dias passados: dia completo
    if (data !== hoje)
        return TEMPO_DIA_COMPLETO(maq);
    // Hoje: calcula em tempo real
    const agora = agoraSaoPaulo();
    const horas = agora.getHours() + agora.getMinutes() / 60;
    let ocioso;
    if (horas < INICIO_MANHA) {
        ocioso = 0;
    }
    else if (horas <= FIM_MANHA) {
        ocioso = horas - INICIO_MANHA;
    }
    else if (horas <= INICIO_TARDE) {
        ocioso = FIM_MANHA - INICIO_MANHA; // 4.5h (almoço)
    }
    else if (horas <= FIM_TARDE) {
        ocioso = (FIM_MANHA - INICIO_MANHA) + (horas - INICIO_TARDE);
    }
    else {
        ocioso = (FIM_MANHA - INICIO_MANHA) + (FIM_TARDE - INICIO_TARDE); // 8.8h
    }
    return Math.min(ocioso, TEMPO_DIA_COMPLETO(maq));
}
