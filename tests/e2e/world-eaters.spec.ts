import {test,expect,type Page} from '@playwright/test';

const berzerkers='Khorne Berzerkers',lord='Lord on Juggernaut',kharn='Khârn The Betrayer',land='Chaos Land Raider';
async function add(page:Page,unit:string){
 await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
 await page.getByRole('button',{name:'Add',exact:true}).click();
}
async function start(page:Page,size:string,detachment:string){
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('World Eaters');
 await page.getByLabel('2026 battle size').selectOption(size);
 await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
}
async function total(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}

test('a mobile Goretrack army pays for three individual cannons, retains its chosen icon and prints legal whole transports',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:390,height:844});
 await start(page,'Incursion','Goretrack Onslaught');
 for(const unit of [kharn,berzerkers,'Chaos Rhino','Eightbound','Slaughterbound','Forgefiend',land,'Goremongers'])await add(page,unit);
 await page.getByLabel('Warlord',{exact:true}).selectOption(kharn+'#1');
 await expect(page.getByLabel('Attach squad '+kharn+'#1',{exact:true})).toHaveValue(berzerkers+'#1');
 await expect(page.getByLabel('Attach squad Slaughterbound#1',{exact:true})).toHaveValue('Eightbound#1');
 const cannon=page.getByLabel(/alternatives for Forgefiend#1$/i);
 const triple=await cannon.locator('option').filter({hasText:/3 × Ectoplasma cannon/i}).innerText();
 await cannon.selectOption({label:triple});
 const icon=page.getByLabel(/Khorne Berzerker Champion · Icon of Khorne for Khorne Berzerkers#1/i);
 await icon.selectOption({label:'Icon of Khorne'});
 await total(page,1000);
 page.once('dialog',dialog=>dialog.accept('Alternate army'));
 await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');
 await page.reload();
 await total(page,1000);
 await expect(icon).toHaveValue('Icon of Khorne');
 await expect(cannon).toHaveValue(triple);
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Fight');
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 const bloodshed=panel.locator('.check').filter({has:page.getByText('Icon of Khorne · Bloodshed',{exact:true})});
 await expect(bloodshed.locator('.rule-subjects')).toContainText(berzerkers+'#1');
 await expect(bloodshed.locator('.rule-subjects')).not.toContainText('Eightbound#1');
 const rush=panel.locator('.check').filter({has:page.getByText('Rush to the Fray',{exact:true})}).locator('.rule-subjects');
 await expect(rush).toContainText('Eightbound#1');
 await expect(rush).not.toContainText('Forgefiend#1');
 await page.emulateMedia({media:'print'});
 const print=page.getByRole('region',{name:'Printable army reminders'});
 await expect(print.locator('h3')).toHaveCount(11);
 const rhino=print.getByText('Chaos Rhino#1 · Declare embarked formations',{exact:true}).locator('..');
 await expect(rhino).toContainText(berzerkers+'#1 (11 spaces)');
 await expect(rhino).not.toContainText('Eightbound#1');
 await expect(print.getByText('Rage Eternal',{exact:true}).locator('..')).toContainText('Eightbound#1');
 await expect(print.getByText(land+'#1 · Declare embarked formations',{exact:true}).locator('..')).toContainText('Eightbound#1 (8 spaces)');
});

test('a desktop 2,000-point Daemonkin army preserves a Disciple-led Blood Legion and prints Angron’s return window',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:1440,height:900});
 await start(page,'Strike Force','Khorne Daemonkin');
 for(const unit of ['Angron',lord,'Bloodcrushers','Bloodletters',kharn,berzerkers,land,'Chaos Rhino','Jakhals','Helbrute','Chaos Terminators','Skarbrand','Maulerfiend'])await add(page,unit);
 await page.getByLabel('11th upgrade for squad '+lord+'#1',{exact:true}).selectOption('Disciple of Khorne');
 await page.getByLabel('Attach squad '+lord+'#1',{exact:true}).selectOption('Bloodcrushers#1');
 await page.getByLabel('Attach squad '+kharn+'#1',{exact:true}).selectOption(berzerkers+'#1');
 await expect(page.getByText('Warlord: Angron#1',{exact:true})).toBeVisible();
 await total(page,2000);
 await page.reload();
 await expect(page.getByLabel('Attach squad '+lord+'#1',{exact:true})).toHaveValue('Bloodcrushers#1');
 await expect(page.getByLabel('11th upgrade for squad '+lord+'#1',{exact:true})).toHaveValue('Disciple of Khorne');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Movement');
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 await expect(panel.getByText('Angron · Reborn in Blood arrival',{exact:true})).toBeVisible();
 await page.emulateMedia({media:'print'});
 const print=page.getByRole('region',{name:'Printable army reminders'});
 await expect(print.locator('h3')).toHaveCount(11);
 await expect(print.getByText('Angron · Reborn in Blood',{exact:true})).toBeVisible();
 const ramp=print.getByText(land+'#1 · Declare embarked formations',{exact:true}).locator('..');
 await expect(ramp).toContainText('Chaos Terminators#1 (10 spaces)');
 await expect(ramp).not.toContainText('Bloodcrushers#1');
 const tithe=print.getByText('Blood Tithe · earn points',{exact:true}).last().locator('..');
 await expect(tithe.locator('.rule-subjects')).toContainText('Bloodcrushers#1');
 await expect(tithe.locator('.rule-subjects')).not.toContainText(lord+'#1');
});
