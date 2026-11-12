// Zero-dependency digital signage server. Node 18+.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,PASS=process.env.ADMIN_PASSWORD||'changeme',TZ=process.env.TZ||'Europe/Athens';
const DIR=process.env.DATA_DIR||path.join(__dirname,'data'),UP=path.join(DIR,'uploads'),DB=path.join(DIR,'data.json');
fs.mkdirSync(UP,{recursive:true});
let data={screens:[{id:'screen1',name:'Screen 1',playlist:''}],media:[],playlists:[],schedules:[]};
try{data=JSON.parse(fs.readFileSync(DB,'utf8'))}catch(e){}
const seen={},save=()=>fs.writeFileSync(DB,JSON.stringify(data,null,1)),uid=()=>crypto.randomBytes(5).toString('hex');
const MIME={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'};
const h=s=>crypto.createHash('sha256').update(s).digest();
function auth(req){const a=req.headers.authorization||'';if(a.slice(0,6)!=='Basic ')return false;const d=Buffer.from(a.slice(6),'base64').toString();return crypto.timingSafeEqual(h(d.slice(d.indexOf(':')+1)),h(PASS))}
function nowParts(){const g={};new Intl.DateTimeFormat('en-GB',{timeZone:TZ,weekday:'short',hour:'2-digit',minute:'2-digit',year:'numeric',month:'2-digit',day:'2-digit',hour12:false}).formatToParts(new Date()).forEach(p=>g[p.type]=p.value);
  return{dow:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g.weekday),t:(g.hour==='24'?'00':g.hour)+':'+g.minute,d:g.year+'-'+g.month+'-'+g.day}}
function active(s,id,n){if(s.screen!=='*'&&s.screen!==id)return false;if(s.days&&s.days.length&&s.days.indexOf(n.dow)<0)return false;
  if(s.from&&n.d<s.from)return false;if(s.to&&n.d>s.to)return false;const a=s.start||'00:00',b=s.end||'24:00';return a<=b?(n.t>=a&&n.t<b):(n.t>=a||n.t<b)}
function resolve(id){const sc=data.screens.find(x=>x.id===id);if(!sc)return null;const n=nowParts();let pid=sc.playlist;
  data.schedules.forEach(s=>{if(active(s,id,n))pid=s.playlist});const pl=data.playlists.find(p=>p.id===pid);
  return{name:sc.name,playlist:pl?pl.name:'',items:pl?pl.items.map(i=>{const m=data.media.find(x=>x.id===i.media);return m&&Object.assign({},m,{duration:i.duration||10})}).filter(Boolean):[]}}
function serve(req,res,fp,ct){fs.stat(fp,(e,st)=>{if(e){res.writeHead(404);return res.end('Not found')}
  let s=0,t=st.size-1,code=200;const hd={'Content-Type':ct,'Accept-Ranges':'bytes'};const m=/bytes=(\d*)-(\d*)/.exec(req.headers.range||'');
  if(m){s=m[1]?+m[1]:0;t=m[2]?+m[2]:t;code=206;hd['Content-Range']='bytes '+s+'-'+t+'/'+st.size}
  hd['Content-Length']=t-s+1;res.writeHead(code,hd);fs.createReadStream(fp,{start:s,end:t}).pipe(res)})}
http.createServer((req,res)=>{const p=new URL(req.url,'http://x').pathname;
  const json=(o,c)=>{res.writeHead(c||200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
  if(p==='/player')return serve(req,res,path.join(__dirname,'player.html'),'text/html; charset=utf-8');
  if(p.startsWith('/api/screen/')){const id=decodeURIComponent(p.slice(12)),r=resolve(id);if(r)seen[id]=Date.now();return r?json(r):json({error:'unknown screen'},404)}
  if(p.startsWith('/media/'))return serve(req,res,path.join(UP,path.basename(p)),MIME[path.extname(p).toLowerCase()]||'application/octet-stream');
  if(!auth(req)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Signage admin"'});return res.end('Login required')}
  if(p==='/'||p==='/admin')return serve(req,res,path.join(__dirname,'admin.html'),'text/html; charset=utf-8');
  if(p==='/api/data'&&req.method==='GET')return json({data,seen,tz:TZ});
  if(p==='/api/data'&&req.method==='PUT'){let b='';req.on('data',c=>{b+=c;if(b.length>5e6)req.destroy()});
    req.on('end',()=>{try{const d=JSON.parse(b);['screens','media','playlists','schedules'].forEach(k=>{if(!Array.isArray(d[k]))throw 0});
      data=d;save();const keep=new Set(d.media.map(m=>m.file).filter(Boolean));fs.readdirSync(UP).forEach(f=>{if(!keep.has(f))fs.unlink(path.join(UP,f),()=>{})});json({ok:1})}catch(e){json({error:'bad data'},400)}});return}
  if(p==='/api/upload'&&req.method==='POST'){const name=new URL(req.url,'http://x').searchParams.get('name')||'file',ct=req.headers['content-type']||'';
    const ext=path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g,''),type=ct.startsWith('video/')?'video':ct.startsWith('image/')?'image':'';
    if(!type||!MIME[ext]){res.writeHead(400);return res.end('Only images and videos')}
    const id=uid(),file=id+ext,ws=fs.createWriteStream(path.join(UP,file));req.pipe(ws);
    ws.on('finish',()=>{const m={id,type,name,file};data.media.push(m);save();json(m)});return}
  res.writeHead(404);res.end('Not found')}).listen(PORT,()=>console.log('Signage on :'+PORT));
