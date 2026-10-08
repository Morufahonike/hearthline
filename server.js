// Zero-dependency server: static files + /api/config + /healthz
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000,PUB=path.join(__dirname,'public');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.webp':'image/webp'};
// Only PUBLIC values go here. Secret keys (STRIPE_SECRET_KEY etc.) stay server-side and are never sent to the browser.
const publicConfig=()=>({stripePublishableKey:process.env.STRIPE_PUBLISHABLE_KEY||null,analyticsId:process.env.ANALYTICS_ID||null,apiBase:process.env.API_BASE_URL||null,paystackMode:'dummy',storeName:'Hearthline'});
const REFS=new Map();const json=(res,h,c,o)=>{res.writeHead(c,{...h,'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
http.createServer((req,res)=>{
  const h={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'};
  const url=new URL(req.url,'http://x');
  if(url.pathname==='/healthz'){res.writeHead(200,h);return res.end('ok')}
  // DUMMY Paystack (test mode): no real charges. Swap for api.paystack.co calls using PAYSTACK_SECRET_KEY later.
  if(url.pathname==='/api/paystack/initialize'&&req.method==='POST'){let b='';req.on('data',c=>{b+=c;if(b.length>1e4)req.destroy()});req.on('end',()=>{let d;try{d=JSON.parse(b)}catch{return json(res,h,400,{status:false,message:'Invalid JSON'})}
    if(!/^\S+@\S+\.\S+$/.test(d.email||'')||!(d.amount>0))return json(res,h,400,{status:false,message:'Valid email and amount required'});
    const reference='PSK_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);REFS.set(reference,{email:d.email,amount:d.amount});json(res,h,200,{status:true,dummy:true,reference})});return}
  if(url.pathname.startsWith('/api/paystack/verify/')){const r=REFS.get(url.pathname.split('/').pop());return json(res,h,200,r?{status:'success',dummy:true,...r}:{status:'failed',message:'Unknown reference'})}
  if(url.pathname==='/api/config'){res.writeHead(200,{...h,'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(publicConfig()))}
  let f=path.normalize(path.join(PUB,decodeURIComponent(url.pathname)));
  if(!f.startsWith(PUB))f=path.join(PUB,'index.html');
  fs.stat(f,(e,s)=>{if(e||s.isDirectory())f=path.join(PUB,'index.html');
    fs.readFile(f,(er,d)=>{if(er){res.writeHead(500,h);return res.end('Server error')}
      res.writeHead(200,{...h,'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':f.endsWith('.html')?'no-cache':'public, max-age=86400'});res.end(d)})});
}).listen(PORT,()=>console.log('Hearthline running on port '+PORT));
