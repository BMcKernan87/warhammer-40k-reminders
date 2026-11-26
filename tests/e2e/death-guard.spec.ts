import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';

const marines='Plague Marines',blights='Blightlord Terminators',pox='Lord of Poxes',putrifier='Biologus Putrifier',lord='Lord of Contagion';
const rhino='Chaos Rhino',raider='Chaos Land Raider',great='Great Unclean One',bell='Noxious Blightbringer';
const range='Nurgle’s Gift · Contagion Range',choose='Nurgle’s Gift · Choose a plague';
async function begin(page:Page,size:string,detachment:string){
 await page.goto('./');
 await page.getByLabel('Army faction',{exact:true}).selectOption('Death Guard');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(size);
 await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
}
async function add(page:Page,units:string[]){
 for(const unit of units){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 }
}
function field(page:Page,kind:string,unit:string){return page.getByLabel(kind+' '+unit+'#1',{exact:true});}
async function total(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
function phaseCard(page:Page,title:string){
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 return panel.locator('.check').filter({has:page.getByText(title,{exact:true})});
}
function printCard(page:Page,title:string){return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');}

test('mobile 1,000-point Champions of Contagion retains two Plague Marine Leaders and the three-model Terminator weapon in a printed roster',async({page},info)=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:390,height:844});
 await begin(page,'Incursion','Champions of Contagion');
 await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:/^Nurglings$/})).toHaveCount(0);
 await add(page,[pox,putrifier,marines,rhino,blights,lord,raider,'Daemon Prince of Nurgle with Wings']);
 await field(page,'Models for squad',marines).selectOption('10');
 await field(page,'Attach squad',pox).selectOption(marines+'#1');
 await field(page,'Attach squad',putrifier).selectOption(marines+'#1');
 await field(page,'Attach squad',lord).selectOption(blights+'#1');
 await page.getByLabel('Warlord',{exact:true}).selectOption(pox+'#1');
 const upgrade=field(page,'11th upgrade for squad',putrifier);
 await upgrade.selectOption('Final Ingredient');
 const icon=field(page,'Plague Marine 1 · Boltgun alternatives for',marines);
 await icon.selectOption({label:'Boltgun + Icon of despair'});
 const spewer=page.getByLabel(/Blightlord Terminator 1 · .*alternatives for Blightlord Terminators#1$/);
 await spewer.selectOption({label:'Close combat weapon + Plague spewer'});
 await total(page,1000);
 page.once('dialog',d=>d.accept('Second force'));
 await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');
 await page.reload();
 await total(page,1000);
 await expect(upgrade).toHaveValue('Final Ingredient');
 await expect(icon).toHaveValue('Boltgun + Icon of despair');
 await expect(spewer).toHaveValue('Close combat weapon + Plague spewer');
 await expect(field(page,'Attach squad',putrifier)).toHaveValue(marines+'#1');
 await expect(field(page,'Attach squad',pox)).toHaveValue(marines+'#1');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Start of battle round');
 const contagion=phaseCard(page,range);
 await expect(contagion).toContainText(pox+'#1 itself');
 await expect(contagion).toContainText('other models in '+marines+'#1');
 await page.emulateMedia({media:'print'});
 const small=printCard(page,rhino+'#1 · Declare passengers');
 await expect(small).toContainText(marines+'#1 (12 spaces)');
 await expect(small).not.toContainText(blights+'#1');
 await expect(printCard(page,raider+'#1 · Declare passengers')).toContainText(blights+'#1 (8 spaces)');
 await expect(printCard(page,choose)).toContainText('Skullsquirm');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Tallyband limits borrowed Contagion to qualifying daemons and keeps two Poxwalker Leaders across reloads',async({page},info)=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:1440,height:900});
 await begin(page,'Strike Force','Tallyband Summoners');
 await add(page,['Mortarion',great,'Nurglings','Plaguebearers','Beasts of Nurgle','Plague Drones','Defiler','Poxwalkers','Typhus',bell,'Plagueburst Crawler','War Dog Huntsman','Foetid Bloat-drone']);
 await field(page,'Models for squad','Poxwalkers').selectOption('20');
 await field(page,'Attach squad','Typhus').selectOption('Poxwalkers#1');
 await field(page,'Attach squad',bell).selectOption('Poxwalkers#1');
 const knell=field(page,'11th upgrade for squad',great);
 await knell.selectOption('Entropic Knell');
 const defiler=field(page,'Heavy baleflamer + Heavy missile launcher alternatives for','Defiler');
 await defiler.selectOption({label:'2 × Hades lascannon'});
 await expect(page.getByText('Warlord: Mortarion#1',{exact:true})).toBeVisible();
 await total(page,2000);
 await page.reload();
 await total(page,2000);
 await expect(knell).toHaveValue('Entropic Knell');
 await expect(defiler).toHaveValue('2 × Hades lascannon');
 await expect(field(page,'Attach squad',bell)).toHaveValue('Poxwalkers#1');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Start of battle round');
 const contagion=phaseCard(page,range);
 await expect(contagion).toContainText('within 7″');
 await expect(contagion).toContainText('12″');
 await expect(contagion).toContainText(great+'#1');
 await expect(contagion).toContainText('Nurglings#1');
 await expect(contagion).toContainText('Poxwalkers#1');
 await expect(contagion).not.toContainText('War Dog Huntsman#1');
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,choose)).toBeVisible();
 await verifyPrint(page,info);
});
