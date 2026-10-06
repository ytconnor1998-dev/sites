import type { Paper } from "@/config/competitions";

/** Serial number printed on the stub, e.g. "No 004999". */
export function serial(n: number) {
  return `No ${String(n).padStart(6, "0")}`;
}

/**
 * A paper raffle ticket: body + perforated stub.
 * "h": stub on the right. "v": stub underneath. "r": underneath on phones, right from 640px.
 * stub = width of a side stub, stubV = height of a bottom stub.
 */
export function Ticket({
  paper,
  stub,
  stubW = "9.5rem",
  stubV = "5.5rem",
  orientation = "r",
  className = "",
  children,
}: {
  paper: Paper | "white";
  stub: React.ReactNode;
  stubW?: string;
  stubV?: string;
  orientation?: "h" | "v" | "r";
  className?: string;
  children: React.ReactNode;
}) {
  const layout = orientation === "h" ? "flex" : orientation === "v" ? "flex flex-col" : "flex flex-col sm:flex-row";
  return (
    <div
      className={`ticket ticket-${orientation} ${paper === "white" ? "" : `paper-${paper}`} ${layout} ${className}`}
      style={{ "--stub": stubW, "--stub-v": stubV } as React.CSSProperties}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <div className={`stub-${orientation} flex shrink-0 flex-col justify-center`}>{stub}</div>
    </div>
  );
}
