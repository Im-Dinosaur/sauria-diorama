const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root='http://127.0.0.1:5181';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${root}/?trex=study`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>Number(JSON.parse(document.querySelector('#trex-diagnostics').textContent).bones)===84);
 await page.getByRole('button',{name:'머리 확대',exact:true}).click();await page.waitForTimeout(400);
 await page.locator('.trex-stage').screenshot({path:'public/dinosaur-review/trex-reference.png'});
 await page.getByRole('button',{name:'걷기',exact:true}).click();
 await page.getByRole('button',{name:'애니메이션 재생',exact:true}).click();await page.waitForTimeout(600);
 const moving=JSON.parse(await page.locator('#trex-diagnostics').textContent());assert.ok(moving.time>.15);
 await page.getByRole('button',{name:'애니메이션 정지',exact:true}).click();await page.waitForTimeout(200);
 const stopped=JSON.parse(await page.locator('#trex-diagnostics').textContent()).time;await page.waitForTimeout(350);
 assert.equal(JSON.parse(await page.locator('#trex-diagnostics').textContent()).time,stopped);
 await page.getByRole('button',{name:'빠른 이동',exact:true}).click();await page.getByRole('slider',{name:'자세 타임라인'}).fill('0.6');await page.waitForTimeout(200);
 assert.equal(JSON.parse(await page.locator('#trex-diagnostics').textContent()).time,.6);
 await page.getByLabel('와이어프레임',{exact:true}).check();await page.getByLabel('뼈대',{exact:true}).check();
 await page.getByRole('button',{name:'표면 법선',exact:true}).click();await page.waitForTimeout(200);
 assert.equal(JSON.parse(await page.locator('#trex-diagnostics').textContent()).layer,'normal');
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'GLB 모델 받기',exact:true}).click()]);
 assert.equal(download.suggestedFilename(),'tyrannosaurus-reference-study.glb');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
 await page.screenshot({path:'qa-trex-study/mobile.png'});
 await page.close();
 const qa=await browser.newPage();qa.on('pageerror',e=>errors.push(e.message));
 await qa.route('**/trex-qa-host',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body>Asset verification</body></html>'}));
 await qa.goto(`${root}/trex-qa-host`);
 const asset=await qa.evaluate(async()=>{
  const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const {AnimationMixer,Vector3,Box3}=await import('/node_modules/.vite/deps/three.js');
  const gltf=await new GLTFLoader().loadAsync('/models/tyrannosaurus-study/tyrannosaurus-reference-study.glb'),meshes=[],textures=new Map();
  gltf.scene.traverse(o=>{if(o.isMesh){meshes.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])for(const key of ['map','normalMap','roughnessMap'])if(m[key])textures.set(m[key].uuid,{material:m.name,key,width:m[key].image.width,height:m[key].image.height});}});
  const problems=[],clips=[],mixer=new AnimationMixer(gltf.scene),p=new Vector3();let vertices=0,weights=0,sampled=0;
  for(const mesh of meshes){const pos=mesh.geometry.getAttribute('position');vertices+=pos.count;for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);if(!p.toArray().every(Number.isFinite))problems.push('non-finite bind vertex');}
   if(mesh.isSkinnedMesh){const sw=mesh.geometry.getAttribute('skinWeight'),sj=mesh.geometry.getAttribute('skinIndex');for(let i=0;i<sw.count;i++){let sum=0;for(let k=0;k<4;k++){const w=sw.array[i*4+k],j=sj.array[i*4+k];sum+=w;if(w<0||j>=mesh.skeleton.bones.length)problems.push('invalid joint weight');}if(Math.abs(sum-1)>1e-4)problems.push('unnormalized skin');weights++;}}
  }
  for(const clip of gltf.animations){mixer.stopAllAction();mixer.clipAction(clip).reset().play();const bounds=new Box3(),samples=[];
   for(let f=0;f<=12;f++){mixer.setTime(clip.duration*f/12);gltf.scene.updateMatrixWorld(true);for(const mesh of meshes){if(mesh.isSkinnedMesh)mesh.skeleton.update();const pos=mesh.geometry.getAttribute('position');for(let i=0;i<pos.count;i+=3){p.fromBufferAttribute(pos,i);if(mesh.isSkinnedMesh)mesh.applyBoneTransform(i,p);p.applyMatrix4(mesh.matrixWorld);if(!p.toArray().every(Number.isFinite))problems.push('non-finite deformed vertex');bounds.expandByPoint(p);sampled++;}}const jaw=gltf.scene.getObjectByName('DEF-jaw');samples.push(jaw.quaternion.toArray());}
   clips.push({name:clip.name,duration:clip.duration,min:bounds.min.toArray(),max:bounds.max.toArray(),jawMotion:Math.max(...samples.map(q=>Math.abs(q[0]-samples[0][0])))});
  }
  return {vertices,weights,sampled,meshes:meshes.length,bones:Math.max(...meshes.filter(m=>m.isSkinnedMesh).map(m=>m.skeleton.bones.length)),textures:[...textures.values()],clips,problems:[...new Set(problems)]};
 });
 assert.deepEqual(asset.problems,[]);assert.equal(asset.bones,84);assert.equal(asset.clips.length,5);assert.ok(asset.clips.find(c=>c.name==='04_Attack').jawMotion>.1);
 assert.ok(asset.textures.some(t=>t.key==='map'&&t.width===4096));assert.ok(asset.sampled>300000);
 assert.deepEqual(errors,[]);
 const report={result:'PASS',ui:{playPause:true,scrub:true,surfaceAndSkeleton:true,download:true,mobileOverflow:overflow,errors},asset};
 fs.writeFileSync('qa-trex-study/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
