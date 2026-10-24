
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SCHOOL MEDIA | 익명 게시판</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
  <script src="script.js" defer></script>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <p class="eyebrow">SCHOOL MEDIA</p>
      <h1>익명 게시판</h1>
      <p>여러분의 이야기를 들려주세요.</p>
    </div>
  </header>

  <nav class="nav">
    <a href="#write">글 작성</a>
    <a href="#board">공개 게시판</a>
    <a href="admin.html">관리자 페이지</a>
  </nav>

  <main>
    <section id="write" class="panel">
      <h2>익명으로 글 작성하기</h2>
      <p class="description">
        작성한 글은 관리자 검토 후 공개됩니다.
        이름이나 전화번호 등 개인정보는 작성하지 마세요.
      </p>

      <form id="postForm">
        <label for="postTitle">제목</label>
        <input
          id="postTitle"
          type="text"
          maxlength="60"
          placeholder="제목을 입력하세요."
          required
        >

        <label for="postContent">내용</label>
        <textarea
          id="postContent"
          rows="6"
          maxlength="2000"
          placeholder="내용을 입력하세요."
          required
        ></textarea>

        <button class="primary-button" type="submit">
          검토 요청하기
        </button>
      </form>

      <p id="formMessage" class="message" aria-live="polite"></p>
    </section>

    <section id="board" class="panel">
      <h2>공개 게시판</h2>
      <p class="description">
        관리자 승인이 완료된 글만 표시됩니다.
      </p>
      <div id="publicPosts" class="post-list"></div>
    </section>
  </main>

  <footer>
    <p>SCHOOL MEDIA · 익명 게시판</p>
  </footer>
</body>
</html>
