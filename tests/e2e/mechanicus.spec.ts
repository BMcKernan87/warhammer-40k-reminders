import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';

const dominus='Tech-priest Dominus',manipulus='Tech-priest Manipulus',marshal='Skitarii Marshal';
const rangers='Skitarii Rangers',vanguard='Skitarii Vanguard',dunerider='Skorpius Dunerider',transvector='Archaeopter Transvector';
const walkers='Ironstrider Ballistarii',robots='Kastelan Robots',datasmith='Cybernetica Datasmith',battleclade='Servitor Battleclade';
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const field=(page:Page,kind:string,unit:string)=>page.getByLabel(kind+' '+unit+'#1',{exact:true});
const gear=(page:Page,unit:string,owner:string)=>page.getByLabel(new RegExp('^'+escaped(owner)+'.*for '+escaped(unit+'#1')+'$'));
function phaseCard(page:Page,title:string){return page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..').locator('.check').filter({has:page.getByText(title,{exact:true})});}
function printCard(page:Page,title:string){return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');}
async function total(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
async function build(page:Page,strike=false){
 await page.goto('./');
 await page.getByLabel('Army faction',{exact:true}).selectOption('Adeptus Mechanicus');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(strike?'Strike Force':'Incursion');
 await page.getByRole('checkbox',{name:new RegExp(strike?'Haloscreed Battle Clade':'Skitarii Hunter Cohort')}).check();
 const units=[dominus,marshal,rangers,dunerider,vanguard,walkers,'Pteraxii Skystalkers','Kataphron Breachers','Onager Dunecrawler','Hastarii Exterminators'];
 if(strike)units.push('Thulia Ghuld',datasmith,robots,transvector,manipulus,'Technoarcheologist',battleclade,'Hastarii Exterminators','Serberys Raiders');
 for(const unit of units){await page.getByLabel('Select unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Add',exact:true}).click();}
 await field(page,'Models for squad',walkers).selectOption('2');
 await field(page,'Attach squad',dominus).selectOption(rangers+'#1');
 await field(page,'Attach squad',marshal).selectOption(rangers+'#1');
 if(!strike){await field(page,'11th upgrade for squad',marshal).selectOption('Clandestine Infiltrator');await page.getByLabel('Warlord',{exact:true}).selectOption(dominus+'#1');}
 for(let n=1;n<=2;n++)await gear(page,walkers,'Ironstrider Ballistarii '+n+' · Twin cognis autocannon alternatives').selectOption({label:'Twin cognis lascannon'});
 for(const [unit,role,gun,device] of [[rangers,'Skitarii Ranger','Galvanic rifle','Omnispex'],[vanguard,'Skitarii Vanguard','Radium carbine','Enhanced data-tether']] as const){
  for(const [n,weapon] of [[1,'Arc rifle'],[2,'Plasma caliver'],[3,'Transuranic arquebus']] as const)await gear(page,unit,role+' '+n+' · '+gun+' alternatives').selectOption({label:weapon});
  await gear(page,unit,role+' 4 · '+gun+' alternatives').selectOption({label:device==='Omnispex'?gun+' + '+device:device+' + '+gun});
 }
 await gear(page,rangers,'Skitarii Ranger Alpha · Galvanic rifle alternatives').selectOption({label:'Mechanicus pistol'});
 await gear(page,rangers,'Skitarii Ranger Alpha · Alpha combat weapon').selectOption({label:'Alpha combat weapon'});
 await gear(page,'Kataphron Breachers','Kataphron Breacher 1 · Heavy arc rifle alternatives').selectOption({label:'Torsion cannon'});
 await gear(page,'Kataphron Breachers','Kataphron Breacher 2 · Arc claw alternatives').selectOption({label:'Hydraulic claw'});
 await gear(page,'Onager Dunecrawler','Eradication beamer alternatives').selectOption({label:'2 × Cognis heavy stubber + Neutron laser'});
 await gear(page,'Onager Dunecrawler','Broad spectrum data-tether').selectOption({label:'Broad spectrum data-tether'});
 if(strike){
  await field(page,'Models for squad',robots).selectOption('4');
  await field(page,'Attach squad',datasmith).selectOption(robots+'#1');
  await field(page,'Attach squad',manipulus).selectOption('Hastarii Exterminators#1');
  await field(page,'Attach squad','Technoarcheologist').selectOption(battleclade+'#1');
  await field(page,'11th upgrade for squad',datasmith).selectOption('Transoracular Dyad Wafers');
  await field(page,'11th upgrade for squad',manipulus).selectOption('Inloaded Lethality');
  await gear(page,robots,'Kastelan Robot 1 · Twin Kastelan fist alternatives').selectOption({label:'Close combat weapon + Twin Kastelan phosphor blaster'});
  await gear(page,robots,'Kastelan Robot 1 · Incendine combustor alternatives').selectOption({label:'Heavy phosphor blaster'});
  await gear(page,robots,'Kastelan Robot 2 · Twin Kastelan fist alternatives').selectOption({label:'Kastelan fist + Kastelan phosphor blaster'});
  await gear(page,battleclade,'Combat Servitor 1 · Phosphor blaster + Servo-claw alternatives').selectOption({label:'Meltagun + Servo-claw'});
  for(let n=2;n<=4;n++)await gear(page,battleclade,'Combat Servitor '+n+' · Phosphor blaster + Servo-claw alternatives').selectOption({label:'Incendine igniter + Servo-claw'});
  await gear(page,transvector,'Command uplink alternatives').selectOption({label:'Chaff launcher'});
 }
}
async function reopen(page:Page){
 page.once('dialog',d=>d.accept('Second force'));
 await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');await page.reload();
}

test('mobile 1,000-point Hunter saves Leader and Support, physical specialists and paid walker guns with transport Scouts and all eleven PDF bookmarks',async({page},info)=>{
 test.setTimeout(120_000);await page.setViewportSize({width:390,height:844});
 await build(page);await total(page,1000);await reopen(page);await total(page,1000);
 await expect(field(page,'Attach squad',dominus)).toHaveValue(rangers+'#1');await expect(field(page,'Attach squad',marshal)).toHaveValue(rangers+'#1');
 await expect(field(page,'11th upgrade for squad',marshal)).toHaveValue('Clandestine Infiltrator');
 await expect(gear(page,rangers,'Skitarii Ranger 4 · Galvanic rifle alternatives')).toHaveValue('Galvanic rifle + Omnispex');
 await expect(gear(page,walkers,'Ironstrider Ballistarii 2 · Twin cognis autocannon alternatives')).toHaveValue('Twin cognis lascannon');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Start of battle round');
 await expect(phaseCard(page,'Doctrina Imperatives · Select an imperative')).toContainText('Protector or Conqueror');
 await page.getByLabel('Show phase').selectOption('Shooting');
 await expect(phaseCard(page,'Control Edict').filter({hasText:'Your turn'})).toContainText(rangers+'#1');
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,dunerider+'#1 · Declare passengers')).toContainText(rangers+'#1 (12 spaces)');
 await expect(printCard(page,dunerider+'#1 · Scouts · passengers')).toContainText(rangers+'#1 (6″)');
 await expect(printCard(page,marshal+'#1 · Clandestine Infiltrator')).toContainText('another attached Leader or Support');
 const rangerGuns=printCard(page,rangers+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(rangerGuns).toContainText('6 × Galvanic rifle');await expect(rangerGuns).toContainText('1 × Arc rifle');await expect(rangerGuns).toContainText('1 × Plasma caliver');
 const walkerGuns=printCard(page,walkers+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(walkerGuns).toContainText('2 × Twin cognis lascannon');await expect(walkerGuns).not.toContainText('Twin cognis autocannon');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Haloscreed saves Thulia, attached Halo robots and fixed servitor gun bearers through reopen and phase-bookmarked printing',async({page},info)=>{
 test.setTimeout(120_000);await page.setViewportSize({width:1440,height:900});
 await build(page,true);await total(page,2000);await reopen(page);await total(page,2000);
 await expect(page.getByText('Warlord: Thulia Ghuld#1',{exact:true})).toBeVisible();
 await expect(field(page,'Attach squad',datasmith)).toHaveValue(robots+'#1');
 await expect(field(page,'Attach squad','Technoarcheologist')).toHaveValue(battleclade+'#1');
 await expect(field(page,'11th upgrade for squad',datasmith)).toHaveValue('Transoracular Dyad Wafers');
 await expect(field(page,'11th upgrade for squad',manipulus)).toHaveValue('Inloaded Lethality');
 await expect(gear(page,robots,'Kastelan Robot 1 · Twin Kastelan fist alternatives')).toHaveValue('Close combat weapon + Twin Kastelan phosphor blaster');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Command');
 await expect(phaseCard(page,'Battle Protocols')).toContainText('actual Kastelan Robot models');
 await expect(phaseCard(page,'Noospheric Transference')).toContainText('already have Halo Override');
 await page.getByLabel('Show phase').selectOption('Movement');
 await expect(phaseCard(page,'Aerial Deployment')).toContainText('first Movement phase');
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,dunerider+'#1 · Declare passengers')).toContainText(rangers+'#1 (12 spaces)');
 const transport=printCard(page,transvector+'#1 · Declare passengers');
 await expect(transport).toContainText('Hastarii Exterminators#1 (6 spaces)');
 await expect(transport).toContainText('Hastarii Exterminators#2 (5 spaces)');
 await expect(transport).not.toContainText(rangers+'#1');await expect(transport).not.toContainText(battleclade+'#1');
 await expect(printCard(page,datasmith+'#1 · Transoracular Dyad Wafers')).toContainText('until battle end');
 const robotGuns=printCard(page,robots+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(robotGuns).toContainText('3 × Incendine combustor');await expect(robotGuns).toContainText('1 × Heavy phosphor blaster');
 const servitorGuns=printCard(page,battleclade+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(servitorGuns).toContainText('1 × Heavy arc rifle');await expect(servitorGuns).toContainText('1 × Heavy bolter');
 await expect(servitorGuns).toContainText('3 × Incendine igniter');await expect(servitorGuns).toContainText('1 × Meltagun');
 await verifyPrint(page,info);
});
