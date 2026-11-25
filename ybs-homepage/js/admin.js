
document.addEventListener("DOMContentLoaded", () => {
  const adminStatus = document.getElementById("adminStatus");
  const adminContent = document.getElementById("adminContent");
  const memberList = document.getElementById("memberList");
  const logoutButton = document.getElementById("logoutButton");

  const totalMembers = document.getElementById("totalMembers");
  const pendingMembers = document.getElementById("pendingMembers");
  const approvedMembers = document.getElementById("approvedMembers");
  const rejectedMembers = document.getElementById("rejectedMembers");

  const memberSearch = document.getElementById("memberSearch");
  const statusFilter = document.getElementById("statusFilter");
  const refreshButton = document.getElementById("refreshButton");

  const ybsClient = window.ybsSupabase;

  let allMembers = [];
  let currentAdminId = null;

  async function checkAdmin() {
    try {
      const {
        data: { user },
        error: authError
      } = await ybsClient.auth.getUser();

      if (authError || !user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data: profile, error: profileError } = await ybsClient
        .from("profiles")
        .select("name, role, approval_status")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("회원 정보를 확인할 수 없습니다.");
      }

      if (
        profile.role !== "admin" ||
        profile.approval_status !== "approved"
      ) {
        throw new Error("관리자 권한이 없습니다.");
      }

      currentAdminId = user.id;

      adminStatus.textContent = `${profile.name} 관리자님, 환영합니다.`;
      adminContent.hidden = false;

      await loadMembers();

    } catch (error) {
      console.error("관리자 인증 오류:", error);
      adminStatus.textContent = error.message;
      adminContent.hidden = true;
    }
  }

  async function loadMembers() {
    memberList.textContent = "회원 목록을 불러오는 중입니다.";

    const { data: members, error } = await ybsClient
      .from("profiles")
      .select(
        "id, name, grade, class_number, student_number, role, approval_status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("회원 목록 조회 오류:", error);
      memberList.textContent = "회원 목록을 불러오지 못했습니다.";
      return;
    }

    allMembers = members || [];

    updateStatistics();
    renderMembers();
  }

  function updateStatistics() {
    totalMembers.textContent = allMembers.length;

    pendingMembers.textContent = allMembers.filter(
      member => member.approval_status === "pending"
    ).length;

    approvedMembers.textContent = allMembers.filter(
      member => member.approval_status === "approved"
    ).length;

    rejectedMembers.textContent = allMembers.filter(
      member => member.approval_status === "rejected"
    ).length;
  }

  function createActionButton(text, className, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = text;
    button.className = className;
    button.addEventListener("click", onClick);

    return button;
  }

  function renderMembers() {
    const keyword = memberSearch.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    const filteredMembers = allMembers.filter(member => {
      const matchesStatus =
        selectedStatus === "all" ||
        member.approval_status === selectedStatus;

      const searchableText = [
        member.name,
        `${member.grade}학년`,
        `${member.class_number}반`,
        `${member.student_number}번`
      ].join(" ").toLowerCase();

      return matchesStatus && searchableText.includes(keyword);
    });

    memberList.replaceChildren();

    if (filteredMembers.length === 0) {
      memberList.textContent = "검색 결과가 없습니다.";
      return;
    }

    filteredMembers.forEach(member => {
      const item = document.createElement("div");
      item.className = "member-item";

      const info = document.createElement("p");

      const statusLabels = {
        pending: "승인 대기",
        approved: "승인 완료",
        rejected: "가입 거절"
      };

      const roleLabel =
        member.role === "admin" ? "관리자" : "일반 회원";

      info.textContent =
        `${member.name} | ` +
        `${member.grade}학년 ${member.class_number}반 ` +
        `${member.student_number}번 | ` +
        `${roleLabel} | ` +
        `${statusLabels[member.approval_status] || "알 수 없음"}`;

      item.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "member-actions";

      if (member.id !== currentAdminId) {
        actions.appendChild(
          createActionButton(
            "정보 수정",
            "edit-button",
            () => editMember(member)
          )
        );

        actions.appendChild(
          createActionButton(
            member.role === "admin"
              ? "일반 회원으로 변경"
              : "관리자로 변경",
            "role-button",
            () => changeMemberRole(member)
          )
        );

        actions.appendChild(
          createActionButton(
            "회원 삭제",
            "delete-button",
            () => deleteMember(member)
          )
        );
      }

      if (
        member.role !== "admin" &&
        member.approval_status === "pending"
      ) {
        actions.append(
          createActionButton(
            "승인",
            "approve-button",
            () => updateMemberStatus(member.id, "approved")
          ),
          createActionButton(
            "거절",
            "reject-button",
            () => updateMemberStatus(member.id, "rejected")
          )
        );
      }

      item.appendChild(actions);
      memberList.appendChild(item);
    });
  }

  async function editMember(member) {
    const name = prompt("회원 이름을 입력하세요.", member.name);
    if (name === null) return;

    const grade = prompt("학년을 입력하세요. (1~3)", member.grade);
    if (grade === null) return;

    const classNumber = prompt("반을 입력하세요.", member.class_number);
    if (classNumber === null) return;

    const studentNumber = prompt("번호를 입력하세요.", member.student_number);
    if (studentNumber === null) return;

    const cleanName = name.trim();
    const cleanGrade = String(grade).trim();
    const cleanClass = String(classNumber).trim();
    const cleanNumber = String(studentNumber).trim();

    if (
      !cleanName ||
      !/^[1-3]$/.test(cleanGrade) ||
      !/^\d{1,2}$/.test(cleanClass) ||
      Number(cleanClass) < 1 ||
      Number(cleanClass) > 99 ||
      !/^\d{1,3}$/.test(cleanNumber) ||
      Number(cleanNumber) < 1 ||
      Number(cleanNumber) > 999
    ) {
      alert("입력한 회원 정보를 다시 확인해 주세요.");
      return;
    }

    if (!confirm(`${cleanName} 회원의 정보를 수정하시겠습니까?`)) {
      return;
    }

    const { error } = await ybsClient.rpc("update_member_profile", {
      p_member_id: member.id,
      p_name: cleanName,
      p_grade: cleanGrade,
      p_class_number: cleanClass,
      p_student_number: cleanNumber
    });

    if (error) {
      console.error("회원 정보 수정 오류:", error);
      alert(`회원 정보 수정에 실패했습니다.\n${error.message}`);
      return;
    }

    alert("회원 정보가 수정되었습니다.");
    await loadMembers();
  }

  async function changeMemberRole(member) {
    const newRole = member.role === "admin" ? "member" : "admin";
    const roleLabel = newRole === "admin" ? "관리자" : "일반 회원";

    if (
      !confirm(
        `${member.name} 회원의 권한을 ${roleLabel}(으)로 변경하시겠습니까?`
      )
    ) {
      return;
    }

    const { error } = await ybsClient.rpc("set_member_role", {
      p_member_id: member.id,
      p_role: newRole
    });

    if (error) {
      console.error("회원 권한 변경 오류:", error);
      alert(`권한 변경에 실패했습니다.\n${error.message}`);
      return;
    }

    alert("회원 권한이 변경되었습니다.");
    await loadMembers();
  }

  async function updateMemberStatus(memberId, status) {
    const action = status === "approved" ? "승인" : "거절";

    if (!confirm(`이 회원을 ${action}하시겠습니까?`)) {
      return;
    }

    const { error } = await ybsClient.rpc("set_member_approval", {
      p_member_id: memberId,
      p_status: status
    });

    if (error) {
      console.error("회원 상태 변경 오류:", error);
      alert(`${action}에 실패했습니다.`);
      return;
    }

    alert(`${action}이 완료되었습니다.`);
    await loadMembers();
  }

  async function deleteMember(member) {
    if (member.id === currentAdminId) {
      alert("현재 로그인한 관리자 계정은 삭제할 수 없습니다.");
      return;
    }

    const memberLabel =
      `${member.name} (${member.grade}학년 ` +
      `${member.class_number}반 ${member.student_number}번)`;

    const firstConfirm = confirm(
      `${memberLabel} 회원을 삭제하시겠습니까?\n\n` +
      "삭제하면 해당 회원은 로그인할 수 없게 됩니다.\n" +
      "작성한 게시글과 댓글은 유지되며 작성자 정보는 익명화됩니다."
    );

    if (!firstConfirm) return;

    const secondConfirm = prompt(
      `정말 삭제하려면 회원 이름 "${member.name}"을 입력하세요.`
    );

    if (secondConfirm !== member.name) {
      alert("회원 이름이 일치하지 않아 삭제를 취소했습니다.");
      return;
    }

    try {
      const { data, error } = await ybsClient.functions.invoke(
        "delete-member",
        {
          body: {
            memberId: member.id
          }
        }
      );

      if (error) {
        console.error("회원 삭제 요청 오류:", error);
        throw new Error(error.message || "회원 삭제 요청에 실패했습니다.");
      }

      if (!data || data.success !== true) {
        throw new Error(data?.error || "회원 삭제에 실패했습니다.");
      }

      alert(`${member.name} 회원이 삭제되었습니다.`);
      await loadMembers();

    } catch (error) {
      console.error("회원 삭제 오류:", error);
      alert(
        `회원 삭제에 실패했습니다.\n${error.message}\n\n` +
        "Edge Function 배포 및 관리자 권한 설정을 확인해 주세요."
      );
    }
  }

  memberSearch.addEventListener("input", renderMembers);
  statusFilter.addEventListener("change", renderMembers);
  refreshButton.addEventListener("click", loadMembers);

  logoutButton.addEventListener("click", async () => {
    const { error } = await ybsClient.auth.signOut();

    if (error) {
      console.error("로그아웃 오류:", error);
      alert("로그아웃에 실패했습니다.");
      return;
    }

    window.location.href = "index.html";
  });

  if (!ybsClient) {
    adminStatus.textContent = "Supabase 연결을 확인할 수 없습니다.";
  } else {
    checkAdmin();
  }
});
