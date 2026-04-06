"use client";

import { use, useState } from "react";
import { insertRequest } from "@/lib/supabase";
import { REQUEST_TYPES, type RequestType } from "@/lib/types";

// ─── Tab definitions ────────────────────────────────────────────────────────

type RoomTab = "services" | "amenities" | "hours" | "about" | "menu";

const TABS: { id: RoomTab; label: string; icon: string }[] = [
  { id: "services",  label: "Services",  icon: "🛎️" },
  { id: "amenities", label: "Amenities", icon: "🏊" },
  { id: "hours",     label: "Hours",     icon: "🕐" },
  { id: "about",     label: "About",     icon: "📖" },
  { id: "menu",      label: "Menu",      icon: "🍽️" },
];

// ─── Services tab ────────────────────────────────────────────────────────────

type SubmitState =
  | { kind: "idle" }
  | { kind: "loading"; type: RequestType }
  | { kind: "success"; type: RequestType }
  | { kind: "duplicate"; type: RequestType }
  | { kind: "error"; type: RequestType; message: string };

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
      setTimeout(() => setSubmitState({ kind: "idle" }), 3000);
    } else {
      setSubmitState({ kind: "error", type, message: error });
      setTimeout(() => setSubmitState({ kind: "idle" }), 4000);
    }
  };

  const activeType = submitState.kind !== "idle" ? submitState.type : null;

  return (
    <div className="p-5 space-y-4">
      {submitState.kind !== "idle" && <StatusBanner state={submitState} />}

      <p className="text-stone-500 text-sm">
        Tap a service to send your request. We&apos;ll take care of it shortly.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {REQUEST_TYPES.map(({ type, label, icon, description }) => {
          const isActive = activeType === type;
          const isLoading = submitState.kind === "loading" && isActive;
          return (
            <button
              key={type}
              onClick={() => handleRequest(type)}
              disabled={isLoading}
              className={`relative flex flex-col items-start p-4 rounded-2xl border-2 text-left
                transition-all duration-150 active:scale-95
                ${isActive
                  ? "border-brand-500 bg-brand-50 shadow-inner"
                  : "border-stone-200 bg-white hover:border-brand-300 hover:shadow-sm"}
                disabled:opacity-60`}
            >
              <span className="text-3xl mb-2">{icon}</span>
              <span className="font-semibold text-stone-800 text-sm leading-tight">{label}</span>
              <span className="text-stone-400 text-xs mt-0.5 leading-snug">{description}</span>
              {isLoading && (
                <span className="absolute top-3 right-3 w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-center text-stone-400 text-xs pt-2">
        Need immediate help? Call reception: <strong>0</strong>
        <br />
        <a href={`/room/${room}/report`} className="text-stone-500 underline underline-offset-2">
          Report a problem →
        </a>
      </p>
    </div>
  );
}

function StatusBanner({ state }: { state: Exclude<SubmitState, { kind: "idle" }> }) {
  const config = REQUEST_TYPES.find((r) => r.type === state.type)!;
  if (state.kind === "loading") return (
    <div className="px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm text-center">
      Sending your request for <strong>{config.label}</strong>...
    </div>
  );
  if (state.kind === "success") return (
    <div className="px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm text-center">
      ✓ Request for <strong>{config.label}</strong>{" "}received! We&apos;ll be right with you.
    </div>
  );
  if (state.kind === "duplicate") return (
    <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm text-center">
      Your <strong>{config.label}</strong> request is already on its way.
    </div>
  );
  return (
    <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm text-center">
      Something went wrong. Please call reception at <strong>0</strong>.
    </div>
  );
}

// ─── Amenities tab ───────────────────────────────────────────────────────────

function AmenitiesTab() {
  const amenities = [
    {
      icon: "🏊",
      name: "Outdoor Swimming Pool",
      detail: "Open daily · 6:00 AM – 10:00 PM",
      desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Piscina exterior heateada con vistas al jardín. Toallas disponibles en la piscina.",
    },
    {
      icon: "💆",
      name: "Spa & Wellness Centre",
      detail: "Open daily · 9:00 AM – 8:00 PM",
      desc: "Lorem ipsum dolor sit amet. Full-service spa offering massages, facials, and body treatments. Book at reception or call ext. 3.",
    },
    {
      icon: "🏋️",
      name: "Fitness Centre",
      detail: "Open 24 hours",
      desc: "State-of-the-art cardio and strength equipment. Personal training available on request. Access with your room key card.",
    },
    {
      icon: "🍽️",
      name: "Restaurant — The Grand Table",
      detail: "Breakfast 7–10:30 AM · Lunch 12–3 PM · Dinner 6:30–10:30 PM",
      desc: "Award-winning cuisine showcasing seasonal local produce. Reservations recommended for dinner — call ext. 4 or ask at reception.",
    },
    {
      icon: "🍸",
      name: "Bar & Lounge",
      detail: "Open daily · 12:00 PM – 1:00 AM",
      desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Extensive cocktail menu, local wines, and light snacks served throughout the day.",
    },
    {
      icon: "💼",
      name: "Business Centre",
      detail: "Open daily · 7:00 AM – 10:00 PM",
      desc: "Fully equipped with high-speed printing, scanning, and private meeting rooms. Book a meeting room at reception.",
    },
    {
      icon: "🧺",
      name: "Laundry & Dry Cleaning",
      detail: "Same-day service available before 9:00 AM",
      desc: "Place items in the laundry bag in your wardrobe. Leave at the door before 9 AM for same-day return. Pricing list in the compendium.",
    },
    {
      icon: "🚗",
      name: "Valet Parking",
      detail: "Available 24 hours · Fee applies",
      desc: "Lorem ipsum. Secure underground parking with 24-hour valet service. Request retrieval 20 minutes in advance via reception.",
    },
  ];

  return (
    <div className="p-5 space-y-3">
      <h2 className="text-lg font-bold text-stone-800">Hotel Amenities</h2>
      <p className="text-stone-500 text-xs">
        Everything available during your stay at Grand Stay Hotel.
      </p>
      {amenities.map((a) => (
        <div key={a.name} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{a.icon}</span>
            <div>
              <p className="font-semibold text-stone-800 text-sm">{a.name}</p>
              <p className="text-brand-600 text-xs font-medium">{a.detail}</p>
            </div>
          </div>
          <p className="text-stone-500 text-xs leading-relaxed pl-8">{a.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Hours tab ────────────────────────────────────────────────────────────────

function HoursTab() {
  const sections = [
    {
      title: "Stay",
      rows: [
        ["Check-in", "3:00 PM"],
        ["Check-out", "12:00 PM"],
        ["Late check-out (request)", "Subject to availability — ask reception"],
        ["Early check-in (request)", "Subject to availability — ask reception"],
      ],
    },
    {
      title: "Dining",
      rows: [
        ["Breakfast", "7:00 AM – 10:30 AM"],
        ["Lunch", "12:00 PM – 3:00 PM"],
        ["Dinner", "6:30 PM – 10:30 PM"],
        ["Room Service", "24 hours"],
        ["Bar & Lounge", "12:00 PM – 1:00 AM"],
        ["Minibar", "Stocked daily at turndown"],
      ],
    },
    {
      title: "Facilities",
      rows: [
        ["Swimming Pool", "6:00 AM – 10:00 PM"],
        ["Fitness Centre", "24 hours"],
        ["Spa & Wellness", "9:00 AM – 8:00 PM"],
        ["Business Centre", "7:00 AM – 10:00 PM"],
        ["Concierge Desk", "7:00 AM – 11:00 PM"],
        ["Valet Parking", "24 hours"],
      ],
    },
    {
      title: "Services",
      rows: [
        ["Housekeeping", "8:00 AM – 6:00 PM"],
        ["Laundry Collection", "8:00 AM – 9:00 AM (same-day)"],
        ["Laundry Return", "By 6:00 PM"],
        ["Reception", "24 hours"],
        ["Wake-up Calls", "24 hours — request via app or ext. 0"],
      ],
    },
  ];

  return (
    <div className="p-5 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Hours & Timings</h2>
      {sections.map((s) => (
        <div key={s.title}>
          <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">
            {s.title}
          </p>
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {s.rows.map(([label, value], i) => (
              <div
                key={label}
                className={`flex justify-between gap-3 px-4 py-3 text-sm
                  ${i < s.rows.length - 1 ? "border-b border-stone-100" : ""}`}
              >
                <span className="text-stone-600">{label}</span>
                <span className="text-stone-800 font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── About tab ────────────────────────────────────────────────────────────────

function AboutTab() {
  return (
    <div className="p-5 space-y-5">
      <div className="text-center py-4">
        <p className="text-4xl mb-2">🏨</p>
        <h2 className="text-xl font-bold text-stone-800">Grand Stay Hotel</h2>
        <p className="text-brand-600 text-sm font-medium">Est. 1923</p>
      </div>

      <div className="space-y-3 text-stone-600 text-sm leading-relaxed">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fundada hace más de un siglo
          en el corazón de la ciudad, el Grand Stay Hotel ha sido testigo de la historia de
          generaciones de viajeros, diplomáticos y artistas que han cruzado sus puertas.
        </p>
        <p>
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
          veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
          consequat. Our original façade, carefully restored in 2008, remains one of the most
          photographed buildings in the city.
        </p>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
          fugiat nulla pariatur. The hotel has hosted three heads of state, two Nobel laureates,
          and one very memorable jazz musician whose name we are sworn not to reveal.
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">
          Awards & Recognition
        </p>
        <div className="space-y-2">
          {[
            ["🏆", "Five Star Award", "National Hotel Association · 2019–2025"],
            ["🌿", "Green Key Certified", "Sustainable Tourism · Since 2015"],
            ["⭐", "Condé Nast Traveller", "Reader's Choice Top 50 · 2022, 2023"],
            ["🍴", "Michelin Recommended", "The Grand Table · 2018–2025"],
          ].map(([icon, title, sub]) => (
            <div key={title} className="flex items-start gap-3 bg-white rounded-xl border border-stone-200 p-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="font-semibold text-stone-800 text-sm">{title}</p>
                <p className="text-stone-400 text-xs">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-brand-50 rounded-2xl border border-brand-200 p-4 space-y-2">
        <p className="text-xs font-bold text-brand-700 uppercase tracking-widest">Contact</p>
        <div className="text-sm text-stone-700 space-y-1">
          <p>📍 1 Grand Promenade, City Centre</p>
          <p>📞 +1 (555) 100-2000</p>
          <p>✉️ concierge@grandstay.com</p>
          <p>🌐 www.grandstayhotel.com</p>
        </div>
      </div>
    </div>
  );
}

// ─── Menu tab ─────────────────────────────────────────────────────────────────

function MenuTab() {
  const specials = [
    {
      name: "Pan-Seared Seabass",
      desc: "Served with saffron beurre blanc, caperberries, and wilted samphire",
      price: "$38",
      badge: "Chef's Special",
    },
    {
      name: "Truffle Risotto",
      desc: "Carnaroli rice, aged Parmigiano, black truffle shavings, chive oil",
      price: "$32",
      badge: "Vegetarian",
    },
    {
      name: "Wagyu Beef Tartare",
      desc: "Hand-cut Wagyu, quail egg, cornichon, mustard cream, brioche toast",
      price: "$28",
      badge: "New",
    },
  ];

  const menu = [
    {
      category: "Breakfast",
      items: [
        ["Continental Basket", "Assorted pastries, fruit, yoghurt, juice", "$18"],
        ["Full Grand Breakfast", "Eggs your way, smoked bacon, grilled tomato, hash brown", "$26"],
        ["Avocado Toast", "Sourdough, smashed avocado, poached egg, chilli flakes", "$19"],
        ["Bircher Muesli", "Overnight oats, apple, walnut, honey", "$14"],
        ["Pancake Stack", "Buttermilk pancakes, maple syrup, berries, crème fraîche", "$17"],
      ],
    },
    {
      category: "Starters",
      items: [
        ["Soup of the Day", "Ask your server · served with sourdough", "$12"],
        ["Burrata & Heirloom Tomatoes", "Basil oil, aged balsamic, flaked salt", "$16"],
        ["Smoked Salmon Blini", "Crème fraîche, capers, dill, lemon", "$19"],
        ["Crispy Calamari", "Aioli, lemon wedge, micro herbs", "$17"],
      ],
    },
    {
      category: "Mains",
      items: [
        ["Pan-Seared Seabass", "Saffron beurre blanc, caperberries, samphire", "$38"],
        ["Grilled Chicken Supreme", "Roasted garlic jus, green beans, fondant potato", "$34"],
        ["Wagyu Sirloin 200g", "Truffle butter, frites, béarnaise", "$58"],
        ["Truffle Risotto", "Carnaroli, Parmigiano, black truffle", "$32"],
        ["Roasted Cauliflower Steak", "Harissa, pomegranate, tahini, crispy chickpeas", "$28"],
      ],
    },
    {
      category: "Desserts",
      items: [
        ["Warm Chocolate Fondant", "Vanilla bean ice cream, cocoa dust", "$14"],
        ["Crème Brûlée", "Classic vanilla, tuile biscuit", "$13"],
        ["Cheese Selection", "Three artisan cheeses, quince, crackers", "$18"],
        ["Seasonal Sorbet", "Three scoops, ask server for today's flavours", "$11"],
      ],
    },
    {
      category: "Room Service",
      items: [
        ["Club Sandwich", "Toasted triple-decker, frites, coleslaw", "$22"],
        ["Margherita Pizza", "San Marzano tomato, fior di latte, basil", "$20"],
        ["Caesar Salad", "Romaine, Parmesan, anchovy, house-made dressing", "$18"],
        ["Cheese Burger", "Aged beef, cheddar, lettuce, tomato, pickle, frites", "$24"],
      ],
    },
  ];

  return (
    <div className="p-5 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Menu & Specials</h2>

      {/* Today's specials */}
      <div>
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">
          Today&apos;s Specials
        </p>
        <div className="space-y-2">
          {specials.map((s) => (
            <div
              key={s.name}
              className="bg-brand-50 border border-brand-200 rounded-2xl p-4 space-y-1"
            >
              <div className="flex justify-between items-start gap-2">
                <p className="font-bold text-stone-800 text-sm">{s.name}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full">
                    {s.badge}
                  </span>
                  <span className="font-bold text-stone-800 text-sm">{s.price}</span>
                </div>
              </div>
              <p className="text-stone-500 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-2 text-center">
          To order, call Room Service: <strong>ext. 4</strong>
        </p>
      </div>

      {/* Full menu */}
      {menu.map((section) => (
        <div key={section.category}>
          <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">
            {section.category}
          </p>
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {section.items.map(([name, desc, price], i) => (
              <div
                key={name}
                className={`px-4 py-3 space-y-0.5
                  ${i < section.items.length - 1 ? "border-b border-stone-100" : ""}`}
              >
                <div className="flex justify-between gap-2">
                  <p className="font-semibold text-stone-800 text-sm">{name}</p>
                  <p className="font-semibold text-stone-700 text-sm shrink-0">{price}</p>
                </div>
                <p className="text-stone-400 text-xs leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
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
    <main className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-brand-600 text-white px-6 py-4 shadow-md">
        <p className="text-brand-100 text-sm font-medium">Grand Stay Hotel</p>
        <h1 className="text-2xl font-bold mt-0.5">Room {room}</h1>
      </header>

      {/* Scrollable content — padded bottom to clear the tab bar */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === "services"  && <ServicesTab room={room} />}
        {activeTab === "amenities" && <AmenitiesTab />}
        {activeTab === "hours"     && <HoursTab />}
        {activeTab === "about"     && <AboutTab />}
        {activeTab === "menu"      && <MenuTab />}
      </div>

      {/* Fixed bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex z-20">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors
              ${activeTab === id
                ? "text-brand-600 border-t-2 border-brand-600 -mt-px"
                : "text-stone-400 border-t-2 border-transparent -mt-px"}`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
