# SI-BVET Temporary API Contract

Tanggal: 2026-04-02
Tujuan: acuan sementara komunikasi frontend-backend.

## Base URL

- `http://localhost:8080/api`

## Authentication

- Header untuk endpoint protected:
  - `Authorization: Bearer <JWT_TOKEN>`
- Token didapat dari endpoint login.
- Endpoint auth tambahan:
  - `PATCH /api/auth/change-password` untuk user yang sedang login.
  - `POST /api/auth/forgot-password` untuk meminta link reset password.
  - `POST /api/auth/reset-password/:id/:token?expires=...&signature=...` untuk menyimpan password baru.

## Global Response Pattern

- Sukses umumnya:
  - `{ "message": "..." }`
  - atau object/list entity langsung (contoh submission list, billing object, lhu object)
- Gagal umumnya:
  - `{ "error": "..." }`

## Role Access

- Public: `/auth/*`
- Protected umum: `/profile`, `/dashboard`
- Superadmin only: `/superadmin/*`
- Admin + superadmin: `/admin/*`
- Customer only: `/customer/*`

## Content-Type by Endpoint

- `application/json`: login, profile update, admin/account, test-services, submission create/update manual, feedback, complaint response, billing create/update.
- `application/json`: juga dipakai untuk change-password, forgot-password, dan reset-password.
- `multipart/form-data`: register customer, upload billing proof, upload LHU, create complaint, submit submission bulk upload.
- `multipart/form-data`: import sample template customer dengan path parameter `submission_id`.
- `GET` download file: `/customer/submissions/:submission_id/lhu/download`
- Endpoint import sample template customer: `POST /api/customer/submissions/:submission_id/samples/import`.
- Endpoint create submission bulk upload customer: `POST /api/customer/submissions` dengan field form biasa + file template `file`.

## Pembayaran Magang / Penelitian

Alur pembayaran ini menggunakan tabel `BimtekMagangBillings` terpisah dari billing pengujian sampel. Saat backend dijalankan, migrasi menghapus kolom rekening lama (`bank_name`, `account_name`, `account_number`) hanya dari tabel ini; tabel billing pengujian sampel tidak diubah. Tarif dihitung backend berdasarkan jumlah hari kalender (termasuk tanggal mulai dan selesai):

- 1–7 hari: Rp200.000
- 8–14 hari: Rp300.000
- 15–30 hari: Rp500.000
- 31–90 hari: Rp1.000.000

1. Customer mengirim permohonan magang dengan tanggal mulai dan selesai.
2. Admin memverifikasi dokumen, memasukkan kode e-billing yang diperoleh dari kanal pembayaran resmi, dan membuat tagihan: `POST /api/admin/bimtek-magang/:id/billing` dengan JSON `{"ebilling_code":"..."}`. Nominal tagihan tetap dihitung backend dari durasi; jangan mengisi nominal dari browser.
3. Customer mengambil status/tagihan melalui `GET /api/customer/bimtek-magang/my`, membayar menggunakan kode e-billing pada kanal pembayaran resmi, kemudian mengunggah bukti PDF/JPG/PNG (maksimal 5 MB) melalui `POST /api/customer/bimtek-magang/:id/payment-proof` dengan field `proof`.
4. Admin mengambil bukti melalui endpoint admin terautentikasi `GET /api/admin/bimtek-magang/:id/payment-proof` (respons berupa file), lalu memverifikasi lewat `PATCH /api/admin/bimtek-magang/:id/payment/verify` atau menolak lewat `PATCH /api/admin/bimtek-magang/:id/payment/reject`. Path `bimtek-magang-payment-proofs` diblokir pada URL statis `/uploads`; storage pengujian sampel `billing-proofs` tetap menggunakan alur lama.
5. Setelah pembayaran diverifikasi, admin mengirim surat balasan melalui alur yang sudah ada. BIMTEK tidak dikenakan alur pembayaran ini.

Di UI, penerbitan kode dan verifikasi bukti tersedia di halaman Pembayaran Magang untuk admin/petugas (`/admin/bimtek-magang/pembayaran`) dan superadmin (`/superadmin/bimtek-magang/pembayaran`).

### Penghapusan pengajuan BIMTEK/Magang oleh admin

- `DELETE /api/admin/bimtek-magang/:id` hanya dapat dipakai oleh admin/superadmin yang login.
- Request JSON wajib berisi `{"current_password":"<password akun yang login>","reason":"<alasan maksimal 500 karakter>"}`. Password diperiksa ulang terhadap hash akun; tidak ada password bersama yang ditanam pada source code atau konfigurasi hosting.
- Penghapusan permanen mencakup catatan tagihan/e-billing serta berkas pengajuan, surat balasan, dan bukti pembayaran. Aksi mencatat aktor, alasan, status dan nominal tagihan ke `ActivityLogs`.
- Hosting harus melayani endpoint protected melalui HTTPS agar password yang dikirim untuk autentikasi ulang terlindungi saat transit.
- Penghapusan tidak membatalkan transaksi pada kanal pembayaran resmi dan tidak berarti pengembalian dana. Jika berkas masih dipakai record lain, permintaan ditolak.
- Jika penghapusan record berhasil tetapi sebagian berkas storage gagal dibersihkan, API mengembalikan sukses dengan peringatan agar administrator menindaklanjuti cleanup.

## Important Notes (Temporary)

- Endpoint `DELETE /api/superadmin/admin-accounts/:id` sudah ada di route tetapi handler belum mengembalikan response final (implementasi backend belum lengkap).
- Endpoint yang upload file memakai field name wajib:
  - register: `registration_doc`
  - upload proof pembayaran: `proof`
  - upload LHU: `file`
  - complaint attachment (opsional): `attachment`
  - import sample template customer: `file`

## Postman Collection

Gunakan file ini untuk import ke Postman:

- `backend/SI-BVET_TEMP_API_CONTRACT.postman_collection.json`

Collection sudah mencakup seluruh endpoint aktif di `routes.go` beserta contoh body request.

## Postman Examples

- Setiap request sudah dilengkapi contoh response pada tab `Examples`.
- Cakupan minimal:
  - Success response per endpoint.
  - Unauthorized response (`401`) untuk endpoint protected.
  - Bad request response (`400`) untuk endpoint yang validasinya eksplisit (misalnya login/register).
