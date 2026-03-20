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
  return smmApiCall(config.apiUrl, config.apiKey, "add", { service: serviceId, link, quantity });
}

export interface TrackedLink {
  url: string;
  addedAt: number; // timestamp when added
  nextProcessAt: number; // timestamp for next processing
  completed: boolean;
}

export type CampaignCallbacks = {
  onLog: (entry: LogEntry) => void;
  onPhaseChange: (phase: string, elapsedHours: number) => void;
  onProgress: (elapsedHours: number, totalOrders: number) => void;
  onComplete: () => void;
  onLinksUpdate: (links: TrackedLink[]) => void;
};

export class Campaign {
  private aborted = false;
  private campaignStart = 0;
  private trackedLinks: TrackedLink[] = [];
  totalOrders = 0;

  constructor(private config: SMMConfig, private cb: CampaignCallbacks) {}

  abort() {
    this.aborted = true;
  }

  addLinks(newLinks: string[]) {
    const now = Date.now();
    const existingUrls = new Set(this.trackedLinks.map((t) => t.url));
    const unique = newLinks.filter((l) => !existingUrls.has(l));
    for (const url of unique) {
      this.trackedLinks.push({
        url,
        addedAt: now,
        nextProcessAt: now,
        completed: false,
      });
    }
    this.cb.onLinksUpdate([...this.trackedLinks]);
    return unique.length;
  }

  getLinks() {
    return this.trackedLinks.map((t) => t.url);
  }

  getTrackedLinks() {
    return [...this.trackedLinks];
  }

  /** Returns seconds until the next order, or 0 if processing now */
  getSecondsToNextOrder(): number {
    const active = this.trackedLinks.filter((t) => !t.completed);
    if (active.length === 0) return 0;
    const nearest = Math.min(...active.map((t) => t.nextProcessAt));
    return Math.max(0, Math.ceil((nearest - Date.now()) / 1000));
  }

  private linkElapsedHours(link: TrackedLink) {
    return (Date.now() - link.addedAt) / 3600000;
  }

  private formatElapsed(link: TrackedLink) {
    return ((Date.now() - link.addedAt) / 60000).toFixed(1) + "m";
  }

  async run() {
    this.campaignStart = Date.now();
    this.aborted = false;
    this.totalOrders = 0;

    // Initialize tracked links from config
    const now = Date.now();
    for (const url of this.config.links) {
      this.trackedLinks.push({
        url,
        addedAt: now,
        nextProcessAt: now,
        completed: false,
      });
    }
    this.cb.onLinksUpdate([...this.trackedLinks]);

    while (!this.aborted) {
      const activeLinks = this.trackedLinks.filter((t) => !t.completed);
      if (activeLinks.length === 0) break;

      // Find the link that needs processing soonest
      const nowTs = Date.now();
      const ready = activeLinks.filter((t) => t.nextProcessAt <= nowTs);

      if (ready.length === 0) {
        // Wait for the next link to be ready
        await sleep(1000);
        continue;
      }

      for (const tracked of ready) {
        if (this.aborted) return;

        const hours = this.linkElapsedHours(tracked);
        if (hours >= 12) {
          tracked.completed = true;
          this.cb.onLinksUpdate([...this.trackedLinks]);
          continue;
        }

        const phase = getPhase(hours);
        if (!phase) {
          tracked.completed = true;
          this.cb.onLinksUpdate([...this.trackedLinks]);
          continue;
        }

        const linkIdx = this.trackedLinks.indexOf(tracked);
        this.cb.onPhaseChange(phase.name, hours);

        await this.processLink(tracked, linkIdx, phase);

        // Schedule next processing for this link
        const interval = rand(phase.intervalMin[0], phase.intervalMin[1]) * 60000;
        const jitter = interval * 0.1;
        tracked.nextProcessAt = Date.now() + interval + rand(-jitter, jitter);

        this.cb.onProgress(
          (Date.now() - this.campaignStart) / 3600000,
          this.totalOrders
        );

        // Small delay between processing different links
        if (ready.indexOf(tracked) < ready.length - 1) {
          await sleep(rand(2000, 5000));
        }
      }
    }

    this.cb.onComplete();
  }

  private async processLink(tracked: TrackedLink, idx: number, phase: PhaseInfo) {
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
      if (t.key === "shares" || t.key === "repost") qty = Math.max(1, qty);
      if (qty <= 0) continue;

      const entry: LogEntry = {
        time: this.formatElapsed(tracked),
        phase: phase.name,
        link: idx + 1,
        type: t.label,
        quantity: qty,
        status: "pending",
      };
      this.cb.onLog({ ...entry });

      try {
        const res = await sendOrder(this.config, this.config.serviceIds[t.key], tracked.url, qty);
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
