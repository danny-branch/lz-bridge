"use client";

export type LogLine = { t: number; text: string; tone?: "muted" | "alert" | "ok" };

export function StatusLog({ lines }: { lines: LogLine[] }) {
  return (
    <div className="log card scrollbar-thin">
      <div className="eyebrow log-title">Session log</div>
      <div className="log-body">
        {lines.length === 0 && <div className="mono empty">waiting for first action…</div>}
        {lines.map((l, i) => (
          <div key={i} className={`mono line ${l.tone ?? ""}`}>
            <span className="ts">{new Date(l.t).toLocaleTimeString()}</span> {l.text}
          </div>
        ))}
      </div>
      <style jsx>{`
        .log {
          padding: 14px 16px 16px;
          max-height: 220px;
          overflow-y: auto;
        }
        .log-title {
          margin-bottom: 8px;
        }
        .empty {
          color: var(--text-muted);
          font-size: 13px;
        }
        .line {
          font-size: 12.5px;
          line-height: 1.7;
          color: var(--text-primary);
        }
        .line.muted {
          color: var(--text-muted);
        }
        .line.alert {
          color: var(--accent-alert);
        }
        .line.ok {
          color: var(--accent-verified);
        }
        .ts {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
