import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getBimtekMagangApplications,
  getBimtekMagangDocument,
  reviewBimtekMagangApplication,
  deleteBimtekMagangApplication,
  verifyBimtekMagangApplicationWithReplyLetter,
  sendBimtekMagangReplyLetter,
} from "../../services/adminServices";
import { resolveFileUrl } from "../../utils/fileUrl";
import ActionAlert from "../../components/ActionAlert";

const DOCUMENTS = [
  { key: "identity", label: "Identitas" },
  { key: "request-letter", label: "Surat Permohonan" },
  { key: "proposal", label: "Proposal" },
];

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
}

export default function BimtekMagangApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [downloading, setDownloading] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});
  const [replyFiles, setReplyFiles] = useState({});
  const [actioning, setActioning] = useState("");
  const [search, setSearch] = useState("");
  const [deletionTarget, setDeletionTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deletionError, setDeletionError] = useState("");
  const isSuperAdmin = useLocation().pathname.startsWith("/superadmin");

  const loadApplications = useCallback(async () => {
    try {
      const response = await getBimtekMagangApplications();
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Gagal memuat pengajuan.");
      setError("");
      setApplications(json.data ?? []);
    } catch (err) {
      setError(err.message ?? "Gagal memuat pengajuan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getBimtekMagangApplications()
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

  const downloadDocument = async (application, document) => {
    const key = `${application.id}-${document.key}`;
    setDownloading(key);
    setError("");
    const preview = window.open("about:blank", "_blank");
    if (!preview) {
      setError("Izinkan pop-up di browser untuk membuka dokumen.");
      setDownloading("");
      return;
    }
    try {
      const response = await getBimtekMagangDocument(application.id, document.key);
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Gagal mengunduh dokumen.");
      }
      const json = await response.json();
      preview.opener = null;
      preview.location.href = resolveFileUrl(json.data.url);
    } catch (err) {
      preview.close();
      setError(err.message ?? "Gagal mengunduh dokumen.");
    } finally {
      setDownloading("");
    }
  };

  const reviewApplication = async (application, verified) => {
    const note = (reviewNotes[application.id] ?? "").trim();
    if (!verified && !note) {
      setError("Isi alasan berkas tidak terverifikasi terlebih dahulu.");
      return;
    }
    const replyFile = replyFiles[application.id];
    if (verified && !replyFile) {
      setError("Unggah surat balasan PDF sebelum memverifikasi pengajuan.");
      return;
    }
    if (verified && (replyFile.size === 0 || replyFile.size > 10 * 1024 * 1024 || !replyFile.name.toLowerCase().endsWith(".pdf"))) {
      setError("Surat balasan harus berupa PDF berukuran maksimal 10 MB.");
      return;
    }
    const key = `${application.id}-review`;
    setActioning(key);
    setError("");
    setSuccess("");
    try {
      let response;
      if (verified) {
        const formData = new FormData();
        formData.append("reply_letter", replyFile);
        response = await verifyBimtekMagangApplicationWithReplyLetter(application.id, formData);
      } else {
        response = await reviewBimtekMagangApplication(application.id, { verified, note });
      }
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Gagal menyimpan verifikasi.");
      setSuccess(verified
        ? "Dokumen berhasil diverifikasi dan surat balasan tersimpan."
        : "Status pengajuan diperbarui menjadi tidak terverifikasi.");
      setReviewNotes((current) => ({ ...current, [application.id]: "" }));
      setReplyFiles((current) => ({ ...current, [application.id]: null }));
      await loadApplications();
    } catch (err) {
      setError(err.message ?? "Gagal menyimpan verifikasi dan surat balasan.");
    } finally {
      setActioning("");
    }
  };

  const sendReplyLetter = async (application) => {
    const file = replyFiles[application.id];
    if (!file) {
      setError("Pilih surat balasan PDF yang akan dikirim.");
      return;
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      setError("Surat balasan harus berukuran maksimal 10 MB.");
      return;
    }
    const key = `${application.id}-reply`;
    setActioning(key);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("reply_letter", file);
      const response = await sendBimtekMagangReplyLetter(application.id, formData);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Gagal mengirim surat balasan.");
      setSuccess("Surat balasan berhasil dikirim kepada pelanggan.");
      setReplyFiles((current) => ({ ...current, [application.id]: null }));
      await loadApplications();
    } catch (err) {
      setError(err.message ?? "Gagal mengirim surat balasan.");
    } finally {
      setActioning("");
    }
  };

  const deleteApplication = async (application) => {
    setDeletionTarget(application);
    setDeletePassword("");
    setDeleteReason("");
    setDeletionError("");
  };

  const closeDeleteDialog = () => {
    if (actioning) return;
    setDeletionTarget(null);
    setDeletePassword("");
    setDeleteReason("");
    setDeletionError("");
  };

  const confirmDeleteApplication = async (event) => {
    event.preventDefault();
    if (!deletionTarget) return;

    const application = deletionTarget;
    const key = `${application.id}-delete`;
    setActioning(key);
    setDeletionError("");
    setSuccess("");
    try {
      const response = await deleteBimtekMagangApplication(application.id, {
        current_password: deletePassword,
        reason: deleteReason.trim(),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Gagal menghapus pengajuan.");
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setSuccess(json.message ?? "Pengajuan berhasil dihapus.");
      setDeletionTarget(null);
      setDeletePassword("");
      setDeleteReason("");
    } catch (err) {
      setDeletionError(err.message ?? "Gagal menghapus pengajuan.");
    } finally {
      setDeletePassword("");
      setActioning("");
    }
  };

  const normalizedSearch = search.trim().toLocaleLowerCase("id-ID");
  const filteredApplications = applications.filter((application) => {
    const user = application.user_info ?? {};
    return [
      user.fullname,
      user.institution,
      user.email,
      user.phone,
      application.request_type === "bimtek" ? "Bimbingan Teknis" : "Magang / Penelitian",
      application.topic,
      application.status,
      application.review_note,
    ].some((value) => String(value ?? "").toLocaleLowerCase("id-ID").includes(normalizedSearch));
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-[#233B6E]">Pengajuan BIMTEK / Magang</h1>
        <p className="mt-1 text-sm text-gray-500">Daftar permohonan customer beserta dokumen persyaratannya.</p>
      </header>

      <ActionAlert type="error" message={error} onClose={() => setError("")} />
      <ActionAlert type="success" message={success} onClose={() => setSuccess("")} />

      <label className="block">
        <span className="sr-only">Cari pengajuan BIMTEK/Magang</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama, instansi, jenis, topik, atau status..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#415F9D] focus:ring-2 focus:ring-[#415F9D]/20"
        />
      </label>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Memuat pengajuan...</p>
        ) : applications.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Belum ada pengajuan BIMTEK/Magang.</p>
        ) : filteredApplications.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Tidak ada pengajuan yang cocok dengan pencarian.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#EEF0F8] text-xs uppercase tracking-wide text-[#233B6E]">
                <tr>
                  <th className="px-4 py-3">Pemohon</th>
                  <th className="px-4 py-3">Jenis / Topik</th>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dokumen</th>
                  <th className="px-4 py-3">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApplications.map((application) => {
                  const user = application.user_info ?? {};
                  return (
                    <tr key={application.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-800">{user.fullname ?? "Customer"}</p>
                        <p className="mt-1 text-xs text-gray-500">{user.institution || "-"}</p>
                        <p className="mt-1 text-xs text-gray-500">{user.email ?? ""}</p>
                        <p className="mt-1 text-xs text-gray-500">{user.phone ?? ""}</p>
                      </td>
                      <td className="max-w-sm px-4 py-4">
                        <p className="font-semibold text-[#233B6E]">
                          {application.request_type === "bimtek" ? "Bimbingan Teknis" : "Magang / Penelitian"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-gray-600">{application.topic}</p>
                        <p className="mt-1 text-xs text-gray-400">Dikirim {formatDate(application.created_at)}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {formatDate(application.start_date)} – {formatDate(application.end_date)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          application.status === "Berkas Terverifikasi" ? "bg-green-100 text-green-800"
                            : application.status === "Berkas Tidak Terverifikasi" ? "bg-red-100 text-red-700"
                              : application.status === "Surat Balasan Terkirim" ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {application.status}
                        </span>
                        {application.review_note && (
                          <p className="mt-2 max-w-[220px] text-xs text-red-700">
                            Catatan: {application.review_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-2">
                          {DOCUMENTS.map((document) => {
                            const key = `${application.id}-${document.key}`;
                            return (
                              <button key={document.key} type="button"
                                disabled={downloading === key}
                                onClick={() => downloadDocument(application, document)}
                                className="text-left text-xs font-semibold text-[#233B6E] underline decoration-[#F5C400] underline-offset-2 hover:text-[#415F9D] disabled:opacity-50">
                                {downloading === key ? "Mengunduh..." : `Unduh ${document.label}`}
                              </button>
                            );
                          })}
                          {application.reply_letter_available && (
                            <button type="button"
                              disabled={downloading === `${application.id}-reply-letter`}
                              onClick={() => downloadDocument(application, { key: "reply-letter", label: "Surat Balasan" })}
                              className="text-left text-xs font-bold text-green-700 underline decoration-green-300 underline-offset-2 disabled:opacity-50">
                              {downloading === `${application.id}-reply-letter` ? "Membuka..." : "Lihat Surat Balasan"}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="min-w-[240px] px-4 py-4">
                        <div className="space-y-3">
                          {application.status === "Menunggu Verifikasi" ? (
                            application.request_type === "magang" ? (
                                <div className="space-y-2">
                                  <Link to={`${isSuperAdmin ? "/superadmin" : "/admin"}/bimtek-magang/pembayaran`}
                                    className="inline-flex rounded-lg bg-[#233B6E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a2d56]">
                                    Kelola e-billing dan pembayaran
                                  </Link>
                                  <textarea value={reviewNotes[application.id] ?? ""}
                                    onChange={(event) => setReviewNotes((current) => ({
                                      ...current,
                                      [application.id]: event.target.value,
                                    }))}
                                    maxLength={2000}
                                    placeholder="Alasan jika berkas tidak terverifikasi"
                                    className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-[#415F9D] focus:outline-none" />
                                  <button type="button" disabled={actioning === `${application.id}-review`}
                                    onClick={() => reviewApplication(application, false)}
                                    className="rounded-lg bg-[#F5C400] px-3 py-2 text-xs font-semibold text-[#233B6E] hover:bg-[#e0b300] disabled:opacity-50">
                                    Tidak Terverifikasi
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <textarea value={reviewNotes[application.id] ?? ""}
                                    onChange={(event) => setReviewNotes((current) => ({
                                      ...current,
                                      [application.id]: event.target.value,
                                    }))}
                                    maxLength={2000}
                                    placeholder="Alasan jika berkas tidak terverifikasi"
                                    className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-[#415F9D] focus:outline-none" />
                                  <label className="block text-xs font-semibold text-[#233B6E]">
                                    Surat balasan PDF (wajib saat verifikasi)
                                    <input type="file" accept=".pdf,application/pdf"
                                      onChange={(event) => setReplyFiles((current) => ({
                                        ...current,
                                        [application.id]: event.target.files?.[0] ?? null,
                                      }))}
                                      className="mt-1 block w-full text-xs font-normal text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-[#EEF0F8] file:px-2 file:py-1.5 file:font-semibold file:text-[#233B6E]" />
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button"
                                      disabled={actioning === `${application.id}-review`}
                                      onClick={() => reviewApplication(application, true)}
                                      className="rounded-lg bg-[#233B6E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a2d56] disabled:opacity-50">
                                      Verifikasi
                                    </button>
                                    <button type="button" disabled={actioning === `${application.id}-review`}
                                      onClick={() => reviewApplication(application, false)}
                                      className="rounded-lg bg-[#F5C400] px-3 py-2 text-xs font-semibold text-[#233B6E] hover:bg-[#e0b300] disabled:opacity-50">
                                      Tidak Terverifikasi
                                    </button>
                                  </div>
                                </div>
                              )
                          ) : application.status === "Berkas Terverifikasi" ? (
                            <div className="space-y-2">
                              <label className="block text-xs font-semibold text-[#233B6E]">
                                Surat balasan PDF
                                <input type="file" accept=".pdf,application/pdf"
                                  onChange={(event) => setReplyFiles((current) => ({
                                    ...current,
                                    [application.id]: event.target.files?.[0] ?? null,
                                  }))}
                                  className="mt-1 block w-full text-xs font-normal text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-[#EEF0F8] file:px-2 file:py-1.5 file:font-semibold file:text-[#233B6E]" />
                              </label>
                              <button type="button" disabled={actioning === `${application.id}-reply`}
                                onClick={() => sendReplyLetter(application)}
                                className="rounded-lg bg-[#233B6E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a2d56] disabled:opacity-50">
                                {actioning === `${application.id}-reply` ? "Mengirim..." : "Kirim Surat Balasan"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Tidak ada tindakan tersedia.</span>
                          )}
                          <button
                            type="button"
                            disabled={actioning === `${application.id}-delete`}
                            onClick={() => deleteApplication(application)}
                            className="rounded-lg border border-[#233B6E] px-3 py-2 text-xs font-semibold text-[#233B6E] hover:bg-[#EEF0F8] disabled:opacity-50"
                          >
                            {actioning === `${application.id}-delete` ? "Menghapus..." : "Hapus pengajuan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <button type="button" onClick={() => { setLoading(true); loadApplications(); }} disabled={loading}
        className="rounded-lg border border-[#233B6E] px-4 py-2 text-sm font-semibold text-[#233B6E] hover:bg-[#EEF0F8] disabled:opacity-50">
        Muat ulang
      </button>
      {deletionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog();
          }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-application-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="delete-application-title" className="text-lg font-bold text-red-800">
              Hapus pengajuan secara permanen?
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Pengajuan #{deletionTarget.id}, tagihan/e-billing jika sudah terbit, bukti pembayaran, dan berkas terkait akan dihapus dari SI-BVET. Tindakan ini tidak membatalkan atau mengembalikan pembayaran pada kanal resmi.
              {deletionTarget.billing?.payment_status === "paid" && " Tagihan tercatat sudah dibayar."}
            </p>
            <ActionAlert type="error" message={deletionError} />
            <form className="mt-5 space-y-4" onSubmit={confirmDeleteApplication}>
              <label className="block text-sm font-semibold text-gray-700">
                Alasan penghapusan
                <textarea value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)}
                  maxLength={500} required rows={3}
                  placeholder="Contoh: permohonan duplikat berdasarkan permintaan pemohon"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm font-normal focus:border-[#415F9D] focus:outline-none focus:ring-2 focus:ring-[#415F9D]/20" />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Password akun admin yang sedang login
                <input type="password" value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  autoComplete="current-password" required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal focus:border-[#415F9D] focus:outline-none focus:ring-2 focus:ring-[#415F9D]/20" />
              </label>
              <p className="text-xs text-gray-500">
                Password diverifikasi terhadap akun Anda dan tidak disimpan dalam log. Aksi ini tercatat pada log aktivitas.
              </p>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" disabled={Boolean(actioning)}
                  onClick={closeDeleteDialog}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Batal
                </button>
                <button type="submit" disabled={Boolean(actioning) || !deletePassword || !deleteReason.trim()}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">
                  {actioning === `${deletionTarget.id}-delete` ? "Menghapus..." : "Verifikasi dan hapus"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
