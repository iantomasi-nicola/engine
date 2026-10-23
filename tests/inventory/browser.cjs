const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.ENGINE_TEST_URL || 'http://localhost:8013';
assert.equal(new URL(url).hostname, 'localhost');
const onlyBaseline = process.env.BASELINE === '1';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 let passed=0,failed=0;
 try {
  for(const viewport of onlyBaseline ? [{width:1280,height:900}] : [{width:390,height:844},{width:820,height:1180},{width:1440,height:1000}]) {
   const context=await browser.newContext({viewport}); const page=await context.newPage();page.setDefaultTimeout(10000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
   await page.goto(url);await page.getByText('Use on this device only',{exact:true}).click();await page.waitForFunction(()=>Sync.ready);
   async function seed({stock=100,qty=100,recipe=false,pan=false}={}) {
    await context.setOffline(false);
    await page.evaluate(({stock,qty,recipe,pan})=>{
     closeSheet(); toast(''); Sync.db=null;Sync.uid=null;Sync.base=null;for(const t of Sync.timers.values())clearTimeout(t);Sync.pending.clear();Sync.inflight.clear();
     window.__storedWrites=[];
     for(const k of Object.keys(localStorage))if(k.startsWith('engine.inventory.backup.'))localStorage.removeItem(k);
     S.settings.onboarded=true;
     S.foods={rice:{...blankFood('Rice fixture'),id:'rice',pack:500,unit:'g',per:{kcal:360,p:8,c:80,f:1,fib:1},servings:[{l:'1 portion',g:100}]},milk:{...blankFood('Milk fixture'),id:'milk',pack:1000,unit:'ml',per:{kcal:60,p:3,c:5,f:3},servings:[{l:'1 glass',g:200}]}};
     S.recipes={dish:{id:'dish',name:'Rice pudding fixture',servings:2,ingredients:[{food:'rice',g:200},{food:'milk',g:100}]}};
     UI.date=todayISO();UI.shopStart=UI.date;UI.tab=UI.fuelTab='shop';
     S.days={[UI.date]:{date:UI.date,meals:{lunch:[{id:'meal-item',kind:recipe?'recipe':'food',ref:recipe?'dish':'rice',qty,eaten:false,pan}]}}};
     S.shop={panV:1,range:7,pantry:{rice:{g:stock,u:'pack',pk:500,pw:25,custom:'preserve'},milk:{g:100}},checked:{},extras:[],prices:{rice:{g:500,eur:2}},buys:[]};
     saveLocal();scheduleRender();
    },{stock,qty,recipe,pan});
    await page.waitForFunction(()=>document.querySelector('.top-title')?.textContent==='Shopping');
   }
   async function check(name,fn){try{await fn();assert.deepEqual(errors,[]);passed++;console.log(`PASS ${viewport.width}: ${name}`);}catch(e){failed++;console.error(`FAIL ${viewport.width}: ${name}: ${e.message}`);}}
   await check('fully covered food is only in collapsed available section',async()=>{
    await seed(); const r=await page.evaluate(()=>shoppingRows(UI.shopStart,7)[0]);assert.equal(r.buy,0);assert.equal(r.need,100);
    assert.equal(await page.locator('.shop-list [data-act="shop-check"]').count(),0);await page.locator('.shop-covered summary').click();await page.getByText('Expected to run out',{exact:false}).last().waitFor();
   });
   await check('recipe and partial stock produce exact shopping deficit',async()=>{
    await seed({stock:40,qty:1.5,recipe:true});const rows=await page.evaluate(()=>shoppingRows(UI.shopStart,7));assert.equal(rows.find(r=>r.id==='rice').buy,110);assert.equal(rows.find(r=>r.id==='milk').buy,0);
   });
   await check('eating short stock and undo returns only the actual withdrawal',async()=>{
    await seed({stock:40,qty:100,pan:true});await page.evaluate(()=>ACT['toggle-eaten']({dataset:{meal:'lunch',id:'meal-item'}}));assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),0);
    await page.evaluate(()=>ACT['toggle-eaten']({dataset:{meal:'lunch',id:'meal-item'}}));assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),40);
   });
   if(onlyBaseline){await context.close();continue;}
   await check('recipes consume stock once; whole-meal undo restores stock and log',async()=>{
    await seed({stock:100,qty:1.5,recipe:true});await page.evaluate(()=>ACT['all-eaten']());assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),0);assert.equal(await page.evaluate(()=>S.shop.pantry.milk.g),25);
    await page.locator('[data-act="undo"]').click();assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),100);assert.equal(await page.evaluate(()=>getDay(UI.date).meals.lunch[0].eaten),false);
   });
   await check('quick purchase covers plan, preserves metadata and undo is exact',async()=>{
    await seed({stock:40,qty:100});await page.locator('.shop-list [data-act="shop-check"][data-id="rice"]').click();
    assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),540);assert.equal(await page.evaluate(()=>S.shop.pantry.rice.pk),500);assert.equal(await page.evaluate(()=>shoppingRows(UI.shopStart,7)[0].buy),0);
    await page.locator('[data-act="undo"]').click();assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),40);assert.equal(await page.evaluate(()=>S.shop.buys.length),0);
   });
   await check('cart purchase records actual quantity/price exactly once and survives offline reload',async()=>{
    await seed({stock:40,qty:100});await page.locator('.shop-main[data-act="shop-buy"][data-id="rice"]').click();await page.locator('#by-g').fill('200');await page.locator('#by-eur').fill('1.5');await page.locator('[data-act="by-ok"]').click();
    assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),40);await page.waitForFunction(()=>document.querySelector('.pk-n[data-id="rice"] b')?.textContent==='0.4×');await page.locator('[data-act="shop-done"]').click();
    assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),240);assert.equal(await page.evaluate(()=>S.shop.prices.rice.eur),1.5);assert.equal(await page.evaluate(()=>S.shop.pantry.rice.custom),'preserve');
    await page.evaluate(()=>ACT['shop-done']());assert.equal(await page.evaluate(()=>S.shop.buys.length),1);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await page.waitForFunction(()=>Sync.ready);assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),240);assert.equal(await page.evaluate(()=>S.shop.buys.length),1);
   });
   await check('pantry supports fractional packs, explicit prices and no mass-volume guessing',async()=>{
    await seed();await page.evaluate(()=>{UI.tab=UI.fuelTab='pantry';scheduleRender();});await page.locator('[data-act="pantry-edit"][data-id="rice"]').click();
    assert.equal(await page.locator('[data-act="pa-unit"][data-k="ml"]').count(),0);
    await page.locator('#pa-n').fill('1/2');await page.locator('#pa-pk').fill('400');await page.locator('#pa-price').fill('3');await page.locator('#pa-price-g').fill('400');await page.locator('[data-act="pa-save"]').click();
    assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),200);assert.equal(await page.evaluate(()=>eurPerG('rice')),.0075);assert.equal(await page.evaluate(()=>S.shop.pantry.rice.custom),'preserve');
    await page.reload();await page.waitForFunction(()=>Sync.ready);assert.equal(await page.evaluate(()=>S.shop.pantry.rice.pk),400);
   });
   await check('meal fractions recalculate macros and remain planned until eaten',async()=>{
    await seed({stock:500});await page.evaluate(()=>ACT['open-item']({dataset:{meal:'lunch',id:'meal-item'}}));await page.locator('#qty-pack-fraction').fill('1/4');
    assert.equal(await page.locator('#qty-in').inputValue(),'125');await page.locator('[data-act="qty-save"]').click();assert.equal(await page.evaluate(()=>getDay(UI.date).meals.lunch[0].qty),125);assert.equal(await page.evaluate(()=>dayTotals(getDay(UI.date)).kcal),450);assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),500);
   });
   await check('quantity edits preserve values above 1000 and reject invalid fractions',async()=>{
    await seed({stock:2000,qty:1250.125});await page.evaluate(()=>ACT['open-item']({dataset:{meal:'lunch',id:'meal-item'}}));assert.equal(await page.locator('#qty-in').inputValue(),'1250.125');
    await page.locator('[data-act="qty-save"]').click();assert.equal(await page.evaluate(()=>getDay(UI.date).meals.lunch[0].qty),1250.125);
    await page.evaluate(()=>ACT['open-item']({dataset:{meal:'lunch',id:'meal-item'}}));await page.locator('#qty-in').fill('1/0');await page.locator('[data-act="qty-save"]').click();assert.equal(await page.evaluate(()=>getDay(UI.date).meals.lunch[0].qty),1250.125);assert.equal(await page.locator('#qty-in').count(),1);
   });
   await check('legacy eaten records do not withdraw again when edited',async()=>{
    await seed({stock:40});await page.evaluate(()=>{S.days[UI.date].meals.lunch[0].eaten=true;saveLocal();ACT['open-item']({dataset:{meal:'lunch',id:'meal-item'}});});
    await page.getByText('This older eaten entry has no stock receipt.',{exact:false}).waitFor();await page.locator('#qty-in').fill('150');await page.locator('[data-act="qty-save"]').click();assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),40);
   });
   await check('pantry removal undo preserves a later purchase',async()=>{
    await seed({stock:100});const result=await page.evaluate(()=>{removeInventory('rice');const undo=toast.undo;recordPurchases([{id:'rice',name:'Rice',g:200,eur:2}]);undo();return {g:S.shop.pantry.rice.g,buys:S.shop.buys.length};});assert.deepEqual(result,{g:300,buys:1});
   });
   await check('failed purchase undo never confirms success or changes stock',async()=>{
    await seed({stock:0,qty:100});await page.evaluate(()=>{recordPurchases([{id:'rice',name:'Rice',g:100,eur:1}]);ACT['toggle-eaten']({dataset:{meal:'lunch',id:'meal-item'}});});
    await page.locator('[data-act="undo"]').click();assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),0);assert.equal(await page.evaluate(()=>S.shop.buys.length),1);
    assert.match(await page.locator('#toast').innerText(),/Undo the consumption first/);assert.doesNotMatch(await page.locator('#toast').innerText(),/Undone/);
   });
   await check('undoing eaten-item deletion restores its original receipt after a purchase',async()=>{
    await seed({stock:40,qty:100});await page.evaluate(()=>{ACT['toggle-eaten']({dataset:{meal:'lunch',id:'meal-item'}});recordPurchases([{id:'rice',name:'Rice',g:200,eur:2}]);ACT['open-item']({dataset:{meal:'lunch',id:'meal-item'}});});
    await page.locator('[data-act="item-del"]').click();assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),240);
    await page.locator('[data-act="undo"]').click();assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),200);assert.deepEqual(await page.evaluate(()=>getDay(UI.date).meals.lunch[0].stockUsed),{rice:40});
   });
   await check('search tolerates a typo and sort/filter persist',async()=>{
    await seed();await page.evaluate(()=>{UI.tab=UI.fuelTab='pantry';scheduleRender();});await page.locator('[aria-label="Sort pantry"]').selectOption('za');
    assert.equal(await page.locator('.pan-main .t').first().innerText(),'Rice fixture');await page.locator('#pantry-search').fill('Rixe');await page.waitForFunction(()=>S.shop.view.q==='Rixe');
    assert.equal(await page.locator('.pan-row').count(),1);await page.reload();await page.waitForFunction(()=>Sync.ready);await page.evaluate(()=>{UI.tab=UI.fuelTab='pantry';scheduleRender();});await page.locator('#pantry-search').waitFor();assert.equal(await page.locator('#pantry-search').inputValue(),'Rixe');assert.equal(await page.locator('[aria-label="Sort pantry"]').inputValue(),'za');
    if(process.env.ENGINE_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.ENGINE_SCREENSHOT_DIR}/pantry-${viewport.width}.png`,fullPage:true});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false);
   });
   await check('failed durable save rolls back inventory and never queues cloud writes',async()=>{
    await seed({stock:40});const result=await page.evaluate(()=>{
     const before=JSON.stringify({shop:S.shop,days:S.days});inventoryBackup();const original=Storage.prototype.setItem;
     Storage.prototype.setItem=function(k,v){if(k===LS_KEY)throw new DOMException('full','QuotaExceededError');return original.call(this,k,v);};
     let ok;try{ok=recordPurchases([{id:'rice',name:'Rice',g:500,eur:2}]);}finally{Storage.prototype.setItem=original;}
     return {ok,unchanged:before===JSON.stringify({shop:S.shop,days:S.days}),pending:Sync.pending.size,saved:JSON.parse(localStorage.getItem(LS_KEY)).shop.pantry.rice.g};
    });assert.deepEqual(result,{ok:false,unchanged:true,pending:0,saved:40});await page.locator('#storage-warning').waitFor();
   });
   await check('unverifiable backup blocks writes; verified backup restores fixture state',async()=>{
    await seed({stock:40});const result=await page.evaluate(()=>{
     const key='engine.inventory.backup.v1.local', original=Storage.prototype.setItem;
     Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('full','QuotaExceededError');return original.call(this,k,v);};let blocked;try{blocked=!recordPurchases([{id:'rice',g:100,eur:1}]);}finally{Storage.prototype.setItem=original;}
     const untouched=S.shop.pantry.rice.g===40;recordPurchases([{id:'rice',g:100,eur:1}]);const backup=JSON.parse(localStorage.getItem(key));
     // Exercise the documented targeted rollback on this disposable profile only.
     S.shop=backup.shop;S.days=backup.days;saveLocal();return {blocked,untouched,version:backup.version,g:backup.shop.pantry.rice.g};
    });assert.deepEqual(result,{blocked:true,untouched:true,version:1,g:40});await page.reload();await page.waitForFunction(()=>Sync.ready);assert.equal(await page.evaluate(()=>S.shop.pantry.rice.g),40);
   });
   await check('app cloud adapter receives matching stock and consumption receipt',async()=>{
    await seed({stock:40});await page.evaluate(()=>{
     const ref=path=>({set:async data=>{window.__storedWrites.push({path,data});},delete:async()=>{},collection:name=>({doc:id=>ref(path+'/'+name+'/'+id)})}); Sync.uid='synthetic-user';Sync.base='data/users/synthetic-user';Sync.db={doc:ref};
     ACT['toggle-eaten']({dataset:{meal:'lunch',id:'meal-item'}});
    });await page.waitForFunction(()=>window.__storedWrites.length===2);
    const writes=await page.evaluate(()=>window.__storedWrites);assert.equal(writes.find(w=>w.path.endsWith('/shop')).data.pantry.rice.g,0);assert.equal(writes.find(w=>w.path.includes('/days/')).data.meals.lunch[0].stockUsed.rice,40);
   });
   await context.close();
  }
 }finally{await browser.close();}
 console.log(`Browser checks: ${passed} passed, ${failed} failed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
