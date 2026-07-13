"use client";

export type RouteStatus = "idle" | "quoting" | "sending" | "in_flight" | "delivered" | "stuck" | "error";

const STATUS_COLOR: Record<RouteStatus, string> = {
  idle: "var(--accent-idle)",
  quoting: "var(--accent-route)",
  sending: "var(--accent-route)",
  in_flight: "var(--accent-route)",
  delivered: "var(--accent-verified)",
  stuck: "var(--accent-alert)",
  error: "var(--accent-alert)",
};

const STATUS_LABEL: Record<RouteStatus, string> = {
  idle: "idle",
  quoting: "quoting…",
  sending: "awaiting signature…",
  in_flight: "packet in flight",
  delivered: "delivered",
  stuck: "stuck — see log",
  error: "error",
};

export function RouteLine({
  srcColor,
  dstColor,
  status,
}: {
  srcColor: string;
  dstColor: string;
  status: RouteStatus;
}) {
  const color = STATUS_COLOR[status];
  const animated = status === "sending" || status === "in_flight" || status === "quoting";

  return (
    <div className="route-line">
      <svg viewBox="0 0 240 40" preserveAspectRatio="none" className="route-svg">
        <line x1="6" y1="20" x2="234" y2="20" stroke="var(--hairline)" strokeWidth="2" />
        <line
          x1="6"
          y1="20"
          x2="234"
          y2="20"
          stroke={color}
          strokeWidth="2"
          strokeDasharray="6 6"
          style={animated ? { animation: "dash-flow 1s linear infinite" } : undefined}
          opacity={status === "idle" ? 0 : 1}
        />
        <circle cx="6" cy="20" r="5" fill={srcColor} />
        <circle cx="234" cy="20" r="5" fill={dstColor} />
        {(status === "delivered" || status === "stuck") && (
          <circle cx="234" cy="20" r="9" fill="none" stroke={color} strokeWidth="1.5" />
        )}
      </svg>
      <span className="mono route-label" style={{ color }}>
        {STATUS_LABEL[status]}
      </span>
      <style jsx>{`
        .route-line {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 0 8px;
          min-width: 120px;
        }
        .route-svg {
          width: 100%;
          height: 24px;
        }
        .route-label {
          font-size: 11px;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
