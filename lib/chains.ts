import {
  mainnet,
  bsc,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
} from "viem/chains";
import { defineChain, type Chain } from "viem";

// HyperEVM (Hyperliquid) isn't in viem/chains yet — defined manually.
// Verify RPC/explorer URLs before production use; LayerZero eid confirmed at 30367.
export const hyperEvm = defineChain({
  id: 999,
  name: "HyperEVM",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.hyperliquid.xyz/evm",
        "https://rpc.hypurrscan.io",
        "https://hyperliquid.drpc.org",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Hyperscan", url: "https://hyperevmscan.io" },
  },
});

// Robinhood Chain — Arbitrum Orbit L2, mainnet launched 2026-07-01. Verified 2026-07-13.
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

// Extra public RPC endpoints per chain, used as fallbacks so a single provider
// outage doesn't take down reads/writes. Order matters: first is primary.
export const RPC_FALLBACKS: Record<string, string[]> = {
  ethereum: [
    "https://eth.llamarpc.com",
    "https://ethereum-rpc.publicnode.com",
    "https://rpc.ankr.com/eth",
  ],
  bsc: [
    "https://bsc-dataseed.binance.org",
    "https://bsc-rpc.publicnode.com",
    "https://rpc.ankr.com/bsc",
  ],
  avalanche: [
    "https://avalanche-c-chain-rpc.publicnode.com",
    "https://rpc.ankr.com/avalanche",
    "https://api.avax.network/ext/bc/C/rpc",
  ],
  polygon: [
    "https://polygon-rpc.com",
    "https://polygon-bor-rpc.publicnode.com",
    "https://rpc.ankr.com/polygon",
  ],
  arbitrum: [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum-one-rpc.publicnode.com",
    "https://rpc.ankr.com/arbitrum",
  ],
  optimism: [
    "https://mainnet.optimism.io",
    "https://optimism-rpc.publicnode.com",
    "https://rpc.ankr.com/optimism",
  ],
  base: [
    "https://mainnet.base.org",
    "https://base-rpc.publicnode.com",
    "https://rpc.ankr.com/base",
  ],
  hyperliquid: ["https://rpc.hypurrscan.io", "https://hyperliquid.drpc.org"],
  robinhood: ["https://rpc.mainnet.chain.robinhood.com"],
};

// Shared LayerZero V2 EndpointV2 address — holds for every chain below as of 2026-07-13.
// Kept as a fallback default; per-chain override is supported and should be verified
// via https://metadata.layerzero-api.com/v1/metadata before trusting on a chain not listed here.
const DEFAULT_ENDPOINT_V2 = "0x1a44076050125825900e736c501f859c50fE728c" as const;

export type LzChainConfig = {
  key: string;
  label: string;
  viemChain: Chain;
  eid: number;
  endpointV2: `0x${string}`;
  color: string; // accent used for this chain's route node in the UI
};

export const LZ_CHAINS: LzChainConfig[] = [
  { key: "ethereum", label: "Ethereum", viemChain: mainnet, eid: 30101, endpointV2: DEFAULT_ENDPOINT_V2, color: "#6E86FF" },
  { key: "bsc", label: "BNB Chain", viemChain: bsc, eid: 30102, endpointV2: DEFAULT_ENDPOINT_V2, color: "#E8B93D" },
  { key: "avalanche", label: "Avalanche", viemChain: avalanche, eid: 30106, endpointV2: DEFAULT_ENDPOINT_V2, color: "#E85D5D" },
  { key: "polygon", label: "Polygon", viemChain: polygon, eid: 30109, endpointV2: DEFAULT_ENDPOINT_V2, color: "#B26EFF" },
  { key: "arbitrum", label: "Arbitrum", viemChain: arbitrum, eid: 30110, endpointV2: DEFAULT_ENDPOINT_V2, color: "#5FC9E8" },
  { key: "optimism", label: "Optimism", viemChain: optimism, eid: 30111, endpointV2: DEFAULT_ENDPOINT_V2, color: "#E85D8A" },
  { key: "base", label: "Base", viemChain: base, eid: 30184, endpointV2: DEFAULT_ENDPOINT_V2, color: "#5B8DEF" },
  { key: "hyperliquid", label: "HyperEVM", viemChain: hyperEvm, eid: 30367, endpointV2: DEFAULT_ENDPOINT_V2, color: "#3DE8B9" },
  // Robinhood's EndpointV2 differs from the shared default above — verified 2026-07-12.
  { key: "robinhood", label: "Robinhood", viemChain: robinhoodChain, eid: 30416, endpointV2: "0x6f475642a6e85809b1c36fa62763669b1b48dd5b", color: "#00C805" },
];

export function chainByKey(key: string) {
  return LZ_CHAINS.find((c) => c.key === key);
}

export function chainByEid(eid: number) {
  return LZ_CHAINS.find((c) => c.eid === eid);
}

// Default type-3 executor options: 200k gas for lzReceive on the destination.
// Sharp edge from the skill: an OApp with no enforced options reverts quoteSend
// with LZ_ULN_InvalidWorkerOptions on empty "0x" — always send this instead.
export const DEFAULT_EXTRA_OPTIONS =
  "0x00030100110100000000000000000000000000030d40" as const;

// LayerZero OFT standard default — most deployments use 6 shared decimals.
// The UI lets the user override this; a "detect" step tries sharedDecimals() on-chain first.
export const DEFAULT_SHARED_DECIMALS = 6;
