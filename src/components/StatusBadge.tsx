export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "badge-open",
    PENDING: "badge-pending",
    CONFIRMED: "badge-confirmed",
    COMPLETED: "badge-completed",
    CANCELLED: "badge-cancelled",
    REJECTED: "badge-cancelled",
  };
  const label: Record<string, string> = {
    OPEN: "Open",
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REJECTED: "Rejected",
  };
  return <span className={map[status] ?? "badge-pending"}>{label[status] ?? status}</span>;
}
