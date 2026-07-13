export type LzMessageStatus = {
  status: string;
  srcTxHash?: string;
  dstTxHash?: string;
  raw?: unknown;
};

// GET https://scan.layerzero-api.com/v1/messages/tx/<hash> — public LayerZero Scan API.
export async function fetchLzMessageStatus(sourceTxHash: string): Promise<LzMessageStatus | null> {
  try {
    const res = await fetch(`https://scan.layerzero-api.com/v1/messages/tx/${sourceTxHash}`);
    if (!res.ok) return null;
    const data = await res.json();
    const msg = data?.data?.[0];
    if (!msg) return null;
    return {
      status: msg?.status?.name ?? "UNKNOWN",
      srcTxHash: msg?.source?.tx?.txHash,
      dstTxHash: msg?.destination?.tx?.txHash,
      raw: msg,
    };
  } catch {
    return null;
  }
}

export function layerZeroScanUrl(sourceTxHash: string) {
  return `https://layerzeroscan.com/tx/${sourceTxHash}`;
}

// Poll every `intervalMs` until DELIVERED or `timeoutMs` elapses. Calls onUpdate on each poll.
export async function pollUntilDelivered(
  sourceTxHash: string,
  onUpdate: (status: LzMessageStatus | null) => void,
  { intervalMs = 5000, timeoutMs = 6 * 60 * 1000 }: { intervalMs?: number; timeoutMs?: number } = {}
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await fetchLzMessageStatus(sourceTxHash);
    onUpdate(status);
    if (status?.status === "DELIVERED") return status;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}
