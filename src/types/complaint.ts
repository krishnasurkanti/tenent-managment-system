export type ComplaintCategory = "maintenance" | "noise" | "safety" | "cleanliness" | "food" | "other";
export type ComplaintStatus = "new" | "reviewed" | "resolved";

export const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string; emoji: string }[] = [
  { value: "maintenance", label: "Maintenance", emoji: "🔧" },
  { value: "noise", label: "Noise / Disturbance", emoji: "📢" },
  { value: "safety", label: "Safety", emoji: "⚠️" },
  { value: "cleanliness", label: "Cleanliness", emoji: "🧹" },
  { value: "food", label: "Food", emoji: "🍽️" },
  { value: "other", label: "Other", emoji: "💬" },
];

export type Complaint = {
  id: string;
  hostelId: string;
  hostelName?: string;
  category: ComplaintCategory;
  message: string;
  status: ComplaintStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
