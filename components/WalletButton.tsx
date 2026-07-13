"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

function short(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <button className="mono wallet-btn" onClick={() => disconnect()}>
        <span className="wallet-dot" />
        {short(address)}
        <style jsx>{`
          .wallet-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--bg-panel-raised);
            border: 1px solid var(--hairline);
            color: var(--text-primary);
            border-radius: var(--radius-md);
            padding: 8px 14px;
            font-size: 13px;
            cursor: pointer;
            transition: border-color 0.15s ease, background-color 0.15s ease;
          }
          .wallet-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--accent-verified);
          }
          .wallet-btn:hover {
            border-color: var(--accent-verified);
          }
        `}</style>
      </button>
    );
  }

  return (
    <div className="connect-wrap">
      {connectors.map((c) => (
        <button
          key={c.uid}
          className="mono wallet-btn"
          disabled={isPending}
          onClick={() => connect({ connector: c })}
        >
          Connect {c.name}
        </button>
      ))}
      <style jsx>{`
        .connect-wrap {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .wallet-btn {
          background: linear-gradient(to right, var(--gradient-from), var(--gradient-to));
          border: 1px solid transparent;
          color: #fff;
          font-weight: 600;
          border-radius: var(--radius-md);
          padding: 8px 14px;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .wallet-btn:hover:not(:disabled) {
          background: linear-gradient(to right, var(--gradient-from-hover), var(--gradient-to-hover));
        }
        .wallet-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
