// SMM Automation Engine - runs entirely in the browser
import { smmApiCall } from "@/lib/smm-api";

export interface SMMConfig {
  apiUrl: string;
  apiKey: string;
  links: string[];
  serviceIds: {
    views: string;
    likes: string;
    shares: string;
    saves: string;
    repost: string;
  };
}

export interface LogEntry {
  time: string;
  phase: string;
  link: number;
  type: string;
  quantity: number;
  status: "pending" | "success" | "error";
  response?: string;
}

export type PhaseInfo = {
  name: string;
  startHour: number;
  endHour: number;
  intervalMin: [number, number];
  views: [number, number];
  likes: [number, number];
  shares: [number, number];
  saves: [number, number];
  repost: [number, number] | null;
};

export const PHASES: PhaseInfo[] = [
  {
    name: "Warm Start",
    startHour: 0, endHour: 1,
    intervalMin: [15, 20],
    views: [100, 130], likes: [4, 7], shares: [1, 1], saves: [1, 1], repost: [1, 1],
  },
  {
    name: "Steady Growth",
    startHour: 1, endHour: 6,
    intervalMin: [16, 22],
    views: [100, 120], likes: [5, 10], shares: [1, 2], saves: [2, 4], repost: [0, 1],
  },
  {
    name: "Peak Growth",
    startHour: 6, endHour: 9,
    intervalMin: [12, 18],
    views: [140, 160], likes: [8, 15], shares: [2, 3], saves: [3, 5], repost: [1, 1],
  },
  {
    name: "Decay",
    startHour: 9, endHour: 12,
    intervalMin: [20, 30],
    views: [90, 110], likes: [3, 7], shares: [1, 1], saves: [1, 2], repost: null,
  },
];

export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getPhase(elapsedHours: number): PhaseInfo | null {
  return PHASES.find((p) => elapsedHours >= p.startHour && elapsedHours < p.endHour) ?? null;
}

async function sendOrder(config: SMMConfig, serviceId: string, link: string, quantity: number) {
  const body = new URLSearchParams({
    key: config.apiKey,
    action: "add",
    service: serviceId,
    link,
    quantity: String(quantity),
  });

  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  return res.json();
}

export type CampaignCallbacks = {
  onLog: (entry: LogEntry) => void;
  onPhaseChange: (phase: string, elapsedHours: number) => void;
  onProgress: (elapsedHours: number, totalOrders: number) => void;
  onComplete: () => void;
};

export class Campaign {
  private aborted = false;
  private startTime = 0;
  totalOrders = 0;

  constructor(private config: SMMConfig, private cb: CampaignCallbacks) {}

  abort() {
    this.aborted = true;
  }

  private elapsed() {
    return ((Date.now() - this.startTime) / 60000).toFixed(1) + "m";
  }

  private elapsedHours() {
    return (Date.now() - this.startTime) / 3600000;
  }

  async run() {
    this.startTime = Date.now();
    this.aborted = false;
    this.totalOrders = 0;

    while (!this.aborted) {
      const hours = this.elapsedHours();
      if (hours >= 12) break;

      const phase = getPhase(hours);
      if (!phase) break;

      this.cb.onPhaseChange(phase.name, hours);

      for (let i = 0; i < this.config.links.length; i++) {
        if (this.aborted) return;
        if (i > 0) await sleep(rand(2000, 5000));
        await this.processLink(this.config.links[i], i, phase);
      }

      this.cb.onProgress(this.elapsedHours(), this.totalOrders);

      const interval = rand(phase.intervalMin[0], phase.intervalMin[1]) * 60000;
      const jitter = interval * 0.1;
      const wait = interval + rand(-jitter, jitter);

      // Wait in small chunks so we can abort
      const end = Date.now() + wait;
      while (Date.now() < end && !this.aborted) {
        await sleep(1000);
      }
    }

    this.cb.onComplete();
  }

  private async processLink(link: string, idx: number, phase: PhaseInfo) {
    const types: { key: keyof SMMConfig["serviceIds"]; label: string; range: [number, number] | null }[] = [
      { key: "views", label: "👁 Views", range: phase.views },
      { key: "likes", label: "❤️ Likes", range: phase.likes },
      { key: "shares", label: "🔗 Shares", range: phase.shares },
      { key: "saves", label: "🔖 Saves", range: phase.saves },
      { key: "repost", label: "🔁 Repost", range: phase.repost },
    ];

    for (const t of types) {
      if (this.aborted) return;
      if (!t.range) continue;
      let qty = rand(t.range[0], t.range[1]);
      // Enforce minimums for shares and repost
      if (t.key === "shares" || t.key === "repost") qty = Math.max(1, qty);
      if (qty <= 0) continue;
      if (qty <= 0) continue;

      const entry: LogEntry = {
        time: this.elapsed(),
        phase: phase.name,
        link: idx + 1,
        type: t.label,
        quantity: qty,
        status: "pending",
      };
      this.cb.onLog({ ...entry });

      try {
        const res = await sendOrder(this.config, this.config.serviceIds[t.key], link, qty);
        entry.status = "success";
        entry.response = JSON.stringify(res);
        this.totalOrders++;
      } catch (err: any) {
        entry.status = "error";
        entry.response = err.message;
      }

      this.cb.onLog({ ...entry });
      await sleep(rand(1000, 3000));
    }
  }
}
