// Deno configuration for serving static files
// No need to care about this file in local or other environment


import { serveFile } from "https://deno.land/std@0.181.0/http/file_server.ts";


// Static files directory eg: '/static', '/public'. Everything in this directory will be publicly accessible
const PUBLIC_DIRECTORY = "/static"
// Index page for the website eg: 'index.html', 'index.htm'.
const ENTRY_POINT = "index.html"


async function handleRequest(request: Request) {
  const url = new URL(request.url);

  if (url.pathname === '/')
    return await serveFile(request, ENTRY_POINT);

  if (url.pathname.startsWith(PUBLIC_DIRECTORY)) {
    const filePath = url.pathname.slice(1);
    return await serveFile(request, filePath)
  }

  return new Response("Bad Request", { status: 400 })
}


Deno.serve(handleRequest);