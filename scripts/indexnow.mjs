/**
 * Tells Bing (which feeds ChatGPT search and Copilot), Yandex, Naver and Seznam
 * that livegridav.com pages are new or changed, via IndexNow.
 * Run after a deploy is live: node scripts/indexnow.mjs
 * The key file public/<KEY>.txt proves the site owns this key.
 */
const HOST = "livegridav.com";
const KEY = "0033b5394fd2b9a05838137372c0a8f2";

const sitemap = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
urlList.push(`https://${HOST}/llms.txt`);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: ${urlList.length} URLs -> HTTP ${res.status} ${res.statusText}`);
if (!res.ok && res.status !== 202) process.exitCode = 1;
