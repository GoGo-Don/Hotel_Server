"use client";

import { use, useState } from "react";
import {
  type LucideIcon,
  Coffee, Droplets, Bath, Sparkles, AlarmClock, Monitor,
  UtensilsCrossed, Phone, Wifi, BellRing, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { insertRequest } from "@/lib/supabase";
import { REQUEST_TYPES, type RequestType } from "@/lib/types";

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Coffee, Droplets, Bath, Sparkles, AlarmClock, Monitor, UtensilsCrossed, Phone, Wifi,
};

// ─── Tab definitions ─────────────────────────────────────────────────────────

type RoomTab = "services" | "info" | "menu";

const TABS: { id: RoomTab; label: string; Icon: LucideIcon }[] = [
  { id: "services", label: "Services",  Icon: BellRing },
  { id: "info",     label: "Info",      Icon: Info },
  { id: "menu",     label: "Menu",      Icon: UtensilsCrossed },
];

// ─── Toast banner ─────────────────────────────────────────────────────────────

type SubmitState =
  | { kind: "idle" }
  | { kind: "loading"; type: RequestType }
  | { kind: "success"; type: RequestType }
  | { kind: "duplicate"; type: RequestType }
  | { kind: "error"; type: RequestType; message: string };

function ToastBanner({ state }: { state: Exclude<SubmitState, { kind: "idle" }> }) {
  const config = REQUEST_TYPES.find((r) => r.type === state.type)!;

  let className = "fixed bottom-20 left-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ";
  let message: React.ReactNode;

  if (state.kind === "loading") {
    className += "bg-stone-100 text-stone-600";
    message = <>Sending your request for <strong>{config.label}</strong>…</>;
  } else if (state.kind === "success") {
    className += "bg-green-500 text-white";
    message = <>Request for <strong>{config.label}</strong> received! We&apos;ll be right with you.</>;
  } else if (state.kind === "duplicate") {
    className += "bg-amber-400 text-white";
    message = <>Your <strong>{config.label}</strong> request is already on its way.</>;
  } else {
    className += "bg-red-500 text-white";
    message = <>Something went wrong. Please call reception at <strong>0</strong>.</>;
  }

  return <div className={className}>{message}</div>;
}

// ─── Services tab ─────────────────────────────────────────────────────────────

function ServicesTab({ room }: { room: string }) {
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const handleRequest = async (type: RequestType) => {
    if (submitState.kind === "loading") return;
    setSubmitState({ kind: "loading", type });
    const { error } = await insertRequest(room, type);
    if (!error) {
      setSubmitState({ kind: "success", type });
      setTimeout(() => setSubmitState({ kind: "idle" }), 4000);
    } else if (error === "duplicate") {
      setSubmitState({ kind: "duplicate", type });
      setTimeout(() => setSubmitState({ kind: "idle" }), 4000);
    } else {
      setSubmitState({ kind: "error", type, message: error });
      setTimeout(() => setSubmitState({ kind: "idle" }), 4000);
    }
  };

  const activeType = submitState.kind !== "idle" ? submitState.type : null;

  return (
    <div className="p-5">
      {submitState.kind !== "idle" && <ToastBanner state={submitState} />}

      <div className="grid grid-cols-2 gap-3">
        {REQUEST_TYPES.map(({ type, label, icon, description }) => {
          const isActive = activeType === type;
          const isLoading = submitState.kind === "loading" && isActive;
          const IconComponent = ICON_MAP[icon] ?? BellRing;
          return (
            <button
              key={type}
              onClick={() => handleRequest(type)}
              disabled={isLoading}
              className={`relative bg-white rounded-2xl shadow-sm border flex flex-col items-start gap-2 p-4 text-left
                active:scale-[0.97] transition-all duration-100
                ${isActive ? "border-brand-400 bg-brand-50/30" : "border-stone-100"}
                disabled:opacity-60`}
            >
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <IconComponent size={22} strokeWidth={1.5} className="text-brand-400" />
              </div>
              <span className="text-sm font-semibold text-stone-800 leading-tight">{label}</span>
              <span className="text-xs text-stone-400 leading-snug">{description}</span>
              {isLoading && (
                <span className="absolute top-3 right-3 w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Info tab (accordion) ─────────────────────────────────────────────────────

const AMENITY_PILLS = [
  "AC", "High-Speed WiFi", "24/7 Power Backup", "In-House Kitchen",
  "Coffee Maker & Kettle", "Microwave", "Dedicated Workstation",
  "Branded Toiletries", "CCTV", "Onsite Parking", "Breakfast Service",
];

const HOURS_ROWS: [string, string][] = [
  ["Check-in",    "12:00 noon"],
  ["Check-out",   "12:00 noon"],
  ["Breakfast",   "7:30 – 10:30"],
  ["Room Service","8:00 – 22:00"],
  ["Reception",   "24 hours"],
  ["Kitchen",     "7:00 – 22:00"],
];

function AccordionSection({
  title,
  defaultOpen = false,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-stone-800">{title}</span>
        {isOpen
          ? <ChevronUp size={18} strokeWidth={1.75} className="text-stone-400 transition-transform" />
          : <ChevronDown size={18} strokeWidth={1.75} className="text-stone-400 transition-transform" />
        }
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

function InfoTab() {
  const [openSection, setOpenSection] = useState<"amenities" | "hours" | "about">("amenities");

  const toggle = (section: "amenities" | "hours" | "about") => {
    setOpenSection((prev) => (prev === section ? "amenities" : section));
  };

  return (
    <div className="p-5 space-y-3">
      {/* Amenities */}
      <AccordionSection
        title="Amenities"
        isOpen={openSection === "amenities"}
        onToggle={() => toggle("amenities")}
      >
        <div className="flex flex-wrap gap-2">
          {AMENITY_PILLS.map((pill) => (
            <span
              key={pill}
              className="bg-white rounded-full px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm border border-stone-100"
            >
              {pill}
            </span>
          ))}
        </div>
      </AccordionSection>

      {/* Hours */}
      <AccordionSection
        title="Hours"
        isOpen={openSection === "hours"}
        onToggle={() => toggle("hours")}
      >
        <div>
          {HOURS_ROWS.map(([label, value], i) => (
            <div
              key={label}
              className={`flex justify-between py-2 ${i < HOURS_ROWS.length - 1 ? "border-b border-stone-100" : ""}`}
            >
              <span className="text-sm text-stone-500">{label}</span>
              <span className="text-sm font-medium text-stone-800">{value}</span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* About */}
      <AccordionSection
        title="About"
        isOpen={openSection === "about"}
        onToggle={() => toggle("about")}
      >
        <div className="space-y-3">
          <p className="text-sm font-semibold text-stone-800">TeaCorp Hotels</p>
          <p className="text-sm text-stone-500 leading-relaxed">
            A chain of corporate hotels in Bangalore, built around the working traveller. Quiet rooms,
            fast WiFi, and home-cooked meals — minutes from RMZ Eco World, Embassy Tech Park, and
            Prestige Ferns Galaxy.
          </p>
          <p className="text-sm text-stone-500 leading-relaxed">
            Whether you&apos;re here for a project sprint or a long-term posting, we&apos;re organised around
            your schedule. Comfort, connectivity, and value — no frills, no compromise.
          </p>
          <div className="pt-1 space-y-1.5">
            <p className="text-sm text-stone-600">📍 Green Glen Layout, Bellandur</p>
            <p className="text-sm text-stone-600">✉ teasquare14@gmail.com</p>
            <p className="text-sm text-stone-600">📞 +91 9606699214</p>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

// ─── Menu tab ─────────────────────────────────────────────────────────────────

const TODAY_SPECIALS = [
  {
    name: "Masala Omelette",
    badge: "Chef's Pick",
    badgeClass: "bg-brand-100 text-brand-700",
    desc: "Fluffy eggs, onions, tomato, green chilli",
    price: "₹120",
  },
  {
    name: "Filter Coffee",
    badge: "Popular",
    badgeClass: "bg-teal-100 text-teal-700",
    desc: "South Indian drip coffee, served fresh",
    price: "₹60",
  },
  {
    name: "Poha",
    badge: "Light",
    badgeClass: "bg-stone-100 text-stone-600",
    desc: "Flattened rice with mustard, curry leaves",
    price: "₹80",
  },
];

const BREAKFAST_ITEMS: [string, string][] = [
  ["Idli & Sambar",       "₹90"],
  ["Masala Dosa",         "₹110"],
  ["Bread Toast & Butter","₹60"],
  ["Boiled Eggs (2)",     "₹70"],
  ["Cornflakes & Milk",   "₹80"],
  ["Fresh Fruit Juice",   "₹70"],
];

const ALL_DAY_ITEMS: [string, string][] = [
  ["Maggi Noodles",          "₹80"],
  ["Grilled Cheese Sandwich","₹100"],
  ["Veg Fried Rice",         "₹130"],
  ["Dal & Rice",             "₹120"],
];

const BEVERAGE_ITEMS: [string, string][] = [
  ["Masala Chai (2 cups)", "₹50"],
  ["Filter Coffee",        "₹60"],
  ["Green Tea",            "₹50"],
  ["Cold Coffee",          "₹90"],
  ["Fresh Lime Soda",      "₹70"],
];

function MenuSection({
  title,
  items,
  isOpen,
  onToggle,
}: {
  title: string;
  items: [string, string][];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-stone-800">{title}</span>
        {isOpen
          ? <ChevronUp size={18} strokeWidth={1.75} className="text-stone-400" />
          : <ChevronDown size={18} strokeWidth={1.75} className="text-stone-400" />
        }
      </button>
      {isOpen && (
        <div className="px-4 pb-2">
          {items.map(([name, price], i) => (
            <div
              key={name}
              className={`flex justify-between items-center py-2.5 ${i < items.length - 1 ? "border-b border-stone-100" : ""}`}
            >
              <span className="text-sm text-stone-700">{name}</span>
              <span className="text-sm font-semibold text-stone-800">{price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuTab() {
  const hour = new Date().getHours();
  type MenuSection = "breakfast" | "allday" | "beverages";
  const defaultOpen: MenuSection = hour < 11 ? "breakfast" : "allday";
  const [openSection, setOpenSection] = useState<MenuSection>(defaultOpen);

  const toggle = (section: MenuSection) => {
    setOpenSection((prev) => (prev === section ? defaultOpen : section));
  };

  return (
    <div className="p-5 space-y-4">
      {/* Today's Specials */}
      <div>
        <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3">
          Today&apos;s Specials
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {TODAY_SPECIALS.map((s) => (
            <div
              key={s.name}
              className="min-w-[160px] bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex flex-col gap-2 shrink-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badgeClass}`}>
                  {s.badge}
                </span>
                <span className="text-sm font-bold text-stone-800">{s.price}</span>
              </div>
              <p className="text-sm font-semibold text-stone-800 leading-tight">{s.name}</p>
              <p className="text-xs text-stone-400 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Menu sections */}
      <MenuSection
        title="Breakfast (7:30–10:30)"
        items={BREAKFAST_ITEMS}
        isOpen={openSection === "breakfast"}
        onToggle={() => toggle("breakfast")}
      />
      <MenuSection
        title="All Day"
        items={ALL_DAY_ITEMS}
        isOpen={openSection === "allday"}
        onToggle={() => toggle("allday")}
      />
      <MenuSection
        title="Beverages"
        items={BEVERAGE_ITEMS}
        isOpen={openSection === "beverages"}
        onToggle={() => toggle("beverages")}
      />

      <p className="text-xs text-stone-400 text-center py-4">
        Room service available 8:00 am – 10:00 pm. Place orders at Reception or tap Call Reception above.
      </p>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function RoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = use(params);
  const [activeTab, setActiveTab] = useState<RoomTab>("services");

  return (
    <main className="min-h-screen bg-[#F3F5F8] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-[3px] border-brand-400 px-5 pt-4 pb-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">
            TeaCorp Hotels
          </p>
          <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">
            Bangalore
          </p>
        </div>
        <div className="flex items-end justify-between mt-1">
          <p className="text-2xl font-bold text-stone-900 leading-tight tracking-tight">
            Room {room}
          </p>
          <span className="text-[10px] font-medium text-brand-400 uppercase tracking-wide bg-brand-50 px-2 py-1 rounded-full">
            Guest
          </span>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === "services" && <ServicesTab room={room} />}
        {activeTab === "info"     && <InfoTab />}
        {activeTab === "menu"     && <MenuTab />}
      </div>

      {/* Fixed bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 h-16 bg-white border-t border-stone-100 shadow-[0_-1px_0_rgba(0,0,0,0.06)] flex">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5
                ${isActive ? "text-brand-400 border-t-2 border-brand-400" : "text-stone-400 border-t-2 border-transparent"}`}
            >
              <Icon size={22} strokeWidth={1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
