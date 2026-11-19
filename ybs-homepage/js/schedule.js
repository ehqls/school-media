
(() => {
  document.addEventListener("DOMContentLoaded", initializeSchedule);

  function initializeSchedule() {
    const supabase = window.ybsSupabase;
    const card = document.querySelectorAll("#school .info-card")[1];

    if (!supabase || !card) {
      console.error("YBS 학사일정 초기화 실패");
      return;
    }

    const style = document.createElement("style");

    style.textContent = `
      .schedule-calendar {
        margin-top: 20px;
        width: 100%;
      }

      .schedule-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
      }

      .schedule-toolbar button,
      .schedule-today {
        border: 1px solid rgba(100,116,139,.25);
        border-radius: 8px;
        padding: 8px 12px;
        background: rgba(255,255,255,.7);
        color: inherit;
        cursor: pointer;
      }

      .schedule-toolbar button:hover,
      .schedule-today:hover {
        background: rgba(37,99,235,.08);
      }

      .schedule-month {
        font-weight: 700;
        font-size: 18px;
      }

      .schedule-weekdays,
      .schedule-days {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 5px;
      }

      .schedule-weekdays {
        margin-bottom: 7px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
      }

      .schedule-weekdays span:first-child {
        color: #dc2626;
      }

      .schedule-weekdays span:last-child {
        color: #2563eb;
      }

      .schedule-day {
        min-width: 0;
        min-height: 68px;
        padding: 7px 3px;
        border: 1px solid rgba(100,116,139,.15);
        border-radius: 10px;
        background: rgba(255,255,255,.45);
        color: inherit;
        text-align: center;
        cursor: pointer;
        overflow: hidden;
        transition: background .2s, border-color .2s;
      }

      .schedule-day:hover {
        background: rgba(37,99,235,.07);
      }

      .schedule-day.selected {
        border: 2px solid #2563eb;
        background: rgba(37,99,235,.1);
      }

      .schedule-day.today .schedule-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 25px;
        height: 25px;
        border-radius: 50%;
        background: #2563eb;
        color: white;
        font-weight: 800;
      }

      .schedule-day.sunday .schedule-number {
        color: #dc2626;
      }

      .schedule-day.saturday .schedule-number {
        color: #2563eb;
      }

      .schedule-day.today .schedule-number {
        color: white;
      }

      .schedule-day.empty {
        visibility: hidden;
      }

      .schedule-number {
        font-size: 13px;
      }

      .schedule-dot {
        display: block;
        width: 7px;
        height: 7px;
        margin: 5px auto 0;
        border-radius: 50%;
        background: #2563eb;
      }

      .schedule-event-count {
        display: block;
        margin-top: 3px;
        font-size: 10px;
        color: #2563eb;
        font-weight: 600;
      }

      .schedule-detail {
        margin-top: 22px;
        padding: 18px;
        border: 1px solid rgba(100,116,139,.15);
        border-radius: 12px;
        background: rgba(255,255,255,.55);
      }

      .schedule-detail h4 {
        margin: 0 0 12px;
        font-size: 16px;
      }

      .schedule-event {
        padding: 13px 0;
        border-bottom: 1px solid rgba(100,116,139,.15);
      }

      .schedule-event:last-child {
        border-bottom: 0;
      }

      .schedule-event strong {
        display: block;
        font-size: 14px;
        color: #1e293b;
      }

      .schedule-event span {
        display: block;
        margin-top: 5px;
        font-size: 12px;
        color: #64748b;
        line-height: 1.5;
      }

      .schedule-empty-message {
        margin: 0;
        padding: 12px 0;
        color: #94a3b8;
        font-size: 13px;
      }

      .schedule-status {
        margin-top: 12px;
        color: #64748b;
        font-size: 13px;
      }

      @media (max-width: 480px) {
        .schedule-day {
          min-height: 55px;
          padding: 5px 1px;
        }

        .schedule-event-count {
          font-size: 9px;
        }

        .schedule-toolbar button {
          padding: 7px 9px;
          font-size: 12px;
        }

        .schedule-month {
          font-size: 15px;
        }
      }
    `;

    document.head.appendChild(style);

    card.classList.add("schedule-card");

    card.innerHTML = `
      <span class="card-icon">📅</span>
      <h3>학사일정</h3>
      <p>영주고등학교의 월별 학사일정을 확인하세요.</p>

      <div class="schedule-calendar">
        <div class="schedule-toolbar">
          <button type="button" id="schedulePrev">이전 달</button>
          <strong class="schedule-month" id="scheduleMonth"></strong>
          <button type="button" id="scheduleNext">다음 달</button>
        </div>

        <div class="schedule-weekdays">
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span>토</span>
          <span>일</span>
        </div>

        <div class="schedule-days" id="scheduleDays"></div>

        <button type="button" class="schedule-today" id="scheduleToday">
          오늘로 이동
        </button>

        <p class="schedule-status" id="scheduleStatus" aria-live="polite">
          학사일정을 불러오는 중입니다.
        </p>

        <div class="schedule-detail" id="scheduleDetail">
          <h4 id="scheduleSelectedDate">날짜를 선택해 주세요.</h4>
          <div id="scheduleEventList"></div>
        </div>
      </div>
    `;

    const monthLabel = document.getElementById("scheduleMonth");
    const daysContainer = document.getElementById("scheduleDays");
    const status = document.getElementById("scheduleStatus");
    const detailTitle = document.getElementById("scheduleSelectedDate");
    const eventList = document.getElementById("scheduleEventList");

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    let currentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    let selectedDate = getDateKey(today);
    let events = [];
    let loading = false;

    function getDateKey(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}${month}${day}`;
    }

    function getDisplayDate(dateKey) {
      return `${dateKey.slice(0, 4)}년 ${Number(dateKey.slice(4, 6))}월 ${Number(dateKey.slice(6, 8))}일`;
    }

    function getMonthRange(date) {
      const year = date.getFullYear();
      const month = date.getMonth();

      return {
        from: getDateKey(new Date(year, month, 1)),
        to: getDateKey(new Date(year, month + 1, 0))
      };
    }

    function changeMonth(amount) {
      const oldDay = Number(selectedDate.slice(6, 8));

      currentMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + amount,
        1
      );

      const lastDay = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      ).getDate();

      const newDay = Math.min(oldDay, lastDay);

      selectedDate = getDateKey(
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          newDay
        )
      );

      loadSchedule();
    }

    async function loadSchedule() {
      if (loading) return;

      loading = true;
      status.textContent = "학사일정을 불러오는 중입니다.";
      daysContainer.replaceChildren();

      const range = getMonthRange(currentMonth);

      try {
        const { data, error } = await supabase.functions.invoke(
          "neis-proxy",
          {
            body: {
              action: "schedule",
              from: range.from,
              to: range.to
            }
          }
        );

        if (error) throw error;

        if (!data || !Array.isArray(data.rows)) {
          throw new Error("학사일정 데이터 형식이 올바르지 않습니다.");
        }

        const unique = new Map();

        data.rows.forEach(row => {
          const key = `${row.AA_YMD}_${row.EVENT_NM}_${row.SBTR_DD_SC_NM}`;
          unique.set(key, row);
        });

        events = [...unique.values()];

        renderCalendar();
        renderSelectedDate();

        status.textContent = events.length
          ? `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월 일정 ${events.length}건`
          : "이번 달에는 등록된 일정이 없습니다.";

      } catch (error) {
        console.error("학사일정 조회 오류:", error);

        status.textContent =
          "학사일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

        events = [];
        renderCalendar();
        renderSelectedDate();

      } finally {
        loading = false;
      }
    }

    function renderCalendar() {
      monthLabel.textContent =
        `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;

      daysContainer.replaceChildren();

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const offset = (firstDay.getDay() + 6) % 7;

      for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        empty.className = "schedule-day empty";
        daysContainer.appendChild(empty);
      }

      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const key = getDateKey(date);

        const dayEvents = events.filter(
          event => event.AA_YMD === key
        );

        const button = document.createElement("button");
        button.type = "button";
        button.className = "schedule-day";

        if (key === selectedDate) {
          button.classList.add("selected");
        }

        if (key === getDateKey(today)) {
          button.classList.add("today");
        }

        if (date.getDay() === 0) {
          button.classList.add("sunday");
        }

        if (date.getDay() === 6) {
          button.classList.add("saturday");
        }

        const number = document.createElement("span");
        number.className = "schedule-number";
        number.textContent = day;

        button.appendChild(number);

        if (dayEvents.length > 0) {
          const dot = document.createElement("span");
          dot.className = "schedule-dot";
          button.appendChild(dot);

          const count = document.createElement("span");
          count.className = "schedule-event-count";
          count.textContent = `${dayEvents.length}건`;
          button.appendChild(count);
        }

        button.addEventListener("click", () => {
          selectedDate = key;
          renderCalendar();
          renderSelectedDate();
        });

        daysContainer.appendChild(button);
      }
    }

    function renderSelectedDate() {
      detailTitle.textContent = getDisplayDate(selectedDate);
      eventList.replaceChildren();

      const selectedEvents = events.filter(
        event => event.AA_YMD === selectedDate
      );

      if (selectedEvents.length === 0) {
        const empty = document.createElement("p");
        empty.className = "schedule-empty-message";
        empty.textContent = "등록된 일정이 없습니다.";
        eventList.appendChild(empty);
        return;
      }

      selectedEvents.forEach(event => {
        const item = document.createElement("div");
        item.className = "schedule-event";

        const name = document.createElement("strong");
        name.textContent = event.EVENT_NM || "일정";

        item.appendChild(name);

        if (
          event.SBTR_DD_SC_NM &&
          event.SBTR_DD_SC_NM !== "해당없음"
        ) {
          const type = document.createElement("span");
          type.textContent = event.SBTR_DD_SC_NM;
          item.appendChild(type);
        }

        if (event.EVENT_CNTNT) {
          const description = document.createElement("span");
          description.textContent = event.EVENT_CNTNT;
          item.appendChild(description);
        }

        eventList.appendChild(item);
      });
    }

    document.getElementById("schedulePrev").addEventListener(
      "click",
      () => changeMonth(-1)
    );

    document.getElementById("scheduleNext").addEventListener(
      "click",
      () => changeMonth(1)
    );

    document.getElementById("scheduleToday").addEventListener(
      "click",
      () => {
        currentMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

        selectedDate = getDateKey(today);
        loadSchedule();
      }
    );

    loadSchedule();
  }
})();
