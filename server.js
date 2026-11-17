require("dotenv").config();
const express = require("express");
const cron = require("node-cron");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database("sorteiosff.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), video_id TEXT, video_url TEXT);
  INSERT OR IGNORE INTO settings(id, video_id, video_url) VALUES(1, '', '');
  CREATE TABLE IF NOT EXISTS winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    video_title TEXT,
    winner_name TEXT NOT NULL,
    comment_count INTEGER NOT NULL,
    drawn_at TEXT NOT NULL
  );
`);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function getVideoId(input) {
  try {
    const u = new URL(input);
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/").filter(Boolean)[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      if (["shorts", "live", "embed"].includes(parts[0])) return parts[1] || null;
    }
  } catch {}
  return null;
}

async function yt(endpoint, params) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("O administrador ainda não configurou a chave da YouTube Data API.");
  const url = new URL("https://www.googleapis.com/youtube/v3/" + endpoint);
  Object.entries({...params, key}).forEach(([k,v]) => url.searchParams.set(k, v));
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Erro ao consultar o YouTube.");
  return data;
}

async function loadVideo(videoId) {
  const data = await yt("videos", {part:"snippet,statistics", id:videoId});
  if (!data.items?.length) throw new Error("Vídeo não encontrado ou indisponível.");
  const item = data.items[0];
  const stats = item.statistics || {};
  let comments = [], token = undefined, pages = 0;
  while (pages < 20) {
    const page = await yt("commentThreads", {
      part:"snippet", videoId, maxResults:"100", order:"time",
      ...(token ? {pageToken:token} : {})
    });
    comments.push(...(page.items || []));
    token = page.nextPageToken;
    pages++;
    if (!token) break;
  }
  const counts = new Map();
  for (const thread of comments) {
    const c = thread.snippet?.topLevelComment?.snippet;
    if (!c) continue;
    const name = c.authorDisplayName || "Participante";
    const channelId = c.authorChannelId?.value || name;
    const prev = counts.get(channelId) || {name, count:0};
    prev.count++;
    counts.set(channelId, prev);
  }
  const ranking = [...counts.values()].sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name));
  return {
    id: item.id, title: item.snippet.title, channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
    views: Number(stats.viewCount || 0), likes: Number(stats.likeCount || 0),
    commentTotal: Number(stats.commentCount || 0), fetchedComments: comments.length,
    ranking, commentsDisabled: false, truncated: !!token
  };
}

app.get("/api/config", (req,res) => {
  const s = db.prepare("SELECT video_url FROM settings WHERE id=1").get();
  res.json({videoUrl:s.video_url, configured:!!process.env.YOUTUBE_API_KEY});
});
app.post("/api/video", async (req,res) => {
  try {
    const videoUrl = String(req.body.url || "").trim();
    const videoId = getVideoId(videoUrl);
    if (!videoId) return res.status(400).json({error:"Cole um link válido de vídeo, Shorts ou transmissão do YouTube."});
    db.prepare("UPDATE settings SET video_id=?, video_url=? WHERE id=1").run(videoId, videoUrl);
    res.json(await loadVideo(videoId));
  } catch(e) {
    const msg = e.message.includes("disabled comments") || e.message.includes("commentsDisabled")
      ? "Os comentários deste vídeo estão desativados." : e.message;
    res.status(400).json({error:msg});
  }
});
app.get("/api/winners", (req,res) => {
  res.json(db.prepare("SELECT video_title, winner_name, comment_count, drawn_at FROM winners ORDER BY id DESC LIMIT 20").all());
});

async function drawWinner() {
  const s = db.prepare("SELECT video_id FROM settings WHERE id=1").get();
  if (!s?.video_id) return;
  try {
    const video = await loadVideo(s.video_id);
    if (!video.ranking.length) return;
    const top = video.ranking[0].count;
    const tied = video.ranking.filter(x=>x.count===top);
    const winner = tied[Math.floor(Math.random()*tied.length)];
    db.prepare("INSERT INTO winners(video_id,video_title,winner_name,comment_count,drawn_at) VALUES(?,?,?,?,?)")
      .run(video.id, video.title, winner.name, winner.count, new Date().toISOString());
    console.log("Sorteio concluído:", winner.name);
  } catch(e) { console.error("Não foi possível realizar o sorteio:", e.message); }
}

// Todo domingo às 16h, horário de São Paulo. O servidor precisa estar ligado.
cron.schedule("0 16 * * 0", drawWinner, { timezone:"America/Sao_Paulo" });

app.post("/api/draw-now", async (req,res) => {
  if (!process.env.ADMIN_PIN || req.body.pin !== process.env.ADMIN_PIN)
    return res.status(403).json({error:"PIN de administrador incorreto."});
  const s = db.prepare("SELECT video_id FROM settings WHERE id=1").get();
  if (!s?.video_id) return res.status(400).json({error:"Cadastre um vídeo primeiro."});
  try {
    const video = await loadVideo(s.video_id);
    if (!video.ranking.length) return res.status(400).json({error:"Não há comentários públicos para sortear."});
    const top = video.ranking[0].count;
    const tied = video.ranking.filter(x=>x.count===top);
    const winner = tied[Math.floor(Math.random()*tied.length)];
    db.prepare("INSERT INTO winners(video_id,video_title,winner_name,comment_count,drawn_at) VALUES(?,?,?,?,?)")
      .run(video.id, video.title, winner.name, winner.count, new Date().toISOString());
    res.json({winner:winner.name, count:winner.count});
  } catch(e) { res.status(400).json({error:e.message}); }
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log(`sorteiosff rodando na porta ${port}`));
