import { supabase } from "@/lib/supabase";
import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Search, X, Loader2, AlertCircle, RefreshCw, History, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ECO_GRADES = {
  a: { label: "Excellent", color: "bg-green-500", text: "text-green-700", bg: "bg-green-50", border: "border-green-200", emoji: "🌿" },
  b: { label: "Good", color: "bg-lime-500", text: "text-lime-700", bg: "bg-lime-50", border: "border-lime-200", emoji: "🍃" },
  c: { label: "Moderate", color: "bg-yellow-400", text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", emoji: "⚡" },
  d: { label: "Poor", color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", emoji: "⚠️" },
  e: { label: "Bad", color: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200", emoji: "🚨" },
};

const TIPS = {
  a: "Great choice! This product has minimal environmental impact.",
  b: "A solid eco-friendly option with low environmental impact.",
  c: "Moderate impact — consider this occasionally but look for greener alternatives.",
  d: "High environmental impact. Try to find a greener alternative.",
  e: "Very high environmental impact. We recommend choosing a greener product.",
};

async function fetchProduct(barcode) {
  const fields = "product_name,ecoscore_grade,ecoscore_score,image_front_url,brands,packaging_tags,origins_tags";
  // Try multiple endpoints for reliability
  const urls = [
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${fields}`,
    `https://world.openfoodfacts.net/api/v2/product/${barcode}?fields=${fields}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "EcoJourneyUAE/1.0 (contact@ecojourneyuae.com)" }
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 1 && data.product) return data.product;
      throw new Error("Product not found");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Product not found");
}

const HISTORY_TABLES = ["ScanHistory", "scan_history"];

function isTableNotFoundError(error) {
  const msg = error?.message || "";
  return /(does not exist|relation .* does not exist|table .* does not exist)/i.test(msg);
}

async function getCurrentUserId() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn("Supabase getUser failed:", error);
      return null;
    }
    return data?.user?.id ?? null;
  } catch (err) {
    console.warn("Supabase getUser unexpected error:", err);
    return null;
  }
}

async function selectHistoryRows(limit = 50) {
  let lastError;
  const userId = await getCurrentUserId();

  for (const table of HISTORY_TABLES) {
    let query = supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (!error) return { data, table };
    lastError = error;
    if (!isTableNotFoundError(error)) throw error;
  }

  throw lastError || new Error("History table not found");
}

async function insertHistoryRow(record) {
  let lastError;
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Not authenticated: history requires a signed-in user.");
  }
  const payload = { ...record, user_id: userId };

  for (const table of HISTORY_TABLES) {
    const { error } = await supabase.from(table).insert([payload]);
    if (!error) return table;
    lastError = error;
    if (!isTableNotFoundError(error)) throw error;
  }

  throw lastError || new Error("History table not found");
}

function GradeCard({ grade, score }) {
  const g = grade?.toLowerCase();
  const info = g && ECO_GRADES[g];
  if (!info) return (
    <div className="flex items-center gap-3 bg-muted rounded-xl border border-border p-4 text-muted-foreground">
      <span className="text-2xl">❓</span>
      <div>
        <p className="font-medium text-sm">Eco-Score not available</p>
        <p className="text-xs">Not enough data for this product.</p>
      </div>
    </div>
  );
  return (
    <div className={cn("flex items-center gap-4 rounded-xl border p-4", info.bg, info.border)}>
      <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-2xl shrink-0", info.color)}>
        {g.toUpperCase()}
      </div>
      <div>
        <p className={cn("font-bold text-lg leading-tight", info.text)}>{info.emoji} Eco-Score: {info.label}</p>
        {score != null && <p className={cn("text-sm", info.text)}>{score}/100 environmental score</p>}
        <p className={cn("text-xs mt-1", info.text)}>{TIPS[g]}</p>
      </div>
    </div>
  );
}

function ProductCard({ product, onScanAnother }) {
  const origins = product.origins_tags?.slice(0, 1).map(t => t.replace("en:", "").replace(/-/g, " ")).join(", ");
  const packaging = product.packaging_tags?.slice(0, 2).map(t => t.replace("en:", "").replace(/-/g, " ")).join(", ");

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex gap-4 p-5">
          {product.image_front_url || product.image_url ? (
            <img
              src={product.image_front_url || product.image_url}
              alt={product.product_name}
              className="w-24 h-24 object-contain rounded-xl bg-muted shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center text-3xl shrink-0">🛒</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base leading-tight">{product.product_name || "Unknown Product"}</p>
            {product.brands && <p className="text-xs text-muted-foreground mt-1">{product.brands}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">Barcode: {product.barcode}</p>
          </div>
        </div>

        <div className="px-5 pb-4">
          <GradeCard grade={product.ecoscore_grade} score={product.ecoscore_score} />
        </div>

        {(origins || packaging) && (
          <div className="px-5 pb-5 grid grid-cols-2 gap-3">
            {origins && (
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Origin</p>
                <p className="text-sm font-medium capitalize">{origins}</p>
              </div>
            )}
            {packaging && (
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Packaging</p>
                <p className="text-sm font-medium capitalize">{packaging}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Button onClick={onScanAnother} variant="outline" className="w-full h-12 rounded-xl gap-2">
        <RefreshCw size={16} /> Scan Another Product
      </Button>
    </div>
  );
}

function HistoryList({ history, onSelect }) {
  if (history.length === 0) return (
    <div className="text-center py-10 text-muted-foreground">
      <p className="text-3xl mb-2">📦</p>
      <p className="text-sm">No scans yet. Scan a product to get started!</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {history.map(item => {
        const g = item.ecoscore_grade?.toLowerCase();
        const info = g && ECO_GRADES[g];
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full bg-card border border-border/60 rounded-2xl px-5 py-4 flex items-center gap-4 hover:shadow-md transition-all text-left"
          >
            {item.image_url ? (
              <img src={item.image_url} alt={item.product_name} className="w-12 h-12 object-contain rounded-xl bg-muted shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">🛒</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.product_name || "Unknown Product"}</p>
              {item.brands && <p className="text-xs text-muted-foreground truncate">{item.brands}</p>}
              <p className="text-xs text-muted-foreground">{new Date(item.created_date).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {info ? (
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm", info.color)}>
                  {g.toUpperCase()}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm">?</div>
              )}
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function Scanner() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanningRef = useRef(false);
  const animRef = useRef(null);

  const [tab, setTab] = useState("scan"); // scan | history
  const [mode, setMode] = useState("idle");
  const [manualBarcode, setManualBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) setCameraSupported(false);
    if ("BarcodeDetector" in window) {
      setBarcodeDetectorSupported(true);
      detectorRef.current = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
    }
    loadHistory();
    return () => stopCamera();
  }, []);

async function loadHistory() {
  setHistoryLoading(true);
  try {
    const { data } = await selectHistoryRows(50);

    setHistory((data || []).map(item => ({
      ...item,
      created_date: item.created_date ?? item.created_at,
    })));
  } catch (err) {
    console.error("History refresh failed:", err);
    setError("Failed to load history: " + (err?.message || err));
  } finally {
    setHistoryLoading(false);
  }
}

  function stopCamera() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function startCamera() {
    setError(null);
    setProduct(null);
    setMode("camera");
    setScanning(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      if (barcodeDetectorSupported) {
        setScanning(true);
        scanningRef.current = true;
        scanFrame();
      }
    } catch {
      setError("Camera access denied. Please use manual entry.");
      setMode("manual");
    }
  }

  const scanFrame = useCallback(async () => {
    if (!scanningRef.current || !videoRef.current || !detectorRef.current) return;
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        scanningRef.current = false;
        setScanning(false);
        stopCamera();
        await lookupBarcode(barcodes[0].rawValue);
        return;
      }
    } catch {}
    animRef.current = requestAnimationFrame(scanFrame);
  }, []);

async function lookupBarcode(barcode) {
  setLoading(true);
  setError(null);
  setProduct(null);
  
  try {
    const p = await fetchProduct(barcode);
    const result = { ...p, barcode };
    setProduct(result);

    await insertHistoryRow({
      barcode: barcode,
      product_name: p.product_name || "Unknown Product",
      brands: p.brands || "",
      ecoscore_grade: p.ecoscore_grade || "",
      ecoscore_score: p.ecoscore_score ?? null,
      image_url: p.image_front_url || "",
      origins: p.origins_tags?.slice(0, 1).map(t => t.replace("en:", "").replace(/-/g, " ")).join(", ") || "",
      packaging: p.packaging_tags?.slice(0, 2).map(t => t.replace("en:", "").replace(/-/g, " ")).join(", ") || "",
    });

    await loadHistory();
    
  } catch (err) {
    console.error("History save failed:", err);
    setError("Failed to save to history: " + (err?.message || err));
  } finally {
    setLoading(false);
  }
}

  async function handleManualSearch(e) {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    stopCamera();
    await lookupBarcode(manualBarcode.trim());
  }

  function reset() {
    stopCamera();
    setProduct(null);
    setError(null);
    setMode("idle");
    setManualBarcode("");
  }

  function selectHistoryItem(item) {
    // Reconstruct product-like object from history record
    setProduct({
      barcode: item.barcode,
      product_name: item.product_name,
      brands: item.brands,
      ecoscore_grade: item.ecoscore_grade,
      ecoscore_score: item.ecoscore_score,
      image_front_url: item.image_url,
      origins_tags: item.origins ? [`en:${item.origins}`] : [],
      packaging_tags: item.packaging ? item.packaging.split(", ").map(p => `en:${p}`) : [],
    });
    setTab("scan");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-6 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-semibold">Glean</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Scan a product to see its environmental impact.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-6 pt-5">
        <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl mb-6">
          {[{ id: "scan", label: "Scanner", icon: Camera }, { id: "history", label: "History", icon: History }].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                tab === id ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={16} /> {label}
              {id === "history" && history.length > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {history.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-10 space-y-5">
        {tab === "history" ? (
          historyLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <HistoryList history={history} onSelect={selectHistoryItem} />
          )
        ) : (
          <>
            {/* Camera view */}
            {mode === "camera" && (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-lg">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-56 h-32 border-2 border-white/70 rounded-xl relative">
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-gold rounded-tl-md" />
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-gold rounded-tr-md" />
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-gold rounded-bl-md" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-gold rounded-br-md" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  {barcodeDetectorSupported
                    ? <p className="text-white/80 text-xs bg-black/40 inline-block px-3 py-1 rounded-full">Point at a barcode</p>
                    : <p className="text-white/80 text-xs bg-black/40 inline-block px-3 py-1 rounded-full">Enter barcode below</p>
                  }
                </div>
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Idle buttons */}
            {mode === "idle" && !loading && !product && (
              <div className="space-y-3">
                {cameraSupported && (
                  <Button onClick={startCamera} className="w-full h-14 rounded-2xl text-base font-semibold gap-3">
                    <Camera size={20} /> Scan with Camera
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => { setMode("manual"); setError(null); setProduct(null); }}
                  className="w-full h-14 rounded-2xl text-base font-semibold gap-3"
                >
                  <Search size={20} /> Enter Barcode Manually
                </Button>
              </div>
            )}

            {/* Manual entry */}
            {(mode === "manual" || mode === "camera") && !loading && !product && (
              <form onSubmit={handleManualSearch} className="flex gap-3">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  placeholder="Enter barcode (e.g. 3017624010701)"
                  className="h-12 rounded-xl flex-1"
                  autoFocus={mode === "manual"}
                />
                <Button type="submit" className="h-12 rounded-xl px-5">
                  <Search size={18} />
                </Button>
              </form>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Looking up product…</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700">
                <AlertCircle size={20} />
                <p className="text-sm flex-1">{error}</p>
                <button onClick={reset} className="text-xs underline shrink-0">Try again</button>
              </div>
            )}

            {/* Result */}
            {product && !loading && (
              <ProductCard product={product} onScanAnother={reset} />
            )}

            {/* Info */}
            {mode === "idle" && !loading && !product && (
              <div className="bg-teal-light/40 border border-primary/20 rounded-2xl p-5 text-sm">
                <p className="font-semibold text-primary mb-1">How it works</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Scan any food product barcode with your camera or enter it manually. We look it up in the <strong>Open Food Facts</strong> database and show you its <strong>Eco-Score (A–E)</strong> — based on lifecycle analysis, packaging, origin, and more.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}