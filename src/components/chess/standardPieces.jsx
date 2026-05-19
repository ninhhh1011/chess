import { defaultPieces } from 'react-chessboard';

const pieceStyle = {
  width: '100%',
  height: '100%',
  filter: 'drop-shadow(0 2px 1px rgba(15,23,42,.5))',
  transition: 'transform 180ms ease, filter 180ms ease',
};

export const standardPieces = Object.fromEntries(
  Object.entries(defaultPieces).map(([piece, renderPiece]) => [
    piece,
    (props = {}) => renderPiece({
      ...props,
      svgStyle: {
        ...pieceStyle,
        ...props.svgStyle,
      },
    }),
  ])
);
