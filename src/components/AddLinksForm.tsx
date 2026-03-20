import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Link2 } from "lucide-react";
import { toast } from "sonner";

interface AddLinksFormProps {
  onAddLinks: (links: string[]) => number;
  currentLinks: string[];
}

export function AddLinksForm({ onAddLinks, currentLinks }: AddLinksFormProps) {
  const [newLinksText, setNewLinksText] = useState("");

  const handleAdd = () => {
    const links = newLinksText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (links.length === 0) return;

    const added = onAddLinks(links);
    if (added > 0) {
      toast.success(`${added} new reel(s) added to campaign`);
      setNewLinksText("");
    } else {
      toast.info("These links are already in the campaign");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" /> Add More Reels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Currently processing <span className="font-bold text-primary">{currentLinks.length}</span> reel(s)
        </div>
        <div className="space-y-1">
          {currentLinks.map((link, i) => (
            <div key={i} className="text-xs font-mono text-muted-foreground truncate flex items-center gap-1.5">
              <span className="text-primary">#{i + 1}</span> {link}
            </div>
          ))}
        </div>
        <textarea
          className="w-full h-20 bg-muted/50 border border-border rounded-lg p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          value={newLinksText}
          onChange={(e) => setNewLinksText(e.target.value)}
          placeholder="Paste new reel links here (one per line)"
        />
        <Button size="sm" onClick={handleAdd} disabled={!newLinksText.trim()} className="gap-2">
          <Plus className="w-4 h-4" /> Add to Campaign
        </Button>
      </CardContent>
    </Card>
  );
}
