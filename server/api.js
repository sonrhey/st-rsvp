async function guestCheck(token, secret, remoteip) {
  if (!secret) return 'not-configured';
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) return 'missing';
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({secret, response: token, remoteip: remoteip || undefined}),
    signal: AbortSignal.timeout(10000)
  });
  if (!verify.ok) throw new Error('Turnstile request failed');
  const outcome = await verify.json();
  return outcome.success === true ? 'ok' : 'failed';
}

export default {async fetch(request, env) {
const url=new URL(request.url);
if(url.pathname==='/api/rsvp' && request.method==='POST'){
 if(request.headers.get('origin')!==url.origin)return new Response('Forbidden',{status:403});
 if(Number(request.headers.get('content-length')||0)>10000)return new Response('Too large',{status:413});
 try {const text=await request.text();if(text.length>10000)return new Response('Too large',{status:413});const d=JSON.parse(text);
 if(typeof d.name!=='string'||!d.name.trim()||d.name.length>120||!['yes','no'].includes(d.attendance)||typeof d.message!=='string'||d.message.length>1000)return new Response('Invalid response',{status:400});
 const remoteip=(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'').split(',')[0].trim();
 const check=await guestCheck(d.turnstileToken, env.TURNSTILE_SECRET_KEY, remoteip);
 if(check==='not-configured')return new Response('Spam check is not configured.',{status:503});
 if(check!=='ok')return new Response('Please confirm you are a guest, then try again.',{status:403});
 const id=crypto.randomUUID();
 const record={name:d.name.trim(),email:'',attendance:d.attendance,message:d.message,id,receivedAt:new Date().toISOString()};
 await env.BUCKET.put('rsvps/'+id+'.json',JSON.stringify(record),{httpMetadata:{contentType:'application/json'}});
 if(!env.RSVP_SHEETS_WEBHOOK)return Response.json({error:'Sheets connection is not configured.'},{status:503});
 const google=await fetch(env.RSVP_SHEETS_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:record.name,email:record.email,attendance:record.attendance,message:record.message}),redirect:'follow',signal:AbortSignal.timeout(25000)});
 if(!google.ok)throw new Error('Sheets request failed');
 const result=await google.json();if(result.success!==true)throw new Error('Sheets did not acknowledge receipt');
 await env.BUCKET.put('rsvps/'+id+'.json',JSON.stringify({...record,googleSheetsSynced:true}),{httpMetadata:{contentType:'application/json'}});
 return Response.json({received:true,googleSheetsSynced:true});}catch{return new Response('Unable to save',{status:503})}
}
return new Response('Not found',{status:404});
}};
