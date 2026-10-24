
const SUPABASE_URL = "https://jmopvsektpmmejyarjyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_WXwSFMksPBri_DwvjSLbbw_OZFNDh0B";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
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

async function checkAdmin() {
  const { data: sessionData, error: sessionError } =
    await db.auth.getSession();

  if (sessionError || !sessionData.session) return false;

  const { data, error } = await db.rpc("is_board_admin");

  return !error && data === true;
}

function makePostCard(post, section) {
  const card = makeElement("article", "post-card");

  card.appendChild(makeElement("h3", "", post.title));
  card.appendChild(makeElement("p", "post-content", post.content));
  card.appendChild(
    makeElement("p", "post-meta", `익명 · ${formatDate(post.created_at)}`)
  );

  const actions = makeElement("div", "post-actions");

  if (section === "pending") {
    const approve = makeElement("button", "approve-button", "승인하고 공개");
    approve.type = "button";
    approve.addEventListener("click", () => updateStatus(post.id));

    const reject = makeElement("button", "reject-button", "반려하고 삭제");
    reject.type = "button";
    reject.addEventListener("click", () => deletePost(post.id, "pending"));

    actions.append(approve, reject);
  } else {
    const remove = makeElement("button", "reject-button", "공개 글 삭제");
    remove.type = "button";
    remove.addEventListener("click", () => deletePost(post.id, "approved"));

    actions.appendChild(remove);
  }

  card.appendChild(actions);
  return card;
}

async function loadPosts() {
  if (!isAdmin) return;

  const { data, error } = await db
    .from("board_posts")
    .select("id, title, content, status, created_at")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    alert("게시글을 불러오지 못했습니다. 권한 정책을 확인하세요.");
    return;
  }

  const pending = data.filter(post => post.status === "pending");
  const approved = data.filter(post => post.status === "approved");

  pendingCount.textContent = String(pending.length);
  approvedCount.textContent = String(approved.length);

  pendingPosts.replaceChildren();
  approvedPosts.replaceChildren();

  if (pending.length === 0) {
    showEmpty(pendingPosts, "검토할 게시글이 없습니다.");
  } else {
    pending.forEach(post => {
      pendingPosts.appendChild(makePostCard(post, "pending"));
    });
  }

  if (approved.length === 0) {
    showEmpty(approvedPosts, "공개된 게시글이 없습니다.");
  } else {
    approved.forEach(post => {
      approvedPosts.appendChild(makePostCard(post, "approved"));
    });
  }
}

async function updateStatus(id) {
  if (!isAdmin) return;

  const { error } = await db
    .from("board_posts")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error(error);
    alert("승인에 실패했습니다. 관리자 권한을 확인하세요.");
    return;
  }

  await loadPosts();
}

async function deletePost(id, expectedStatus) {
  if (!isAdmin) return;

  const label = expectedStatus === "approved"
    ? "공개된 게시글"
    : "검토 대기 게시글";

  if (!confirm(`${label}을 삭제할까요? 이 작업은 복구할 수 없습니다.`)) {
    return;
  }

  const { data, error } = await db
    .from("board_posts")
    .delete()
    .eq("id", id)
    .eq("status", expectedStatus)
    .select("id");

  if (error) {
    console.error(error);
    alert("삭제에 실패했습니다. 관리자 권한과 RLS 삭제 정책을 확인하세요.");
    return;
  }

  if (!data || data.length === 0) {
    alert("게시글이 삭제되지 않았습니다. 권한이나 게시글 상태를 확인하세요.");
    return;
  }

  await loadPosts();
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  const button = loginForm.querySelector('button[type="submit"]');

  button.disabled = true;
  loginMessage.textContent = "로그인 중…";

  try {
    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) throw error;

    isAdmin = await checkAdmin();

    if (!isAdmin) {
      await db.auth.signOut();
      throw new Error("이 계정에는 관리자 권한이 없습니다.");
    }

    loginPanel.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    loginMessage.textContent = "";
    document.getElementById("adminPassword").value = "";

    await loadPosts();
  } catch (error) {
    console.error(error);
    loginMessage.textContent =
      error.message || "로그인에 실패했습니다.";
  } finally {
    button.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await db.auth.signOut();
  isAdmin = false;

  adminPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  loginForm.reset();
});

async function initialize() {
  if (
    !window.supabase ||
    SUPABASE_KEY.startsWith("여기에_")
  ) {
    loginMessage.textContent =
      "admin.js에 Supabase 공개 키를 설정하세요.";
    return;
  }

  isAdmin = await checkAdmin();

  if (isAdmin) {
    loginPanel.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    await loadPosts();
  }
}

initialize();
