
const SUPABASE_URL = "https://jmopvsektpmmejyarjyg.supabase.co";

// Supabase의 API Keys 화면에서 복사한 공개 키를 여기에 붙여 넣으세요.
const SUPABASE_KEY = "sb_publishable_WXwSFMksPBri_DwvjSLbbw_OZFNDh0B";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const postForm = document.getElementById("postForm");
const postTitle = document.getElementById("postTitle");
const postContent = document.getElementById("postContent");
const formMessage = document.getElementById("formMessage");

const adminToggle = document.getElementById("adminToggle");
const adminPanel = document.getElementById("adminPanel");
const adminLoginPanel = document.getElementById("adminLoginPanel");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const cancelAdminLogin = document.getElementById("cancelAdminLogin");
const adminLogout = document.getElementById("adminLogout");

const pendingPosts = document.getElementById("pendingPosts");
const publicPosts = document.getElementById("publicPosts");
const pendingCount = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");

let isAdmin = false;
let pendingItems = [];
let approvedItems = [];

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showEmpty(container, message) {
  container.appendChild(createElement("p", "empty-message", message));
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

function showLoginMessage(message, isError = false) {
  adminLoginMessage.textContent = message;
  adminLoginMessage.classList.toggle("error", isError);
}

function createPostCard(post, adminMode = false) {
  const card = createElement("article", "post-card");

  const statusText =
    post.status === "approved" ? "공개됨" : "검토 대기";

  const statusClass =
    post.status === "approved" ? "status approved" : "status";

  card.appendChild(createElement("span", statusClass, statusText));
  card.appendChild(createElement("h3", "", post.title));
  card.appendChild(createElement("p", "post-content", post.content));

  card.appendChild(
    createElement(
      "p",
      "post-meta",
      `익명 · ${formatDate(post.created_at)}`
    )
  );

  if (adminMode && post.status === "pending") {
    const actions = createElement("div", "post-actions");

    const approveButton = createElement(
      "button",
      "approve-button",
      "승인하고 공개"
    );

    approveButton.type = "button";
    approveButton.addEventListener("click", () => {
      updatePostStatus(post.id);
    });

    const rejectButton = createElement(
      "button",
      "reject-button",
      "반려하기"
    );

    rejectButton.type = "button";
    rejectButton.addEventListener("click", () => {
      rejectPost(post.id);
    });

    actions.append(approveButton, rejectButton);
    card.appendChild(actions);
  }

  return card;
}

function renderPosts() {
  pendingPosts.replaceChildren();
  publicPosts.replaceChildren();

  pendingCount.textContent = String(pendingItems.length);
  approvedCount.textContent = String(approvedItems.length);

  if (!isAdmin || pendingItems.length === 0) {
    showEmpty(pendingPosts, "검토할 게시글이 없습니다.");
  } else {
    pendingItems.forEach(post => {
      pendingPosts.appendChild(createPostCard(post, true));
    });
  }

  if (approvedItems.length === 0) {
    showEmpty(publicPosts, "아직 공개된 게시글이 없습니다.");
  } else {
    approvedItems.forEach(post => {
      publicPosts.appendChild(createPostCard(post));
    });
  }
}

async function loadPosts() {
  const { data: approved, error: approvedError } =
    await supabaseClient
      .from("board_posts")
      .select("id, title, content, status, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

  if (approvedError) {
    console.error("공개 게시글 조회 오류:", approvedError);
    showEmpty(publicPosts, "게시글을 불러오지 못했습니다.");
    return;
  }

  approvedItems = approved || [];

  if (isAdmin) {
    const { data: pending, error: pendingError } =
      await supabaseClient
        .from("board_posts")
        .select("id, title, content, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (pendingError) {
      console.error("대기 게시글 조회 오류:", pendingError);
      pendingItems = [];
      showLoginMessage(
        "대기 글을 불러오지 못했습니다. 관리자 권한과 RLS 정책을 확인하세요.",
        true
      );
    } else {
      pendingItems = pending || [];
    }
  } else {
    pendingItems = [];
  }

  renderPosts();
}

async function verifyAdmin() {
  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    isAdmin = false;
    return false;
  }

  const { data, error } = await supabaseClient.rpc("is_board_admin");

  if (error || data !== true) {
    isAdmin = false;
    return false;
  }

  isAdmin = true;
  return true;
}

async function updatePostStatus(id) {
  if (!isAdmin) {
    alert("관리자만 사용할 수 있습니다.");
    return;
  }

  const { error } = await supabaseClient
    .from("board_posts")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("게시글 승인 오류:", error);
    alert("승인에 실패했습니다. 관리자 권한을 확인하세요.");
    return;
  }

  await loadPosts();
}

async function rejectPost(id) {
  if (!isAdmin) {
    alert("관리자만 사용할 수 있습니다.");
    return;
  }

  if (!confirm("이 글을 반려하고 삭제할까요?")) return;

  const { error } = await supabaseClient
    .from("board_posts")
    .delete()
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("게시글 반려 오류:", error);
    alert("반려에 실패했습니다. 관리자 권한을 확인하세요.");
    return;
  }

  await loadPosts();
}

postForm.addEventListener("submit", async event => {
  event.preventDefault();

  const title = postTitle.value.trim();
  const content = postContent.value.trim();

  if (!title || !content) {
    showMessage("제목과 내용을 입력해 주세요.", true);
    return;
  }

  const submitButton = postForm.querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;
  showMessage("게시글을 제출하고 있습니다.");

  try {
    // status는 서버 기본값인 pending을 사용합니다.
    const { error } = await supabaseClient
      .from("board_posts")
      .insert({ title, content });

    if (error) throw error;

    postForm.reset();
    showMessage("글이 제출되었습니다. 관리자 검토 후 공개됩니다.");
    await loadPosts();
  } catch (error) {
    console.error("게시글 제출 오류:", error);
    showMessage(
      "글 제출에 실패했습니다. 연결 및 데이터베이스 정책을 확인하세요.",
      true
    );
  } finally {
    submitButton.disabled = false;
  }
});

adminToggle.addEventListener("click", async () => {
  if (isAdmin) {
    adminPanel.classList.remove("hidden");
    adminPanel.scrollIntoView({ behavior: "smooth" });
    await loadPosts();
    return;
  }

  adminLoginPanel.classList.remove("hidden");
  adminLoginPanel.scrollIntoView({ behavior: "smooth" });
});

cancelAdminLogin.addEventListener("click", () => {
  adminLoginPanel.classList.add("hidden");
  showLoginMessage("");
});

adminLoginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = adminEmail.value.trim();
  const password = adminPassword.value;

  const loginButton = adminLoginForm.querySelector(
    'button[type="submit"]'
  );

  loginButton.disabled = true;
  showLoginMessage("로그인 확인 중입니다.");

  try {
    const { error: loginError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) throw loginError;

    const authorized = await verifyAdmin();

    if (!authorized) {
      await supabaseClient.auth.signOut();
      throw new Error(
        "이 계정에는 게시판 관리자 권한이 없습니다."
      );
    }

    adminLoginPanel.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    adminToggle.textContent = "관리자 페이지";
    adminPassword.value = "";

    showLoginMessage("");
    await loadPosts();
    adminPanel.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("관리자 로그인 오류:", error);
    showLoginMessage(
      error.message || "로그인에 실패했습니다.",
      true
    );
  } finally {
    loginButton.disabled = false;
  }
});

adminLogout.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error("로그아웃 오류:", error);
    alert("로그아웃에 실패했습니다.");
    return;
  }

  isAdmin = false;
  pendingItems = [];

  adminPanel.classList.add("hidden");
  adminLoginPanel.classList.add("hidden");
  adminToggle.textContent = "관리자 로그인";

  await loadPosts();
});

async function initialize() {
  if (
    !window.supabase ||
    SUPABASE_KEY.startsWith("여기에_")
  ) {
    showMessage(
      "Supabase 공개 키를 script.js에 설정해야 합니다.",
      true
    );
    return;
  }

  const authorized = await verifyAdmin();

  if (authorized) {
    adminToggle.textContent = "관리자 페이지";
    adminPanel.classList.remove("hidden");
  }

  await loadPosts();
}

initialize();
