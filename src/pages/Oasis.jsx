import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createCustomIcon(color) {
  return L.divIcon({
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
    className: "",
  });
}

const TYPE_COLORS = {
  recyclable: "#2a9d8f",
  "e-waste": "#e76f51",
  plastic: "#264653",
  glass: "#457b9d",
  paper: "#a8dadc",
  metal: "#6d6875",
  organic: "#52b788",
  hazardous: "#e63946",
  clothes: "#f4a261",
};

const TYPE_LABELS = {
  recyclable: "Recyclable",
  "e-waste": "E-Waste",
  plastic: "Plastic",
  glass: "Glass",
  paper: "Paper",
  metal: "Metal",
  organic: "Organic",
  hazardous: "Hazardous",
  clothes: "Clothes",
};

const EMIRATES = ["All", "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

// Default UAE disposal sites data (seeded if DB empty)
const DEFAULT_SITES = [
  { name: "Tadweer Recycling Centre – Mussafah", emirate: "Abu Dhabi", address: "Mussafah Industrial Area, Abu Dhabi", types_accepted: ["recyclable", "plastic", "glass", "metal", "paper"], latitude: 24.3417, longitude: 54.5023, hours: "Sat-Thu 7am-5pm" },
  { name: "Al Quoz Recycling Park – Dubai", emirate: "Dubai", address: "Al Quoz Industrial Area 4, Dubai", types_accepted: ["recyclable", "e-waste", "metal", "plastic"], latitude: 25.1461, longitude: 55.2299, hours: "Mon-Sat 8am-6pm" },
  { name: "Bee'ah Recycling Complex", emirate: "Sharjah", address: "Sharjah Industrial Area 18, Sharjah", types_accepted: ["recyclable", "organic", "hazardous", "plastic"], latitude: 25.3383, longitude: 55.4287, hours: "Mon-Fri 8am-4pm" },
  { name: "Dubai Islamic Bank E-Waste Drive", emirate: "Dubai", address: "Al Barsha Mall, Dubai", types_accepted: ["e-waste"], latitude: 25.1105, longitude: 55.1932, hours: "Daily 10am-10pm" },
  { name: "Enviroserve E-Waste Centre", emirate: "Dubai", address: "Dubai Industrial City, Dubai", types_accepted: ["e-waste", "hazardous"], latitude: 24.9857, longitude: 55.1215, hours: "Sun-Thu 8am-5pm" },
  { name: "Recycle on the Go – Marina Walk", emirate: "Dubai", address: "Dubai Marina, Dubai", types_accepted: ["plastic", "glass", "paper"], latitude: 25.0765, longitude: 55.1394, hours: "Daily 24hrs" },
  { name: "Paper Recycling Station – Deira City Centre", emirate: "Dubai", address: "Deira City Centre, Dubai", types_accepted: ["paper", "recyclable"], latitude: 25.2511, longitude: 55.3309, hours: "Daily 10am-10pm" },
  { name: "Al Ain Organics Composting Facility", emirate: "Abu Dhabi", address: "Al Ain Industrial Area, Abu Dhabi", types_accepted: ["organic"], latitude: 24.2075, longitude: 55.7447, hours: "Sun-Thu 7am-3pm" },
  { name: "Sharjah Clothes Drop-off – Sahara Centre", emirate: "Sharjah", address: "Sahara Centre, Sharjah", types_accepted: ["clothes"], latitude: 25.3121, longitude: 55.3891, hours: "Daily 10am-10pm" },
  { name: "RAK Recycling Facility", emirate: "Ras Al Khaimah", address: "Al Jazeera Al Hamra, RAK", types_accepted: ["recyclable", "plastic", "metal"], latitude: 25.6724, longitude: 55.7804, hours: "Sat-Thu 8am-4pm" },
  { name: "Fujairah Municipality Waste Centre", emirate: "Fujairah", address: "Fujairah Industrial Area", types_accepted: ["recyclable", "hazardous"], latitude: 25.1167, longitude: 56.3467, hours: "Mon-Sat 7am-5pm" },
  { name: "Ajman Recycling Zone", emirate: "Ajman", address: "Ajman Industrial Area, Ajman", types_accepted: ["plastic", "glass", "metal", "paper"], latitude: 25.4052, longitude: 55.5136, hours: "Sun-Thu 8am-6pm" },
];

export default function MapPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEmirate, setFilterEmirate] = useState("All");
  const [filterType, setFilterType] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
  async function load() {
    setLoading(true);
    
    // Just fetch the data you already added to Supabase
    const { data, error } = await supabase
      .from('disposal_sites')
      .select('*');

    if (error) {
      console.error("Error fetching sites:", error);
    } else if (data) {
      setSites(data);
    }
    
    setLoading(false);
  }
  load();
}, []);

  const filtered = sites.filter(s => {
    const emirateOk = filterEmirate === "All" || s.emirate === filterEmirate;
    const typeOk = filterType === "all" || (s.types_accepted || []).includes(filterType);
    return emirateOk && typeOk;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-[hsl(178,60%,20%)] text-primary-foreground px-6 pt-10 pb-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl font-semibold">Disposal Map</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Find certified recycling & waste sites in the UAE</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 py-4 flex-1 flex flex-col gap-4">
        {/* Filters */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Emirate</p>
            <div className="flex flex-wrap gap-2">
              {EMIRATES.map(e => (
                <button
                  key={e}
                  onClick={() => setFilterEmirate(e)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    filterEmirate === e ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Waste Type</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType("all")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border", filterType === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted")}
              >All</button>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilterType(k)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border", filterType === k ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted")}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center rounded-2xl bg-muted min-h-[400px]">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm" style={{ height: "420px" }}>
            <MapContainer
              center={[24.4539, 54.3773]}
              zoom={7}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filtered.map(site => {
                const primaryType = (site.types_accepted || [])[0] || "recyclable";
                const color = TYPE_COLORS[primaryType] || "#2a9d8f";
                return (
                  <Marker
                    key={site.id}
                    position={[site.latitude, site.longitude]}
                    icon={createCustomIcon(color)}
                    eventHandlers={{ click: () => setSelected(site) }}
                  >
                    <Popup>
                      <div className="min-w-[180px]">
                        <p className="font-semibold text-sm">{site.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{site.address}</p>
                        {site.hours && <p className="text-xs text-gray-500">🕐 {site.hours}</p>}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(site.types_accepted || []).map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{TYPE_LABELS[t] || t}</span>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}

        {/* Site list */}
        <p className="text-sm text-muted-foreground">{filtered.length} site{filtered.length !== 1 ? "s" : ""} found</p>
        <div className="space-y-3 pb-4">
          {filtered.map(site => (
            <div key={site.id} className="bg-card border border-border/60 rounded-2xl px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-light flex items-center justify-center mt-0.5">
                  <MapPin size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{site.name}</p>
                  <p className="text-xs text-muted-foreground">{site.address}</p>
                  {site.hours && <p className="text-xs text-muted-foreground">🕐 {site.hours}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(site.types_accepted || []).map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">{TYPE_LABELS[t] || t}</span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">{site.emirate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}