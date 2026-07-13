import { createConfig, fallback, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { LZ_CHAINS, RPC_FALLBACKS } from "./chains";

const viemChains = LZ_CHAINS.map((c) => c.viemChain) as unknown as readonly [
  (typeof LZ_CHAINS)[number]["viemChain"],
  ...((typeof LZ_CHAINS)[number]["viemChain"])[]
];

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: viemChains,
  connectors: [
    injected(),
    // Only registered if an env var is provided — get a free project id at
    // https://cloud.reown.com (formerly WalletConnect Cloud) if you want mobile
    // wallet support beyond browser-injected wallets (MetaMask, Rabby, etc).
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
      : []),
  ],
  // Each chain gets its curated fallback RPCs (if any) plus its viem-provided
  // defaults, wrapped in fallback() so a single RPC outage doesn't stop
  // reads/writes — viem retries the next one in the list.
  transports: Object.fromEntries(
    LZ_CHAINS.map((c) => {
      const curated = RPC_FALLBACKS[c.key] ?? [];
      const defaults = c.viemChain.rpcUrls.default.http;
      const urls = Array.from(new Set([...curated, ...defaults]));
      return [c.viemChain.id, fallback(urls.map((url) => http(url)))];
    })
  ),
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
