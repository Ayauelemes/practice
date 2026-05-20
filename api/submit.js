const crypto = require("crypto");
const { questions } = require("./quiz-data");
const { saveSubmission } = require("./storage");

const questionMap = new Map(questions.map((question) => [question.id, question]));

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    send(response, 405, { error: "Метод не поддерживается." });
    return;
  }

  try {
    const body = await readBody(request);
    const name = String(body.name || "").trim();
    const grade = String(body.grade || "").trim();
    const group = String(body.group || "").trim();
    const answers = Array.isArray(body.answers) ? body.answers : [];

    if (!name || !grade) {
      send(response, 400, { error: "Укажите имя и класс." });
      return;
    }

    if (answers.length !== questions.length) {
      send(response, 400, { error: "Нужно ответить на все вопросы." });
      return;
    }

    const review = [];
    let score = 0;

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      const selectedIndex = Number(answer.selectedIndex);

      if (!question || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= question.options.length) {
        send(response, 400, { error: "В ответах есть некорректные данные." });
        return;
      }

      const isCorrect = selectedIndex === question.correctIndex;
      if (isCorrect) score += 1;

      review.push({
        questionId: question.id,
        question: question.text,
        selectedIndex,
        selectedText: question.options[selectedIndex],
        correctIndex: question.correctIndex,
        correctText: question.options[question.correctIndex],
        isCorrect
      });
    }

    await saveSubmission({
      id: crypto.randomUUID(),
      name,
      grade,
      group,
      score,
      total: questions.length,
      review,
      createdAt: new Date().toISOString()
    });

    send(response, 200, { ok: true });
  } catch (error) {
    const message = error.message === "Persistent storage is not configured"
      ? "На Vercel не подключена база для сохранения ответов. Админ должен подключить KV/Redis."
      : "Не удалось сохранить ответы.";
    send(response, 500, { error: message });
  }
};
