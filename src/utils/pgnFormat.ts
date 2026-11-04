/**
 * Seven Tag Roster PGN Formatter
 * Implements standard FIDE PGN header generation.
 */

export interface PgnExportOptions {
  moves: string[];
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  result?: 'win' | 'lose' | 'draw' | null;
  playerColor?: 'w' | 'b';
  date?: Date;
  event?: string;
  site?: string;
  round?: string;
  timeControl?: string;
  termination?: string;
}

export function formatResultString(result?: 'win' | 'lose' | 'draw' | null, playerColor: 'w' | 'b' = 'w'): string {
  if (!result) return '*';
  if (result === 'draw') return '1/2-1/2';
  if (result === 'win') {
    return playerColor === 'w' ? '1-0' : '0-1';
  }
  // lose
  return playerColor === 'w' ? '0-1' : '1-0';
}

export function formatPgnMoveText(moves: string[] = []): string {
  if (!moves.length) return '';
  const lines: string[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = moves[i];
    const blackMove = moves[i + 1];

    if (blackMove) {
      lines.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
    } else {
      lines.push(`${moveNumber}. ${whiteMove}`);
    }
  }

  return lines.join(' ');
}

export function formatSevenTagRosterPgn(options: PgnExportOptions): string {
  const {
    moves = [],
    white,
    black,
    whiteElo,
    blackElo,
    result = null,
    playerColor = 'w',
    date = new Date(),
    event = 'Ván đấu với Ninh Lốp Trưởng',
    site = 'Ninh Chess',
    round = '1',
    timeControl,
    termination,
  } = options;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}.${month}.${day}`;

  const resultStr = formatResultString(result, playerColor);

  const headers: string[] = [
    `[Event "${event}"]`,
    `[Site "${site}"]`,
    `[Date "${dateStr}"]`,
    `[Round "${round}"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${resultStr}"]`,
  ];

  if (whiteElo) headers.push(`[WhiteElo "${whiteElo}"]`);
  if (blackElo) headers.push(`[BlackElo "${blackElo}"]`);
  if (timeControl) headers.push(`[TimeControl "${timeControl}"]`);
  if (termination) headers.push(`[Termination "${termination}"]`);

  const moveText = formatPgnMoveText(moves);
  const body = moveText ? `${moveText} ${resultStr}` : resultStr;

  return `${headers.join('\n')}\n\n${body}\n`;
}
