import { state, labels } from "../state.js";
import { api, el, escapeHtml, toast, updateMetric } from "../api.js";
import { empty, onClick } from "../ui.js";

/* ───────────  Staff — quản trị danh sách chờ & nhật ký đề xuất (US-01/07)  ─────────── */

export function renderWaitlistDoctorOptions() {
  el("waitlistDoctor").innerHTML = [
    '<option value="">— không chọn —</option>',
    ...state.doctors.map(
      (doctor) =>
        `<option value="${escapeHtml(doctor.id)}">${escapeHtml(doctor.name)} · ${escapeHtml(doctor.specialization)}</option>`,
    ),
  ].join("");
}

export function renderWaitlistSpecializationOptions() {
  el("waitlistSpecialization").innerHTML = [
    '<option value="">— không chọn —</option>',
    ...state.specializations.map(
      (item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`,
    ),
  ].join("");
}

function priorityChip(priority) {
  const cls = priority === "urgent" ? "chip--off" : priority === "high" ? "chip--pending" : "chip--open";
  return `<span class="chip ${cls}">${escapeHtml(labels[priority] || priority)}</span>`;
}

function entryStatusChip(status) {
  const cls = status === "offered" ? "chip--pending" : status === "waiting" ? "chip--open" : "chip--off";
  return `<span class="chip ${cls}">${escapeHtml(labels[status] || status)}</span>`;
}

export async function loadWaitingListPanel() {
  if (state.user.role !== "staff") return;

  const entries = await api("/api/waiting-list");
  updateMetric(
    "waitingListMetric",
    entries.filter((item) => item.status === "waiting" || item.status === "offered").length,
  );

  const list = el("waitingListPanel");
  list.innerHTML = entries.length
    ? entries
        .map(
          (item) => `
            <article class="doctor">
              <div class="doctor-main">
                <span class="doctor-name">${escapeHtml(item.patientName)}</span>
                <p class="doctor-meta">
                  <span class="mono">${escapeHtml(item.patientPhone)}</span> ·
                  ${escapeHtml(item.doctorName || item.specialization || "—")} ·
                  vào lúc ${escapeHtml(item.createdAt)}
                </p>
              </div>
              ${priorityChip(item.medicalPriority)}
              ${entryStatusChip(item.status)}
              ${
                item.status === "waiting" || item.status === "offered"
                  ? `<button class="btn btn--danger btn--sm" data-cancel-entry="${escapeHtml(item.id)}">Hủy</button>`
                  : ""
              }
            </article>
          `,
        )
        .join("")
    : empty("Danh sách chờ hiện đang trống.");

  onClick(list, "[data-cancel-entry]", (button) => cancelWaitingListEntry(Number(button.dataset.cancelEntry)));
}

export async function createWaitingListEntry(event) {
  event.preventDefault();
  const doctorId = el("waitlistDoctor").value;
  const specializationId = el("waitlistSpecialization").value;

  await api("/api/waiting-list", {
    method: "POST",
    body: JSON.stringify({
      patientId: Number(el("waitlistPatientId").value),
      doctorId: doctorId ? Number(doctorId) : null,
      specializationId: specializationId ? Number(specializationId) : null,
      medicalPriority: el("waitlistPriority").value,
    }),
  });
  toast("Đã thêm vào danh sách chờ");
  el("waitlistPatientId").value = "";
  await loadWaitingListPanel();
}

export async function cancelWaitingListEntry(id) {
  await api(`/api/waiting-list/${id}`, { method: "DELETE" });
  toast("Đã hủy đăng ký chờ");
  await loadWaitingListPanel();
}

const EVENT_LABELS = {
  offer_sent: "Đã gửi đề xuất",
  offer_accepted: "Đã chấp nhận",
  offer_declined: "Đã từ chối",
  offer_expired: "Đã hết hạn",
  offer_cancelled: "Đã hủy đề xuất",
  no_candidate: "Không có ứng viên phù hợp",
  entry_created: "Thêm vào danh sách chờ",
  entry_cancelled: "Hủy đăng ký chờ",
  entry_fulfilled: "Đã nhận lịch",
};

export async function loadOfferEventsLog() {
  if (state.user.role !== "staff") return;

  const events = await api("/api/offer-events?limit=50");
  const list = el("offerEventsLog");
  list.innerHTML = events.length
    ? [...events]
        .reverse()
        .map(
          (item) => `
            <article class="doctor">
              <div class="doctor-main">
                <span class="doctor-name">${escapeHtml(EVENT_LABELS[item.eventType] || item.eventType)}</span>
                <p class="doctor-meta">
                  ${escapeHtml(item.occurredAt)} · slot #${escapeHtml(item.slotId ?? "—")} ·
                  tác nhân: ${escapeHtml(labels[item.actor] || item.actor)}${item.reason ? ` · lý do: ${escapeHtml(item.reason)}` : ""}
                </p>
              </div>
            </article>
          `,
        )
        .join("")
    : empty("Chưa có sự kiện nào.");
}
