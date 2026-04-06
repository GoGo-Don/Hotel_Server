export type RequestStatus = "pending" | "in_progress" | "done";

export type RequestType =
  | "water"
  | "towels"
  | "cleaning"
  | "extra_pillows"
  | "reception_callback"
  | "maintenance";

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
  {
    type: "water",
    label: "Water",
    icon: "💧",
    description: "Bottled water delivered to your room",
  },
  {
    type: "towels",
    label: "Towels",
    icon: "🛁",
    description: "Fresh towels replacement",
  },
  {
    type: "cleaning",
    label: "Room Cleaning",
    icon: "🧹",
    description: "Housekeeping service",
  },
  {
    type: "extra_pillows",
    label: "Extra Pillows",
    icon: "🛏️",
    description: "Additional pillows or bedding",
  },
  {
    type: "reception_callback",
    label: "Reception Callback",
    icon: "📞",
    description: "We'll call your room within 5 minutes.",
  },
];

// Kept for display of legacy DB rows — not shown on guest page
export const LEGACY_REQUEST_TYPES: RequestTypeConfig[] = [
  {
    type: "maintenance" as RequestType,
    label: "Maintenance",
    icon: "🔧",
    description: "Technical issue reported",
  },
];

// Staff roster shown in admin assignment dropdown.
// Edit this list to match your hotel's team.
export const STAFF_ROSTER = [
  "Reception",
  "Maria H.",
  "John K.",
  "Anna R.",
  "Sam T.",
  "Night Manager",
];

export interface AdminStats {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  avgCompletionMins: number;
}
