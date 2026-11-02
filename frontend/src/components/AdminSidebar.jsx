import { NavLink, useNavigate } from "react-router-dom";
import { clearAuth } from "../utils/auth";
import logo from "../assets/logo.png";
​
const NAV_ITEMS = [
  {
    to: "/admin/beranda",
    label: "Beranda",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>),
  },
  {
    to: "/admin/registrasi-pelanggan",
    label: "Registrasi Pelanggan",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l2 2 4-4"/></svg>),
  },
  {
    to: "/admin/bimtek-magang",
    label: "Pengajuan BIMTEK/Magang",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h8"/></svg>),
  },
  {
    to: "/admin/pengajuan-masuk",
    label: "Pengajuan Masuk",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>),
  },
  {
    to: "/admin/proses-pengujian",
    label: "Proses Pembayaran",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>),
  },
  {
    to: "/admin/laporan-hasil-uji",
    label: "Proses Pengujian",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>),
  },
  {
    to: "/admin/penilaian-pengguna",
    label: "Penilaian Pengguna",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>),
  },
  {
    to: "/admin/laporan-pengaduan",
    label: "Laporan Pengaduan",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
  },
  {
    to: "/admin/profil",
    label: "Profil",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  },
];
​
export default function AdminSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
​
  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };
​
  return (
    <>
      {/* Backdrop overlay — tampil di mobile saat sidebar terbuka */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}
​
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white
        border-r border-gray-100 shadow-lg
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:static lg:z-auto lg:shadow-sm lg:translate-x-0
        lg:transition-all lg:overflow-hidden lg:flex-shrink-0
        ${isOpen ? "lg:w-64" : "lg:w-0"}
      `}>
      <div className="flex flex-col h-full w-64">
​
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <img src={logo} alt="SI-BVET" className="h-8 w-auto object-contain flex-shrink-0" />
          <span className="font-bold text-[#233B6E] text-sm whitespace-nowrap">SI-BVET</span>
        </div>
​
        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                 transition-all group
                 ${isActive
                   ? "bg-[#233B6E] text-white shadow-sm"
                   : "text-gray-600 hover:bg-[#EEF0F8] hover:text-[#233B6E]"
                 }`
              }>
              {({ isActive }) => (
                <>
                  <span className={isActive
                    ? "text-white"
                    : "text-gray-400 group-hover:text-[#233B6E] transition-colors"}>
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
​
        {/* Keluar */}
        <div className="px-2 py-3 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm
              font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="whitespace-nowrap">Keluar</span>
          </button>
        </div>
​
      </div>
    </aside>
    </>
  );
}