import api from './server/api.js';
export default {async fetch(request, env) {
 if(new URL(request.url).pathname==='/api/rsvp')return api.fetch(request,env);
 return env.ASSETS.fetch(request);
}};
