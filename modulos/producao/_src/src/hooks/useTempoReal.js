import { useState, useEffect } from "react";

// Retorna um timestamp que atualiza a cada minuto, para forçar
// recálculo de tempo ocioso em tempo real nos useMemos.
export function useTempoReal() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  return now;
}