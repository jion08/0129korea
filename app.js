// app.js

// 1. Firebase 초기화
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// HTML 요소들 (페이지마다 있을 수도, 없을 수도 있음)
const loginBtn   = document.getElementById("login-btn");
const logoutBtn  = document.getElementById("logout-btn");
const userInfo   = document.getElementById("user-info");
const titleInput = document.getElementById("title-input");
const contentInput = document.getElementById("content-input");
const postBtn    = document.getElementById("post-btn");
const postList   = document.getElementById("post-list");


// 2. 구글 로그인 버튼
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

// 3. 로그아웃 버튼
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth.signOut();
  });
}

// 4. 로그인 상태 변화 감지
auth.onAuthStateChanged((user) => {
  if (user) {
    const name = user.displayName || "이름 없음";
    const email = user.email || "";
    if (userInfo) {
      userInfo.textContent = `${name} (${email})`;
    }
    if (loginBtn)  loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (userInfo)  userInfo.textContent = "로그인되지 않음";
    if (loginBtn)  loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
});


// 5. 글 작성 (로그인한 사람만 가능)
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

    try {
      await db.collection("posts").add({
        title,
        content,
        uid: user.uid,
        authorName: user.displayName || "익명",
        authorEmail: user.email || "",
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


// 6. 글 목록 (index.html 에서만 실행)
if (postList) {
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .limit(20)
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

        div.innerHTML = `
          <div class="post-title">${data.title}</div>
          <div class="post-meta">작성자: ${author} · ${created}</div>
          <div class="post-content">${data.content}</div>
        `;

        postList.appendChild(div);
      });
    });
}
