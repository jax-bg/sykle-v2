import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

import { calcPointsForEntry, formatDate, today, LOG_CATEGORIES, WASTE_TYPES, WATER_TYPES } from "@/lib/utils";
import { Droplets, Trash2, Plus, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Average litres per hour for each water subtype
const WATER_RATES = {
  shower: 480,    // ~8 L/min
  tap: 360,       // ~6 L/min
  dishes: 240,    // ~4 L/min
  laundry: 300,   // ~5 L/min (per hour of machine cycle)
  other: 360,
};

export default function Log() {
  const { user, profile, updateProfile, isLoadingAuth, authChecked } = useAuth();
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

  useEffect(() => {
    if (!isLoadingAuth && authChecked) {
      loadData();
    }
  }, [isLoadingAuth, authChecked, profile]);

  async function loadData() {
    setLoading(true);
    const userId = profile?.id || user?.id;
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data: logs, error } = await supabase
      .from('LogEntry')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Failed to load log entries:', error);
      setEntries([]);
    } else {
      setEntries(logs || []);
    }

    setLoading(false);
  }

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

    const userId = profile?.id || user?.id;
    if (!userId) {
      const errorMessage = 'You must be signed in to log an entry.';
      console.error(errorMessage);
      setFormError(errorMessage);
      setSubmitting(false);
      return;
    }

    const pts = calcPointsForEntry(category, subtype, computedAmount);
    const { data, error: insertError } = await supabase.from('LogEntry').insert([
      {
        user_id: userId,
        category,
        subtype,
        amount: computedAmount,
        entry_date: entryDate,
      }
    ]).select();

    if (insertError) {
      const errorMessage = insertError.message || 'Failed to create log entry.';
      console.error('Failed to create log entry:', insertError);
      setFormError(errorMessage);
      setSubmitting(false);
      return;
    }

    if (!data || data.length === 0) {
      const errorMessage = 'Log entry appears to have been blocked by Supabase permissions or RLS. Please check your policy settings.';
      console.error(errorMessage, { data });
      setFormError(errorMessage);
      setSubmitting(false);
      return;
    }

    try {
      const { data: matchingGoals, error: goalFetchError } = await supabase
        .from('Goals')
        .select('id,current_value,target_value,is_completed')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('subtype', subtype)
        .eq('is_completed', false);

      if (goalFetchError) {
        console.error('Failed to fetch goals for update:', goalFetchError);
      } else if (matchingGoals?.length) {
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
    } catch (goalUpdateException) {
      console.error('Unexpected error updating goals:', goalUpdateException);
    }

    const newPoints = (profile?.points || 0) + pts;
    const newLifetime = (profile?.lifetime_points || 0) + pts;
    const lastDate = profile?.last_log_date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];
    const streak = lastDate === yStr || lastDate === today()
      ? (profile?.current_streak || 0) + (lastDate !== today() ? 1 : 0)
      : 1;

    try {
      await updateProfile({
        points: newPoints,
        lifetime_points: newLifetime,
        current_streak: streak,
        last_log_date: today(),
      });
    } catch (profileError) {
      console.error('Failed to update profile:', profileError);
      setFormError('Log entry saved, but profile update failed.');
    }

    setAmount("");
    setTimeValue("");
    setTimeUnit("minutes");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
    await loadData();
    setSubmitting(false);
  }

  const subtypes = category === "water" ? WATER_TYPES : WASTE_TYPES;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-6 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-semibold">Log</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Track your waste/water usage.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Form */}
        <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category Toggle */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {LOG_CATEGORIES.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setCategory(value); setSubtype(value === "water" ? "shower" : "recyclable"); }}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm border transition-all",
                      category === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-transparent text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtype */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {subtypes.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSubtype(value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl text-sm border transition-all",
                      subtype === value
                        ? "bg-teal-light border-primary text-primary font-medium"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {category === "water" ? (useTime ? "Duration" : "Amount (Litres)") : "Amount (Kilograms)"}
                </label>
                {category === "water" && (
                  <button
                    type="button"
                    onClick={() => { setUseTime(t => !t); setAmount(""); setTimeValue(""); setTimeUnit("minutes"); }}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    {useTime ? "Enter litres instead" : "⏱ Use time instead"}
                  </button>
                )}
              </div>

              {category === "water" && useTime ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          type="number"
                          step={timeUnit === "hours" ? "0.1" : "1"}
                          min="0"
                          value={timeValue}
                          onChange={e => setTimeValue(e.target.value)}
                          placeholder={timeUnit === "hours" ? "e.g. 0.5" : "e.g. 10"}
                          className="pr-16 h-12 text-base rounded-xl"
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {timeUnit === "hours" ? "hrs" : "mins"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTimeUnit("minutes")}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm transition",
                          timeUnit === "minutes"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        Minutes
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeUnit("hours")}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm transition",
                          timeUnit === "hours"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        Hours
                      </button>
                    </div>
                  </div>

                  {timeValue && !isNaN(parseFloat(timeValue)) && (
                    <p className="text-xs text-muted-foreground px-1">
                      ≈ <strong>{(parseFloat(timeValue) * (timeUnit === "hours" ? 1 : 1 / 60) * WATER_RATES[subtype]).toFixed(1)} L</strong> used
                      &nbsp;(avg {WATER_RATES[subtype]} L/hr for {WATER_TYPES.find(t => t.value === subtype)?.label})
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={category === "water" ? "e.g. 80" : "e.g. 0.5"}
                    className="pr-12 h-12 text-base rounded-xl"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {category === "water" ? "L" : "kg"}
                  </span>
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Date</label>
              <Input
                type="date"
                value={entryDate}
                max={today()}
                onChange={e => setEntryDate(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            {/* Points preview */}
            {!isNaN(computedAmount) && computedAmount > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-lg">🌰</span>
                <p className="text-sm text-amber-800">
                  You'll earn <strong>{calcPointsForEntry(category, subtype, computedAmount)} points</strong> for this entry!
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || isNaN(computedAmount) || computedAmount <= 0}
              className="w-full h-12 rounded-xl text-base font-semibold"
            >
              {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : success ? <CheckCircle2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
              {submitting ? "Saving…" : success ? "Saved!" : "Log Entry"}
            </Button>
            {formError && (
              <p className="mt-3 text-sm text-red-600">{formError}</p>
            )}
          </form>
        </div>

        {/* History */}
        <h2 className="font-display text-xl font-semibold mb-4">Recent History</h2>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-2">📋</p>
            <p>No entries yet. Start logging!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="bg-card border border-border/60 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                  {entry.category === "water" ? "💧" :
                    entry.subtype === "recyclable" ? "♻️" :
                    entry.subtype === "food" ? "🍎" :
                    entry.subtype === "e-waste" ? "📱" : "🗑️"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm capitalize">{entry.subtype?.replace("-", " ")} {entry.category}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(entry.entry_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{entry.amount} {entry.category === "water" ? "L" : "kg"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}