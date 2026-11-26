import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';
import {AELDARI_WARHOST_ARMY,AELDARI_YNNARI_ARMY,AELDARI_HARLEQUIN_ARMY,AELDARI_WINDRIDER_ARMY,type AeldariAcceptanceArmy,type AeldariAcceptanceGear} from '../fixtures/aeldari-armies';

test.use({actionTimeout:15_000});
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const field=(page:Page,kind:string,id:string)=>page.getByLabel(kind+' '+id,{exact:true});
const key=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
function optionItems(label:string):string[]{
 if(label==='None')return [];
 return label.split(' + ').flatMap(part=>{const m=part.match(/^(\d+) × (.+)$/);return m?Array(+m[1]).fill(m[2]):[part];});
}
async function gearChoice(page:Page,change:AeldariAcceptanceGear){
 const id=change.unit+'#'+(change.copy??1),fields=page.getByLabel(new RegExp('^'+escaped(change.owner)+'.*for '+escaped(id)+'$')),matches=[];
 for(let i=0;i<await fields.count();i++){
  const options=await fields.nth(i).locator('option').evaluateAll(options=>options.map(o=>({value:(o as HTMLOptionElement).value,text:o.textContent??''})));
  const option=options.find(o=>change.choice?o.text===change.choice:key(optionItems(o.text))===key(change.items!));
  if(option)matches.push({field:fields.nth(i),option});
 }
 expect(matches,'One physical equipment field for '+id+' / '+change.owner).toHaveLength(1);
 return matches[0];
}
function phaseCard(page:Page,title:string){return page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..').locator('.check').filter({has:page.getByText(title,{exact:true})});}
function printCard(page:Page,title:string){return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');}
async function total(page:Page,plan:AeldariAcceptanceArmy){
 await expect(page.getByText('Recorded 11th-edition total: '+plan.points+' points',{exact:true})).toBeVisible();
 const findings=page.getByRole('region',{name:'Roster validation findings'});
 await expect(findings.getByText('ERROR',{exact:true})).toHaveCount(0);await expect(findings.getByText('WARNING',{exact:true})).toHaveCount(0);
 await expect(findings.locator('li')).toHaveCount(1);
 await expect(findings.locator('li')).toContainText(plan.dp+' of '+(plan.battleSize==='Incursion'?2:3)+' DP used');
}
async function build(page:Page,plan:AeldariAcceptanceArmy){
 await page.goto('./');await page.getByLabel('Army faction',{exact:true}).selectOption('Aeldari');
 await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:/^Yvraine$/})).toHaveCount(0);
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(plan.battleSize);
 await page.getByRole('checkbox',{name:new RegExp('^'+escaped(plan.detachment)+' —')}).check();
 if(plan.detachment==='Devoted of Ynnead')await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:/^Yvraine$/})).toHaveCount(1);
 const copies=new Map<string,number>();
 for(const row of plan.units){
  const copy=(copies.get(row.unit)??0)+1;copies.set(row.unit,copy);
  await page.getByLabel('Select unit',{exact:true}).selectOption(row.unit);await page.getByRole('button',{name:'Add',exact:true}).click();
  if(row.models!==undefined)await field(page,'Models for squad',row.unit+'#'+copy).selectOption(String(row.models));
 }
 // Replace any helpful provisional auto-attachments with this roster's
 // explicit formation choices before assigning its enhancements.
 const attachments=page.getByLabel(/^Attach squad /);
 for(let i=0;i<await attachments.count();i++)await attachments.nth(i).selectOption('');
 const warlord=page.getByLabel('Warlord',{exact:true});
 if(await warlord.count())await warlord.selectOption(plan.warlord);else await expect(page.getByText('Warlord: '+plan.warlord,{exact:true})).toBeVisible();
 for(const [leader,body] of plan.attachments)await field(page,'Attach squad',leader).selectOption(body);
 for(const [artillery,body] of plan.artillery??[])await field(page,'Guardian unit for',artillery).selectOption(body);
 for(const [bearer,upgrade] of plan.upgrades)await field(page,'11th upgrade for squad',bearer).selectOption(upgrade);
 for(const change of plan.gear){const choice=await gearChoice(page,change);await choice.field.selectOption(choice.option.value);}
}
async function reopen(page:Page,plan:AeldariAcceptanceArmy){
 await total(page,plan);
 page.once('dialog',dialog=>dialog.accept('Second force'));await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');await page.reload();await total(page,plan);
 await expect(page.getByLabel('Army faction',{exact:true})).toHaveValue('Aeldari');await expect(page.getByLabel('2026 battle size',{exact:true})).toHaveValue(plan.battleSize);
 await expect(page.getByRole('checkbox',{name:new RegExp('^'+escaped(plan.detachment)+' —')})).toBeChecked();
 const warlord=page.getByLabel('Warlord',{exact:true});
 if(await warlord.count())await expect(warlord).toHaveValue(plan.warlord);else await expect(page.getByText('Warlord: '+plan.warlord,{exact:true})).toBeVisible();
 for(const [leader,body] of plan.attachments)await expect(field(page,'Attach squad',leader)).toHaveValue(body);
 for(const [artillery,body] of plan.artillery??[])await expect(field(page,'Guardian unit for',artillery)).toHaveValue(body);
 for(const [bearer,upgrade] of plan.upgrades)await expect(field(page,'11th upgrade for squad',bearer)).toHaveValue(upgrade);
 for(const change of plan.gear){const choice=await gearChoice(page,change);await expect(choice.field).toHaveValue(choice.option.value);}
}

test('mobile 1,000-point Warhost saves Guardian artillery, both attached Exodite characters and actual weapons through eleven PDF bookmarks',async({page},info)=>{
 test.setTimeout(300_000);await page.setViewportSize({width:390,height:844});await build(page,AELDARI_WARHOST_ARMY);await reopen(page,AELDARI_WARHOST_ARMY);
 const exarch=page.getByLabel(/^Dire Avenger Exarch.*for Dire Avengers#1$/).first();await expect(exarch.locator('option')).toHaveCount(6);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Shooting');
 await expect(phaseCard(page,'Fleet of Foot · Fade Back')).toContainText('Guardian Defenders#1');await expect(phaseCard(page,'Fleet of Foot · Fade Back')).toContainText('without spending a Battle Focus token');
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,'Battle Focus · receive tokens')).toContainText('receive 3 Battle Focus tokens');
 const artillery=printCard(page,'D-cannon Platform#1 · Support Artillery');
 await expect(artillery).toContainText('Guardian Defenders#1');await expect(artillery).toContainText('cannot embark in a Transport');
 const cargo=printCard(page,'Wave Serpent#1 · Declare passengers');
 await expect(cargo).toContainText('Dire Avengers#1 (5 models, 5 spaces)');await expect(cargo).not.toContainText('Guardian Defenders#1');
 await expect(printCard(page,'Guardian Defenders#1 · Ranged weapon profiles').filter({hasText:'Your turn'})).toContainText('1 × Bright lance');
 await expect(printCard(page,'Dire Avengers#1 · Melee weapon profiles')).toContainText('1 × Diresword');
 const walker=printCard(page,'War Walkers#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(walker).toContainText('1 × Bright lance');await expect(walker).toContainText('1 × Starcannon');
 const lord=printCard(page,'Wraithlord#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(lord).toContainText('2 × Bright lance');await expect(lord).toContainText('2 × Flamer');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Devoted army saves the 6/6 Ynnari split, model-specific gear and five distinct legal transports through printing',async({page},info)=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:900});await build(page,AELDARI_YNNARI_ARMY);await reopen(page,AELDARI_YNNARI_ARMY);
 const warlord=page.getByLabel('Warlord',{exact:true});await expect(warlord.locator('option')).toHaveText(['Select Warlord','Yvraine#1','The Yncarne#1']);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Fight');
 const embark=phaseCard(page,'Ynnari Venom#1 · Lithe Embarkation');await expect(embark).toContainText('this same transport');
 await expect(embark.getByRole('link',{name:'Rule source'})).toHaveAttribute('href','https://wahapedia.ru/wh40k11ed/factions/aeldari/Ynnari-Venom');
 await page.emulateMedia({media:'print'});
 for(const n of [1,2]){
  const cargo=printCard(page,'Ynnari Venom#'+n+' · Declare passengers');await expect(cargo).toContainText('Ynnari Kabalite Warriors#1 (6 + 6 models)');
  await expect(cargo).toContainText('each physical model and its equipment');await expect(cargo).not.toContainText('Guardian Defenders#1');
 }
 for(const n of [1,2]){
  const cargo=printCard(page,'Ynnari Raider#'+n+' · Declare passengers');await expect(cargo).toContainText('Ynnari Incubi#1 (11 models, 11 spaces)');await expect(cargo).toContainText('Ynnari Wyches#1 (11 models, 11 spaces)');
 }
 const serpent=printCard(page,'Wave Serpent#1 · Declare passengers');await expect(serpent).toContainText('Guardian Defenders#1 (12 models, 12 spaces)');await expect(serpent).toContainText('Wraithguard#1 (5 models, 10 spaces)');await expect(serpent).not.toContainText('Ynnari Incubi#1');
 const kabalites=printCard(page,'Ynnari Kabalite Warriors#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 for(const [count,name] of [[5,'Splinter rifle'],[1,'Dark lance'],[1,'Blaster'],[1,'Shredder'],[1,'Splinter cannon'],[1,'Blast pistol']] as const)await expect(kabalites).toContainText(count+' × '+name);
 await expect(printCard(page,'Ynnari Venom#1 · Ranged weapon profiles').filter({hasText:'Your turn'})).toContainText('2 × Splinter cannon');
 await expect(printCard(page,'Wraithguard#1 · Ranged weapon profiles').filter({hasText:'Your turn'})).toContainText('5 × D-scythe');
 await expect(printCard(page,'Wraithblades#1 · Melee weapon profiles')).toContainText('5 × Ghostaxe');
 await expect(printCard(page,'Disparate Paths')).toContainText('Yvraine and/or The Yncarne');
 await verifyPrint(page,info);
});

test('Harlequin host persists its qualified Mistweave choice and keeps the native Ynnari catalog conditional',async({page})=>{
 test.setTimeout(180_000);await build(page,AELDARI_HARLEQUIN_ARMY);await reopen(page,AELDARI_HARLEQUIN_ARMY);
 await expect(field(page,'11th upgrade for squad','Shadowseer#1')).toHaveValue('Mistweave (Ghosts of the Webway)');
 await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:/^Ynnari Archon$/})).toHaveCount(0);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Pre-battle');
 await expect(phaseCard(page,'Troupe#2 · Infiltrators')).toHaveCount(1);await expect(phaseCard(page,'Troupe#1 · Infiltrators')).toHaveCount(0);
});

test('Windrider editor preserves the Farseer-to-Support-to-Bodyguard chain and physical Exarch gear on reload',async({page})=>{
 test.setTimeout(180_000);await build(page,AELDARI_WINDRIDER_ARMY);await reopen(page,AELDARI_WINDRIDER_ARMY);
 await expect(field(page,'Attach squad','Farseer Skyrunner#1')).toHaveValue('Warlock Skyrunners#1');await expect(field(page,'Attach squad','Warlock Skyrunners#1')).toHaveValue('Windriders#1');
 const shield=await gearChoice(page,{unit:'Shining Spears',owner:'Shining Spear Exarch ·',items:['Shimmershield']});await expect(shield.field).toHaveValue(shield.option.value);
 await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:/^Vypers$/})).toHaveCount(1);await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:/^Vyper$/})).toHaveCount(0);
});
