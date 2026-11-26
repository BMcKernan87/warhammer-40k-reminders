import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';
import {SM_ULTRAMARINES_ARMY,SM_IRON_HANDS_ARMY,SM_DEATHWATCH_ARMY,SM_DEATHWATCH_SUPPORT_ARMY,SM_RAVEN_GUARD_ARMY,SM_IMPERIAL_FISTS_ARMY,SM_WHITE_SCARS_ARMY,type SpaceMarineAcceptanceArmy,type SpaceMarineAcceptanceGear} from '../fixtures/space-marines-armies';

test.use({actionTimeout:15_000});
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const field=(page:Page,kind:string,id:string)=>page.getByLabel(kind+' '+id,{exact:true});
const key=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
function optionItems(label:string):string[]{
 if(label==='None')return [];
 return label.split(' + ').flatMap(part=>{const m=part.match(/^(\d+) × (.+)$/);return m?Array(+m[1]).fill(m[2]):[part];});
}
async function gearChoice(page:Page,change:SpaceMarineAcceptanceGear){
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
async function total(page:Page,plan:SpaceMarineAcceptanceArmy){
 await expect(page.getByText('Recorded 11th-edition total: '+plan.points+' points',{exact:true})).toBeVisible();
 const findings=page.getByRole('region',{name:'Roster validation findings'});
 await expect(findings.getByText('ERROR',{exact:true})).toHaveCount(0);await expect(findings.getByText('WARNING',{exact:true})).toHaveCount(0);
 await expect(findings.locator('li')).toHaveCount(1);
 await expect(findings.locator('li')).toContainText(plan.dp+' of '+(plan.battleSize==='Incursion'?2:3)+' DP used');
}
async function build(page:Page,plan:SpaceMarineAcceptanceArmy){
 await page.goto('./');await page.getByLabel('Army faction',{exact:true}).selectOption('Space Marines');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(plan.battleSize);
 for(const detachment of plan.detachments)await page.getByRole('checkbox',{name:new RegExp('^'+escaped(detachment)+' —')}).check();
 const copies=new Map<string,number>();
 for(const row of plan.units){
  const copy=(copies.get(row.unit)??0)+1;copies.set(row.unit,copy);
  await page.getByLabel('Select unit',{exact:true}).selectOption(row.unit);await page.getByRole('button',{name:'Add',exact:true}).click();
  if(row.models!==undefined)await field(page,'Models for squad',row.unit+'#'+copy).selectOption(String(row.models));
 }
 const attachments=page.getByLabel(/^Attach squad /);
 for(let i=0;i<await attachments.count();i++)await attachments.nth(i).selectOption('');
 const warlord=page.getByLabel('Warlord',{exact:true});
 if(await warlord.count())await warlord.selectOption(plan.warlord);else await expect(page.getByText('Warlord: '+plan.warlord,{exact:true})).toBeVisible();
 for(const [leader,body] of plan.attachments)await field(page,'Attach squad',leader).selectOption(body);
 for(const [bearer,upgrade] of plan.upgrades)await field(page,'11th upgrade for squad',bearer).selectOption(upgrade);
 for(const change of plan.gear){const choice=await gearChoice(page,change);await choice.field.selectOption(choice.option.value);}
}
async function reopen(page:Page,plan:SpaceMarineAcceptanceArmy){
 await total(page,plan);
 page.once('dialog',dialog=>dialog.accept('Second force'));await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');await page.reload();await total(page,plan);
 await expect(page.getByLabel('Army faction',{exact:true})).toHaveValue('Space Marines');await expect(page.getByLabel('2026 battle size',{exact:true})).toHaveValue(plan.battleSize);
 for(const detachment of plan.detachments)await expect(page.getByRole('checkbox',{name:new RegExp('^'+escaped(detachment)+' —')})).toBeChecked();
 const warlord=page.getByLabel('Warlord',{exact:true});
 if(await warlord.count())await expect(warlord).toHaveValue(plan.warlord);else await expect(page.getByText('Warlord: '+plan.warlord,{exact:true})).toBeVisible();
 for(const [leader,body] of plan.attachments)await expect(field(page,'Attach squad',leader)).toHaveValue(body);
 for(const [bearer,upgrade] of plan.upgrades)await expect(field(page,'11th upgrade for squad',bearer)).toHaveValue(upgrade);
 for(const change of plan.gear){const choice=await gearChoice(page,change);await expect(choice.field).toHaveValue(choice.option.value);}
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:test.info().outputPath('editor.png')});
 const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:Array.from(document.querySelectorAll('select,input,label')).filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,label:e.getAttribute('aria-label'),class:e.className,width:e.getBoundingClientRect().width,text:e.textContent?.slice(0,120)})).slice(0,8)}));
 expect(layout.scroll,JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
}

test('mobile Ultramarines preserve 2,000 points, two Victrix specialists, actual Ancient enhancement and Sergeant weapon overrides through eleven PDF bookmarks',async({page},info)=>{
 test.setTimeout(300_000);await page.setViewportSize({width:390,height:844});await build(page,SM_ULTRAMARINES_ARMY);await reopen(page,SM_ULTRAMARINES_ARMY);
 await expect(field(page,'Models for squad','Intercessor Squad#1').locator('option')).toHaveText(['5','6','7','8','9','10']);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Shooting');
 await expect(phaseCard(page,'Desolation Squad#1 · Ranged weapon profiles').filter({hasText:'Your turn'})).toContainText('4 × Superkrak Rocket Launcher');
 await page.emulateMedia({media:'print'});
 const desolation=printCard(page,'Desolation Squad#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(desolation).toContainText('4 × Superkrak Rocket Launcher');await expect(desolation).toContainText('1 × Vengor Launcher');await expect(desolation).not.toContainText('5 × Superkrak Rocket Launcher');
 const victrix=printCard(page,'Victrix Honour Guard#1 · Ranged weapon profiles').filter({hasText:'Your turn'});await expect(victrix).toContainText('5 × Master-crafted Bolt Carbine');
 await expect(printCard(page,'Victrix Honour Guard#1 · Melee weapon profiles')).toContainText('1 × Blades of Honour');
 const cargo=printCard(page,'Impulsor#1 · Declare passengers');await expect(cargo).toContainText('Company Heroes#1 (4 models, 4 spaces)');await expect(cargo).not.toContainText('Intercessor Squad#1');await expect(cargo).not.toContainText('Victrix Honour Guard#1');
 await expect(printCard(page,'Impulsor#1 · Orbital Comms Array')).toContainText('Scouts 6');
 await verifyPrint(page,info);
});

test('desktop Black Spear preserves 2,000 points, mixed Kill Teams, three paid Cyclones, personal shield and physically legal Corvus cargo through printing',async({page},info)=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:900});await build(page,SM_DEATHWATCH_ARMY);await reopen(page,SM_DEATHWATCH_ARMY);
 const unit=page.getByLabel('Select unit',{exact:true});
 for(const name of ['Scout Squad','Terminator Squad','Terminator Assault Squad'])await expect(unit.locator('option').filter({hasText:new RegExp('^'+escaped(name)+'$')})).toHaveCount(0);
 await expect(unit.locator('option').filter({hasText:/^Watch Master \(Assigned Agent\)$/})).toHaveCount(1);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Pre-battle');
 await expect(phaseCard(page,'Fortis Kill Team#1 · Deep Strike')).toHaveCount(1);
 await page.emulateMedia({media:'print'});
 const cargo=printCard(page,'Corvus Blackstar#1 · Declare passengers');await expect(cargo).toContainText('Fortis Kill Team#1 (11 models, 11 spaces)');
 for(const name of ['Decimus Kill Team#1','Deathwatch Terminator Squad#1','Indomitor Kill Team#1'])await expect(cargo).not.toContainText(name);
 await expect(printCard(page,'Rhino#1 · Declare passengers')).toContainText('Deathwatch Veterans#1 (11 models, 11 spaces)');
 const term=printCard(page,'Deathwatch Terminator Squad#1 · Ranged weapon profiles').filter({hasText:'Your turn'});await expect(term).toContainText('3 × Cyclone Missile Launcher');await expect(term).toContainText('4 × Storm Bolter');
 await expect(printCard(page,'Corvus Blackstar#1 · Ranged weapon profiles').filter({hasText:'Your turn'})).toContainText('2 × Stormstrike Missile Launcher');
 await expect(printCard(page,'Captain#1 · Melee weapon profiles')).toContainText('The Thief of Secrets');
 await verifyPrint(page,info);
});

test('mobile Salamanders save Deathwatch Support on an attached generic Captain and keep Assigned Agent identities separate through printing',async({page},info)=>{
 test.setTimeout(300_000);await page.setViewportSize({width:390,height:844});await build(page,SM_DEATHWATCH_SUPPORT_ARMY);await reopen(page,SM_DEATHWATCH_SUPPORT_ARMY);
 await expect(field(page,'11th upgrade for squad','Captain#1').locator('option')).toHaveText(['None','Beacon Angelis (+25 pts)']);
 await expect(field(page,'Attach squad','Watch Master (Assigned Agent)#1')).toHaveValue('Deathwatch Kill Team#1');
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Pre-battle');
 await expect(phaseCard(page,'Fortis Kill Team#1 · Deep Strike')).toHaveCount(1);await expect(phaseCard(page,'Reiver Squad#1 · Deep Strike')).toHaveCount(1);
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,'Space Marine Chapters')).toContainText('SALAMANDERS');await expect(printCard(page,'Space Marine Chapters')).toContainText('210 points');
 await expect(printCard(page,'Rhino#1 · Declare passengers')).toContainText('Fortis Kill Team#1 (11 models, 11 spaces)');
 await expect(printCard(page,'Reiver Squad#1 · Grav-chutes')).toHaveCount(1);
 await expect(printCard(page,'Watch Master (Assigned Agent)#1 · Melee weapons')).toContainText('Vigil spear');
 await expect(printCard(page,'Watch Master (Assigned Agent)#1 · Melee weapon profiles')).toHaveCount(0);
 await verifyPrint(page,info);
});

for(const plan of [SM_IRON_HANDS_ARMY,SM_RAVEN_GUARD_ARMY,SM_IMPERIAL_FISTS_ARMY,SM_WHITE_SCARS_ARMY])test(plan.name+' saves and reopens its full 1,000-point force with selected physical equipment',async({page},info)=>{
 test.setTimeout(180_000);await build(page,plan);await reopen(page,plan);
 if(plan===SM_IRON_HANDS_ARMY){
  await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Shooting');
  await expect(phaseCard(page,'Redemptor Dreadnought#1 · Reactive ranged weapon profiles')).toContainText('at or below half Starting Strength');
  await expect(phaseCard(page,'Redemptor Dreadnought#1 · Reactive snap-shot profiles')).toContainText('above half Starting Strength');
  await expect(phaseCard(page,'Redemptor Dreadnought#1 · Damaged')).toContainText('Either turn');
  await expect(phaseCard(page,'Redemptor Dreadnought#1 · Damaged')).toContainText('Snap shooting ignores Hit-roll modifiers');
  await page.emulateMedia({media:'print'});
  const normal=printCard(page,'Redemptor Dreadnought#1 · Reactive ranged weapon profiles'),snap=printCard(page,'Redemptor Dreadnought#1 · Reactive snap-shot profiles');
  await expect(normal).toContainText('Macro Plasma Incinerator');await expect(normal).toContainText(/BS \d\+/);
  await expect(snap).toContainText('Macro Plasma Incinerator');await expect(snap).not.toContainText(/BS \d\+/);await expect(snap).toContainText('cannot score Critical Hits');
  await verifyPrint(page,info);
 }
 if(plan===SM_RAVEN_GUARD_ARMY){
  await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Pre-battle');
  await expect(phaseCard(page,'Reiver Squad#1 · Deep Strike')).toHaveCount(1);await expect(phaseCard(page,'Reiver Squad#1 · Infiltrators')).toHaveCount(1);
 }
 if(plan===SM_WHITE_SCARS_ARMY){
  await expect(field(page,'11th upgrade for squad','Invader ATVs#1')).toHaveValue('Chogorian Huntmaster');await expect(field(page,'11th upgrade for squad','Land Speeder#1')).toHaveValue('Chogorian Huntmaster');
 }
});
