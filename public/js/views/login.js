import { state } from "../state.js";
import { api, el, escapeHtml, roleLabel, toast } from "../api.js";

export function showLogin() {
  state.user = null;
  localStorage.removeItem("medbookUserId");
  el("loginScreen").classList.remove("hidden");
  el("appShell").classList.add("hidden");
}

export function showApp() {
  el("loginScreen").classList.add("hidden");
  el("appShell").classList.remove("hidden");
}

export function fillLoginFromQuickAccount() {
  const user = state.users.find((item) => item.id === Number(el("quickAccount").value));
  if (!user) return;
  el("loginEmail").value = user.email;
  el("loginPassword").value = "demo123";
}

export function fillQuickAccounts() {
  const groups = state.users.reduce((acc, user) => {
    acc[user.role] = acc[user.role] || [];
    acc[user.role].push(user);
    return acc;
  }, {});
  el("quickAccount").innerHTML = Object.entries(groups)
    .map(
      ([role, users]) => `
      <optgroup label="${escapeHtml(roleLabel(role))}">
        ${users
          .map(
            (user) =>
              `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} - ${escapeHtml(user.email)}</option>`,
          )
          .join("")}
      </optgroup>
    `,
    )
    .join("");
  const first = state.users[0];
  if (first) {
    el("quickAccount").value = String(first.id);
    fillLoginFromQuickAccount();
  }
}

// Đọc lại phiên đã lưu để F5 không bị đăng xuất.
// Trả về true nếu khôi phục được, false nếu phải hiện màn hình đăng nhập.
export async function restoreSession() {
  const savedId = localStorage.getItem("medbookUserId");
  if (!savedId) return false;

  state.user = { id: Number(savedId) };
  try {
    state.user = await api("/api/me");
    showApp();
    return true;
  } catch (error) {
    state.user = null;
    localStorage.removeItem("medbookUserId");
    return false;
  }
}

export async function loadUsers() {
  state.users = await api("/api/demo-users");
  fillQuickAccounts();
}

export async function login(event, afterLogin) {
  event.preventDefault();
  const result = await api("/api/demo-login", {
    method: "POST",
    body: JSON.stringify({
      email: el("loginEmail").value.trim(),
      password: el("loginPassword").value,
    }),
  });
  state.user = result.user;
  localStorage.setItem("medbookUserId", String(state.user.id));
  showApp();
  await afterLogin();
  toast(`Xin chào ${state.user.name}`);
}
