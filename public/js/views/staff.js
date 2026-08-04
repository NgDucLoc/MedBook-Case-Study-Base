import { state, labels } from "../state.js";
import { api, el, escapeHtml, toast, updateMetric } from "../api.js";
import { appointmentChip, onClick, renderRail, slotChip } from "../ui.js";

export function renderSlotDoctorOptions() {
  el("slotDoctor").innerHTML = state.doctors.length
    ? state.doctors
        .map(
          (doctor) =>
            `<option value="${escapeHtml(doctor.id)}">${escapeHtml(doctor.name)} · ${escapeHtml(doctor.specialization)}</option>`,
        )
        .join("")
    : '<option value="">Chưa có bác sĩ</option>';
}

export async function loadStaffAppointments() {
  if (state.user.role !== "staff") return;

  const date = el("staffDate").value;
  const appointments = await api(
    `/api/appointments${date ? `?date=${encodeURIComponent(date)}` : ""}`,
  );
  updateMetric("staffAppointmentMetric", appointments.length);

  const list = el("staffAppointments");
  renderRail(list, appointments, {
    emptyText: "Không có lịch hẹn nào trong ngày đã chọn.",
    row: (item) => ({
      state:
        item.status === "cancelled"
          ? "is-off"
          : item.status === "confirmed"
            ? "is-done"
            : "is-pending",
      body: `
        <span class="rail-main">
          <span class="rail-title">${escapeHtml(item.patientName)} · ${escapeHtml(item.doctorName)}</span>
          <span class="rail-meta">
            <span class="mono">${escapeHtml(item.patientPhone)}</span>
            · Phòng ${escapeHtml(item.room)} · ${escapeHtml(labels[item.type])}
          </span>
        </span>
        <span class="rail-actions">
          ${appointmentChip(item.status)}
          ${
            item.status === "booked"
              ? `<button class="btn btn--primary btn--sm" data-confirm="${escapeHtml(item.id)}">Xác nhận</button>`
              : ""
          }
          ${
            item.status === "cancelled"
              ? ""
              : `<button class="btn btn--danger btn--sm" data-cancel="${escapeHtml(item.id)}">Hủy</button>`
          }
        </span>
      `,
    }),
  });

  onClick(list, "[data-confirm]", (button) => confirmAppointment(Number(button.dataset.confirm)));
  onClick(list, "[data-cancel]", (button) => cancelAppointment(Number(button.dataset.cancel)));
}

export async function confirmAppointment(id) {
  await api(`/api/appointments/${id}/confirm`, { method: "POST", body: "{}" });
  toast("Đã xác nhận lịch hẹn");
  window.dispatchEvent(new CustomEvent("medbook:reload"));
}

export async function cancelAppointment(id) {
  await api(`/api/appointments/${id}/cancel`, { method: "POST", body: "{}" });
  toast("Đã hủy lịch hẹn");
  window.dispatchEvent(new CustomEvent("medbook:reload"));
}

export async function loadManageSlots() {
  if (state.user.role !== "staff") return;

  const date = el("staffDate").value;
  const slots = await api(`/api/slots${date ? `?date=${encodeURIComponent(date)}` : ""}`);
  updateMetric(
    "availableSlotMetric",
    slots.filter((slot) => slot.status === "available").length,
  );

  const list = el("manageSlots");
  renderRail(list, slots, {
    emptyText: "Chưa có khung giờ nào cho ngày này. Thêm một khung giờ ở trên.",
    row: (slot) => ({
      state: slot.status === "available" ? "is-open" : "is-taken",
      body: `
        <span class="rail-main">
          <span class="rail-title">${escapeHtml(slot.doctorName)}</span>
          <span class="rail-meta">Phòng ${escapeHtml(slot.room)} · ${escapeHtml(slot.specialization)}</span>
        </span>
        <span class="rail-actions">
          ${slotChip(slot.status)}
          <button
            class="btn btn--quiet btn--sm"
            data-toggle-slot="${escapeHtml(slot.id)}"
            data-status="${slot.status === "available" ? "booked" : "available"}"
          >
            ${slot.status === "available" ? "Chặn giờ" : "Mở lại"}
          </button>
        </span>
      `,
    }),
  });

  onClick(list, "[data-toggle-slot]", (button) =>
    updateSlot(Number(button.dataset.toggleSlot), { status: button.dataset.status }),
  );
}

export async function createSlot(event) {
  event.preventDefault();
  await api("/api/slots", {
    method: "POST",
    body: JSON.stringify({
      doctorId: Number(el("slotDoctor").value),
      date: el("newSlotDate").value,
      startTime: el("newSlotStart").value,
      endTime: el("newSlotEnd").value,
    }),
  });
  toast("Đã thêm khung giờ");
  await loadManageSlots();
}

export async function updateSlot(id, changes) {
  await api(`/api/slots/${id}`, { method: "PUT", body: JSON.stringify(changes) });
  toast(changes.status === "available" ? "Đã mở lại khung giờ" : "Đã chặn khung giờ");
  await loadManageSlots();
}
