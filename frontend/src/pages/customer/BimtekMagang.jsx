import { useEffect, useRef, useState } from "react";
import {
  createBimtekMagangApplication,
  getMyBimtekMagangApplications,
  getMyBimtekMagangReplyLetter,
  uploadBimtekMagangPaymentProof,
} from "../../services/CustomerServices";
import { resolveFileUrl } from "../../utils/fileUrl";
import ActionAlert from "../../components/ActionAlert";

const DOCUMENTS = [
  { name: "identity_document", label: "KTP / KTM / Identitas Pengenal" },
  { name: "request_letter", label: "Surat Permohonan Izin Penelitian / Magang" },
  { name: "proposal_document", label: "Proposal Penelitian / Magang" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const FILE_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
const PAYMENT_PROOF_ACCEPT = ".pdf,.jpg,.jpeg,.png";

function tariffForDays(days) {
  if (days >= 1 && days <= 7) return 200000;
  if (days >= 8 && days <= 14) return 300000;
  if (days >= 15 && days <= 30) return 500000;
  if (days >= 31 && days <= 90) return 1000000;
  return null;
}

function durationInDays(start, end) {
  if (!start || !end) return null;
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  return Math.floor((endTime - startTime) / 86400000) + 1;
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "-";
}

export default function BimtekMagang() {
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({
    request_type: "magang",
    topic: "",
    start_date: "",
    end_date: "",
  });
  const [files, setFiles] = useState({});
  const [consulted, setConsulted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentFiles, setPaymentFiles] = useState({});
  const [paymentAction, setPaymentAction] = useState("");
  const historyRef = useRef(null);

  const plannedDuration = durationInDays(form.start_date, form.end_date);
  const plannedTariff = plannedDuration ? tariffForDays(plannedDuration) : null;

  const loadApplications = async () => {
    try {
      const response = await getMyBimtekMagangApplications();
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Gagal memuat pengajuan.");
      setError("");
      setApplications(json.data ?? []);
    } catch (err) {
      setError(err.message ?? "Gagal memuat pengajuan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getMyBimtekMagangApplications()
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Gagal memuat pengajuan.");
        if (active) setApplications(json.data ?? []);
      })
      .catch((err) => {
        if (active) setError(err.message ?? "Gagal memuat pengajuan.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!consulted) {
      setError("Silakan berkonsultasi terlebih dahulu dengan petugas BVET.");
      return;
    }
    if (form.request_type === "magang" && (!form.start_date || !form.end_date)) {
      setError("Tanggal mulai dan selesai wajib diisi untuk magang/penelitian.");
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    if (form.request_type === "magang" && tariffForDays(durationInDays(form.start_date, form.end_date)) === null) {
      setError("Durasi magang/penelitian harus antara 1 dan 90 hari.");
      return;
    }
    for (const document of DOCUMENTS) {
      const file = files[document.name];
      if (!file) {
        setError(`${document.label} wajib diunggah.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`Ukuran ${document.label} maksimal 10 MB.`);
        return;
      }
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    formData.append("consulted", String(consulted));
    DOCUMENTS.forEach((document) => formData.append(document.name, files[document.name]));

    setSubmitting(true);
    try {
      const response = await createBimtekMagangApplication(formData);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Gagal mengirim pengajuan.");
      setSuccess("Permohonan berhasil diajukan. Status dan pembaruan permohonan dapat dilihat pada riwayat di bawah.");
      setForm({ request_type: "magang", topic: "", start_date: "", end_date: "" });
      setFiles({});
      event.target.reset();
      await loadApplications();
      historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err.message ?? "Gagal mengirim pengajuan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadPaymentProof = async (application) => {
    const file = paymentFiles[application.id];
    if (!file) return;
    if (file.size === 0 || file.size > MAX_PROOF_SIZE) {
      setError("Ukuran bukti pembayaran harus maksimal 5 MB.");
      return;
    }
    const key = `${application.id}-payment`;
    setPaymentAction(key);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("proof", file);
      const response = await uploadBimtekMagangPaymentProof(application.id, formData);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Gagal mengunggah bukti pembayaran.");
      setPaymentFiles((current) => ({ ...current, [application.id]: null }));
      setSuccess(json.message ?? "Bukti pembayaran berhasil diunggah.");
      await loadApplications();
    } catch (err) {
      setError(err.message ?? "Gagal mengunggah bukti pembayaran.");
    } finally {
      setPaymentAction("");
    }
  };

  const openReplyLetter = async (application) => {
    const preview = window.open("about:blank", "_blank");
    if (!preview) {
      setError("Izinkan pop-up di browser untuk membuka surat balasan.");
      return;
    }
    setError("");
    try {
      const response = await getMyBimtekMagangReplyLetter(application.id);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Gagal membuka surat balasan.");
      preview.opener = null;
      preview.location.href = resolveFileUrl(json.data.url);
    } catch (err) {
      preview.close();
      setError(err.message ?? "Gagal membuka surat balasan.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl bg-[#233B6E] px-6 py-7 text-white shadow-sm sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#F5C400]">
          Layanan SI-BVET Lampung
        </p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">BIMTEK / Magang</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
          Ajukan permohonan bimbingan teknis atau magang setelah berkonsultasi mengenai topik kegiatan.
        </p>
      </header>

      <section className="rounded-2xl border border-[#D3D6DB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF7CC] text-[#233B6E]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#233B6E]">Sebelum mengisi formulir</h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Pemohon wajib berkonsultasi mengenai topik penelitian atau kegiatan magang terlebih dahulu.
          Setelah konsultasi, siapkan identitas, surat permohonan izin, dan proposal untuk diunggah.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="https://wa.me/6281379230195" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#233B6E] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1a2d56]">
            Konsultasi WhatsApp: 0813-7923-0195
          </a>
          <a href="mailto:bvetlampung@pertanian.go.id"
            className="inline-flex items-center gap-2 rounded-lg border border-[#233B6E] px-4 py-2.5 text-sm font-bold text-[#233B6E] transition hover:bg-[#EEF0F8]">
            Email bvetlampung@pertanian.go.id
          </a>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[#D3D6DB] bg-white p-5 shadow-sm sm:p-7">
        <div>
          <h2 className="text-xl font-bold text-[#233B6E]">Formulir Permohonan</h2>
          <p className="mt-1 text-sm text-gray-500">Pastikan semua berkas yang diperlukan sudah siap.</p>
        </div>

        <ActionAlert type="error" message={error} onClose={() => setError("")} />

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#233B6E]">
            Jenis Permohonan
            <select value={form.request_type}
              onChange={(event) => setForm((current) => ({ ...current, request_type: event.target.value }))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-normal text-gray-800 focus:border-[#415F9D] focus:outline-none focus:ring-2 focus:ring-[#415F9D]/20">
              <option value="magang">Magang / Penelitian</option>
              <option value="bimtek">Bimbingan Teknis (BIMTEK)</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#233B6E]">
            Topik penelitian / kegiatan
            <input required value={form.topic} maxLength={2000}
              onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
              placeholder="Tuliskan topik yang sudah dikonsultasikan"
              className="rounded-lg border border-gray-300 px-3 py-2.5 font-normal text-gray-800 focus:border-[#415F9D] focus:outline-none focus:ring-2 focus:ring-[#415F9D]/20" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#233B6E]">
            Rencana tanggal mulai {form.request_type === "magang" ? <span className="text-red-500">*</span> : <span className="font-normal text-gray-500">(opsional)</span>}
            <input type="date" value={form.start_date}
              required={form.request_type === "magang"}
              onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2.5 font-normal text-gray-800 focus:border-[#415F9D] focus:outline-none focus:ring-2 focus:ring-[#415F9D]/20" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#233B6E]">
            Rencana tanggal selesai {form.request_type === "magang" ? <span className="text-red-500">*</span> : <span className="font-normal text-gray-500">(opsional)</span>}
            <input type="date" value={form.end_date}
              required={form.request_type === "magang"}
              min={form.start_date || undefined}
              onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2.5 font-normal text-gray-800 focus:border-[#415F9D] focus:outline-none focus:ring-2 focus:ring-[#415F9D]/20" />
          </label>
        </div>
        {form.request_type === "magang" && (
          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 bg-gradient-to-r from-[#233B6E] to-[#415F9D] p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Informasi biaya</p>
                <h3 className="mt-1 text-base font-bold">Tarif Magang / Penelitian</h3>
              </div>
              {plannedTariff ? (
                <div className="rounded-xl bg-white/10 px-4 py-2 text-left sm:text-right">
                  <p className="text-[11px] text-white/70">Estimasi {plannedDuration} hari</p>
                  <p className="text-xl font-extrabold">{rupiah(plannedTariff)}</p>
                </div>
              ) : (
                <p className="max-w-xs text-xs leading-5 text-white/80">
                  Pilih tanggal mulai dan selesai untuk melihat estimasi biaya.
                </p>
              )}
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
              {[
                { range: "1–7 hari", amount: 200000, active: plannedDuration >= 1 && plannedDuration <= 7 },
                { range: "8–14 hari", amount: 300000, active: plannedDuration >= 8 && plannedDuration <= 14 },
                { range: "15–30 hari", amount: 500000, active: plannedDuration >= 15 && plannedDuration <= 30 },
                { range: "31–90 hari", amount: 1000000, active: plannedDuration >= 31 && plannedDuration <= 90 },
              ].map((tier) => (
                <div key={tier.range}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    tier.active
                      ? "border-[#233B6E] bg-[#EEF0F8] ring-1 ring-[#233B6E]/10"
                      : "border-gray-100 bg-[#F8F9FC]"
                  }`}>
                  <span className={`text-sm ${tier.active ? "font-bold text-[#233B6E]" : "text-gray-600"}`}>
                    {tier.range}
                  </span>
                  <span className={`whitespace-nowrap text-sm font-bold ${tier.active ? "text-[#233B6E]" : "text-gray-800"}`}>
                    {rupiah(tier.amount)}
                  </span>
                </div>
              ))}
            </div>
            <p className="border-t border-gray-100 px-4 py-3 text-xs leading-5 text-gray-500 sm:px-5">
              Tarif mengacu pada Peraturan Menteri Pertanian RI Nomor 29/PERMENTAN/KU.030/8/2017. Tagihan resmi diterbitkan setelah berkas diverifikasi. Durasi menghitung tanggal mulai dan selesai; nominal final ditetapkan sistem.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-bold text-[#233B6E]">Dokumen Persyaratan</h3>
          {DOCUMENTS.map((document) => (
            <label key={document.name} className="block rounded-xl border border-dashed border-[#AAB4C8] bg-[#F8F9FC] p-4">
              <span className="block text-sm font-semibold text-[#233B6E]">{document.label} <span className="text-red-500">*</span></span>
              <span className="mt-1 block text-xs text-gray-500">PDF, DOC, DOCX, JPG, JPEG, atau PNG — maksimal 10 MB.</span>
              <input required type="file" accept={FILE_ACCEPT}
                onChange={(event) => setFiles((current) => ({ ...current, [document.name]: event.target.files?.[0] }))}
                className="mt-3 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#233B6E] file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-[#1a2d56]" />
            </label>
          ))}
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-[#EEF0F8] p-4 text-sm leading-6 text-gray-700">
          <input required type="checkbox" checked={consulted}
            onChange={(event) => setConsulted(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#233B6E]" />
          <span>Saya telah berkonsultasi dengan petugas BVET Lampung mengenai topik permohonan ini.</span>
        </label>

        <button type="submit" disabled={submitting}
          className="w-full rounded-xl bg-[#233B6E] px-5 py-3.5 font-bold text-white transition hover:bg-[#1a2d56] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
          {submitting ? "Mengirim pengajuan..." : "Kirim Permohonan"}
        </button>
      </form>

      <section ref={historyRef} className="scroll-mt-6 rounded-2xl border border-[#D3D6DB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#233B6E]">Riwayat Pengajuan Saya</h2>
            <p className="mt-1 text-sm text-gray-500">Pantau status permohonan dan informasi pembayaran di sini.</p>
          </div>
        </div>
        <div className="mt-4">
          <ActionAlert type="success" message={success} onClose={() => setSuccess("")} />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Memuat riwayat...</p>
        ) : applications.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Belum ada pengajuan BIMTEK/Magang.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {applications.map((application) => (
              <article key={application.id} className="space-y-4 rounded-xl border border-gray-100 bg-[#F8F9FC] p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#233B6E]">
                      {application.request_type === "bimtek" ? "Bimbingan Teknis" : "Magang / Penelitian"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{application.topic}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                      <span>Dikirim {formatDate(application.created_at)}</span>
                      {application.request_type === "magang" && (
                        <span>{formatDate(application.start_date)} – {formatDate(application.end_date)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      application.status === "Berkas Terverifikasi" ? "bg-green-100 text-green-800"
                        : application.status === "Berkas Tidak Terverifikasi" ? "bg-red-100 text-red-800"
                          : application.status === "Surat Balasan Terkirim" ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                    }`}>{application.status}</span>
                    {application.reply_letter_available && (
                      <button type="button" onClick={() => openReplyLetter(application)}
                        className="rounded-lg bg-[#233B6E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a2d56]">
                        Lihat surat balasan
                      </button>
                    )}
                  </div>
                </div>
                {application.review_note && (
                  <div className="flex gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                    <span className="font-semibold">Catatan petugas:</span>
                    <span className="min-w-0 break-words">{application.review_note}</span>
                  </div>
                )}
                {application.billing?.payment_status === "paid" && application.reply_letter_available && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/>
                      </svg>
                    </span>
                    <div>
                      <p className="font-bold">Persiapan kunjungan ke kantor</p>
                      <p className="mt-1 text-sm leading-5">
                        Harap membawa bukti pembayaran dan surat perizinan saat datang ke kantor.
                      </p>
                    </div>
                  </div>
                )}
                {application.request_type === "magang" && application.billing && (
                  <div className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 bg-[#EEF4FF] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#415F9D]">Tagihan magang / penelitian</p>
                        <p className="mt-1 text-xs text-gray-600">Durasi {application.billing.duration_days} hari</p>
                      </div>
                      <p className="text-xl font-extrabold text-[#233B6E]">{rupiah(application.billing.total_amount)}</p>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Kode e-billing</p>
                        <p className="mt-1 break-all rounded-lg border border-dashed border-blue-200 bg-blue-50 px-3 py-2 font-mono text-sm font-bold tracking-wide text-[#233B6E]">
                          {application.billing.ebilling_code}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Gunakan kode ini pada kanal pembayaran resmi, lalu unggah bukti pembayaran.
                        </p>
                      </div>
                    {application.billing.payment_status === "paid" ? (
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-800">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">✓</span>
                        Pembayaran telah diverifikasi.
                      </div>
                    ) : application.billing.payment_status === "awaiting_verification" ? (
                      <div className="rounded-lg bg-cyan-50 px-3 py-2.5 text-sm font-medium leading-5 text-cyan-800">
                        Bukti pembayaran sudah diterima dan sedang diperiksa petugas.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {application.billing.payment_status === "rejected" && (
                          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-800">
                            Bukti sebelumnya ditolak. Silakan unggah ulang bukti yang jelas dan sesuai pembayaran.
                          </div>
                        )}
                        <label className="block rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-xs font-semibold text-[#233B6E]">
                          Unggah bukti pembayaran
                          <span className="mt-1 block font-normal leading-5 text-gray-500">PDF, JPG, atau PNG · maksimal 5 MB</span>
                          <input type="file" accept={PAYMENT_PROOF_ACCEPT}
                            onChange={(event) => setPaymentFiles((current) => ({
                              ...current,
                              [application.id]: event.target.files?.[0] ?? null,
                            }))}
                            className="mt-2 block w-full text-xs font-normal text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-[#233B6E] file:px-3 file:py-2 file:font-semibold file:text-white" />
                        </label>
                        {paymentFiles[application.id] && (
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="max-w-full truncate text-xs text-gray-600">{paymentFiles[application.id].name}</span>
                            <button type="button"
                              disabled={paymentAction === `${application.id}-payment`}
                              onClick={() => handleUploadPaymentProof(application)}
                              className="rounded-lg bg-[#233B6E] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1a2d56] disabled:opacity-50">
                              {paymentAction === `${application.id}-payment` ? "Mengunggah..." : "Kirim bukti"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
