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
// ▼ 여기부터 새로 추가 — 공지 박스 요소
const noticeBox   = document.getElementById("notice-box");
const noticeTitle = document.getElementById("notice-title");


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

// ---------------------------------------------------
// Firestore에서 config/notice 문서 실시간 구독 (공지 표시용)
// ---------------------------------------------------
db.collection("config").doc("notice").onSnapshot(
  (doc) => {
    if (!noticeBox || !noticeTitle) return;

    if (doc.exists) {
      const data = doc.data();
      noticeTitle.textContent = data.title || "";
      if (noticeTitle.textContent.trim() === "") {
        noticeBox.style.display = "none";
      } else {
        noticeBox.style.display = "flex";
      }
    } else {
      noticeBox.style.display = "none";
    }
  },
  (err) => {
    console.error("notice 문서 구독 에러:", err);
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

// 헤더에 있는 기본 loginBtn (index, write 등) 안씀으로 주석처리
/* if (loginBtn) {
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
*/
// 헤더 loginBtn → 이제 login.html 로 이동만!
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    window.location.href = "login.html";
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
// 7. 글 목록 불러오기 + 점점점 메뉴(공지/삭제/신고) -------------------
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
            ${
              isAdmin
                ? `<button class="menu-notice" data-id="${doc.id}" data-title="${data.title}">공지 등록</button>`
                : ""
            }
            ${
              canDelete
                ? `<button class="menu-delete" data-id="${doc.id}">삭제</button>`
                : ""
            }
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

      // 공지 등록 버튼 (관리자만 보임)
      const noticeButtons = postList.querySelectorAll(".menu-notice");
      noticeButtons.forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.getAttribute("data-id");
          const title = e.currentTarget.getAttribute("data-title") || "";

          if (!id) return;

          if (!confirm(`이 게시물을 공지로 등록할까요?\n\n제목: ${title}`)) return;

          try {
            await db.collection("config").doc("notice").set({
              postId: id,
              title: title,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            alert("공지로 등록되었습니다.");
          } catch (err) {
            console.error("공지 등록 에러:", err);
            alert("공지 등록 중 오류가 발생했습니다.");
          }

          const menu = postList.querySelector(`.post-menu[data-id="${id}"]`);
          if (menu) menu.classList.remove("open");
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

// 이메일로 가입하기 (모달 안의 이름/이메일/비번)
if (
  signupSubmitBtn &&
  signupNameInput &&
  signupEmailInput &&
  signupPasswordInput &&
  signupModal
) {
  signupSubmitBtn.addEventListener("click", async () => {
    const name = signupNameInput.value.trim();
    const email = signupEmailInput.value.trim();
    const pw = signupPasswordInput.value.trim();

    if (!name || !email || !pw) {
      alert("이름, 이메일, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pw);

      // 표시 이름 저장
      await cred.user.updateProfile({
        displayName: name,
      });

      // 이메일 인증 메일 보내기
      await cred.user.sendEmailVerification();

      alert(
        "가입이 완료되었습니다.\n이메일로 전송된 인증 메일을 확인한 뒤 다시 로그인해 주세요.\n(!!스팸함을 꼭 확인하세요!!)"
      );

      // 아직 이메일 인증 전이므로, 강제 로그아웃
      await auth.signOut();

      // 모달 닫기
      signupModal.style.display = "none";
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
    const pw = passwordInput.value.trim();

    if (!email || !pw) {
      alert("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      const cred = await auth.signInWithEmailAndPassword(email, pw);
      const user = cred.user;

      if (!user.emailVerified) {
        // 이메일 인증 안 됐으면 로그인 막기 + 인증 메일 다시 보내기
        await user.sendEmailVerification();
        alert(
          "이메일이 아직 인증되지 않았습니다.\n메일함에서 인증 메일을 확인해 주세요. (인증 메일을 다시 보냈습니다.)\n(!!스팸함을 꼭 확인하세요!!)"
        );
        await auth.signOut();
        return;
      }

      window.location.href = "index.html";
    } catch (err) {
      console.error("이메일 로그인 에러:", err);
      alert(err.message || "로그인 중 오류가 발생했습니다.");
    }
  });
}

// ===== 이메일 가입 모달 열기/닫기 =====
if (emailSignupLink && signupModal) {
  emailSignupLink.addEventListener("click", () => {
    // 입력값 초기화
    if (signupNameInput) signupNameInput.value = "";
    if (signupEmailInput) signupEmailInput.value = "";
    if (signupPasswordInput) signupPasswordInput.value = "";
    signupModal.style.display = "flex";
  });
}

if (signupCancelBtn && signupModal) {
  signupCancelBtn.addEventListener("click", () => {
    signupModal.style.display = "none";
  });
}

// =======================
// 방문자 수 카운트 시스템
// =======================
const visitorBox   = document.getElementById("visitor-box");
const todayVisitEl = document.getElementById("today-visit");
const totalVisitEl = document.getElementById("total-visit");

async function updateVisitorCount() {
  if (!visitorBox || !todayVisitEl || !totalVisitEl) return;

  try {
    const statsRef   = db.collection("visitors").doc("stats");
    const statsDoc   = await statsRef.get();
    const todayString = new Date().toISOString().slice(0, 10); // "2025-11-24"

    if (!statsDoc.exists) {
      await statsRef.set({
        total: 1,
        today: 1,
        todayDate: todayString
      });

      todayVisitEl.textContent = `오늘 방문: 1명`;
      totalVisitEl.textContent = `전체 방문: 1명`;
      return;
    }

    const data = statsDoc.data();
    let { total, today, todayDate } = data;

    // 날짜 바뀌면 오늘 방문자 0부터
    if (todayDate !== todayString) {
      today = 0;
      todayDate = todayString;
    }

    total += 1;
    today += 1;

    await statsRef.update({ total, today, todayDate });

    todayVisitEl.textContent = `오늘 방문: ${today}명`;
    totalVisitEl.textContent = `전체 방문: ${total}명`;
  } catch (err) {
    console.error("방문자 수 로드 에러:", err);
    visitorBox.textContent = "방문자 정보를 불러올 수 없음";
  }
}

if (visitorBox) {
  updateVisitorCount();
}

// =======================
// 게시물 카운트 시스템
// =======================
const todayPostsSpan = document.getElementById("today-posts");
const totalPostsSpan = document.getElementById("total-posts");

function loadPostCounters() {
  if (!todayPostsSpan || !totalPostsSpan) return;

  const postsRef = db.collection("posts");

  // 전체 게시물 수
  postsRef
    .get()
    .then((snapshot) => {
      totalPostsSpan.textContent = snapshot.size;
    })
    .catch((err) => {
      console.error("전체 게시물 수 불러오기 오류:", err);
    });

  // 오늘 게시물 수 (createdAt 기준)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  postsRef
    .where("createdAt", ">=", firebase.firestore.Timestamp.fromDate(start))
    .where("createdAt", "<", firebase.firestore.Timestamp.fromDate(end))
    .get()
    .then((snapshot) => {
      todayPostsSpan.textContent = snapshot.size;
    })
    .catch((err) => {
      console.error("오늘 게시물 수 불러오기 오류:", err);
    });
}

// index.html 에서만 동작하도록 요소가 있을 때만 실행
if (todayPostsSpan && totalPostsSpan) {
  loadPostCounters();
}

