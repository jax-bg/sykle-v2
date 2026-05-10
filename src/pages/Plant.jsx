import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

import { getLevelInfo, LOG_CATEGORIES, WASTE_TYPES, WATER_TYPES } from "@/lib/utils";
import LevelRing from "@/components/LevelRing";
import { Plus, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LEVEL_MILESTONES = [
  { level: 1, title: "Seedling", emoji: "🌱", points: 0 },
  { level: 2, title: "Sprout", emoji: "🌿", points: 200 },
  { level: 3, title: "Sapling", emoji: "🪴", points: 600 },
  { level: 4, title: "Tree", emoji: "🌴", points: 1400 },
  { level: 5, title: "Grove", emoji: "🌳", points: 3000 },
  { level: 6, title: "Forest", emoji: "🌲", points: 6200 },
  { level: 7, title: "Rainforest", emoji: "🎄", points: 12600 },
  { level: 8, title: "Biome", emoji: "🏞️", points: 25400 },
  { level: 9, title: "Ecosystem", emoji: "🌎", points: 51000 },
  { level: 10, title: "Earth Guardian", emoji: "🌟", points: 100000 },
];

export default function Goals() {
  const { profile, isLoadingAuth, authChecked } = useAuth();
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [form, setForm] = useState({ 
    category: "water", 
    subtype: "shower", 
    title: "", 
    target_value: "" 
  });

  useEffect(() => {
    if (!isLoadingAuth && authChecked) {
      loadData();
    }
  }, [isLoadingAuth, authChecked, profile]);

  async function loadData() {
    setLoading(true);
    const userId = profile?.id;
    if (!userId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const { data: goalsData, error: goalsError } = await supabase
      .from('Goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false);

    if (goalsError) {
      console.error('Failed to load goals:', goalsError);
      setGoals([]);
    } else {
      setGoals(goalsData || []);
    }

    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    const userId = profile?.id;
    if (!userId) {
      setFormError('You must be signed in to create a goal.');
      setSubmitting(false);
      return;
    }

    const targetAmount = parseFloat(form.target_value);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setFormError('Please enter a valid target value.');
      setSubmitting(false);
      return;
    }

    const subtypeLabel = WASTE_TYPES.concat(WATER_TYPES).find(t => t.value === form.subtype)?.label || form.subtype;
    const categoryLabel = LOG_CATEGORIES.find(c => c.value === form.category)?.label || form.category;
    const goalTitle = form.title.trim() || `${subtypeLabel} ${categoryLabel}`;

    const { data, error } = await supabase.from('Goals').insert([
      {
        user_id: userId,
        title: goalTitle,
        category: form.category,
        subtype: form.subtype,
        target_value: targetAmount,
        current_value: 0,
        is_completed: false,
      }
    ]).select();

    if (error) {
      setFormError(error.message || 'Failed to create goal.');
      setSubmitting(false);
      return;
    }

    setFormSuccess('Goal created successfully!');
    setShowForm(false);
    setForm({ category: "water", subtype: "shower", title: "", target_value: "" });
    await loadData();
    setSubmitting(false);
  }

  async function deleteGoal(id) {
    const { error } = await supabase.from('Goals').update({ is_completed: true }).eq('id', id);
    if (error) {
      console.error('Failed to delete goal:', error);
      return;
    }
    setGoals(gs => gs.filter(g => g.id !== id));
  }

  function getGoalProgress(goal) {
    const current = goal.current_value || 0;
    const target = goal.target_value || 1;
    const progress = Math.min(100, (current / target) * 100);
    return { total: current, progress };
  }

  const levelInfo = getLevelInfo(profile?.lifetime_points || 0);

  const currentUnit = form.category === "water" ? "L" : "kg";

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-5 sm:px-6 pt-8 sm:pt-10 pb-6 sm:pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Plant</h1>
          <p className="text-primary-foreground/60 text-xs sm:text-sm mt-1">Set goals to earn seeds.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Level Progress Card[cite: 2] */}
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
            <div className="flex items-center gap-4 sm:gap-8">
              <div className="flex-shrink-0 scale-90 sm:scale-100">
                <LevelRing 
                  lifetimePoints={profile?.lifetime_points || 0} 
                  size={120} 
                />
              </div>
              <div className="flex-1">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mb-0.5">Current Stage</p>
                <h2 className="font-display text-2xl sm:text-4xl font-bold text-primary leading-tight">{levelInfo.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm sm:text-lg font-black text-foreground">{(profile?.lifetime_points || 0).toLocaleString()}</span>
                  <span className="text-[9px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Total XP</span>
                </div>
              </div>
            </div>
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-10">
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Redeemable Seeds</span>
                <p className="text-2xl sm:text-3xl font-black text-gold">{(profile?.points || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">Growth Journey</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {LEVEL_MILESTONES.slice(0, 10).map(m => {
                const unlocked = (profile?.lifetime_points || 0) >= m.points;
                const isCurrent = levelInfo.level === m.level;
                return (
                  <div key={m.level} className={cn(
                    "flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border transition-all",
                    isCurrent ? "bg-primary/5 border-primary/30 shadow-sm" : unlocked ? "bg-background border-border/60" : "bg-muted/30 border-transparent opacity-50"
                  )}>
                    <span className="text-xl sm:text-2xl">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[11px] sm:text-sm font-bold truncate", isCurrent ? "text-primary" : "text-foreground")}>{m.title}</p>
                      <p className="text-[8px] sm:text-[10px] text-muted-foreground font-medium">{m.points >= 1000 ? `${(m.points / 1000).toFixed(1)}k` : m.points} XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg sm:text-xl font-semibold">My Goals</h2>
          <Button
            size="sm"
            onClick={() => { setShowForm(v => !v); setFormError(null); setFormSuccess(null); }}
            className="rounded-xl gap-1 h-9 px-3 text-xs sm:text-sm"
          >
            <Plus size={14} /> New Goal
          </Button>
        </div>

        {/* Enhanced Goal Form[cite: 2, 3] */}
        {showForm && (
          <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-6 mb-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LOG_CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: cat.value, subtype: cat.value === 'water' ? 'shower' : 'recyclable' }))}
                        className={cn(
                          "flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-xs sm:text-sm border transition-all",
                          form.category === cat.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent text-muted-foreground"
                        )}
                      >
                        <span>{cat.emoji}</span> {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(form.category === 'water' ? WATER_TYPES : WASTE_TYPES).map(typeOption => (
                      <button
                        key={typeOption.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, subtype: typeOption.value }))}
                        className={cn(
                          "flex items-center gap-2 px-3 py-3 rounded-xl text-xs sm:text-sm border transition-all",
                          form.subtype === typeOption.value ? "bg-teal-light border-primary text-primary font-medium" : "border-border bg-background text-foreground"
                        )}
                      >
                        <span>{typeOption.emoji}</span> {typeOption.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Goal Title</label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Weekly Savings"
                    required
                    className="rounded-xl h-11 text-sm bg-muted/30 border-border/40 focus:bg-background transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Target Amount</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.target_value}
                      onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
                      placeholder="0.0"
                      required
                      className="rounded-xl h-11 text-sm bg-muted/30 border-border/40 focus:bg-background pr-12 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary uppercase">
                      {currentUnit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="flex-1 rounded-xl h-11 text-xs sm:text-sm hover:bg-destructive/10">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-[2] rounded-xl h-11 text-xs sm:text-sm shadow-md shadow-primary/20">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : "Create Goal"}
                </Button>
              </div>
              {formError && <p className="text-xs text-red-500 font-medium">{formError}</p>}
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-sm font-medium">No active goals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map(goal => {
              const { total, progress } = getGoalProgress(goal);
              const unit = goal.category === "water" ? "L" : "kg";
              return (
                <div key={goal.id} className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{goal.title}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{goal.subtype?.replace("-", " ")} · {goal.category}</p>
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{total.toFixed(1)} / {goal.target_value} {unit}</span>
                      <span className="font-bold text-primary">{Math.round(progress)}%</span>
                    </div>
                    <div className="bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", progress >= 80 ? "bg-green-500" : "bg-primary")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
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