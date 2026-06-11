const form = document.querySelector("#plannerForm");
const moodInput = document.querySelector("#mood");
const moodValue = document.querySelector("#moodValue");
const dueDateInput = document.querySelector("#dueDate");

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

function render() {
  const assignment = document.querySelector("#assignment").value.trim() || "Your assignment";
  const hours = Math.max(.5, Number(document.querySelector("#hours").value) || 1);
  const mood = Number(moodInput.value);
  const due = new Date(`${dueDateInput.value}T23:59:59`);
  const daysLeft = Math.max(0, Math.ceil((due - new Date()) / 86400000));

  const urgency = Math.max(10, 100 - daysLeft * 13);
  const priority = Math.min(100, Math.round(urgency * .7 + Math.min(hours, 6) * 5));
  const risk = Math.min(95, Math.max(8, Math.round((11 - mood) * 6 + Math.max(0, hours - 4) * 5 + (daysLeft <= 1 ? 15 : 0))));
  const riskLabel = risk < 35 ? "Low" : risk < 65 ? "Moderate" : "High";

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

  document.querySelector("#totalHours").textContent = `${hours}h`;
  document.querySelector("#coachNote").textContent = mood <= 4
    ? "Low-energy days still count. Aim for a small, clear win and stop before you run empty."
    : mood >= 8 ? "Your energy is strong. Use the first block for the hardest thinking, then preserve momentum."
    : "You have enough capacity to make meaningful progress. Begin with the hardest thinking while your focus is fresh.";

  const list = document.querySelector("#scheduleList");
  list.innerHTML = generateSchedule(assignment, hours, mood).map((item, index) => `
    <div class="schedule-item" style="--block-color:${item.color}; animation-delay:${index * 45}ms">
      <span class="schedule-time">${formatTime(item.start)}<br>${formatTime(item.end)}</span>
      <span class="schedule-line"></span>
      <div class="schedule-task"><strong>${item.task[0]}</strong><span>${item.task[1]}</span></div>
      <span class="duration">${item.length} MIN</span>
    </div>
  `).join("");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
  document.querySelector(".results-column").scrollIntoView({ behavior: "smooth", block: "start" });
});

updateRange();
render();
