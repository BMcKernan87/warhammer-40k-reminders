import {test,expect,type Page} from '@playwright/test';

async function add(page:Page,unit:string){
 await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
 await page.getByRole('button',{name:'Add',exact:true}).click();
}
test('a native Blood Legion grows from 1,000 to 2,000 points, retains its equipment and prints distinct god and Battleline recipients',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Chaos Daemons');
 await page.getByLabel('2026 battle size').selectOption('Incursion');
 await page.getByRole('checkbox',{name:/Blood Legion/}).check();
 for(const name of ['Bloodthirster','Bloodmaster','Bloodletters','Bloodletters','Skull Cannon','Bloodcrushers','Flesh Hounds','Skulltaker'])await add(page,name);
 await page.getByLabel('Warlord',{exact:true}).selectOption('Bloodthirster#1');
 await page.getByLabel('11th upgrade for squad Bloodmaster#1',{exact:true}).selectOption('Brazenmaw');
 await page.getByLabel('11th upgrade for squad Bloodthirster#1',{exact:true}).selectOption('Fury’s Cage');
 await page.getByLabel('Separate icon bearer for Bloodletters#1',{exact:true}).selectOption('Daemonic icon');
 await expect(page.getByText('Recorded 11th-edition total: 1000 points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
 await page.getByLabel('2026 battle size').selectOption('Strike Force');
 await page.getByRole('checkbox',{name:/Warptide/}).check();
 for(const name of ['Blue Horrors','Changecaster','Fateskimmer','Flamers','Lord of Change','Pink Horrors','Screamers','The Changeling'])await add(page,name);
 await page.getByLabel('Additional weapon for Lord of Change#1',{exact:true}).selectOption('Rod of sorcery');
 await expect(page.getByText('Recorded 11th-edition total: 2000 points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
 await page.reload();
 await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue('Bloodthirster#1');
 await expect(page.getByLabel('Separate icon bearer for Bloodletters#1',{exact:true})).toHaveValue('Daemonic icon');
 await expect(page.getByLabel('Additional weapon for Lord of Change#1',{exact:true})).toHaveValue('Rod of sorcery');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Movement');
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 const murder=panel.locator('.check').filter({has:page.getByText('Murdercall',{exact:true})});
 await expect(murder).toContainText('Opponent’s turn');
 await expect(murder.locator('.rule-subjects')).toContainText('Bloodletters#1');
 await expect(murder.locator('.rule-subjects')).not.toContainText('Pink Horrors');
 await page.emulateMedia({media:'print'});
 const print=page.getByRole('region',{name:'Printable army reminders'});
 for(const title of ['The Shadow of Chaos','Brazenmaw','Fury’s Cage','Shudderblink'])await expect(print.getByText(title,{exact:true}).first()).toBeVisible();
 const healing=print.getByText(/^Daemonic Infestation · 1CP$/).locator('..').locator('.rule-subjects');
 await expect(healing).toContainText('Blue Horrors#1');
 await expect(healing).not.toContainText('Pink Horrors#1');
});
