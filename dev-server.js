const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const submitHandler = require("./api/submit");
const adminHandler = require("./api/admin");

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const server = http.createServer(async (request, response) => {
  if (request.url.startsWith("/api/submit")) {
    await submitHandler(request, response);
    return;
  }

  if (request.url.startsWith("/api/admin")) {
    await adminHandler(request, response);
    return;
  }

  const filePath = path.join(root, request.url === "/" ? "index.html" : request.url);
  try {
    const content = await fs.readFile(filePath);
    response.setHeader("Content-Type", filePath.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain; charset=utf-8");
    response.end(content);
  } catch (error) {
    response.statusCode = 404;
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Quiz is running at http://${host}:${port}`);
});
