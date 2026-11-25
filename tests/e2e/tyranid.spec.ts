import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';

const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const field=(page:Page,kind:string,unit:string,n=1)=>page.getByLabel(kind+' '+unit+'#'+n,{exact:true});
const key=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
function optionItems(label:string):string[]{
 if(label==='None')return [];
 return label.split(' + ').flatMap(part=>{const m=part.match(/^(\d+) × (.+)$/);return m?Array(+m[1]).fill(m[2]):[part];});
}
async function equip(page:Page,unit:string,owner:string,items:string[],n=1){
 const fields=page.getByLabel(new RegExp('^'+escaped(owner)+'.*for '+escaped(unit+'#'+n)+'$')),matches=[];
 for(let i=0;i<await fields.count();i++){
  const options=await fields.nth(i).locator('option').evaluateAll(options=>options.map(o=>({value:(o as HTMLOptionElement).value,text:o.textContent??''})));
  const option=options.find(o=>key(optionItems(o.text))===key(items));if(option)matches.push({field:fields.nth(i),option});
 }
 expect(matches,'One legal equipment field for '+unit+' / '+owner).toHaveLength(1);
 await matches[0].field.selectOption(matches[0].option.value);
}
async function brood(page:Page,base:string,specialists:number,n=1){
 const extras=['Shardlauncher','Spike rifle','Strangleweb'].map(s=>(specialists>1?specialists+' × ':'')+s);
 await page.getByLabel('Brood weapons for Termagants#'+n,{exact:true}).selectOption(base+' + '+extras.join(' + '));
}
function phaseCard(page:Page,title:string){return page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..').locator('.check').filter({has:page.getByText(title,{exact:true})});}
function printCard(page:Page,title:string){return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');}
async function total(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
async function build(page:Page,strike=false){
 await page.goto('./');await page.getByLabel('Army faction',{exact:true}).selectOption('Tyranids');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(strike?'Strike Force':'Incursion');
 await page.getByRole('checkbox',{name:new RegExp(strike?'Invasion Fleet':'Subterranean Assault')}).check();
 const units=strike?['Hive Tyrant','Tyrant Guard','Neurotyrant','Zoanthropes','Tervigon','Termagants','Termagants','Tyrannofex','Biovores','Tyrannocyte','Exocrine','Deathleaper','Lictor','Venomthropes','Psychophage','Gargoyles','Ripper Swarms']:['Trygon','Hyperadapted Raveners','Raveners','Tyrannocyte','Broodlord','Genestealers','Termagants','Biovores','Gargoyles','Mucolid Spores','Neurogaunts'];
 for(const unit of units){await page.getByLabel('Select unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Add',exact:true}).click();}
 await field(page,'Models for squad','Termagants').selectOption('20');
 if(!strike){
  await page.getByRole('checkbox',{name:'Promote Trygon#1 to Character',exact:true}).check();
  await field(page,'11th upgrade for squad','Trygon').selectOption('Trygon Prime');await page.getByLabel('Warlord',{exact:true}).selectOption('Trygon#1');
  await field(page,'Attach squad','Hyperadapted Raveners').selectOption('Raveners#1');await field(page,'Attach squad','Broodlord').selectOption('Genestealers#1');
  await brood(page,'Termagant devourer',2);
 }else{
  await field(page,'Models for squad','Termagants',2).selectOption('20');await field(page,'Models for squad','Tyrant Guard').selectOption('6');await field(page,'Models for squad','Zoanthropes').selectOption('6');await field(page,'Models for squad','Ripper Swarms').selectOption('3');
  await field(page,'Attach squad','Hive Tyrant').selectOption('Tyrant Guard#1');await field(page,'Attach squad','Neurotyrant').selectOption('Zoanthropes#1');await page.getByLabel('Warlord',{exact:true}).selectOption('Hive Tyrant#1');
  for(const [unit,upgrade] of [['Hive Tyrant','Adaptive Biology'],['Neurotyrant','Perfectly Adapted'],['Tervigon','Synaptic Linchpin']])await field(page,'11th upgrade for squad',unit).selectOption(upgrade);
  await equip(page,'Hive Tyrant','',['Heavy venom cannon','Monstrous bonesword and lash whip']);
  await equip(page,'Tyrant Guard','Tyrant Guard 1 ·',['Crushing claws and rending claws']);await equip(page,'Tyrant Guard','Tyrant Guard 2 ·',['Bone cleaver, lash whip and rending claws']);
  await brood(page,'Fleshborer',1);await brood(page,'Termagant spinefists',2,2);
  await equip(page,'Tyrannofex','',['Rupture cannon']);await page.getByLabel('Brood ranged weapons for Ripper Swarms#1',{exact:true}).selectOption('Spinemaws');
 }
}
async function reopen(page:Page){
 page.once('dialog',d=>d.accept('Second force'));await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');await page.reload();
}

test('mobile 1,000-point Subterranean army saves promoted Trygon, multi-model Ravener attachment and weighted cargo through all eleven PDF bookmarks',async({page},info)=>{
 test.setTimeout(180_000);await page.setViewportSize({width:390,height:844});
 await build(page);await total(page,1000);await reopen(page);await total(page,1000);
 await expect(page.getByRole('checkbox',{name:'Promote Trygon#1 to Character',exact:true})).toBeChecked();
 await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue('Trygon#1');await expect(field(page,'11th upgrade for squad','Trygon')).toHaveValue('Trygon Prime');
 await expect(field(page,'Attach squad','Hyperadapted Raveners')).toHaveValue('Raveners#1');await expect(field(page,'Attach squad','Broodlord')).toHaveValue('Genestealers#1');
 await expect(page.getByLabel('Brood weapons for Termagants#1',{exact:true})).toHaveValue('Termagant devourer + 2 × Shardlauncher + 2 × Spike rifle + 2 × Strangleweb');
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Command');
 await expect(phaseCard(page,'Shadow in the Warp')).toContainText('Ravener Prime');
 await page.getByLabel('Show phase').selectOption('Fight');await expect(phaseCard(page,'Synapse · Melee strength')).toContainText('Raveners#1');
 await page.emulateMedia({media:'print'});
 const cargo=printCard(page,'Tyrannocyte#1 · Declare passengers');
 await expect(cargo).toContainText('Genestealers#1 (6 models; 18 spaces)');await expect(cargo).toContainText('Termagants#1 (20 models; 20 spaces)');await expect(cargo).not.toContainText('Raveners#1');
 await expect(printCard(page,'Tyrannocyte#1 · Aerial Seeding reserves')).toContainText('do not count');
 await expect(printCard(page,'Tyrannocyte#1 · Aerial Seeding arrival')).toContainText('more than 8″');
 const guns=printCard(page,'Termagants#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(guns).toContainText('14 × Termagant devourer');await expect(guns).toContainText('2 × Shardlauncher');await expect(guns).toContainText('2 × Strangleweb');await expect(guns).not.toContainText('Fleshborer');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Invasion force saves separate Termagant broods, paid Tyrannofex gun and actual Leader effects through printing',async({page},info)=>{
 test.setTimeout(180_000);await page.setViewportSize({width:1440,height:900});
 await build(page,true);await total(page,2000);await reopen(page);await total(page,2000);
 await expect(field(page,'Attach squad','Hive Tyrant')).toHaveValue('Tyrant Guard#1');await expect(field(page,'Attach squad','Neurotyrant')).toHaveValue('Zoanthropes#1');
 await expect(field(page,'11th upgrade for squad','Tervigon')).toHaveValue('Synaptic Linchpin');await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue('Hive Tyrant#1');
 await expect(page.getByLabel('Brood weapons for Termagants#1',{exact:true})).toHaveValue('Fleshborer + Shardlauncher + Spike rifle + Strangleweb');
 await expect(page.getByLabel('Brood weapons for Termagants#2',{exact:true})).toHaveValue('Termagant spinefists + 2 × Shardlauncher + 2 × Spike rifle + 2 × Strangleweb');
 await expect(page.getByLabel('Brood ranged weapons for Ripper Swarms#1',{exact:true})).toHaveValue('Spinemaws');
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Shooting');
 await expect(phaseCard(page,'Brood Progenitor')).toContainText('Termagants#1');await expect(phaseCard(page,'Brood Progenitor')).toContainText('Termagants#2');
 await page.emulateMedia({media:'print'});
 const cargo=printCard(page,'Tyrannocyte#1 · Declare passengers');
 await expect(cargo).toContainText('Psychophage#1 (1 models; 1 spaces)');await expect(cargo).toContainText('Termagants#2 (20 models; 20 spaces)');
 await expect(cargo).not.toContainText('Tyrant Guard#1');await expect(cargo).not.toContainText('Zoanthropes#1');
 await expect(printCard(page,'Guardian Organism').first()).toContainText('actual Character models');
 const guns=printCard(page,'Tyrannofex#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(guns).toContainText('1 × Rupture cannon');await expect(guns).not.toContainText('Fleshborer hive');
 const second=printCard(page,'Termagants#2 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(second).toContainText('14 × Termagant spinefists');await expect(second).not.toContainText('Fleshborer');
 await expect(printCard(page,'Ripper Swarms#1 · Ranged weapon profiles').filter({hasText:'Your turn'})).toContainText('3 × Spinemaws');
 await verifyPrint(page,info);
});
