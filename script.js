
const STORAGE_KEY = "schoolBoardPosts_v1";

// 실험 전용 비밀번호입니다.
// 실제 공개 사이트에서는 이 방식으로 관리자 인증을 하면 안 됩니다.
const DEMO_PASSWORD = "2468";

const postForm = document.getElementById("postForm");
const postTitle = document.getElementById("postTitle");
const postContent = document.getElementById("postContent");
const formMessage = document.getElementById("formMessage");

const adminToggle = document.getElementById("adminToggle");
const adminPanel = document.getElementById("adminPanel");
const adminLogout = document.getElementById("adminLogout");

const pendingPosts = document.getElementById("pendingPosts");
const publicPosts = document.getElementById("publicPosts");
const pendingCount = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");

let isAdmin = false;

function loadPosts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(post =>
      post &&
      typeof post.id === "string" &&
      typeof post.title === "string" &&
      typeof post.content === "string" &&
      ["pending", "approved"].includes(post.status)
    );
  } catch (error) {
    console.error("게시글을 불러오지 못했습니다.", error);
    return [];
  }
}

let posts = loadPosts();

function savePosts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    return true;
  } catch (error) {
    console.error("게시글을 저장하지 못했습니다.", error);
    alert("저장에 실패했습니다. 브라우저 저장 공간을 확인하세요.");
    return false;
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    // HTML로 실행하지 않고 일반 텍스트로 표시합니다.
    element.textContent = text;
  }

  return element;
}

function formatDate(value) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showEmpty(container, message) {
  container.appendChild(
    createElement("p", "empty-message", message)
  );
}

function createPostCard(post, adminMode = false) {
  const card = createElement("article", "post-card");

  const statusText =
    post.status === "approved" ? "공개됨" : "검토 대기";

  const statusClass =
    post.status === "approved"
      ? "status approved"
      : "status";

  card.appendChild(createElement("span", statusClass, statusText));
  card.appendChild(createElement("h3", "", post.title));
  card.appendChild(createElement("p", "post-content", post.content));
  card.appendChild(
    createElement("p", "post-meta", `익명 · ${formatDate(post.createdAt)}`)
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
      updatePostStatus(post.id, "approved");
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
  const pending = posts.filter(post => post.status === "pending");
  const approved = posts.filter(post => post.status === "approved");

  pendingPosts.replaceChildren();
  publicPosts.replaceChildren();

  pendingCount.textContent = String(pending.length);
  approvedCount.textContent = String(approved.length);

  if (pending.length === 0) {
    showEmpty(pendingPosts, "검토할 게시글이 없습니다.");
  } else {
    pending.forEach(post => {
      pendingPosts.appendChild(createPostCard(post, true));
    });
  }

  if (approved.length === 0) {
    showEmpty(publicPosts, "아직 공개된 게시글이 없습니다.");
  } else {
    approved
      .slice()
      .reverse()
      .forEach(post => {
        publicPosts.appendChild(createPostCard(post));
      });
  }
}

function updatePostStatus(id, status) {
  if (!isAdmin) {
    alert("관리자만 사용할 수 있습니다.");
    return;
  }

  const post = posts.find(item => item.id === id);

  if (!post) {
    return;
  }

  post.status = status;

  if (savePosts()) {
    renderPosts();
  }
}

function rejectPost(id) {
  if (!isAdmin) {
    alert("관리자만 사용할 수 있습니다.");
    return;
  }

  const confirmed = confirm(
    "이 글을 반려할까요? 반려하면 이 실험 사이트에서 삭제됩니다."
  );

  if (!confirmed) {
    return;
  }

  const previousPosts = posts;
  posts = posts.filter(post => post.id !== id);

  if (savePosts()) {
    renderPosts();
  } else {
    posts = previousPosts;
  }
}

postForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = postTitle.value.trim();
  const content = postContent.value.trim();

  if (!title || !content) {
    formMessage.textContent = "제목과 내용을 입력해 주세요.";
    return;
  }

  const newPost = {
    id: crypto.randomUUID(),
    title,
    content,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  posts.push(newPost);

  if (savePosts()) {
    postForm.reset();
    formMessage.textContent =
      "글이 제출되었습니다. 관리자 검토 후 공개됩니다.";
    renderPosts();
  } else {
    posts = posts.filter(post => post.id !== newPost.id);
  }
});

adminToggle.addEventListener("click", () => {
  if (isAdmin) {
    adminPanel.classList.remove("hidden");
    adminPanel.scrollIntoView({ behavior: "smooth" });
    return;
  }

  const password = prompt(
    "실험용 관리자 비밀번호를 입력하세요. (2468)"
  );

  if (password === null) {
    return;
  }

  if (password !== DEMO_PASSWORD) {
    alert("비밀번호가 올바르지 않습니다.");
    return;
  }

  isAdmin = true;
  adminToggle.textContent = "관리자 페이지";
  adminPanel.classList.remove("hidden");
  renderPosts();
  adminPanel.scrollIntoView({ behavior: "smooth" });
});

adminLogout.addEventListener("click", () => {
  isAdmin = false;
  adminPanel.classList.add("hidden");
  adminToggle.textContent = "관리자 로그인";
});

renderPosts();
