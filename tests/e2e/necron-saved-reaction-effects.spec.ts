import {test, expect} from '@playwright/test';
import type {ArmySelection} from '../../src/catalog';
import {verifyPrint} from './printed-phases';

// Exercise a real legacy unit-wide weapon choice together with explicit
// per-model equipment and an independently configured duplicate squad.
// Current Tomb Blades / Deathmarks cards and Starshatter Arsenal:
// https://wahapedia.ru/wh40k11ed/factions/necrons/
function savedArmy(): ArmySelection {
  return {
    faction: 'Necrons', detachment: 'Awakened Dynasty', battleSize2026: 'Strike Force',
    detachments2026: ['Starshatter Arsenal'], warlordId: 'Overlord#1',
    units: {Overlord: 1, Chronomancer: 1, Immortals: 2, Deathmarks: 1, 'Tomb Blades': 2},
    equipment: {'Tomb Blades': 'Twin tesla carbine'},
    upgrades2026: {'Overlord#1': 'Dread Majesty', 'Chronomancer#1': 'Chrono-impedance Fields'},
    instances: [
      {id: 'Overlord#1', unit: 'Overlord', models: 1, equipment: 'Staff of light', attachedTo: 'Immortals#1'},
      {id: 'Chronomancer#1', unit: 'Chronomancer', models: 1, attachedTo: 'Immortals#2'},
      {id: 'Immortals#1', unit: 'Immortals', models: 5, equipment: 'Gauss blaster'},
      {id: 'Immortals#2', unit: 'Immortals', models: 5, equipment: 'Tesla carbine'},
      {id: 'Deathmarks#1', unit: 'Deathmarks', models: 5},
      {id: 'Tomb Blades#1', unit: 'Tomb Blades', models: 3,
        wargear: {Nebuloscope: 1, Shadowloom: 2}, modelLoadouts: [
          {primary: 'Twin tesla carbine', gear: ['Nebuloscope']},
          {primary: 'Twin tesla carbine', gear: ['Shadowloom']},
          {primary: 'Twin tesla carbine', gear: ['Shadowloom']},
        ]},
      {id: 'Tomb Blades#2', unit: 'Tomb Blades', models: 3, equipment: 'Twin gauss blaster',
        modelLoadouts: Array.from({length: 3}, () => ({primary: 'Twin gauss blaster', gear: []}))},
    ],
  };
}

for (const width of [390, 1280]) {
  test(`reopens inherited equipment and prints normal and snap reaction effects at ${width}px`, async ({page}, info) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({width, height: 844});
    const army = savedArmy();
    const battle = {prebattle: {resolved: true, decisions: {}}, round: 1, player: 'A', phase: 'Command', cp: {A: 3, B: 3}, notes: [], units: [], events: []};
    await page.addInitScript(({army, battle}) => {
      const key = 'w40k-reminders-profiles-v1';
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({activeId: 'necron-reactions', profiles: [
        {id: 'necron-reactions', name: 'Necron reaction effects', army, battle, completed: []},
      ]}));
    }, {army, battle});
    await page.goto('./');
    await expect(page.getByLabel('Saved army', {exact: true})).toHaveValue('necron-reactions');
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByRole('region', {name: 'Roster validation findings'}).getByText('ERROR', {exact: true})).toHaveCount(0);
    await expect(page.getByLabel('Equipment for squad Tomb Blades#1', {exact: true})).toHaveValue('Twin tesla carbine');
    await expect(page.getByLabel('Equipment for squad Tomb Blades#2', {exact: true})).toHaveValue('Twin gauss blaster');
    await expect(page.getByLabel('Attach squad Chronomancer#1', {exact: true})).toHaveValue('Immortals#2');
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('w40k-reminders-profiles-v1')!).profiles[0].army);
    expect(await stored()).toEqual(army);

    await page.getByLabel('Equipment for squad Tomb Blades#2', {exact: true}).selectOption('Particle beamer');
    await page.reload();
    await expect(page.getByLabel('Equipment for squad Tomb Blades#2', {exact: true})).toHaveValue('Particle beamer');
    await expect(page.getByLabel('Equipment for squad Tomb Blades#1', {exact: true})).toHaveValue('Twin tesla carbine');
    const reopened = await stored();
    // Editing expands legacy unit-wide equipment into explicit squad choices;
    // the inherited weapon and every physical model row must stay intact.
    expect(reopened.instances.find((model: {id: string}) => model.id === 'Tomb Blades#1')).toEqual({
      ...army.instances!.find(model => model.id === 'Tomb Blades#1'),
      equipment: 'Twin tesla carbine',
    });
    expect(reopened.upgrades2026).toEqual(army.upgrades2026);
    await page.getByRole('button', {name: 'Play reminders', exact: true}).click();
    const sheet = page.getByRole('heading', {name: 'Phase reminders', exact: true}).locator('..');
    await sheet.getByLabel('Show phase').selectOption('Movement');
    const onslaught = sheet.locator('.check').filter({has: page.getByText('Starshatter Arsenal · Relentless Onslaught', {exact: true})});
    await expect(onslaught).toContainText('normal Hyperspace Hunters');
    await expect(onslaught).toContainText('Deathmarks#1');
    await expect(onslaught).not.toContainText('Tomb Blades#1');
    const dread = sheet.locator('.check').filter({has: page.getByText('Overlord#1 · Dread Majesty', {exact: true})});
    await expect(dread).toContainText('re-roll Wound rolls of 1');
    await expect(dread).toContainText('snap shooting cannot re-roll Hit rolls');
    const impedance = sheet.locator('.check').filter({has: page.getByText('Chronomancer#1 · Chrono-impedance Fields', {exact: true})});
    await expect(impedance).toContainText('Tomb Blades#1');
    await expect(impedance).toContainText('Tomb Blades#2');
    await expect(impedance).toContainText('even if the bearer is destroyed');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.emulateMedia({media: 'print'});
    const printed = page.getByRole('region', {name: 'Printable army reminders'});
    const phase = printed.locator('section').filter({has: page.getByRole('heading', {name: 'Movement', exact: true})});
    await expect(phase).toContainText('normal Hyperspace Hunters');
    await expect(phase).toContainText('Chrono-impedance Fields');
    await expect(phase).toContainText('Twin tesla carbine');
    await verifyPrint(page, info);
    expect(errors).toEqual([]);
  });
}
