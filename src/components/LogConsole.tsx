import { useRef, useEffect } from "react";
import type { LogEntry } from "@/lib/smm-engine";

const statusIcon: Record<string, string> = {
  pending: "⏳",
  success: "✅",
  error: "❌",
};

export function LogConsole({ logs }: { logs: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4 h-72 overflow-y-auto font-mono text-xs space-y-1">
      {logs.length === 0 && (
        <div className="text-muted-foreground text-center py-8">
          Waiting for campaign to start...
        </div>
      )}
      {logs.map((log, i) => (
        <div key={i} className={`flex gap-2 ${log.status === "error" ? "text-destructive" : "text-foreground/80"}`}>
          <span className="text-muted-foreground shrink-0">[{log.time}]</span>
          <span className="text-phase-steady shrink-0">[{log.phase}]</span>
          <span className="text-info shrink-0">Link {log.link}</span>
          <span>{statusIcon[log.status]}</span>
          <span>{log.type}: {log.quantity}</span>
          {log.response && log.status !== "pending" && (
            <span className="text-muted-foreground truncate max-w-[200px]">→ {log.response}</span>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
