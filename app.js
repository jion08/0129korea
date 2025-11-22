// app.js

// 1. Firebase 초기화 -------------------------------------------------
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// HTML 요소들 --------------------------------------------------------
const loginBtn       = document.getElementById("login-btn");
const logoutBtn      = document.getElementById("logout-btn");
const userInfo       = document.getElementById("user-info");
const titleInput     = document.getElementById("title-input");
const contentInput   = document.getElementById("content-input");
const postBtn        = document.getElementById("post-btn");
const postList       = document.getElementById("post-list");
const anonymousCheck = document.getElementById("anonymous-check");

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
}


// 4. 구글 로그인 / 로그아웃 버튼 ------------------------------------
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


// 6. 글 작성 (로그인한 사람만, 익명 옵션 지원) -----------------------
if (postBtn) {
  postBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("글을 쓰려면 먼저 Google 로그인을 해 주세요.");
      return;
    }

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
      alert("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    const useAnonymous = anonymousCheck && anonymousCheck.checked;

    const authorName = useAnonymous
      ? "익명"
      : (user.displayName || "익명");

    const authorEmail = useAnonymous
      ? ""
      : (user.email || "");

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



// 7. 글 목록 불러오기 + 점점점 메뉴(삭제/신고)---------------------------------------------------
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

        const author = data.authorName || "익명";

        // 삭제 가능 조건: 관리자이거나, 글 작성자 본인
        const canDelete =
          isAdmin || (currentUser && currentUser.uid === data.uid);

        // 여기서 점점점 버튼 + 메뉴 HTML 구성
        div.innerHTML = `
          <div class="post-title">
            <span>${data.title}</span>
            <button class="more-btn" data-id="${doc.id}">⋯</button>
          </div>
          <div class="post-meta">작성자: ${author} · ${created}</div>
          <div class="post-content">${data.content}</div>

          <div class="post-menu" data-id="${doc.id}">
            ${canDelete ? `<button class="menu-delete" data-id="${doc.id}">삭제</button>` : ""}
            <button class="menu-report" data-id="${doc.id}">신고</button>
          </div>
        `;

        postList.appendChild(div);
      });

      // ---------- 이벤트 연결 구역 ----------

      // 점점점 버튼: 메뉴 열고 닫기
      const moreButtons = postList.querySelectorAll(".more-btn");
      moreButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const id = e.currentTarget.getAttribute("data-id");
          const menu = postList.querySelector(`.post-menu[data-id="${id}"]`);
          if (!menu) return;

          // 다른 메뉴들은 닫고, 이 메뉴만 토글
          const allMenus = postList.querySelectorAll(".post-menu");
          allMenus.forEach((m) => {
            if (m !== menu) m.classList.remove("open");
          });
          menu.classList.toggle("open");
        });
      });

      // 삭제 버튼 (관리자 + 글쓴이만 메뉴에 있음)
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

      // 신고 버튼 (모두에게 보이게, 지금은 알림만)
      const reportButtons = postList.querySelectorAll(".menu-report");
      reportButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const id = e.currentTarget.getAttribute("data-id");
          // 나중에 Firestore에 신고 기록 남기고 싶으면 여기서 처리하면 됨
          alert("신고가 접수되었습니다. (테스트용 알림)\n문서 ID: " + id);

          // 메뉴 닫기
          const menu = postList.querySelector(`.post-menu[data-id="${id}"]`);
          if (menu) menu.classList.remove("open");
        });
      });

      // 바깥 아무 데나 클릭하면 모든 메뉴 닫기
      document.addEventListener("click", (e) => {
        if (!postList.contains(e.target)) {
          const allMenus = postList.querySelectorAll(".post-menu");
          allMenus.forEach((m) => m.classList.remove("open"));
        }
      });
    });
}
