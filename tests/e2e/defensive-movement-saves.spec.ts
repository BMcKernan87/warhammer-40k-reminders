import {test,expect,type Page} from '@playwright/test';
import {addSelectionUnit,newSelection} from '../../src/catalog';
import {individualArmy} from '../../src/roster-instances';
import {initialStore} from '../../src/profiles';
import {verifyPrint} from './printed-phases';

const sheet=(page:Page)=>page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
const card=(page:Page,title:string,turn:string)=>sheet(page).locator('.check').filter({has:page.getByRole('checkbox',{name:title+' · '+turn+' · during',exact:true})});

test('mobile Tau reopens old defense checkmarks while separating new arrival-fire reminders',async({page},info)=>{
 test.setTimeout(90_000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});
 let army=individualArmy({...newSelection('T’au Empire'),detachments2026:['Kauyon']});
 for(const unit of ['Commander Shadowsun','Ghostkeel Battlesuit','Ghostkeel Battlesuit'])army=addSelectionUnit(army,unit);
 army={...army,warlordId:'Commander Shadowsun#1'};
 const store=initialStore(army),profile=store.profiles[0];
 profile.name='Saved Tau defenses';
 const title='Ghostkeel Battlesuit#1 · Stealth';
 // This is the exact pre-change stored identity. Only its display timing changes.
 const oldKey='sheet:'+JSON.stringify(['Movement','11e-tau-profile:Ghostkeel Battlesuit#1:Stealth:Movement:own:end',['Ghostkeel Battlesuit#1']]);
 profile.completed=[oldKey];
 await page.addInitScript(store=>{
  const key='w40k-reminders-profiles-v1';
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(store));
 },store);
 await page.goto('./');
 await expect(page.getByLabel('Saved army',{exact:true})).toHaveValue('default');
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Play reminders',exact:true}).click();
 await sheet(page).getByLabel('Show phase').selectOption('Movement');
 await expect(card(page,title,'Your turn')).toHaveCount(0);
 await expect(card(page,title,'Opponent’s turn').getByRole('checkbox')).not.toBeChecked();
 await expect(card(page,'Ghostkeel Battlesuit#2 · Stealth','Your turn').getByRole('checkbox')).not.toBeChecked();
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(card(page,title,'Your turn').getByRole('checkbox')).toBeChecked();
 for(const turn of ['Your turn','Opponent’s turn']){
  await expect(card(page,'Commander Shadowsun#1 · Invulnerable save',turn)).toContainText('5+ invulnerable save');
  await expect(card(page,'Ghostkeel Battlesuit#1 · Lone Operative',turn)).toContainText('Indirect Fire');
 }
 await card(page,title,'Opponent’s turn').getByRole('checkbox').click();
 await page.reload();
 await page.getByRole('button',{name:'Play reminders',exact:true}).click();
 await sheet(page).getByLabel('Show phase').selectOption('Movement');
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(card(page,title,'Your turn').getByRole('checkbox')).toBeChecked();
 await expect(card(page,title,'Opponent’s turn').getByRole('checkbox')).toBeChecked();
 await expect(card(page,'Ghostkeel Battlesuit#2 · Stealth','Opponent’s turn').getByRole('checkbox')).not.toBeChecked();
 await card(page,title,'Your turn').getByRole('checkbox').click();
 await expect(card(page,title,'Your turn').getByRole('checkbox')).not.toBeChecked();
 await expect(card(page,title,'Opponent’s turn').getByRole('checkbox')).toBeChecked();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('w40k-reminders-profiles-v1')!).profiles[0]);
 expect(saved.completed).not.toContain(oldKey);
 expect(saved.army.instances.map((s:{id:string})=>s.id)).toEqual(['Commander Shadowsun#1','Ghostkeel Battlesuit#1','Ghostkeel Battlesuit#2']);
 await page.screenshot({path:info.outputPath('phase-reminders.png'),fullPage:true});
 await page.emulateMedia({media:'print'});
 const printed=page.getByRole('region',{name:'Printable army reminders'});
 await expect(printed.getByText(title,{exact:true})).toHaveCount(4);
 await expect(printed.getByText('Ghostkeel Battlesuit#2 · Stealth',{exact:true})).toHaveCount(4);
 await expect(printed.getByText('Commander Shadowsun#1 · Invulnerable save',{exact:true})).toHaveCount(5);
 await verifyPrint(page,info);
 expect(errors).toEqual([]);
});
