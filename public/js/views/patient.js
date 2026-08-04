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
