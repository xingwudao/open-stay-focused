import http from 'node:http';
http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><title>Focus fixture</title></head><body><h1>Fixture site</h1><a href="/next">Next</a><button onclick="history.pushState({},'', '/blocked');">SPA route</button><p>Independent test content.</p></body></html>`);}).listen(4173,'127.0.0.1');
