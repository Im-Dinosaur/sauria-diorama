const fs=require('fs'),zlib=require('zlib'),crypto=require('crypto');
const folder='qa-dinosaur-realistic/sources';fs.mkdirSync(folder,{recursive:true});
const paths=JSON.parse(zlib.gunzipSync(fs.readFileSync(`${folder}/object-paths.json.gz`)));
const candidates=[
 ['triceratops-daniel','cb7bad2c70dc4748a9c58ef9db5fce5e'],
 ['triceratops-daily','909bf645de1746829ab19acd1ae31767'],
 ['stegosaurus-daily','1924052361fb4bd49b714d296a34d2ab'],
 ['pteranodon-chistodrako','7d7683df41d1405283f160e81a5dff1b'],
 ['spinosaurus-pedro','2a325726dd7b4a7c888277f262fd09bc'],
 ['velociraptor-tsu','615636112921445a9696464c491d2086']
];
(async()=>{const report=[];for(const [name,id] of candidates){
 if(!paths[id]){report.push({name,id,error:'Not available in public index'});continue;}
 const file=`${folder}/${name}.glb`,url=`https://huggingface.co/datasets/allenai/objaverse/resolve/main/${paths[id]}`;
 try{if(!fs.existsSync(file)){console.log(`Downloading ${name}…`);const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status}`);const b=Buffer.from(await r.arrayBuffer());if(b.readUInt32LE(0)!==0x46546c67)throw new Error('Not GLB');fs.writeFileSync(file,b);}const b=fs.readFileSync(file);report.push({name,id,file,url,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});console.log(`${name}: ${(b.length/1048576).toFixed(1)} MiB`);}catch(e){console.log(`${name}: ${e.message}`);report.push({name,id,error:e.message});}
 }fs.writeFileSync(`${folder}/downloads.json`,JSON.stringify(report,null,2));})();
