import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhaseTimeline } from "@/components/PhaseTimeline";
import { LogConsole } from "@/components/LogConsole";
import { Campaign, type LogEntry, type SMMConfig } from "@/lib/smm-engine";
import { Play, Square, Zap, Link2, Key, Settings2, Wallet } from "lucide-react";
import { smmApiCall } from "@/lib/smm-api";

export default function Index() {
  const [apiUrl, setApiUrl] = useState("https://smmsocialmedia.in/api/v2");
  const [apiKey, setApiKey] = useState("0a2b5a4e61c68e02e81c9b8127d4b68d");
  const [linksText, setLinksText] = useState("");
  const [viewsId, setViewsId] = useState("5245");
  const [likesId, setLikesId] = useState("5392");
  const [sharesId, setSharesId] = useState("4436");
  const [savesId, setSavesId] = useState("287");
  const [repostId, setRepostId] = useState("5361");

  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentPhase, setCurrentPhase] = useState("");
  const [elapsedHours, setElapsedHours] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const campaignRef = useRef<Campaign | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const checkBalance = useCallback(async () => {
    if (!apiKey || !apiUrl) return;
    setBalanceLoading(true);
    try {
      const data = await smmApiCall(apiUrl, apiKey, "balance");
      setBalance(data.balance != null ? `${data.balance} ${data.currency ?? ""}`.trim() : JSON.stringify(data));
    } catch (err: any) {
      setBalance("Error: " + err.message);
    }
    setBalanceLoading(false);
  }, [apiKey, apiUrl]);

  const handleStart = useCallback(() => {
    const links = linksText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!apiKey || links.length === 0) return;

    const config: SMMConfig = {
      apiUrl,
      apiKey,
      links,
      serviceIds: {
        views: viewsId,
        likes: likesId,
        shares: sharesId,
        saves: savesId,
        repost: repostId,
      },
    };

    setLogs([]);
    setRunning(true);
    setTotalOrders(0);
    setCurrentPhase("Warm Start");
    setElapsedHours(0);

    const campaign = new Campaign(config, {
      onLog: (entry) => setLogs((prev) => [...prev, entry]),
      onPhaseChange: (phase, hours) => {
        setCurrentPhase(phase);
        setElapsedHours(hours);
      },
      onProgress: (hours, orders) => {
        setElapsedHours(hours);
        setTotalOrders(orders);
      },
      onComplete: () => setRunning(false),
    });

    campaignRef.current = campaign;
    campaign.run();
  }, [apiUrl, apiKey, linksText, viewsId, likesId, sharesId, savesId, repostId]);

  const handleStop = useCallback(() => {
    campaignRef.current?.abort();
    setRunning(false);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SMM Growth Engine</h1>
            <p className="text-sm text-muted-foreground">12-hour organic growth automation</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {balance !== null && (
              <span className="text-sm font-mono text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
                💰 {balance}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={checkBalance} disabled={balanceLoading || !apiKey} className="gap-2">
              <Wallet className="w-4 h-4" />
              {balanceLoading ? "Checking..." : "Check Balance"}
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        {running && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Phase", value: currentPhase },
              { label: "Elapsed", value: `${elapsedHours.toFixed(1)}h` },
              { label: "Orders Sent", value: totalOrders },
            ].map((s) => (
              <Card key={s.label} className="border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">{s.label}</div>
                  <div className="text-xl font-bold text-primary mt-1">{s.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Phase timeline */}
        {running && (
          <Card className="border-border">
            <CardContent className="p-4">
              <PhaseTimeline currentPhase={currentPhase} elapsedHours={elapsedHours} />
            </CardContent>
          </Card>
        )}

        {/* Config section */}
        {!running && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" /> API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">API URL</label>
                  <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
                  <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Your API key" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" /> Service IDs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Views", value: viewsId, set: setViewsId },
                  { label: "Likes", value: likesId, set: setLikesId },
                  { label: "Shares", value: sharesId, set: setSharesId },
                  { label: "Saves", value: savesId, set: setSavesId },
                  { label: "Repost", value: repostId, set: setRepostId },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground w-14 shrink-0">{s.label}</label>
                    <Input className="h-8 text-xs" value={s.value} onChange={(e) => s.set(e.target.value)} placeholder="Service ID" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" /> Instagram Reel Links
                </CardTitle>
                <CardDescription>One link per line</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full h-28 bg-muted/50 border border-border rounded-lg p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={linksText}
                  onChange={(e) => setLinksText(e.target.value)}
                  placeholder={"https://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/reel/DEF456/"}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action button */}
        <div className="flex justify-center">
          {!running ? (
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!apiKey || !linksText.trim()}
              className="gap-2 px-8"
            >
              <Play className="w-4 h-4" /> Launch 12h Campaign
            </Button>
          ) : (
            <Button size="lg" variant="destructive" onClick={handleStop} className="gap-2 px-8">
              <Square className="w-4 h-4" /> Stop Campaign
            </Button>
          )}
        </div>

        {/* Log console */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <LogConsole logs={logs} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
