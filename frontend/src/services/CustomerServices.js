import { apiFetch } from "./api";

// Dashboard / Submissions 
export const getMySubmissions = () =>
  apiFetch("/customer/submissions/my");

export const getMyBimtekMagangApplications = () =>
  apiFetch("/customer/bimtek-magang/my");

export const getMyBimtekMagangReplyLetter = (id) =>
  apiFetch(`/customer/bimtek-magang/${id}/reply-letter`);

export const createBimtekMagangApplication = (formData) =>
  apiFetch("/customer/bimtek-magang", {
    method: "POST",
    body: formData,
  });

// Notifikasi
export const getNotifications = () =>
  apiFetch("/customer/notifications");

// Test Services (katalog)
export const getTestServices = () =>
  apiFetch("/customer/test-services");

// Billing 
export const getBilling = (submissionId) =>
  apiFetch(`/customer/billings/${submissionId}`);

export const uploadPaymentProof = (submissionId, formData) =>
  apiFetch(`/customer/billings/${submissionId}/proof`, {
    method: "POST",
    body: formData,
  });

// LHU 
export const getLHU = (submissionId) =>
  apiFetch(`/customer/submissions/${submissionId}/lhu`);

// Complaint / Pengaduan
export const getMyComplaints = () =>
  apiFetch("/customer/complaints");

export const createComplaint = (data) =>
  apiFetch("/customer/complaints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

// Profil
export const getProfile = () =>
  apiFetch("/profile");

export const updateProfile = (data) =>
  apiFetch("/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updateProfileDoc = (formData) =>
  apiFetch("/profile/document", {
    method: "PATCH",
    body: formData,
  });

export const changePassword = (data) =>
  apiFetch("/auth/change-password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

// Feedback / Penilaian Kepuasan
export const createFeedback = (data) =>
  apiFetch("/feedbacks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getActiveFeedbackQuestions = () =>
  apiFetch("/feedbacks/questions/active");