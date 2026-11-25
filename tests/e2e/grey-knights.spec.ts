import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';

const terminators='Brotherhood Terminator Squad',strike='Strike Squad',grand='Grand Master',champion='Brotherhood Champion';
const paladins='Paladin Squad',master='Grand Master In Nemesis Dreadknight',tech='Brotherhood Techmarine';
async function begin(page:Page,size:string,detachments:string[]){
 await page.goto('./');
 await page.getByLabel('Army faction',{exact:true}).selectOption('Grey Knights');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(size);
 for(const detachment of detachments)await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
}
async function add(page:Page,units:string[]){for(const unit of units){await page.getByLabel('Select unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Add',exact:true}).click();}}
function field(page:Page,kind:string,unit:string){return page.getByLabel(kind+' '+unit+'#1',{exact:true});}
function gear(page:Page,unit:string,owner:string){
 const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return page.getByLabel(new RegExp('^'+escaped(owner)+'.*for '+escaped(unit+'#1')+'$'));
}
async function total(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
function phaseCard(page:Page,title:string){return page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..').locator('.check').filter({has:page.getByText(title,{exact:true})});}
function printCard(page:Page,title:string){return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');}

test('mobile 1,000-point Brotherhood Strike preserves two Terminator psycannons, an Apothecary and Tome through save, reopen and phase-bookmarked printing',async({page},info)=>{
 test.setTimeout(90_000);await page.setViewportSize({width:390,height:844});
 await begin(page,'Incursion',['Brotherhood Strike']);
 await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:/^Kaldor Draigo$/})).toHaveCount(0);
 await add(page,[grand,terminators,strike,champion,'Rhino','Land Raider Redeemer','Interceptor Squad']);
 await field(page,'Models for squad',terminators).selectOption('5');
 await field(page,'Attach squad',grand).selectOption(terminators+'#1');
 await field(page,'Attach squad',champion).selectOption(strike+'#1');
 await page.getByLabel('Warlord',{exact:true}).selectOption(grand+'#1');
 const tome=field(page,'11th upgrade for squad',grand),purpose=field(page,'11th upgrade for squad',champion);
 await tome.selectOption('Tome of Forbidden Ways');await purpose.selectOption('Purity of Purpose');
 const banner=gear(page,terminators,'Terminator 1 ·'),gun=gear(page,terminators,'Terminator 2 ·'),medic=gear(page,terminators,'Terminator 3 ·');
 await banner.selectOption({label:"Ancient's banner + Psycannon"});await gun.selectOption({label:'Psycannon'});await medic.selectOption({label:"Apothecary's narthecium"});
 await total(page,1000);
 page.once('dialog',d=>d.accept('Second force'));await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');await page.reload();
 await total(page,1000);await expect(tome).toHaveValue('Tome of Forbidden Ways');await expect(purpose).toHaveValue('Purity of Purpose');
 await expect(banner).toHaveValue("Ancient's banner + Psycannon");await expect(gun).toHaveValue('Psycannon');await expect(medic).toHaveValue("Apothecary's narthecium");
 await expect(field(page,'Attach squad',grand)).toHaveValue(terminators+'#1');
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Fight');
 await expect(phaseCard(page,'Gate of Infinity · Enter Strategic Reserves')).toContainText('increases to 3');
 await page.getByLabel('Show phase').selectOption('Command');
 await expect(phaseCard(page,'Apothecary’s Narthecium')).toContainText('destroyed non-Character');
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,'Rhino#1 · Declare passengers')).toContainText(strike+'#1 (6 spaces)');
 await expect(printCard(page,'Land Raider Redeemer#1 · Declare passengers')).toContainText(terminators+'#1 (12 spaces)');
 const guns=printCard(page,terminators+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(guns).toContainText('2 × Psycannon');await expect(guns).toContainText('2 × Storm bolter');
 await expect(printCard(page,'Gate of Infinity · Ingress')).toContainText('even on your first turn');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Sanctic Spearhead keeps actual Stormraven cargo, paid Dreadknight arms and an Inquisitor-restricted Gate formation',async({page},info)=>{
 test.setTimeout(90_000);await page.setViewportSize({width:1440,height:900});
 await begin(page,'Strike Force',['Sanctic Spearhead','Fires of Purgation']);
 await add(page,['Grand Master Voldus',paladins,'Castellan Crowe','Purifier Squad',master,'Stormraven Gunship','Venerable Dreadnought',strike,'Inquisitor','Rhino','Purgation Squad','Razorback',tech]);
 await field(page,'Models for squad',paladins).selectOption('5');await field(page,'Models for squad','Purifier Squad').selectOption('10');
 await field(page,'Attach squad','Grand Master Voldus').selectOption(paladins+'#1');
 await field(page,'Attach squad','Castellan Crowe').selectOption('Purifier Squad#1');
 await field(page,'Attach squad','Inquisitor').selectOption(strike+'#1');
 await field(page,'Attach squad',tech).selectOption('Purgation Squad#1');
 await page.getByLabel('Warlord',{exact:true}).selectOption(master+'#1');
 await field(page,'11th upgrade for squad',tech).selectOption('Spiritus Machina');
 await gear(page,paladins,'Paladin 1 ·').selectOption({label:"Ancient's banner + Psycannon"});
 for(const n of [2,3])await gear(page,paladins,'Paladin '+n+' ·').selectOption({label:'Psycannon'});
 await gear(page,paladins,'Paladin 4 ·').selectOption({label:"Apothecary's narthecium"});
 const guns=gear(page,master,'Additional weapons');await guns.selectOption({label:'Heavy psycannon + Sublimator'});
 await gear(page,master,'Dreadfists alternatives').selectOption({label:'Nemesis mace'});
 const hurricane=gear(page,'Stormraven Gunship','Hurricane bolter');await hurricane.selectOption({label:'2 × Hurricane bolter'});
 for(const n of [1,2])await gear(page,'Purgation Squad','Purgator '+n+' ·').selectOption({label:'Close combat weapon + Psycannon'});
 await total(page,2000);await page.reload();await total(page,2000);
 await expect(guns).toHaveValue('Heavy psycannon + Sublimator');await expect(hurricane).toHaveValue('2 × Hurricane bolter');
 await expect(field(page,'11th upgrade for squad',tech)).toHaveValue('Spiritus Machina');
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Fight');
 const gate=phaseCard(page,'Gate of Infinity · Enter Strategic Reserves');
 await expect(gate).toContainText('Strike Squad#1 can use Gate only after Inquisitor#1 no longer belongs to it');
 await expect(gate).toContainText('Venerable Dreadnought#1');
 await page.emulateMedia({media:'print'});
 const raven=printCard(page,'Stormraven Gunship#1 · Declare passengers');
 await expect(raven).toContainText(paladins+'#1 (12 spaces)');await expect(raven).toContainText('Venerable Dreadnought#1 (Dreadnought bay)');
 await expect(printCard(page,'Razorback#1 · Declare passengers')).toContainText(strike+'#1 (6 spaces)');
 const attacks=printCard(page,master+'#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(attacks).toContainText('1 × Sublimator');await expect(attacks).not.toContainText('Heavy incinerator');
 await expect(printCard(page,'Champion of the Order of Purifiers').filter({hasText:'Your turn'})).toContainText('Purifier Squad#1 (10)');
 await verifyPrint(page,info);
});
