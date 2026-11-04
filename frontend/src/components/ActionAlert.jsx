export default function ActionAlert({ type = "success", message, onClose }) {
  if (!message) return null;

  const styles = type === "error"
    ? "border-red-200 bg-red-50 text-red-800"
    : type === "info"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : "border-green-200 bg-green-50 text-green-800";
  const iconColor = type === "error"
    ? "text-red-600"
    : type === "info"
      ? "text-blue-600"
      : "text-green-600";
  const role = type === "error" ? "alert" : "status";

  return (
    <div role={role} className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-sm ${styles}`}>
      <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/80 ${iconColor}`}>
        {type === "error" ? (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M10 6v4m0 3h.01"/><circle cx="10" cy="10" r="8"/>
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="m5 10 3 3 7-7"/><circle cx="10" cy="10" r="8"/>
          </svg>
        )}
      </span>
      <p className="min-w-0 flex-1 break-words text-sm font-medium leading-5">{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Tutup notifikasi"
          className="rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="m5 5 10 10M15 5 5 15"/>
          </svg>
        </button>
      )}
    </div>
  );
}
