const BASE = "/api";

function getToken() {
  return sessionStorage.getItem("vp_admin_token");
}

async function request(path, { method = "GET", body, auth = false, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (auth) {
    const adminToken = getToken();
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || "Something went wrong.");
    error.fields = data.fields;
    error.status = res.status;
    throw error;
  }

  return data;
}

export const api = {
  submitApplication: (payload) => request("/submissions", { method: "POST", body: payload }),
  adminLogin: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  listSubmissions: () => request("/submissions", { auth: true }),
  getSubmission: (id) => request(`/submissions/${id}`, { auth: true }),
  updateSubmission: (id, payload) =>
    request(`/submissions/${id}`, { method: "PATCH", body: payload, auth: true }),
  updateAnnotations: (id, annotations) =>
    request(`/submissions/${id}/annotations`, {
      method: "PATCH",
      body: { annotations },
      auth: true,
    }),
  addComment: (id, text) =>
    request(`/submissions/${id}/comments`, { method: "POST", body: { text }, auth: true }),
  deleteComment: (id, commentId) =>
    request(`/submissions/${id}/comments/${commentId}`, { method: "DELETE", auth: true }),
  sendFeedback: (id) =>
    request(`/submissions/${id}/send-feedback`, { method: "POST", auth: true }),

  // Veritas Credits
  getAccount: (email) => request(`/accounts/${encodeURIComponent(email)}`),
  createCreditRequest: (payload) =>
    request("/credit-requests", { method: "POST", body: payload }),
  listCreditRequests: () => request("/credit-requests", { auth: true }),
  approveCreditRequest: (id) =>
    request(`/credit-requests/${id}/approve`, { method: "POST", auth: true }),
  rejectCreditRequest: (id) =>
    request(`/credit-requests/${id}/reject`, { method: "POST", auth: true }),

  // Student account (Supabase-authenticated)
  getStudentMe: (studentToken) => request("/students/me", { token: studentToken }),
};

export function setToken(token) {
  sessionStorage.setItem("vp_admin_token", token);
}
export function clearToken() {
  sessionStorage.removeItem("vp_admin_token");
}
export function isLoggedIn() {
  return Boolean(getToken());
}
