
const SUPABASE_URL = "https://jmopvsektpmmejyarjyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_WXwSFMksPBri_DwvjSLbbw_OZFNDh0B";

// Supabase 연결
const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// HTML 요소
const postForm = document.getElementById("postForm");
const postTitle = document.getElementById("postTitle");
const postContent = document.getElementById("postContent");
const formMessage = document.getElementById("formMessage");
const publicPosts = document.getElementById("publicPosts");

// 날짜 표시
function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ko-KR");
}

// HTML 요소 안전하게 만들기
function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

// 공개 게시글 불러오기
async function loadPublicPosts() {
  publicPosts.replaceChildren(
    makeElement("p", "empty-message", "게시글을 불러오는 중입니다.")
  );

  try {
    const { data, error } = await db
      .from("board_posts")
      .select("id, title, content, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    publicPosts.replaceChildren();

    if (!data || data.length === 0) {
      publicPosts.appendChild(
        makeElement(
          "p",
          "empty-message",
          "아직 공개된 게시글이 없습니다."
        )
      );
      return;
    }

    data.forEach(post => {
      const card = makeElement("article", "post-card");

      card.appendChild(
        makeElement("h3", "", post.title || "(제목 없음)")
      );

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

      publicPosts.appendChild(card);
    });
  } catch (error) {
    console.error("공개 게시글 조회 오류:", error);

    publicPosts.replaceChildren(
      makeElement(
        "p",
        "empty-message",
        "게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
      )
    );
  }
}

// 글 제출 처리
postForm.addEventListener("submit", async event => {
  // 브라우저의 기본 폼 제출과 새로고침 방지
  event.preventDefault();

  const title = postTitle.value.trim();
  const content = postContent.value.trim();

  if (!title || !content) {
    formMessage.textContent = "제목과 내용을 모두 입력해 주세요.";
    return;
  }

  const submitButton = postForm.querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;
  formMessage.textContent = "검토 요청을 제출하고 있습니다.";

  try {
    const { error } = await db
      .from("board_posts")
      .insert([
        {
          title: title,
          content: content,
          status: "pending"
        }
      ]);

    if (error) {
      throw error;
    }

    postForm.reset();

    formMessage.textContent =
      "검토 요청이 접수되었습니다. 관리자 승인 후 공개됩니다.";

    await loadPublicPosts();
  } catch (error) {
    console.error("글 제출 오류:", error);

    formMessage.textContent =
      `제출에 실패했습니다: ${error.message || "알 수 없는 오류"}`;
  } finally {
    submitButton.disabled = false;
  }
});

// 페이지가 준비되면 공개 게시글 표시
loadPublicPosts();
