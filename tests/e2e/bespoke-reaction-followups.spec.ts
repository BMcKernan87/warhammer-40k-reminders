import {test,expect,type Page} from '@playwright/test';
import {addSelectionUnit,newSelection,type ArmySelection} from '../../src/catalog';
import {individualArmy} from '../../src/roster-instances';
import {initialStore,type ProfileStore} from '../../src/profiles';
import {verifyPrint} from './printed-phases';

const sheet=(page:Page)=>page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
function card(page:Page,title:string,turn:string,unit?:string){
 const rows=sheet(page).locator('.check').filter({has:page.getByRole('checkbox',{name:title+' · '+turn+' · during',exact:true})});
 return unit?rows.filter({has:page.getByText('Roster: '+unit,{exact:true})}):rows;
}
function savedArmy(faction:ArmySelection['faction'],detachment:string,units:string[],warlord:string){
 let army=individualArmy({...newSelection(faction),detachments2026:[detachment]});
 for(const unit of units)army=addSelectionUnit(army,unit);
 return initialStore({...army,warlordId:warlord});
}
async function openSaved(page:Page,store:ProfileStore){
 await page.addInitScript(store=>{
  const key='w40k-reminders-profiles-v1';
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(store));
 },store);
 await page.goto('./');
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
async function openPhase(page:Page,phase:string){
 await page.getByRole('button',{name:'Play reminders',exact:true}).click();
 await sheet(page).getByLabel('Show phase').selectOption(phase);
}

test('desktop Thousand Sons keeps old suppression checks and separates activation, follow-ups and duplicate Forgefiends',async({page},info)=>{
 test.setTimeout(90_000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:1280,height:900});
 const store=savedArmy('Thousand Sons','Grand Coven',['Infernal Master','Forgefiend','Forgefiend'],'Infernal Master#1');
 store.profiles[0].name='Saved Thousand Sons suppression';
 const oldKey='sheet:'+JSON.stringify(['Shooting','11e-ts-card:Forgefiend#1:Blazing Salvoes:Shooting:opponent:during',['Forgefiend#1']]);
 store.profiles[0].completed=[oldKey];
 await openSaved(page,store);
 await openPhase(page,'Shooting');
 const follow='Blazing Salvoes · suppressed enemy';
 await expect(card(page,follow,'Opponent’s turn','Forgefiend#1')).toHaveCount(0);
 await expect(card(page,follow,'Opponent’s turn','Forgefiend#2').getByRole('checkbox')).not.toBeChecked();
 await expect(card(page,follow,'Your turn','Forgefiend#1')).toContainText('Fixed snap-shot Hit rolls cannot be modified');
 await expect(card(page,follow,'Your turn','Forgefiend#1').getByRole('checkbox')).not.toBeChecked();
 await card(page,'Blazing Salvoes','Your turn','Forgefiend#1').getByRole('checkbox').click();
 await expect(card(page,'Blazing Salvoes','Your turn','Forgefiend#1')).toHaveCount(0);
 await expect(card(page,'Blazing Salvoes','Your turn','Forgefiend#2').getByRole('checkbox')).not.toBeChecked();
 await expect(card(page,follow,'Your turn','Forgefiend#1').getByRole('checkbox')).not.toBeChecked();
 await page.reload();
 await openPhase(page,'Shooting');
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(card(page,'Blazing Salvoes','Your turn','Forgefiend#1').getByRole('checkbox')).toBeChecked();
 await expect(card(page,follow,'Opponent’s turn','Forgefiend#1').getByRole('checkbox')).toBeChecked();
 await expect(card(page,follow,'Your turn','Forgefiend#1').getByRole('checkbox')).not.toBeChecked();
 await sheet(page).getByLabel('Show phase').selectOption('Movement');
 await expect(card(page,follow,'Your turn')).toHaveCount(0);
 for(const unit of ['Forgefiend#1','Forgefiend#2']){
  await expect(card(page,follow,'Opponent’s turn',unit)).toContainText('start of your next turn');
  await expect(card(page,follow,'Opponent’s turn',unit).getByRole('checkbox')).not.toBeChecked();
 }
 await card(page,follow,'Opponent’s turn','Forgefiend#1').getByRole('checkbox').click();
 await page.reload();
 await openPhase(page,'Movement');
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(card(page,follow,'Opponent’s turn','Forgefiend#1').getByRole('checkbox')).toBeChecked();
 await expect(card(page,follow,'Opponent’s turn','Forgefiend#2').getByRole('checkbox')).not.toBeChecked();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('w40k-reminders-profiles-v1')!).profiles[0]);
 expect(saved.completed).toContain(oldKey);
 expect(saved.army.instances.map((s:{id:string})=>s.id)).toEqual(['Infernal Master#1','Forgefiend#1','Forgefiend#2']);
 await page.screenshot({path:info.outputPath('phase-reminders.png'),fullPage:true});
 await page.emulateMedia({media:'print'});
 const printed=page.getByRole('region',{name:'Printable army reminders'});
 await expect(printed.getByText('Blazing Salvoes',{exact:true})).toHaveCount(2);
 await expect(printed.getByText(follow,{exact:true})).toHaveCount(8);
 await verifyPrint(page,info);
 expect(errors).toEqual([]);
});

test('mobile Tyranids preserves defense checks and prints current Stealth with both Movement windows',async({page},info)=>{
 test.setTimeout(90_000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});
 const store=savedArmy('Tyranids','Vanguard Onslaught',['Winged Hive Tyrant','Venomthropes','Zoanthropes','Tyrannofex','Tyrannofex'],'Winged Hive Tyrant#1');
 store.profiles[0].name='Saved Tyranid defenses';
 const oldKey='sheet:'+JSON.stringify(['Movement','11e-tyranid-native:Tyrannofex#1:Resilient Organism:Movement:own:end',['Tyrannofex#1']]);
 store.profiles[0].completed=[oldKey];
 await openSaved(page,store);
 await page.getByLabel('11th upgrade for squad Winged Hive Tyrant#1',{exact:true}).selectOption('Chameleonic');
 await page.reload();
 await expect(page.getByLabel('11th upgrade for squad Winged Hive Tyrant#1',{exact:true})).toHaveValue('Chameleonic');
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
 await openPhase(page,'Movement');
 await expect(card(page,'Resilient Organism','Your turn','Tyrannofex#1')).toHaveCount(0);
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(card(page,'Resilient Organism','Your turn','Tyrannofex#1').getByRole('checkbox')).toBeChecked();
 for(const turn of ['Your turn','Opponent’s turn']){
  await expect(card(page,'Foul Spores',turn)).toContainText('Benefit of Cover');
  await expect(card(page,'Warp Field',turn)).toContainText('6+ invulnerable save');
  await expect(card(page,'Resilient Organism',turn,'Tyrannofex#1')).toContainText('Once per battle');
  await expect(card(page,'Resilient Organism',turn,'Tyrannofex#2').getByRole('checkbox')).not.toBeChecked();
  const camouflage=card(page,'Winged Hive Tyrant#1 · Chameleonic',turn);
  await expect(camouflage).toContainText(/Benefit of Cover/i);
  await expect(camouflage).not.toContainText('−1 to Hit');
 }
 await card(page,'Resilient Organism','Opponent’s turn','Tyrannofex#1').getByRole('checkbox').click();
 await page.reload();
 await openPhase(page,'Movement');
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(card(page,'Resilient Organism','Your turn','Tyrannofex#1').getByRole('checkbox')).toBeChecked();
 await expect(card(page,'Resilient Organism','Opponent’s turn','Tyrannofex#1').getByRole('checkbox')).toBeChecked();
 await expect(card(page,'Resilient Organism','Opponent’s turn','Tyrannofex#2').getByRole('checkbox')).not.toBeChecked();
 await page.screenshot({path:info.outputPath('phase-reminders.png'),fullPage:true});
 await page.emulateMedia({media:'print'});
 const printed=page.getByRole('region',{name:'Printable army reminders'});
 await expect(printed.getByText('Foul Spores',{exact:true})).toHaveCount(4);
 await expect(printed.getByText('Warp Field',{exact:true})).toHaveCount(5);
 await expect(printed.getByText('Resilient Organism',{exact:true})).toHaveCount(10);
 await expect(printed.getByText('Winged Hive Tyrant#1 · Chameleonic',{exact:true})).toHaveCount(3);
 await verifyPrint(page,info);
 expect(errors).toEqual([]);
});
