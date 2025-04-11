// Static files server


import { serveFile } from "https://deno.land/std@0.181.0/http/file_server.ts";


const INDEX_PAGE = "index.html";
const CSS_FILE_PATH = "static/style.css"
const JS_FILE_PATH = "static/script.js"

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);

  if (url.pathname.includes("style.css")) {
    return await serveFile(request, CSS_FILE_PATH)
  }

  if (url.pathname.includes("script.js")) {
    return await serveFile(request, JS_FILE_PATH)
  }

  return await serveFile(request, INDEX_PAGE);
});
