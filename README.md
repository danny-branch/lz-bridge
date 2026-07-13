# OFT Route

A deployable Next.js dApp for bridging any LayerZero V2 OFT / OFTAdapter token across
Ethereum, BSC, Avalanche, Polygon, Arbitrum, Optimism, Base, HyperEVM (Hyperliquid), and
Robinhood Chain. Companion frontend to the `layerzero-oft-bridge` skill — implements the
same discovery, quoting, sending, and tracking logic as an interactive UI instead of an
agent workflow.

## What it does

1. You connect a wallet (any browser-injected wallet out of the box; WalletConnect optional).
2. You pick a source chain, destination chain, and paste any token/OFT/adapter address.
3. The app probes the address on-chain (`oftVersion()`, `approvalRequired()`, `token()`,
   `peers(dstEid)`) to figure out whether it's an adapter (lock/unlock) or a native OFT
   (mint/burn), whether the destination lane is wired, and what to show as your balance —
   on both the source chain and, by decoding the wired peer address, the destination chain.
4. Both balances refresh automatically once a second while the tab is visible (paused in
   the background to avoid hammering public RPCs), with a manual refresh button next to
   the source balance for an on-demand check.
5. You enter an amount, get a live quote (`quoteSend`), approve if needed, and send.
6. The app polls LayerZero Scan's public API and shows delivery status plus both
   transaction hashes once the packet lands, then refreshes both balances again.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — only needed for WalletConnect
npm run dev
```

Open http://localhost:3000.

For a real deployment, push this to a git repo and import it into Vercel (or any
Next.js-compatible host) — no server-side secrets are required, everything runs
client-side against public RPCs and the wallet's own signer.

## Configuration

- **Chains, endpoint IDs, and colors**: `lib/chains.ts`. Most chains use viem's
  built-in RPC defaults; HyperEVM and Robinhood Chain are hand-defined (verify their
  RPC URL and block explorer before relying on them in production — both are newer
  networks and URLs can change). Robinhood Chain also uses a distinct EndpointV2
  address from the shared default the other 7 chains use — already set correctly in
  `lib/chains.ts`, but re-verify via the metadata API if it ever seems to fail.
- **LayerZero EndpointV2 address**: a single address (`0x1a44...728c`) is shared across
  all listed chains as of 2026-07-13 and is used as the default. If you add a chain not
  in this list, verify its EndpointV2 address via
  `https://metadata.layerzero-api.com/v1/metadata` before trusting it.
- **Shared decimals**: the app tries to call `sharedDecimals()` on the token contract;
  most OFTs don't expose this function, in which case it falls back to `6` (the LayerZero
  OFT standard default). If a specific token uses a different value and you hit
  `SlippageExceeded` on send, that token needs an explicit override — search the codebase
  for `DEFAULT_SHARED_DECIMALS` in `lib/chains.ts`.
- **Extra options**: sends always pass the type-3 options
  `0x00030100110100000000000000000000000000030d40` (200k gas for `lzReceive`), per the
  skill's guidance that OApps without enforced options revert on empty `0x`.

## Safety notes

- This app never asks for or stores a private key — signing happens in the user's own
  wallet extension.
- It doesn't validate that a pasted address is a *trustworthy* OFT, only that it
  technically implements the OFT interface (`oftVersion()` doesn't revert). A malicious
  contract could still implement that interface. Always confirm you trust the token/
  project before approving or sending.
- Peer-wiring and DVN configuration are the token deployer's responsibility, not this
  app's — if `peers(dstEid)` comes back unwired, or a send gets stuck, see the
  "Debugging quoteSend reverts" / "Stuck packet?" sections in the `layerzero-oft-bridge`
  skill for the on-chain diagnosis and rescue steps this UI doesn't automate.

## Structure

```
app/            Next.js App Router pages, layout, providers
components/     BridgeCard (main flow), ChainSelect, RouteLine, StatusLog, WalletButton
lib/chains.ts   Chain registry: eids, endpoint addresses, viem chain objects
lib/abi.ts      Minimal OFT/OFTAdapter + ERC20 ABIs
lib/lzMath.ts   minAmountLD truncation, amount parsing/formatting, address<->bytes32
lib/lzTrack.ts  LayerZero Scan polling helpers
lib/wagmiConfig.ts  wagmi client config (injected + optional WalletConnect connector)
```
