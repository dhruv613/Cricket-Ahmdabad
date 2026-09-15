const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const port = Number(process.env.PORT || 4173);
http.createServer((req,res)=>{
  let pathname;
  try {pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400).end();return;}
  const filename = path.resolve(root, '.' + (pathname==='/' ? '/index.html' : pathname));
  if (!filename.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
  fs.stat(filename,(error,stat)=>{
    if(error || !stat.isFile()){res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache'});
    if(req.method==='HEAD'){res.end();return;}
    const stream=fs.createReadStream(filename);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Academy preview: http://127.0.0.1:${port}`));
