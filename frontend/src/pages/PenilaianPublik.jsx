import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import FormPenilaian from "../components/FormPenilaian";

function PageHeader() {
  return (
    <div className="bg-[#233B6E] h-[68px] flex items-center px-5 sm:px-8">
      <div className="w-full flex items-center">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="SI-BVET" className="h-10 w-auto object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold text-sm">SI-BVET Lampung</span>
            <span className="text-white/55 text-[10px]">
              Laboratorium Balai Veteriner Lampung
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function PenilaianPublik() {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  if (success) {
    return (
      <div className="min-h-screen bg-[#F0F2F8]">
        <PageHeader />
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#233B6E] mb-2">
              Penilaian Terkirim!
            </h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Terima kasih atas penilaian Anda.
              <br />
              Masukan Anda sangat berarti untuk peningkatan mutu layanan kami.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setSuccess(false)}
                className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold px-8 py-3 rounded-xl transition-all"
              >
                Isi Penilaian Lagi
              </button>
              <Link
                to="/"
                className="border border-[#233B6E]/30 hover:bg-[#EEF0F8] text-[#233B6E] font-bold px-8 py-3 rounded-xl transition-all text-center"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="min-h-screen bg-[#F0F2F8]">
        <PageHeader />
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 flex-shrink-0"
              title="Kembali"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#233B6E]">Penilaian</h1>
              <p className="text-sm text-gray-500 mt-1">
                Pilih jenis penilaian yang ingin Anda isi.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLScs6M1-htaE-gEOtJ0WbdG3DVqi1DKaQzDVbWTb9Z6_ahBCRA/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-[#233B6E]/40 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[#233B6E] text-white flex items-center justify-center mb-5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path d="M12 3 14.8 8.7l6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#233B6E]">
                Indeks Kepuasan Masyarakat (IKM)
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Isi penilaian IKM melalui formulir eksternal.
              </p>
              <span className="inline-flex items-center gap-2 mt-5 text-sm font-bold text-[#233B6E]">
                Isi Form IKM
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <path d="M6 3h7v7M13 3 6 10" />
                  <path d="M11 9v4H3V5h4" />
                </svg>
              </span>
            </a>

            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-left bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-[#233B6E]/40 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[#233B6E] text-white flex items-center justify-center mb-5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path d="M12 3 14.8 8.7l6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#233B6E]">
                Penilaian Kepuasan Layanan
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Sampaikan kepuasan Anda terhadap layanan BVET melalui rating
                penilaian.
              </p>
              <span className="inline-flex items-center gap-2 mt-5 text-sm font-bold text-[#233B6E]">
                Isi Penilaian
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F8]">
      <PageHeader />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setShowForm(false)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 flex-shrink-0"
            title="Kembali"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#233B6E]">
              Penilaian Kepuasan Layanan
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Bantu kami meningkatkan mutu layanan dengan mengisi penilaian
              di bawah ini. Tidak perlu login.
            </p>
          </div>
        </div>

        <FormPenilaian onSuccess={() => setSuccess(true)} />
      </div>
    </div>
  );
}