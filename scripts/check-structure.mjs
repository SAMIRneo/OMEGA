/** Verify source boundaries without loading application code or runtime data. */
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isBuiltin} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const errors=[],files=[];
const pureCore=new Set(['session.js','daily.ts','indicators.js','types.ts','execution.ts','testnet-plan.ts','networks.js'].map(name=>'frontend/core/'+name));
const nameOf=file=>relative(root,file).replaceAll('\\','/');
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=resolve(dir,item.name);if(item.isDirectory())walk(file);else if(/\.[cm]?[jt]s$/.test(item.name)&&!item.name.endsWith('.test.ts')&&!item.name.endsWith('.d.ts'))files.push(file);}}
for(const zone of ['frontend','shared','runner'])walk(resolve(root,zone));
const graph=new Map();
function resolveImport(specifier,file){
 if(!specifier.startsWith('.'))return undefined;
 const base=resolve(dirname(file),specifier);
 return [base,base+'.ts',base+'.js',resolve(base,'index.ts')].find(path=>existsSync(path));
}
for(const file of files){
 const source=readFileSync(file,'utf8'),imports=[];
 // Deliberately bounded to literal ESM imports/re-exports and import('...').
 const pattern=/\b(?:import|export)\s+[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*(?:\(\s*)?['"]([^'"]+)['"]/g;
 for(const match of source.matchAll(pattern))imports.push(match[1]??match[2]);
 graph.set(file,imports);
 for(const specifier of imports){
  const target=resolveImport(specifier,file);
  if(nameOf(file).startsWith('frontend/')&&(isBuiltin(specifier)||target&&nameOf(target).startsWith('runner/')))errors.push(`${nameOf(file)} imports Node backend: ${specifier}`);
 }
}
// Follow the entire shared dependency graph, including the canonical pure rules.
const visited=new Set();
function checkShared(file){
 if(visited.has(file))return;visited.add(file);
 for(const specifier of graph.get(file)??[]){
  const target=resolveImport(specifier,file);
  if(!specifier.startsWith('.')){
   if(specifier!=='@nktkas/hyperliquid/utils')errors.push(`${nameOf(file)} imports a non-shared dependency: ${specifier}`);
   continue;
  }
  const name=target&&nameOf(target);
  if(!name||!name.startsWith('shared/')&&!pureCore.has(name)){errors.push(`${nameOf(file)} imports outside shared/pure rules: ${specifier}`);continue;}
  checkShared(target);
 }
}
for(const file of files.filter(file=>nameOf(file).startsWith('shared/')))checkShared(file);
if(errors.length){for(const error of new Set(errors))process.stderr.write(error+'\n');process.exitCode=1;}
else console.log(`Structure OK: ${files.length} source modules; frontend/Node and shared adapter boundaries checked. Literal module imports only; runtime globals and third-party internals are not inspected.`);
