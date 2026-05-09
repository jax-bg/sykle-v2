// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

import { calcPointsForEntry, formatDate, today, LOG_CATEGORIES, WASTE_TYPES, WATER_TYPES } from "@/lib/utils";
import { Plus, Loader2, CheckCircle2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const WATER_RATES = {
  shower: 480,
  tap: 360,
  dishes: 240,
  laundry: 300,
  other: 360,
};

export default function Log() {
  const { profile, updateProfile, isLoadingAuth, authChecked } = useAuth();
  const [category, setCategory] = useState("waste");
  const [subtype, setSubtype] = useState("recyclable");
  const [amount, setAmount] = useState("");
  const [useTime, setUseTime] = useState(false);
  const [timeValue, setTimeValue] = useState("");
  const [timeUnit, setTimeUnit] = useState("minutes");
  const [entryDate, setEntryDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to find the correct emoji based on database subtype[cite: 1]
  const getSubtypeEmoji = (cat, sub) => {
    const list = cat === "water" ? WATER_TYPES : WASTE_TYPES;
    const match = list.find(item => item.value === sub);
    return match ? match.emoji : (cat === "water" ? "💧" : "♻️");
  };

  const loadData = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    
    const { data: logs, error } = await supabase
      .from('LogEntry')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Failed to load log entries:', error);
    } else {
      setEntries(logs || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
  if (!isLoadingAuth && authChecked) {
    if (profile?.id) {
      loadData(profile.id);
    } else {
      setLoading(false);
    }
  }
}, [isLoadingAuth, authChecked, profile?.id, loadData]);

  const computedAmount = useTime && category === "water" && timeValue
    ? parseFloat((parseFloat(timeValue) * (timeUnit === "hours" ? 1 : 1 / 60) * WATER_RATES[subtype]).toFixed(1))
    : parseFloat(amount);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (isNaN(computedAmount) || computedAmount <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    const userId = profile?.id;
    
    if (!userId) {
      setFormError('You must be signed in to log an entry.');
      setSubmitting(false);
      return;
    }

    try {
      const { data, error: insertError } = await supabase.from('LogEntry').insert([
        {
          user_id: userId,
          category,
          subtype,
          amount: computedAmount,
          entry_date: entryDate,
        }
      ]).select();

      if (insertError) throw insertError;

      if (data && data[0]) {
        setEntries(prev => [data[0], ...prev].slice(0, 30));
      }

      // Update Goals[cite: 1]
      const { data: matchingGoals } = await supabase
        .from('Goals')
        .select('id,current_value,target_value')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('subtype', subtype)
        .eq('is_completed', false);

      if (matchingGoals?.length) {
        await Promise.all(matchingGoals.map(goal => {
          const updatedValue = (goal.current_value || 0) + computedAmount;
          return supabase
            .from('Goals')
            .update({
              current_value: updatedValue,
              is_completed: updatedValue >= goal.target_value,
            })
            .eq('id', goal.id);
        }));
      }

      const pts = calcPointsForEntry(category, subtype, computedAmount);
      const lastDate = profile?.last_log_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];
      
      const streak = lastDate === yStr || lastDate === today()
        ? (profile?.current_streak || 0) + (lastDate !== today() ? 1 : 0)
        : 1;

      await updateProfile({
        points: (profile?.points || 0) + pts,
        lifetime_points: (profile?.lifetime_points || 0) + pts,
        current_streak: streak,
        last_log_date: today(),
      });

      setAmount("");
      setTimeValue("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  const subtypes = category === "water" ? WATER_TYPES : WASTE_TYPES;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-6 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-semibold">Log</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Track your daily sustainability impact.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category Selection[cite: 1] */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {LOG_CATEGORIES.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setCategory(value); setSubtype(value === "water" ? "shower" : "recyclable"); }}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm border transition-all",
                      category === value ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent text-muted-foreground"
                    )}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource Subtype[cite: 1] */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Resource Type</label>
              <div className="grid grid-cols-2 gap-2">
                {subtypes.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSubtype(value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl text-sm border transition-all",
                      subtype === value ? "bg-teal-light border-primary text-primary font-medium" : "border-border bg-background"
                    )}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount/Duration Input[cite: 1] */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {category === "water" ? (useTime ? "Duration" : "Amount (L)") : "Amount (kg)"}
                </label>
                {category === "water" && (
                  <button
                    type="button"
                    onClick={() => { setUseTime(!useTime); setAmount(""); setTimeValue(""); }}
                    className="text-[10px] text-primary font-bold uppercase tracking-tighter hover:underline"
                  >
                    {useTime ? "Enter Litres" : "⏱ Use Time"}
                  </button>
                )}
              </div>

              {category === "water" && useTime ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={timeValue}
                        onChange={e => setTimeValue(e.target.value)}
                        placeholder="0"
                        className="h-12 rounded-xl pr-12"
                        required
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {timeUnit === "hours" ? "hrs" : "min"}
                      </span>
                    </div>
                    <div className="flex bg-muted rounded-xl p-1">
                      {['minutes', 'hours'].map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setTimeUnit(u)}
                          className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", timeUnit === u ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
                        >
                          {u === 'minutes' ? 'Min' : 'Hrs'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="h-12 rounded-xl pr-12"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase">
                    {category === "water" ? "L" : "kg"}
                  </span>
                </div>
              )}
            </div>

            {/* Date Input[cite: 1] */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Date</label>
              <div className="relative">
                <Input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="h-12 rounded-xl pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || isNaN(computedAmount) || computedAmount <= 0}
              className="w-full h-12 rounded-xl text-sm font-bold uppercase tracking-widest"
            >
              {submitting ? <Loader2 className="animate-spin mr-2" size={18} /> : success ? <CheckCircle2 className="mr-2" size={18} /> : <Plus className="mr-2" size={18} />}
              {submitting ? "Logging..." : success ? "Logged!" : "Log Entry"}
            </Button>
            {formError && <p className="text-xs text-red-500 font-medium text-center">{formError}</p>}
          </form>
        </div>

        <h2 className="font-display text-xl font-semibold mb-4">Recent History</h2>
        {loading && entries.length === 0 ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
            <p className="text-sm text-muted-foreground">No entries yet. Start tracking!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="bg-card border border-border/60 rounded-2xl px-5 py-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                  {/* Dynamic icon lookup[cite: 1] */}
                  {getSubtypeEmoji(entry.category, entry.subtype)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm capitalize">{entry.subtype?.replace("-", " ")} {entry.category}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{formatDate(entry.entry_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-primary">{entry.amount} {entry.category === "water" ? "L" : "kg"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}