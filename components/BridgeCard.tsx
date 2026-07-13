"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { oftAbi, erc20Abi } from "@/lib/abi";
import {
  chainByKey,
  LZ_CHAINS,
  DEFAULT_EXTRA_OPTIONS,
  DEFAULT_SHARED_DECIMALS,
} from "@/lib/chains";
import { computeMinAmountLD, addressToBytes32, bytes32ToAddress, parseAmount, formatAmount } from "@/lib/lzMath";
import { layerZeroScanUrl, pollUntilDelivered } from "@/lib/lzTrack";
import { ChainSelect } from "./ChainSelect";
import { RouteLine, type RouteStatus } from "./RouteLine";
import { StatusLog, type LogLine } from "./StatusLog";
import { WalletButton } from "./WalletButton";

type Detection = {
  loading: boolean;
  error: string | null;
  isOft: boolean | null;
  isAdapter: boolean | null;
  balanceToken: `0x${string}` | null; // ERC20 to read balance/decimals from
  decimals: number | null;
  symbol: string | null;
  sharedDecimals: number;
  peerWired: boolean | null;
  peerAddress: `0x${string}` | null;
};

const EMPTY_DETECTION: Detection = {
  loading: false,
  error: null,
  isOft: null,
  isAdapter: null,
  balanceToken: null,
  decimals: null,
  symbol: null,
  sharedDecimals: DEFAULT_SHARED_DECIMALS,
  peerWired: null,
  peerAddress: null,
};

function isAddress(v: string): v is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

export function BridgeCard() {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [srcKey, setSrcKey] = useState("base");
  const [dstKey, setDstKey] = useState("robinhood");
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const [detection, setDetection] = useState<Detection>(EMPTY_DETECTION);
  const [peersByEid, setPeersByEid] = useState<Record<number, boolean>>({});
  const [peersLoading, setPeersLoading] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState<number | null>(null);
  const [destInfo, setDestInfo] = useState<{ decimals: number | null; symbol: string | null; balance: bigint | null }>({
    decimals: null,
    symbol: null,
    balance: null,
  });
  const [quoteFee, setQuoteFee] = useState<bigint | null>(null);
  const [status, setStatus] = useState<RouteStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [dstTx, setDstTx] = useState<string | null>(null);

  const srcChain = chainByKey(srcKey)!;
  const dstChain = chainByKey(dstKey)!;
  const srcPublicClient = usePublicClient({ chainId: srcChain.viemChain.id });
  const dstPublicClient = usePublicClient({ chainId: dstChain.viemChain.id });

  const addLog = useCallback((text: string, tone?: LogLine["tone"]) => {
    setLogs((prev) => [...prev, { t: Date.now(), text, tone }].slice(-200));
  }, []);

  useEffect(() => {
    if (address && !recipient) setRecipient(address);
  }, [address, recipient]);

  // --- Discovery: probe the token address on the source chain ---
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isAddress(tokenAddress) || !srcPublicClient) {
        setDetection(EMPTY_DETECTION);
        return;
      }
      setDetection({ ...EMPTY_DETECTION, loading: true });
      try {
        // 1. oftVersion() — reverts on a plain ERC-20
        await srcPublicClient.readContract({
          address: tokenAddress,
          abi: oftAbi,
          functionName: "oftVersion",
        });

        const approvalRequired = await srcPublicClient.readContract({
          address: tokenAddress,
          abi: oftAbi,
          functionName: "approvalRequired",
        });

        let balanceToken: `0x${string}` = tokenAddress;
        if (approvalRequired) {
          balanceToken = (await srcPublicClient.readContract({
            address: tokenAddress,
            abi: oftAbi,
            functionName: "token",
          })) as `0x${string}`;
        }

        let sharedDecimals = DEFAULT_SHARED_DECIMALS;
        try {
          sharedDecimals = (await srcPublicClient.readContract({
            address: tokenAddress,
            abi: oftAbi,
            functionName: "sharedDecimals",
          })) as number;
        } catch {
          // Not every deployment exposes sharedDecimals() — keep the default and let
          // the user override it in Advanced if quoteSend/SlippageExceeded disagrees.
        }

        const [decimals, symbol] = await Promise.all([
          srcPublicClient.readContract({ address: balanceToken, abi: erc20Abi, functionName: "decimals" }),
          srcPublicClient.readContract({ address: balanceToken, abi: erc20Abi, functionName: "symbol" }),
        ]);

        const peer = await srcPublicClient.readContract({
          address: tokenAddress,
          abi: oftAbi,
          functionName: "peers",
          args: [dstChain.eid],
        });
        const zeroBytes32 = ("0x" + "0".repeat(64)) as `0x${string}`;
        const peerWired = peer !== zeroBytes32;
        const peerAddress = peerWired ? bytes32ToAddress(peer as `0x${string}`) : null;

        if (cancelled) return;
        setDetection({
          loading: false,
          error: null,
          isOft: true,
          isAdapter: !!approvalRequired,
          balanceToken,
          decimals: decimals as number,
          symbol: symbol as string,
          sharedDecimals,
          peerWired,
          peerAddress,
        });
        addLog(
          `detected ${approvalRequired ? "OFTAdapter (lock/unlock)" : "OFT (mint/burn)"} for ${symbol} on ${srcChain.label}` +
            (peerWired ? "" : ` — WARNING: no peer wired for ${dstChain.label} (eid ${dstChain.eid})`),
          peerWired ? undefined : "alert"
        );
      } catch (e) {
        if (cancelled) return;
        setDetection({ ...EMPTY_DETECTION, loading: false, error: "Not a LayerZero OFT/OFTAdapter on this chain (oftVersion() reverted)." });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress, srcKey, dstKey, srcPublicClient]);

  // --- Peer sweep: one multicall to peers(eid) for every other chain, so the
  // destination picker can show which networks this OFT can actually reach. ---
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isAddress(tokenAddress) || !srcPublicClient || !detection.isOft) {
        setPeersByEid({});
        return;
      }
      const targets = LZ_CHAINS.filter((c) => c.key !== srcKey);
      setPeersLoading(true);
      try {
        const results = await srcPublicClient.multicall({
          contracts: targets.map((c) => ({
            address: tokenAddress,
            abi: oftAbi,
            functionName: "peers",
            args: [c.eid],
          })),
          allowFailure: true,
        });
        if (cancelled) return;
        const zeroBytes32 = ("0x" + "0".repeat(64)) as `0x${string}`;
        const map: Record<number, boolean> = {};
        results.forEach((r, i) => {
          map[targets[i].eid] = r.status === "success" && r.result !== zeroBytes32;
        });
        setPeersByEid(map);
      } catch {
        if (!cancelled) setPeersByEid({});
      } finally {
        if (!cancelled) setPeersLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [tokenAddress, srcKey, srcPublicClient, detection.isOft]);

  // --- Balance + allowance refresh ---
  const refreshBalanceAndAllowance = useCallback(async () => {
    if (!srcPublicClient || !detection.balanceToken || !address) return;
    setIsRefreshingBalance(true);
    try {
      const bal = (await srcPublicClient.readContract({
        address: detection.balanceToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      setBalance(bal);
      if (detection.isAdapter && isAddress(tokenAddress)) {
        const allow = (await srcPublicClient.readContract({
          address: detection.balanceToken,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, tokenAddress],
        })) as bigint;
        setAllowance(allow);
      } else {
        setAllowance(null);
      }
      setBalanceUpdatedAt(Date.now());
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [srcPublicClient, detection.balanceToken, detection.isAdapter, address, tokenAddress]);

  useEffect(() => {
    refreshBalanceAndAllowance();
  }, [refreshBalanceAndAllowance]);

  const recipientForRead = useMemo<`0x${string}` | null>(() => {
    if (isAddress(recipient)) return recipient;
    if (address) return address;
    return null;
  }, [recipient, address]);

  const refreshDestBalance = useCallback(async () => {
    if (!dstPublicClient || !detection.peerAddress || !recipientForRead) {
      setDestInfo({ decimals: null, symbol: null, balance: null });
      return;
    }
    try {
      const [decimals, symbol, bal] = await Promise.all([
        dstPublicClient.readContract({ address: detection.peerAddress, abi: erc20Abi, functionName: "decimals" }),
        dstPublicClient.readContract({ address: detection.peerAddress, abi: erc20Abi, functionName: "symbol" }),
        dstPublicClient.readContract({
          address: detection.peerAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [recipientForRead],
        }),
      ]);
      setDestInfo({ decimals: decimals as number, symbol: symbol as string, balance: bal as bigint });
    } catch {
      setDestInfo({ decimals: null, symbol: null, balance: null });
    }
  }, [dstPublicClient, detection.peerAddress, recipientForRead]);

  useEffect(() => {
    refreshDestBalance();
  }, [refreshDestBalance]);

  // Keep the balance live without a manual refresh: poll once a second while the tab
  // is visible, and pause in the background so we don't hammer public RPCs for nothing.
  useEffect(() => {
    if (!detection.balanceToken || !address) return;
    const tick = () => {
      if (document.visibilityState === "visible") {
        refreshBalanceAndAllowance();
        refreshDestBalance();
      }
    };
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [detection.balanceToken, address, refreshBalanceAndAllowance, refreshDestBalance]);

  const amountLD = useMemo(
    () => (detection.decimals != null ? parseAmount(amount, detection.decimals) : 0n),
    [amount, detection.decimals]
  );
  const minAmountLD = useMemo(
    () =>
      detection.decimals != null
        ? computeMinAmountLD(amountLD, detection.decimals, detection.sharedDecimals)
        : 0n,
    [amountLD, detection.decimals, detection.sharedDecimals]
  );

  const needsApproval =
    detection.isAdapter && allowance != null && allowance < amountLD && amountLD > 0n;

  async function ensureSrcNetwork() {
    if (walletChainId !== srcChain.viemChain.id) {
      addLog(`switching wallet to ${srcChain.label}…`, "muted");
      await switchChainAsync({ chainId: srcChain.viemChain.id });
    }
  }

  async function handleQuote() {
    if (!srcPublicClient || !isAddress(tokenAddress) || !recipient || amountLD === 0n) return;
    setBusy(true);
    setStatus("quoting");
    try {
      const sendParam = {
        dstEid: dstChain.eid,
        to: addressToBytes32(recipient as `0x${string}`),
        amountLD,
        minAmountLD,
        extraOptions: DEFAULT_EXTRA_OPTIONS,
        composeMsg: "0x" as const,
        oftCmd: "0x" as const,
      };
      const result = (await srcPublicClient.readContract({
        address: tokenAddress,
        abi: oftAbi,
        functionName: "quoteSend",
        args: [sendParam, false],
      })) as { nativeFee: bigint; lzTokenFee: bigint };
      setQuoteFee(result.nativeFee);
      addLog(`quote ok — native fee ${formatAmount(result.nativeFee, 18)} ${srcChain.viemChain.nativeCurrency.symbol}`, "ok");
      setStatus("idle");
    } catch (e: any) {
      addLog(`quoteSend reverted: ${e?.shortMessage ?? e?.message ?? e}`, "alert");
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!isAddress(tokenAddress) || !detection.balanceToken) return;
    setBusy(true);
    try {
      await ensureSrcNetwork();
      addLog(`approving ${detection.symbol} for ${tokenAddress}…`, "muted");
      const hash = await writeContractAsync({
        address: detection.balanceToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [tokenAddress as `0x${string}`, amountLD],
        chainId: srcChain.viemChain.id,
      });
      addLog(`approve tx sent: ${hash}`, "muted");
      await srcPublicClient!.waitForTransactionReceipt({ hash });
      addLog(`approve confirmed`, "ok");
      await refreshBalanceAndAllowance();
    } catch (e: any) {
      addLog(`approve failed: ${e?.shortMessage ?? e?.message ?? e}`, "alert");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!isAddress(tokenAddress) || !recipient || amountLD === 0n || quoteFee == null) return;
    setBusy(true);
    setStatus("sending");
    try {
      await ensureSrcNetwork();
      const sendParam = {
        dstEid: dstChain.eid,
        to: addressToBytes32(recipient as `0x${string}`),
        amountLD,
        minAmountLD,
        extraOptions: DEFAULT_EXTRA_OPTIONS,
        composeMsg: "0x" as const,
        oftCmd: "0x" as const,
      };
      addLog(`sending ${formatAmount(amountLD, detection.decimals ?? 18)} ${detection.symbol} → ${dstChain.label} (eid ${dstChain.eid})…`, "muted");
      const hash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: oftAbi,
        functionName: "send",
        args: [sendParam, { nativeFee: quoteFee, lzTokenFee: 0n }, address as `0x${string}`],
        value: quoteFee,
        chainId: srcChain.viemChain.id,
      });
      setLastTx(hash);
      addLog(`source tx: ${hash}`, "ok");
      setStatus("in_flight");
      await srcPublicClient!.waitForTransactionReceipt({ hash });
      addLog(`source tx confirmed — tracking on LayerZero Scan: ${layerZeroScanUrl(hash)}`, "muted");

      const final = await pollUntilDelivered(hash, (s) => {
        if (s?.status && s.status !== "UNKNOWN") addLog(`layerzero status: ${s.status}`, "muted");
      });
      if (final?.status === "DELIVERED") {
        setDstTx(final.dstTxHash ?? null);
        setStatus("delivered");
        addLog(`delivered — destination tx: ${final.dstTxHash ?? "(see scan link)"}`, "ok");
        await refreshBalanceAndAllowance();
        await refreshDestBalance();
      } else {
        setStatus("stuck");
        addLog(`still not delivered after polling window — check ${layerZeroScanUrl(hash)}. See the skill's "Stuck packet?" section for DVN/config debugging.`, "alert");
      }
    } catch (e: any) {
      setStatus("error");
      addLog(`send failed: ${e?.shortMessage ?? e?.message ?? e}`, "alert");
    } finally {
      setBusy(false);
    }
  }

  const canQuote = isConnected && detection.isOft && amountLD > 0n && recipient && !busy;
  const canSend = canQuote && quoteFee != null && !needsApproval && !busy;

  return (
    <div className="bridge-card">
      <div className="top-row">
        <div className="eyebrow">OFT Route</div>
        <WalletButton />
      </div>

      <div className="route-row">
        <div className="panel card">
          <ChainSelect label="Source" value={srcKey} onChange={setSrcKey} exclude={dstKey} />
          <div className="balance-row">
            <div className="mono balance-line">
              {detection.decimals != null && balance != null
                ? `balance: ${formatAmount(balance, detection.decimals)} ${detection.symbol}`
                : "balance: —"}
            </div>
            {detection.balanceToken && (
              <button
                className={`refresh-btn ${isRefreshingBalance ? "spinning" : ""}`}
                onClick={refreshBalanceAndAllowance}
                title="Refresh balance now"
                aria-label="Refresh balance"
              >
                ⟳
              </button>
            )}
          </div>
          {balanceUpdatedAt && (
            <div className="mono updated-line">live · updated {new Date(balanceUpdatedAt).toLocaleTimeString()}</div>
          )}
        </div>

        <RouteLine srcColor={srcChain.color} dstColor={dstChain.color} status={status} />

        <div className="panel card">
          <ChainSelect
            label="Destination"
            value={dstKey}
            onChange={setDstKey}
            exclude={srcKey}
            peerStatus={detection.isOft ? peersByEid : undefined}
          />
          <div className="mono balance-line">
            {detection.peerWired === false ? (
              <span style={{ color: "var(--accent-alert)" }}>peer not wired for this eid</span>
            ) : detection.peerWired === true ? (
              <span style={{ color: "var(--accent-verified)" }}>peer wired ✓</span>
            ) : (
              "—"
            )}
          </div>
          {peersLoading && (
            <div className="mono updated-line">scanning {LZ_CHAINS.length - 1} chains for wired peers…</div>
          )}
          {destInfo.decimals != null && destInfo.balance != null && (
            <div className="mono updated-line" style={{ color: "var(--text-muted)", opacity: 1 }}>
              balance: {formatAmount(destInfo.balance, destInfo.decimals)} {destInfo.symbol} · live
            </div>
          )}
        </div>
      </div>

      <div className="fields card">
        <label className="field">
          <span className="eyebrow">Token / OFT / adapter address (on {srcChain.label})</span>
          <input
            className="mono"
            placeholder="0x…"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value.trim())}
          />
        </label>

        {detection.loading && <div className="mono hint">probing contract…</div>}
        {detection.error && <div className="mono hint alert">{detection.error}</div>}

        <div className="field-row">
          <label className="field">
            <span className="eyebrow">Amount</span>
            <input
              className="mono"
              placeholder="0.0"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="eyebrow">Recipient (defaults to your address)</span>
            <input
              className="mono"
              placeholder="0x…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
            />
          </label>
        </div>

        <div className="actions">
          {needsApproval && (
            <button className="btn" disabled={busy} onClick={handleApprove}>
              Approve {detection.symbol}
            </button>
          )}
          <button className="btn" disabled={!canQuote} onClick={handleQuote}>
            Quote
          </button>
          <button className="btn primary" disabled={!canSend} onClick={handleSend}>
            Send
          </button>
        </div>

        {quoteFee != null && (
          <div className="mono hint">
            native fee: {formatAmount(quoteFee, 18)} {srcChain.viemChain.nativeCurrency.symbol} — keep ~2× buffered in wallet
          </div>
        )}
        {lastTx && (
          <div className="mono hint">
            last send:{" "}
            <a href={layerZeroScanUrl(lastTx)} target="_blank" rel="noreferrer">
              {layerZeroScanUrl(lastTx)}
            </a>
            {dstTx && <> — destination tx {dstTx}</>}
          </div>
        )}
      </div>

      <StatusLog lines={logs} />

      <style jsx>{`
        .bridge-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .route-row {
          display: flex;
          align-items: stretch;
          gap: 4px;
        }
        .panel {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .balance-line {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .balance-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .refresh-btn {
          background: transparent;
          border: 1px solid var(--hairline);
          color: var(--text-muted);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: color 0.15s, border-color 0.15s;
        }
        .refresh-btn:hover {
          color: var(--accent-route);
          border-color: var(--accent-route);
        }
        .refresh-btn.spinning {
          color: var(--accent-route);
          animation: spin 0.6s linear infinite;
        }
        .updated-line {
          font-size: 10.5px;
          color: var(--accent-verified);
          opacity: 0.75;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .fields {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-row {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 14px;
        }
        input {
          background: var(--bg-panel-raised);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        input:focus {
          border-color: var(--hairline-strong);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.25);
        }
        .hint {
          font-size: 12px;
          color: var(--text-muted);
        }
        .hint.alert {
          color: var(--accent-alert);
        }
        .hint a {
          color: var(--accent-route);
          text-decoration: none;
        }
        .hint a:hover {
          text-decoration: underline;
        }
        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn {
          background: var(--bg-panel-raised);
          border: 1px solid var(--hairline);
          color: var(--text-primary);
          padding: 10px 18px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
        }
        .btn:hover:not(:disabled) {
          background: var(--hairline-strong);
          border-color: var(--accent-route);
        }
        .btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .btn:disabled {
          opacity: 0.45;
          cursor: default;
        }
        .btn.primary {
          background: linear-gradient(to right, var(--gradient-from), var(--gradient-to));
          border-color: transparent;
          color: #fff;
          box-shadow: 0 10px 15px -3px rgba(6, 182, 212, 0.2), 0 4px 6px -4px rgba(6, 182, 212, 0.2);
        }
        .btn.primary:hover:not(:disabled) {
          background: linear-gradient(to right, var(--gradient-from-hover), var(--gradient-to-hover));
        }
        .btn.primary:disabled {
          background: linear-gradient(to right, var(--accent-idle), var(--hairline-strong));
        }
        @media (max-width: 720px) {
          .route-row {
            flex-direction: column;
          }
          .field-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
