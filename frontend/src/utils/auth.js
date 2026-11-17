const TOKEN_KEY = "si-bvet-token";
const USER_KEY  = "si-bvet-user";

function clearLegacyAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const getToken = () => {
  clearLegacyAuth();
  return sessionStorage.getItem(TOKEN_KEY);
};

export const getUser = () => {
  try {
    clearLegacyAuth();
    return JSON.parse(sessionStorage.getItem(USER_KEY));
  }
  catch { return null; }
};

export const saveAuth = (token, user) => {
  clearLegacyAuth();
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = () => {
  clearLegacyAuth();
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => !!getToken();

export const getDashboardPath = (role) => ({
  customer:   "/customer/beranda",
  admin:      "/admin/beranda",
  superadmin: "/superadmin/beranda",
}[(role ?? "").toLowerCase()] ?? "/login");

export const getRoleLabel = (role) => ({
  customer:   "Pelanggan",
  admin:      "Petugas Lab",
  superadmin: "Admin Lab",
}[(role ?? "").toLowerCase()] ?? role);