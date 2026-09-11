const fetch = require('node-fetch'); // wait, node 18+ has native fetch

async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/admin/videos/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // We don't have a real token, but let's see where it fails. If it fails BEFORE token check, we find it.
        // If it fails ON token check, we get 401, not 500.
        "Authorization": "Bearer fake_token"
      },
      body: JSON.stringify({
        courseId: "11111111-1111-1111-1111-111111111111",
        moduleId: "22222222-2222-2222-2222-222222222222",
        lessonId: "",
        fileName: "test.mp4"
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (e) {
    console.error(e);
  }
}
test();
