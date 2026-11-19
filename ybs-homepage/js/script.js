
document.addEventListener("DOMContentLoaded", () => {
  const ybsClient = window.ybsSupabase;

  const menuToggle = document.getElementById("menuToggle");
  const navigation = document.getElementById("navigation");

  const loginButton = document.getElementById("loginButton");
  const adminPageLink = document.getElementById("adminPageLink");

  const authOverlay = document.getElementById("authOverlay");
  const authClose = document.getElementById("authClose");

  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");

  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  const authMessage = document.getElementById("authMessage");
  const authAccount = document.getElementById("authAccount");
  const accountDetails = document.getElementById("accountDetails");
  const logoutButton = document.getElementById("logoutButton");

  /* 설정 요소 */

  const settingsLoginNotice = document.getElementById("settingsLoginNotice");
  const settingsContent = document.getElementById("settingsContent");
  const settingsAccountDetails = document.getElementById("settingsAccountDetails");

  const changePasswordForm = document.getElementById("changePasswordForm");
  const currentPassword = document.getElementById("currentPassword");
  const newPassword = document.getElementById("newPassword");
  const confirmNewPassword = document.getElementById("confirmNewPassword");
  const changePasswordButton = document.getElementById("changePasswordButton");
  const passwordMessage = document.getElementById("passwordMessage");

  const deleteAccountForm = document.getElementById("deleteAccountForm");
  const deleteAccountPassword = document.getElementById("deleteAccountPassword");
  const deleteAccountButton = document.getElementById("deleteAccountButton");
  const deleteAccountMessage = document.getElementById("deleteAccountMessage");

  if (
    !menuToggle || !navigation || !loginButton ||
    !adminPageLink || !authOverlay || !authClose ||
    !loginTab || !signupTab || !loginForm || !signupForm ||
    !authMessage || !authAccount ||
    !accountDetails || !logoutButton
  ) {
    console.error("YBS: 필요한 HTML 요소를 찾을 수 없습니다.");
    return;
  }

  let currentUser = null;
  let currentProfile = null;

  /* 공통 메시지 */

  function showMessage(message, type = "info") {
    authMessage.textContent = message;
    authMessage.className = "auth-message active";

    if (type === "error") authMessage.classList.add("error");
    if (type === "success") authMessage.classList.add("success");
  }

  function clearMessage() {
    authMessage.textContent = "";
    authMessage.className = "auth-message";
  }

  function showSettingsMessage(element, message, type = "info") {
    if (!element) return;

    element.textContent = message;
    element.className = "settings-message active";

    if (type === "error") element.classList.add("error");
    if (type === "success") element.classList.add("success");
  }

  function clearSettingsMessage(element) {
    if (!element) return;

    element.textContent = "";
    element.className = "settings-message";
  }

  /* 로그인 팝업 */

  function openAuth() {
    authOverlay.classList.add("active");
  }

  function closeAuth() {
    authOverlay.classList.remove("active");
  }

  function changeTab(mode) {
    const isLogin = mode === "login";

    clearMessage();

    loginTab.classList.toggle("active", isLogin);
    signupTab.classList.toggle("active", !isLogin);

    loginForm.classList.toggle("active", isLogin);
    signupForm.classList.toggle("active", !isLogin);

    loginForm.style.display = isLogin ? "block" : "none";
    signupForm.style.display = isLogin ? "none" : "block";

    authAccount.classList.remove("active");
    loginTab.style.display = "";
    signupTab.style.display = "";
  }

  /* 설정 화면 */

  function updateSettings(profile, user) {
    if (
      !settingsLoginNotice ||
      !settingsContent ||
      !settingsAccountDetails
    ) {
      return;
    }

    if (!profile || !user) {
      settingsLoginNotice.style.display = "block";
      settingsContent.classList.add("settings-disabled");

      settingsAccountDetails.textContent =
        "로그인 후 계정 정보가 표시됩니다.";

      return;
    }

    settingsLoginNotice.style.display = "none";
    settingsContent.classList.remove("settings-disabled");

    const email = user.email || "이메일 정보 없음";

    settingsAccountDetails.textContent =
      `${profile.name || "이름 없음"}\n` +
      `${profile.grade || "-"}학년 ` +
      `${profile.class_number || "-"}반 ` +
      `${profile.student_number || "-"}번\n` +
      `${email}`;

    settingsAccountDetails.style.whiteSpace = "pre-line";
  }

  /* 로그인 상태 표시 */

  function showLoggedIn(profile, user) {
    currentProfile = profile;
    currentUser = user;

    loginButton.textContent = profile.name;

    accountDetails.textContent =
      `${profile.name} / ${profile.grade}학년 ${profile.class_number}반 ${profile.student_number}번`;

    authAccount.classList.add("active");
    loginForm.style.display = "none";
    signupForm.style.display = "none";
    loginTab.style.display = "none";
    signupTab.style.display = "none";

    adminPageLink.hidden = profile.role !== "admin";

    updateSettings(profile, user);
  }

  function showLoggedOut() {
    currentProfile = null;
    currentUser = null;

    loginButton.textContent = "로그인";
    adminPageLink.hidden = true;

    authAccount.classList.remove("active");

    loginForm.reset();
    signupForm.reset();

    changeTab("login");

    updateSettings(null, null);

    if (changePasswordForm) changePasswordForm.reset();
    if (deleteAccountForm) deleteAccountForm.reset();

    clearSettingsMessage(passwordMessage);
    clearSettingsMessage(deleteAccountMessage);
  }

  /* 메뉴 */

  menuToggle.addEventListener("click", () => {
    navigation.classList.toggle("active");

    menuToggle.setAttribute(
      "aria-expanded",
      String(navigation.classList.contains("active"))
    );
  });

  navigation.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navigation.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* 로그인 팝업 열기 */

  loginButton.addEventListener("click", event => {
    event.preventDefault();
    openAuth();

    if (loginButton.textContent === "로그인") {
      changeTab("login");
    } else {
      clearMessage();
    }
  });

  authClose.addEventListener("click", closeAuth);

  authOverlay.addEventListener("click", event => {
    if (event.target === authOverlay) closeAuth();
  });

  loginTab.addEventListener("click", () => changeTab("login"));
  signupTab.addEventListener("click", () => changeTab("signup"));

  /* 회원가입 */

  signupForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!ybsClient) {
      showMessage("Supabase 연결을 확인해 주세요.", "error");
      return;
    }

    const button = signupForm.querySelector("button[type='submit']");
    button.disabled = true;

    try {
      const name = document.getElementById("signupName").value.trim();
      const email = document.getElementById("signupEmail").value.trim();
      const password = document.getElementById("signupPassword").value;

      const grade = Number(document.getElementById("signupGrade").value);
      const classNumber = Number(document.getElementById("signupClass").value);
      const studentNumber = Number(document.getElementById("signupNumber").value);

      if (
        !name || !email || password.length < 8 ||
        ![1, 2, 3].includes(grade) ||
        !Number.isInteger(classNumber) || classNumber < 1 ||
        !Number.isInteger(studentNumber) || studentNumber < 1
      ) {
        throw new Error("입력 정보를 다시 확인해 주세요.");
      }

      const { data, error } = await ybsClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            grade: String(grade),
            class_number: String(classNumber),
            student_number: String(studentNumber)
          }
        }
      });

      if (error) throw error;

      if (data.session) {
        await ybsClient.auth.signOut();
      }

      signupForm.reset();

      showMessage(
        "가입 요청이 접수되었습니다. 이메일 인증과 관리자 승인을 기다려 주세요.",
        "success"
      );

    } catch (error) {
      console.error("회원가입 오류:", error);
      showMessage(error.message, "error");

    } finally {
      button.disabled = false;
    }
  });

  /* 로그인 */

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!ybsClient) {
      showMessage("Supabase 연결을 확인해 주세요.", "error");
      return;
    }

    const button = loginForm.querySelector("button[type='submit']");
    button.disabled = true;

    try {
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      const { data, error } = await ybsClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await ybsClient
        .from("profiles")
        .select("name, grade, class_number, student_number, approval_status, role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await ybsClient.auth.signOut();
        throw new Error("회원 정보를 확인할 수 없습니다.");
      }

      if (
        profile.approval_status !== "approved" &&
        profile.role !== "admin"
      ) {
        await ybsClient.auth.signOut();

        throw new Error(
          profile.approval_status === "rejected"
            ? "가입이 승인되지 않았습니다."
            : "현재 관리자 승인 대기 중입니다."
        );
      }

      showLoggedIn(profile, data.user);
      showMessage("로그인되었습니다.", "success");

    } catch (error) {
      console.error("로그인 오류:", error);
      showMessage(error.message, "error");

    } finally {
      button.disabled = false;
    }
  });

  /* 로그아웃 */

  logoutButton.addEventListener("click", async () => {
    if (!ybsClient) return;

    logoutButton.disabled = true;

    try {
      const { error } = await ybsClient.auth.signOut();

      if (error) throw error;

      showLoggedOut();
      showMessage("로그아웃되었습니다.", "success");

    } catch (error) {
      console.error("로그아웃 오류:", error);
      showMessage("로그아웃에 실패했습니다.", "error");

    } finally {
      logoutButton.disabled = false;
    }
  });

  /* 현재 비밀번호 확인 */

  async function verifyCurrentPassword(password) {
    if (!ybsClient || !currentUser || !currentUser.email) {
      throw new Error("로그인 정보를 확인할 수 없습니다.");
    }

    if (!password) {
      throw new Error("현재 비밀번호를 입력해 주세요.");
    }

    const { error } = await ybsClient.auth.signInWithPassword({
      email: currentUser.email,
      password
    });

    if (error) {
      throw new Error("현재 비밀번호가 올바르지 않습니다.");
    }
  }

  /* 비밀번호 변경 */

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async event => {
      event.preventDefault();

      if (!ybsClient || !currentUser) {
        showSettingsMessage(
          passwordMessage,
          "로그인이 필요합니다.",
          "error"
        );
        return;
      }

      const oldPassword = currentPassword.value;
      const newPasswordValue = newPassword.value;
      const confirmPasswordValue = confirmNewPassword.value;

      changePasswordButton.disabled = true;
      clearSettingsMessage(passwordMessage);

      try {
        if (newPasswordValue.length < 8) {
          throw new Error("새 비밀번호는 8자 이상이어야 합니다.");
        }

        if (newPasswordValue !== confirmPasswordValue) {
          throw new Error("새 비밀번호가 서로 일치하지 않습니다.");
        }

        if (oldPassword === newPasswordValue) {
          throw new Error("현재 비밀번호와 다른 비밀번호를 입력해 주세요.");
        }

        const { error } = await ybsClient.auth.updateUser({
          password: newPasswordValue,
          current_password: oldPassword
        });

        if (error) throw error;

        changePasswordForm.reset();

        showSettingsMessage(
          passwordMessage,
          "비밀번호가 성공적으로 변경되었습니다.",
          "success"
        );

      } catch (error) {
        console.error("비밀번호 변경 오류:", error);

        showSettingsMessage(
          passwordMessage,
          error.message || "비밀번호 변경에 실패했습니다.",
          "error"
        );

      } finally {
        changePasswordButton.disabled = false;
      }
    });
  }

  /* 계정 탈퇴 */

  if (deleteAccountForm) {
    deleteAccountForm.addEventListener("submit", async event => {
      event.preventDefault();

      if (!ybsClient || !currentUser) {
        showSettingsMessage(
          deleteAccountMessage,
          "로그인이 필요합니다.",
          "error"
        );
        return;
      }

      const password = deleteAccountPassword.value;

      if (!password) {
        showSettingsMessage(
          deleteAccountMessage,
          "현재 비밀번호를 입력해 주세요.",
          "error"
        );
        return;
      }

      const confirmed = window.confirm(
        "정말 계정을 탈퇴하시겠습니까?\n\n" +
        "계정 정보는 삭제되며 이 작업은 되돌릴 수 없습니다."
      );

      if (!confirmed) return;

      deleteAccountButton.disabled = true;
      clearSettingsMessage(deleteAccountMessage);

      try {
        await verifyCurrentPassword(password);

        const { data, error } = await ybsClient.functions.invoke(
          "delete-account",
          {
            method: "POST"
          }
        );

        if (error) {
          throw error;
        }

        if (data && data.error) {
          throw new Error(data.error);
        }

        const { error: signOutError } = await ybsClient.auth.signOut({
          scope: "local"
        });

        if (signOutError) {
          console.warn("로컬 로그아웃 처리:", signOutError);
        }

        showLoggedOut();

        const settings = document.getElementById("settings");

        if (settings) {
          settings.classList.remove("settings-open");
          settings.setAttribute("aria-hidden", "true");
        }

        document.body.style.overflow = "";

        showMessage("계정 탈퇴가 완료되었습니다.", "success");
        openAuth();

      } catch (error) {
        console.error("계정 탈퇴 오류:", error);

        showSettingsMessage(
          deleteAccountMessage,
          error.message || "계정 탈퇴에 실패했습니다.",
          "error"
        );

      } finally {
        deleteAccountButton.disabled = false;
      }
    });
  }

  /* 기존 로그인 세션 확인 */

  async function checkSession() {
    if (!ybsClient) {
      showLoggedOut();
      return;
    }

    try {
      const { data, error } = await ybsClient.auth.getSession();

      if (error) throw error;

      if (!data.session) {
        showLoggedOut();
        return;
      }

      const { data: profile, error: profileError } = await ybsClient
        .from("profiles")
        .select("name, grade, class_number, student_number, approval_status, role")
        .eq("id", data.session.user.id)
        .single();

      if (
        profileError ||
        !profile ||
        (
          profile.approval_status !== "approved" &&
          profile.role !== "admin"
        )
      ) {
        await ybsClient.auth.signOut();
        showLoggedOut();
        return;
      }

      showLoggedIn(profile, data.session.user);

    } catch (error) {
      console.error("세션 확인 오류:", error);
      showLoggedOut();
    }
  }

  checkSession();

  console.log("YBS 회원 시스템 실행 완료");
});
