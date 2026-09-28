'use strict';
const labels = {pre_registration:'预约中',pre_order:'预约中',released:'已上线',unknown:'待核实'};
const platformNames = {googleplay:'Google Play',appstore:'App Store',cross:'已确认跨平台'};
const group = s => ['pre_registration','pre_order'].includes(s) ? 'prereg' : s === 'released' ? 'released' : 'unknown';
const el = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
function safeImage(value) {
  try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password && !u.port && !u.search && !u.hash && !value.includes('?') && !value.includes('#') && /^(play-lh\.googleusercontent\.com|lh3\.googleusercontent\.com|is\d+-ssl\.mzstatic\.com)$/.test(u.hostname) && /^\/[A-Za-z0-9_./=+~-]+$/.test(u.pathname) && !/token|secret|credential|private_key/i.test(u.pathname) ? value : ''; } catch { return ''; }
}
function image(url, alt, cls) {
  const img=el('img',undefined,cls); img.alt=alt; img.loading='lazy'; img.decoding='async'; img.referrerPolicy='no-referrer';
  img.addEventListener('error',()=>{img.src='./placeholder.svg';},{once:true}); img.src=safeImage(url)||'./placeholder.svg'; return img;
}
function row(label,value) { const r=el('div',undefined,'row');r.append(el('span',label,'label'),el('span',value||'待核实','value'));return r; }
function summary(g) {
  const counts={}; for(const r of g.regions)counts[r.status]=(counts[r.status]||0)+1;
  return Object.entries(counts).map(([s,n])=>`${labels[s]||'待核实'}：${n} 地区`).join(' / ')||'暂无已确认覆盖地区';
}
function release(g) {
  const known=g.regions.filter(r=>r.release_confirmed);
  return known.length>2 ? `${known.length} 个地区有确认时间 · 展开查看` : known.map(r=>`${r.market}：${r.release_confirmed}`).join('\n')||'待核实';
}
function storeDetail(g) {
  const box=el('section');box.append(el('h4',platformNames[g.platform]));
  if(!g.regions.length)box.append(el('p','暂无已确认地区证据'));
  for(const r of g.regions){const region=el('div',undefined,'region');region.append(el('h4',`${r.market} · ${labels[r.status]||'待核实'}`),el('p',`预约首次观察：${r.first_preregistration_observed||'待核实'}`),el('p',`上线监测确认：${r.release_confirmed||'待核实'}`));box.append(region);}
  const link=el('a','打开官方商店 ↗','store-link');link.target='_blank';link.rel='noopener noreferrer';
  link.href=g.platform==='googleplay'?`https://play.google.com/store/apps/details?id=${encodeURIComponent(g.id)}`:`https://apps.apple.com/app/id${encodeURIComponent(g.id)}`;box.append(link);
  const shots=el('div',undefined,'shots');for(const url of g.screenshots)shots.append(image(url,'官方商店截图','shot'));box.append(shots);return box;
}
function card(item) {
  const games=item.games,g=games[0],article=el('article',undefined,'card'+(games.length===2?' cross':''));
  const top=el('div',undefined,'card-top'),icons=el('div',undefined,'icons');for(const game of games)icons.append(image(game.icon,`${platformNames[game.platform]} ${game.name||'游戏'} ICON`,'icon'));
  const heading=el('div');heading.append(el('p',platformNames[item.platform],'platform'),el('h3',g.name||'名称待补充'));if(games.length===2)heading.append(el('div',games[1].name||'名称待补充','subname'));top.append(icons,heading);article.append(top);
  const body=el('div',undefined,'card-body'),badges=el('div',undefined,'badges');for(const game of games)badges.append(el('span',`${games.length===2?platformNames[game.platform]+' · ':''}${labels[game.status]||'待核实'}`,'badge '+group(game.status)));body.append(badges);
  body.append(row(games.length===2?'共同地区':'覆盖地区',(item.regions||g.regions.map(r=>r.market)).join(' / ')||'暂无已确认地区'));
  for(const game of games){const prefix=games.length===2?(game.platform==='googleplay'?'GP ':'App '):'';body.append(row(prefix+'地区状态',summary(game)),row(prefix+'首次预约',game.first_preregistration_observed),row(prefix+'上线确认',release(game)));}
  article.append(body);const details=el('details',undefined,'details');details.append(el('summary','查看地区与商店详情'));
  // Screenshots have no src or DOM node until the user expands this card.
  details.addEventListener('toggle',()=>{if(!details.open||details.dataset.loaded)return;details.dataset.loaded='true';const content=el('div',undefined,'detail-body');if(games.length===2)content.append(el('p','人工已确认关联；两平台各自独立取证，不互相推断状态。'));for(const game of games)content.append(storeDetail(game));details.append(content);});article.append(details);return article;
}
let items=[];
function render(){const query=document.querySelector('#search').value.trim().toLowerCase(),platform=document.querySelector('#platform').value,status=document.querySelector('#status').value;
  const result=items.filter(item=>(platform==='all'||item.platform===platform)&&(status==='all'||item.games.some(g=>group(g.status)===status||g.regions.some(r=>group(r.status)===status)))&&item.games.some(g=>`${g.name} ${g.id}`.toLowerCase().includes(query)));
  document.querySelector('#cards').replaceChildren(...result.map(card));document.querySelector('#count').textContent=`${result.length} 条记录`;
  const msg=document.querySelector('#message');msg.hidden=result.length>0;msg.textContent=items.length?'没有符合筛选条件的游戏。':'暂无公开游戏数据。';
}
async function start(){try{const response=await fetch('./public.json',{cache:'no-cache'});if(!response.ok)throw Error('load');const data=await response.json();if(data.schema!==1||!Array.isArray(data.games)||!Array.isArray(data.confirmed_pairs))throw Error('schema');
  const index=new Map(data.games.map(g=>[`${g.platform}:${g.id}`,g]));items=data.games.map(g=>({platform:g.platform,games:[g]}));
  for(const pair of data.confirmed_pairs){const gp=index.get(`googleplay:${pair.googleplay_id}`),ap=index.get(`appstore:${pair.appstore_id}`);if(gp&&ap)items.push({platform:'cross',games:[gp,ap],regions:pair.common_regions});}
  const date=new Date(data.data_updated_at);document.querySelector('#updated').textContent=`数据更新时间（UTC+8）：${Number.isNaN(date.getTime())?'待核实':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date)}`;
  for(const id of ['search','platform','status'])document.querySelector('#'+id).addEventListener('input',render);render();
}catch{document.querySelector('#updated').textContent='数据更新时间：待核实';document.querySelector('#message').textContent='公开数据暂时无法读取，请稍后刷新。此处不会显示示例或过期的默认游戏。';}}
start();
