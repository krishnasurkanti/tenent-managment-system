function normalizeToDate(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getRentStatus(dueDate, paidOn = null) {
  if (paidOn) {
    return "paid";
  }

  const today = normalizeToDate(new Date());
  const nextDue = normalizeToDate(dueDate);
  return nextDue < today ? "overdue" : "pending";
}

function calculateNextDueDate(anchorDay, paidOn) {
  const paidDate = normalizeToDate(paidOn);
  const year = paidDate.getFullYear();
  const month = paidDate.getMonth();

  const nextMonth = new Date(year, month + 1, 1);
  const lastDay = new Date(year, month + 2, 0).getDate();
  nextMonth.setDate(Math.min(anchorDay, lastDay));
  nextMonth.setHours(0, 0, 0, 0);

  return nextMonth;
}

module.exports = { getRentStatus, calculateNextDueDate };
