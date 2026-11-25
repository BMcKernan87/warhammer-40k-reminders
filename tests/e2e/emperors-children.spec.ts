import {expect,test,type Page} from '@playwright/test';

const army='Emperor’s Children',lord='Lord Exultant',blades='Flawless Blades',noise='Noise Marines';
const kakophonist='Lord Kakophonist',keeper='Keeper of Secrets',rhino='Chaos Rhino',raider='Chaos Land Raider';
async function begin(page:Page,battleSize:string,detachment:string){
 await page.goto('./');
 await page.getByLabel('Army faction',{exact:true}).selectOption(army);
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(battleSize);
 await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
}
async function add(page:Page,units:string[]){
 for(const unit of units){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 }
}
function field(page:Page,kind:string,unit:string){return page.getByLabel(kind+' '+unit+'#1',{exact:true});}
function phaseSubjects(page:Page,title:string){
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 return panel.locator('.check').filter({has:page.getByText(title,{exact:true})}).locator('.rule-subjects');
}
function printCard(page:Page,title:string){return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');}
async function cost(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}

test('mobile 1,000-point Court preserves its Exalted Patron formation, mixed sonic weapons and exact 13-seat Land Raider cargo',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:390,height:844});
 await begin(page,'Incursion','Court of the Phoenician');
 await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:/^Daemonettes$/})).toHaveCount(0);
 await add(page,[lord,blades,raider,rhino,noise,kakophonist,'Chaos Spawn','Maulerfiend']);
 await field(page,'Models for squad',blades).selectOption('6');
 const leader=field(page,'Attach squad',lord),upgrade=field(page,'11th upgrade for squad',lord);
 await upgrade.selectOption('Exalted Patron');
 await leader.selectOption(blades+'#1');
 await field(page,'Attach squad',kakophonist).selectOption(noise+'#1');
 await page.getByLabel('Warlord',{exact:true}).selectOption(lord+'#1');
 const spear=field(page,'Phoenix power spear alternatives for',lord);
 await spear.selectOption({label:'Screamer pistol'});
 const sonic=field(page,'Noise Marine 1 · Sonic blaster alternatives for',noise);
 await sonic.selectOption({label:'Blastmaster'});
 await field(page,'Noise Marine 2 · Sonic blaster alternatives for',noise).selectOption({label:'Blastmaster'});
 const rhinoArm=field(page,'Combi-bolter alternatives for',rhino);
 await rhinoArm.selectOption({label:'Combi-bolter + Combi-weapon + Havoc launcher'});
 await cost(page,1000);
 page.once('dialog',dialog=>dialog.accept('Spare force'));
 await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');
 await page.reload();
 await cost(page,1000);
 await expect(upgrade).toHaveValue('Exalted Patron');
 await expect(leader).toHaveValue(blades+'#1');
 await expect(sonic).toHaveValue('Blastmaster');
 await expect(spear).toHaveValue('Screamer pistol');
 await expect(rhinoArm).toHaveValue('Combi-bolter + Combi-weapon + Havoc launcher');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Shooting');
 const shooters=phaseSubjects(page,'Thrill Seekers');
 await expect(shooters).toContainText(noise+'#1');
 await expect(shooters).toContainText(blades+'#1');
 await expect(shooters).not.toContainText('Chaos Spawn#1');
 await expect(shooters).not.toContainText(lord+'#1');
 await page.emulateMedia({media:'print'});
 await expect(page.getByRole('region',{name:'Printable army reminders'}).locator('h3')).toHaveCount(11);
 const small=printCard(page,rhino+'#1 · Declare passengers');
 await expect(small).toContainText(noise+'#1');
 await expect(small).not.toContainText(blades+'#1');
 await expect(printCard(page,raider+'#1 · Declare passengers')).toContainText(blades+'#1 (13 spaces)');
});

test('desktop 2,000-point Carnival charges for two Defiler guns and the Keeper enhancement while reserving Thrill Seekers for its native formations',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:1440,height:900});
 await begin(page,'Strike Force','Carnival of Excess');
 await add(page,['Fulgrim',keeper,'Daemonettes','Fiends','Defiler',lord,'Tormentors',noise,kakophonist,raider,rhino,'War Dog Moirax']);
 const turret=field(page,'Heavy baleflamer + Heavy missile launcher alternatives for','Defiler');
 await turret.selectOption({label:'2 × Hades lascannon'});
 const warpWalker=field(page,'11th upgrade for squad',keeper);
 await warpWalker.selectOption('Warp Walker');
 await field(page,'Attach squad',lord).selectOption('Tormentors#1');
 await field(page,'Attach squad',kakophonist).selectOption(noise+'#1');
 await expect(page.getByText('Warlord: Fulgrim#1',{exact:true})).toBeVisible();
 await cost(page,2000);
 await page.reload();
 await expect(turret).toHaveValue('2 × Hades lascannon');
 await expect(warpWalker).toHaveValue('Warp Walker');
 await expect(field(page,'Attach squad',lord)).toHaveValue('Tormentors#1');
 await cost(page,2000);
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Charge');
 const charge=phaseSubjects(page,'Thrill Seekers');
 await expect(charge).toContainText('Tormentors#1');
 await expect(charge).toContainText('Fulgrim#1');
 await expect(charge).not.toContainText(keeper+'#1');
 await expect(charge).not.toContainText('Fiends#1');
 await expect(charge).not.toContainText('War Dog Moirax#1');
 await page.emulateMedia({media:'print'});
 const print=page.getByRole('region',{name:'Printable army reminders'});
 await expect(print.locator('h3')).toHaveCount(11);
 const aura=printCard(page,'Daemon Lord of Slaanesh').locator('.rule-subjects');
 await expect(aura).toContainText('Daemonettes#1');
 await expect(aura).toContainText('Fiends#1');
 await expect(aura).not.toContainText('Tormentors#1');
 await expect(printCard(page,rhino+'#1 · Declare passengers')).toContainText('Tormentors#1');
});
