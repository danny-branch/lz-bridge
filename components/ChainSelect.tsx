"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const active = LZ_CHAINS.find((c) => c.key === value);
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LZ_CHAINS.filter((c) => c.key !== exclude).filter(
      (c) => !q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)
    );
  }, [exclude, query]);

  function openDropdown() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 6, left: r.left, width: r.width });
    setOpen(true);
  }

  // The dropdown lives in a portal (document.body), so clicks/positioning
  // need to check both the trigger and the portaled panel — a card ancestor's
  // backdrop-filter creates a stacking context that otherwise clips it behind
  // later sibling cards.
  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    function onScrollOrResize(e: Event) {
      // Scrolling the options list itself dispatches a scroll event that
      // bubbles up through the capture phase — ignore that one so the list
      // stays open and scrollable.
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
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
        ref={buttonRef}
        className="select-shell"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dot" style={{ background: active?.color ?? "#4b5563" }} />
        <span className="current">{active?.label ?? "Select chain"}</span>
        <span className="chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open &&
        mounted &&
        rect &&
        createPortal(
          <div
            className="lz-chain-dropdown"
            ref={dropdownRef}
            style={{ top: rect.top, left: rect.left, width: rect.width }}
          >
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
          </div>,
          document.body
        )}

      <style jsx>{`
        .chain-select {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .select-shell {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-panel-raised);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-sm);
          padding: 13px 14px;
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
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .current {
          flex: 1;
          color: var(--text-primary);
          font-size: 15.5px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chevron {
          font-size: 11px;
          color: var(--text-muted);
        }
      `}</style>
      <style jsx global>{`
        .lz-chain-dropdown {
          position: fixed;
          z-index: 1000;
          background: #1e293b;
          border: 1px solid var(--hairline-strong);
          border-radius: var(--radius-md);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .lz-chain-dropdown .search {
          background: var(--bg-panel-raised);
          border: none;
          border-bottom: 1px solid var(--hairline);
          color: var(--text-primary);
          padding: 12px 14px;
          font-size: 14.5px;
          outline: none;
        }
        .lz-chain-dropdown .options {
          max-height: 280px;
          overflow-y: auto;
        }
        .lz-chain-dropdown .empty {
          padding: 14px;
          font-size: 13.5px;
          color: var(--text-muted);
        }
        .lz-chain-dropdown .option {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 11px 14px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 14.5px;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.1s ease;
        }
        .lz-chain-dropdown .option .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .lz-chain-dropdown .option:hover {
          background: rgba(148, 163, 184, 0.12);
        }
        .lz-chain-dropdown .option.selected {
          background: rgba(6, 182, 212, 0.12);
        }
        .lz-chain-dropdown .option .label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lz-chain-dropdown .peer {
          font-size: 10.5px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 3px 7px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .lz-chain-dropdown .peer.ok {
          color: var(--accent-verified);
          background: rgba(52, 211, 153, 0.12);
        }
        .lz-chain-dropdown .peer.no {
          color: var(--text-muted);
          background: rgba(148, 163, 184, 0.12);
        }
      `}</style>
    </div>
  );
}
