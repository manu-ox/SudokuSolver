import { serveFile } from "https://deno.land/std@0.181.0/http/file_server.ts";


const ENTRY_POINT = "index.html";

Deno.serve((request: Request) => {
  return await serveFile(request, ENTRY_POINT);
});

