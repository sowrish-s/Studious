const form = document.querySelector("#plannerForm");
const moodInput = document.querySelector("#mood");
const moodValue = document.querySelector("#moodValue");
const dueDateInput = document.querySelector("#dueDate");
const generateButton = document.querySelector(".generate-btn");
const buttonLabel = document.querySelector(".button-label");
const resultsColumn = document.querySelector(".results-column");
const ringProgress = document.querySelector("#ringProgress");
const ringCircumference = 2 * Math.PI * 52;
const completionStorageKey = "studious-plan-completion-v1";
let scoreAnimation;
let activePlanKey = "";

const today = new Date();
const defaultDue = new Date(today);
defaultDue.setDate(defaultDue.getDate() + 3);
dueDateInput.value = defaultDue.toISOString().split("T")[0];

document.querySelector("#dayName").textContent = today.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
document.querySelector("#dayNumber").textContent = today.getDate();
document.querySelector("#monthYear").textContent = today.toLocaleDateString("en-US", { month: "short", year: "numeric" }).replace(" ", " · ").toUpperCase();

function updateRange() {
  const percent = ((moodInput.value - 1) / 9) * 100;
  moodInput.style.background = `linear-gradient(90deg, var(--lime-dark) ${percent}%, #dfe4e1 ${percent}%)`;
  moodValue.textContent = moodInput.value;
}

moodInput.addEventListener("input", updateRange);

function formatTime(minutes) {
  const date = new Date();
  date.setHours(9, minutes, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function generateSchedule(assignment, hours, mood) {
  const totalMinutes = Math.round(hours * 60);
  const focusLength = mood <= 3 ? 25 : mood <= 6 ? 40 : 50;
  const breakLength = mood <= 4 ? 15 : 10;
  const tasks = [
    ["Set up + define the win", "Clarify your goal and gather materials"],
    [`Deep work: ${assignment}`, "Start with the highest-effort section"],
    ["Reset break", "Water, stretch, and step away"],
    ["Build momentum", "Continue, refine, and connect ideas"],
    ["Review + next steps", "Polish your progress and plan tomorrow"]
  ];
  const colors = ["#83a920", "#7bbcff", "#ff9b67", "#bd92f4", "#83a920"];
  const items = [];
  let used = 0;
  let clock = 0;
  let index = 0;

  while (used < totalMinutes) {
    const isBreak = index === 2 || index === 5;
    const length = Math.min(isBreak ? breakLength : focusLength, totalMinutes - used);
    const task = isBreak ? tasks[2] : tasks[Math.min(index, tasks.length - 1)];
    items.push({ start: clock, end: clock + length, length, task, color: colors[index % colors.length] });
    used += length;
    clock += length;
    index++;
  }

  return items;
}

function calculateReadiness(mood, risk, priority, hours) {
  const energyScore = mood * 10;
  const recoveryScore = 100 - risk;
  const capacityScore = Math.min(hours / 6, 1) * 100;
  return Math.round(energyScore * .35 + recoveryScore * .30 + capacityScore * .20 + priority * .15);
}

function getCompletionStore() {
  try {
    return JSON.parse(localStorage.getItem(completionStorageKey)) || {};
  } catch {
    return {};
  }
}

function saveCompletionState(completed) {
  const store = getCompletionStore();
  store[activePlanKey] = completed;
  localStorage.setItem(completionStorageKey, JSON.stringify(store));
}

function updateCompletionTracker(completed, total) {
  const count = completed.filter(Boolean).length;
  const percent = total ? Math.round((count / total) * 100) : 0;
  const tracker = document.querySelector(".completion-tracker");
  const progressbar = document.querySelector(".completion-bar");

  document.querySelector("#completionCount").textContent = `${count} / ${total} tasks completed`;
  document.querySelector("#completionPercent").textContent = `${percent}% complete`;
  document.querySelector("#completionBadge").textContent = percent === 100 ? "PLAN COMPLETE" : percent > 0 ? "IN PROGRESS" : "LET'S BEGIN";
  document.querySelector("#completionBar").style.width = `${percent}%`;
  progressbar.setAttribute("aria-valuenow", percent);
  tracker.classList.toggle("is-complete", total > 0 && count === total);
}

function handleTaskCompletion(event) {
  const checkbox = event.target.closest(".task-checkbox");
  if (!checkbox) return;

  const item = checkbox.closest(".schedule-item");
  const checkboxes = [...document.querySelectorAll(".task-checkbox")];
  const completed = checkboxes.map((input) => input.checked);
  item.classList.toggle("is-complete", checkbox.checked);
  saveCompletionState(completed);
  updateCompletionTracker(completed, checkboxes.length);
}

function animateReadiness(score, shouldAnimate) {
  const scoreElement = document.querySelector("#readinessScore");
  const card = document.querySelector(".readiness-card");
  const status = document.querySelector("#readinessStatus");
  const ring = document.querySelector("#readinessRing");
  const color = score >= 70 ? "#83a920" : score >= 45 ? "#e8894f" : "#e56363";
  const label = score >= 70 ? "High readiness" : score >= 45 ? "Medium readiness" : "Low readiness";
  const offset = ringCircumference - (score / 100) * ringCircumference;

  card.style.setProperty("--readiness-color", color);
  ring.setAttribute("aria-label", `Productivity readiness score: ${score} out of 100, ${label}`);
  status.textContent = label;
  ringProgress.style.strokeDasharray = ringCircumference;
  ringProgress.style.strokeDashoffset = shouldAnimate ? ringCircumference : offset;

  cancelAnimationFrame(scoreAnimation);
  if (!shouldAnimate) {
    scoreElement.textContent = score;
    return;
  }

  scoreElement.textContent = "0";
  requestAnimationFrame(() => {
    ringProgress.style.strokeDashoffset = offset;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / 900, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      scoreElement.textContent = Math.round(score * eased);
      if (progress < 1) scoreAnimation = requestAnimationFrame(tick);
    };
    scoreAnimation = requestAnimationFrame(tick);
  });
}

function render(shouldAnimate = false) {
  const assignment = document.querySelector("#assignment").value.trim() || "Your assignment";
  const hours = Math.max(.5, Number(document.querySelector("#hours").value) || 1);
  const mood = Number(moodInput.value);
  const due = new Date(`${dueDateInput.value}T23:59:59`);
  const daysLeft = Math.max(0, Math.ceil((due - new Date()) / 86400000));

  const urgency = Math.max(10, 100 - daysLeft * 13);
  const priority = Math.min(100, Math.round(urgency * .7 + Math.min(hours, 6) * 5));
  const risk = Math.min(95, Math.max(8, Math.round((11 - mood) * 6 + Math.max(0, hours - 4) * 5 + (daysLeft <= 1 ? 15 : 0))));
  const riskLabel = risk < 35 ? "Low" : risk < 65 ? "Moderate" : "High";
  const readiness = calculateReadiness(mood, risk, priority, hours);
  const schedule = generateSchedule(assignment, hours, mood);
  activePlanKey = [assignment.toLowerCase(), dueDateInput.value, hours, mood].join("|");
  const stored = getCompletionStore()[activePlanKey] || [];
  const completed = schedule.map((item, index) => Boolean(stored[index]));

  document.querySelector("#priorityScore").textContent = priority;
  document.querySelector("#priorityBar").style.width = `${priority}%`;
  document.querySelector("#priorityText").textContent = priority >= 75
    ? "High priority. Make meaningful progress on this today."
    : priority >= 50 ? "Worth moving forward today, without rushing." : "You have breathing room. Build an easy first win.";

  document.querySelector("#riskLabel").textContent = riskLabel;
  document.querySelector("#riskScore").textContent = `${risk}%`;
  document.querySelector("#riskBar").style.width = `${risk}%`;
  document.querySelector("#riskText").textContent = risk >= 65
    ? "Protect your energy. Short blocks and real breaks are essential."
    : risk >= 35 ? "Keep sessions focused and protect your breaks." : "Your capacity looks solid. Keep the pace sustainable.";

  document.querySelector("#readinessText").textContent = readiness >= 70
    ? "Conditions look strong. Use your first block for the work that matters most."
    : readiness >= 45 ? "You are ready to move, but pacing and protected breaks will make the difference."
    : "Start gently. A smaller, well-defined win is the smartest move for your current capacity.";
  animateReadiness(readiness, shouldAnimate);

  document.querySelector("#totalHours").textContent = `${hours}h`;
  document.querySelector("#coachNote").textContent = mood <= 4
    ? "Low-energy days still count. Aim for a small, clear win and stop before you run empty."
    : mood >= 8 ? "Your energy is strong. Use the first block for the hardest thinking, then preserve momentum."
    : "You have enough capacity to make meaningful progress. Begin with the hardest thinking while your focus is fresh.";

  const list = document.querySelector("#scheduleList");
  list.innerHTML = schedule.map((item, index) => `
    <div class="schedule-item${completed[index] ? " is-complete" : ""}" style="--block-color:${item.color}; animation-delay:${index * 45}ms">
      <label class="task-check" aria-label="Mark ${item.task[0]} complete">
        <input class="task-checkbox" type="checkbox" data-task-index="${index}" ${completed[index] ? "checked" : ""}>
        <span class="checkmark" aria-hidden="true"></span>
      </label>
      <span class="schedule-time">${formatTime(item.start)}<br>${formatTime(item.end)}</span>
      <span class="schedule-line"></span>
      <div class="schedule-task"><strong>${item.task[0]}</strong><span>${item.task[1]}</span></div>
      <span class="duration">${item.length} MIN</span>
    </div>
  `).join("");
  updateCompletionTracker(completed, schedule.length);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (generateButton.disabled) return;
  generateButton.disabled = true;
  generateButton.classList.add("is-loading");
  resultsColumn.classList.add("is-loading");
  buttonLabel.textContent = "Building your plan...";

  window.setTimeout(() => {
    render(true);
    generateButton.disabled = false;
    generateButton.classList.remove("is-loading");
    resultsColumn.classList.remove("is-loading");
    buttonLabel.textContent = "Generate my game plan";
    resultsColumn.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 650);
});

updateRange();
document.querySelector("#scheduleList").addEventListener("change", handleTaskCompletion);
render(false);
