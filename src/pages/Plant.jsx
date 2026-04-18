const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null, updateMe: async()=>({}) }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, list:async()=>[], create:async()=>({}), update:async()=>({}), delete:async()=>({}), bulkCreate:async()=>[] }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from "react";

import { getLevelInfo, today } from "@/lib/utils";
import LevelRing from "@/components/LevelRing";
import { Plus, Target, Loader2, Trash2, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LEVEL_MILESTONES = [
  { level: 1, title: "Seedling", emoji: "🌱", points: 0 },
  { level: 2, title: "Sprout", emoji: "🌿", points: 200 },
  { level: 3, title: "Sapling", emoji: "🪴", points: 500 },
  { level: 4, title: "Tree", emoji: "🌴", points: 1000 },
  { level: 5, title: "Grove", emoji: "🌳", points: 2000 },
  { level: 6, title: "Forest", emoji: "🌲", points: 3500 },
  { level: 7, title: "Rainforest", emoji: "🎄", points: 5500 },
  { level: 8, title: "Biome", emoji: "🏞️", points: 8000 },
  { level: 9, title: "Ecosystem", emoji: "🌎", points: 12000 },
  { level: 10, title: "Earth Guardian", emoji: "🌟", points: 18000 },
];

export default function Goals() {
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", category: "water", target_amount: "", period: "weekly", direction: "reduce", unit: "L" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [me, gs, es] = await Promise.all([
      db.auth.me(),
      db.entities.Goal.filter({ active: true }),
      db.entities.LogEntry.list("-entry_date", 200),
    ]);
    setUser(me);
    setGoals(gs);
    setEntries(es);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    await db.entities.Goal.create({ ...form, target_amount: parseFloat(form.target_amount), start_date: today(), active: true });
    setShowForm(false);
    setForm({ title: "", category: "water", target_amount: "", period: "weekly", direction: "reduce", unit: "L" });
    await loadData();
    setSubmitting(false);
  }

  async function deleteGoal(id) {
    await db.entities.Goal.update(id, { active: false });
    setGoals(gs => gs.filter(g => g.id !== id));
  }

  function getGoalProgress(goal) {
    const now = new Date();
    const start = new Date(goal.start_date || goal.created_date);
    const periodDays = goal.period === "weekly" ? 7 : 30;
    const cutoff = new Date(start);
    cutoff.setDate(cutoff.getDate() + periodDays);
    const relevant = entries.filter(e => {
      const d = new Date(e.entry_date);
      return d >= start && d <= cutoff &&
        (goal.category === "recycling"
          ? (e.subtype === "recyclable" || e.subtype === "e-waste")
          : e.category === goal.category);
    });
    const total = relevant.reduce((s, e) => s + (e.amount || 0), 0);
    if (goal.direction === "reduce") {
      const progress = Math.min(100, (1 - total / goal.target_amount) * 100);
      return { total, progress: Math.max(0, progress) };
    } else {
      const progress = Math.min(100, (total / goal.target_amount) * 100);
      return { total, progress };
    }
  }

  const levelInfo = getLevelInfo(user?.lifetime_points || 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-6 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-semibold">Plant</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Set goals to earn seeds.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Level Card */}
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 mb-6">
          <h2 className="font-display text-xl font-semibold mb-5">Your Level</h2>
          <div className="flex gap-6 items-center">
            <LevelRing lifetimePoints={user?.lifetime_points || 0} size={110} />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total XP</p>
              <p className="text-3xl font-bold text-primary">{(user?.lifetime_points || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">redeemable: <strong className="text-foreground">{(user?.points || 0).toLocaleString()} pts</strong></p>
            </div>
          </div>

          {/* Level milestones */}
          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Level Milestones</p>
            {LEVEL_MILESTONES.map(m => {
              const unlocked = (user?.lifetime_points || 0) >= m.points;
              const isCurrent = levelInfo.level === m.level;
              return (
                <div key={m.level} className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                  isCurrent ? "bg-teal-light border border-primary/30" : unlocked ? "opacity-100" : "opacity-40"
                )}>
                  <span className="text-xl">{m.emoji}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.points.toLocaleString()} XP</p>
                  </div>
                  {unlocked && <CheckCircle2 size={18} className="text-primary" />}
                  {isCurrent && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Current</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">My Goals</h2>
          <Button size="sm" onClick={() => setShowForm(v => !v)} className="rounded-xl gap-1.5">
            <Plus size={16} /> New Goal
          </Button>
        </div>

        {/* Goal form */}
        {showForm && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 mb-5 shadow-sm">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Goal Name</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Reduce shower water" required className="rounded-xl h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value, unit: e.target.value === "water" ? "L" : "kg" }))}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="water">💧 Water (L)</option>
                    <option value="waste">🗑️ Waste (kg)</option>
                    <option value="recycling">♻️ Recycling (kg)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Period</label>
                  <select
                    value={form.period}
                    onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Target ({form.unit})
                  </label>
                  <Input type="number" min="0" step="0.1" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} placeholder="e.g. 200" required className="rounded-xl h-11" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Direction</label>
                  <select
                    value={form.direction}
                    onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="reduce">🔻 Reduce</option>
                    <option value="increase">🔺 Increase</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1 rounded-xl">
                  {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Create Goal
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🎯</p>
            <p className="font-medium">No active goals yet</p>
            <p className="text-sm mt-1">Set a goal to challenge yourself!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map(goal => {
              const { total, progress } = getGoalProgress(goal);
              const isReduce = goal.direction === "reduce";
              return (
                <div key={goal.id} className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{goal.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{goal.period} · {goal.direction === "reduce" ? "keep below" : "reach"} {goal.target_amount} {goal.unit}</p>
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{total.toFixed(1)} {goal.unit} logged</span>
                      <span className="font-medium text-primary">{Math.round(progress)}%</span>
                    </div>
                    <div className="bg-muted rounded-full h-2.5">
                      <div
                        className={cn("h-2.5 rounded-full transition-all duration-700", progress >= 80 ? "bg-green-500" : progress >= 40 ? "bg-primary" : "bg-amber-500")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {isReduce && total > goal.target_amount && (
                      <p className="text-xs text-destructive">Over target by {(total - goal.target_amount).toFixed(1)} {goal.unit}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}