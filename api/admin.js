const { getSubmissions } = require("./storage");

function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    send(response, 405, { error: "Метод не поддерживается." });
    return;
  }

  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
  const password = request.headers["x-admin-password"];

  if (password !== expectedPassword) {
    send(response, 401, { error: "Неверный пароль администратора." });
    return;
  }

  try {
    const submissions = await getSubmissions();
    send(response, 200, { submissions });
  } catch (error) {
    send(response, 500, { error: "Не удалось загрузить результаты." });
  }
};
