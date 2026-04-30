export const exercises = [
  { id:'mate_one_queen', tags:['checkmate', 'queen_coordination'], title:'Chiếu hết trong 1: Hậu áp sát', description:'Trắng đi và chiếu hết vua đen.', fen:'7k/6Q1/6K1/8/8/8/8/8 w - - 0 1', correctMove:{ from:'g7', to:'g8', promotion:'q' }, hint:'Hậu đi lên cùng cột để khóa vua ở góc.' },
  { id:'knight_capture', tags:['fork', 'hanging_piece'], title:'Bắt hậu miễn phí', description:'Trắng đi, dùng mã bắt hậu đen.', fen:'4k3/8/8/3q4/8/4N3/8/4K3 w - - 0 1', correctMove:{ from:'e3', to:'d5' }, hint:'Mã trắng đang tấn công ô d5.' },
  { id:'promotion_queen', tags:['promotion', 'endgame'], title:'Phong cấp thành hậu', description:'Trắng đưa tốt tới hàng cuối và phong hậu.', fen:'8/P7/8/8/8/8/8/4k2K w - - 0 1', correctMove:{ from:'a7', to:'a8', promotion:'q' }, hint:'Đẩy tốt lên a8 và chọn hậu.' },
  { id:'back_rank_mate', tags:['checkmate', 'back_rank'], title:'Chiếu hết hàng cuối', description:'Trắng đi nước quyết định bằng hậu.', fen:'6k1/6pp/8/8/8/8/5PPP/6QK w - - 0 1', correctMove:{ from:'g1', to:'g8' }, hint:'Hậu đi lên g8 để chiếu hết vua đen.' },
  { id:'bishop_diagonal', tags:['bishop', 'hanging_piece'], title:'Tượng ăn quân theo đường chéo', description:'Trắng dùng tượng ăn xe đen.', fen:'4k3/8/8/1r6/8/3B4/8/4K3 w - - 0 1', correctMove:{ from:'d3', to:'b5' }, hint:'Tượng đi chéo từ d3 tới b5.' },
];
