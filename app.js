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
  for(const r of g.regions){const region=el('div',undefined,'region');region.append(el('h4',`${r.market} · ${labels[r.status]||'待核实'}`),el('p',`首次发现：${r.first_preregistration_observed||'待核实'}`),el('p',`上线监测确认：${r.release_confirmed||'待核实'}`));box.append(region);}
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
  const tags=el('div',undefined,'badges game-tags');
  for(const tag of new Set(games.flatMap(game=>game.tags||[])))tags.append(el('span',tag,'badge'));
  if(tags.children.length)body.append(tags);
  for(const game of games){
    const prefix=games.length===2?platformNames[game.platform]+' ':'';
    if(game.first_seen)body.append(row(prefix+'游戏首次发现',game.first_seen));
    if(game.expected_release)body.append(row(prefix+'预计上线',game.expected_release));
  }
  for(const game of games){const prefix=games.length===2?(game.platform==='googleplay'?'GP ':'App '):'';body.append(row(prefix+'地区状态',summary(game)),row(prefix+'首次发现',game.first_preregistration_observed),row(prefix+'上线确认',release(game)));}
  article.append(body);const details=el('details',undefined,'details');details.append(el('summary','查看地区与商店详情'));
  // Screenshots have no src or DOM node until the user expands this card.
  details.addEventListener('toggle',()=>{if(!details.open||details.dataset.loaded)return;details.dataset.loaded='true';const content=el('div',undefined,'detail-body');if(games.length===2)content.append(el('p','人工已确认关联；两平台各自独立取证，不互相推断状态。'));for(const game of games)content.append(storeDetail(game));details.append(content);});article.append(details);return article;
}
// Exported dates are UTC+8 minute-precision observations, never browser-local dates.
function preregTime(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))return null;
  const iso=value.replace(' ','T')+':00+08:00',time=Date.parse(iso);
  if(!Number.isFinite(time))return null;
  const check=new Date(time+8*3600000).toISOString().slice(0,16).replace('T',' ');
  return check===value?time:null;
}
const gameKey=g=>`${g.platform}:${g.id}`;
const itemKey=item=>item.games.map(gameKey).join('|');
function firstTime(item){const times=item.games.map(g=>preregTime(g.first_preregistration_observed)).filter(t=>t!==null);return times.length?Math.min(...times):null;}
function compareItems(a,b){
  const x=firstTime(a),y=firstTime(b);
  if(x!==y){if(x===null)return 1;if(y===null)return -1;return y-x;}
  const ak=itemKey(a),bk=itemKey(b);return ak<bk?-1:ak>bk?1:0;
}
function buildItems(data){
  const index=new Map(data.games.map(g=>[gameKey(g),g])),cross=new Map();
  for(const pair of data.confirmed_pairs){
    const gp=index.get(`googleplay:${pair.googleplay_id}`),ap=index.get(`appstore:${pair.appstore_id}`);
    if(gp&&ap){const item={platform:'cross',games:[gp,ap],regions:pair.common_regions};cross.set(itemKey(item),item);}
  }
  return [...index.values()].map(g=>({platform:g.platform,games:[g]})).concat([...cross.values()]).sort(compareItems);
}
function dateBounds(range,from,to,now=Date.now()){
  const day=86400000;
  const today=Math.floor((now+8*3600000)/day)*day-8*3600000;
  if(range==='custom')return [preregTime(from+' 00:00')??-Infinity,(preregTime(to+' 00:00')??Infinity)+day];
  if(['7','30','90','180'].includes(range))return [today-(Number(range)-1)*day,today+day];
  return null;
}
function fieldTime(game,field){
  const value=game[field];
  return preregTime(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value+' 00:00':value);
}
function compareByField(a,b,field){
  const times=item=>item.games.map(g=>fieldTime(g,field)).filter(t=>t!==null);
  const x=Math.min(...times(a)),y=Math.min(...times(b));
  if(x===y)return itemKey(a).localeCompare(itemKey(b));
  if(x===Infinity)return 1;
  if(y===Infinity)return -1;
  return field==='expected_release'?x-y:y-x;
}
function visibleItems(items,platform='all',status='all',query='',filters={}){
  // In the combined view confirmed pairs replace their standalone store cards.
  // Store-specific views still use that store's own first-observed time.
  const linked=new Set(items.filter(i=>i.platform==='cross').flatMap(i=>i.games.map(gameKey)));
  query=query.trim().toLowerCase();
  return items.filter(item=>(platform==='all'?(item.platform==='cross'||!linked.has(gameKey(item.games[0]))):item.platform===platform)
    &&item.games.some(g=>{
      const market=filters.market;
      const regions=market&&market!=='all'?g.regions.filter(r=>r.market===market):g.regions;
      if(market&&market!=='all'&&!regions.length)return false;
      if(status!=='all'&&!regions.some(r=>group(r.status)===status)
          &&((market&&market!=='all')||group(g.status)!==status))return false;
      if(filters.tags?.length&&!filters.tags.some(tag=>(g.tags||[]).includes(tag)))return false;
      const t=fieldTime(g,filters.dateField);
      return !filters.bounds||(t!==null&&t>=filters.bounds[0]&&t<filters.bounds[1]);
    })
    &&item.games.some(g=>`${g.name} ${g.id}`.toLowerCase().includes(query)))
    .sort(filters.sort?(a,b)=>compareByField(a,b,filters.sort):compareItems);
}
let items=[];
function render(){const query=document.querySelector('#search').value.trim().toLowerCase(),platform=document.querySelector('#platform').value,status=document.querySelector('#status').value;
  const value=id=>document.querySelector('#'+id).value;
  const range=value('range');
  document.querySelector('#custom-range').hidden=range!=='custom';
  const tags=[...document.querySelectorAll('#tag-options input:checked')].map(input=>input.value);
  const result=visibleItems(items,platform,status,query,{market:value('market'),tags,
    dateField:value('date-field'),bounds:dateBounds(range,value('from'),value('to')),sort:value('sort')});
  document.querySelector('#cards').replaceChildren(...result.map(card));document.querySelector('#count').textContent=`${result.length} 条记录`;
  const msg=document.querySelector('#message');msg.hidden=result.length>0;msg.textContent=items.length?'没有符合筛选条件的游戏。':'暂无公开游戏数据。';
}
async function start(){try{const response=await fetch('./public.json',{cache:'no-cache'});if(!response.ok)throw Error('load');const data=await response.json();if(data.schema!==1||!Array.isArray(data.games)||!Array.isArray(data.confirmed_pairs))throw Error('schema');
  items=buildItems(data);
  const date=new Date(data.data_updated_at);document.querySelector('#updated').textContent=`数据更新时间（UTC+8）：${Number.isNaN(date.getTime())?'待核实':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date)}`;
  const markets=[...new Set(data.games.flatMap(g=>g.regions.map(r=>r.market)))].sort();
  for(const market of markets)document.querySelector('#market').append(new Option(market,market));
  const tags=[...new Set(data.games.flatMap(g=>g.tags||[]))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
  const options=document.querySelector('#tag-options');
  for(const tag of tags){
    const label=el('label'),input=el('input');input.type='checkbox';input.value=tag;
    label.append(input,document.createTextNode(tag));options.append(label);
  }
  const form=document.querySelector('#filters');
  form.addEventListener('submit',e=>e.preventDefault());
  form.addEventListener('input',render);
  form.addEventListener('reset',()=>setTimeout(render,0));
  render();
}catch{document.querySelector('#updated').textContent='数据更新时间：待核实';document.querySelector('#message').textContent='公开数据暂时无法读取，请稍后刷新。此处不会显示示例或过期的默认游戏。';}}
start();
