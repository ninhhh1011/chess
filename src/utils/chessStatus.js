export function getChessStatus(game) {
  if (game.isCheckmate()) return { label: 'Chiếu hết', tone: 'danger' };
  if (game.isDraw()) return { label: 'Hòa', tone: 'muted' };
  if (game.isCheck()) return { label: 'Đang bị chiếu', tone: 'warning' };
  return { label: 'Đang chơi', tone: 'success' };
}

export function getTurnLabel(game) {
  return game.turn() === 'w' ? 'Trắng đi' : 'Đen đi';
}

export function sameMove(move, target) {
  return move?.from === target.from && move?.to === target.to && (!target.promotion || move?.promotion === target.promotion);
}
