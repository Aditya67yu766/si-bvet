import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUnverifiedCustomers, verifyUser, rejectUser, createCustomerAccount } from "../../services/superAdminServices";
import { apiFetch } from "../../services/api";
import StatusBadge from "../../components/StatusBadge";
​
const getDocUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const apiBase = (import.meta.env.VITE_API_URL ?? "http://localhost:8080/api").replace(/\/$/, "");
  const origin = apiBase.replace(/\/api\/?$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean.startsWith("/api/")) return `${origin}${clean}`;
  return `${apiBase}${clean}`;
};
​
const PER_PAGE = 10;
​
const FILTER_OPTIONS = [
  { value: "all",      label: "Semua" },
  { value: "pending",  label: "Belum Verifikasi" },
  { value: "approved", label: "Sudah Verifikasi" },
  { value: "rejected", label: "Ditolak" },
];
​
function getStatusKey(customer) {
  if (customer._localRejected) return "rejected";
  if (customer._localVerified || customer.is_verified) return "approved";
  return "pending";
}
​
function PaginationBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded border text-xs
        font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? "bg-[#233B6E] text-white border-[#233B6E]"
          : "border-gray-200 hover:bg-gray-100 text-gray-600"}`}>
      {children}
    </button>
  );
}
​
function FormField({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}<span className="text-red-400 ml-0.5">*</span>
      </span>
      {children}
    </label>
  );
}

function FormTambahPelanggan({ onBack, onSuccess }) {
  const [form, setForm] = useState({
    fullname: "", email: "", phone: "",
    password: "", confirmPassword: "", institution: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
​
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.fullname.trim()) return setError("Nama lengkap wajib diisi.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setError("Format email tidak valid.");
    if (!form.phone.trim()) return setError("No. telepon wajib diisi.");
    if (!form.institution.trim()) return setError("Instansi wajib diisi.");
    if (form.password.length < 8) return setError("Kata sandi minimal 8 karakter.");
    if (form.password !== form.confirmPassword)
      return setError("Konfirmasi kata sandi tidak cocok.");
    setSaving(true);
    try {
      const res = await createCustomerAccount({
        fullname: form.fullname,
        email: form.email,
        phone: form.phone,
        password: form.password,
        institution: form.institution,
      });
      let body = {};
      try { body = await res.json(); } catch {}
      if (!res.ok) throw new Error(body.error ?? body.message ?? "Gagal menambahkan akun.");
      onSuccess("Akun pelanggan berhasil ditambahkan.");
    } catch (err) {
      setError(err.message ?? "Gagal menambahkan akun.");
    } finally {
      setSaving(false);
    }
  };
​
  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]";
​
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-[#233B6E]" />
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="font-bold text-[#233B6E] text-base">Tambah Akun Pelanggan</h2>
      </div>
​
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}
              className="opacity-60 hover:opacity-100 flex-shrink-0">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
        )}
​
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nama Lengkap">
            <input value={form.fullname} onChange={set("fullname")}
              placeholder="Masukkan nama lengkap" className={inputCls} />
          </FormField>
          <FormField label="Email">
            <input type="email" value={form.email} onChange={set("email")}
              placeholder="nama@email.com" className={inputCls} />
          </FormField>
          <FormField label="No. Telepon">
            <input value={form.phone} onChange={set("phone")}
              placeholder="08XXXXXXXXXX" className={inputCls} />
          </FormField>
          <FormField label="Instansi">
            <input value={form.institution} onChange={set("institution")}
              placeholder="Nama instansi" className={inputCls} />
          </FormField>
          <FormField label="Kata Sandi">
            <input type="password" value={form.password} onChange={set("password")}
              placeholder="Minimal 8 karakter" className={inputCls} />
          </FormField>
          <FormField label="Konfirmasi Kata Sandi">
            <input type="password" value={form.confirmPassword}
              onChange={set("confirmPassword")} placeholder="Ulangi kata sandi" className={inputCls} />
          </FormField>
        </div>
​
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Menyimpan...
              </>
            ) : "Simpan Akun"}
          </button>
        </div>
      </form>
    </div>
  );
}
​
export default function RegistrasiPelanggan() {
  const navigate = useNavigate();
​
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [filter, setFilter]             = useState("all");
  const [page, setPage]                 = useState(1);
  const [sort, setSort]                 = useState("terbaru");
  const [actionStatus, setActionStatus] = useState({});
  const [actionMsg, setActionMsg]       = useState({});
​
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile,      setImportFile]      = useState(null);
  const [importing,       setImporting]       = useState(false);
  const [importResult,    setImportResult]    = useState(null);
  const [importError,     setImportError]     = useState("");
​
  const [showAdd, setShowAdd] = useState(false);
  const [flashOk, setFlashOk] = useState("");
​
  useEffect(() => { fetchData(); }, []);
​
  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res  = await getUnverifiedCustomers();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat data.");
      setAllCustomers(json.customers ?? json.data ?? []);
    } catch (err) {
      setError(err.message ?? "Gagal memuat data registrasi.");
    } finally {
      setLoading(false);
    }
  };
​
  const handleVerify = async (customer) => {
    setActionStatus(p => ({ ...p, [customer.id]: "loading" }));
    setActionMsg(p => ({ ...p, [customer.id]: "" }));
    try {
      const res  = await verifyUser(customer.id);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memverifikasi.");
      setAllCustomers(prev =>
        prev.map(c => c.id === customer.id
          ? { ...c, _localVerified: true, _localRejected: false } : c)
      );
      setActionStatus(p => ({ ...p, [customer.id]: "verified" }));
      setActionMsg(p => ({ ...p, [customer.id]: "Berhasil diverifikasi" }));
    } catch (err) {
      setActionStatus(p => ({ ...p, [customer.id]: "error" }));
      setActionMsg(p => ({ ...p, [customer.id]: err.message }));
    }
  };
​
  const handleReject = async (customer) => {
    setActionStatus(p => ({ ...p, [customer.id]: "loading" }));
    setActionMsg(p => ({ ...p, [customer.id]: "" }));
    try {
      const res  = await rejectUser(customer.id);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menolak.");
      setAllCustomers(prev =>
        prev.map(c => c.id === customer.id
          ? { ...c, _localRejected: true, _localVerified: false } : c)
      );
      setActionStatus(p => ({ ...p, [customer.id]: "rejected" }));
      setActionMsg(p => ({ ...p, [customer.id]: "Akun ditolak" }));
    } catch (err) {
      setActionStatus(p => ({ ...p, [customer.id]: "error" }));
      setActionMsg(p => ({ ...p, [customer.id]: err.message }));
    }
  };
​
  const handleImport = async () => {
    if (!importFile) return setImportError("Pilih file terlebih dahulu.");
    setImporting(true); setImportError(""); setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const res  = await apiFetch("/superadmin/customers/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengimpor data.");
      setImportResult({
        success: data.success_count ?? data.imported ?? 0,
        failed:  data.failed_count  ?? data.failed   ?? 0,
        message: data.message ?? "Import selesai.",
      });
      setImportFile(null);
      await fetchData();
    } catch (err) {
      setImportError(err.message ?? "Gagal mengimpor data.");
    } finally {
      setImporting(false);
    }
  };
​
  const filtered = useMemo(() => {
    const base = allCustomers.filter(c => {
      const status = getStatusKey(c);
      const matchFilter = filter === "all" || status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.fullname?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.institution?.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
    return [...base].sort((a, b) => {
      if (sort === "az") return (a.fullname ?? "").localeCompare(b.fullname ?? "");
      if (sort === "za") return (b.fullname ?? "").localeCompare(a.fullname ?? "");
      if (sort === "terlama") return (a.id ?? 0) - (b.id ?? 0);
      return (b.id ?? 0) - (a.id ?? 0);
    });
  }, [allCustomers, filter, search, sort]);
​
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
​
  const counts = useMemo(() => ({
    all:      allCustomers.length,
    pending:  allCustomers.filter(c => getStatusKey(c) === "pending").length,
    approved: allCustomers.filter(c => getStatusKey(c) === "approved").length,
    rejected: allCustomers.filter(c => getStatusKey(c) === "rejected").length,
  }), [allCustomers]);
​
  if (showAdd) {
    return (
      <div className="space-y-3 max-w-5xl">
        <h1 className="text-xl font-bold text-[#233B6E]">Registrasi Pelanggan</h1>
        <p className="text-sm text-gray-400">Tambah akun pelanggan baru secara manual</p>
        <FormTambahPelanggan
          onBack={() => setShowAdd(false)}
          onSuccess={(msg) => {
            setShowAdd(false);
            setFlashOk(msg);
            fetchData();
            setTimeout(() => setFlashOk(""), 4000);
          }}
        />
      </div>
    );
  }
​
  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-[#233B6E]">Daftar Akun Registrasi</h1>
          <button onClick={fetchData}
            className="flex items-center gap-2 text-xs font-semibold text-[#233B6E]
              bg-[#EEF0F8] hover:bg-[#dde0f0] px-3 py-2 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
​
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm
            rounded-xl px-4 py-3 flex justify-between items-center">
            {error}
            <button onClick={fetchData}
              className="text-xs font-semibold hover:underline ml-4">Coba Lagi</button>
          </div>
        )}
​
        {flashOk && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex justify-between items-center">
            {flashOk}
            <button onClick={() => setFlashOk("")}
              className="text-xs font-semibold hover:underline ml-4">Tutup</button>
          </div>
        )}
​
        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => { setFilter(opt.value); setPage(1); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs
                font-semibold border transition-all
                ${filter === opt.value
                  ? "bg-[#233B6E] text-white border-[#233B6E] shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-[#233B6E] hover:text-[#233B6E]"}`}>
              {opt.label}
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full
                text-[10px] font-bold
                ${filter === opt.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {counts[opt.value]}
              </span>
            </button>
          ))}
        </div>
​
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
​
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round"
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari nama atau email pelanggan..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]
                  bg-[#F6F7FB]" />
            </div>
​
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Status:</span>
              <div className="relative">
                <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
                  className="appearance-none border border-gray-200 rounded-xl text-sm font-medium
                    text-gray-700 bg-white pl-3 pr-7 py-2 outline-none cursor-pointer
                    focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]">
                  <option value="all">Semua Status</option>
                  <option value="pending">Belum Verifikasi</option>
                  <option value="approved">Sudah Verifikasi</option>
                  <option value="rejected">Ditolak</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round"
                  className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2
                    text-gray-400 pointer-events-none">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
​
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Urutkan:</span>
              <div className="relative">
                <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
                  className="appearance-none border border-gray-200 rounded-xl text-sm font-medium
                    text-gray-700 bg-white pl-3 pr-7 py-2 outline-none cursor-pointer
                    focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]">
                  <option value="terbaru">Terbaru</option>
                  <option value="terlama">Terlama</option>
                  <option value="az">A–Z</option>
                  <option value="za">Z–A</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round"
                  className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2
                    text-gray-400 pointer-events-none">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
​
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56] text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors whitespace-nowrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Tambah Akun
              </button>
              <button onClick={() => {
                setShowImportModal(true);
                setImportResult(null);
                setImportError("");
                setImportFile(null);
              }}
                className="flex items-center gap-1.5 bg-white hover:bg-[#EEF0F8]
                  text-[#233B6E] text-sm font-semibold px-4 py-2 rounded-xl
                  border border-[#233B6E] shadow-sm transition-colors whitespace-nowrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Impor Data
              </button>
            </div>
          </div>
​
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["No.", "Nama", "Email", "Institusi", "Dokumen", "Status", "Aksi"].map(h => (
                    <th key={h} className={`px-4 py-3 ${h === "No." ? "text-center" : "text-left"} text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-14 text-center">
                    <span className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Memuat data...
                    </span>
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={7}
                    className="px-4 py-14 text-center text-gray-400 text-sm">
                    {search ? "Tidak ada hasil pencarian."
                      : filter !== "all"
                        ? `Tidak ada pelanggan dengan status "${FILTER_OPTIONS.find(o => o.value === filter)?.label}".`
                        : "Belum ada data registrasi."}
                  </td></tr>
                ) : paginated.map((c, i) => {
                  const status    = getStatusKey(c);
                  const actSt     = actionStatus[c.id];
                  const actMsg    = actionMsg[c.id];
                  const isLoading = actSt === "loading";
​
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">
                        {(page - 1) * PER_PAGE + i + 1}.
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 min-w-[140px]">
                        {c.fullname}
                      </td>
                      <td className="px-4 py-3 text-gray-600 min-w-[160px]">{c.email}</td>
                      <td className="px-4 py-3 text-gray-500 min-w-[160px]">{c.institution ?? "-"}</td>
                      <td className="px-4 py-3">
                        {c.registration_doc ? (
                          <a href={getDocUrl(c.registration_doc)} target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#233B6E]
                              text-xs font-semibold hover:underline">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                              className="w-3.5 h-3.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12
                                a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            Lihat
                          </a>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 min-w-[150px]">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        {actMsg && (
                          <p className={`text-[11px] font-semibold mb-1
                            ${actSt === "error" ? "text-red-500"
                            : actSt === "verified" ? "text-green-600"
                            : "text-gray-500"}`}>
                            {actMsg}
                          </p>
                        )}
                        {status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleVerify(c)} disabled={isLoading}
                              className="flex items-center gap-1 text-xs font-semibold
                                text-green-700 bg-green-50 hover:bg-green-100
                                border border-green-200 px-2.5 py-1.5 rounded-lg
                                transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              {isLoading ? (
                                <svg className="animate-spin w-3.5 h-3.5"
                                  viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10"
                                    stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8H4z"/>
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  className="w-3.5 h-3.5">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                              Verifikasi
                            </button>
                            <button onClick={() => handleReject(c)} disabled={isLoading}
                              className="flex items-center gap-1 text-xs font-semibold
                                text-red-600 bg-red-50 hover:bg-red-100
                                border border-red-200 px-2.5 py-1.5 rounded-lg
                                transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                className="w-3.5 h-3.5">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                              Tolak
                            </button>
                            <button onClick={() => navigate(
                              `/superadmin/registrasi-pelanggan/${c.id}`,
                              { state: { customer: c } })}
                              className="inline-flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold hover:underline whitespace-nowrap">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                                className="w-3.5 h-3.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                              Detail
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => navigate(
                            `/superadmin/registrasi-pelanggan/${c.id}`,
                            { state: { customer: c } })}
                            className="inline-flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold hover:underline whitespace-nowrap">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                              className="w-3.5 h-3.5">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
​
          <div className="px-4 py-3 border-t border-gray-100 flex items-center
            justify-between flex-wrap gap-2">
            <span className="text-xs text-gray-400">
              {filtered.length} data · Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <PaginationBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-3 h-3">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </PaginationBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                .map(n => (
                  <PaginationBtn key={n} active={n === page} onClick={() => setPage(n)}>
                    {n}
                  </PaginationBtn>
                ))}
              <PaginationBtn disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-3 h-3">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </PaginationBtn>
            </div>
          </div>
        </div>
      </div>
​
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowImportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="h-1 bg-[#233B6E]" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-[#233B6E] text-base">Impor Data Pelanggan</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Daftarkan pelanggan secara massal via file Excel/CSV
                </p>
              </div>
              <button onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-5 h-5">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
​
            <div className="px-6 py-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3
                text-sm text-blue-700">
                <p className="font-semibold mb-1">Format File yang Didukung</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-blue-600">
                  <li>Format: <strong>.xlsx</strong> atau <strong>.csv</strong></li>
                  <li>Kolom wajib: <strong>fullname, email, phone, password, institution</strong></li>
                  <li>Kolom opsional: group, is_active</li>
                  <li>Maksimal 500 baris per file</li>
                </ul>
              </div>
​
              {importError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                  rounded-xl px-4 py-3 flex items-start justify-between gap-2">
                  <span>{importError}</span>
                  <button onClick={() => setImportError("")}
                    className="opacity-60 hover:opacity-100 flex-shrink-0">
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" className="w-3.5 h-3.5">
                      <path d="M1 1l12 12M13 1L1 13"/>
                    </svg>
                  </button>
                </div>
              )}
​
              {importResult ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <p className="text-sm font-bold text-green-700 mb-1">
                      {importResult.message}
                    </p>
                    <div className="flex gap-4 mt-1">
                      <div className="text-center">
                        <p className="text-xl font-extrabold text-green-600">
                          {importResult.success}
                        </p>
                        <p className="text-xs text-green-500">Berhasil</p>
                      </div>
                      {importResult.failed > 0 && (
                        <div className="text-center">
                          <p className="text-xl font-extrabold text-red-500">
                            {importResult.failed}
                          </p>
                          <p className="text-xs text-red-400">Gagal</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setShowImportModal(false)}
                    className="w-full bg-[#233B6E] hover:bg-[#1a2d56] text-white
                      font-bold text-sm py-2.5 rounded-xl transition-all">
                    Tutup
                  </button>
                </>
              ) : (
                <>
                  <label className={`flex flex-col items-center justify-center gap-2
                    border-2 border-dashed rounded-xl px-4 py-8 cursor-pointer transition-colors
                    ${importFile
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 hover:border-[#233B6E] hover:bg-[#EEF0F8]"}`}>
                    <input type="file" accept=".xlsx,.csv,.xls" className="hidden"
                      onChange={e => {
                        setImportFile(e.target.files[0] ?? null);
                        setImportError("");
                        setImportResult(null);
                      }} />
                    {importFile ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12
                            a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <polyline points="9 15 12 18 15 15"/>
                          <line x1="12" y1="18" x2="12" y2="11"/>
                        </svg>
                        <p className="text-sm font-semibold text-green-700 text-center break-all">
                          {importFile.name}
                        </p>
                        <p className="text-xs text-green-500">
                          {(importFile.size / 1024).toFixed(1)} KB — klik untuk ganti
                        </p>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <p className="text-sm text-gray-500 font-medium">Klik untuk pilih file</p>
                        <p className="text-xs text-gray-400">.xlsx, .csv, .xls</p>
                      </>
                    )}
                  </label>
​
                  <div className="flex gap-3">
                    <button onClick={() => setShowImportModal(false)}
                      className="flex-1 border border-gray-200 text-gray-600
                        hover:bg-gray-50 font-semibold text-sm py-2.5 rounded-xl
                        transition-colors">
                      Batal
                    </button>
                    <button onClick={handleImport} disabled={importing || !importFile}
                      className="flex-1 bg-[#233B6E] hover:bg-[#1a2d56] text-white
                        font-bold text-sm py-2.5 rounded-xl transition-all
                        disabled:opacity-60 disabled:cursor-not-allowed
                        inline-flex items-center justify-center gap-2">
                      {importing ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10"
                              stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                          Mengimpor...
                        </>
                      ) : "Impor Sekarang"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}