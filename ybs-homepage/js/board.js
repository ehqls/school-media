const ybsClient = window.ybsSupabase;

const boardStatus = document.getElementById("boardStatus");
const postForm = document.getElementById("postForm");
const postTitle = document.getElementById("postTitle");
const postContent = document.getElementById("postContent");
const submitPost = document.getElementById("submitPost");
const writeMessage = document.getElementById("writeMessage");

const adminModeration = document.getElementById("adminModeration");
const pendingPosts = document.getElementById("pendingPosts");
const refreshPending = document.getElementById("refreshPending");

let currentUser = null;
let currentProfile = null;

function showMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `community-message ${type}`;
}

function formatDate(date) {
  return new Date(date).toLocaleString("ko-KR");
}

/* =====================================
   관리자 승인 대기 게시글 조회
   관리자 전용 RPC 사용
===================================== */

async function loadPendingPosts() {
  if (!currentProfile || currentProfile.role !== "admin") {
    return;
  }

  pendingPosts.replaceChildren();

  const loading = document.createElement("p");
  loading.textContent = "승인 대기 게시글을 불러오는 중입니다.";
  pendingPosts.appendChild(loading);

  const { data, error } = await ybsClient.rpc(
    "get_community_pending_posts"
  );

  if (error) {
    console.error("대기 게시글 조회 오류:", error);

    showMessage(
      boardStatus,
      "게시글을 불러오지 못했습니다: " + error.message,
      "error"
    );

    pendingPosts.replaceChildren();

    const errorMessage = document.createElement("p");
    errorMessage.textContent = "게시글 조회에 실패했습니다.";

    pendingPosts.appendChild(errorMessage);
    return;
  }

  pendingPosts.replaceChildren();

  if (!data || data.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "승인 대기 중인 게시글이 없습니다.";
    pendingPosts.appendChild(empty);
    return;
  }

  data.forEach(post => {
    const card = document.createElement("article");
    card.className = "post-card";

    const title = document.createElement("h3");
    title.textContent = post.title;

    const content = document.createElement("p");
    content.textContent = post.content;

    /* 관리자에게만 작성자 표시 */

    const author = document.createElement("p");
    author.className = "post-author";
    author.textContent = `작성자: ${post.author_display}`;

    const date = document.createElement("small");
    date.textContent = formatDate(post.created_at);

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const approveButton = document.createElement("button");
    approveButton.type = "button";
    approveButton.className = "approve-button";
    approveButton.textContent = "승인";

    const rejectButton = document.createElement("button");
    rejectButton.type = "button";
    rejectButton.className = "reject-button";
    rejectButton.textContent = "반려";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "삭제";

    approveButton.addEventListener("click", () => {
      updatePostStatus(post.id, "approved");
    });

    rejectButton.addEventListener("click", () => {
      updatePostStatus(post.id, "rejected");
    });

    deleteButton.addEventListener("click", () => {
      deletePost(post.id);
    });

    actions.append(
      approveButton,
      rejectButton,
      deleteButton
    );

    card.append(
      title,
      content,
      author,
      date,
      actions
    );

    pendingPosts.appendChild(card);
  });
}

/* =====================================
   게시글 승인 / 반려
===================================== */

async function updatePostStatus(postId, status) {
  const actionName = status === "approved" ? "승인" : "반려";

  if (!confirm(`이 게시글을 ${actionName}하시겠습니까?`)) {
    return;
  }

  const { error } = await ybsClient.rpc(
    "set_community_post_status",
    {
      p_post_id: postId,
      p_status: status
    }
  );

  if (error) {
    alert(`${actionName} 처리 실패: ${error.message}`);
    return;
  }

  await loadPendingPosts();
}

/* =====================================
   게시글 삭제
===================================== */

async function deletePost(postId) {
  if (!confirm("이 게시글을 삭제하시겠습니까?")) {
    return;
  }

  const { error } = await ybsClient.rpc(
    "delete_community_post",
    {
      p_post_id: postId
    }
  );

  if (error) {
    alert("삭제 실패: " + error.message);
    return;
  }

  await loadPendingPosts();
}

/* =====================================
   익명 게시글 제출
===================================== */

async function submitAnonymousPost(event) {
  event.preventDefault();

  if (!currentUser || !currentProfile) {
    showMessage(
      writeMessage,
      "로그인이 필요합니다.",
      "error"
    );
    return;
  }

  const title = postTitle.value.trim();
  const content = postContent.value.trim();

  if (!title || !content) {
    showMessage(
      writeMessage,
      "제목과 내용을 입력해 주세요.",
      "error"
    );
    return;
  }

  submitPost.disabled = true;
  submitPost.textContent = "제출 중...";

  const { error } = await ybsClient
    .from("community_posts")
    .insert({
      author_id: currentUser.id,
      title,
      content,
      status: "pending"
    });

  submitPost.disabled = false;
  submitPost.textContent = "익명 게시글 제출";

  if (error) {
    showMessage(
      writeMessage,
      "게시글 제출에 실패했습니다: " + error.message,
      "error"
    );
    return;
  }

  postForm.reset();

  showMessage(
    writeMessage,
    "게시글이 제출되었습니다. 관리자 승인 후 커뮤니티에 공개됩니다.",
    "success"
  );

  if (currentProfile.role === "admin") {
    await loadPendingPosts();
  }
}

/* =====================================
   게시판 초기화
===================================== */

async function initializeBoard() {
  if (!ybsClient) {
    showMessage(
      boardStatus,
      "Supabase 연결을 확인할 수 없습니다.",
      "error"
    );
    return;
  }

  const {
    data: { user },
    error: authError
  } = await ybsClient.auth.getUser();

  if (authError || !user) {
    showMessage(
      boardStatus,
      "로그인 후 이용할 수 있습니다.",
      "error"
    );

    postForm.hidden = true;
    return;
  }

  currentUser = user;

  const { data: profile, error: profileError } = await ybsClient
    .from("profiles")
    .select("id, name, role, approval_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    showMessage(
      boardStatus,
      "회원 정보를 불러오지 못했습니다.",
      "error"
    );

    postForm.hidden = true;
    return;
  }

  currentProfile = profile;

  if (
    profile.approval_status !== "approved" &&
    profile.role !== "admin"
  ) {
    showMessage(
      boardStatus,
      "회원 승인 후 익명 게시판을 이용할 수 있습니다.",
      "error"
    );

    postForm.hidden = true;
    return;
  }

  showMessage(
    boardStatus,
    "익명 게시판을 이용할 수 있습니다.",
    "success"
  );

  if (profile.role === "admin") {
    adminModeration.hidden = false;
    await loadPendingPosts();
  }
}

/* =====================================
   이벤트 연결
===================================== */

postForm.addEventListener(
  "submit",
  submitAnonymousPost
);

if (refreshPending) {
  refreshPending.addEventListener(
    "click",
    loadPendingPosts
  );
}

initializeBoard();