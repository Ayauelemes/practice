const fs = require("fs/promises");
const path = require("path");

const LIST_KEY = "phishing_quiz_submissions";
const LOCAL_FILE = path.join("/tmp", "phishing-quiz-submissions.json");

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(command) {
  const response = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    throw new Error("KV storage request failed");
  }

  const payload = await response.json();
  return payload.result;
}

async function readLocal() {
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocal(items) {
  await fs.writeFile(LOCAL_FILE, JSON.stringify(items, null, 2));
}

async function saveSubmission(submission) {
  if (hasKv()) {
    await kvCommand(["LPUSH", LIST_KEY, JSON.stringify(submission)]);
    return;
  }

  const items = await readLocal();
  items.unshift(submission);
  await writeLocal(items);
}

async function getSubmissions() {
  if (hasKv()) {
    const rows = await kvCommand(["LRANGE", LIST_KEY, 0, 499]);
    return rows.map((row) => JSON.parse(row));
  }

  return readLocal();
}

module.exports = { saveSubmission, getSubmissions };
