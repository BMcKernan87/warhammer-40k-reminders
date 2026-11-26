import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';
import {CHAPTER_ACCEPTANCE_ARMIES,BA_SPEARTIP_ARMY,BA_INHERITORS_ARMY,DA_ROCK_ARMY,DA_PURSUIT_ARMY,BT_HOUSEHOLD_ARMY,BT_CRUSADE_ARMY,SW_GREAT_WOLF_ARMY,SW_CHAMPIONS_ARMY,type ChapterAcceptanceArmy} from '../fixtures/space-marine-chapters-armies';
import type {SpaceMarineAcceptanceGear} from '../fixtures/space-marines-armies';

test.use({actionTimeout:15_000});
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const field=(page:Page,kind:string,id:string)=>page.getByLabel(kind+' '+id,{exact:true});
const key=(items:readonly string[])=>items.map(s=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'')).sort().join('|');
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
 expect(matches,'One actual equipment field for '+id+' / '+change.owner).toHaveLength(1);
 return matches[0];
}
function printCard(page:Page,title:string,window?:string){
 const printed=page.getByRole('region',{name:'Printable army reminders'}),scope=window?printed.locator('section').filter({has:page.getByRole('heading',{name:window,level:3,exact:true})}):printed;
 return scope.getByText(title,{exact:true}).locator('..');
}
function ownRanged(page:Page,id:string){return printCard(page,id+' · Ranged weapon profiles').filter({hasText:'Your turn'});}
async function total(page:Page,plan:ChapterAcceptanceArmy){
 await expect(page.getByText('Recorded 11th-edition total: '+plan.points+' points',{exact:true})).toBeVisible();
 const findings=page.getByRole('region',{name:'Roster validation findings'});
 await expect(findings.getByText('ERROR',{exact:true})).toHaveCount(0);await expect(findings.getByText('WARNING',{exact:true})).toHaveCount(0);
 await expect(findings.locator('li')).toHaveCount(1);await expect(findings.locator('li')).toContainText(plan.dp+' of '+(plan.battleSize==='Incursion'?2:3)+' DP used');
}
async function build(page:Page,plan:ChapterAcceptanceArmy){
 await page.goto('./');await page.getByLabel('Army faction',{exact:true}).selectOption(plan.faction);
 page.once('dialog',dialog=>dialog.accept(plan.name));await page.getByRole('button',{name:'Rename',exact:true}).click();
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
 // Wolf-Touched supplies the attachment permission itself. Beacon Angelis,
 // conversely, needs the Captain to be attached to the actual Kill Team first.
 for(const [bearer,upgrade] of plan.upgrades)if(upgrade==='Wolf-Touched')await field(page,'11th upgrade for squad',bearer).selectOption(upgrade);
 for(const [leader,body] of plan.attachments)await field(page,'Attach squad',leader).selectOption(body);
 for(const [bearer,upgrade] of plan.upgrades)if(upgrade!=='Wolf-Touched')await field(page,'11th upgrade for squad',bearer).selectOption(upgrade);
 for(const change of plan.gear){const choice=await gearChoice(page,change);await choice.field.selectOption(choice.option.value);}
}
async function reopen(page:Page,plan:ChapterAcceptanceArmy){
 await total(page,plan);
 page.once('dialog',dialog=>dialog.accept('Temporary second force'));await page.getByRole('button',{name:'New army',exact:true}).click();
 await page.getByLabel('Saved army',{exact:true}).selectOption('default');await page.reload();await total(page,plan);
 await expect(page.getByLabel('Saved army',{exact:true}).locator('option:checked')).toContainText(plan.name);
 await expect(page.getByLabel('Army faction',{exact:true})).toHaveValue(plan.faction);await expect(page.getByLabel('2026 battle size',{exact:true})).toHaveValue(plan.battleSize);
 for(const detachment of plan.detachments)await expect(page.getByRole('checkbox',{name:new RegExp('^'+escaped(detachment)+' —')})).toBeChecked();
 const warlord=page.getByLabel('Warlord',{exact:true});
 if(await warlord.count())await expect(warlord).toHaveValue(plan.warlord);else await expect(page.getByText('Warlord: '+plan.warlord,{exact:true})).toBeVisible();
 for(const [leader,body] of plan.attachments)await expect(field(page,'Attach squad',leader)).toHaveValue(body);
 for(const [bearer,upgrade] of plan.upgrades)await expect(field(page,'11th upgrade for squad',bearer)).toHaveValue(upgrade);
 for(const change of plan.gear){const choice=await gearChoice(page,change);await expect(choice.field).toHaveValue(choice.option.value);}
 const copies=new Map<string,number>();
 for(const row of plan.units){const copy=(copies.get(row.unit)??0)+1;copies.set(row.unit,copy);if(row.models!==undefined)await expect(field(page,'Models for squad',row.unit+'#'+copy)).toHaveValue(String(row.models));}
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:test.info().outputPath('editor.png')});
 const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:Array.from(document.querySelectorAll('select,input,label')).filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,label:e.getAttribute('aria-label'),width:e.getBoundingClientRect().width})).slice(0,8)}));
 expect(layout.scroll,JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
}

for(const plan of CHAPTER_ACCEPTANCE_ARMIES)test((plan.battleSize==='Incursion'?'mobile':'desktop')+' '+plan.name+' builds, saves, reopens and prints '+plan.points+' points with eleven phase bookmarks',async({page},info)=>{
 test.setTimeout(300_000);await page.setViewportSize(plan.battleSize==='Incursion'?{width:390,height:844}:{width:1440,height:900});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await build(page,plan);await reopen(page,plan);
 if(plan===SW_CHAMPIONS_ARMY)await expect(page.getByLabel('Warlord',{exact:true}).locator('option').filter({hasText:/^Murderfang#1$/})).toHaveCount(0);
 await page.getByRole('button',{name:'Play reminders',exact:true}).click();await page.getByLabel('Show phase').selectOption('Shooting');
 await expect(page.getByRole('heading',{name:'Phase reminders',exact:true})).toBeVisible();
 await page.emulateMedia({media:'print'});
 const printed=page.getByRole('region',{name:'Printable army reminders'});
 await expect(printed.getByRole('heading',{level:2,name:plan.name,exact:true})).toBeVisible();
 await expect(printCard(page,'Space Marine Chapters')).toContainText(plan.chapter);
 if(plan===BA_SPEARTIP_ARMY){
  const jump=ownRanged(page,'Death Company Marines With Jump Packs#1');
  for(const name of ['1 × Inferno Pistol','1 × Plasma Pistol','1 × Hand Flamer'])await expect(jump).toContainText(name);
  await expect(printCard(page,'Death Company Captain with Jump Pack#1 · Relic Shield').first()).toContainText('+1 Wounds');
  await expect(printCard(page,'Death Company Captain with Jump Pack#1 · Melee weapon profiles')).toContainText('1 × Thunder Hammer');
  await expect(ownRanged(page,'Death Company Dreadnought#1')).toContainText('Twin Multi-melta');
 }
 if(plan===BA_INHERITORS_ARMY){
  await expect(printCard(page,'Impulsor#1 · Declare passengers')).toContainText('Assault Intercessor Squad#1 (7 models, 7 spaces)');
  await expect(printCard(page,'Chief Librarian Mephiston#1 · Invulnerable save').first()).toContainText('4+');
  const melee=printCard(page,'Death Company Marines With Jump Packs#1 · Melee weapon profiles');await expect(melee).toContainText('2 × Eviscerator');await expect(melee).toContainText('2 × Power Fist');
 }
 if(plan===DA_ROCK_ARMY){
  const knights=printCard(page,'Deathwing Knights#1 · Melee weapon profiles');await expect(knights).toContainText('4 × Power Weapon');await expect(knights).toContainText('1 × Relic Weapon');await expect(knights).not.toContainText('Mace of Absolution');
  const terminators=ownRanged(page,'Deathwing Terminator Squad#1');await expect(terminators).toContainText('1 × Cyclone Missile Launcher');await expect(terminators).toContainText('5 × Storm Bolter');
  await expect(ownRanged(page,'Ravenwing Command Squad#1')).toContainText('2 × Plasma Talon');await expect(ownRanged(page,'Ravenwing Command Squad#1')).toContainText('1 × Grenade Launcher');
  await expect(printCard(page,'Watcher in the Dark').first()).toContainText('until phase end');
 }
 if(plan===DA_PURSUIT_ARMY){
  await expect(printCard(page,'Fortis Kill Team#1 · Deep Strike','Pre-battle')).toHaveCount(1);
  await expect(printCard(page,'Rhino#1 · Declare passengers')).toContainText('Fortis Kill Team#1 (11 models, 11 spaces)');
  const vengeance=printCard(page,'Land Speeder Vengeance#1 · Reactive ranged weapon profiles');await expect(vengeance).toContainText('Assault Cannon');await expect(vengeance).toContainText('Use normal shooting');await expect(vengeance).not.toContainText('Heavy Bolter');
  await expect(printCard(page,'Ravenwing Darkshroud#1 · Lone Operative').first()).toContainText('15″');
 }
 if(plan===BT_HOUSEHOLD_ARMY){
  await expect(ownRanged(page,'Gladiator Valiant#1')).toContainText('3 × Multi-melta');
  const castellan=ownRanged(page,'Castellan#1');await expect(castellan).toContainText('Heavy Bolt Pistol');await expect(castellan).toContainText('S 4');await expect(castellan).not.toContainText('Combi-weapon');
  await expect(printCard(page,'Impulsor#1 · Orbital Comms Array')).toContainText('Scouts 6');
  await expect(printCard(page,'Rhino#1 · Declare passengers')).toContainText('Crusader Squad#1 (12 models, 12 spaces)');
  await expect(printCard(page,'Impulsor#1 · Declare passengers')).toContainText('Sword Brethren Squad#1 (5 models, 5 spaces)');
 }
 if(plan===BT_CRUSADE_ARMY){
  await expect(printCard(page,'Faithful Cenobytes').first()).toContainText('0 transport spaces');
  const repulsor=printCard(page,'Repulsor#1 · Declare passengers');await expect(repulsor).toContainText('Sword Brethren Squad#1 (9 models, 9 spaces)');await expect(repulsor).not.toContainText('Crusader Squad#1');
  for(const unit of ['Gladiator Reaper#1','Repulsor#1','Repulsor Executioner#1'])await expect(ownRanged(page,unit)).toContainText('1 × Multi-melta');
  const swords=printCard(page,'Sword Brethren Squad#1 · Melee weapon profiles');await expect(swords).toContainText('2 × Thunder Hammer');await expect(swords).toContainText('2 × Twin Lightning Claws');
 }
 if(plan===SW_GREAT_WOLF_ARMY){
  await expect(printCard(page,'Bestial Forms')).toContainText('Wolf Guard Headtakers');
  const first=printCard(page,'Grey Hunters#1 · Group 1 · Melee weapon profiles'),second=printCard(page,'Grey Hunters#1 · Group 2 · Melee weapon profiles');
  await expect(first).toContainText('1 × Power Fist');await expect(second).not.toContainText('Power Fist');
  await expect(printCard(page,'Grey Hunters#1 · Melee weapon profiles')).toHaveCount(0);
  await expect(printCard(page,'Grey Hunters#1 · Group 2 · Litany of Hate')).toHaveCount(1);await expect(printCard(page,'Grey Hunters#1 · Group 1 · Litany of Hate')).toHaveCount(0);
  await expect(printCard(page,'Wolf Guard Headtakers#1 · Group 2 · Ranged weapon profiles')).toHaveCount(0);
  await expect(printCard(page,'Wolf Guard Headtakers#1 · Group 2 · Melee weapon profiles')).toContainText('3 × Teeth and Claws');
  const rhino=printCard(page,'Rhino#1 · Declare passengers');for(const label of ['Grey Hunters#1 · Group 1 (5 models, 5 spaces)','Grey Hunters#1 · Group 2 (6 models, 6 spaces)','Wolf Guard Headtakers#1 · Group 1 (4 models, 4 spaces)'])await expect(rhino).toContainText(label);
  await expect(rhino).not.toContainText('Wolf Guard Headtakers#1 · Group 2');
 }
 if(plan===SW_CHAMPIONS_ARMY){
  const terminators=ownRanged(page,'Wolf Guard Terminators#1');await expect(terminators).toContainText('1 × Storm Bolter');await expect(terminators).toContainText('1 × Assault Cannon');
  await expect(ownRanged(page,'Thunderwolf Cavalry#1')).toContainText('6 × Boltgun');
  const bjorn=ownRanged(page,'Bjorn The Fell-handed#1');await expect(bjorn).toContainText('Helfrost Cannon');await expect(bjorn).not.toContainText('Assault Cannon');
  await expect(printCard(page,'Repulsor#1 · Declare passengers')).toContainText('Wulfen with Storm Shields#1 (6 models, 12 spaces)');
 }
 await verifyPrint(page,info);expect(errors).toEqual([]);
});
