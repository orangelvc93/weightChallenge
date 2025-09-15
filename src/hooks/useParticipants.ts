// src/hooks/useParticipants.ts
import { useEffect, useState } from "react";
import { fsListAll } from "../firebase";
import type { Participant } from "../types";

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { participants } = await fsListAll();
        const adapt: Participant[] = participants.map((p) => ({
          id: p.id,
          name: p.name,
          startWeight: p.startWeight,
          goalWeight: p.goalWeight,
          entries: p.entries.map((e) => ({ date: e.date, weight: e.weight })),
        }));
        setParticipants(adapt);
        setErr(null);
      } catch {
        setErr("No se pudo cargar datos de Firestore.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { participants, setParticipants, loading, err };
}
