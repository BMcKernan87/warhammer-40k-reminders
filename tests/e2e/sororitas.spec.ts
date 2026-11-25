import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';

const sisters='Battle Sisters Squad',dominions='Dominion Squad',rhino='Sororitas Rhino';
const borrowedPriest='Ministorum Priest (Assigned Agent)',borrowedSanctifiers='Sanctifiers (Assigned Agent)';
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const field=(page:Page,kind:string,unit:string,n=1)=>page.getByLabel(kind+' '+unit+'#'+n,{exact:true});
const gear=(page:Page,unit:string,owner:string,n=1)=>page.getByLabel(new RegExp('^'+escaped(owner)+'.*for '+escaped(unit+'#'+n)+'$'));
function phaseCard(page:Page,title:string){return page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..').locator('.check').filter({has:page.getByText(title,{exact:true})});}
function printCard(page:Page,title:string){return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');}
async function total(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
async function build(page:Page,strike=false){
 await page.goto('./');
 await page.getByLabel('Army faction',{exact:true}).selectOption('Adepta Sororitas');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(strike?'Strike Force':'Incursion');
 await page.getByRole('checkbox',{name:new RegExp(strike?'Hallowed Martyrs':'Army of Faith')}).check();
 const units=['Canoness','Hospitaller',dominions,rhino,sisters,'Immolator','Retributor Squad','Mortifiers','Seraphim Squad','Palatine',strike?borrowedSanctifiers:sisters];
 if(strike)units.push('Morvenn Vahl','Paragon Warsuits','Castigator','Exorcist','Arco-flagellants','Ministorum Priest',borrowedPriest);
 for(const unit of units){await page.getByLabel('Select unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Add',exact:true}).click();}
 await field(page,'Models for squad','Mortifiers').selectOption('2');
 await field(page,'Attach squad','Canoness').selectOption(dominions+'#1');
 await field(page,'Attach squad','Hospitaller').selectOption(dominions+'#1');
 await field(page,'Attach squad','Palatine').selectOption(sisters+'#'+(strike?'1':'2'));
 await field(page,'11th upgrade for squad','Canoness').selectOption(strike?'Chaplet of Sacrifice':'Divine Aspect');
 if(!strike)await page.getByLabel('Warlord',{exact:true}).selectOption('Canoness#1');
 await gear(page,'Canoness','Bolt Pistol + Hallowed chainsword alternatives').selectOption({label:'Plasma pistol + Power weapon + Rod of Office'});
 for(let n=1;n<=4;n++){
  await gear(page,dominions,'Dominion '+n+' · Boltgun alternatives').selectOption({label:'Meltagun'});
  await gear(page,'Retributor Squad','Retributor '+n+' · Heavy bolter alternatives').selectOption({label:'Multi-melta'});
 }
 await gear(page,dominions,'Dominion 5 · Boltgun alternatives').selectOption({label:'Boltgun + Simulacrum imperialis'});
 await gear(page,sisters,'Battle Sister 1 · Boltgun alternatives').selectOption({label:'Multi-melta'});
 await gear(page,sisters,'Battle Sister 2 · Boltgun alternatives').selectOption({label:'Meltagun'});
 await gear(page,sisters,'Battle Sister 3 · Boltgun alternatives').selectOption({label:'Boltgun + Simulacrum imperialis'});
 await gear(page,'Immolator','Immolation flamers alternatives').selectOption({label:'Twin multi-melta'});
 await gear(page,'Mortifiers','Mortifier 1 · Anchorite sarcophagus').selectOption({label:'Anchorite sarcophagus'});
 for(let n=1;n<=2;n++)await gear(page,'Seraphim Squad','Seraphim '+n+' · Bolt pistol + Bolt pistol alternatives').selectOption({label:'2 × Ministorum hand flamer'});
 if(strike){
  await field(page,'Models for squad','Arco-flagellants').selectOption('10');
  await field(page,'Attach squad','Morvenn Vahl').selectOption('Paragon Warsuits#1');
  await field(page,'Attach squad','Ministorum Priest').selectOption('Arco-flagellants#1');
  await field(page,'Attach squad',borrowedPriest).selectOption(borrowedSanctifiers+'#1');
  for(const owner of ['Paragon Superior ·','Paragon 1 ·','Paragon 2 ·'])await gear(page,'Paragon Warsuits',owner+' Heavy bolter alternatives').selectOption({label:'Multi-melta'});
 }
}
async function reopen(page:Page){
 page.once('dialog',d=>d.accept('Second force'));
 await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');
 await page.reload();
}

test('mobile 1,000-point Army of Faith saves actual melta and paired pistols, an attached Support and split transport reminders with all eleven PDF bookmarks',async({page},info)=>{
 test.setTimeout(120_000);await page.setViewportSize({width:390,height:844});
 await build(page);await total(page,1000);await reopen(page);await total(page,1000);
 await expect(field(page,'11th upgrade for squad','Canoness')).toHaveValue('Divine Aspect');
 await expect(field(page,'Attach squad','Hospitaller')).toHaveValue(dominions+'#1');
 await expect(gear(page,'Canoness','Bolt Pistol + Hallowed chainsword alternatives')).toHaveValue('Plasma pistol + Power weapon + Rod of Office');
 await expect(gear(page,dominions,'Dominion 4 · Boltgun alternatives')).toHaveValue('Meltagun');
 await expect(gear(page,'Seraphim Squad','Seraphim 2 · Bolt pistol + Bolt pistol alternatives')).toHaveValue('2 × Ministorum hand flamer');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Command');
 await expect(phaseCard(page,'Sacred Healing')).toContainText('destroyed non-Character');
 await expect(phaseCard(page,'Acts of Faith · Substitute one die')).toContainText('up to two Acts of Faith');
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,rhino+'#1 · Declare passengers')).toContainText(dominions+'#1 (12 spaces)');
 const split=printCard(page,'Immolator#1 · Declare passengers');
 await expect(split).toContainText(sisters+'#1 (5 + 5 models)');
 await expect(split).toContainText('only one resulting half retains it');
 const guns=printCard(page,dominions+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(guns).toContainText('4 × Meltagun');await expect(guns).toContainText('6 × Boltgun');
 await expect(printCard(page,'Retributor Squad#1 · Ranged weapon profiles').filter({hasText:'Your turn'})).toContainText('4 × Multi-melta');
 await expect(printCard(page,'Seraphim Squad#1 · Ranged weapon profiles').filter({hasText:'Your turn'})).toContainText('4 × Ministorum hand flamer');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Hallowed Martyrs saves Vahl, paid Paragon guns and separate native and assigned Priests through reopen and phase-bookmarked printing',async({page},info)=>{
 test.setTimeout(120_000);await page.setViewportSize({width:1440,height:900});
 await build(page,true);await total(page,2000);await reopen(page);await total(page,2000);
 await expect(page.getByText('Warlord: Morvenn Vahl#1',{exact:true})).toBeVisible();
 await expect(field(page,'11th upgrade for squad','Canoness')).toHaveValue('Chaplet of Sacrifice');
 await expect(field(page,'Attach squad','Ministorum Priest')).toHaveValue('Arco-flagellants#1');
 await expect(field(page,'Attach squad',borrowedPriest)).toHaveValue(borrowedSanctifiers+'#1');
 await expect(gear(page,'Paragon Warsuits','Paragon 2 · Heavy bolter alternatives')).toHaveValue('Multi-melta');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Command');
 const faith=phaseCard(page,'Acts of Faith · Substitute one die');
 await expect(faith).toContainText('one Act of Faith per phase');
 await expect(faith).not.toContainText(borrowedPriest);await expect(faith).not.toContainText(borrowedSanctifiers);
 await page.getByLabel('Show phase').selectOption('Shooting');
 await expect(phaseCard(page,'Abbess Sanctorum').filter({hasText:'Your turn'})).toContainText('re-roll Hit and Wound rolls');
 await expect(phaseCard(page,'Abbess Sanctorum').filter({hasText:'Opponent’s turn'})).toContainText('Praise the Fallen');
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,rhino+'#1 · Declare passengers')).toContainText(dominions+'#1 (12 spaces)');
 await expect(printCard(page,rhino+'#1 · Declare passengers')).not.toContainText(borrowedSanctifiers);
 await expect(printCard(page,'Immolator#1 · Declare passengers')).toContainText(sisters+'#1 (5 + 6 models)');
 const weapons=printCard(page,'Paragon Warsuits#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(weapons).toContainText('3 × Multi-melta');await expect(weapons).not.toContainText('Heavy bolter');
 await verifyPrint(page,info);
});
