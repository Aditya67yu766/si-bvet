import { apiFetch } from "./api";

// Registrasi Customer 
export const getUnverifiedCustomers = () =>
  apiFetch("/admin/customers");

export const verifyUser = (userId) =>
  apiFetch(`/admin/customers/${userId}/verify`, { method: "PATCH" });

export const rejectUser = (userId) =>
  apiFetch(`/admin/customers/${userId}/reject`, { method: "PATCH" });

// Submission
export const getAdminSubmissions = (params = "") =>
  apiFetch(`/admin/submissions${params}`);

export const getBimtekMagangApplications = () =>
  apiFetch("/admin/bimtek-magang");

export const getBimtekMagangDocument = (id, document) =>
  apiFetch(`/admin/bimtek-magang/${id}/documents/${document}`);

export const reviewBimtekMagangApplication = (id, data) =>
  apiFetch(`/admin/bimtek-magang/${id}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const verifyBimtekMagangApplicationWithReplyLetter = (id, formData) =>
  apiFetch(`/admin/bimtek-magang/${id}/verify-with-reply-letter`, {
    method: "POST",
    body: formData,
  });

export const deleteBimtekMagangApplication = (id) =>
  apiFetch(`/admin/bimtek-magang/${id}`, { method: "DELETE" });

export const sendBimtekMagangReplyLetter = (id, formData) =>
  apiFetch(`/admin/bimtek-magang/${id}/reply-letter`, {
    method: "POST",
    body: formData,
  });

export const approveSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/approve`, { method: "PATCH" });

export const rejectSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/reject`, { method: "PATCH" });

export const getSubmissionByID = (id) =>
  apiFetch(`/admin/submissions/${id}`);

// Expor pengajuan ke Excel
export const exportSubmissions = (payload) =>
  apiFetch("/admin/submissions/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

// Billing
export const createBilling = (submissionId, data) =>
  apiFetch(`/admin/billings/${submissionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getBilling = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}`);

export const updateBilling = (submissionId, data) =>
  apiFetch(`/admin/billings/${submissionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const verifyPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/verify`, { method: "PATCH" });

export const rejectPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/reject`, { method: "PATCH" });

// LHU
export const getLHU = (submissionId) =>
  apiFetch(`/admin/submissions/${submissionId}/lhu`);

export const uploadLHU = (submissionId, formData) =>
  apiFetch(`/admin/submissions/${submissionId}/lhu`, {
    method: "POST",
    body:   formData,
  });

// Profil 
export const getProfile = () =>
  apiFetch("/profile");

export const updateProfile = (data) =>
  apiFetch("/profile", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

export const changePassword = (data) =>
  apiFetch("/auth/change-password", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

// Penilaian 
export const getAllFeedbacks = () =>
  apiFetch("/admin/feedbacks");

// Laporan Pengaduan 
export const getAllComplaints = () =>
  apiFetch("/admin/complaints");

export const respondComplaint = (id, data) =>
  apiFetch(`/admin/complaints/${id}/respond`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });