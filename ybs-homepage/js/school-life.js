
document.addEventListener("DOMContentLoaded", () => {
  const schoolSection = document.getElementById("school");

  if (!schoolSection) return;

  const cards = Array.from(
    schoolSection.querySelectorAll(".info-card")
  ).slice(0, 3);

  if (cards.length !== 3) {
    console.error("학교생활 카드 3개를 찾을 수 없습니다.");
    return;
  }

  const [mealCard, scheduleCard, timetableCard] = cards;
  const originalParent = mealCard.parentElement;

  // 기존에 생성된 레이아웃 제거
  const oldLayout = schoolSection.querySelector(
    ".school-life-layout"
  );

  if (oldLayout) oldLayout.remove();

  // 전체 영역 생성
  const layout = document.createElement("div");
  layout.className = "school-life-layout";

  const grid = document.createElement("div");
  grid.className = "school-life-card-grid";

  // 세 카드를 하나의 그리드에 배치
  originalParent.insertBefore(layout, mealCard);
  layout.appendChild(grid);

  cards.forEach(card => {
    grid.appendChild(card);
  });

  const style = document.createElement("style");

  style.textContent = `
    #school .school-life-layout {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      grid-column: 1 / -1 !important;
      box-sizing: border-box !important;
    }

    #school .school-life-card-grid {
      display: grid !important;
      width: 100% !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 20px !important;
      align-items: stretch !important;
      box-sizing: border-box !important;
    }

    #school .school-life-card-grid > .info-card {
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 145px;
      height: 100% !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      cursor: pointer;
      transition: transform .2s ease, border-color .2s ease;
    }

    #school .school-life-card-grid > .info-card:hover {
      transform: translateY(-3px);
    }

    #school .info-card.school-card-active {
      border-color: rgba(37, 99, 235, .65);
    }

    #school .school-card-indicator {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 18px;
      color: #64748b;
      font-size: 13px;
    }

    #school .school-card-active .school-card-indicator {
      color: #2563eb;
      font-weight: 600;
    }

    #schoolDetailPanel {
      display: none;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      min-height: 280px;
      box-sizing: border-box !important;
      margin-top: 24px;
      padding: 32px;
      border: 1px solid rgba(148, 163, 184, .3);
      border-radius: 20px;
      background: rgba(255, 255, 255, .82);
      box-shadow: 0 12px 35px rgba(15, 23, 42, .07);
      animation: schoolPanelIn .25s ease;
    }

    #schoolDetailPanel.school-panel-visible {
      display: block !important;
    }

    #schoolDetailPanel .school-panel-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 26px;
    }

    #schoolDetailPanel .school-panel-heading h3 {
      margin: 0;
      font-size: 22px;
      color: #17243b;
    }

    #schoolDetailPanel .school-panel-close {
      border: 0;
      border-radius: 9px;
      padding: 9px 15px;
      background: #f1f5f9;
      color: #475569;
      cursor: pointer;
    }

    #schoolDetailPanel .school-card-content {
      display: none;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    #schoolDetailPanel .school-card-content.school-content-visible {
      display: block !important;
    }

    #schoolDetailPanel .meal-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      width: 100%;
    }

    #schoolDetailPanel .meal-item {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    #schoolDetailPanel .meal-menu p {
      line-height: 1.75;
      word-break: keep-all;
      overflow-wrap: break-word;
      margin-bottom: 8px;
    }

    #schoolDetailPanel .schedule-calendar {
      width: 100%;
      max-width: 100%;
    }

    @keyframes schoolPanelIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 900px) {
      #school .school-life-card-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media (max-width: 600px) {
      #school .school-life-card-grid {
        grid-template-columns: 1fr !important;
      }

      #schoolDetailPanel {
        min-height: 220px;
        padding: 20px;
        margin-top: 18px;
      }

      #schoolDetailPanel .meal-list {
        grid-template-columns: 1fr;
      }

      #schoolDetailPanel .school-panel-heading h3 {
        font-size: 19px;
      }
    }
  `;

  document.head.appendChild(style);

  // 상세 영역
  const panel = document.createElement("section");
  panel.id = "schoolDetailPanel";
  panel.setAttribute("aria-live", "polite");

  const panelHeading = document.createElement("div");
  panelHeading.className = "school-panel-heading";

  const panelTitle = document.createElement("h3");
  panelTitle.textContent = "학교생활";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "school-panel-close";
  closeButton.textContent = "닫기";

  panelHeading.append(panelTitle, closeButton);
  panel.appendChild(panelHeading);

  const titles = [
    "오늘의 급식",
    "학사일정",
    "나의 시간표"
  ];

  cards.forEach((card, index) => {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-expanded", "false");

    const oldIndicator = card.querySelector(
      ".school-card-indicator"
    );

    if (oldIndicator) oldIndicator.remove();

    const indicator = document.createElement("div");
    indicator.className = "school-card-indicator";

    const label = document.createElement("span");
    label.textContent = "자세히 보기";

    const arrow = document.createElement("span");
    arrow.textContent = "→";

    indicator.append(label, arrow);
    card.appendChild(indicator);

    const content = document.createElement("div");
    content.className = "school-card-content";
    content.dataset.index = String(index);

    if (index === 0) {
      [
        card.querySelector(".meal-controls"),
        card.querySelector(".meal-status"),
        card.querySelector(".meal-list")
      ].filter(Boolean).forEach(element => {
        content.appendChild(element);
      });

    } else if (index === 1) {
      const calendar = card.querySelector(
        ".schedule-calendar"
      );

      if (calendar) {
        content.appendChild(calendar);
      }

    } else {
      const notice = card.querySelector(".coming-soon");

      if (notice) notice.remove();
    }

    panel.appendChild(content);
  });

  // 상세 영역을 카드 그리드 바로 아래에 배치
  layout.appendChild(panel);

  function showPanel(selectedIndex) {
    const selectedContent = panel.querySelector(
      `.school-card-content[data-index="${selectedIndex}"]`
    );

    if (!selectedContent) return;

    const alreadyOpen =
      selectedContent.classList.contains(
        "school-content-visible"
      );

    cards.forEach((card, index) => {
      const active =
        index === selectedIndex && !alreadyOpen;

      card.classList.toggle("school-card-active", active);
      card.setAttribute("aria-expanded", String(active));

      const label = card.querySelector(
        ".school-card-indicator span:first-child"
      );

      if (label) {
        label.textContent = active
          ? "선택됨"
          : "자세히 보기";
      }
    });

    panel.querySelectorAll(
      ".school-card-content"
    ).forEach(content => {
      content.classList.remove("school-content-visible");
    });

    if (alreadyOpen) {
      panel.classList.remove("school-panel-visible");
      return;
    }

    selectedContent.classList.add("school-content-visible");
    panelTitle.textContent = titles[selectedIndex];

    panel.classList.add("school-panel-visible");

    panel.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  cards.forEach((card, index) => {
    card.addEventListener("click", event => {
      if (
        event.target.closest(
          "button, input, select, textarea, a"
        )
      ) {
        return;
      }

      showPanel(index);
    });

    card.addEventListener("keydown", event => {
      if (event.target !== card) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showPanel(index);
      }
    });
  });

  closeButton.addEventListener("click", () => {
    panel.classList.remove("school-panel-visible");

    panel.querySelectorAll(
      ".school-card-content"
    ).forEach(content => {
      content.classList.remove("school-content-visible");
    });

    cards.forEach(card => {
      card.classList.remove("school-card-active");
      card.setAttribute("aria-expanded", "false");

      const label = card.querySelector(
        ".school-card-indicator span:first-child"
      );

      if (label) label.textContent = "자세히 보기";
    });
  });
});
