import { describe, expect, test } from 'vitest';
import { toWhitePerspective } from './evaluation';

describe('engine evaluation perspective', () => {
  test('leaves white-to-move scores unchanged', () => {
    expect(toWhitePerspective({ type: 'cp', value: 35, display: '+0.35' }, 'w'))
      .toEqual({ type: 'cp', value: 35, display: '+0.35' });
  });

  test('flips black-to-move centipawn and mate scores to White POV', () => {
    expect(toWhitePerspective({ type: 'cp', value: 35, display: '+0.35' }, 'b'))
      .toEqual({ type: 'cp', value: -35, display: '-0.35' });
    expect(toWhitePerspective({ type: 'mate', value: 3, display: 'Mate in 3' }, 'b'))
      .toEqual({ type: 'mate', value: -3, display: 'Mate in 3 for Black' });
  });

  test('displays the winning side for white-to-move mate scores', () => {
    expect(toWhitePerspective({ type: 'mate', value: -2, display: 'Mate in 2' }, 'w'))
      .toEqual({ type: 'mate', value: -2, display: 'Mate in 2 for Black' });
  });
});
