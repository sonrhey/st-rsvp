export default {async fetch(request, env) {
const url=new URL(request.url);
if(url.pathname==='/api/rsvp' && request.method==='POST'){
 if(request.headers.get('origin')!==url.origin)return new Response('Forbidden',{status:403});
 if(Number(request.headers.get('content-length')||0)>10000)return new Response('Too large',{status:413});
 try {const text=await request.text();if(text.length>10000)return new Response('Too large',{status:413});const d=JSON.parse(text);
 if(typeof d.name!=='string'||!d.name.trim()||d.name.length>120||typeof d.email!=='string'||d.email.length>180||!/^\S+@\S+\.\S+$/.test(d.email)||!['yes','no'].includes(d.attendance)||typeof d.message!=='string'||d.message.length>1000)return new Response('Invalid response',{status:400});
 const id=crypto.randomUUID();await env.BUCKET.put('rsvps/'+id+'.json',JSON.stringify({...d,name:d.name.trim(),id,receivedAt:new Date().toISOString()}),{httpMetadata:{contentType:'application/json'}});
 if(!env.RSVP_SHEETS_WEBHOOK)return Response.json({error:'Sheets connection is not configured.'},{status:503});
 const google=await fetch(env.RSVP_SHEETS_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:d.name.trim(),email:d.email,attendance:d.attendance,message:d.message}),redirect:'follow',signal:AbortSignal.timeout(25000)});
 if(!google.ok)throw new Error('Sheets request failed');
 const result=await google.json();if(result.success!==true)throw new Error('Sheets did not acknowledge receipt');
 await env.BUCKET.put('rsvps/'+id+'.json',JSON.stringify({...d,name:d.name.trim(),id,receivedAt:new Date().toISOString(),googleSheetsSynced:true}),{httpMetadata:{contentType:'application/json'}});
 return Response.json({received:true,googleSheetsSynced:true});}catch{return new Response('Unable to save',{status:503})}
}
return new Response('Not found',{status:404});
}};
