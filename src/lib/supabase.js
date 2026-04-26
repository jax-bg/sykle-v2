// @/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Fetch history for the logged-in user
export async function selectHistoryRows(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  return await supabase
    .from('ScanHistory')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
}

// Insert a new scan result
export async function insertHistoryRow(row) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to save history");

  return await supabase
    .from('ScanHistory')
    .insert([{ ...row, user_id: user.id }]);
}

// Helper for Open Food Facts API
export async function fetchProduct(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
  const data = await res.json();
  if (data.status === 0) throw new Error("Product not found");
  return data.product;
}