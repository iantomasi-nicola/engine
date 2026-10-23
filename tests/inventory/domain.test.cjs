const {test} = require('node:test');
const assert = require('node:assert/strict');
const I = require('../../source/web/inventory.js');
const today = '2026-10-23';
const foods = {rice:{id:'rice',name:'Rice',unit:'g',pack:500,cat:'pantry'},milk:{id:'milk',name:'Milk',unit:'ml',pack:1000,cat:'dairy'},apple:{id:'apple',name:'Apple',unit:'g',pack:500,cat:'produce'}};
const recipes = {meal:{servings:2,ingredients:[{food:'rice',g:200},{food:'milk',g:100}]}};
const food = id=>foods[id], recipe = id=>recipes[id];
const item = (qty=100,extra={})=>({id:'i',kind:'food',ref:'rice',qty,eaten:false,...extra});
const day = (...it)=>({meals:{lunch:it}});
const rows = (days,pantry={},start=today,end=today)=>I.rows({days,pantry,start,end,today,food,recipe});
test('full and partial coverage ignore legacy pan flags and never mutate stock',()=>{
 const pantry={rice:{g:200}}, days={[today]:day(item(100),item(50,{id:'j',pan:true}))}, original=JSON.stringify({days,pantry});
 assert.equal(rows(days,pantry)[0].buy,0); assert.equal(rows(days,pantry)[0].remaining,50);
 days[today].meals.lunch.push(item(100,{id:'k'}));
 assert.equal(rows(days,pantry)[0].buy,50); assert.equal(pantry.rice.g,200);
 days[today].meals.lunch.pop(); assert.equal(JSON.stringify({days,pantry}),original);
});
test('recipes scale and aggregate repeated foods across meals',()=>{
 const r=rows({[today]:day(item(25),{id:'r',kind:'recipe',ref:'meal',qty:1.5})},{rice:{g:100},milk:{g:75}});
 assert.equal(r.find(x=>x.id==='rice').need,175); assert.equal(r.find(x=>x.id==='rice').buy,75); assert.equal(r.find(x=>x.id==='milk').buy,0);
});
test('eaten and quick entries never create shopping demand',()=>assert.equal(rows({[today]:day(item(100,{eaten:true}),{id:'q',kind:'quick',qty:100})}).length,0));
test('earlier pending meals reserve stock; eaten meals do not reserve it twice',()=>{
 const days={[today]:day(item(60)), '2026-10-24':day(item(100))};
 let r=rows(days,{rice:{g:100}},'2026-10-24','2026-10-24')[0]; assert.equal(r.reserved,60);assert.equal(r.buy,60);
 days[today].meals.lunch[0].eaten=true; r=rows(days,{rice:{g:40}},'2026-10-24','2026-10-24')[0];assert.equal(r.buy,60);
});
test('packs always cover deficit including 1g over a pack; override pack metadata',()=>{
 let r=rows({[today]:day(item(501))})[0];assert.equal(r.packs,2);assert.equal(r.left,499);
 r=rows({[today]:day(item(501))},{rice:{g:0,pk:250}})[0];assert.equal(r.packs,3);
});
test('loose products do not round to packages and decimals are retained',()=>{
 const r=rows({[today]:day(item(12.125,{ref:'apple'}))})[0]; assert.equal(r.buy,12.125);assert.equal(r.packs,0);
});
test('expired stock is excluded and depleted stock is signalled',()=>{
 assert.equal(rows({[today]:day(item(100))},{rice:{g:100,exp:'2026-10-22'}})[0].buy,100);
 assert.equal(rows({[today]:day(item(100))},{rice:{g:100}})[0].exhausted,true);
});
test('planning does not deduct inventory',()=>{
 const next=day(item(100)); assert.deepEqual(I.reconcile(null,next,{rice:{g:120}},recipe,today),{rice:{g:120}});assert.equal(next.meals.lunch[0].stockUsed,undefined);
});
test('actual consumption records only available quantity and undo restores exactly that',()=>{
 const before=day(item(100)), eaten=day(item(100,{eaten:true}));
 const stock=I.reconcile(before,eaten,{rice:{g:40,pk:500}},recipe,today);assert.equal(stock.rice.g,0);assert.deepEqual(eaten.meals.lunch[0].stockUsed,{rice:40});
 const again=structuredClone(eaten);assert.deepEqual(I.reconcile(eaten,again,stock,recipe,today),stock);
 const undone=day(item(100));assert.equal(I.reconcile(eaten,undone,stock,recipe,today).rice.g,40);
});
test('recipe consumption handles partial availability and undo',()=>{
 const before=day({id:'r',kind:'recipe',ref:'meal',qty:1,eaten:false}),after=structuredClone(before);after.meals.lunch[0].eaten=true;
 const stock=I.reconcile(before,after,{rice:{g:50},milk:{g:200}},recipe,today);assert.deepEqual(after.meals.lunch[0].stockUsed,{rice:50,milk:50});assert.equal(stock.milk.g,150);
 const undo=I.reconcile(after,before,stock,recipe,today);assert.equal(undo.rice.g,50);assert.equal(undo.milk.g,200);
});
test('editing eaten quantity reverses the receipt then consumes the new amount',()=>{
 const before=day(item(100,{eaten:true,stockUsed:{rice:100}})),after=day(item(150,{eaten:true}));
 const stock=I.reconcile(before,after,{rice:{g:20}},recipe,today);assert.equal(stock.rice.g,0);assert.deepEqual(after.meals.lunch[0].stockUsed,{rice:120});
});
test('removing eaten item returns receipt, never legacy unknown amounts',()=>{
 assert.equal(I.reconcile(day(item(100,{eaten:true,stockUsed:{rice:20}})),day(),{rice:{g:0}},recipe,today).rice.g,20);
 assert.equal(I.reconcile(day(item(100,{eaten:true})),day(),{rice:{g:0}},recipe,today).rice.g,0);
});
test('copying a consumed item to an uneaten plan never returns inventory',()=>{
 const next=day(item(100,{stockUsed:{rice:20}}));assert.equal(I.reconcile(null,next,{rice:{g:10}},recipe,today).rice.g,10);assert.equal(next.meals.lunch[0].stockUsed,undefined);
});
const shop=()=>({pantry:{rice:{g:40,u:'pack',pk:500,pw:30,exp:'2026-11-01',custom:'keep'}},checked:{rice:{g:500}},prices:{rice:{g:500,eur:3}},buys:[{d:today,n:'old',eur:2}],extras:[]});
test('purchase preserves pantry metadata, uses actual cost and clears cart',()=>{
 const src=shop(), result=I.purchase(src,[{id:'rice',name:'Rice',g:500,eur:4}],today,'a');
 assert.equal(src.pantry.rice.g,40);assert.equal(result.shop.pantry.rice.g,540);assert.equal(result.shop.pantry.rice.custom,'keep');assert.equal(result.shop.pantry.rice.pk,500);assert.equal(result.shop.prices.rice.eur,4);assert.equal(result.shop.checked.rice,undefined);
});
test('purchase undo removes only its receipt and preserves later purchases',()=>{
 const first=I.purchase(shop(),[{id:'rice',name:'Rice',g:500,eur:4}],today,'a');
 const second=I.purchase(first.shop,[{id:'rice',name:'Rice',g:250,eur:2}],today,'b');
 const undone=I.undoPurchase(second.shop,first.receipt);assert.equal(undone.pantry.rice.g,290);assert.equal(undone.buys.length,2);assert.equal(undone.buys[1].transactionId,'b');assert.equal(undone.prices.rice.transactionId,'b');
 assert.throws(()=>I.undoPurchase(undone,first.receipt),/already/);
});
test('undo refuses to create negative inventory after consumption',()=>{
 const r=I.purchase(shop(),[{id:'rice',g:500,eur:null}],today,'a');r.shop.pantry.rice.g=100;assert.throws(()=>I.undoPurchase(r.shop,r.receipt),/used/);assert.equal(r.shop.pantry.rice.g,100);
});
test('unknown price remains unknown and zero is valid',()=>{
 let r=I.purchase(shop(),[{id:'rice',g:100,eur:null,est:true}],today,'a');assert.equal(r.shop.buys.at(-1).eur,null);assert.equal(r.shop.prices.rice.eur,3);
 r=I.purchase(shop(),[{id:'rice',g:100,eur:0}],today,'a');assert.equal(r.shop.prices.rice.eur,0);
});
test('invalid quantities and prices reject the purchase without touching input',()=>{
 const s=shop(),before=JSON.stringify(s);for(const g of [-1,0,NaN,Infinity])assert.throws(()=>I.purchase(s,[{id:'rice',g}],today,'a'));
 assert.throws(()=>I.purchase(s,[{id:'rice',g:100,eur:-2}],today,'a'));assert.equal(JSON.stringify(s),before);
});
test('fraction parser accepts decimals and fractions and rejects partial garbage',()=>{
 for(const [v,n] of [['1/2',.5],['1 / 4',.25],['0,125',.125],['0',0]])assert.equal(I.parseQuantity(v),n);
 for(const v of ['1/0','-1','NaN','Infinity','2g','', '1/2/3'])assert.ok(Number.isNaN(I.parseQuantity(v)),v);
});
test('editing legacy eaten records never guesses a second withdrawal',()=>{
 const before=day(item(100,{eaten:true})),after=day(item(150,{eaten:true}));
 assert.equal(I.reconcile(before,after,{rice:{g:50}},recipe,today).rice.g,50);assert.equal(after.meals.lunch[0].stockUsed,undefined);
});
test('undoing deletion reapplies the original short receipt despite later purchases',()=>{
 const restored=day(item(100,{eaten:true,stockUsed:{rice:40}}));
 const stock=I.reconcile(day(),restored,{rice:{g:240}},recipe,today,true);
 assert.equal(stock.rice.g,200);assert.deepEqual(restored.meals.lunch[0].stockUsed,{rice:40});
});
test('undoing deletion of a legacy eaten entry never invents a withdrawal',()=>{
 const restored=day(item(100,{eaten:true}));
 assert.equal(I.reconcile(day(),restored,{rice:{g:240}},recipe,today,true).rice.g,240);
 assert.equal(restored.meals.lunch[0].stockUsed,undefined);
});
test('undo restoring a receipt refuses insufficient stock without mutating the input stock',()=>{
 const stock={rice:{g:20}},restored=day(item(100,{eaten:true,stockUsed:{rice:40}}));
 assert.throws(()=>I.reconcile(day(),restored,stock,recipe,today,true),/original consumption/);
 assert.equal(stock.rice.g,20);
});
