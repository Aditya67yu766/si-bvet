import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import { saveAuth, getDashboardPath } from "../../utils/auth";
import logo from "../../assets/logo.png";

function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      {open
        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <path d="M1 1l22 22"/></>
      }
    </svg>
  );
}

const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api"
).replace(/\/$/, "");

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm]         = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading]   = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.email)                            e.email    = "Email wajib diisi.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email    = "Format email tidak valid.";
    if (!form.password)                         e.password = "Kata sandi wajib diisi.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setApiError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Login gagal");
      }
      const { token, user } = data;
      saveAuth(token, user);
      const requestedPath = location.state?.from?.pathname;
      const destination = user.role === "customer" && requestedPath?.startsWith("/customer/")
        ? requestedPath
        : getDashboardPath(user.role);
      navigate(destination, { replace: true });
    } catch (err) {
      setApiError(err.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#233B6E] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[680px] bg-[#EFF0F4] rounded-3xl px-8 sm:px-14 pt-0 pb-10 shadow-2xl">

        <div className="flex flex-col items-center mb-8 pt-6">
          <Link to="/" className="flex flex-col items-center group">
            <img src={logo} alt="SI-BVET Lampung"
              className="h-20 w-auto object-contain group-hover:opacity-80 transition-opacity" />
            <p className="text-[#233B6E] font-extrabold text-lg tracking-tight mt-2 leading-tight text-center
              group-hover:text-[#415F9D] transition-colors">
              SI-BVET Lampung
            </p>
          </Link>
          <p className="text-[#415F9D] text-m font-medium mt-0.5 text-center">
            Sistem Informasi Balai Veteriner Lampung
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {apiError}
            </div>
          )}

          <InputField
            label="Email" type="email" placeholder="Masukkan Email"
            value={form.email} onChange={set("email")} error={errors.email}
          />

          <div className="flex flex-col gap-1">
            <InputField
              label="Kata Sandi"
              type={showPass ? "text" : "password"}
              placeholder="Masukkan Kata Sandi"
              value={form.password} onChange={set("password")} error={errors.password}
              rightSlot={
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="hover:text-[#233B6E] transition-colors">
                  <EyeIcon open={showPass} />
                </button>
              }
            />
            <div className="flex justify-end mt-1">
              <Link to="/forgot-password"
                className="text-xs text-[#415F9D] hover:text-[#233B6E] transition-colors">
                Lupa kata sandi?
              </Link>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-[#233B6E] hover:bg-[#1a2d56] active:scale-[0.98] text-white
              font-bold text-base py-4 rounded-2xl transition-all mt-2
              disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Memproses...
              </span>
            ) : "Masuk"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Belum punya akun?{" "}
            <Link to="/register" className="text-[#233B6E] font-bold hover:underline">
              Daftar disini
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}