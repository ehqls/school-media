
const SUPABASE_URL = "https://jmopvsektpmmejyarjyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_WXwSFMksPBri_DwvjSLbbw_OZFNDh0B";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

const loginPanel = document.getElementById("adminLoginPanel");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("adminLoginMessage");
const logoutButton = document.getElementById("adminLogout");

const pendingPosts = document.getElementById("pendingPosts");
const approvedPosts = document.getElementById("approvedPosts");
const pendingCount = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");

let isAdmin = false;

function makeElement(tag, className, text) {
  const el = document.createElement(tag);

  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;

  return el;
}

function formatDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("ko-KR");
}

function showEmpty(container, message) {
  container.replaceChildren(
    makeElement("p", "empty-message", message)
  );
}

function showLogin(message = "") {
  isAdmin = false;

  adminPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  loginMessage.textContent = message;
}

function showAdmin() {
  loginPanel.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  loginMessage.textContent = "";
}

async function checkAdmin() {
  const { data, error } = await db.rpc("is_board_admin");

  if (error) {
    console.error("관리자 권한 확인 실패:", error);
    return false;
  }

  return data === true;
}

function makePostCard(post, section) {
  const card = makeElement("article", "post-card");

  card.appendChild(makeElement("h3", "", post.title || "(제목 없음)"));
  card.appendChild(
    makeElement("p", "post-content", post.content || "")
  );
  card.appendChild(
    makeElement(
      "p",
      "post-meta",
      `익명 · ${formatDate(post.created_at)}`
    )
  );

  const actions = makeElement("div", "post-actions");

  if (section === "pending") {
    const approve = makeElement(
      "button",
      "approve-button",
      "승인하고 공개"
    );

    approve.type = "button";
    approve.addEventListener("click", () => updateStatus(post.id));

    const reject = makeElement(
      "button",
      "reject-button",
      "반려하고 삭제"
    );

    reject.type = "button";
    reject.addEventListener("click", () =>
      deletePost(post.id, "pending")
    );

    actions.append(approve, reject);
  } else {
    const remove = makeElement(
      "button",
      "reject-button",
      "공개 글 삭제"
    );

    remove.type = "button";
    remove.addEventListener("click", () =>
      deletePost(post.id, "approved")
    );

    actions.appendChild(remove);
  }

  card.appendChild(actions);

  return card;
}

async function loadPosts() {
  if (!isAdmin) return;

  pendingPosts.replaceChildren();
  approvedPosts.replaceChildren();

  showEmpty(pendingPosts, "게시글을 불러오는 중입니다.");
  showEmpty(approvedPosts, "게시글을 불러오는 중입니다.");

  const { data, error } = await db
    .from("board_posts")
    .select("id, title, content, status, created_at")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("게시글 조회 오류:", error);

    showEmpty(
      pendingPosts,
      "게시글을 불러오지 못했습니다. Supabase 권한 정책을 확인하세요."
    );

    showEmpty(
      approvedPosts,
      "게시글 조회에 실패했습니다."
    );

    alert(
      `게시글 조회 실패: ${error.message}`
    );

    return;
  }

  const posts = data || [];
  const pending = posts.filter(
    post => post.status === "pending"
  );
  const approved = posts.filter(
    post => post.status === "approved"
  );

  pendingCount.textContent = String(pending.length);
  approvedCount.textContent = String(approved.length);

  pendingPosts.replaceChildren();
  approvedPosts.replaceChildren();

  if (pending.length === 0) {
    showEmpty(pendingPosts, "검토할 게시글이 없습니다.");
  } else {
    pending.forEach(post => {
      pendingPosts.appendChild(
        makePostCard(post, "pending")
      );
    });
  }

  if (approved.length === 0) {
    showEmpty(approvedPosts, "공개된 게시글이 없습니다.");
  } else {
    approved.forEach(post => {
      approvedPosts.appendChild(
        makePostCard(post, "approved")
      );
    });
  }
}

async function updateStatus(id) {
  if (!isAdmin) return;

  const { data, error } = await db
    .from("board_posts")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (error) {
    console.error("게시글 승인 오류:", error);
    alert(`승인에 실패했습니다: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    alert(
      "게시글이 승인되지 않았습니다. 관리자 권한과 UPDATE 정책을 확인하세요."
    );
    return;
  }

  await loadPosts();
}

async function deletePost(id, expectedStatus) {
  if (!isAdmin) return;

  const label = expectedStatus === "approved"
    ? "공개된 게시글"
    : "검토 대기 게시글";

  if (
    !confirm(
      `${label}을 삭제할까요? 이 작업은 복구할 수 없습니다.`
    )
  ) {
    return;
  }

  const { data, error } = await db
    .from("board_posts")
    .delete()
    .eq("id", id)
    .eq("status", expectedStatus)
    .select("id");

  if (error) {
    console.error("게시글 삭제 오류:", error);
    alert(`삭제에 실패했습니다: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    alert(
      "게시글이 삭제되지 않았습니다. 관리자 권한과 DELETE 정책을 확인하세요."
    );
    return;
  }

  await loadPosts();
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document
    .getElementById("adminEmail")
    .value
    .trim();

  const password = document
    .getElementById("adminPassword")
    .value;

  const button = loginForm.querySelector(
    'button[type="submit"]'
  );

  button.disabled = true;
  loginMessage.textContent = "로그인 중입니다.";

  try {
    const { error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const allowed = await checkAdmin();

    if (!allowed) {
      await db.auth.signOut();

      throw new Error(
        "이 계정에는 관리자 권한이 없습니다."
      );
    }

    isAdmin = true;

    document.getElementById("adminPassword").value = "";

    showAdmin();

    await loadPosts();
  } catch (error) {
    console.error("로그인 오류:", error);

    await db.auth.signOut();

    showLogin(
      error.message || "로그인에 실패했습니다."
    );
  } finally {
    button.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await db.auth.signOut();

  loginForm.reset();
  showLogin("로그아웃했습니다.");
});

function initialize() {
  // 페이지를 열 때마다 로그인 화면부터 표시
  showLogin();
}

initialize();
