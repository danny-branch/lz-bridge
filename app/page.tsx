import { BridgeCard } from "@/components/BridgeCard";
import { LZ_CHAINS } from "@/lib/chains";

export default function Home() {
  return (
    <main className="container">
      <header className="hero">
        <div className="eyebrow">LayerZero V2 · {LZ_CHAINS.length} chains</div>
        <h1 className="title">
          OFT <span className="accent">Route</span>
        </h1>
        <p className="subtitle">
          Point at any OFT or OFTAdapter address, pick a source and destination chain, and send.
          Detection, quoting, approval, and delivery tracking happen inline — nothing to run by hand.
        </p>
        <div className="chain-row">
          {LZ_CHAINS.map((c) => (
            <span key={c.key} className="chain-badge mono">
              <span className="chain-dot" style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      </header>
      <BridgeCard />
      <footer className="footer mono">
        Endpoint IDs and contracts are read live from the chain — verify any address you paste
        before signing. See the companion skill for the underlying protocol reference.
      </footer>
      <style>{`
        .hero {
          margin-bottom: 32px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .title {
          font-size: 36px;
          font-weight: 600;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .accent {
          background: linear-gradient(to right, var(--gradient-from), var(--gradient-to));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .subtitle {
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.6;
          max-width: 640px;
          margin: 0;
        }
        .chain-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .chain-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg-panel);
          backdrop-filter: blur(8px);
          border: 1px solid var(--hairline);
          border-radius: 999px;
          padding: 5px 10px 5px 8px;
        }
        .chain-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .footer {
          margin-top: 40px;
          font-size: 11.5px;
          color: var(--text-muted);
          line-height: 1.6;
          border-top: 1px solid var(--hairline);
          padding-top: 16px;
        }
      `}</style>
    </main>
  );
}
