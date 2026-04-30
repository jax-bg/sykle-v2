// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { calcPointsForEntry, formatDate, today, LOG_CATEGORIES, WASTE_TYPES, WATER_TYPES } from "@/lib/utils";
import { Droplets, Trash2, Plus, ChevronRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const WATER_RATES = {
  shower: 480, tap: 360, dishes: 240, laundry: 300, other: 360,
};

// Anti-abuse constants
const DAILY_ENTRY_LIMIT = 5; 
const MAX_WATER_SINGLE_ENTRY = 500; // Liters
const MAX_WASTE_SINGLE_ENTRY = 50;  // Kilograms

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

    // Validation: Check for realistic amounts
    if (isNaN(computedAmount) || computedAmount <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (category === "water" && computedAmount > MAX_WATER_SINGLE_ENTRY) {
      setFormError(`Entry too large. Maximum allowed is ${MAX_WATER_SINGLE_ENTRY}L.`);
      return;
    }
    if (category === "waste" && computedAmount > MAX_WASTE_SINGLE_ENTRY) {
      setFormError(`Entry too large. Maximum allowed is ${MAX_WASTE_SINGLE_ENTRY}kg.`);
      return;
    }

    setSubmitting(true);
    const userId = profile?.id || user?.id;

    // Anti-Abuse: Check daily entry count
    const todaysEntries = entries.filter(en => en.entry_date === today()).length;
    if (todaysEntries >= DAILY_ENTRY_LIMIT && entryDate === today()) {
      setFormError(`Daily limit reached (${DAILY_ENTRY_LIMIT} entries). Quality over quantity!`);
      setSubmitting(false);
      return;
    }

    const pts = calcPointsForEntry(category, subtype, computedAmount);
    
    const { data, error: insertError } = await supabase.from('LogEntry').insert([
      { user_id: userId, category, subtype, amount: computedAmount, entry_date: entryDate }
    ]).select();

    if (insertError) {
      setFormError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Update Goals
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
        return supabase.from('Goals').update({
          current_value: updatedValue,
          is_completed: updatedValue >= goal.target_value,
        }).eq('id', goal.id);
      }));
    }

    // Profile Updates (Points & Streaks)
    const newPoints = (profile?.points || 0) + pts;
    const newLifetime = (profile?.lifetime_points || 0) + pts;
    const lastDate = profile?.last_log_date;
    
    // Strict Streak Logic: Must be exactly the day before for increment
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];
    
    let streak = profile?.current_streak || 0;
    if (lastDate === yStr) {
      streak += 1;
    } else if (lastDate !== today()) {
      streak = 1;
    }

    await updateProfile({
      points: newPoints,
      lifetime_points: newLifetime,
      current_streak: streak,
      last_log_date: today(),
    });

    setAmount("");
    setTimeValue("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
    await loadData();
    setSubmitting(false);
  }

  const subtypes = category === "water" ? WATER_TYPES : WASTE_TYPES;

  return (
    <div className="min-h-screen bg-background">
      {/* (Header UI remains same as source) */}
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-6 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-semibold">Log</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Track your waste/water usage.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category and Subtype UI (same as source) */}
            
            {/* Amount and Points Preview with Abuse Warning */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {category === "water" ? (useTime ? "Duration" : "Amount (Litres)") : "Amount (Kilograms)"}
                </label>
              </div>
              <Input
                type="number"
                step="0.1"
                value={useTime ? timeValue : amount}
                onChange={e => useTime ? setTimeValue(e.target.value) : setAmount(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                <AlertTriangle size={16} />
                {formError}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl">
              {submitting ? <Loader2 className="animate-spin" /> : "Log Entry"}
            </Button>
          </form>
        </div>
        {/* History UI (same as source) */}
      </div>
    </div>
  );
}