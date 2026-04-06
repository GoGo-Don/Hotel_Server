# TeaCorp Hotels — Trio Design Review (Round 1)
**Participants:** TeaCorp Owner · Senior Developer · UX/UI Design Specialist  
**Date:** 2026-04-06  
**Context:** Rebranding from "Grand Stay Hotel" (gold luxury) to TeaCorp Hotels (corporate Bangalore)

---

## 🏨 Hotel Owner — Round 1

### Services Tab — 8 types (replace current 5)
| Service | Reason |
|---|---|
| Tea / Coffee | Kettles + coffee makers in every room — tap #1 |
| Extra Towels | High-frequency, practical |
| Room Cleaning | Keep |
| Wake-up Call | Corporate guests with early flights/meetings |
| Breakfast Order | In-house kitchen is a selling point |
| Work Desk Setup | We advertise dedicated workstations — make it requestable |
| WiFi Help | Tech park crowd; connectivity issues need instant escalation |
| Reception Callback | Rename to "Call Reception" |

Drop: Extra Pillows, Water (not priority for corporate guests).

### Info Tab content
- **Amenities**: AC, high-speed WiFi, 24/7 power backup, in-house kitchen, coffee maker & kettle, microwave, dedicated workstation, branded toiletries, CCTV, breakfast service
- **Hours**: Check-in 12:00 noon / Check-out 12:00 noon. Reception: 24/7.
- **About**: "TeaCorp Hotels brings together comfort, connectivity, and value for the corporate traveller. Located minutes from RMZ Eco World, Embassy Tech Park, and Prestige Ferns Galaxy, our properties are built around your work schedule — not around opulence."

### Menu Tab
Breakfast items + hot beverages only. If actual menu isn't ready: "Fresh breakfast served daily. Ask Reception for today's options." Do NOT ship Lorem ipsum.

### Color Scheme
- **Primary CTA**: `#FFA500` orange (brand, not gold luxury)
- **Secondary/success**: `#008069` teal
- **Background**: `#F3F5F8`
- **Body text**: `#111111`
- **Font**: Inter throughout, no serif

### Tone of Voice
Warm but efficient. Not luxury-formal, not startup-casual. "This hotel is organized and modern." Examples:
- "Request Tea / Coffee" not "Indulge in our premium beverages"
- "On its way. We'll be with you shortly." not "Your request has been received!"

### What would embarrass us in front of RMZ client
- Lorem ipsum anywhere
- "Grand Stay Hotel" in any header
- Gold color scheme (copied template, didn't care)
- No Work Desk Setup or WiFi Help
- Empty menu tab

---

## 💻 Developer — Round 1

### Tailwind brand-* Color Scale (refined from `#FFA500`)
| Token | Hex | Usage |
|---|---|---|
| brand-50 | `#FFF8F0` | Page backgrounds |
| brand-100 | `#FFE8C7` | Hover states, subtle fills |
| brand-200 | `#FFCF8A` | Borders, dividers |
| brand-300 | `#FFB347` | Disabled buttons |
| brand-400 | `#E8701A` | Primary CTA |
| brand-500 | `#CC5F0F` | Hover on CTA |
| brand-600 | `#A84D0C` | Active/pressed |
| brand-700 | `#7A3808` | Dark text on light bg |
| brand-800 | `#4F2305` | Deep headings |
| brand-900 | `#2B1200` | Near-black |

Secondary teal (`#008069`) as `teal` alias for status badges.

### File Change Order (dependency-first)
1. `src/lib/types.ts` — REQUEST_TYPES first
2. `tailwind.config.ts` — brand scale
3. `src/app/globals.css` — CSS vars
4. `src/app/staff/login/page.tsx` — wordmark
5. `src/app/staff/page.tsx` — header rebrand
6. `src/app/admin/page.tsx` — header rebrand
7. `src/app/room/[room]/page.tsx` — largest change

### Lucide Icon Mapping
| Service | Icon |
|---|---|
| tea_coffee | `Coffee` |
| water | `Droplets` |
| extra_towels | `Bath` |
| room_cleaning | `Sparkles` |
| extra_pillows | `BedDouble` |
| wake_up_call | `AlarmClock` |
| work_desk_setup | `Monitor` |
| breakfast_order | `UtensilsCrossed` |
| reception_callback | `Phone` |
| wifi_help | `Wifi` |

### DB Migration Required
```sql
-- 002_update_request_types.sql
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_type_check;
ALTER TABLE requests ADD CONSTRAINT requests_type_check
  CHECK (type IN ('tea_coffee','water','extra_towels','room_cleaning',
                  'extra_pillows','wake_up_call','work_desk_setup',
                  'breakfast_order','reception_callback','wifi_help'));
```

---

## 🎨 Design Specialist — Round 1

### Color Palette — Option A (Recommended)
- **Primary**: `#E8940A` — darkened orange, less aggressive, still warm
- **Surface tint**: `#FFF8F0` — barely-there orange tint
- Orange only for: active states, CTAs, tab indicators. Never as fill.
- Teal `#007A63` for confirmation/success states only

### Header Design
White header, 3px orange bottom border. No filled orange header.
```
bg-white border-b-[3px] border-[#E8940A] px-5 py-4 shadow-sm
```
Logo left. Room number right in `text-sm text-[#111111]/50 font-medium`.

### Service Button Cards (Apple-like)
```
bg-white rounded-2xl shadow-sm border border-[#F0F0F0]
p-5 flex flex-col items-start gap-3
active:scale-[0.97] active:shadow-none transition-all duration-100
```
Icon container: `w-10 h-10 rounded-xl bg-[#FFF3E0] items-center justify-center` — orange-tinted bg, icon in `#E8940A`. Lucide at **28px**, `strokeWidth={1.5}`.

Active: border `border-[#E8940A]`, bg `#FFFBF5`.

### Typography
```
Wordmark:  text-xl font-bold tracking-tight — "TeaCorp" + <span text-[#E8940A]>Hotels</span>
Section H: text-base font-semibold text-[#111111]
Body:      text-sm font-normal text-[#111111]/70
Caption:   text-xs font-medium text-[#111111]/40 uppercase tracking-wide
```
No serif — TeaCorp is not a boutique brand. Inter bold is modern corporate.

### Tab Bar
Height: `h-16` (64px). `bg-white border-t border-[#F0F0F0]`.
Active: icon + label in `#E8940A`, 2px orange top indicator.
Inactive: icon + label in `text-[#111111]/35`.
Icon: 22px, `strokeWidth={1.75}`. Label: 10px. Always show both.

### Aesthetic Verdict
CitizenM, not Four Seasons. Apple-minimal structure + one warm orange touch per screen. Teal only in confirmation states. Goal: "This hotel is organized and modern" — not cheap, not pretending to be luxury.

---

## Agreed Action Plan

### Immediate implementation
1. Tailwind brand scale: `#E8940A` as brand-400/500, orange family 50–900
2. Header: white bg + 3px orange border (all pages)
3. Service cards: shadow-sm, no heavy border, orange icon tile
4. Replace all emoji with Lucide SVG icons (28px, strokeWidth 1.5)
5. 3-tab nav: Services | Info | Menu
6. Fill all Lorem ipsum with real TeaCorp content
7. 8 new service types (drop Extra Pillows + Water, add Tea/Coffee, Wake-up Call, Work Desk, WiFi Help, Breakfast)
8. Wordmark: "TeaCorp**Hotels**" with Hotels in orange
9. Teal for success/done states

### Code quality fixes (from audits)
1. Extract `timeAgo`, `isOverdue`, `formatDisplayName` to `src/lib/utils.ts`
2. Extract `StatusBadge` to `src/components/StatusBadge.tsx`
3. Extract auth hook to `src/lib/hooks/useAuthSession.ts`
4. Remove `key={req.id + tick}` antipattern (use `key={req.id}`)
5. Delete `claimRequest` (duplicate of `assignRequest`)
6. Fix `insertRequest` return type (drop phantom `data` field)
7. Remove client-side `updated_at` in mutations (trigger handles it)
8. Fix admin: remove inline style override
9. Compute stats from already-fetched data (no double fetch)

### DB migration (002)
- Composite index `(status, created_at DESC)`
- `created_at` index for date range queries
- Tighten anon GRANT to INSERT only
- `get_today_stats()` RPC replacing client-side fetchStats
- CHECK constraint on type column
- Idempotent trigger DROP/CREATE
