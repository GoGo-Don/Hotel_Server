import type { ServiceRequest } from "@/lib/types";

export function StatusBadge({ status }: { status: ServiceRequest["status"] }) {
  const styles: Record<ServiceRequest["status"], string> = {
    pending:     "bg-brand-100 text-brand-700",
    in_progress: "bg-amber-100 text-amber-700",
    done:        "bg-teal-50 text-teal-700",
  };
  const labels: Record<ServiceRequest["status"], string> = {
    pending:     "Pending",
    in_progress: "In Progress",
    done:        "Done",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
