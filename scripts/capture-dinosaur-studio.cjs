const { chromium } = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const errors=[],missingResources=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missingResources.push({url:r.url(),status:r.status()});});
 fs.mkdirSync('qa-dinosaur-production',{recursive:true});
 fs.mkdirSync('public/dinosaur-review',{recursive:true});
 for(const species of ['rex','triceratops','velociraptor','pterosaur','brachiosaurus','spinosaurus','stegosaurus']){
  await page.goto(`http://127.0.0.1:5181/?studio=${species}`,{waitUntil:'networkidle'});await page.getByText('BONES',{exact:false}).waitFor();await page.waitForTimeout(800);await page.getByRole('button',{name:'애니메이션 정지',exact:true}).click();await page.screenshot({path:`qa-dinosaur-production/${species}.png`});await page.locator('.studio-viewport').screenshot({path:`public/dinosaur-review/${species}.png`});
 }
 // Verify scrubbing, pause and the rig/material review switches.
 await page.getByRole('button',{name:'걷기',exact:true}).click();const timeline=page.getByRole('slider',{name:'애니메이션 타임라인'});await timeline.fill('0.7');await page.getByLabel('뼈대 표시',{exact:true}).check();await page.getByLabel('와이어프레임',{exact:true}).check();await page.waitForTimeout(200);const frozen=await timeline.inputValue();await page.waitForTimeout(250);if(await timeline.inputValue()!==frozen)throw Error('Paused timeline moved');await page.screenshot({path:'qa-dinosaur-production/rig-wireframe.png'});
 await page.setViewportSize({width:390,height:844});await page.getByLabel('와이어프레임',{exact:true}).uncheck();await page.getByLabel('뼈대 표시',{exact:true}).uncheck();await page.screenshot({path:'qa-dinosaur-production/mobile-studio.png'});
 const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(horizontalOverflow)throw Error('Mobile studio overflows');
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5181/',{waitUntil:'networkidle'});await page.waitForTimeout(2500);await page.screenshot({path:'qa-dinosaur-production/ecosystem.png'});if(!await page.locator('#scene-diagnostics').count())throw Error(JSON.stringify({errors,body:(await page.locator('body').textContent()).slice(0,400)}));const diagnostics=JSON.parse(await page.locator('#scene-diagnostics').textContent());
 const report={errors,missingResources,pauseTimeline:true,scrubbing:true,boneToggle:true,wireframeToggle:true,mobileHorizontalOverflow:horizontalOverflow,ecosystem:{total:diagnostics.total,species:new Set(diagnostics.animals.map(a=>a.species)).size,mode:diagnostics.mode}};fs.writeFileSync('qa-dinosaur-production/browser-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
