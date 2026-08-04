import { state } from "./state.js";
import { el, roleLabel, today, toast } from "./api.js";
import { empty as emptyState } from "./ui.js";
import {
  fillLoginFromQuickAccount,
  loadUsers,
  login,
  restoreSession,
  showLogin,
} from "./views/login.js";
import {
  loadDoctors,
  loadMyAppointments,
  loadSlots,
  loadSpecializations,
} from "./views/patient.js";
import {
  createSlot,
  loadManageSlots,
  renderSlotDoctorOptions,
  loadStaffAppointments,
} from "./views/staff.js";

/* ─────────────────────────────  Giao diện sáng / tối  ───────────────────────────── */

function syncThemeButton(theme) {
  const dark = theme === "dark";
  el("themeLabel").textContent = dark ? "Giao diện sáng" : "Giao diện tối";
  el("themeToggle").setAttribute("aria-pressed", String(dark));
}

/** Mặc định là giao diện sáng; chỉ chuyển tối khi người dùng tự chọn. */
function activeTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function toggleTheme() {
  const next = activeTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("medbookTheme", next);
  syncThemeButton(next);
}

/* ─────────────────────────────  Khung ứng dụng  ───────────────────────────── */

const NAV = {
  patient: [
    ["patientView", "Tổng quan"],
    ["doctorList", "Tìm bác sĩ"],
    ["myAppointments", "Lịch của tôi"],
  ],
  staff: [
    ["staffView", "Tổng quan"],
    ["staffAppointments", "Lịch hẹn"],
    ["manageSlots", "Lịch làm việc"],
  ],
};

function renderNav() {
  const nav = el("nav");
  nav.innerHTML = NAV[state.user.role]
    .map(
      ([target, label], index) =>
        `<button type="button" class="${index === 0 ? "active" : ""}" data-scroll="${target}">${label}</button>`,
    )
    .join("");

  nav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      el(button.dataset.scroll).scrollIntoView({ behavior: "smooth", block: "start" });
      nav.querySelectorAll("button").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

function renderUserShell() {
  const patient = state.user.role === "patient";
  el("currentName").textContent = state.user.name;
  el("currentUser").textContent = state.user.email;
  el("roleBadge").textContent = roleLabel(state.user.role);
  el("pageTitle").textContent = patient ? "Đặt lịch khám" : "Điều phối trong ngày";
  el("patientView").classList.toggle("hidden", !patient);
  el("staffView").classList.toggle("hidden", patient);
  renderNav();
}

async function loadAll() {
  el("apiStatus").textContent = "Đang đồng bộ";
  if (state.user.role === "patient") {
    await Promise.all([loadDoctors(), loadMyAppointments()]);
  } else {
    await Promise.all([loadStaffAppointments(), loadManageSlots()]);
  }
  el("apiStatus").textContent = "Đã kết nối";
}

async function loadAfterLogin() {
  renderUserShell();
  if (state.user.role === "patient") {
    el("slotList").innerHTML = emptyState("Chọn một bác sĩ để xem khung giờ còn trống.");
  }
  await loadSpecializations();
  await loadDoctors();
  renderSlotDoctorOptions();
  await loadAll();
}

/* Mọi handler đều đi qua đây để lỗi API hiện thành toast thay vì im lặng. */
function guard(handler) {
  return async (event) => {
    try {
      await handler(event);
    } catch (error) {
      toast(error.message);
    }
  };
}

function bindEvents() {
  el("quickAccount").addEventListener("change", fillLoginFromQuickAccount);
  el("loginForm").addEventListener("submit", guard((event) => login(event, loadAfterLogin)));
  el("logoutBtn").addEventListener("click", showLogin);
  el("themeToggle").addEventListener("click", toggleTheme);

  el("searchDoctorsBtn").addEventListener("click", guard(loadDoctors));
  el("specializationFilter").addEventListener("change", guard(loadDoctors));
  el("doctorSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") guard(loadDoctors)(event);
  });
  el("slotDate").addEventListener("change", guard(() => loadSlots()));
  el("refreshMyAppointments").addEventListener("click", guard(loadMyAppointments));

  el("staffDate").addEventListener("change", guard(loadAll));
  el("loadStaffAppointments").addEventListener("click", guard(loadStaffAppointments));
  el("refreshManageSlots").addEventListener("click", guard(loadManageSlots));
  el("slotForm").addEventListener("submit", guard(createSlot));

  window.addEventListener("medbook:reload", guard(loadAll));
}

async function boot() {
  try {
    el("slotDate").value = today();
    el("staffDate").value = today();
    el("newSlotDate").value = today();
    syncThemeButton(activeTheme());

    await loadUsers();
    bindEvents();

    if (await restoreSession()) {
      await loadAfterLogin();
    } else {
      showLogin();
    }
  } catch (error) {
    toast(error.message);
  }
}

boot();
