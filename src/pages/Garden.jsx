// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

import { getLevelInfo, today } from "@/lib/utils";
import LevelRing from "@/components/LevelRing";
import StatCard from "@/components/StatCard";
import { Flame, Droplets, Trash2, Recycle, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const tips = [
  "Turn off the tap while brushing to save water.",
  "Use a reusable bag to cut your plastic usage.",
  "Fixing leaks around the house can reduce not only wasted water but your utility bill too.",
  "Segregate your trash before disposal to improve waste management efficiency.",
  "Avoid single-use plastics in line with your region's regulations.",
  "Compost leftover food scraps to create mulch.",
  "Using cold water for your laundry can save tons of energy.",
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, profile, isLoadingAuth, authChecked } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tip] = useState(tips[Math.floor(Math.random() * tips.length)]);

  useEffect(() => {
    if (!isLoadingAuth && authChecked) {
      load();
    }
  }, [isLoadingAuth, authChecked, profile]);

  async function load() {
    setLoading(true);
    const userId = profile?.id;
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
      .limit(100);

    if (error) {
      console.error('Failed to load log entries:', error);
      setEntries([]);
    } else {
      setEntries(logs || []);
    }

    setLoading(false);
  }

  const levelInfo = getLevelInfo(profile?.lifetime_points || 0);

  // Stats for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentEntries = entries.filter(e => new Date(e.entry_date) >= sevenDaysAgo);
  const totalWater = recentEntries.filter(e => e.category === "water").reduce((s, e) => s + (e.amount || 0), 0);
  const totalWaste = recentEntries.filter(e => e.category === "waste").reduce((s, e) => s + (e.amount || 0), 0);
  const totalRecycled = recentEntries.filter(e => e.subtype === "recyclable" || e.subtype === "e-waste").reduce((s, e) => s + (e.amount || 0), 0);

  const firstName = profile?.full_name?.split(" ")[0] || "TPSian";

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-6 pt-10 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-primary-foreground/60 text-sm">Welcome back,</p>
              <h1 className="font-display text-3xl font-semibold">{firstName}</h1>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-2xl px-4 py-2">
              <Star size={16} className="text-gold fill-gold" />
              <span className="font-bold text-lg">{(profile?.points || 0).toLocaleString()}</span>
              <span className="text-xs text-primary-foreground/60">Seeds</span>
              {isAuthenticated ? (
                <button
                  onClick={() => logout(false)}
                  className="ml-3 rounded-full bg-secondary/90 px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="ml-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-2xl px-4 py-3 w-fit">
            <Flame size={18} className="text-orange-300" />
            <span className="font-semibold">{profile?.current_streak || 0} day streak</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8">
        {/* Level card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border/60 p-6 mb-6 flex items-center gap-6">
          <LevelRing lifetimePoints={profile?.lifetime_points || 0} size={100} />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Your Level</p>
            <p className="font-display text-2xl font-semibold text-primary">{levelInfo.title}</p>
            <div className="mt-3 bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-700"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{levelInfo.progress}% to next level</p>
          </div>
        </div>

        {/* This Week Stats */}
        <h2 className="font-display text-xl font-semibold mb-4 text-foreground">This Week</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon="💧" label="Water Used" value={totalWater.toFixed(0)} unit="L" color="blue" />
          <StatCard icon="🗑️" label="Waste Logged" value={totalWaste.toFixed(1)} unit="kg" color="teal" />
          <StatCard icon="♻️" label="Recycled" value={totalRecycled.toFixed(1)} unit="kg" color="green" />
          <StatCard icon="📝" label="Log Entries" value={recentEntries.length} unit="this week" color="purple" />
        </div>

        {/* Tip of the day */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Here's a Tip</p>
          <p className="text-sm text-amber-900">{tip}</p>
        </div>

        {/* Quick Actions */}
        <h2 className="font-display text-xl font-semibold mb-4 text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link to="/log" className="bg-primary text-primary-foreground rounded-2xl p-5 flex flex-col gap-2 hover:opacity-90 transition-opacity">
            <span className="text-2xl">📝</span>
            <span className="font-semibold">Log</span>
            <span className="text-xs text-primary-foreground/70">Track your waste or water</span>
          </Link>
          <Link to="/plant" className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2 hover:bg-muted transition-colors">
            <span className="text-2xl">🎯</span>
            <span className="font-semibold">Plant</span>
            <span className="text-xs text-muted-foreground">View your goals</span>
          </Link>
          <Link to="/oasis" className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2 hover:bg-muted transition-colors">
            <span className="text-2xl">🗺️</span>
            <span className="font-semibold">Oasis</span>
            <span className="text-xs text-muted-foreground">Disposal sites near you</span>
          </Link>
          <Link to="/harvest" className="bg-gold/10 border border-gold/30 rounded-2xl p-5 flex flex-col gap-2 hover:bg-gold/20 transition-colors">
            <span className="text-2xl">🎁</span>
            <span className="font-semibold">Harvest</span>
            <span className="text-xs text-muted-foreground">Use your seeds</span>
          </Link>
        </div>
      </div>
    </div>
  );
}