import React from "react";

export default function RecorrenciaRanking({ data }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide bg-[#00798C] rounded-lg px-3 py-2">Ranking de Recorrência</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 font-semibold text-slate-600">Código</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-600">Descrição</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-600">Recorrência</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-2 font-mono font-semibold text-slate-900">{d.codigo}</td>
                <td className="py-2 px-2 text-slate-600 max-w-[200px] truncate">{d.descricao}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="flex-1 max-w-[120px] h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#00798C] to-[#A2D5DE]"
                        style={{ width: `${(d.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums w-8 text-right">{d.count}</span>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-400">Nenhum dado para exibir</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}