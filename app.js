const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString("pt-BR");
async function loadWinners(){try{const r=await fetch("/api/winners");const data=await r.json();$("winners").innerHTML=data.length?data.map(x=>`<div class="rank"><span>🏆 ${esc(x.winner_name)}</span><span>${fmt(x.comment_count)} comentários</span></div>`).join(""):"Nenhum ganhador registrado ainda."}catch{}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("load").onclick=async()=>{const url=$("videoUrl").value.trim();if(!url){$("status").textContent="Cole o link do vídeo primeiro.";return}
$("load").disabled=true;$("status").textContent="Consultando o YouTube…";$("ranking").innerHTML="";
try{const r=await fetch("/api/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Não foi possível carregar o vídeo.");
$("status").textContent=d.truncated?`Foram analisados ${fmt(d.fetchedComments)} comentários principais. O limite desta versão foi atingido; o ranking pode estar incompleto.`:`Dados atualizados. ${fmt(d.fetchedComments)} comentários principais analisados.`;
$("video").classList.remove("hidden");$("thumb").src=d.thumbnail;$("title").textContent=d.title;$("channel").textContent=d.channel;
$("views").textContent=fmt(d.views);$("likes").textContent=fmt(d.likes);$("comments").textContent=fmt(d.commentTotal);
$("ranking").innerHTML=d.ranking.length?d.ranking.slice(0,50).map((x,i)=>`<div class="rank"><span><strong>${i===0?"🥇":i===1?"🥈":i===2?"🥉":("#"+(i+1))}</strong> &nbsp;${esc(x.name)}</span><strong>${fmt(x.count)} comentários</strong></div>`).join(""):"Nenhum comentário público encontrado.";
}catch(e){$("status").textContent=e.message}
finally{$("load").disabled=false}};
fetch("/api/config").then(r=>r.json()).then(c=>{if(!c.configured)$("status").textContent="O site precisa ser configurado pelo administrador com uma chave da YouTube Data API." ;if(c.videoUrl)$("videoUrl").value=c.videoUrl}).catch(()=>{});
loadWinners();