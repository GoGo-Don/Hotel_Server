export type RequestStatus = "pending" | "in_progress" | "done";

export type RequestType =
  | "water"
  | "towels"
  | "cleaning"
  | "extra_pillows"
  | "reception_callback"
  | "maintenance"
  | "tea_coffee"
  | "breakfast_order"
  | "wake_up_call"
  | "work_desk_setup"
  | "wifi_help"
  | "extra_towels"
  | "room_cleaning";

export interface ServiceRequest {
  id: string;
  room: string;
  type: RequestType;
  notes: string | null;
  status: RequestStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestTypeConfig {
  type: RequestType;
  label: string;
  icon: string;
  description: string;
}

export const REQUEST_TYPES: RequestTypeConfig[] = [
  { type: "tea_coffee",         label: "Tea & Coffee",    icon: "Coffee",          description: "Hot beverages from your in-room kettle" },
  { type: "water",              label: "Water",           icon: "Droplets",        description: "Bottled water delivered to your room" },
  { type: "extra_towels",       label: "Extra Towels",    icon: "Bath",            description: "Fresh towels delivered promptly" },
  { type: "room_cleaning",      label: "Room Cleaning",   icon: "Sparkles",        description: "We'll freshen up your room" },
  { type: "wake_up_call",       label: "Wake-up Call",    icon: "AlarmClock",      description: "Tell us your preferred time at reception" },
  { type: "work_desk_setup",    label: "Work Desk",       icon: "Monitor",         description: "Arrange your workspace to your needs" },
  { type: "breakfast_order",    label: "Breakfast",       icon: "UtensilsCrossed", description: "Fresh homemade breakfast, served daily" },
  { type: "reception_callback", label: "Call Reception",  icon: "Phone",           description: "We'll call your room within 5 minutes" },
  { type: "wifi_help",          label: "WiFi Help",       icon: "Wifi",            description: "Connectivity support from our team" },
];

// Kept for display of legacy DB rows — not shown on guest page
export const LEGACY_REQUEST_TYPES: RequestTypeConfig[] = [
  {
    type: "maintenance",
    label: "Maintenance",
    icon: "🔧",
    description: "Technical issue reported",
  },
];

// Staff roster shown in admin assignment dropdown.
// Edit this list to match your hotel's team.
export const STAFF_ROSTER = [
  "Reception",
  "Housekeeping",
  "F&B",
  "Maintenance",
  "Night Manager",
];

export interface AdminStats {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  avgCompletionMins: number;
}
