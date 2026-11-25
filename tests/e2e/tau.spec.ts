import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';

const fireblade='Cadre Fireblade',breachers='Breacher Team',devilfish='Devilfish',coldstar='Commander In Coldstar Battlesuit';
const starscythes='Crisis Starscythe Battlesuits',pathfinders='Pathfinder Team',stealth='Stealth Battlesuits',riptide='Riptide Battlesuit';
const flesh='Kroot Flesh Shaper',war='Kroot War Shaper',trail='Kroot Trail Shaper',carnivores='Kroot Carnivores',farstalkers='Kroot Farstalkers';
const shieldline='Tidewall Shieldline',broadsides='Broadside Battlesuits',ghostkeel='Ghostkeel Battlesuit';
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
  const option=options.find(o=>key(optionItems(o.text))===key(items));
  if(option)matches.push({field:fields.nth(i),option});
 }
 expect(matches,'One equipment field supports '+unit+' / '+owner+' / '+items.join(', ')).toHaveLength(1);
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
 await page.goto('./');await page.getByLabel('Army faction',{exact:true}).selectOption('T’au Empire');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(strike?'Strike Force':'Incursion');
 for(const detachment of strike?['Kroot Hunting Pack','Advanced Acquisition Cadre']:['Mont’ka'])await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
 const units=strike?[flesh,war,carnivores,trail,farstalkers,'Kroot Lone-Spear','Krootox Rampagers','Krootox Riders','Kroot Hounds',carnivores,stealth,pathfinders,'Darkstrider',breachers,fireblade,devilfish,shieldline,'Strike Team',broadsides,ghostkeel,coldstar]:[fireblade,breachers,devilfish,coldstar,starscythes,pathfinders,stealth,riptide,'Kroot Hounds','Krootox Riders'];
 for(const unit of units){await page.getByLabel('Select unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Add',exact:true}).click();}
 await field(page,'Models for squad','Krootox Riders').selectOption('3');
 await field(page,'Attach squad',fireblade).selectOption(breachers+'#1');
 await equip(page,fireblade,'',['Gun drone','Gun drone','Twin pulse carbine','Twin pulse carbine']);
 await equip(page,breachers,'Breacher Fire Warrior Shas’ui ·',['Guardian Drone','Shield Drone']);
 await equip(page,coldstar,'Drones',['Gun drone','Shield Drone','Twin pulse carbine']);
 await equip(page,pathfinders,'Pathfinder Shas’ui ·',['Recon drone','Drone burst cannon']);
 await equip(page,pathfinders,'Pathfinder Shas’ui ·',['Pulse carbine','Semi-automatic grenade launcher']);
 await equip(page,stealth,'Stealth Shas’vre ·',['Gun drone','Marker drone','Twin pulse carbine']);
 await equip(page,stealth,'Stealth Shas’ui 1 ·',['Homing beacon']);
 await equip(page,stealth,'Stealth Shas’vre ·',['Fusion blaster']);await equip(page,stealth,'Stealth Shas’ui 1 ·',['Fusion blaster']);
 if(!strike){
  await field(page,'Attach squad',coldstar).selectOption(starscythes+'#1');await page.getByLabel('Warlord',{exact:true}).selectOption(coldstar+'#1');
  await field(page,'11th upgrade for squad',fireblade).selectOption('Strategic Conqueror');await field(page,'11th upgrade for squad',coldstar).selectOption('Exemplar of the Mont’ka');
  for(const owner of ['Crisis Starscythe Shas’ui 1 ·','Crisis Starscythe Shas’ui 2 ·','Crisis Starscythe Shas’vre ·']){
   await equip(page,starscythes,owner,['T’au flamer','T’au flamer']);await equip(page,starscythes,owner,['Gun drone','Shield Drone','Twin pulse carbine']);
  }
  for(let n=1;n<=2;n++)await equip(page,pathfinders,'Pathfinder '+n+' ·',['Ion rifle']);
  await equip(page,pathfinders,'Pathfinder 3 ·',['Rail rifle']);
  await equip(page,riptide,'',['Ion accelerator']);await equip(page,riptide,'Drones',['Missile Drone','Missile Drone','Missile pod','Missile pod']);
 }else{
  for(let n=1;n<=2;n++)await field(page,'Models for squad',carnivores,n).selectOption('20');
  await field(page,'Models for squad','Krootox Rampagers').selectOption('6');await field(page,'Models for squad','Kroot Hounds').selectOption('10');await field(page,'Models for squad',broadsides).selectOption('2');
  for(const [leader,body] of [[flesh,carnivores],[war,carnivores],[trail,farstalkers],['Darkstrider',pathfinders]])await field(page,'Attach squad',leader).selectOption(body+'#1');
  await page.getByLabel('Warlord',{exact:true}).selectOption(war+'#1');
  for(const [unit,upgrade] of [[flesh,'Borthrod Gland'],[trail,'Nomadic Hunter'],[stealth,'Negation Emitters']])await field(page,'11th upgrade for squad',unit).selectOption(upgrade);
  for(let n=1;n<=2;n++)await equip(page,carnivores,'Kroot Carnivore '+n+' ·',['Close combat weapon','Tanglebomb launcher']);
  await equip(page,farstalkers,'Kroot Farstalker 1 ·',['Farstalker firearm','Pech’ra']);await equip(page,farstalkers,'Kroot Farstalker 2 ·',['Dvorgite skinner']);
  await equip(page,farstalkers,'Kroot Kill-broker ·',['T’au-tech rifle']);await equip(page,shieldline,'',['Tidewall defence platform']);
  await equip(page,'Strike Team','Fire Warrior Shas’ui ·',['Guardian Drone','Marker drone']);await equip(page,'Strike Team','Fire Warrior 1 ·',['Pulse carbine']);
  for(const owner of ['Broadside Shas’ui 1 ·','Broadside Shas’vre ·'])await equip(page,broadsides,owner,['High-yield missile pods']);
  await equip(page,broadsides,'Broadside Shas’ui 1 ·',['Missile Drone','Missile Drone','Missile pod','Missile pod']);await equip(page,broadsides,'Broadside Shas’vre ·',['Shield Drone','Shield Drone']);
  await equip(page,ghostkeel,'',['Cyclic ion raker']);
  for(let n=1;n<=2;n++)await equip(page,pathfinders,'Pathfinder '+n+' ·',['Ion rifle']);
 }
}
async function reopen(page:Page){
 page.once('dialog',d=>d.accept('Second force'));await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');await page.reload();
}

test('mobile 1,000-point Mont’ka saves paid Crisis guns, physical drone bearers and guided formations through all eleven PDF bookmarks',async({page},info)=>{
 test.setTimeout(180_000);await page.setViewportSize({width:390,height:844});
 await build(page);await total(page,1000);await reopen(page);await total(page,1000);
 await expect(field(page,'Attach squad',coldstar)).toHaveValue(starscythes+'#1');await expect(field(page,'Attach squad',fireblade)).toHaveValue(breachers+'#1');
 await expect(field(page,'11th upgrade for squad',coldstar)).toHaveValue('Exemplar of the Mont’ka');
 await expectGear(page,starscythes,'Crisis Starscythe Shas’ui 2 ·',['T’au flamer','T’au flamer']);await expectGear(page,fireblade,'',['Gun drone','Gun drone','Twin pulse carbine','Twin pulse carbine']);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Shooting');
 await expect(phaseCard(page,'For the Greater Good · Select Observers')).toContainText(starscythes+'#1');
 await expect(phaseCard(page,'For the Greater Good · Guided attacks')).toContainText('Spotted');
 await expect(phaseCard(page,'Coldstar Commander')).toContainText('Move 12″');
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,devilfish+'#1 · Declare passengers')).toContainText(breachers+'#1 (11 models)');
 await expect(printCard(page,devilfish+'#1 · Declare passengers')).not.toContainText(starscythes+'#1');
 const crisisGuns=printCard(page,starscythes+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(crisisGuns).toContainText('6 × T’au flamer');await expect(crisisGuns).toContainText('3 × Twin pulse carbine');await expect(crisisGuns).not.toContainText('Burst cannon');
 const firebladeGuns=printCard(page,fireblade+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(firebladeGuns).toContainText('2 × Twin pulse carbine');
 await expect(printCard(page,'Nova Charge')).toContainText('one ranged weapon');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Kroot and Acquisition force saves paired Shapers, actual drone equipment and a single upgraded Shieldline through printing',async({page},info)=>{
 test.setTimeout(180_000);await page.setViewportSize({width:1440,height:900});
 await build(page,true);await total(page,2000);await reopen(page);await total(page,2000);
 await expect(field(page,'Attach squad',flesh)).toHaveValue(carnivores+'#1');await expect(field(page,'Attach squad',war)).toHaveValue(carnivores+'#1');await expect(field(page,'Attach squad',trail)).toHaveValue(farstalkers+'#1');
 await expect(field(page,'11th upgrade for squad',stealth)).toHaveValue('Negation Emitters');await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue(war+'#1');
 await expectGear(page,shieldline,'',['Tidewall defence platform']);await expectGear(page,broadsides,'Broadside Shas’ui 1 ·',['Missile Drone','Missile Drone','Missile pod','Missile pod']);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Fight');
 await expect(phaseCard(page,'Rites of Feasting')).toContainText(carnivores+'#1');
 await expect(phaseCard(page,'Hunter’s Instincts')).toContainText('KROOT');
 await page.emulateMedia({media:'print'});
 const transport=printCard(page,shieldline+'#1 · Declare passengers');
 await expect(transport).toContainText('Capacity 22');await expect(transport).toContainText(pathfinders+'#1 (11 models)');await expect(transport).toContainText(breachers+'#1 (11 models)');await expect(transport).not.toContainText(carnivores+'#1');
 await expect(printCard(page,'Tidewall Defence Platform')).toContainText('same single model');
 await expect(printCard(page,stealth+'#1 · Negation Emitters').first()).toContainText('Stealth');
 const broadsideGuns=printCard(page,broadsides+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(broadsideGuns).toContainText('2 × High-yield missile pods');await expect(broadsideGuns).toContainText('2 × Missile pod');await expect(broadsideGuns).not.toContainText('Heavy rail rifle');
 const farstalkerGuns=printCard(page,farstalkers+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(farstalkerGuns).toContainText('1 × Dvorgite skinner');await expect(farstalkerGuns).toContainText('1 × T’au-tech rifle');
 await verifyPrint(page,info);
});
