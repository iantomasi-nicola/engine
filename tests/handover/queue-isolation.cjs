// Known failing regression on the handover baseline: DATA-01. No network or real data.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const writes = [];
// Synthetic pending write from a previous session: the actual queue format carries no user ID.
const storage = new Map([['engine.q', JSON.stringify([{op:'set', path:'lib/settings', data:{marker:'synthetic-account-A'}}])]]);
const ctx = {
 console, Map, Set, URL, Blob,
 localStorage: {getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,v), removeItem:k=>storage.delete(k)},
 ENGINE_CONFIG:{supabaseUrl:'https://example.invalid',supabaseKey:'synthetic-public-key'},
 supabase:{createClient:()=>({from:()=>({upsert:async row=>{writes.push(row);return {error:null};}})})},
 addEventListener:()=>{}, setTimeout:()=>0, clearTimeout:()=>{},
};
ctx.window=ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../source/web/shim.js'),'utf8'),ctx);
(async()=>{
 ctx.ENGINE.uid='synthetic-account-B';
 await ctx.ENGINE.flush();
 console.log(JSON.stringify({writes,remainingQueue:ctx.ENGINE.pending()}));
 assert.equal(writes.length,0,'Pending writes from another session must not be reassigned to the current account');
})().catch(e=>{console.error(e.message);process.exitCode=1});
