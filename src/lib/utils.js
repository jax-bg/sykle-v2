import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const LOG_CATEGORIES = [
  { value: "waste", label: "Waste", emoji: "🗑️" },
  { value: "water", label: "Water", emoji: "💧" },
];

export const WASTE_TYPES = [
  { value: "recyclable", label: "Recyclable", emoji: "♻️" },
  { value: "food", label: "Food Waste", emoji: "🍎" },
  { value: "general", label: "General", emoji: "🗑️" },
  { value: "e-waste", label: "E-Waste", emoji: "📱" },
];

export const WATER_TYPES = [
  { value: "shower", label: "Shower", emoji: "🚿" },
  { value: "tap", label: "Tap", emoji: "🚰" },
  { value: "dishes", label: "Dishes", emoji: "🍽️" },
  { value: "laundry", label: "Laundry", emoji: "🧺" },
  { value: "other", label: "Other", emoji: "💧" },
];

export const CATEGORY_UNIT = {
  water: "L",
  waste: "kg",
};

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getLevelInfo(lifetimePoints = 0) {
  const levels = [
    { level: 1, title: "Seedling", emoji: "🌱", min: 0, max: 200 },
    { level: 2, title: "Sprout", emoji: "🌿", min: 200, max: 500 },
    { level: 3, title: "Sapling", emoji: "🪴", min: 500, max: 1000 },
    { level: 4, title: "Tree", emoji: "🌳", min: 1000, max: 2000 },
    { level: 5, title: "Grove", emoji: "🌲", min: 2000, max: 3500 },
    { level: 6, title: "Forest", emoji: "🏞️", min: 3500, max: 5500 },
    { level: 7, title: "Biome", emoji: "🌍", min: 5500, max: 8000 },
    { level: 8, title: "Ecosystem", emoji: "🌏", min: 8000, max: 12000 },
    { level: 9, title: "Rainforest", emoji: "🌎", min: 12000, max: 18000 },
    { level: 10, title: "Earth Guardian", emoji: "🌟", min: 18000, max: Infinity },
  ];
  const current = levels.findLast(l => lifetimePoints >= l.min) || levels[0];
  const next = levels.find(l => l.min > lifetimePoints);
  const progress = next
    ? ((lifetimePoints - current.min) / (current.max - current.min)) * 100
    : 100;
  return { ...current, next, progress: Math.min(100, Math.round(progress)) };
}

export function calcPointsForEntry(category, subtype, amount) {
  if (category === "water") {
    // Points for logging + bonus for keeping it low
    const basePoints = 10;
    if (amount <= 50) return basePoints + 20;
    if (amount <= 100) return basePoints + 10;
    return basePoints;
  }
  if (category === "waste") {
    const basePoints = 10;
    if (subtype === "recyclable") return basePoints + 30;
    if (subtype === "food") return basePoints + 20;
    if (subtype === "e-waste") return basePoints + 40;
    return basePoints;
  }
  return 10;
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

export function today() {
  return new Date().toISOString().split("T")[0];
}