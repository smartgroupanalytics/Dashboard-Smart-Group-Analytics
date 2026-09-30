const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import pptxgen from "pptxgenjs";
import { buildRevisaoSlide } from "@/lib/pptx/revisaoSlide";
import { buildRotatividadeSlide } from "@/lib/pptx/rotatividadeSlide";
import { buildProdutividadeSlide } from "@/lib/pptx/produtividadeSlide";
import { buildCargaMaquinaSlide } from "@/lib/pptx/cargaMaquinaSlide";
export async function exportDashboardsToPptx(revisaoRecords, revisaoMesesLabel) {
    const [rotatividade, produtividade, carteira, faltaProgramar] = await Promise.all([
        db.entities.RotatividadeMensal.list("mes", 100),
        db.entities.ProdutividadeDiaria.list("-data", 5000),
        db.entities.CarteiraPedido.list("ordem", 50),
        db.entities.FaltaProgramarItem.list("ordem", 200),
    ]);
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "Faturamento Dashboard";
    pptx.title = "Dashboards Gerenciais";
    buildRevisaoSlide(pptx, revisaoRecords || [], revisaoMesesLabel);
    buildRotatividadeSlide(pptx, rotatividade || []);
    buildProdutividadeSlide(pptx, produtividade || []);
    buildCargaMaquinaSlide(pptx, carteira || [], faltaProgramar || []);
    await pptx.writeFile({ fileName: "Dashboards_Gerenciais.pptx" });
}
