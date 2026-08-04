import { escapeHtml, toast, today } from "./api.js";

/* ═══════════════════════════════════════════════════════════════════
   Time rail — thành phần hiển thị chủ đạo của MedBook.

   Mọi danh sách trong app đều là chuỗi sự kiện theo thời gian, nên
   chúng dùng chung một cấu trúc: nhóm theo ngày, cột giờ thẳng hàng,
   và một vạch "Bây giờ" trên nhóm của ngày hôm nay.
   ═══════════════════════════════════════════════════════════════════ */

const WEEKDAYS = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

function shiftDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isToday(iso) {
  return iso === today();
}

/** "Hôm nay · Thứ Hai, 20/07" — ngày luôn kèm thứ để nhân viên định vị nhanh. */
export function dayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const pad = (n) => String(n).padStart(2, "0");
  const short = `${weekday}, ${pad(d)}/${pad(m)}`;

  if (iso === today()) return `Hôm nay · ${short}`;
  if (iso === shiftDays(today(), 1)) return `Ngày mai · ${short}`;
  if (iso === shiftDays(today(), -1)) return `Hôm qua · ${short}`;
  return `${short}/${y}`;
}

function currentTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function empty(text) {
  return `<p class="empty">${escapeHtml(text)}</p>`;
}

/** Chữ cái đầu của tên bác sĩ, bỏ tiền tố "BS." — dùng làm ô monogram. */
export function monogram(name) {
  const words = String(name || "")
    .replace(/^BS\.?\s*/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "??";
  const first = words[0][0] || "";
  const last = words.length > 1 ? words[words.length - 1][0] : words[0][1] || "";
  return (first + last).toUpperCase();
}

/* Trạng thái slot và trạng thái lịch hẹn dùng chung chữ "booked" nhưng
   mang nghĩa khác nhau, nên tách hai hàm để nhãn không bị lẫn. */

export function slotChip(status) {
  return status === "available"
    ? '<span class="chip chip--open">Còn trống</span>'
    : '<span class="chip chip--busy">Đã đặt</span>';
}

export function appointmentChip(status) {
  if (status === "confirmed") return '<span class="chip chip--done">Đã xác nhận</span>';
  if (status === "cancelled") return '<span class="chip chip--off">Đã hủy</span>';
  return '<span class="chip chip--pending">Chờ xác nhận</span>';
}

function groupByDate(items) {
  const groups = [];
  items.forEach((item) => {
    const last = groups[groups.length - 1];
    if (last && last[0] === item.date) last[1].push(item);
    else groups.push([item.date, [item]]);
  });
  return groups;
}

function rowHtml(item, { state = "", body }) {
  return `
    <li class="rail-row ${state}">
      <span class="rail-time">
        <b>${escapeHtml(item.startTime)}</b><i>${escapeHtml(item.endTime)}</i>
      </span>
      <span class="rail-card">${body}</span>
    </li>
  `;
}

/**
 * Vẽ danh sách vào `node`.
 * `row(item)` trả về `{ state, body }`: state là lớp CSS của chấm trên trục,
 * body là nội dung bên trong thẻ.
 */
export function renderRail(node, items, { row, emptyText }) {
  if (!items.length) {
    node.innerHTML = empty(emptyText);
    return;
  }

  node.innerHTML = groupByDate(items)
    .map(([date, group]) => {
      // Trong một ngày luôn đọc xuôi theo giờ — thứ tự này cũng là điều kiện
      // để đặt đúng chỗ vạch "Bây giờ".
      const list = [...group].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const rows = list.map((item) => rowHtml(item, row(item)));

      if (isToday(date)) {
        const now = currentTime();
        const next = list.findIndex((item) => item.startTime > now);
        const marker = `<li class="rail-now"><span>Bây giờ ${now}</span></li>`;
        rows.splice(next === -1 ? rows.length : next, 0, marker);
      }

      return `
        <p class="rail-day ${isToday(date) ? "is-today" : ""}">${escapeHtml(dayLabel(date))}</p>
        <ol class="rail">${rows.join("")}</ol>
      `;
    })
    .join("");
}

/**
 * Gắn sự kiện cho các nút vừa được vẽ lại bằng innerHTML.
 * Lỗi từ API được hiện thành toast — nếu không, một 409 sẽ im lặng biến mất.
 */
export function onClick(node, selector, handler) {
  node.querySelectorAll(selector).forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await handler(button);
      } catch (error) {
        toast(error.message);
      }
    });
  });
}
