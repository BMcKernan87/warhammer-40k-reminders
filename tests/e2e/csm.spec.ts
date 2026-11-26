import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';

const prince='Heretic Astartes Daemon Prince With Wings',masters='Masters of the Maelstrom';
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const field=(page:Page,kind:string,unit:string,n=1)=>page.getByLabel(kind+' '+unit+'#'+n,{exact:true});
const gearFields=(page:Page,unit:string,owner:string,n=1)=>page.getByLabel(new RegExp('^'+escaped(owner)+'.*for '+escaped(unit+'#'+n)+'$'));
const key=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
function optionItems(label:string):string[]{
 if(label==='None')return [];
 return label.split(' + ').flatMap(part=>{const m=part.match(/^(\d+) × (.+)$/);return m?Array(+m[1]).fill(m[2]):[part];});
}
async function gearChoice(page:Page,unit:string,owner:string,items:string[],n=1){
 const fields=gearFields(page,unit,owner,n),matches=[];
 for(let i=0;i<await fields.count();i++){
  const options=await fields.nth(i).locator('option').evaluateAll(options=>options.map(o=>({value:(o as HTMLOptionElement).value,text:o.textContent??''})));
  const option=options.find(o=>key(optionItems(o.text))===key(items));if(option)matches.push({field:fields.nth(i),option});
 }
 expect(matches,'One legal equipment field for '+unit+' / '+owner+' / '+items.join(', ')).toHaveLength(1);
 return matches[0];
}
async function equip(page:Page,unit:string,owner:string,items:string[],n=1){const choice=await gearChoice(page,unit,owner,items,n);await choice.field.selectOption(choice.option.value);}
async function expectGear(page:Page,unit:string,owner:string,items:string[],n=1){const choice=await gearChoice(page,unit,owner,items,n);await expect(choice.field).toHaveValue(choice.option.value);}
function phaseCard(page:Page,title:string){return page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..').locator('.check').filter({has:page.getByText(title,{exact:true})});}
function printCard(page:Page,title:string){return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');}
async function total(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
async function build(page:Page,strike=false){
 await page.goto('./');await page.getByLabel('Army faction',{exact:true}).selectOption('Chaos Space Marines');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(strike?'Strike Force':'Incursion');
 for(const detachment of strike?['Cult of the Arkifane','Cabal of Chaos']:['Pactbound Zealots'])await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
 const units=strike?['Chaos Lord',masters,'Legionaries','Chaos Rhino','Dark Apostle','Chosen','Chaos Rhino','Vashtorr The Arkifane','Defiler','Forgefiend','Warpsmith','Obliterators','Legionaries','Chaos Bikers']:['Chaos Lord','Chosen','Master Of Executions','Chaos Rhino',prince,'Plague Marines','Cultist Mob','Raptors','Forgefiend'];
 for(const unit of units){await page.getByLabel('Select unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Add',exact:true}).click();}
 await equip(page,'Forgefiend','Forgefiend jaws',['Armoured limbs','Ectoplasma cannon']);await equip(page,'Forgefiend','Hades autocannon',['Ectoplasma cannon','Ectoplasma cannon']);
 if(!strike){
  for(const [unit,mark] of [['Chaos Lord','Nurgle'],['Chosen','Nurgle'],['Master Of Executions','Nurgle'],['Chaos Rhino','Nurgle'],[prince,'Slaanesh'],['Cultist Mob','Tzeentch'],['Raptors','Khorne'],['Forgefiend','Nurgle']])await field(page,'Chaos allegiance for squad',unit).selectOption(mark);
  await page.getByLabel('Warlord',{exact:true}).selectOption(prince+'#1');
  await field(page,'Attach squad','Chaos Lord').selectOption('Chosen#1');await field(page,'Attach squad','Master Of Executions').selectOption('Chosen#1');
  await field(page,'11th upgrade for squad','Chaos Lord').selectOption('Orbs of Unlife');await field(page,'11th upgrade for squad',prince).selectOption('Intoxicating Elixir');
  await equip(page,'Chosen','Chosen Champion ·',['Boltgun','Plasma pistol','Power fist']);await equip(page,'Chosen','Chosen Champion ·',['Chaos icon']);
  await equip(page,'Chosen','Chosen 1 ·',['Accursed weapon','Bolt pistol','Combi-weapon']);
  await equip(page,'Plague Marines','Plague Champion ·',['Plasma pistol']);await equip(page,'Plague Marines','Plague Champion ·',['Power fist']);
  await equip(page,'Plague Marines','Plague Marine 1 ·',['Boltgun','Icon of despair']);await equip(page,'Plague Marines','Plague Marine 2 ·',['Blight launcher']);
  await equip(page,'Plague Marines','Plague Marine 3 ·',['Heavy plague weapon']);await equip(page,'Plague Marines','Plague Marine 4 ·',['Plague spewer']);
 }else{
  await field(page,'Models for squad','Legionaries',2).selectOption('10');await field(page,'Models for squad','Chaos Bikers').selectOption('6');
  await page.getByLabel('Warlord',{exact:true}).selectOption('Vashtorr The Arkifane#1');
  await field(page,'Attach squad','Chaos Lord').selectOption('Legionaries#1');await field(page,'Attach squad',masters).selectOption('Legionaries#1');await field(page,'Attach squad','Dark Apostle').selectOption('Chosen#1');
  await field(page,'Attach squad','Warpsmith').selectOption('Legionaries#2');
  for(const [unit,upgrade] of [['Chaos Lord','Cybinfernal Font'],['Dark Apostle','Touched by the Warp'],['Warpsmith','Crown of Worms']])await field(page,'11th upgrade for squad',unit).selectOption(upgrade);
  await equip(page,'Defiler','Heavy baleflamer',['Hades lascannon','Hades lascannon']);await equip(page,'Defiler','Hades battle cannon',['Ectoplasma destructor']);
  await equip(page,'Legionaries','Aspiring Champion ·',['Heavy melee weapon','Plasma pistol']);await equip(page,'Legionaries','Aspiring Champion ·',['Chaos icon']);
  await equip(page,'Legionaries','Legionary 1 ·',['Lascannon']);await equip(page,'Legionaries','Legionary 2 ·',['Balefire tome']);
  await equip(page,'Legionaries','Aspiring Champion ·',['Accursed weapon','Accursed weapon'],2);await equip(page,'Legionaries','Legionary 1 ·',['Heavy bolter'],2);await equip(page,'Legionaries','Legionary 2 ·',['Missile launcher'],2);
  await equip(page,'Chaos Bikers','Biker Champion ·',['Power fist']);await equip(page,'Chaos Bikers','Biker Champion ·',['Chaos icon']);
  await equip(page,'Chaos Bikers','Chaos Biker 1 ·',['Combi-bolter','Plasma gun']);await equip(page,'Chaos Bikers','Chaos Biker 2 ·',['Combi-weapon']);
 }
}
async function reopen(page:Page){
 page.once('dialog',d=>d.accept('Second force'));await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');await page.reload();
}

test('mobile 1,000-point Pactbound army saves marks, Prince allegiance, attached Support and Cult passengers through all eleven PDF bookmarks',async({page},info)=>{
 test.setTimeout(180_000);await page.setViewportSize({width:390,height:844});
 await build(page);await total(page,1000);await reopen(page);await total(page,1000);
 await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue(prince+'#1');
 await expect(field(page,'Chaos allegiance for squad',prince)).toHaveValue('Slaanesh');await expect(field(page,'Chaos allegiance for squad','Cultist Mob')).toHaveValue('Tzeentch');
 await expect(field(page,'Chaos allegiance for squad','Raptors')).toHaveValue('Khorne');await expect(field(page,'Chaos allegiance for squad','Chaos Rhino')).toHaveValue('Nurgle');
 await expect(field(page,'Attach squad','Chaos Lord')).toHaveValue('Chosen#1');await expect(field(page,'Attach squad','Master Of Executions')).toHaveValue('Chosen#1');
 await expect(field(page,'11th upgrade for squad',prince)).toHaveValue('Intoxicating Elixir');
 await expectGear(page,'Chosen','Chosen Champion ·',['Boltgun','Plasma pistol','Power fist']);await expectGear(page,'Plague Marines','Plague Marine 1 ·',['Boltgun','Icon of despair']);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Shooting');
 await expect(phaseCard(page,'Chosen#1 · Dark Pacts')).toContainText('Chaos icon');
 await expect(phaseCard(page,'Chosen#1 · Dark Pacts')).toContainText('Master Of Executions#1');
 await expect(phaseCard(page,'Plague Marines#1 · Dark Pacts')).toHaveCount(0);
 await page.emulateMedia({media:'print'});
 const cargo=printCard(page,'Chaos Rhino#1 · Declare passengers');
 await expect(cargo).toContainText('Chosen#1 (7 models; 7 spaces)');await expect(cargo).toContainText('Plague Marines#1 (5 models; 5 spaces)');
 await expect(cargo).not.toContainText('Cultist Mob#1');await expect(cargo).not.toContainText('Raptors#1');
 const guns=printCard(page,'Forgefiend#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(guns).toContainText('3 × Ectoplasma cannon');await expect(guns).not.toContainText('Hades autocannon');
 const cultGuns=printCard(page,'Plague Marines#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(cultGuns).toContainText('1 × Blight launcher');await expect(cultGuns).toContainText('1 × Plague spewer');
 await expect(printCard(page,'Orbs of Unlife').first()).toContainText('Chaos Lord#1');
 await expect(printCard(page,'Intoxicating Elixir').first()).toContainText(prince+'#1');
 await expect(printCard(page,'Daemonic Allegiance').first()).toContainText('Slaanesh');
 await expect(printCard(page,'Daemonic Allegiance · Slaanesh').first()).toContainText('2″');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Arkifane/Cabal army saves Font formation, personal Touched bearer and paid daemon engines through printing',async({page},info)=>{
 test.setTimeout(180_000);await page.setViewportSize({width:1440,height:900});
 await build(page,true);await total(page,2000);await reopen(page);await total(page,2000);
 await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue('Vashtorr The Arkifane#1');
 await expect(field(page,'Attach squad','Chaos Lord')).toHaveValue('Legionaries#1');await expect(field(page,'Attach squad',masters)).toHaveValue('Legionaries#1');await expect(field(page,'Attach squad','Dark Apostle')).toHaveValue('Chosen#1');
 await expect(field(page,'Attach squad','Warpsmith')).toHaveValue('Legionaries#2');
 await expect(field(page,'11th upgrade for squad','Chaos Lord')).toHaveValue('Cybinfernal Font');await expect(field(page,'11th upgrade for squad','Dark Apostle')).toHaveValue('Touched by the Warp');
 await expect(field(page,'Models for squad','Legionaries',2)).toHaveValue('10');await expect(field(page,'Models for squad','Chaos Bikers')).toHaveValue('6');
 await expectGear(page,'Defiler','Heavy baleflamer',['Hades lascannon','Hades lascannon']);await expectGear(page,'Legionaries','Aspiring Champion ·',['Accursed weapon','Accursed weapon'],2);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Shooting');
 await expect(phaseCard(page,'Legionaries#1 · Dark Pacts')).toContainText('Masters of the Maelstrom#1');
 await page.emulateMedia({media:'print'});
 for(const n of [1,2]){
  const cargo=printCard(page,'Chaos Rhino#'+n+' · Declare passengers');
  await expect(cargo).toContainText('Legionaries#1 (11 models; 11 spaces)');await expect(cargo).toContainText('Chosen#1 (8 models; 8 spaces)');
  await expect(cargo).not.toContainText('Masters of the Maelstrom#1 (5 models');await expect(cargo).not.toContainText('Dark Apostle#1 (3 models');
  await expect(cargo).not.toContainText('Obliterators#1');await expect(cargo).not.toContainText('Chaos Bikers#1');
 }
 const guns=printCard(page,'Defiler#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(guns).toContainText('2 × Hades lascannon');await expect(guns).toContainText('1 × Ectoplasma destructor');await expect(guns).not.toContainText('Hades battle cannon');
 await expect(printCard(page,'Forgefiend#1 · Ranged weapon profiles').filter({hasText:'Your turn'})).toContainText('3 × Ectoplasma cannon');
 await expect(printCard(page,'Legionaries#2 · Melee weapon profiles').filter({hasText:'Either turn'}).first()).toContainText('2 × Accursed weapon');
 const soul=printCard(page,'Soul Forge Boons · 5+ invulnerable save').first();
 await expect(soul).toContainText('Legionaries#1');await expect(soul).not.toContainText('Legionaries#2');
 await expect(printCard(page,'Touched by the Warp').first()).toContainText('Dark Apostle#1');
 await expect(printCard(page,'Touched by the Warp').first()).toContainText('Character');
 await expect(printCard(page,'Touched by the Warp').first()).toContainText('Dark Disciples');
 const wellspring=printCard(page,'Empyric Wellspring').filter({hasText:'Your turn'});
 await expect(wellspring).toContainText('Legionaries#1');await expect(wellspring).toContainText('Chosen#1');
 await verifyPrint(page,info);
});
