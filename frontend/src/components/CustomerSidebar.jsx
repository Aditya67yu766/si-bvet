import { NavLink, useNavigate } from "react-router-dom";
import { clearAuth, getUser } from "../utils/auth";
import logo from "../assets/logo.png";
​
const NAV_ITEMS = [
  {
    to: "/customer/beranda",
    label: "Beranda",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M3 9.75L12 3l9 6.75V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.75z"/>
        <path d="M9 22V12h6v10"/>
      </svg>
    ),
  },
  {
    to: "/customer/bimtek-magang",
    label: "BIMTEK / Magang",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
  },
  {
    to: "/customer/katalog-pengujian",
    label: "Katalog Pengujian",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    to: "/customer/pengajuan-uji-sampel",
    label: "Pengajuan Uji Sampel",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
  },
  {
    to: "/customer/pengajuan-saya",
    label: "Pengajuan Saya",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    to: "/customer/profil",
    label: "Profil",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];
​
export default function CustomerSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const user     = getUser();
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
      {/* Sidebar — mobile */}
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
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <img src={logo} alt="SI-BVET" className="h-9 w-auto object-contain flex-shrink-0" />
            <span className="font-bold text-[#233B6E] text-sm">SI-BVET</span>
          </div>
​
          {/* Navigasi */}
          <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                   transition-all duration-150 group
                   ${isActive
                     ? "bg-[#1E3A5F] text-white shadow-sm"
                     : "text-[#233B6E] hover:bg-[#EEF0F8]"
                   }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-white" : "text-[#415F9D] group-hover:text-[#233B6E] transition-colors"}>
                      {item.icon}
                    </span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
​
          {/* Keluar */}
          <div className="px-3 py-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-sm font-semibold text-gray-400 hover:bg-red-50 hover:text-red-500
                transition-all duration-150"
            >
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