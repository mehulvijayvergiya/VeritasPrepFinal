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

async function requestMultipart(path, formData, { token, auth } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (auth) {
    const adminToken = getToken();
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
  }

  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
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
  submitApplication: (formData, options) => requestMultipart("/submissions", formData, options),
  adminLogin: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  listSubmissions: () => request("/submissions", { auth: true }),
  getSubmission: (id) => request(`/submissions/${id}`, { auth: true }),
  getSubmissionDownloadUrl: (id) => request(`/submissions/${id}/download-url`, { auth: true }),
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
  createCreditRequest: (payload) =>
    request("/credit-requests", { method: "POST", body: payload }),
  listCreditRequests: () => request("/credit-requests", { auth: true }),
  approveCreditRequest: (id) =>
    request(`/credit-requests/${id}/approve`, { method: "POST", auth: true }),
  rejectCreditRequest: (id) =>
    request(`/credit-requests/${id}/reject`, { method: "POST", auth: true }),

  // Student account (Supabase-authenticated)
  getStudentMe: (studentToken) => request("/students/me", { token: studentToken }),
  getStudentProfile: (profileId) => request(`/students/profile/${profileId}`, { auth: true }),
  getStudentRoster: () => request("/students/roster", { auth: true }),
  updateStudentMe: (payload, studentToken) =>
    request("/students/me", { method: "PATCH", body: payload, token: studentToken }),
  getStudentSubmissions: (studentToken) => request("/students/submissions", { token: studentToken }),
  getStudentTransactions: (studentToken) => request("/students/transactions", { token: studentToken }),
  getStudentSubmissionDownloadUrl: (id, studentToken) =>
    request(`/students/submissions/${id}/download-url`, { token: studentToken }),
  getStudentAppointments: (studentToken) => request("/appointments/my", { token: studentToken }),
  listMeetingSlots: () => request("/appointments/slots"),
  listMeetingSlotsAdmin: () => request("/appointments/slots/admin", { auth: true }),
  createMeetingSlot: (payload) => request("/appointments/slots", { method: "POST", body: payload, auth: true }),
  deleteMeetingSlot: (id) => request(`/appointments/slots/${id}`, { method: "DELETE", auth: true }),
  listAppointments: () => request("/appointments", { auth: true }),
  createAppointment: (payload, studentToken) =>
    request("/appointments", { method: "POST", body: payload, token: studentToken }),
  rescheduleAppointment: (id, payload, studentToken) =>
    request(`/appointments/${id}/reschedule`, { method: "PATCH", body: payload, token: studentToken }),
  updateAppointmentStatus: (id, status) =>
    request(`/appointments/${id}/status`, { method: "PATCH", body: { status }, auth: true }),
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
