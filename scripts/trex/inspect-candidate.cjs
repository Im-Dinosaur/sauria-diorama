const fs=require('fs');
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const bytes=fs.readFileSync('qa-trex-study/references/animal-animator.glb'),jlen=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jlen));
 const roots=doc.scenes[doc.scene??0].nodes;
 const wrapper=doc.nodes.length;doc.nodes.push({name:'Inspection_scale',scale:[4,4,4],children:roots});doc.scenes[doc.scene??0].nodes=[wrapper];
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const header=Buffer.from(bytes.subarray(0,20)),tail=bytes.subarray(20+jlen);header.writeUInt32LE(20+json.length+tail.length,8);header.writeUInt32LE(json.length,12);
 const file='qa-trex-study/references/candidate-scaled.glb';fs.writeFileSync(file,Buffer.concat([header,json,tail]));
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}});
 page.on('pageerror',e=>console.log(e.message));
 await page.route('**/models/tyrannosaurus-study/tyrannosaurus-anatomical.glb',r=>r.fulfill({path:require('path').resolve(file),contentType:'model/gltf-binary'}));
 await page.goto('http://127.0.0.1:5181/?trex=study',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#trex-diagnostics').textContent).triangles>0);
 await page.waitForTimeout(1800);await page.screenshot({path:'qa-trex-study/candidate.png'});
 await page.getByRole('button',{name:'머리 확대',exact:true}).click();await page.waitForTimeout(1000);await page.screenshot({path:'qa-trex-study/candidate-head.png'});
 console.log(await page.locator('#trex-diagnostics').textContent());await browser.close();
})();
