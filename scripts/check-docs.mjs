/** Check repository documentation without network access or personal runtime reads. */
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,relative,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const documents=readdirSync(root).filter(name=>extname(name)==='.md').map(name=>resolve(root,name));
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){if(entry.name==='official')continue;const path=resolve(dir,entry.name);if(entry.isDirectory())walk(path);else if(extname(path)==='.md')documents.push(path);}}
walk(resolve(root,'docs'));
for(const zone of ['frontend','shared','runner'])documents.push(resolve(root,zone,'README.md'));
const errors=[],commands=new Set();let links=0;
const generated=/^(?:dist|runner-dist|node_modules|data|\.omega-runtime|docs\/official)(?:\/|$)/;
for(const file of documents){
 const source=readFileSync(file,'utf8'),name=relative(root,file).split(sep).join('/'),archive=name.startsWith('docs/archive/');
 for(const match of source.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)){
  const target=match[1].trim().replace(/^<|>$/g,'');if(!target||target.startsWith('#')||/^[a-z][a-z0-9+.-]*:/i.test(target))continue;
  const path=decodeURIComponent(target.split('#')[0]);if(!path)continue;
  const local=resolve(dirname(file),path);if(!local.startsWith(root+sep)){errors.push(name+': link outside repository: '+target);continue;}
  if(!existsSync(local))errors.push(name+': missing link: '+target);links++;
 }
 if(archive)continue;
 for(const match of source.matchAll(/\bnpm run ([\w:-]+)/g)){const command=match[1];commands.add(command);if(!manifest.scripts?.[command])errors.push(name+': unknown npm script: '+command);}
 for(const match of source.matchAll(/(?:^|[\s`(])((?:frontend|shared|runner|rust-core|scripts|tests|docs|\.openai)\/[A-Za-z0-9_./*?-]+)/gm)){
  const path=match[1].replace(/[.,]+$/,'');if(generated.test(path)||/[?*]/.test(path)||(!extname(path)&&!path.endsWith('/')))continue;
  if(!existsSync(resolve(root,path)))errors.push(name+': missing documented source: '+path);
 }
}
for(const path of ['AGENTS.md','README.md','docs/README.md','docs/ARCHITECTURE.md','docs/DEVELOPMENT.md','docs/OPERATIONS.md','docs/STRATEGY.md','docs/STATUS.md','docs/NETWORKS.md','docs/WEB.md','docs/DATA.md'])if(!existsSync(resolve(root,path)))errors.push('Missing entry document: '+path);
if(errors.length){for(const error of [...new Set(errors)])process.stderr.write(error+'\n');process.exitCode=1;}
else console.log(`Documentation OK: ${documents.length} Markdown files, ${links} local links, ${commands.size} npm scripts. External URLs, remote API schemas, prose accuracy and rendered Mermaid are not validated.`);
