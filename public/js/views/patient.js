import { state, labels } from "../state.js";
import { api, el, escapeHtml, toast, updateMetric } from "../api.js";
import {
  appointmentChip,
  empty,
  monogram,
  onClick,
  renderRail,
} from "../ui.js";

export async function loadSpecializations() {
  state.specializations = await api("/api/specializations");
  el("specializationFilter").innerHTML = [
    '<option value="">Tất cả chuyên khoa</option>',
    ...state.specializations.map(
      (item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`,
    ),
  ].join("");
}

export async function loadDoctors() {
  const params = new URLSearchParams();
  if (el("specializationFilter").value) {
    params.set("specializationId", el("specializationFilter").value);
  }
  if (el("doctorSearch").value.trim()) params.set("q", el("doctorSearch").value.trim());

  state.doctors = await api(`/api/doctors?${params.toString()}`);
  updateMetric("doctorMetric", state.doctors.length);
  updateMetric("staffDoctorMetric", state.doctors.length);
  updateMetric(
    "patientSlotMetric",
    state.doctors.reduce((sum, doctor) => sum + Number(doctor.availableSlots || 0), 0),
  );

  const list = el("doctorList");
  list.innerHTML = state.doctors.length
    ? state.doctors
        .map((doctor) => {
          const free = Number(doctor.availableSlots || 0);
          return `
            <article class="doctor">
              <span class="doctor-mono" aria-hidden="true">${escapeHtml(monogram(doctor.name))}</span>
              <div class="doctor-main">
                <span class="doctor-name">${escapeHtml(doctor.name)}</span>
                <p class="doctor-meta">${escapeHtml(doctor.specialization)} · Phòng ${escapeHtml(doctor.room)}</p>
              </div>
              <p class="doctor-slots num ${free ? "" : "is-empty"}">
                <b>${escapeHtml(free)}</b>giờ trống
              </p>
              <button class="btn btn--quiet btn--sm" data-doctor="${escapeHtml(doctor.id)}">
                Xem giờ
              </button>
            </article>
          `;
        })
        .join("")
    : empty("Không có bác sĩ nào khớp bộ lọc hiện tại.");

  onClick(list, "[data-doctor]", (button) => loadSlots(Number(button.dataset.doctor)));
}

export async function loadSlots(doctorId = state.selectedDoctorId) {
  if (!doctorId) return;
  state.selectedDoctorId = doctorId;

  const date = el("slotDate").value;
  const slots = await api(
    `/api/doctors/${doctorId}/slots${date ? `?date=${encodeURIComponent(date)}` : ""}`,
  );

  const doctor = state.doctors.find((item) => item.id === doctorId);
  el("slotHint").textContent = doctor
    ? `${doctor.name} · ${doctor.specialization} · Phòng ${doctor.room}`
    : "Khung giờ còn trống";

  const list = el("slotList");
  renderRail(list, slots, {
    emptyText: "Bác sĩ này không còn giờ trống cho lựa chọn hiện tại.",
    row: (slot) => ({
      state: "is-open",
      body: `
        <span class="rail-main">
          <span class="rail-title">${escapeHtml(slot.doctorName)}</span>
          <span class="rail-meta">Phòng ${escapeHtml(slot.room)} · ${escapeHtml(slot.specialization)}</span>
        </span>
        <span class="rail-actions">
          <button class="btn btn--primary btn--sm" data-book="${escapeHtml(slot.id)}">Giữ chỗ</button>
        </span>
      `,
    }),
  });

  onClick(list, "[data-book]", (button) => bookAppointment(Number(button.dataset.book)));
}

export async function bookAppointment(slotId) {
  await api("/api/appointments", {
    method: "POST",
    body: JSON.stringify({ slotId, type: el("appointmentType").value }),
  });
  toast("Đã giữ chỗ, chờ nhân viên xác nhận");
  await Promise.all([loadSlots(), loadMyAppointments(), loadDoctors()]);
}

export async function loadMyAppointments() {
  if (state.user.role !== "patient") return;

  const appointments = await api("/api/my-appointments");
  updateMetric(
    "myAppointmentMetric",
    appointments.filter((item) => item.status !== "cancelled").length,
  );

  const list = el("myAppointments");
  renderRail(list, appointments, {
    emptyText: "Bạn chưa có lịch hẹn nào. Chọn một bác sĩ để bắt đầu.",
    row: (item) => ({
      state:
        item.status === "cancelled"
          ? "is-off"
          : item.status === "confirmed"
            ? "is-done"
            : "is-pending",
      body: `
        <span class="rail-main">
          <span class="rail-title">${escapeHtml(item.doctorName)}</span>
          <span class="rail-meta">
            ${escapeHtml(item.specialization)} · Phòng ${escapeHtml(item.room)} · ${escapeHtml(labels[item.type])}
          </span>
        </span>
        <span class="rail-actions">
          ${appointmentChip(item.status)}
          ${
            item.status === "cancelled"
              ? ""
              : `<button class="btn btn--danger btn--sm" data-cancel="${escapeHtml(item.id)}">Hủy</button>`
          }
        </span>
      `,
    }),
  });

  onClick(list, "[data-cancel]", (button) => cancelAppointment(Number(button.dataset.cancel)));
}

export async function cancelAppointment(id) {
  await api(`/api/appointments/${id}/cancel`, { method: "POST", body: "{}" });
  toast("Đã hủy lịch hẹn");
  window.dispatchEvent(new CustomEvent("medbook:reload"));
}

/* ───────────  Đề xuất (Offer Engine) — US-03/04/05  ─────────── */

function formatCountdown(seconds) {
  const clamped = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function loadMyOffers() {
  if (state.user.role !== "patient") return;

  const offers = await api("/api/my-offers");
  const list = el("myOffers");
  renderRail(list, offers, {
    emptyText: "Hiện chưa có đề xuất nào. Khi có khung giờ phù hợp, đề xuất sẽ xuất hiện ở đây.",
    row: (item) => ({
      state: item.remainingSeconds > 0 ? "is-pending" : "is-off",
      body: `
        <span class="rail-main">
          <span class="rail-title">${escapeHtml(item.doctorName)}</span>
          <span class="rail-meta">
            ${escapeHtml(item.specialization)} · Phòng ${escapeHtml(item.room)} · ${escapeHtml(labels[item.appointmentType])}
          </span>
          <span class="rail-meta">
            ${
              item.remainingSeconds > 0
                ? `Đề xuất — cần xác nhận trong <b class="offer-countdown" data-remaining="${escapeHtml(item.remainingSeconds)}">${formatCountdown(item.remainingSeconds)}</b>`
                : `<b class="offer-countdown" data-remaining="0">Đề xuất đã hết hạn</b>`
            }
          </span>
        </span>
        <span class="rail-actions">
          <button class="btn btn--primary btn--sm" data-accept="${escapeHtml(item.id)}" ${item.remainingSeconds > 0 ? "" : "disabled"}>Chấp nhận</button>
          <button class="btn btn--quiet btn--sm" data-decline="${escapeHtml(item.id)}" ${item.remainingSeconds > 0 ? "" : "disabled"}>Từ chối</button>
        </span>
      `,
    }),
  });

  onClick(list, "[data-accept]", (button) => acceptOffer(Number(button.dataset.accept)));
  onClick(list, "[data-decline]", (button) => declineOffer(Number(button.dataset.decline)));
}

/** Đếm ngược tại chỗ mỗi giây, không gọi lại API — chỉ vô hiệu hoá nút khi hết hạn. */
export function tickOfferCountdowns() {
  document.querySelectorAll(".offer-countdown").forEach((node) => {
    const remaining = Number(node.dataset.remaining) - 1;
    if (Number(node.dataset.remaining) <= 0) return;
    node.dataset.remaining = String(remaining);
    if (remaining <= 0) {
      node.textContent = "Đề xuất đã hết hạn";
      node.closest(".rail-row")
        ?.querySelectorAll("[data-accept], [data-decline]")
        .forEach((button) => {
          button.disabled = true;
        });
    } else {
      node.textContent = formatCountdown(remaining);
    }
  });
}

export async function acceptOffer(id) {
  await api(`/api/offers/${id}/accept`, { method: "POST", body: "{}" });
  toast("Đã xác nhận đề xuất — lịch hẹn mới đã được tạo");
  window.dispatchEvent(new CustomEvent("medbook:reload"));
}

export async function declineOffer(id) {
  await api(`/api/offers/${id}/decline`, { method: "POST", body: "{}" });
  toast("Đã từ chối đề xuất");
  await loadMyOffers();
}

export async function loadMyWaitingList() {
  if (state.user.role !== "patient") return;

  const entries = await api("/api/my-waiting-list");
  const list = el("myWaitingList");
  list.innerHTML = entries.length
    ? entries
        .map(
          (item) => `
            <article class="doctor">
              <span class="doctor-mono" aria-hidden="true">${escapeHtml(monogram(item.doctorName || item.specialization || "?"))}</span>
              <div class="doctor-main">
                <span class="doctor-name">${escapeHtml(item.doctorName || item.specialization)}</span>
                <p class="doctor-meta">Đăng ký từ ${escapeHtml(item.createdAt)}</p>
              </div>
              <span class="chip ${item.status === "offered" ? "chip--pending" : "chip--open"}">
                ${escapeHtml(labels[item.status] || item.status)}
              </span>
            </article>
          `,
        )
        .join("")
    : empty("Bạn chưa có trong danh sách chờ nào.");
}
