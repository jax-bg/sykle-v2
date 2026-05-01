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
  
  // History State
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const userId = profile?.id || user?.id || profile?.user_id;
    if (!userId) return;

    setLoading(true);
    const { data: logs, error } = await supabase
      .from('LogEntry')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && logs) {
      setEntries(logs);
    }
    setLoading(false);
  }, [profile, user]);

  useEffect(() => {
    if (!isLoadingAuth && authChecked) {
      loadData();
    }
  }, [isLoadingAuth, authChecked, loadData]);

  const computedAmount = useTime && category === "water" && timeValue
    ? parseFloat((parseFloat(timeValue) * (timeUnit === "hours" ? 1 : 1 / 60) * WATER_RATES[subtype]).toFixed(1))
    : parseFloat(amount);

  async function handleSubmit(e) {
    e.preventDefault();
    const userId = profile?.id || user?.id || profile?.user_id;

    if (!userId || isNaN(computedAmount) || computedAmount <= 0) return;

    setSubmitting(true);
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
      setSubmitting(false);
      return;
    }

    setAmount("");
    setTimeValue("");
    setSuccess(true);

    try {
      const newPoints = (profile?.points || 0) + pts;
      const newLifetime = (profile?.lifetime_points || 0) + pts;
      await updateProfile({
        points: newPoints,
        lifetime_points: newLifetime,
        last_log_date: today(),
      });
    } catch (err) {
      console.error('Points update failed', err);
    }

    // Refresh data after 500ms to ensure the list updates correctly
    setTimeout(async () => {
      await loadData();
      setSubmitting(false);
      setTimeout(() => setSuccess(false), 2000);
    }, 500);
  }

  const subtypes = category === "water" ? WATER_TYPES : WASTE_TYPES;

  const getEntryIcon = (entry) => {
    const list = entry.category === "water" ? WATER_TYPES : WASTE_TYPES;
    return list.find(item => item.value === entry.subtype)?.emoji || (entry.category === "water" ? "💧" : "🗑️");
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-gradient-to-br from-[#12423D] to-[#1a5c54] text-white px-6 pt-12 pb-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-4xl font-bold">Log</h1>
          <p className="text-white/70 text-sm mt-2">Track your impact.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-6">
        <div className="bg-white border border-border/50 rounded-[2rem] shadow-xl p-8 mb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Category</p>
              <div className="grid grid-cols-2 gap-3">
                {LOG_CATEGORIES.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setCategory(value); setSubtype(value === "water" ? "shower" : "recyclable"); }}
                    className={cn(
                      "flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold transition-all border-2",
                      category === value ? "bg-[#5EEAD4] border-[#5EEAD4] text-[#12423D]" : "bg-muted/30 border-transparent text-muted-foreground"
                    )}
                  >
                    <span className="text-xl">{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Type</p>
              <div className="grid grid-cols-2 gap-2">
                {subtypes.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSubtype(value)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm border-2 transition-all",
                      subtype === value ? "bg-[#5EEAD4]/20 border-[#5EEAD4] text-[#12423D] font-bold" : "border-muted/50 bg-white"
                    )}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {category === "water" ? (useTime ? "Time" : "Litres") : "Kilograms"}
                </p>
                {category === "water" && (
                  <button type="button" onClick={() => setUseTime(!useTime)} className="text-[10px] font-bold text-[#12423D] underline">
                    {useTime ? "Switch to Litres" : "⏱ Use Timer"}
                  </button>
                )}
              </div>

              {useTime && category === "water" ? (
                <div className="flex gap-2">
                  <Input type="number" value={timeValue} onChange={e => setTimeValue(e.target.value)} placeholder="0" className="h-14 rounded-2xl text-lg" required />
                  <div className="flex bg-muted p-1 rounded-2xl">
                    {["minutes", "hours"].map(u => (
                      <button key={u} type="button" onClick={() => setTimeUnit(u)} className={cn("px-4 py-1 rounded-xl text-[10px] font-bold uppercase", timeUnit === u ? "bg-white shadow-sm" : "text-muted-foreground")}>{u.slice(0, 4)}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <Input type="number" step="0.1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 10" className="h-14 rounded-2xl text-lg" required />
              )}
            </div>

            {/* Date Input */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Entry Date</p>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="date" value={entryDate} max={today()} onChange={e => setEntryDate(e.target.value)} className="h-14 rounded-2xl pl-12" required />
              </div>
            </div>

            <Button type="submit" disabled={submitting || !computedAmount} className={cn("w-full h-16 rounded-2xl text-lg font-bold transition-all shadow-lg", success ? "bg-[#5EEAD4] text-[#12423D]" : "bg-[#12423D] text-white")}>
              {submitting ? <Loader2 className="animate-spin mr-2" /> : success ? <CheckCircle2 className="mr-2" /> : <Plus className="mr-2" />}
              {submitting ? "Saving..." : success ? "Saved!" : "Log Entry"}
            </Button>
          </form>
        </div>

        <h2 className="font-display text-3xl font-bold text-[#12423D] mb-6">Recent History</h2>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 bg-muted/10 rounded-[2rem] border-2 border-dashed border-muted/30">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-semibold text-muted-foreground">No logs yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(entry => (
              <div key={entry.id} className="bg-white border border-border/30 rounded-[1.5rem] p-5 flex items-center gap-5 hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center text-2xl">{getEntryIcon(entry)}</div>
                <div className="flex-1">
                  <p className="font-bold text-[#12423D] capitalize">{entry.subtype?.replace("-", " ")}</p>
                  <p className="text-xs font-medium text-muted-foreground">{formatDate(entry.entry_date)}</p>
                </div>
                <p className="font-black text-xl text-[#12423D]">{entry.amount}{entry.category === "water" ? "L" : "kg"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}