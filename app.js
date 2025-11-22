// app.js

// 1. Firebase 초기화 -------------------------------------------------
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// HTML 요소들 --------------------------------------------------------
const loginBtn          = document.getElementById("login-btn");          // 헤더용 Google 로그인 버튼 (index/write)
const logoutBtn         = document.getElementById("logout-btn");
const userInfo          = document.getElementById("user-info");
const titleInput        = document.getElementById("title-input");
const contentInput      = document.getElementById("content-input");
const postBtn           = document.getElementById("post-btn");
const postList          = document.getElementById("post-list");
const anonymousCheck    = document.getElementById("anonymous-check");
const adminCheck        = document.getElementById("admin-check");
const adminCheckWrapper = document.getElementById("admin-check-wrapper");

// 로그인 페이지 전용 요소들 ------------------------------------------
const googleLoginBtn   = document.getElementById("google-login-btn");   // login.html Google 버튼
const emailInput       = document.getElementById("email-input");
const passwordInput    = document.getElementById("password-input");
const emailLoginBtn    = document.getElementById("email-login-btn");
const emailSignupLink  = document.getElementById("email-signup-link");

// ▼ 여기부터 새로 추가
const signupModal         = document.getElementById("signup-modal");
const signupNameInput     = document.getElementById("signup-name-input");
const signupEmailInput    = document.getElementById("signup-email-input");
const signupPasswordInput = document.getElementById("signup-password-input");
const signupSubmitBtn     = document.getElementById("signup-submit-btn");
const signupCancelBtn     = document.getElementById("signup-cancel-btn");


// 현재 로그인 유저 & 관리자 정보 ------------------------------------
let currentUser = null;
let adminEmails = [];   // Firestore에서 가져온 관리자 이메일 리스트
let isAdmin = false;


// 2. Firestore에서 config/admins 문서 실시간 구독 -------------------
db.collection("config").doc("admins").onSnapshot(
  (doc) => {
    if (doc.exists) {
      const data = doc.data();
      adminEmails = Array.isArray(data.emails) ? data.emails : [];
      console.log("관리자 이메일 리스트:", adminEmails);
    } else {
      adminEmails = [];
    }

    // 이미 로그인 되어 있으면 admin 여부 다시 계산
    if (currentUser && currentUser.email) {
      isAdmin = adminEmails.includes(currentUser.email);
      updateUserInfoUI();
    }
  },
  (err) => {
    console.error("admins 문서 구독 에러:", err);
  }
);


// 3. 상단 userInfo / 버튼 상태 업데이트 함수 -------------------------
function updateUserInfoUI() {
  if (!userInfo) return;

  if (currentUser) {
    const name = currentUser.displayName || "이름 없음";
    const email = currentUser.email || "";

    if (isAdmin) {
      userInfo.textContent = `[관리자] ${name} (${email})`;
    } else {
      userInfo.textContent = `${name} (${email})`;
    }

    if (loginBtn)  loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    userInfo.textContent = "로그인되지 않음";
    if (loginBtn)  loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }

  // 관리자일 때만 "관리자 이름으로 남기기" 체크박스를 보이게
  if (adminCheckWrapper) {
    if (isAdmin) {
      adminCheckWrapper.style.display = "flex";
    } else {
      adminCheckWrapper.style.display = "none";
      if (adminCheck) adminCheck.checked = false;
    }
  }
}


// 4. Google 로그인 / 로그아웃 버튼 ----------------------------------

// 헤더에 있는 기본 loginBtn (index, write 등)
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    auth
      .signInWithPopup(provider)
      .then((result) => {
        console.log("Google 로그인 성공", result.user);
      })
      .catch((err) => {
        console.error("Google 로그인 에러:", err);
        alert("로그인 중 오류가 발생했습니다.");
      });
  });
}

// login.html 의 큰 Google 로그인 버튼
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", () => {
    auth
      .signInWithPopup(provider)
      .then((result) => {
        console.log("Google 로그인 성공 (login.html)", result.user);
        // 로그인 성공하면 메인으로 이동
        window.location.href = "index.html";
      })
      .catch((err) => {
        console.error("Google 로그인 에러:", err);
        alert("로그인 중 오류가 발생했습니다.");
      });
  });
}

// 로그아웃
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth.signOut();
  });
}


// 5. 로그인 상태 변화 감지 -------------------------------------------
auth.onAuthStateChanged((user) => {
  currentUser = user;

  if (user && user.email) {
    isAdmin = adminEmails.includes(user.email);
  } else {
    isAdmin = false;
  }

  updateUserInfoUI();
});


// 5-1. 익명 / 관리자 체크가 동시에 켜지지 않게 -----------------------
if (anonymousCheck && adminCheck) {
  anonymousCheck.addEventListener("change", () => {
    if (anonymousCheck.checked && adminCheck.checked) {
      adminCheck.checked = false;
    }
  });

  adminCheck.addEventListener("change", () => {
    if (adminCheck.checked && anonymousCheck.checked) {
      anonymousCheck.checked = false;
    }
  });
}


// 6. 글 작성 (로그인한 사람만, 3모드 지원) ---------------------------
if (postBtn) {
  postBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("글을 쓰려면 먼저 로그인해 주세요.");
      return;
    }

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
      alert("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    const useAnonymous = anonymousCheck && anonymousCheck.checked;
    const useAdminName = adminCheck && adminCheck.checked && isAdmin;

    let authorName;
    let authorEmail;

    if (useAnonymous) {
      // 1) 익명 모드
      authorName  = "익명";
      authorEmail = "";
    } else if (useAdminName) {
      // 2) 관리자 이름 모드
      authorName  = "관리자";   // 화면에서 rainbow-admin으로 꾸밈
      authorEmail = "";
    } else {
      // 3) 일반 모드 (로그인한 내 이름)
      authorName  = user.displayName || "익명";
      authorEmail = user.email || "";
    }

    try {
      await db.collection("posts").add({
        title,
        content,
        uid: user.uid,
        authorName,
        authorEmail,
        isAnonymous: useAnonymous,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      titleInput.value = "";
      contentInput.value = "";

      // 글 작성 후 목록으로 이동
      window.location.href = "index.html";
    } catch (e) {
      console.error(e);
      alert("글 작성 중 오류가 발생했습니다.");
    }
  });
}


// 7. 글 목록 불러오기 + 점점점 메뉴(삭제/신고) -----------------------
if (postList) {
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot((snapshot) => {
      postList.innerHTML = "";

      snapshot.forEach((doc) => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "post";

        const created = data.createdAt
          ? data.createdAt.toDate().toLocaleString()
          : "방금";

        // 작성자 표시 (관리자면 무지개)
        let authorDisplay = data.authorName || "익명";
        if (data.authorName === "관리자") {
          authorDisplay = `<span class="rainbow-admin">관리자</span>`;
        }

        // 삭제 가능 조건: 관리자 or 글 작성자 본인
        const canDelete =
          isAdmin || (currentUser && currentUser.uid === data.uid);

        div.innerHTML = `
          <div class="post-title">
            <span>${data.title}</span>
            <button class="more-btn" data-id="${doc.id}">⋯</button>
          </div>
          <div class="post-meta">작성자: ${authorDisplay} · ${created}</div>
          <div class="post-content">${data.content}</div>

          <div class="post-menu" data-id="${doc.id}">
            ${canDelete ? `<button class="menu-delete" data-id="${doc.id}">삭제</button>` : ""}
            <button class="menu-report" data-id="${doc.id}">신고</button>
          </div>
        `;

        postList.appendChild(div);
      });

      // 점점점 버튼: 메뉴 열고 닫기
      const moreButtons = postList.querySelectorAll(".more-btn");
      moreButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const id = e.currentTarget.getAttribute("data-id");
          const menu = postList.querySelector(`.post-menu[data-id="${id}"]`);
          if (!menu) return;

          const allMenus = postList.querySelectorAll(".post-menu");
          allMenus.forEach((m) => {
            if (m !== menu) m.classList.remove("open");
          });
          menu.classList.toggle("open");
        });
      });

      // 삭제 버튼 (관리자 + 글쓴이만)
      const deleteButtons = postList.querySelectorAll(".menu-delete");
      deleteButtons.forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.getAttribute("data-id");
          if (!id) return;

          if (!confirm("이 게시물을 정말 삭제할까요?")) return;

          try {
            await db.collection("posts").doc(id).delete();
          } catch (err) {
            console.error("삭제 에러:", err);
            alert("삭제 중 오류가 발생했습니다.");
          }
        });
      });

      // 신고 버튼 (임시: 알림만)
      const reportButtons = postList.querySelectorAll(".menu-report");
      reportButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const id = e.currentTarget.getAttribute("data-id");
          alert("신고가 접수되었습니다. (임시 기능)\n문서 ID: " + id);

          const menu = postList.querySelector(`.post-menu[data-id="${id}"]`);
          if (menu) menu.classList.remove("open");
        });
      });

      // 리스트 영역 밖 클릭 시 모든 메뉴 닫기
      document.addEventListener("click", (e) => {
        if (!postList.contains(e.target)) {
          const allMenus = postList.querySelectorAll(".post-menu");
          allMenus.forEach((m) => m.classList.remove("open"));
        }
      });
    });
}


// 8. 이메일 로그인 / 가입 (login.html 전용) --------------------------

// 이메일로 가입하기 (비밀번호/이메일 칸에 입력한 값으로)
if (emailSignupLink && emailInput && passwordInput) {
  emailSignupLink.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const pw    = passwordInput.value.trim();

    if (!email || !pw) {
      alert("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await auth.createUserWithEmailAndPassword(email, pw);
      alert("가입이 완료되었습니다. 자동으로 로그인됩니다.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("이메일 가입 에러:", err);
      alert(err.message || "가입 중 오류가 발생했습니다.");
    }
  });
}

// 이메일로 로그인
if (emailLoginBtn && emailInput && passwordInput) {
  emailLoginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const pw    = passwordInput.value.trim();

    if (!email || !pw) {
      alert("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await auth.signInWithEmailAndPassword(email, pw);
      alert("로그인 성공!");
      window.location.href = "index.html";
    } catch (err) {
      console.error("이메일 로그인 에러:", err);
      alert(err.message || "로그인 중 오류가 발생했습니다.");
    }
  });
}
