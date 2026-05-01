// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

import { calcPointsForEntry, formatDate, today, LOG_CATEGORIES, WASTE_TYPES, WATER_TYPES } from "@/lib/utils";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const WATER_RATES = {
  shower: 480,    // ~8 L/min
  tap: 360,       // ~6 L/min
  dishes: 240,    // ~4 L/min
  laundry: 300,   // ~5 L/min
  other: 360,
};

export default function Log() {
  const { user, profile, updateProfile, isLoadingAuth, authChecked } = useAuth();
  
  // Form State
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

  // History & Tab State
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!isLoadingAuth && authChecked && (profile?.id || user?.id)) {
      loadData();
    }
  }, [isLoadingAuth, authChecked, profile?.id, user?.id]);

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

    const pts = calcPointsForEntry(category, subtype, computedAmount);
    const { error: insertError } = await supabase.from('LogEntry').insert([
      {
        user_id: userId,
        category,
        subtype,
        amount: computedAmount,
        entry_date: entryDate,
      }
    ]);

    if (insertError) {
      setFormError(insertError.message);
      setSubmitting(false);
      return;
    }

    const newPoints = (profile?.points || 0) + pts;
    const newLifetime = (profile?.lifetime_points || 0) + pts;
    const lastDate = profile?.last_log_date;
    const streak = lastDate === today() || lastDate === new Date(Date.now() - 864e5).toISOString().split('T')[0]
      ? (profile?.current_streak || 0) + (lastDate !== today() ? 1 : 0)
      : 1;

    try {
      await updateProfile({
        points: newPoints,
        lifetime_points: newLifetime,
        current_streak: streak,
        last_log_date: today(),
      });
    } catch (err) {
      console.error('Profile update failed:', err);
    }

    setAmount("");
    setTimeValue("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
    await loadData();
    setSubmitting(false);
  }

  const filteredEntries = entries.filter(entry => {
    if (activeTab === "all") return true;
    return entry.category === activeTab;
  });

  const subtypes = category === "water" ? WATER_TYPES : WASTE_TYPES;

  const getEntryIcon = (entry) => {
    const list = entry.category === "water" ? WATER_TYPES : WASTE_TYPES;
    const match = list.find(item => item.value === entry.subtype);
    return match ? match.emoji : (entry.category === "water" ? "💧" : "🗑️");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-6 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-semibold">Log</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Track your impact.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                      category === value ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent text-muted-foreground"
                    )}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </div>

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
                      subtype === value ? "bg-teal-light border-primary text-primary font-medium" : "border-border bg-background"
                    )}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {category === "water" ? (useTime ? "Duration" : "Amount (Litres)") : "Amount (Kilograms)"}
                </label>
                {category === "water" && (
                  <button
                    type="button"
                    onClick={() => { setUseTime(t => !t); setAmount(""); setTimeValue(""); }}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    {useTime ? "Enter litres instead" : "⏱ Use time instead"}
                  </button>
                )}
              </div>

              {category === "water" && useTime ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={timeValue}
                    onChange={e => setTimeValue(e.target.value)}
                    placeholder="e.g. 10"
                    className="h-12 rounded-xl"
                    required
                  />
                  <div className="flex bg-muted p-1 rounded-xl">
                    {["minutes", "hours"].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setTimeUnit(unit)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                          timeUnit === unit ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        {unit === "minutes" ? "Mins" : "Hrs"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Input
                  type="number"
                  step="0.1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 10"
                  className="h-12 rounded-xl"
                  required
                />
              )}

              {!isNaN(computedAmount) && computedAmount > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {category === "water" && useTime && (
                    <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 rounded-xl border border-secondary/50">
                      <span className="text-sm font-medium text-muted-foreground">Estimated Usage</span>
                      <span className="text-sm font-bold text-primary">{computedAmount} Litres</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-3 bg-primary/10 rounded-xl border border-primary/20">
                    <span className="text-sm font-medium text-primary/80">Potential Impact</span>
                    <span className="text-base font-bold text-primary">
                      + {calcPointsForEntry(category, subtype, computedAmount)} Points
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting || isNaN(computedAmount) || computedAmount <= 0}
              className="w-full h-12 rounded-xl text-base font-semibold mt-4"
            >
              {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : success ? <CheckCircle2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
              {submitting ? "Saving…" : success ? "Saved!" : "Log Entry"}
            </Button>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-xl font-semibold">Recent History</h2>
          <div className="flex bg-muted p-1 rounded-xl w-fit">
            {["all", "waste", "water"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                  activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
            <p className="text-3xl mb-2">📋</p>
            <p>No {activeTab === "all" ? "" : activeTab} logs yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map(entry => (
              <div key={entry.id} className="bg-card border border-border/60 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                  {getEntryIcon(entry)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm capitalize">{entry.subtype?.replace("-", " ")}</p>
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