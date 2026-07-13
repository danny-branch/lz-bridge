"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LZ_CHAINS } from "@/lib/chains";

export function ChainSelect({
  value,
  onChange,
  exclude,
  label,
  peerStatus,
}: {
  value: string;
  onChange: (key: string) => void;
  exclude?: string;
  label: string;
  // Optional: eid -> whether an OFT peer is wired for that chain. Used to
  // annotate options so the user can see where they can actually bridge to.
  peerStatus?: Record<number, boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = LZ_CHAINS.find((c) => c.key === value);
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LZ_CHAINS.filter((c) => c.key !== exclude).filter(
      (c) => !q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)
    );
  }, [exclude, query]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(key: string) {
    onChange(key);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="chain-select" ref={rootRef}>
      <span className="eyebrow">{label}</span>
      <button
        type="button"
        className="select-shell"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dot" style={{ background: active?.color ?? "#4b5563" }} />
        <span className="current">{active?.label ?? "Select chain"}</span>
        <span className="chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="dropdown">
          <input
            ref={inputRef}
            className="search"
            placeholder="Search chains…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="options scrollbar-thin">
            {options.length === 0 && <div className="empty">No chains match “{query}”</div>}
            {options.map((c) => {
              const wired = peerStatus ? peerStatus[c.eid] : undefined;
              return (
                <button
                  type="button"
                  key={c.key}
                  className={`option ${c.key === value ? "selected" : ""}`}
                  onClick={() => pick(c.key)}
                >
                  <span className="dot" style={{ background: c.color }} />
                  <span className="label">{c.label}</span>
                  {wired === true && <span className="peer ok">wired</span>}
                  {wired === false && <span className="peer no">no peer</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .chain-select {
          position: relative;
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
          padding: 10px 12px;
          transition: border-color 0.15s ease;
          cursor: pointer;
          width: 100%;
          text-align: left;
          font-family: var(--font-body);
        }
        .select-shell:hover,
        .select-shell:focus-visible {
          border-color: var(--hairline-strong);
          outline: none;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .current {
          flex: 1;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chevron {
          font-size: 10px;
          color: var(--text-muted);
        }
        .dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 30;
          background: #1e293b;
          border: 1px solid var(--hairline-strong);
          border-radius: var(--radius-md);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .search {
          background: var(--bg-panel-raised);
          border: none;
          border-bottom: 1px solid var(--hairline);
          color: var(--text-primary);
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
        }
        .options {
          max-height: 260px;
          overflow-y: auto;
        }
        .empty {
          padding: 12px;
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 13.5px;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.1s ease;
        }
        .option:hover {
          background: rgba(148, 163, 184, 0.12);
        }
        .option.selected {
          background: rgba(6, 182, 212, 0.12);
        }
        .option .label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .peer {
          font-size: 10px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .peer.ok {
          color: var(--accent-verified);
          background: rgba(52, 211, 153, 0.12);
        }
        .peer.no {
          color: var(--text-muted);
          background: rgba(148, 163, 184, 0.12);
        }
      `}</style>
    </div>
  );
}
