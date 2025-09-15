// src/components/Leaderboard.tsx
import React from "react";
import type { Participant } from "../types";
import { computeProgress, progressColor } from "../lib/utils";

function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
    return <div className={`rounded-2xl shadow-md bg-white border border-emerald-200 ${className}`}>{children}</div>;
}
function SectionTitle({ title }: { title: string }) {
    return <h2 className="text-xl md:text-2xl font-bold text-emerald-800 mb-4">{title}</h2>;
}

export default function Leaderboard({ participants }: { participants: Participant[] }) {
    const ordered = [...participants]
        .map((p) => {
            const current = p.entries[p.entries.length - 1]?.weight ?? p.startWeight;
            return { name: p.name, progress: computeProgress(p.startWeight, p.goalWeight, current) };
        })
        .sort((a, b) => b.progress - a.progress);

    return (
        <Card className="p-4">
            <SectionTitle title="Ranking de avance" />
            {ordered.map((r, i) => (
                <div key={r.name} className="flex gap-3 items-center">
                    <div className={`w-6 h-6 text-xs grid place-items-center rounded-full ${i === 0 ? "bg-emerald-300" : "bg-emerald-100"}`}>{i + 1}</div>
                    <span className="flex-1">{r.name}</span>
                    <div className="w-1/2 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${r.progress * 100}%`, background: progressColor(r.progress) }} className="h-full" />
                    </div>
                </div>
            ))}
        </Card>
    );
}
