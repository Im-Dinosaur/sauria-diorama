const fs=require('fs');
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const models=JSON.parse(fs.readFileSync('public/models/realistic-dinosaurs/manifest.json'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5181/dinosaur-report.html',{waitUntil:'networkidle'});
 if(await page.locator('#realistic-six').count()!==1)throw new Error('Latest section missing or duplicated');
 for(const m of models){const card=page.locator(`#realistic-${m.id}`);await card.scrollIntoViewIfNeeded();await card.locator('img').evaluate(img=>img.decode());if(await card.getByText('3D 모델·동작 검수 ↗',{exact:true}).getAttribute('href')!==`./?specimen=${m.id}`)throw new Error('Bad specimen link');}
 const targets=await page.locator('header nav a').evaluateAll(links=>links.map(a=>a.getAttribute('href')).filter(h=>h.startsWith('#')).every(h=>document.querySelector(h)));
 if(!targets)throw new Error('Report navigation target missing');
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'qa-dinosaur-realistic/report-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa-dinosaur-realistic/report-mobile.png'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw new Error('Mobile report overflows');
 await page.setViewportSize({width:1500,height:1040});
 await page.setContent(`<html lang="ko"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#252b27;color:#deddd3;font-family:Arial,'Malgun Gothic',sans-serif;padding:26px}header{height:65px;display:flex;align-items:baseline;justify-content:space-between}h1{font-size:23px;font-weight:400;margin:0}header span{font-size:12px;color:#acb99f}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:17px}.card{position:relative;border:1px solid #77827450;background:#2a302b;border-radius:8px;overflow:hidden}img{width:100%;display:block;aspect-ratio:1.25;object-fit:cover;object-position:50% 68%}footer{padding:12px 15px;font-size:15px;display:flex;justify-content:space-between}footer span{font-size:11px;color:#a9b79f}</style><header><h1>SAURIA / 실사 모델 6종</h1><span>실제 GLB 검수 화면 · 새 동작·자세 44개</span></header><div class="grid">${models.map(m=>`<article class="card"><img src="http://127.0.0.1:5181/dinosaur-realistic-review/${m.id}.png"><footer>${m.name}<span>${m.bones} 본 · ${m.clips.length} 클립</span></footer></article>`).join('')}</div></html>`);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 await page.screenshot({path:'public/dinosaur-realistic-review/overview.png',fullPage:true});
 const result={result:errors.length?'FAIL':'PASS',reportCards:models.length,navTargets:targets,mobileOverflow:overflow,errors};fs.writeFileSync('qa-dinosaur-realistic/report-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
