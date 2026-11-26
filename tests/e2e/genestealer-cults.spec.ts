import {expect,test,type Page} from '@playwright/test';

const neo='Neophyte Hybrids',pures='Purestrain Genestealers',acolytes='Acolyte Hybrids With Hand Flamers';
async function add(page:Page,unit:string){
 await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
 await page.getByRole('button',{name:'Add',exact:true}).click();
}
async function begin(page:Page,detachment:string,size:string){
 await page.getByLabel('Army faction',{exact:true}).selectOption('Genestealer Cults');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(size);
 await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
}
async function expectBudget(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
test('mobile 1,000-point Brood Brothers save two distinct full transports, a legal Support and a mandatory Patriarch',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:390,height:844});
 await page.goto('./');
 await begin(page,'Brood Brothers Auxilia','Incursion');
 for(const unit of ['Patriarch',pures,'Primus','Nexos',neo,acolytes,'Goliath Truck','Achilles Ridgerunners','Cadian Castellan','Cadian Shock Troops','Chimera','Aberrants','Biophagus'])await add(page,unit);
 await page.getByLabel('Attach squad Biophagus#1',{exact:true}).selectOption('Aberrants#1');
 await page.getByLabel('11th upgrade for squad Primus#1',{exact:true}).selectOption('The Hero Returned');
 await page.getByLabel('Acolyte 1 firearm for '+acolytes+'#1',{exact:true}).selectOption('Demolition charges');
 await expect(page.getByText('Warlord: Patriarch#1',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Attach squad Primus#1',{exact:true})).toHaveValue(neo+'#1');
 await expect(page.getByLabel('Attach squad Nexos#1',{exact:true})).toHaveValue(neo+'#1');
 await expect(page.getByLabel('Attach squad Cadian Castellan#1',{exact:true})).toHaveValue('Cadian Shock Troops#1');
 await expectBudget(page,1000);
 page.once('dialog',dialog=>dialog.accept('Alternate force'));
 await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');
 await page.reload();
 await expectBudget(page,1000);
 await expect(page.getByLabel('Acolyte 1 firearm for '+acolytes+'#1',{exact:true})).toHaveValue('Demolition charges');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Shooting');
 await page.emulateMedia({media:'print'});
 const print=page.getByRole('region',{name:'Printable army reminders'});
 await expect(print.locator('h3')).toHaveCount(11);
 const truck=print.getByText('Goliath Truck · Declare passengers',{exact:true}).locator('..');
 await expect(truck).toContainText(neo+'#1');
 await expect(truck).not.toContainText('Cadian Shock Troops#1');
 const chimera=print.getByText('Chimera · Declare passengers',{exact:true}).locator('..');
 await expect(chimera).toContainText('Cadian Shock Troops#1');
 await expect(chimera).not.toContainText(neo+'#1');
});
test('desktop 2,000-point Final Day retains the chosen Tyrant cannon and enhancement, and prints distinct legal passengers',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:1440,height:900});
 await page.goto('./');
 await begin(page,'Final Day','Strike Force');
 for(const unit of ['Deathleaper',pures,'Benefictus','Nexos',neo,'Goliath Truck','Aberrants','Biophagus',acolytes,'Goliath Rockgrinder','Tyrannocyte','Gargoyles','Winged Tyranid Prime','Winged Hive Tyrant','Raveners','Hyperadapted Raveners','Lictor','Atalan Jackals'])await add(page,unit);
 await page.getByLabel('Warlord',{exact:true}).selectOption('Benefictus#1');
 for(const [unit,models] of [[pures,'10'],[neo,'20'],['Aberrants','10'],[acolytes,'10']])await page.getByLabel('Models for squad '+unit+'#1',{exact:true}).selectOption(models);
 await page.getByLabel('Attach squad Biophagus#1',{exact:true}).selectOption('Aberrants#1');
 await page.getByLabel('11th upgrade for squad Winged Hive Tyrant#1',{exact:true}).selectOption('Vanguard Tyrant');
 const weapon=page.getByLabel('Bio-weapon for Winged Hive Tyrant#1',{exact:true});
 const cannon=await weapon.locator('option').filter({hasText:/heavy venom cannon/i}).innerText();
 await weapon.selectOption({label:cannon});
 await expectBudget(page,2000);
 await page.reload();
 await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue('Benefictus#1');
 await expect(weapon).toHaveValue(cannon);
 await expect(page.getByLabel('11th upgrade for squad Winged Hive Tyrant#1',{exact:true})).toHaveValue('Vanguard Tyrant');
 await expect(page.getByLabel('Attach squad Hyperadapted Raveners#1',{exact:true})).toHaveValue('Raveners#1');
 await expect(page.getByLabel('Attach squad Winged Tyranid Prime#1',{exact:true})).toHaveValue('Gargoyles#1');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Movement');
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 const overwatch=panel.locator('.check').filter({has:page.getByText('Fire Overwatch · 1CP',{exact:true})}).locator('.rule-subjects');
 await expect(overwatch).toContainText('Winged Hive Tyrant#1');
 await expect(overwatch).not.toContainText('Lictor#1');
 await page.emulateMedia({media:'print'});
 const print=page.getByRole('region',{name:'Printable army reminders'});
 await expect(print.locator('h3')).toHaveCount(11);
 const pod=print.getByText('Tyrannocyte · Declare passengers',{exact:true}).locator('..');
 await expect(pod).toContainText('Gargoyles#1');
 await expect(pod).toContainText('Winged Hive Tyrant#1');
 await expect(pod).not.toContainText('Raveners#1');
 await expect(pod).not.toContainText('Benefictus#1');
});
