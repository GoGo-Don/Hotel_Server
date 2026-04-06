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
    label: "Call Me Back",
    icon: "📞",
    description: "Reception will call your room",
  },
  {
    type: "maintenance",
    label: "Maintenance",
    icon: "🔧",
    description: "Report a technical issue",
  },
];
