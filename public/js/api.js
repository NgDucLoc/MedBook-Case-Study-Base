import { state, labels } from "./state.js";

export const el = (id) => document.getElementById(id);

/** Ngày hôm nay theo giờ máy người dùng (toISOString trả giờ UTC nên lệch ngày). */
export function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function updateMetric(id, value) {
  const node = el(id);
  if (node) node.textContent = String(value);
}

export function toast(message) {
  const box = el("toast");
  box.textContent = message;
  box.classList.remove("hidden");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => box.classList.add("hidden"), 3000);
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (state.user) headers["X-Demo-User-Id"] = String(state.user.id);
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Có lỗi xảy ra");
  return payload.data;
}

export function roleLabel(role) {
  return labels[role] || role;
}
