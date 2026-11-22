import React from 'react';
import { beforeEach, afterEach, test, expect } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { App } from '../src/App';
import { loadWorkspace } from '../src/workspace';
beforeEach(() => localStorage.clear());
afterEach(cleanup);
test('the real tracker persists command points and phase alongside the live sheet', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Play reminders' }));
  fireEvent.click(screen.getByText('Battle tracker'));
  fireEvent.click(screen.getByRole('button', { name: 'Gain command CP for both players' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next phase' }));
  const sheet = screen.getByRole('region', { name: 'Reminder sheet' });
  fireEvent.change(within(sheet).getByLabelText('Phase'), { target: { value: 'current' } });
  expect(within(sheet).queryByText('Reanimation Protocols')).toBeNull();
  expect(within(sheet).getByText('Set up Reinforcements')).toBeTruthy();
  const a = loadWorkspace(localStorage).armies[0];
  expect(a.battle.phase).toBe('Movement');
  expect(a.battle.cp).toEqual({ A: 1, B: 1 });
  expect(a.settings.phase).toBe('current');
});
test('hiding, restoring and completing a reminder survives reopening the app', () => {
  const { unmount } = render(<App />);
  const sheet = () => within(screen.getByRole('region', { name: 'Reminder sheet' }));
  fireEvent.click(sheet().getByRole('button', { name: 'Hide Reanimation Protocols' }));
  expect(sheet().queryByText('Reanimation Protocols')).toBeNull();
  fireEvent.click(sheet().getByLabelText('Show hidden'));
  fireEvent.click(sheet().getByRole('button', { name: 'Restore Reanimation Protocols' }));
  fireEvent.click(sheet().getByRole('checkbox', { name: 'Complete Reanimation Protocols' }));
  expect(sheet().queryByText('Reanimation Protocols')).toBeNull();
  unmount();
  render(<App />);
  fireEvent.click(sheet().getByLabelText('Show completed'));
  expect(
    (sheet().getByRole('checkbox', { name: 'Complete Reanimation Protocols' }) as HTMLInputElement).checked,
  ).toBe(true);
  expect(loadWorkspace(localStorage).armies[0].hidden).toEqual([]);
});
