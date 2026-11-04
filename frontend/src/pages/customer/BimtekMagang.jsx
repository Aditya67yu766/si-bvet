import { useEffect, useState } from "react";
import {
  createBimtekMagangApplication,
  getMyBimtekMagangApplications,
  getMyBimtekMagangReplyLetter,
} from "../../services/CustomerServices";
import { resolveFileUrl } from "../../utils/fileUrl";

const DOCUMENTS = [
  { name: "identity_document", label: "KTP / KTM / Identitas Pengenal" },
  { name: "request_letter", label: "Surat Permohonan Izin Penelitian / Magang" },
  { name: "proposal_document", label: "Proposal Penelitian / Magang" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

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
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
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
      setSuccess(json.message ?? "Pengajuan berhasil dikirim.");
      setForm({ request_type: "magang", topic: "", start_date: "", end_date: "" });
      setFiles({});
      event.target.reset();
      await loadApplications();
    } catch (err) {
      setError(err.message ?? "Gagal mengirim pengajuan.");
    } finally {
      setSubmitting(false);
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

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

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
            Rencana tanggal mulai <span className="font-normal text-gray-500">(opsional)</span>
            <input type="date" value={form.start_date}
              onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2.5 font-normal text-gray-800 focus:border-[#415F9D] focus:outline-none focus:ring-2 focus:ring-[#415F9D]/20" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#233B6E]">
            Rencana tanggal selesai <span className="font-normal text-gray-500">(opsional)</span>
            <input type="date" value={form.end_date}
              onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2.5 font-normal text-gray-800 focus:border-[#415F9D] focus:outline-none focus:ring-2 focus:ring-[#415F9D]/20" />
          </label>
        </div>

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

      <section className="rounded-2xl border border-[#D3D6DB] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[#233B6E]">Riwayat Pengajuan Saya</h2>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Memuat riwayat...</p>
        ) : applications.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Belum ada pengajuan BIMTEK/Magang.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {applications.map((application) => (
              <article key={application.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[#F8F9FC] p-4">
                <div>
                  <p className="font-bold text-[#233B6E]">
                    {application.request_type === "bimtek" ? "Bimbingan Teknis" : "Magang / Penelitian"}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">{application.topic}</p>
                  <p className="mt-1 text-xs text-gray-500">Dikirim {formatDate(application.created_at)}</p>
                  {application.review_note && (
                    <p className="mt-2 text-sm text-red-700">
                      Catatan petugas: {application.review_note}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    application.status === "Berkas Terverifikasi" ? "bg-green-100 text-green-800"
                      : application.status === "Berkas Tidak Terverifikasi" ? "bg-red-100 text-red-700"
                        : application.status === "Surat Balasan Terkirim" ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                  }`}>{application.status}</span>
                  {application.reply_letter_available && (
                    <button type="button" onClick={() => openReplyLetter(application)}
                      className="rounded-lg bg-[#233B6E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a2d56]">
                      Lihat Surat Balasan Perizinan
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
