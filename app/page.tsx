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
          font-size: 44px;
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
          font-size: 16.5px;
          line-height: 1.6;
          max-width: 680px;
          margin: 0;
        }
        .footer {
          margin-top: 40px;
          font-size: 12.5px;
          color: var(--text-muted);
          line-height: 1.6;
          border-top: 1px solid var(--hairline);
          padding-top: 16px;
        }
      `}</style>
    </main>
  );
}
