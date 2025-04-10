import { serveFile } from "https://deno.land/std@0.181.0/http/file_server.ts";


Deno.serve((request: Request) => {
  return await serveFile(request, 'index.html');
});

