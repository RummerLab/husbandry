/** Local-only native-worker qualification. Never loads .env or contacts a workbook. */
import { cp, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const shell = build => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PWA qualification ${build}</title>
<style>body{font:18px system-ui;max-width:900px;margin:2rem auto;padding:1rem}button,input,a{min-height:48px;margin:.5rem;padding:.5rem}pre{white-space:pre-wrap}</style>
<h1>Native worker qualification: build ${build}</h1><p>Synthetic shell for the real compiled worker. No husbandry data or live API.</p>
<label>Unsaved test draft <input id="draft"></label><p><a href="/help">Open offline guide</a></p>
<button id="update">Offer build B</button><button id="broken">Offer broken build B</button><button id="probe">Probe excluded routes</button>
<pre id="status" role="status">Registering compiled worker…</pre><pre id="probes"></pre>
<script>
let registration;
async function status(){
 if(!registration)return;
 const names=await caches.keys(); const entries={};
 for(const name of names) entries[name]=(await (await caches.open(name)).keys()).map(r=>new URL(r.url).pathname);
 document.querySelector('#status').textContent=JSON.stringify({pageBuild:'${build}',controlled:!!navigator.serviceWorker.controller,active:registration.active?.state??null,waiting:registration.waiting?.state??null,installing:registration.installing?.state??null,caches:entries},null,2);
}
async function offer(mode){await fetch('/api/__pwa__/offer/'+mode,{method:'POST'});await registration.update();await status();}
document.querySelector('#update').onclick=()=>offer('B').catch(e=>document.querySelector('#probes').textContent=e.message);
document.querySelector('#broken').onclick=()=>offer('broken').catch(e=>document.querySelector('#probes').textContent=e.message);
document.querySelector('#probe').onclick=async()=>{
 const results=[];
 for(const path of ['/api/submit','/api/access','/login','/insights','/auth/google','/_vercel/insights/script.js','/_vercel/speed-insights/script.js','/sw.js']){
  const response=await fetch(path,{cache:'no-store'}); results.push(path+': '+response.status);
 }
 document.querySelector('#probes').textContent=results.join('\\n');await status();
};
navigator.serviceWorker.register('/service-worker.js',{updateViaCache:'none'}).then(r=>{registration=r;status();setInterval(status,500)}).catch(e=>document.querySelector('#status').textContent=e.message);
</script></html>`;

export async function capturePwaBuild(directory, label) {
	if (!['A', 'B'].includes(label)) throw new Error('Build label must be A or B');
	const destination = resolve(directory, label);
	try { await stat(destination); throw new Error('Snapshot already exists; choose a new qualification directory'); }
	catch (error) { if (error.code !== 'ENOENT') throw error; }
	await cp(resolve('.svelte-kit/output/client'), destination, { recursive: true, force: false, errorOnExist: true });
	return destination;
}

export async function servePwaBuilds(directory, port = 5186) {
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Use a valid loopback port');
	const root = resolve(directory);
	for (const label of ['A', 'B']) await stat(resolve(root, label, 'service-worker.js'));
	if (await readFile(resolve(root, 'A/service-worker.js'), 'utf8') === await readFile(resolve(root, 'B/service-worker.js'), 'utf8')) throw new Error('Build snapshots must contain different compiled workers. Run npm run build before each capture.');
	let offered = 'A';
	const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
	const server = createServer(async (request, response) => {
		try {
			const url = new URL(request.url, `http://127.0.0.1:${port}`);
			response.setHeader('Cache-Control', 'no-store');
			if (request.method === 'POST' && url.pathname.startsWith('/api/__pwa__/offer/')) {
				const mode = url.pathname.split('/').at(-1);
				if (!['A', 'B', 'broken'].includes(mode)) { response.writeHead(400).end(); return; }
				offered = mode; response.end(mode); return;
			}
			const build = offered === 'A' ? 'A' : 'B';
			if (url.pathname === '/' || url.pathname === '/help') {
				response.setHeader('Content-Type', 'text/html; charset=utf-8');
				response.end(url.pathname === '/' ? shell(build) : `<!doctype html><title>Offline test guide ${build}</title><h1>Offline guide build ${build}</h1><p>Synthetic guide cached by the production worker.</p>`); return;
			}
			if (url.pathname.startsWith('/api/') || url.pathname === '/login' || url.pathname === '/insights' || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/_vercel/')) {
				response.setHeader('Content-Type', 'application/json'); response.end('{"mode":"mock","authorized":false}'); return;
			}
			if (offered === 'broken' && url.pathname.startsWith('/_app/immutable/')) { response.writeHead(503).end('Deliberate failed precache'); return; }
			const base = resolve(root, build); const file = resolve(base, '.' + decodeURIComponent(url.pathname));
			const inside = relative(base, file);
			if (inside.startsWith('..') || isAbsolute(inside)) { response.writeHead(403).end(); return; }
			response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
			response.end(await readFile(file));
		} catch { response.writeHead(404).end('Fixture file unavailable'); }
	});
	await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
	return server;
}

async function main() {
	const [command, directory, label] = process.argv.slice(2);
	if (!directory) throw new Error('Usage: node scripts/pwa-qualification.mjs capture <scratch-directory> A|B OR serve <scratch-directory> [port]');
	if (command === 'capture') console.log(await capturePwaBuild(directory, label));
	else if (command === 'serve') { const port = label ? Number(label) : 5186; await servePwaBuilds(directory, port); console.log(`Native PWA qualification: http://127.0.0.1:${port}/`); }
	else throw new Error('Unknown command');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
