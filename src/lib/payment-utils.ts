export function calculateNextDueDate(paidOnDate: string, billingAnchorDate: string) {
  const paid = new Date(`${paidOnDate}T00:00:00`);
  const anchor = new Date(`${billingAnchorDate}T00:00:00`);
  const year = paid.getFullYear();
  const month = paid.getMonth();
  const anchorDay = anchor.getDate();

  const nextMonthDate = new Date(year, month + 1, 1);
  const lastDayOfNextMonth = new Date(year, month + 2, 0).getDate();
  nextMonthDate.setDate(Math.min(anchorDay, lastDayOfNextMonth));

  return nextMonthDate.toISOString().slice(0, 10);
}

export function formatPaymentDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function getDaysUntilDue(nextDueDate: string) {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(`${nextDueDate}T00:00:00`);
  const diff = due.getTime() - current.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDueStatus(nextDueDate: string) {
  const daysUntilDue = getDaysUntilDue(nextDueDate);

  if (daysUntilDue < 0) {
    return {
      label: `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"}`,
      tone: "red",
      priority: 0,
    };
  }

  if (daysUntilDue === 0) {
    return {
      label: "Due today",
      tone: "orange",
      priority: 1,
    };
  }

  if (daysUntilDue === 1) {
    return {
      label: "Due in 1 day",
      tone: "orange",
      priority: 2,
    };
  }

  if (daysUntilDue === 2) {
    return {
      label: "Due in 2 days",
      tone: "yellow",
      priority: 3,
    };
  }

  return {
    label: "Active",
    tone: "green",
    priority: 4,
  };
}
