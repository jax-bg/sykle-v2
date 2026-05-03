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