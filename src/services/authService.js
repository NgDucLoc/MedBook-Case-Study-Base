const userRepository = require("../repositories/userRepository");
const { toInt } = require("../utils/validate");
const { httpError } = require("../errors");

function stripPrivateUserFields(user) {
  if (!user) return null;
  const publicUser = { ...user };
  delete publicUser.demo_password;
  return publicUser;
}

async function listDemoUsers() {
  return userRepository.listDemoUsers();
}

async function login({ email, password }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const demoPassword = String(password || "");
  if (!normalizedEmail || !demoPassword) {
    throw httpError(400, "Vui lòng nhập email và mật khẩu");
  }

  const user = await userRepository.findForLoginByEmail(normalizedEmail);
  if (!user || user.demo_password !== demoPassword) {
    throw httpError(401, "Sai email hoặc mật khẩu demo");
  }

  return { user: stripPrivateUserFields(user) };
}

async function authenticateByHeader(userIdHeader) {
  if (!userIdHeader) {
    throw httpError(401, "Thiếu tài khoản demo");
  }
  const id = toInt(userIdHeader);
  if (!id) {
    throw httpError(401, "Tài khoản demo không hợp lệ");
  }
  const user = await userRepository.findPublicById(id);
  if (!user) {
    throw httpError(401, "Không tìm thấy tài khoản demo");
  }
  return user;
}

module.exports = { listDemoUsers, login, authenticateByHeader };
