
document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.ybsSupabase;

  const mealDate = document.getElementById("mealDate");
  const mealPrev = document.getElementById("mealPrev");
  const mealNext = document.getElementById("mealNext");
  const mealRefresh = document.getElementById("mealRefresh");
  const mealStatus = document.getElementById("mealStatus");
  const mealList = document.getElementById("mealList");

  if (
    !supabase ||
    !mealDate ||
    !mealPrev ||
    !mealNext ||
    !mealRefresh ||
    !mealStatus ||
    !mealList
  ) {
    console.error("YBS 급식 기능: 필요한 요소를 찾을 수 없습니다.");
    return;
  }

  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatDateForApi(date) {
    return date.replaceAll("-", "");
  }

  function formatDisplayDate(date) {
    const [year, month, day] = date.split("-");
    return `${year}년 ${Number(month)}월 ${Number(day)}일`;
  }

  function moveDate(amount) {
    const date = new Date(`${mealDate.value}T12:00:00`);
    date.setDate(date.getDate() + amount);

    mealDate.value = getLocalDateString(date);
    loadMeals();
  }

  function createMealCard(title, row) {
    const card = document.createElement("article");
    card.className = "meal-item";

    const heading = document.createElement("h4");
    heading.textContent = title;
    card.appendChild(heading);

    const menu = document.createElement("div");
    menu.className = "meal-menu";

    const menuItems = String(row.DDISH_NM || "")
      .split(/<br\s*\/?>/gi)
      .map(item => item.trim())
      .filter(Boolean);

    if (menuItems.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "등록된 메뉴가 없습니다.";
      menu.appendChild(empty);
    } else {
      menuItems.forEach(item => {
        const line = document.createElement("p");
        line.textContent = item;
        menu.appendChild(line);
      });
    }

    card.appendChild(menu);

    if (row.CAL_INFO) {
      const calories = document.createElement("p");
      calories.className = "meal-calories";
      calories.textContent = `열량 ${row.CAL_INFO}`;
      card.appendChild(calories);
    }

    return card;
  }

  function renderMeals(rows) {
    mealList.replaceChildren();

    if (!Array.isArray(rows) || rows.length === 0) {
      mealStatus.textContent = "해당 날짜에는 등록된 급식 정보가 없습니다.";
      return;
    }

    const mealTypes = [
      { code: "1", name: "조식" },
      { code: "2", name: "중식" },
      { code: "3", name: "석식" }
    ];

    mealTypes.forEach(type => {
      const row = rows.find(
        item => String(item.MMEAL_SC_CODE) === type.code
      );

      if (row) {
        mealList.appendChild(createMealCard(type.name, row));
      }
    });

    if (mealList.children.length === 0) {
      mealStatus.textContent = "급식 정보가 없습니다.";
    } else {
      mealStatus.textContent = "";
    }
  }

  async function loadMeals() {
    const selectedDate = mealDate.value;

    if (!selectedDate) {
      mealStatus.textContent = "조회할 날짜를 선택해 주세요.";
      return;
    }

    mealStatus.textContent = "급식 정보를 불러오는 중입니다.";
    mealList.replaceChildren();

    mealRefresh.disabled = true;
    mealPrev.disabled = true;
    mealNext.disabled = true;

    try {
      const { data, error } = await supabase.functions.invoke(
        "neis-proxy",
        {
          body: {
            action: "meal",
            date: formatDateForApi(selectedDate)
          }
        }
      );

      if (error) {
        throw error;
      }

      if (!data || !Array.isArray(data.rows)) {
        throw new Error("급식 데이터 형식이 올바르지 않습니다.");
      }

      mealStatus.textContent = `${formatDisplayDate(selectedDate)} 급식`;
      renderMeals(data.rows);

    } catch (error) {
      console.error("급식 조회 오류:", error);

      mealList.replaceChildren();
      mealStatus.textContent =
        "급식 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

    } finally {
      mealRefresh.disabled = false;
      mealPrev.disabled = false;
      mealNext.disabled = false;
    }
  }

  mealDate.value = getLocalDateString();

  mealPrev.addEventListener("click", () => moveDate(-1));
  mealNext.addEventListener("click", () => moveDate(1));
  mealRefresh.addEventListener("click", loadMeals);
  mealDate.addEventListener("change", loadMeals);

  loadMeals();
});
