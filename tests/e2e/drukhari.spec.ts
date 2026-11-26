import {expect,test,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';
import {DRUKHARI_SKYSPLINTER_ARMY,DRUKHARI_REAPERS_ARMY,type DrukhariAcceptanceArmy,type DrukhariAcceptanceGear} from '../fixtures/drukhari-armies';

test.use({actionTimeout:15_000});

const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const field=(page:Page,kind:string,id:string)=>page.getByLabel(kind+' '+id,{exact:true});
const key=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
function optionItems(label:string):string[]{
 if(label==='None')return [];
 return label.split(' + ').flatMap(part=>{const m=part.match(/^(\d+) × (.+)$/);return m?Array(+m[1]).fill(m[2]):[part];});
}
async function gearChoice(page:Page,change:DrukhariAcceptanceGear){
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
async function total(page:Page,plan:DrukhariAcceptanceArmy){
 await expect(page.getByText('Recorded 11th-edition total: '+plan.points+' points',{exact:true})).toBeVisible();
 const findings=page.getByRole('region',{name:'Roster validation findings'});
 await expect(findings.getByText('ERROR',{exact:true})).toHaveCount(0);
 await expect(findings.getByText('WARNING',{exact:true})).toHaveCount(0);
 await expect(findings.locator('li')).toHaveCount(1); // Valid DP / Force Dispositions information only.
 await expect(findings.locator('li')).toContainText(plan.battleSize==='Incursion'?'2 of 2 DP used':'3 of 3 DP used');
}
async function build(page:Page,plan:DrukhariAcceptanceArmy){
 await page.goto('./');await page.getByLabel('Army faction',{exact:true}).selectOption('Drukhari');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(plan.battleSize);
 await page.getByRole('checkbox',{name:new RegExp(escaped(plan.detachment))}).check();
 const copies=new Map<string,number>();
 for(const row of plan.units){
  const copy=(copies.get(row.unit)??0)+1;copies.set(row.unit,copy);
  await page.getByLabel('Select unit',{exact:true}).selectOption(row.unit);await page.getByRole('button',{name:'Add',exact:true}).click();
  if(row.models!==undefined)await field(page,'Models for squad',row.unit+'#'+copy).selectOption(String(row.models));
 }
 const warlord=page.getByLabel('Warlord',{exact:true});
 if(await warlord.count())await warlord.selectOption(plan.warlord);
 else await expect(page.getByText('Warlord: '+plan.warlord,{exact:true})).toBeVisible();
 for(const [leader,body] of plan.attachments)await field(page,'Attach squad',leader).selectOption(body);
 for(const [bearer,upgrade] of plan.upgrades)await field(page,'11th upgrade for squad',bearer).selectOption(upgrade);
 for(const change of plan.gear){const choice=await gearChoice(page,change);await choice.field.selectOption(choice.option.value);}
}
async function reopen(page:Page,plan:DrukhariAcceptanceArmy){
 await total(page,plan);
 page.once('dialog',dialog=>dialog.accept('Second force'));await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');await page.reload();
 await total(page,plan);
 await expect(page.getByLabel('Army faction',{exact:true})).toHaveValue('Drukhari');
 await expect(page.getByLabel('2026 battle size',{exact:true})).toHaveValue(plan.battleSize);
 await expect(page.getByRole('checkbox',{name:new RegExp(escaped(plan.detachment))})).toBeChecked();
 const warlord=page.getByLabel('Warlord',{exact:true});
 if(await warlord.count())await expect(warlord).toHaveValue(plan.warlord);
 else await expect(page.getByText('Warlord: '+plan.warlord,{exact:true})).toBeVisible();
 for(const [leader,body] of plan.attachments)await expect(field(page,'Attach squad',leader)).toHaveValue(body);
 for(const [bearer,upgrade] of plan.upgrades)await expect(field(page,'11th upgrade for squad',bearer)).toHaveValue(upgrade);
 const copies=new Map<string,number>();
 for(const row of plan.units){
  const copy=(copies.get(row.unit)??0)+1;copies.set(row.unit,copy);
  if(row.models!==undefined)await expect(field(page,'Models for squad',row.unit+'#'+copy)).toHaveValue(String(row.models));
 }
 for(const change of plan.gear){const choice=await gearChoice(page,change);await expect(choice.field).toHaveValue(choice.option.value);}
}

test('mobile 1,000-point Skysplinter saves its 5/6 Venom split, actual Corsair specialists and paid weapons through eleven PDF bookmarks',async({page},info)=>{
 test.setTimeout(300_000);await page.setViewportSize({width:390,height:844});
 await build(page,DRUKHARI_SKYSPLINTER_ARMY);await reopen(page,DRUKHARI_SKYSPLINTER_ARMY);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Shooting');
 const rain=phaseCard(page,'Rain of Cruelty · shooting');
 await expect(rain).toContainText('Kabalite Warriors#1');await expect(rain).not.toContainText('Corsair Voidscarred#1');
 const bird=phaseCard(page,'Faolchú');
 await expect(bird).toContainText('actual Faolchú bearer');
 await expect(bird.getByRole('link',{name:'Rule source'})).toHaveAttribute('href','https://wahapedia.ru/wh40k11ed/factions/aeldari/Corsair-Voidscarred');
 await page.getByLabel('Show phase').selectOption('Fight');
 await expect(phaseCard(page,'Soul Trap')).toContainText('Archon#1');
 await expect(phaseCard(page,'Soul Trap')).not.toContainText('Kabalite Warriors#1');
 await page.emulateMedia({media:'print'});
 for(const n of [1,2]){
  const cargo=printCard(page,'Venom#'+n+' · Declare passengers');
  await expect(cargo).toContainText('Kabalite Warriors#1 (5 + 6 models)');
  await expect(cargo).toContainText('each physical model and its equipment');
  await expect(cargo).not.toContainText('Corsair Voidscarred#1');
 }
 const aerialists=printCard(page,'Venom#1 · Aerialists');
 await expect(aerialists).toContainText('cannot be a unit that can Fly');await expect(aerialists).toContainText('disembarked from a transport');
 await expect(printCard(page,'Corsairs and Travelling Players')).toContainText('140 of 250 points');
 const corsairs=printCard(page,'Corsair Voidscarred#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(corsairs).toContainText('1 × Executioner');await expect(corsairs).toContainText('18″; A 3; BS 3+; D D3');
 await expect(corsairs).toContainText('Psychic');await expect(corsairs).toContainText('1 × Neuro disruptor');
 await expect(printCard(page,'Corsair Voidscarred#1 · Melee weapon profiles')).toContainText('1 × Paired Hekatarii blades');
 await expect(printCard(page,'Corsair Voidscarred#1 · Melee weapon profiles')).toContainText('1 × Witch staff');
 await expect(printCard(page,'Corsair Voidscarred#1 · Mistshield').first()).toContainText('Voidscarred Felarch');
 await expect(printCard(page,'Channeller Stones').first()).toContainText('actual Soul Weaver');
 await expect(printCard(page,'Incubi Shrine Token')).toContainText('1 Incubi Shrine token');
 await expect(printCard(page,'Spiteful Raider · Archon#1')).toContainText('Kabalite Warriors#1');
 const scourges=printCard(page,'Scourges with Heavy Weapons#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(scourges).toContainText('2 × Dark lance');await expect(scourges).toContainText('1 × Haywire blaster');await expect(scourges).toContainText('1 × Heat lance');
 const ravager=printCard(page,'Ravager#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(ravager).toContainText('3 × Disintegrator cannon');await expect(ravager).not.toContainText('Dark lance');
 await expect(printCard(page,'Talos#1 · Melee weapon profiles')).toContainText('2 × Macro-scalpel');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Reaper’s Wager saves two attached Harlequin cargoes, bearer upgrades and mixed native equipment through printing',async({page},info)=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:900});
 await build(page,DRUKHARI_REAPERS_ARMY);await reopen(page,DRUKHARI_REAPERS_ARMY);
 // Reaper’s Wager replaces the normal Corsair allowance, while retaining the Harlequins.
 await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:'Corsair Voidscarred'})).toHaveCount(0);
 await page.getByRole('button',{name:'Play reminders'}).click();await page.getByLabel('Show phase').selectOption('Command');
 await expect(phaseCard(page,'Conductor of Torment · Archon#1')).toContainText('Archon#1');
 await page.getByLabel('Show phase').selectOption('Fight');
 const rapid=phaseCard(page,'Starweaver#1 · Rapid Embarkation');
 await expect(rapid).toContainText('disembarked from this transport');await expect(rapid).not.toContainText('cannot be a unit that can Fly');
 await expect(rapid.getByRole('link',{name:'Rule source'})).toHaveAttribute('href','https://wahapedia.ru/wh40k11ed/factions/aeldari/Starweaver');
 await expect(phaseCard(page,'Venom#1 · Aerialists').getByRole('link',{name:'Rule source'})).toHaveAttribute('href','https://wahapedia.ru/wh40k11ed/factions/drukhari/Venom');
 await page.emulateMedia({media:'print'});
 for(const n of [1,2]){
  const cargo=printCard(page,'Starweaver#'+n+' · Declare passengers');
  await expect(cargo).toContainText('Troupe#1 (6 models)');await expect(cargo).toContainText('Troupe#2 (6 models)');
  await expect(cargo).not.toContainText('Hand of the Archon#1');await expect(cargo).not.toContainText('Troupe Master#1 (1 models)');
 }
 for(const n of [1,2]){
  const cargo=printCard(page,'Raider#'+n+' · Declare passengers');
  await expect(cargo).toContainText('Hand of the Archon#1 (11 models)');await expect(cargo).toContainText('Wyches#1 (11 models)');
  await expect(cargo).not.toContainText('Troupe#1');
 }
 await expect(printCard(page,'Venom#1 · Declare passengers')).toContainText('Incubi#1 (6 models)');
 await expect(printCard(page,'Reaper’s Wager · Harlequin allies')).toContainText('745 of 1000 points');
 const archraider=printCard(page,'Archraider · Troupe Master#1');
 await expect(archraider).toContainText('actually starts embarked');await expect(archraider).toContainText('Starweaver#1');await expect(archraider).not.toContainText('Raider#1');
 await expect(printCard(page,'Reaper’s Cowl · Shadowseer#1').first()).toContainText('Troupe#2');
 await expect(printCard(page,'Reaper’s Cowl · Shadowseer#1').first()).not.toContainText('Troupe#1');
 await expect(printCard(page,'Troupe#2 · Infiltrators')).toHaveCount(1);await expect(printCard(page,'Troupe#1 · Infiltrators')).toHaveCount(0);
 await expect(printCard(page,'Callous Competition')).toContainText('Drukhari are winning');
 const troupe=printCard(page,'Troupe#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(troupe).toContainText('2 × Fusion pistol');await expect(troupe).toContainText('2 × Neuro disruptor');
 await expect(printCard(page,'Stimm-needler').first()).toContainText('first time a saving throw is failed');
 await expect(printCard(page,'Stimm-needler').first()).toContainText('Hand of the Archon#1');
 await expect(printCard(page,'Grav-talon')).toContainText('Arena Champion');
 const talos=printCard(page,'Talos#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(talos).toContainText('2 × Twin haywire blaster');await expect(talos).toContainText('1 × Twin liquifier gun');
 const talosMelee=printCard(page,'Talos#1 · Melee weapon profiles');
 await expect(talosMelee).toContainText('2 × Macro-scalpel');await expect(talosMelee).toContainText('1 × Talos gauntlet');
 const wracks=printCard(page,'Wracks#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 for(const weapon of ['Hexrifle','Liquifier gun','Ossefactor','Stinger pistol'])await expect(wracks).toContainText('1 × '+weapon);
 const skyweavers=printCard(page,'Skyweavers#1 · Ranged weapon profiles').filter({hasText:'Your turn'});
 await expect(skyweavers).toContainText('1 × Skyweaver haywire cannon');await expect(skyweavers).toContainText('1 × Shuriken cannon');
 await verifyPrint(page,info);
});
