import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import heroImg from "../assets/bvet.jpeg";
import maklumatImg from "../assets/maklumat.png";

/* ── DATA ── */
const NAV = [
  {
    label: "Forecasting",
    href: "/forecasting",
    children: [
      { label: "Forecasting Penyakit Hewan", href: "/forecasting" },
      { label: "Manajemen Peternakan — Ayam Layer (Petelur)", href: "/forecasting/ayam-layer" },
    ],
  },
  { label: "Beranda",        href: "#beranda" },
  { label: "Layanan",        href: "#layanan" },
  { label: "Tentang Kami",   href: "#tentang" },
  { label: "Alur Pengajuan", href: "#alur"    },
];

const SECTIONS = ["beranda", "layanan", "tentang", "alur", "forecasting", "lokasi"];

const SERVICES = [
  {
    title: "Pengajuan Sampel",
    desc: "Pengajuan sampel pengujian laboratorium veteriner secara online.",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-6-6z"/><path d="M9 3v6h6M12 12v6M9 15h6"/></svg>,
  },
  {
    title: "BIMTEK / Magang",
    desc: "Pendaftaran kegiatan bimbingan teknis dan program magang.",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  },
  {
    title: "Permohonan Informasi Publik",
    desc: "Layanan permohonan informasi publik secara digital.",
    href: "https://ppid.pertanian.go.id/portal",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
  },
  {
    title: "Pengaduan",
    desc: "Sampaikan pengaduan atau keluhan terkait layanan BVET secara langsung dan transparan.",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    title: "Penilaian",
    desc: "Sampaikan penilaian dan kepuasan Anda terhadap layanan BVET secara langsung. Tidak perlu login.",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
];

const STEPS = [
  { num: "01", title: "Registrasi Akun / Login",  desc: "Buat akun atau masuk untuk mengakses seluruh layanan SI-BVET Lampung." },
  { num: "02", title: "Pengajuan Layanan",         desc: "Isi formulir pengajuan sesuai jenis layanan yang dibutuhkan secara online." },
  { num: "03", title: "Verifikasi dan Proses",     desc: "Tim BVET memverifikasi berkas dan memproses permohonan Anda." },
  { num: "04", title: "Hasil dan Laporan",         desc: "Unduh hasil pengujian atau laporan langsung melalui portal SI-BVET." },
];

const STATS = [
  { val: "SNI ISO" },
  { val: "KAN",     sub: "Terakreditasi" },
  { val: "150+",    sub: "Jenis Pengujian" },
  { val: "35+",     sub: "Tahun Beroperasi" },
];

const CONTACTS = [
  { label: "Alamat",           val: "Jl. Untung Suropati No.2, Rajabasa, Bandar Lampung 35144" },
  { label: "Email",            val: "bvetlampung@pertanian.go.id" },
  { label: "Telepon",          val: "(0721) 783852" },
  { label: "Jam Operasional",  val: "Senin – Jumat: 07.30 – 16.00 WIB" },
];

/* ── STYLES ── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *, body { font-family: 'Plus Jakarta Sans', sans-serif; }
  html { scroll-behavior: smooth; }

  .nav-link { position: relative; }
  .nav-link::after {
    content: ''; position: absolute; bottom: -2px; left: 0; right: 0;
    height: 2px; background: #F5C400; border-radius: 2px; opacity: 0;
  }
  .nav-link.active::after { opacity: 1; }

  .card-hover { transition: transform .28s ease, box-shadow .28s ease; }
  .card-hover:hover { transform: translateY(-7px); box-shadow: 0 22px 52px rgba(35,59,110,.15); }
  .card-hover:hover .arrow { transform: translateX(4px); }
  .arrow { transition: transform .22s ease; }

  .step-card { transition: border-color .22s, box-shadow .22s; }
  .step-card:hover { border-color: #F5C400; box-shadow: 0 8px 28px rgba(245,196,0,.12); }

  @keyframes up { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  .a1 { animation: up .75s .10s both; }
  .a2 { animation: up .75s .28s both; }
  .a3 { animation: up .75s .46s both; }
`;

/* ── HOOK ── */
function useScrollSpy() {
  const [active, setActive] = useState("beranda");
  useEffect(() => {
    const fn = () => {
      let current = "beranda", minDist = Infinity;
      SECTIONS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (top <= 90) {
          const d = Math.abs(top - 90);
          if (d < minDist) { minDist = d; current = id; }
        }
      });
      setActive(current);
    };

    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return active;
}

/* ── MAKLUMAT POPUP ── */
function MaklumatPopup({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <style>{`@keyframes fade-in { from { opacity: 0 } to { opacity: 1 } } .animate-fade-in { animation: fade-in .3s ease; }`}</style>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full scale-100 animate-zoom-in"
        style={{ animation: "zoom-in .3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        <img src={maklumatImg} alt="Maklumat Pelayanan" className="w-full h-auto rounded-t-2xl" />
        <div className="p-4 bg-gray-100 rounded-b-2xl text-center">
          <button
            onClick={onClose}
            className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-semibold px-8 py-2 rounded-lg transition-colors text-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── NAVBAR ── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useScrollSpy();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const renderNavLinks = (mobile = false) => NAV.map(n => {
    const isActive = active === n.href.slice(1);
    const NavItem = n.href.startsWith("/") ? Link : "a";
    const destination = n.href.startsWith("/") ? { to: n.href } : { href: n.href };
    if (n.children) {
      return (
        <div key={n.label} className={`relative ${mobile ? "" : "group"}`}>
          <NavItem {...destination}
            onClick={() => mobile && setOpen(false)}
            className={mobile
              ? `block px-4 py-3 rounded-lg text-sm font-semibold transition-all ${isActive ? "bg-[#F5C400]/15 text-[#F5C400]" : "text-white/70 hover:text-[#F5C400] hover:bg-white/10"}`
              : `nav-link text-sm font-semibold px-4 py-2 transition-colors ${isActive ? "text-[#F5C400] active" : "text-white/75 hover:text-[#F5C400]"}`
            }>
            {n.label}
            <svg
              className="ml-2 inline-block h-4 w-4 align-[-3px] stroke-current stroke-[2.5] transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </NavItem>
          <div className={mobile
            ? "ml-3 flex flex-col border-l border-white/15 pl-2"
            : "absolute left-0 top-full z-50 hidden w-80 flex-col rounded-lg border border-white/10 bg-[#1a2d56] p-2 shadow-xl group-hover:flex group-focus-within:flex"
          }>
            {n.children.map((child) => (
              <Link key={child.href} to={child.href}
                onClick={() => mobile && setOpen(false)}
                className={mobile
                  ? "rounded-lg px-4 py-2.5 text-xs leading-relaxed text-white/65 transition-colors hover:bg-white/10 hover:text-[#F5C400]"
                  : "rounded-md px-3 py-2.5 text-sm leading-relaxed text-white/75 transition-colors hover:bg-white/10 hover:text-[#F5C400]"
                }>
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      );
    }
    return (
      <NavItem key={n.label} {...destination}
        onClick={() => mobile && setOpen(false)}
        className={mobile
          ? `px-4 py-3 rounded-lg text-sm font-semibold transition-all ${isActive ? "bg-[#F5C400]/15 text-[#F5C400]" : "text-white/70 hover:text-[#F5C400] hover:bg-white/10"}`
          : `nav-link text-sm font-semibold px-4 py-2 transition-colors ${isActive ? "text-[#F5C400] active" : "text-white/75 hover:text-[#F5C400]"}`
        }>
        {n.label}
      </NavItem>
    );
  });

  return (
    <>
      <style>{STYLE}</style>
      <nav className={`fixed top-0 inset-x-0 z-50 bg-[#233B6E] transition-all duration-300 ${scrolled ? "shadow-[0_4px_30px_rgba(0,0,0,0.3)]" : ""}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">

          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <img src={logo} alt="SI-BVET" className="h-10 w-auto object-contain" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-white font-bold text-base tracking-wide">SI-BVET Lampung</span>
              <span className="text-white/55 text-[11px]">Laboratorium Balai Veteriner Lampung</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {renderNavLinks()}
            <div className="w-px h-5 bg-white/20 mx-3" />
            <Link to="/login" className="text-sm font-semibold text-white/85 hover:text-white border border-white/30 hover:border-white/60 px-4 py-1.5 rounded-md transition-all">Masuk</Link>
            <Link to="/register" className="ml-2 text-sm font-bold text-[#233B6E] bg-[#F5C400] hover:bg-[#ffd020] px-5 py-1.5 rounded-md transition-colors shadow-sm">Daftar</Link>
          </div>

          <button onClick={() => setOpen(true)} className="lg:hidden text-white/80 hover:text-white p-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-6 h-6"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-[60] ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute top-0 right-0 h-full w-72 bg-[#1a2d56] flex flex-col shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="SI-BVET" className="h-9 w-auto object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-white font-bold text-sm">SI-BVET Lampung</span>
                <span className="text-white/45 text-[10px]">Laboratorium Balai Veteriner</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <nav className="flex-1 flex flex-col px-4 py-5 gap-0.5">{renderNavLinks(true)}</nav>
          <div className="px-4 pb-8 flex flex-col gap-3">
            <Link to="/login" onClick={() => setOpen(false)} className="text-center border border-white/30 hover:bg-white/10 text-white text-sm font-semibold py-2.5 rounded-lg transition-all">Masuk</Link>
            <Link to="/register" onClick={() => setOpen(false)} className="text-center bg-[#F5C400] hover:bg-[#ffd020] text-[#233B6E] text-sm font-bold py-2.5 rounded-lg transition-colors shadow">Daftar</Link>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ── HERO ── */
function Hero() {
  return (
    <section id="beranda" className="relative min-h-screen flex items-center pt-[68px] overflow-hidden">
      <img src={heroImg} alt="Balai Veteriner Lampung" className="absolute inset-0 w-full h-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1e3f]/70 via-[#0d1e3f]/60 to-[#0d1e3f]/80" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-[#EFF0F4]" style={{ clipPath: "polygon(0 100%,100% 100%,100% 0)" }} />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-28 w-full text-center">
        <h1 className="a1 text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold text-white leading-[1.1] tracking-tight">Selamat Datang di</h1>
        <h1 className="a2 text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold text-[#F5C400] leading-[1.15] tracking-tight mt-1">Sistem Informasi Balai<br className="hidden sm:block" /> Veteriner Lampung</h1>
        <div className="a3 mt-14 grid grid-cols-2 sm:grid-cols-4 max-w-xs sm:max-w-2xl mx-auto bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
          {STATS.map((b, i) => (
            <div key={i} className="flex flex-col items-center justify-center text-center px-6 py-5">
              <span className="text-[#F5C400] text-xl font-extrabold leading-none">{b.val}</span>
              <span className="text-white/55 text-[11px] mt-1 leading-tight min-h-[14px]">{b.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── LAYANAN ── */
function Services() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const scroll = (dir) =>
    scrollRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  return (
    <section id="layanan" className="py-24 bg-[#EFF0F4]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#233B6E]">Layanan Yang Kami Sediakan</h2>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <div className="w-10 h-1 rounded-full bg-[#F5C400]" />
            <div className="w-5 h-1 rounded-full bg-[#233B6E]/30" />
            <div className="w-2 h-1 rounded-full bg-[#D3D6DB]" />
          </div>
        </div>

        {/* Slider horizontal — semua ukuran layar */}
        <div className="relative group">
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory
            [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
          {SERVICES.map((s, i) => {
            const Card = s.href ? "a" : "div";
            return (
            <Card key={i}
              href={s.href}
              target={s.href ? "_blank" : undefined}
              rel={s.href ? "noopener noreferrer" : undefined}
              onClick={s.href ? undefined : () => navigate(s.title === "BIMTEK / Magang" ? "/customer/bimtek-magang" : s.title === "Pengaduan" ? "/pengaduan" : s.title === "Penilaian" ? "/penilaian" : "/login")}
              className="card-hover bg-white rounded-2xl border border-[#D3D6DB]/50 shadow-sm overflow-hidden cursor-pointer group
                flex-shrink-0 w-[75vw] sm:w-[calc(50%-10px)] lg:w-[calc(25%-15px)] snap-start">
              <div className="h-1.5 bg-[#F5C400]" />
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-[#233B6E] text-white flex items-center justify-center mb-5
                  group-hover:bg-[#F5C400] group-hover:text-[#233B6E] transition-colors duration-300">
                  {s.icon}
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-bold text-[#233B6E] leading-snug">{s.title}</h3>
                  <span className="text-3xl font-black text-[#D3D6DB]/70 leading-none flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="text-xs text-[#415F9D] leading-relaxed">{s.desc}</p>
                <div className="mt-5 flex items-center gap-1.5 text-[#233B6E] text-xs font-bold tracking-wide uppercase">
                  <span>Akses Layanan</span>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" className="arrow w-3.5 h-3.5">
                    <path d="M2 7h10M8 3l4 4-4 4"/>
                  </svg>
                </div>
              </div>
            </Card>
          );})}
          </div>

          {/* Panah geser - muncul saat hover, penanda bisa digeser */}
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Geser kiri"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 backdrop-blur border border-[#D3D6DB] shadow-lg text-[#233B6E] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-105 transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Geser kanan"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 backdrop-blur border border-[#D3D6DB] shadow-lg text-[#233B6E] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-105 transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── TENTANG ── */
function About() {
  const features = [
    "Pengajuan sampel online tersedia 24 jam",
    "Notifikasi status pengujian secara real-time",
    "Unduh laporan hasil langsung dari portal",
    "Pendaftaran BIMTEK dan magang secara digital",
  ];
  const stats = [
    { val: "SNI ISO" }, { val: "KAN", sub: "Terakreditasi" },
    { val: "35+", sub: "Tahun Beroperasi" }, { val: "100%", sub: "Layanan Digital" },
  ];
  return (
    <section id="tentang" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#EFF0F4] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-[#EFF0F4] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          <div className="relative">
            <div className="bg-[#233B6E] rounded-3xl overflow-hidden relative">
              <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
                <defs><pattern id="dp" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#dp)"/>
              </svg>
              <div className="h-1.5 bg-[#F5C400]" />
              <div className="relative p-9">
                <div className="w-11 h-11 rounded-xl bg-[#F5C400]/15 flex items-center justify-center mb-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#F5C400" strokeWidth="1.8" strokeLinecap="round" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 leading-snug">Laboratorium Veteriner<br/>Terakreditasi Nasional</h3>
                <p className="text-white/60 text-sm leading-relaxed">Unit pelaksana teknis Kementerian Pertanian RI yang bertugas melaksanakan pengujian veteriner, diagnosa penyakit hewan, dan pengamatan penyakit hewan di wilayah Lampung dan sekitarnya.</p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {stats.map(s => (
                    <div key={s.sub} className="bg-white/10 hover:bg-white/15 transition-colors rounded-xl p-4">
                      <p className="text-[#F5C400] font-extrabold text-xl leading-none">{s.val}</p>
                      <p className="text-white/55 text-xs mt-1.5">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 -z-10 w-full h-full rounded-3xl border-2 border-[#F5C400]/30" />
          </div>

          <div>
            <p className="text-xs font-bold text-[#415F9D] tracking-[0.2em] uppercase mb-3">Profil</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#233B6E] mb-5 leading-tight">Tentang Kami</h2>
            <div className="flex gap-2 mb-7">
              <div className="w-10 h-1 rounded-full bg-[#F5C400]" />
              <div className="w-5 h-1 rounded-full bg-[#233B6E]/30" />
            </div>
            <p className="text-[#415F9D] leading-relaxed mb-4">SI-BVET merupakan Sistem Informasi Balai Veteriner Lampung yang menyediakan layanan digital untuk pengajuan sampel, pelayanan publik, serta informasi laboratorium veteriner secara cepat dan transparan.</p>
            <p className="text-[#415F9D] leading-relaxed">Dengan platform terintegrasi ini, pemohon dapat mengajukan layanan, memantau status permohonan, dan memperoleh hasil secara daring—kapan saja dan di mana saja.</p>
            <ul className="mt-8 space-y-3.5">
              {features.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-[#415F9D]">
                  <div className="w-5 h-5 rounded-full bg-[#F5C400]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3"><path d="M1.5 5l2 2 5-4" stroke="#233B6E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── ALUR ── */
function Steps() {
  return (
    <section id="alur" className="py-24 bg-[#EFF0F4]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-bold text-[#415F9D] tracking-[0.2em] uppercase mb-3">Tata Cara</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#233B6E]">Alur Pengajuan</h2>
        </div>

        {/* Desktop */}
        <div className="hidden lg:grid grid-cols-4 gap-6 relative">
          <div className="absolute top-[3.2rem] left-[15%] right-[15%] border-t-2 border-dashed border-[#D3D6DB] z-0" />
          {STEPS.map(s => (
            <div key={s.num} className="step-card relative z-10 bg-white rounded-2xl border-2 border-[#D3D6DB]/60 p-7 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#233B6E] text-white mx-auto mb-6 shadow-md flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold text-[#F5C400] leading-none tracking-widest">STEP</span>
                <span className="text-2xl font-extrabold leading-tight">{s.num}</span>
              </div>
              <h3 className="font-bold text-[#233B6E] text-base mb-3 leading-snug">{s.title}</h3>
              <p className="text-xs text-[#415F9D] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Mobile */}
        <div className="lg:hidden space-y-4">
          {STEPS.map(s => (
            <div key={s.num} className="step-card bg-white rounded-2xl border-2 border-[#D3D6DB]/60 p-6 flex gap-5 shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-[#233B6E] text-white flex-shrink-0 flex flex-col items-center justify-center shadow">
                <span className="text-[8px] font-bold text-[#F5C400] leading-none tracking-widest">STEP</span>
                <span className="text-xl font-extrabold leading-tight">{s.num}</span>
              </div>
              <div className="pt-1">
                <h3 className="font-bold text-[#233B6E] text-base mb-1.5">{s.title}</h3>
                <p className="text-sm text-[#415F9D] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── LOKASI ── */
function Location() {
  return (
    <section id="lokasi" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-bold text-[#415F9D] tracking-[0.2em] uppercase mb-3">Kunjungi Kami</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#233B6E]">Lokasi Balai Veteriner Lampung</h2>
        </div>
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-[#D3D6DB] shadow-md" style={{ height: 380 }}>
            <iframe
              title="Lokasi BVET"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3971.5!2d105.2511189!3d-5.3755229!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e40dacf0e89c8a3%3A0x7451406d81990719!2sBalai+Veteriner+Lampung!5e0!3m2!1sid!2sid!4v1620000000000!5m2!1sid!2sid"
              width="100%" height="100%" style={{ border: 0 }}
              allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-3">
            {CONTACTS.map(c => (
              <div key={c.label} className="bg-[#EFF0F4] hover:bg-[#e8eaf0] transition-colors rounded-xl p-5">
                <p className="text-[10px] font-bold text-[#415F9D] uppercase tracking-wider mb-1">{c.label}</p>
                <p className="text-sm font-semibold text-[#233B6E] leading-snug">{c.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FOOTER ── */
function Footer() {
  const socials = [
    { title: "Facebook",  d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
    { title: "Instagram", d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M6.5 6.5A1.5 1.5 0 0 1 8 5h8a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 16 19H8a1.5 1.5 0 0 1-1.5-1.5z" },
    { title: "YouTube",   d: "M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" },
  ];
  return (
    <footer className="bg-[#233B6E]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">

          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <img src={logo} alt="SI-BVET" className="h-12 w-auto object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-white font-bold text-base">SI-BVET Lampung</span>
                <span className="text-white/45 text-[11px]">Laboratorium Balai Veteriner Lampung</span>
              </div>
            </div>
            <p className="text-white/55 text-sm leading-relaxed max-w-xs">Portal digital resmi Balai Veteriner Lampung untuk layanan pengujian laboratorium veteriner yang cepat, transparan, dan terpercaya.</p>
            <div className="mt-6 flex gap-2.5">
              {socials.map(s => (
                <a key={s.title} href="#" aria-label={s.title}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#F5C400]/20 text-white/60 hover:text-[#F5C400] flex items-center justify-center transition-all">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d={s.d}/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-5">Tautan</h4>
            <ul className="space-y-2.5">
              {[...NAV,
                { label: "Login",  href: "/login",    route: true },
                { label: "Daftar", href: "/register", route: true }
              ].map(l => (
                <li key={l.label}>
                  {l.route
                    ? <Link to={l.href} className="text-white/55 hover:text-[#F5C400] text-sm transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#F5C400]/40 flex-shrink-0" />{l.label}</Link>
                    : <a href={l.href} className="text-white/55 hover:text-[#F5C400] text-sm transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#F5C400]/40 flex-shrink-0" />{l.label}</a>
                  }
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-5">Kontak</h4>
            <ul className="space-y-3 text-sm text-white/55">
              <li className="leading-relaxed">Jl. Untung Suropati No.2, Rajabasa, Bandar Lampung 35144</li>
              <li><a href="tel:+62721783852" className="hover:text-[#F5C400] transition-colors">(0721) 783852</a></li>
              <li><a href="mailto:bvetlampung@pertanian.go.id" className="hover:text-[#F5C400] transition-colors break-all">bvetlampung@pertanian.go.id</a></li>
              <li>Senin – Jumat: 07.30 – 16.00 WIB</li>
            </ul>
          </div>

        </div>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/35">
          <p>© {new Date().getFullYear()} Balai Veteriner Lampung — Kementerian Pertanian RI. Hak cipta dilindungi.</p>
          <p>Direktorat Jenderal Peternakan dan Kesehatan Hewan</p>
        </div>
      </div>
    </footer>
  );
}

/* ── ROOT ── */
export default function LandingPage() {
  const [showMaklumat, setShowMaklumat] = useState(false);

  useEffect(() => {
    const hasSeenMaklumat = sessionStorage.getItem("seenMaklumat");
    if (!hasSeenMaklumat) {
      setShowMaklumat(true);
      sessionStorage.setItem("seenMaklumat", "true");
    }
  }, []);

  const handleCloseMaklumat = () => {
    setShowMaklumat(false);
  }

  return (
    <div className="antialiased">
      {showMaklumat && <MaklumatPopup onClose={handleCloseMaklumat} />}
      <Navbar />
      <main>
        <Hero />
        <Services />
        <About />
        <Steps />
        <Location />
      </main>
      <Footer />
    </div>
  );
}