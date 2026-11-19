
const ybsClient = window.ybsSupabase;

const communityStatus = document.getElementById("communityStatus");
const publicPosts = document.getElementById("publicPosts");
const refreshPosts = document.getElementById("refreshPosts");

let currentUser = null;
let currentProfile = null;

function showEmpty(message) {
  publicPosts.replaceChildren();

  const empty = document.createElement("div");
  empty.className = "community-empty";
  empty.textContent = message;

  publicPosts.appendChild(empty);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

/* =====================================
   공개 게시글 삭제
===================================== */

async function deletePublicPost(postId, deleteButton) {
  if (currentProfile?.role !== "admin") {
    alert("관리자만 게시글을 삭제할 수 있습니다.");
    return;
  }

  const confirmed = confirm(
    "이 공개 게시글을 삭제하시겠습니까?\n삭제한 게시글은 복구할 수 없습니다."
  );

  if (!confirmed) return;

  deleteButton.disabled = true;
  deleteButton.textContent = "삭제 중...";

  const { error } = await ybsClient.rpc(
    "delete_community_post",
    {
      p_post_id: postId
    }
  );

  if (error) {
    console.error("공개 게시글 삭제 오류:", error);

    alert(error.message || "게시글 삭제에 실패했습니다.");

    deleteButton.disabled = false;
    deleteButton.textContent = "게시글 삭제";

    return;
  }

  alert("게시글이 삭제되었습니다.");

  await loadPublicPosts();
}

/* =====================================
   좋아요 / 싫어요
===================================== */

async function loadReactions(postId, reactionArea) {
  const { data, error } = await ybsClient.rpc(
    "get_community_post_reactions",
    { p_post_id: postId }
  );

  if (error) {
    console.error("반응 조회 오류:", error);
    reactionArea.textContent = "반응 정보를 불러오지 못했습니다.";
    return;
  }

  const result = data?.[0] || {
    likes: 0,
    dislikes: 0,
    my_reaction: null
  };

  reactionArea.replaceChildren();

  const likeButton = createElement(
    "button",
    result.my_reaction === "like"
      ? "reaction-button active"
      : "reaction-button",
    `좋아요 ${result.likes}`
  );

  const dislikeButton = createElement(
    "button",
    result.my_reaction === "dislike"
      ? "reaction-button active"
      : "reaction-button",
    `싫어요 ${result.dislikes}`
  );

  likeButton.type = "button";
  dislikeButton.type = "button";

  likeButton.addEventListener("click", () => {
    toggleReaction(postId, "like", reactionArea);
  });

  dislikeButton.addEventListener("click", () => {
    toggleReaction(postId, "dislike", reactionArea);
  });

  reactionArea.append(likeButton, dislikeButton);
}

async function toggleReaction(postId, reactionType, reactionArea) {
  const { error } = await ybsClient.rpc(
    "toggle_community_post_reaction",
    {
      p_post_id: postId,
      p_reaction_type: reactionType
    }
  );

  if (error) {
    console.error("반응 등록 오류:", error);
    alert(error.message || "반응 등록에 실패했습니다.");
    return;
  }

  await loadReactions(postId, reactionArea);
}

/* =====================================
   댓글
===================================== */

async function loadComments(postId, commentList) {
  commentList.textContent = "댓글을 불러오는 중입니다.";

  const { data, error } = await ybsClient.rpc(
    "get_community_comments",
    { p_post_id: postId }
  );

  if (error) {
    console.error("댓글 조회 오류:", error);
    commentList.textContent = "댓글을 불러오지 못했습니다.";
    return;
  }

  commentList.replaceChildren();

  if (!data || data.length === 0) {
    commentList.textContent = "아직 댓글이 없습니다.";
    return;
  }

  data.forEach(comment => {
    const item = createElement("div", "comment-item");

    const text = createElement(
      "p",
      "comment-text",
      comment.content
    );

    const meta = createElement(
      "div",
      "comment-meta",
      new Date(comment.created_at).toLocaleString("ko-KR")
    );

    /* 관리자 전용 댓글 작성자 표시 */

    if (
      currentProfile?.role === "admin" &&
      comment.author_display
    ) {
      const author = createElement(
        "span",
        "comment-author-display",
        `작성자: ${comment.author_display}`
      );

      meta.appendChild(author);
    }

    item.append(text, meta);

    if (comment.is_mine || currentProfile?.role === "admin") {
      const deleteButton = createElement(
        "button",
        "delete-button",
        "삭제"
      );

      deleteButton.type = "button";

      deleteButton.addEventListener("click", async () => {
        if (!confirm("이 댓글을 삭제하시겠습니까?")) return;

        const { error: deleteError } = await ybsClient.rpc(
          "delete_community_comment",
          { p_comment_id: comment.comment_id }
        );

        if (deleteError) {
          console.error("댓글 삭제 오류:", deleteError);
          alert(deleteError.message || "댓글 삭제에 실패했습니다.");
          return;
        }

        await loadComments(postId, commentList);
      });

      item.appendChild(deleteButton);
    }

    commentList.appendChild(item);
  });
}

/* =====================================
   게시글 카드 생성
===================================== */

function createPostCard(post, adminAuthorDisplay = null) {
  const card = createElement("article", "post-card");

  const title = createElement("h3", "", post.title);

  const content = createElement(
    "div",
    "post-content",
    post.content
  );

  const meta = createElement("div", "post-meta");

  const anonymous = createElement(
    "span",
    "",
    post.display_author || "익명"
  );

  const date = createElement(
    "span",
    "",
    new Date(post.created_at).toLocaleString("ko-KR")
  );

  meta.append(anonymous, date);

  /* 관리자 전용 작성자 정보 */

  if (currentProfile?.role === "admin" && adminAuthorDisplay) {
    const author = createElement(
      "span",
      "admin-author-display",
      `작성자: ${adminAuthorDisplay}`
    );

    meta.appendChild(author);
  }

  /* 관리자 전용 게시글 삭제 버튼 */

  if (currentProfile?.role === "admin") {
    const deleteArea = createElement("div", "post-delete-area");

    const deleteButton = createElement(
      "button",
      "delete-button",
      "게시글 삭제"
    );

    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {
      deletePublicPost(post.id, deleteButton);
    });

    deleteArea.appendChild(deleteButton);
    meta.appendChild(deleteArea);
  }

  /* 좋아요 / 싫어요 */

  const reactionArea = createElement("div", "reaction-area");

  /* 댓글 영역 */

  const commentSection = createElement("section", "comment-section");

  const commentHeading = createElement("h4", "", "댓글");

  const commentList = createElement("div", "comment-list");

  const commentForm = createElement("form", "comment-form");

  const commentInput = document.createElement("textarea");
  commentInput.placeholder = "댓글을 입력해 주세요.";
  commentInput.maxLength = 1000;
  commentInput.required = true;

  const commentButton = createElement(
    "button",
    "primary-button",
    "댓글 작성"
  );

  commentButton.type = "submit";

  commentForm.append(commentInput, commentButton);

  commentForm.addEventListener("submit", async event => {
    event.preventDefault();

    const content = commentInput.value.trim();

    if (!content) {
      alert("댓글 내용을 입력해 주세요.");
      return;
    }

    commentButton.disabled = true;

    const { error } = await ybsClient.rpc(
      "create_community_comment",
      {
        p_post_id: post.id,
        p_content: content
      }
    );

    commentButton.disabled = false;

    if (error) {
      console.error("댓글 작성 오류:", error);
      alert(error.message || "댓글 작성에 실패했습니다.");
      return;
    }

    commentInput.value = "";
    await loadComments(post.id, commentList);
  });

  commentSection.append(
    commentHeading,
    commentList,
    commentForm
  );

  card.append(
    title,
    content,
    meta,
    reactionArea,
    commentSection
  );

  loadReactions(post.id, reactionArea);
  loadComments(post.id, commentList);

  return card;
}

/* =====================================
   관리자 전용 작성자 조회
===================================== */

async function loadAdminPostAuthors() {
  if (currentProfile?.role !== "admin") {
    return {};
  }

  const { data, error } = await ybsClient.rpc(
    "get_community_approved_post_authors"
  );

  if (error) {
    console.error("관리자 작성자 조회 오류:", error);
    return {};
  }

  const authorMap = {};

  (data || []).forEach(item => {
    authorMap[item.post_id] = item.author_display;
  });

  return authorMap;
}

/* =====================================
   공개 게시글 불러오기
   공개 조회 전용 뷰 사용
===================================== */

async function loadPublicPosts() {
  publicPosts.textContent = "게시글을 불러오는 중입니다.";

  const { data: posts, error } = await ybsClient
    .from("community_posts_public")
    .select("id, title, content, created_at, display_author")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("공개 게시글 조회 오류:", error);
    showEmpty("게시글을 불러오지 못했습니다.");
    return;
  }

  if (!posts || posts.length === 0) {
    showEmpty("아직 공개된 게시글이 없습니다.");
    return;
  }

  /* 관리자만 작성자 정보 조회 */

  let adminAuthorMap = {};

  if (currentProfile?.role === "admin") {
    adminAuthorMap = await loadAdminPostAuthors();
  }

  publicPosts.replaceChildren();

  posts.forEach(post => {
    publicPosts.appendChild(
      createPostCard(
        post,
        adminAuthorMap[post.id] || null
      )
    );
  });
}

/* =====================================
   커뮤니티 초기화
===================================== */

async function initializeCommunity() {
  if (!ybsClient) {
    communityStatus.textContent =
      "Supabase 연결을 확인할 수 없습니다.";

    showEmpty("서비스 연결을 확인해 주세요.");
    return;
  }

  try {
    const {
      data: { user },
      error: authError
    } = await ybsClient.auth.getUser();

    if (authError || !user) {
      communityStatus.textContent = "로그인이 필요합니다.";
      showEmpty("로그인 후 커뮤니티를 이용할 수 있습니다.");
      return;
    }

    currentUser = user;

    const { data: profile, error: profileError } = await ybsClient
      .from("profiles")
      .select("name, role, approval_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      communityStatus.textContent =
        "회원 정보를 확인할 수 없습니다.";

      showEmpty("회원 정보를 확인할 수 없습니다.");
      return;
    }

    currentProfile = profile;

    if (
      profile.approval_status !== "approved" &&
      profile.role !== "admin"
    ) {
      communityStatus.textContent =
        "관리자 승인 대기 중입니다.";

      showEmpty("회원 승인 후 게시글을 확인할 수 있습니다.");
      return;
    }

    communityStatus.textContent =
      `${profile.name}님, 커뮤니티에 오신 것을 환영합니다.`;

    await loadPublicPosts();

  } catch (error) {
    console.error("커뮤니티 초기화 오류:", error);

    communityStatus.textContent =
      "커뮤니티를 불러오지 못했습니다.";
  }
}

/* =====================================
   이벤트 연결
===================================== */

refreshPosts.addEventListener("click", loadPublicPosts);

initializeCommunity();
