import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBimtekMagangBilling,
  getBimtekMagangApplications,
  getBimtekMagangPaymentProof,
  rejectBimtekMagangPayment,
  verifyBimtekMagangPayment,
} from "../../services/adminServices";
import ActionAlert from "../../components/ActionAlert";

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function getTariffEstimate(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = Date.parse(`${startDate.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${endDate.slice(0, 10)}T00:00:00Z`);
  const durationDays = Math.floor((end - start) / 86400000) + 1;
  let amount = null;
  if (durationDays >= 1 && durationDays <= 7) amount = 200000;
  else if (durationDays <= 14 && durationDays >= 8) amount = 300000;
  else if (durationDays <= 30 && durationDays >= 15) amount = 500000;
  else if (durationDays <= 90 && durationDays >= 31) amount = 1000000;
  return { durationDays, amount };
}

async function fetchMagangApplications() {
  const response = await getBimtekMagangApplications();
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Gagal memuat pengajuan magang.");
  return (json.data ?? []).filter((application) => application.request_type === "magang");
}

export default function BimtekMagangBilling() {
  const [applications, setApplications] = useState([]);
  const [ebillingCodes, setEbillingCodes] = useState({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState("");
  const [paymentReview, setPaymentReview] = useState(null);

  const loadApplications = useCallback(async () => {
    try {
      setApplications(await fetchMagangApplications());
      setError("");
    } catch (loadError) {
      setError(loadError.message ?? "Gagal memuat pengajuan magang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchMagangApplications()
      .then((result) => {
        if (active) {
          setApplications(result);
          setError("");
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message ?? "Gagal memuat pengajuan magang.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return applications;
    return applications.filter((application) => {
      const user = application.user_info ?? {};
      return [
        user.fullname,
        user.institution,
        user.email,
        application.topic,
        application.status,
        application.billing?.ebilling_code,
      ].some((value) => String(value ?? "").toLocaleLowerCase("id-ID").includes(query));
    });
  }, [applications, search]);

  const issueBilling = async (application) => {
    const ebillingCode = (ebillingCodes[application.id] ?? "").trim();
    if (!ebillingCode) {
      setError("Masukkan kode e-billing dari kanal pembayaran resmi.");
      return;
    }
    setActioning(`${application.id}-billing`);
    setError("");
    setSuccess("");
    try {
      const response = await createBimtekMagangBilling(application.id, ebillingCode);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Gagal menerbitkan tagihan.");
      setSuccess("Tagihan berhasil diterbitkan. Kode e-billing dan nominal dapat dilihat pelanggan.");
      setEbillingCodes((current) => ({ ...current, [application.id]: "" }));
      await loadApplications();
    } catch (actionError) {
      setError(actionError.message ?? "Gagal menerbitkan tagihan.");
    } finally {
      setActioning("");
    }
  };

  const openPaymentProof = async (application) => {
    const preview = window.open("about:blank", "_blank");
    if (!preview) {
      setError("Izinkan pop-up di browser untuk membuka bukti pembayaran.");
      return;
    }
    setError("");
    try {
      const response = await getBimtekMagangPaymentProof(application.id);
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Gagal membuka bukti pembayaran.");
      }
      const objectUrl = window.URL.createObjectURL(await response.blob());
      preview.opener = null;
      preview.location.href = objectUrl;
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
    } catch (actionError) {
      preview.close();
      setError(actionError.message ?? "Gagal membuka bukti pembayaran.");
    }
  };

  const reviewPayment = async () => {
    if (!paymentReview) return;
    const { application, verified } = paymentReview;
    const action = verified ? "memverifikasi" : "menolak";
    setActioning(`${application.id}-payment`);
    setError("");
    setSuccess("");
    try {
      const response = verified
        ? await verifyBimtekMagangPayment(application.id)
        : await rejectBimtekMagangPayment(application.id);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? `Gagal ${action} pembayaran.`);
      setSuccess(verified
        ? "Pembayaran berhasil diverifikasi."
        : "Bukti pembayaran ditolak. Pelanggan dapat mengunggah bukti yang benar.");
      setPaymentReview(null);
      await loadApplications();
    } catch (actionError) {
      setError(actionError.message ?? `Gagal ${action} pembayaran.`);
      setPaymentReview(null);
    } finally {
      setActioning("");
    }
  };

  const awaitingBillingCount = applications.filter(
    (application) => application.status === "Menunggu Verifikasi" && !application.billing,
  ).length;
  const awaitingPaymentReviewCount = applications.filter(
    (application) => application.billing?.payment_status === "awaiting_verification",
  ).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-[#233B6E]">Pembayaran Magang / Penelitian</h1>
        <p className="mt-1 text-sm text-gray-500">
          Terbitkan tagihan dengan kode e-billing dan verifikasi bukti pembayaran pada halaman terpisah.
        </p>
      </header>

      <ActionAlert type="error" message={error} onClose={() => setError("")} />
      <ActionAlert type="success" message={success} onClose={() => setSuccess("")} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Menunggu kode e-billing</p>
          <p className="mt-1 text-2xl font-bold text-[#233B6E]">{awaitingBillingCount}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Menunggu verifikasi pembayaran</p>
          <p className="mt-1 text-2xl font-bold text-[#233B6E]">{awaitingPaymentReviewCount}</p>
        </div>
      </div>

      <label className="block">
        <span className="sr-only">Cari pengajuan magang</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama, instansi, topik, kode e-billing, atau status..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#415F9D] focus:ring-2 focus:ring-[#415F9D]/20"
        />
      </label>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Memuat tagihan magang...
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          {applications.length === 0
            ? "Belum ada pengajuan magang/penelitian."
            : "Tidak ada pengajuan yang cocok dengan pencarian."}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => {
            const user = application.user_info ?? {};
            const billing = application.billing;
            const waitingForBilling = application.status === "Menunggu Verifikasi" && !billing;
            const waitingForPaymentReview = billing?.payment_status === "awaiting_verification";
            const estimate = getTariffEstimate(application.start_date, application.end_date);
            return (
              <article key={application.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-[#233B6E]">{user.fullname ?? "Customer"}</h2>
                      <span className="rounded-full bg-[#EEF0F8] px-3 py-1 text-xs font-semibold text-[#233B6E]">
                        {application.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{user.institution || "Instansi tidak dicantumkan"}</p>
                    <p className="mt-1 text-xs text-gray-500">{user.email ?? ""}{user.phone ? ` · ${user.phone}` : ""}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{application.topic}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      Periode: {formatDate(application.start_date)} – {formatDate(application.end_date)}
                    </p>
                  </div>

                  <div className="w-full rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm lg:max-w-md">
                    {waitingForBilling ? (
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-[#233B6E]">Penerbitan tagihan</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Masukkan kode e-billing resmi. Nominal tagihan dihitung otomatis berdasarkan durasi pengajuan.
                          </p>
                        </div>
                        {estimate && (
                          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#415F9D]">Estimasi tarif · {estimate.durationDays} hari</p>
                            <p className="mt-0.5 text-lg font-extrabold text-[#233B6E]">
                              {estimate.amount === null ? "Durasi di luar tarif" : formatRupiah(estimate.amount)}
                            </p>
                            <p className="mt-1 text-[11px] leading-4 text-gray-500">
                              Nilai akhir dihitung server berdasarkan durasi pengajuan.
                            </p>
                          </div>
                        )}
                        <input
                          type="text"
                          value={ebillingCodes[application.id] ?? ""}
                          maxLength={100}
                          onChange={(event) => setEbillingCodes((current) => ({
                            ...current,
                            [application.id]: event.target.value,
                          }))}
                          placeholder="Kode e-billing"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#415F9D]"
                        />
                        <button
                          type="button"
                          disabled={actioning === `${application.id}-billing` || !(ebillingCodes[application.id] ?? "").trim()}
                          onClick={() => issueBilling(application)}
                          className="rounded-lg bg-[#233B6E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a2d56] disabled:opacity-50"
                        >
                          {actioning === `${application.id}-billing` ? "Menerbitkan..." : "Terbitkan tagihan"}
                        </button>
                      </div>
                    ) : billing ? (
                      <div>
                        <h3 className="font-semibold text-[#233B6E]">Detail tagihan</h3>
                        <p className="mt-2 text-xs text-gray-600">
                          Kode e-billing: <strong className="break-all text-gray-800">{billing.ebilling_code}</strong>
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          Durasi {billing.duration_days} hari · {formatRupiah(billing.total_amount)}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">Status pembayaran: {billing.payment_status}</p>
                        {waitingForPaymentReview ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {billing.proof_available && (
                              <button
                                type="button"
                                onClick={() => openPaymentProof(application)}
                                className="rounded-lg border border-[#233B6E] px-3 py-2 text-xs font-semibold text-[#233B6E] hover:bg-[#EEF0F8]"
                              >
                                Lihat bukti pembayaran
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={actioning === `${application.id}-payment`}
                              onClick={() => setPaymentReview({ application, verified: true })}
                              className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Verifikasi pembayaran
                            </button>
                            <button
                              type="button"
                              disabled={actioning === `${application.id}-payment`}
                              onClick={() => setPaymentReview({ application, verified: false })}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Tolak pembayaran
                            </button>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-gray-500">
                            {billing.payment_status === "rejected"
                              ? "Bukti ditolak; menunggu pelanggan mengunggah ulang."
                              : billing.payment_status === "paid"
                                ? "Pembayaran telah diverifikasi."
                                : "Menunggu pelanggan membayar dan mengunggah bukti."}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Tidak ada tindakan pembayaran untuk status pengajuan ini.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => { setLoading(true); loadApplications(); }}
        disabled={loading}
        className="rounded-lg border border-[#233B6E] px-4 py-2 text-sm font-semibold text-[#233B6E] hover:bg-[#EEF0F8] disabled:opacity-50"
      >
        Muat ulang
      </button>

      {paymentReview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actioning) setPaymentReview(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="payment-review-title"
            aria-describedby="payment-review-description"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className={`p-5 text-white ${paymentReview.verified ? "bg-[#233B6E]" : "bg-red-700"}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                {paymentReview.verified ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                    <path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                    <path d="M5 5l14 14M19 5 5 19"/><circle cx="12" cy="12" r="9"/>
                  </svg>
                )}
              </span>
              <h2 id="payment-review-title" className="mt-3 text-lg font-bold">
                {paymentReview.verified ? "Verifikasi pembayaran?" : "Tolak bukti pembayaran?"}
              </h2>
              <p id="payment-review-description" className="mt-1 text-sm leading-5 text-white/80">
                {paymentReview.verified
                  ? "Pastikan bukti pembayaran telah diperiksa dan sesuai sebelum melanjutkan."
                  : "Bukti akan ditandai ditolak. Pelanggan perlu mengunggah ulang bukti pembayaran."}
              </p>
            </div>
            <div className="space-y-3 p-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Pemohon</p>
                <p className="mt-0.5 font-semibold text-gray-900">
                  {paymentReview.application.user_info?.fullname ?? "Customer"}
                </p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Kode e-billing</p>
                    <p className="mt-0.5 break-all font-mono text-sm font-semibold text-[#233B6E]">
                      {paymentReview.application.billing?.ebilling_code}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-right text-sm font-bold text-[#233B6E]">
                    {formatRupiah(paymentReview.application.billing?.total_amount)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={actioning === `${paymentReview.application.id}-payment`}
                  onClick={() => setPaymentReview(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  autoFocus
                  disabled={actioning === `${paymentReview.application.id}-payment`}
                  onClick={reviewPayment}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                    paymentReview.verified ? "bg-green-700 hover:bg-green-800" : "bg-red-700 hover:bg-red-800"
                  }`}
                >
                  {actioning === `${paymentReview.application.id}-payment`
                    ? "Memproses..."
                    : paymentReview.verified ? "Ya, verifikasi pembayaran" : "Ya, tolak bukti"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
