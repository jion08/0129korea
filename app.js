
// app.js

// 1. Firebase 초기화
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// HTML 요소들
const loginBtn = document.getElementById("login-btn");
const userInfoSpan = document.getElementById("user-info");
const titleInput = document.getElementById("title-input");
const contentInput = document.getElementById("content-input");
const postBtn = document.getElementById("post-btn");
const postList = document.getElementById("post-list");

// 2. 익명 로그인 버튼
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

// 3. 로그인 상태 변화 감지
auth.onAuthStateChanged((user) => {
  if (user) {
    const uidShort = user.uid.slice(0, 6);
    userInfoSpan.textContent = `로그인됨: 익명#${uidShort}`;
    loginBtn.style.display = "none";
  } else {
    userInfoSpan.textContent = "로그인 필요";
    loginBtn.style.display = "inline-block";
  }
});

// 4. 글 작성
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("먼저 익명 로그인을 해주세요!");
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

    titleInput.value = "";
    contentInput.value = "";
  } catch (e) {
    console.error(e);
    alert("글 작성 중 오류가 발생했습니다.");
  }
});

// 5. 글 목록 실시간 구독
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
