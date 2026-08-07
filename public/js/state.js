export const state = {
  user: null,
  users: [],
  specializations: [],
  doctors: [],
  selectedDoctorId: null,
};

export const labels = {
  patient: "Bệnh nhân",
  staff: "Nhân viên",
  system: "Hệ thống",
  booked: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
  in_person: "Khám trực tiếp",
  online: "Tư vấn online",
  available: "Còn trống",
  // Dynamic Appointment Rescheduling & Waiting List (Day 3)
  urgent: "Khẩn cấp",
  high: "Cao",
  normal: "Bình thường",
  waiting: "Đang chờ",
  offered: "Đang có đề xuất",
  fulfilled: "Đã nhận lịch",
  sent: "Đã gửi",
  declined: "Đã từ chối",
  expired: "Đã hết hạn",
};
