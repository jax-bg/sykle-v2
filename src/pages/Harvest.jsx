const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null, updateMe: async()=>({}) }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, list:async()=>[], create:async()=>({}), update:async()=>({}), delete:async()=>({}), bulkCreate:async()=>[] }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from "react";

import { Star, Gift, CheckCircle2, Loader2, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_REWARDS = [
  { title: "Carrefour AED 25 Voucher", description: "Shop sustainably at Carrefour hypermarkets across the UAE", partner: "Carrefour", points_cost: 200, category: "voucher", emoji: "🛒", featured: true, stock: 50 },
  { title: "ADNOC Fuel Discount – 5L Free", description: "Redeem for 5 free litres of petrol at any ADNOC station", partner: "ADNOC", points_cost: 350, category: "voucher", emoji: "⛽", featured: true, stock: 30 },
  { title: "Plant a Tree in UAE", description: "We'll plant a native ghaf tree on your behalf in Abu Dhabi", partner: "EAD", points_cost: 150, category: "donation", emoji: "🌳", featured: true, stock: 200 },
  { title: "Noon AED 50 Gift Card", description: "Shop eco-friendly products on Noon.com", partner: "Noon", points_cost: 400, category: "voucher", emoji: "🛍️", featured: false, stock: 40 },
  { title: "Masdar City Eco Tour", description: "Free guided tour of Masdar City for 2 people", partner: "Masdar", points_cost: 600, category: "experience", emoji: "🏙️", featured: false, stock: 20 },
  { title: "Emirates NBD Green Cashback", description: "AED 30 cashback on your Emirates NBD Green Card", partner: "Emirates NBD", points_cost: 250, category: "discount", emoji: "💳", featured: false, stock: 100 },
  { title: "Spinneys 10% Off", description: "10% off your next grocery shop at Spinneys", partner: "Spinneys", points_cost: 180, category: "discount", emoji: "🥦", featured: false, stock: 80 },
  { title: "5 Mangrove Saplings Planted", description: "Support mangrove restoration along the UAE coast", partner: "Emirates Nature-WWF", points_cost: 300, category: "donation", emoji: "🌿", featured: false, stock: 500 },
  { title: "Al Ain Zoo Eco Pass", description: "Free entry to Al Ain Zoo (worth AED 60)", partner: "Al Ain Zoo", points_cost: 450, category: "experience", emoji: "🦒", featured: false, stock: 25 },
  { title: "Desert Cleanup Adventure", description: "Join an organized desert cleanup in Ras Al Khaimah", partner: "Go Clean UAE", points_cost: 100, category: "experience", emoji: "🏜️", featured: false, stock: 100 },
];

const CATEGORY_LABELS = { voucher: "Voucher", donation: "Donate", experience: "Experience", discount: "Discount" };
const CATEGORY_COLORS = {
  voucher: "bg-blue-50 text-blue-700 border-blue-200",
  donation: "bg-green-50 text-green-700 border-green-200",
  experience: "bg-purple-50 text-purple-700 border-purple-200",
  discount: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function Rewards() {
  const [user, setUser] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [redeemed, setRedeemed] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [tab, setTab] = useState("browse");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    let [me, rws, reds] = await Promise.all([
      db.auth.me(),
      db.entities.Reward.list(),
      db.entities.Redemption.list("-created_date", 50),
    ]);
    if (rws.length === 0) {
      await db.entities.Reward.bulkCreate(DEFAULT_REWARDS);
      rws = await db.entities.Reward.list();
    }
    setUser(me);
    setRewards(rws);
    setRedemptions(reds);
    setLoading(false);
  }

  async function handleRedeem(reward) {
    if ((user?.points || 0) < reward.points_cost) return;
    setRedeeming(reward.id);
    const code = `ECO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await db.entities.Redemption.create({
      reward_id: reward.id,
      reward_title: reward.title,
      points_spent: reward.points_cost,
      code,
    });
    const newPoints = (user?.points || 0) - reward.points_cost;
    await db.auth.updateMe({ points: newPoints });
    setUser(u => ({ ...u, points: newPoints }));
    setRedeemed({ ...reward, code });
    setRedeeming(null);
    await loadData();
  }

  const featured = rewards.filter(r => r.featured);
  const filtered = rewards.filter(r => filterCat === "all" || r.category === filterCat);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[hsl(40,60%,35%)] to-[hsl(30,70%,28%)] text-white px-6 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-semibold">Harvest</h1>
          <p className="text-white/60 text-sm mt-1">Give your seeds and reap your rewards.</p>
          <div className="flex items-center gap-2 mt-4 bg-white/15 backdrop-blur rounded-2xl px-4 py-3 w-fit">
            <Star size={18} className="text-gold fill-gold" />
            <span className="font-bold text-xl">{(user?.points || 0).toLocaleString()}</span>
            <span className="text-white/70 text-sm">seeds available</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-muted p-1 rounded-xl">
          {["browse", "history"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize",
                tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "browse" ? "🎁 Browse" : "🕐 History"}
            </button>
          ))}
        </div>

        {tab === "browse" ? (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <div className="mb-6">
                <h2 className="font-display text-xl font-semibold mb-3">Featured</h2>
                <div className="space-y-3">
                  {featured.map(reward => (
                    <RewardCard key={reward.id} reward={reward} userPoints={user?.points || 0} onRedeem={handleRedeem} redeeming={redeeming} />
                  ))}
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {["all", "voucher", "donation", "experience", "discount"].map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCat(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize",
                    filterCat === c ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {c === "all" ? "All" : CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filtered.map(reward => (
                <RewardCard key={reward.id} reward={reward} userPoints={user?.points || 0} onRedeem={handleRedeem} redeeming={redeeming} />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {redemptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-4xl mb-3">🎫</p>
                <p className="font-medium">No redemptions yet</p>
                <p className="text-sm mt-1">Browse rewards to use your points!</p>
              </div>
            ) : redemptions.map(r => (
              <div key={r.id} className="bg-card border border-border/60 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Gift size={20} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{r.reward_title}</p>
                    <p className="text-xs text-muted-foreground">Code: <span className="font-mono font-bold text-primary">{r.code}</span></p>
                  </div>
                  <p className="text-sm font-bold text-destructive">-{r.points_spent} pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redemption success modal */}
      {redeemed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setRedeemed(null)}>
          <div className="bg-card rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-pop-in text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">{redeemed.emoji}</div>
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            <h3 className="font-display text-xl font-semibold mb-1">Redeemed!</h3>
            <p className="text-muted-foreground text-sm mb-4">{redeemed.title}</p>
            <div className="bg-muted rounded-2xl px-6 py-4 mb-6">
              <p className="text-xs text-muted-foreground mb-1">Your Code</p>
              <p className="text-2xl font-mono font-bold text-primary tracking-widest">{redeemed.code}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Present this code to {redeemed.partner} to claim your reward.</p>
            <Button onClick={() => setRedeemed(null)} className="w-full rounded-xl">Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RewardCard({ reward, userPoints, onRedeem, redeeming }) {
  const canAfford = userPoints >= reward.points_cost;
  const isRedeeming = redeeming === reward.id;

  return (
    <div className={cn(
      "bg-card border rounded-2xl p-5 shadow-sm transition-all",
      reward.featured ? "border-gold/40 bg-gradient-to-br from-amber-50/50 to-card" : "border-border/60"
    )}>
      <div className="flex items-start gap-4">
        <div className="text-3xl mt-0.5">{reward.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm leading-tight">{reward.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{reward.partner}</p>
            </div>
            <span className={cn("text-[10px] px-2 py-1 rounded-lg border font-medium whitespace-nowrap", CATEGORY_COLORS[reward.category])}>
              {CATEGORY_LABELS[reward.category]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{reward.description}</p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1">
              <Star size={14} className="text-gold fill-gold" />
              <span className="font-bold text-sm">{reward.points_cost.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
            <Button
              size="sm"
              disabled={!canAfford || isRedeeming}
              onClick={() => onRedeem(reward)}
              className={cn("rounded-xl text-xs h-8", !canAfford && "opacity-50")}
            >
              {isRedeeming ? <Loader2 size={14} className="animate-spin" /> : canAfford ? "Redeem" : "Not enough pts"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}