// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

import { getLevelInfo, LOG_CATEGORIES, WASTE_TYPES, WATER_TYPES } from "@/lib/utils";
import LevelRing from "@/components/LevelRing";
import { Plus, Loader2, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
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

// Anti-Abuse: Prevent tiny goals to discourage farming
const MIN_GOAL_VALUE = 5; 

export default function Goals() {
  const { profile, isLoadingAuth, authChecked } = useAuth();
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [form, setForm] = useState({ category: "water", subtype: "shower", title: "", target_value: "" });

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
    
    // Validation Logic[cite: 5]
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setFormError('Please enter a valid target value.');
      setSubmitting(false);
      return;
    }

    // Anti-Abuse: Prevent tiny goals[cite: 5]
    if (targetAmount < MIN_GOAL_VALUE) {
      setFormError(`Target must be at least ${MIN_GOAL_VALUE} to discourage point farming.`);
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
  const subtypeOptions = form.category === 'water' ? WATER_TYPES : WASTE_TYPES;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-6 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-semibold">Plant</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Set goals to earn seeds.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Level Card[cite: 5] */}
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 mb-6">
          <h2 className="font-display text-xl font-semibold mb-5">Your Level</h2>
          <div className="flex gap-6 items-center">
            <LevelRing lifetimePoints={profile?.lifetime_points || 0} size={110} />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total XP</p>
              <p className="text-3xl font-bold text-primary">{(profile?.lifetime_points || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">redeemable: <strong className="text-foreground">{(profile?.points || 0).toLocaleString()} pts</strong></p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Level Milestones</p>
            {LEVEL_MILESTONES.map(m => {
              const unlocked = (profile?.lifetime_points || 0) >= m.points;
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

        {/* Goals Management[cite: 5] */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold">My Plants</h2>
            {formSuccess && <p className="text-sm text-green-600 mt-1">{formSuccess}</p>}
          </div>
          <Button
            size="sm"
            onClick={() => {
              setShowForm(v => !v);
              setFormError(null);
              setFormSuccess(null);
            }}
            className="rounded-xl gap-1.5"
          >
            <Plus size={16} /> New Goal
          </Button>
        </div>

        {/* Goal creation form[cite: 5] */}
        {showForm && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 mb-5 shadow-sm">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LOG_CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: cat.value, subtype: cat.value === 'water' ? 'shower' : 'recyclable' }))}
                        className={cn(
                          "flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm border transition-all",
                          form.category === cat.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        <span>{cat.emoji}</span> {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Type</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {(form.category === 'water' ? WATER_TYPES : WASTE_TYPES).map(typeOption => (
                      <button
                        key={typeOption.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, subtype: typeOption.value }))}
                        className={cn(
                          "flex items-center gap-2 px-4 py-3 rounded-xl text-sm border transition-all",
                          form.subtype === typeOption.value ? "bg-teal-light border-primary text-primary font-medium" : "border-border bg-background text-foreground hover:bg-muted"
                        )}
                      >
                        <span>{typeOption.emoji}</span> {typeOption.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Goal name</label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Reduce shower water"
                    required
                    className="rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Target value ({form.category === 'water' ? 'L' : 'kg'})</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.target_value}
                    onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
                    placeholder={`Min. ${MIN_GOAL_VALUE}`}
                    required
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                  <AlertTriangle size={16} />
                  {formError}
                </div>
              )}

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
              return (
                <div key={goal.id} className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div>
                      <p className="font-semibold">{goal.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{goal.subtype} · {goal.category}</p>
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{total.toFixed(1)} / {goal.target_value}</span>
                      <span className="font-medium text-primary">{Math.round(progress)}%</span>
                    </div>
                    <div className="bg-muted rounded-full h-2.5">
                      <div
                        className={cn("h-2.5 rounded-full transition-all duration-700", progress >= 80 ? "bg-green-500" : progress >= 40 ? "bg-primary" : "bg-amber-500")}
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