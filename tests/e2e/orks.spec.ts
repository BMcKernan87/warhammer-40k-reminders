import {expect,test,type Page} from '@playwright/test';

async function addUnits(page:Page,units:string[]){
 for(const unit of units){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 }
}

test('an Ork Incursion expands to a 2,000-point Waaagh! with paid weapons, separate Support formations and printable psychic powers',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Orks');
 await page.getByLabel('2026 battle size').selectOption('Incursion');
 await page.getByRole('checkbox',{name:/Green Tide/}).check();
 await page.getByRole('checkbox',{name:/Blitz Brigade/}).check();
 await addUnits(page,['Warboss','Painboy','Boyz','Trukk','Meganobz','Gunwagon','Gorkanaut','Nobz']);
 await page.getByLabel('Warlord',{exact:true}).selectOption('Warboss#1');
 await page.getByLabel('Models for squad Meganobz#1').selectOption('3');
 await page.getByLabel('Meganob 1 · Weapons for Meganobz#1',{exact:true}).selectOption('Twin Killsaws');
 await page.getByLabel('Turret for Gunwagon#1',{exact:true}).selectOption('Zzap Gun');
 await page.getByLabel('Boy 1 · Firearm for Boyz#1',{exact:true}).selectOption('Rokkit Launcha');
 const second=page.getByLabel('Boy 2 · Firearm for Boyz#1',{exact:true});
 await expect(second.locator('option').filter({hasText:'Rokkit Launcha'})).toBeDisabled();
 await second.selectOption('Burna');
 await expect(page.getByLabel('Attach squad Painboy#1')).toHaveValue('Boyz#1');
 await expect(page.getByLabel('Attach squad Warboss#1')).toHaveValue('Boyz#1');
 const findings=page.getByRole('region',{name:'Roster validation findings'});
 await expect(findings.getByText('ERROR',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Recorded 11th-edition total: 1000 points',{exact:true})).toBeVisible();

 await page.setViewportSize({width:1280,height:850});
 await page.getByLabel('2026 battle size').selectOption('Strike Force');
 await page.getByRole('checkbox',{name:/Wurrband/}).check();
 await addUnits(page,['Boyz','Weirdboy','Beast Snagga Boyz','Kill Rig','Battlewagon','Flash Gitz','Kommandos','Deff Dread','Warbikers']);
 await page.getByLabel('Attach squad Weirdboy#1').selectOption('Boyz#2');
 await expect(page.getByText('Recorded 11th-edition total: 2000 points',{exact:true})).toBeVisible();
 await expect(findings.getByText('ERROR',{exact:true})).toHaveCount(0);
 await page.reload();
 await expect(page.getByLabel('Meganob 1 · Weapons for Meganobz#1',{exact:true})).toHaveValue('Twin Killsaws');
 await expect(page.getByLabel('Turret for Gunwagon#1',{exact:true})).toHaveValue('Zzap Gun');
 await expect(page.getByLabel('Attach squad Weirdboy#1')).toHaveValue('Boyz#2');
 await expect(page.getByLabel('Boy 2 · Firearm for Boyz#1',{exact:true})).toHaveValue('Burna');

 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Movement');
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 const jump=panel.locator('.check').filter({has:page.getByText('Da Jump · Weirdboy#1',{exact:true})});
 await expect(jump).toHaveCount(1);
 await expect(jump.locator('.rule-subjects')).toHaveText(/Boyz#2/);
 await expect(jump.locator('.rule-subjects')).not.toHaveText(/Boyz#1/);
 const scent=panel.locator('.check').filter({has:page.getByText('Beastscent · Kill Rig#1',{exact:true})}).locator('.rule-subjects');
 await expect(scent).toContainText('Beast Snagga Boyz#1');
 await expect(scent).not.toContainText('Boyz#2');
 await page.getByLabel('Show phase').selectOption('Shooting');
 const boyzGuns=panel.locator('.check').filter({has:page.getByText('Boyz#1 · Ranged weapon profiles',{exact:true})});
 await expect(boyzGuns).toContainText(/Burna/i);
 await expect(boyzGuns).toContainText(/Rokkit Launcha/i);
 const unmodified=panel.locator('.check').filter({has:page.getByText('Boyz#2 · Ranged weapon profiles',{exact:true})});
 await expect(unmodified).toHaveCount(1);
 await expect(unmodified).not.toContainText(/Rokkit Launcha/i);
 await page.emulateMedia({media:'print'});
 const sheet=page.getByRole('region',{name:'Printable army reminders'});
 for(const ability of ['Waaagh! · War Cry (once per battle)','Da Jump · Weirdboy#1','Warpath · Weirdboy#1','Beastscent · Kill Rig#1','Warpath · Kill Rig#1']){
  await expect(sheet.getByText(ability,{exact:true})).toHaveCount(1);
  await expect(sheet.getByText(ability,{exact:true})).toBeVisible();
 }
});
