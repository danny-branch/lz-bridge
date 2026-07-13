"use client";

import { LZ_CHAINS } from "@/lib/chains";

export function ChainSelect({
  value,
  onChange,
  exclude,
  label,
}: {
  value: string;
  onChange: (key: string) => void;
  exclude?: string;
  label: string;
}) {
  const active = LZ_CHAINS.find((c) => c.key === value);
  return (
    <label className="chain-select">
      <span className="eyebrow">{label}</span>
      <div className="select-shell">
        <span className="dot" style={{ background: active?.color ?? "#4b5563" }} />
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {LZ_CHAINS.filter((c) => c.key !== exclude).map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <style jsx>{`
        .chain-select {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .select-shell {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-panel-raised);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-sm);
          padding: 0 12px;
          transition: border-color 0.15s ease;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        select {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 600;
          padding: 10px 0;
          width: 100%;
          outline: none;
          appearance: none;
        }
        select option {
          background: var(--bg-panel-raised);
          color: var(--text-primary);
        }
      `}</style>
    </label>
  );
}
