// app.js

// 1. Firebase 초기화
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// HTML 요소들 (페이지마다 있을 수도, 없을 수도 있음)
const loginBtn = document.getElementById("login-btn");
const userInfoSpan = document.getElementById("user-info");
const titleInput = document.getElementById("title-input");
const contentInput = document.getElementById("content-input");
const postBtn = document.getElementById("post-btn");
const postList = document.getElementById("post-list");


// 2. (선택) 로그인 버튼이 있을 때만 이벤트 걸기
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    auth
      .signInAnonymously()
      .then(() => {
        console.log("익명 로그인 완료");
      })
      .catch((err) => {
        console.error("로그인 에러:", err);
        alert("로그인 중 오류가 발생했습니다.");
      });
  });
}


// 3. 로그인 상태 변화 감지 + 자동 익명 로그인
auth.onAuthStateChanged((user) => {
  if (user) {
    const uidShort = user.uid.slice(0, 6);
    if (userInfoSpan) {
      userInfoSpan.textContent = `로그인됨: 익명#${uidShort}`;
    }
    if (loginBtn) {
      loginBtn.style.display = "none";
    }
  } else {
    // 아직 로그인 안 돼 있으면 자동으로 익명 로그인 시도
    if (userInfoSpan) {
      userInfoSpan.textContent = "로그인 중...";
    }
    auth
      .signInAnonymously()
      .catch((err) => {
        console.error("자동 익명 로그인 에러:", err);
      });
  }
});


// 4. 글 작성 버튼(등록)이 있을 때만 이벤트 추가
if (postBtn) {
  postBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("로그인 상태를 확인 중입니다. 잠시 후 다시 시도해 주세요.");
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 작성 후 입력창 비우기
      titleInput.value = "";
      contentInput.value = "";

      // 글 쓴 뒤 목록 페이지로 이동
      window.location.href = "index.html";
    } catch (e) {
      console.error(e);
      alert("글 작성 중 오류 발생");
    }
  });
}


// 5. 글 목록은 post-list가 있는 페이지(index.html)에서만 구독
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
        const uidShort = data.uid ? data.uid.slice(0, 6) : "익명";

        div.innerHTML = `
          <div class="post-title">${data.title}</div>
          <div class="post-meta">작성자: 익명#${uidShort} · ${created}</div>
          <div class="post-content">${data.content}</div>
        `;

        postList.appendChild(div);
      });
    });
}
