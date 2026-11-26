import {expect,test} from '@playwright/test';

test('reopens the Navigator and prints only its selected Beserk formation as a legal restoration target',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Leagues of Votann');
 await page.getByRole('checkbox',{name:/Dêlve Assault Shift/}).check();
 for(const unit of ['Arkanyst Evaluator','Cthonian Beserks','Berehk Stornbröw','Cthonian Earthshakers']){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 }
 const enhancement=page.getByLabel('11th upgrade for squad Arkanyst Evaluator#1',{exact:true});
 await enhancement.selectOption('Dêlvewerke Navigator');
 await page.getByLabel('Attach squad Berehk Stornbröw#1').selectOption('Cthonian Beserks#1');
 await page.reload();
 await expect(enhancement).toHaveValue('Dêlvewerke Navigator');
 await page.getByRole('button',{name:'Play reminders'}).click();
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 await panel.getByLabel('Show phase').selectOption('Movement');
 const title='Dêlvewerke Navigator · Arkanyst Evaluator#1';
 const row=panel.locator('.check').filter({has:page.getByText(title,{exact:true})});
 await expect(row).toContainText('Move Units step');
 await expect(row).toContainText('including zero');
 await expect(row.locator('.rule-subjects')).toHaveText('Roster: Cthonian Beserks#1');
 await expect(row).not.toContainText('Earthshakers');
 await page.emulateMedia({media:'print'});
 const print=page.locator('.print-sheet');
 await expect(print.getByText(title,{exact:true}).locator('..')).toContainText('up to one more per 2 YP');
});

test('Iron Ambassador prevents replacing its required gun until the player removes the enhancement',async({page})=>{
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Leagues of Votann');
 await page.getByRole('checkbox',{name:/Needgaârd Oathband/}).check();
 await page.getByLabel('Select unit',{exact:true}).selectOption('Kâhl');
 await page.getByRole('button',{name:'Add',exact:true}).click();
 const enhancement=page.getByLabel('11th upgrade for squad Kâhl#1');
 const firearm=page.getByLabel('Firearm for Kâhl#1',{exact:true});
 const disintegrator=firearm.locator('option').filter({hasText:'Volkanite disintegrator'});
 await enhancement.selectOption('Iron Ambassador');
 await expect(disintegrator).toBeDisabled();
 await expect(disintegrator).toHaveAttribute('title',/Remove Iron Ambassador/);
 await enhancement.selectOption('');
 await expect(disintegrator).toBeEnabled();
 await firearm.selectOption('Volkanite disintegrator');
 await expect(enhancement.locator('option').filter({hasText:'Iron Ambassador'})).toHaveCount(0);
});
