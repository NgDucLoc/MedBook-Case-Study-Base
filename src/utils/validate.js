const { httpError } = require("../errors");

function toInt(value, fallback = null) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function required(value, name) {
  if (value === undefined || value === null || value === "") {
    throw httpError(400, `Thiếu ${name}`);
  }
  return value;
}

module.exports = { toInt, required };
