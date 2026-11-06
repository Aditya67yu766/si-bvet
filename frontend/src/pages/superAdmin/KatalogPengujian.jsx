import { useState, useEffect, useMemo, useRef } from "react";
import { apiFetch } from "../../services/api";

const PER_PAGE = 10;

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n ?? 0);

const UNIT_LABS = ["Virologi","Bakteriologi","Parasitologi","Patologi","Kesmavet"];
const EMPTY_FORM = {
  test_name:"", unit_lab:"", target:"", method:"",
  result_type:"", test_reference:"", price:"",
  duration:"", description:"",
};

function PBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded border text-xs
        font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? "bg-[#233B6E] text-white border-[#233B6E]"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"}`}>
      {children}
    </button>
  );
}

function Field({ form, set, label, k, placeholder, type = "text", required = true }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#233B6E]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={form[k] ?? ""} onChange={set(k)}
        placeholder={placeholder ?? `Masukkan ${label}`}
        className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none
          transition focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
          placeholder-gray-400" />
    </div>
  );
}

function SelectField({ form, set, label, k, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#233B6E]">
        {label}<span className="text-red-500 ml-0.5">*</span>
      </label>
      <div className="relative">
        <select value={form[k] ?? ""} onChange={set(k)}
          className="w-full appearance-none border border-gray-300 rounded-xl
            px-3 py-2.5 text-sm outline-none bg-white pr-9
            focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
            text-gray-800">
          <option value="">Pilih {label}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round"
          className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2
            text-gray-400 pointer-events-none">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>
  );
}

/* Halaman Form */
function FormPage({ initial, onBack, onSaved }) {
  const isEdit  = !!initial?.id;
  const [form, setForm]     = useState(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!form.test_name)   return "Nama pengujian wajib diisi.";
    if (!form.unit_lab)    return "Unit lab wajib dipilih.";
    if (!form.target)      return "Target wajib diisi.";
    if (!form.method)      return "Metode wajib diisi.";
    if (!form.result_type) return "Tipe hasil wajib diisi.";
    if (!form.price)       return "Harga wajib diisi.";
    if (!form.duration)    return "Durasi pengujian wajib diisi.";
    if (!form.description) return "Deskripsi wajib diisi.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(""); setSaving(true);
    try {
      const body   = { ...form, price: Number(form.price) };
      const url    = isEdit
        ? `/admin/test-services/${initial.id}`
        : "/superadmin/test-services";
      const res = await apiFetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal menyimpan.");
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-[#233B6E]">
          {isEdit ? "Edit Katalog Pengujian" : "Tambah Katalog Pengujian"}
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="p-6 space-y-5">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600
              text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <Field form={form} set={set} label="Nama Pengujian"   k="test_name" />
          <SelectField form={form} set={set} label="Unit Lab"   k="unit_lab"   options={UNIT_LABS} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field form={form} set={set} label="Target"          k="target" />
            <Field form={form} set={set} label="Metode"          k="method" />
          </div>

          <Field form={form} set={set} label="Tipe Hasil"        k="result_type"
            placeholder="cth: Kualitatif / Kuantitatif" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field form={form} set={set} label="Harga Uji"       k="price"    type="number"
              placeholder="Masukkan nominal harga" />
            <Field form={form} set={set} label="Durasi Pengujian" k="duration"
              placeholder="cth: 3 Hari" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#233B6E]">
              Acuan Pengujian
            </label>
            <textarea value={form.test_reference ?? ""} onChange={set("test_reference")}
              rows={2} placeholder="cth: SNI ISO 6888-1:2021"
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                outline-none resize-none transition
                focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
                placeholder-gray-400" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#233B6E]">
              Deskripsi<span className="text-red-500 ml-0.5">*</span>
            </label>
            <textarea value={form.description ?? ""} onChange={set("description")}
              rows={4}
              placeholder="Jelaskan detail pengujian, persyaratan sampel, dan informasi lainnya..."
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                outline-none resize-none transition
                focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
                placeholder-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
            text-white font-bold text-sm px-8 py-3 rounded-xl transition-all
            disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Menyimpan...
            </>
          ) : (
            <>
              Simpan Perubahan
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-4 h-4">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function KatalogPengujian() {
  const [services, setServices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [unitFilter, setUnit]     = useState("all");
  const [page, setPage]           = useState(1);
  const [view, setView]           = useState(null); 
  const [deleting, setDeleting]   = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const importRef                 = useRef();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/admin/test-services");
      const data = await res.json();
      setServices(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setError("Gagal memuat katalog.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true); setImportMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await apiFetch("/superadmin/test-services/import",
        { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal import.");
      setImportMsg(`✓ ${data.imported_count} katalog berhasil diimpor.`);
      fetchData();
    } catch (err) {
      setImportMsg(`✗ ${err.message}`);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus katalog ini?")) return;
    setDeleting(id);
    try {
      const res = await apiFetch(`/admin/test-services/${id}`,
        { method: "DELETE" });
      if (!res.ok) throw new Error();
      setServices(p => p.filter(s => s.id !== id));
    } catch {
      alert("Gagal menghapus katalog.");
    } finally {
      setDeleting(null);
    }
  };

  const units = useMemo(() =>
    ["all", ...new Set(services.map(s => s.unit_lab).filter(Boolean))],
    [services]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter(s => {
      const matchSearch = !q ||
        s.test_name?.toLowerCase().includes(q) ||
        s.unit_lab?.toLowerCase().includes(q) ||
        s.method?.toLowerCase().includes(q);
      const matchUnit = unitFilter === "all" || s.unit_lab === unitFilter;
      return matchSearch && matchUnit;
    });
  }, [services, search, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (view !== null) {
    return (
      <FormPage
        initial={view === "add" ? null : view}
        onBack={() => setView(null)}
        onSaved={() => { setView(null); fetchData(); }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Katalog Pengujian</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600
          text-sm rounded-xl px-4 py-3 flex justify-between items-center">
          {error}
          <button onClick={fetchData}
            className="text-xs font-semibold hover:underline ml-4">
            Coba Lagi
          </button>
        </div>
      )}

      {importMsg && (
        <div className={`text-sm rounded-xl px-4 py-3 border
          ${importMsg.startsWith("✓")
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-600"}`}>
          {importMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap
          items-center gap-2">

          {/* Pencarian */}
          <div className="relative flex-1 min-w-[160px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari Pengujian..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2
                text-sm outline-none bg-[#F6F7FB]
                focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]" />
          </div>

          {/* Filter Unit Lab */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            Unit Lab:
            <div className="relative">
              <select value={unitFilter}
                onChange={e => { setUnit(e.target.value); setPage(1); }}
                className="appearance-none border border-gray-200 rounded-xl bg-white
                  text-sm text-gray-700 pl-3 pr-7 py-2 outline-none cursor-pointer
                  focus:ring-2 focus:ring-[#233B6E]/20">
                {units.map(u => (
                  <option key={u} value={u}>
                    {u === "all" ? "Semua" : u}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round"
                className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2
                  text-gray-400 pointer-events-none">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          {/* Tambah Katalog*/}
          <button onClick={() => setView("add")}
            className="flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah
          </button>

          {/* Import Data */}
          <button onClick={() => importRef.current.click()} disabled={importing}
            className="flex items-center gap-1.5 border border-[#233B6E]
              text-[#233B6E] hover:bg-[#EEF0F8] text-xs font-bold px-4 py-2
              rounded-xl transition-colors disabled:opacity-60">
            {importing ? (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-3.5 h-3.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            )}
            Import Data
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv"
            className="hidden" onChange={handleImport} />
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["ID","Nama Pengujian","Unit Lab","Metode","Harga Uji",
                  "Durasi Pengujian","Aksi"].map(h => (
                  <th key={h}
                    className="px-3 py-3 text-left text-xs font-semibold
                      text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <span className="flex items-center justify-center gap-2
                    text-gray-400 text-sm">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"
                      fill="none">
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
                  className="px-4 py-12 text-center text-gray-400 text-sm">
                  {search ? "Tidak ada hasil pencarian." : "Belum ada katalog."}
                </td></tr>
              ) : paginated.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 text-gray-400 text-xs">{s.id}</td>
                  <td className="px-3 py-3 font-medium text-gray-800 max-w-[180px]">
                    <span className="line-clamp-2 leading-snug">{s.test_name}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                    {s.unit_lab}
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                    {s.method ?? "-"}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-700 whitespace-nowrap">
                    {rupiah(s.price)}
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                    {s.duration ?? "-"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setView(s)}
                        className="inline-flex items-center gap-1 text-[#233B6E]
                          text-xs font-semibold hover:underline">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="1.8" strokeLinecap="round"
                          strokeLinejoin="round" className="w-3.5 h-3.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14
                            a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1
                            1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                        className="inline-flex items-center gap-1 text-red-500
                          text-xs font-semibold hover:underline
                          disabled:opacity-50">
                        {deleting === s.id ? (
                          <svg className="animate-spin w-3.5 h-3.5"
                            viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10"
                              stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="1.8" strokeLinecap="round"
                            strokeLinejoin="round" className="w-3.5 h-3.5">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2
                              L5 6"/>
                            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        )}
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center
          justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400">
            Halaman ke {page} dari {totalPages} halaman
          </span>
          <div className="flex items-center gap-1">
            <PBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </PBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
              .map(n => (
                <PBtn key={n} active={n === page} onClick={() => setPage(n)}>
                  {n}
                </PBtn>
              ))}
            <PBtn disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </PBtn>
          </div>
        </div>
      </div>
    </div>
  );
}