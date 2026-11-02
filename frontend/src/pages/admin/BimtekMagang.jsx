import { useCallback, useEffect, useState } from "react";
import {
  getBimtekMagangApplications,
  getBimtekMagangDocument,
} from "../../services/adminServices";
import { API_BASE_URL } from "../../services/api";

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
  const [downloading, setDownloading] = useState("");

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
      const apiBase = new URL(API_BASE_URL, window.location.origin);
      preview.opener = null;
      preview.location.href = new URL(json.data.url, apiBase).href;
    } catch (err) {
      preview.close();
      setError(err.message ?? "Gagal mengunduh dokumen.");
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-[#233B6E]">Pengajuan BIMTEK / Magang</h1>
        <p className="mt-1 text-sm text-gray-500">Daftar permohonan customer beserta dokumen persyaratannya.</p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Memuat pengajuan...</p>
        ) : applications.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Belum ada pengajuan BIMTEK/Magang.</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((application) => {
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
                        <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                          {application.status}
                        </span>
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
    </div>
  );
}
