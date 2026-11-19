
document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.ybsSupabase;
  const panel = document.getElementById("schoolDetailPanel");

  if (!supabase || !panel) {
    console.error("YBS 시간표 기능을 초기화할 수 없습니다.");
    return;
  }

  const content = panel.querySelector(
    '.school-card-content[data-index="2"]'
  );

  if (!content) {
    console.error("시간표 표시 영역을 찾을 수 없습니다.");
    return;
  }

  const style = document.createElement("style");

  style.textContent = `
    .timetable-wrapper {
      width: 100%;
    }

    .timetable-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }

    .timetable-header h4 {
      margin: 0;
      font-size: 18px;
    }

    .timetable-date-controls {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .timetable-date-controls button,
    .timetable-date-controls input {
      padding: 9px 12px;
      border: 1px solid #d7dfeb;
      border-radius: 9px;
      background: white;
      color: #334155;
      font-size: 13px;
    }

    .timetable-date-controls button {
      cursor: pointer;
    }

    .timetable-date-controls button:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    .timetable-status {
      margin: 12px 0;
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }

    .timetable-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .timetable-period {
      display: flex;
      align-items: center;
      gap: 16px;
      min-height: 68px;
      padding: 13px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: rgba(255, 255, 255, .75);
    }

    .timetable-period-number {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 48px;
      height: 44px;
      border-radius: 10px;
      background: #eaf1ff;
      color: #2563eb;
      font-weight: 700;
      font-size: 14px;
    }

    .timetable-period-info {
      flex: 1;
      min-width: 0;
    }

    .timetable-subject {
      margin: 0;
      color: #1e293b;
      font-weight: 700;
      font-size: 15px;
      overflow-wrap: anywhere;
    }

    .timetable-empty {
      color: #94a3b8;
      font-weight: 400;
    }

    .timetable-login-message {
      padding: 18px;
      border-radius: 12px;
      background: #eff6ff;
      color: #1d4ed8;
      line-height: 1.7;
      font-size: 14px;
    }

    @media (max-width: 600px) {
      .timetable-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .timetable-date-controls {
        width: 100%;
      }

      .timetable-date-controls input {
        flex: 1;
        min-width: 0;
      }

      .timetable-period {
        min-height: 62px;
        padding: 11px 12px;
      }
    }
  `;

  document.head.appendChild(style);

  const wrapper = document.createElement("div");
  wrapper.className = "timetable-wrapper";

  const header = document.createElement("div");
  header.className = "timetable-header";

  const heading = document.createElement("h4");
  heading.textContent = "나의 시간표";

  const controls = document.createElement("div");
  controls.className = "timetable-date-controls";

  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.textContent = "이전 날짜";

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.setAttribute("aria-label", "시간표 날짜");

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = "다음 날짜";

  const todayButton = document.createElement("button");
  todayButton.type = "button";
  todayButton.textContent = "오늘";

  controls.append(
    previousButton,
    dateInput,
    nextButton,
    todayButton
  );

  header.append(heading, controls);

  const status = document.createElement("p");
  status.className = "timetable-status";
  status.setAttribute("role", "status");

  const list = document.createElement("div");
  list.className = "timetable-list";

  wrapper.append(header, status, list);
  content.appendChild(wrapper);

  function getLocalDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getSemester(dateString) {
    const month = Number(dateString.split("-")[1]);
    return month >= 3 && month <= 8 ? 1 : 2;
  }

  function changeDate(amount) {
    const date = new Date(`${dateInput.value}T12:00:00`);
    date.setDate(date.getDate() + amount);

    dateInput.value = getLocalDate(date);
    loadTimetable();
  }

  function renderTimetable(rows) {
    list.replaceChildren();

    const sortedRows = Array.isArray(rows)
      ? [...rows].sort(
          (a, b) => Number(a.PERIO) - Number(b.PERIO)
        )
      : [];

    if (sortedRows.length === 0) {
      status.textContent =
        "해당 날짜에 등록된 시간표가 없습니다.";
      return;
    }

    const periods = new Map();

    sortedRows.forEach(row => {
      const periodNumber = Number(row.PERIO);

      if (Number.isInteger(periodNumber)) {
        periods.set(periodNumber, row);
      }
    });

    for (let i = 1; i <= 7; i++) {
      const row = periods.get(i);

      const period = document.createElement("article");
      period.className = "timetable-period";

      const number = document.createElement("div");
      number.className = "timetable-period-number";
      number.textContent = `${i}교시`;

      const info = document.createElement("div");
      info.className = "timetable-period-info";

      const subject = document.createElement("p");
      subject.className = "timetable-subject";

      if (row && row.ITRT_CNTNT) {
        subject.textContent = row.ITRT_CNTNT;
      } else {
        subject.textContent = "수업 정보 없음";
        subject.classList.add("timetable-empty");
      }

      info.appendChild(subject);
      period.append(number, info);
      list.appendChild(period);
    }

    status.textContent = `${dateInput.value} 시간표`;
  }

  async function loadTimetable() {
    const selectedDate = dateInput.value;

    if (!selectedDate) {
      status.textContent = "조회할 날짜를 선택해 주세요.";
      return;
    }

    list.replaceChildren();
    status.textContent = "시간표를 불러오는 중입니다.";

    previousButton.disabled = true;
    nextButton.disabled = true;
    todayButton.disabled = true;

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        status.textContent = "";

        const message = document.createElement("div");
        message.className = "timetable-login-message";
        message.textContent =
          "시간표를 확인하려면 먼저 로그인해 주세요.";

        list.appendChild(message);
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("grade, class_number")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (
        !profile ||
        !Number.isInteger(Number(profile.grade)) ||
        !Number.isInteger(Number(profile.class_number))
      ) {
        status.textContent =
          "회원 프로필에서 학년과 반 정보를 확인할 수 없습니다.";
        return;
      }

      const { data, error } =
        await supabase.functions.invoke("neis-proxy", {
          body: {
            action: "timetable",
            date: selectedDate.replaceAll("-", ""),
            grade: Number(profile.grade),
            classNumber: Number(profile.class_number),
            semester: getSemester(selectedDate)
          }
        });

      if (error) throw error;

      if (!data || !Array.isArray(data.rows)) {
        throw new Error("시간표 데이터 형식이 올바르지 않습니다.");
      }

      renderTimetable(data.rows);

    } catch (error) {
      console.error("시간표 조회 오류:", error);

      list.replaceChildren();
      status.textContent =
        "시간표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

    } finally {
      previousButton.disabled = false;
      nextButton.disabled = false;
      todayButton.disabled = false;
    }
  }

  previousButton.addEventListener("click", () => changeDate(-1));
  nextButton.addEventListener("click", () => changeDate(1));

  todayButton.addEventListener("click", () => {
    dateInput.value = getLocalDate();
    loadTimetable();
  });

  dateInput.addEventListener("change", loadTimetable);

  dateInput.value = getLocalDate();
  loadTimetable();
});
