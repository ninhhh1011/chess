import { openings } from '../src/data/openings.js';
import { lessons } from '../src/data/lessons.js';
import { writeFileSync } from 'node:fs';

const TACTIC_TEMPLATES = [
  {
    subcategory: 'fork',
    template: (color = 'white') =>
      `${color === 'white' ? 'Trắng' : 'Đen'} dùng xe ở e2 chiếu hậu ở a6 và tấn công mã ở c7 cùng lúc — đây là fork cổ điển. Fork xảy ra khi một quân tấn công hai quân trở lên cùng lúc.`,
  },
  {
    subcategory: 'pin',
    template: (color = 'white') =>
      `Pin xảy ra khi quân giá trị cao hơn đứng phía sau quân giá trị thấp hơn. Ví dụ: tượng ${color === 'white' ? 'trắng' : 'đen'} ghim xe không cho di chuyển vì sau xe là vua.`,
  },
  {
    subcategory: 'skewer',
    template: (color = 'white') =>
      `Skewer ngược với pin: quân giá trị cao hơn ở phía trước. Ví dụ: xe ${color === 'white' ? 'trắng' : 'đen'} tấn công hậu, hậu phải di chuyển thì xe ăn quân phía sau.`,
  },
  {
    subcategory: 'discovered_attack',
    template: (color = 'white') =>
      `Tấn công giáng chiêu: di chuyển một quân ra khỏi đường tấn công của quân khác. Ví dụ: mã ${color === 'white' ? 'trắng' : 'đen'} nhảy ra, để hậu tấn công vua đối phương.`,
  },
  {
    subcategory: 'checkmate_patterns',
    template: () =>
      `Mẫu chiếu hết phổ biến: back rank mate (chiếu hết hàng cuối), scholar's mate (học giả), smothered mate (ngạt thở). Nhận diện sớm để tránh hoặc khai thác.`,
  },
];

const PRINCIPLE_TEMPLATES = [
  {
    subcategory: 'king_safety',
    template: (level) =>
      `An toàn vua (level ${level}): Nhập thành càng sớm càng tốt trong khai cuộc. Tránh để vua ở trung tâm khi chưa cần thiết. Xây tường tốt trước vua.`,
  },
  {
    subcategory: 'center_control',
    template: (level) =>
      `Kiểm soát trung tâm (level ${level}): Chiếm e4, d4, e5, d5 bằng tốt hoặc tấn công các ô này bằng quân. Quân kiểm soát trung tâm có phạm vi hoạt động rộng hơn.`,
  },
  {
    subcategory: 'development',
    template: (level) =>
      `Phát triển quân (level ${level}): Đưa mã và tượng ra ngoài trong 8-10 nước đầu. Tránh di chuyển một quân nhiều lần. Nhập thành và kết nối xe.`,
  },
  {
    subcategory: 'piece_activity',
    template: (level) =>
      `Hoạt động quân (level ${level}): Quân bị kẹt là quân yếu. Tìm cách đưa quân vào vị trí hoạt động. Đổi quân bị động lấy quân hoạt động tốt của đối phương.`,
  },
  {
    subcategory: 'pawn_structure',
    template: (level) =>
      `Cấu trúc tốt (level ${level}): Tốt cô lập yếu. Tốt thông suốt có thể tạo quân thông. Tránh tạo tốt yếu hoặc tốt đôi.`,
  },
];

const ENDGAME_TEMPLATES = [
  {
    subcategory: 'king_pawn_ending',
    template: () =>
      `Tàn cuộc vua và tốt: Vua phải hoạt động tích cực. Opposition (đối diện) là kỹ thuật quan trọng. Tốt thông suốt thắng trừ khi vua đối phương kịp chặn.`,
  },
  {
    subcategory: 'rook_endgame',
    template: () =>
      `Tàn cuộc xe: Xe hoạt động sau tốt thông là chìa khóa. Tránh để xe bị động. Vua trong tàn cuộc xe rất quan trọng — phải đưa vua vào trung tâm.`,
  },
  {
    subcategory: 'minor_piece_endgame',
    template: () =>
      `Tàn cuộc quân nhẹ: Tượng tốt cho tốt thông suốt (mỗi màu), mã tốt cho tốt cô lập hoặc tốt cụm. Hoạt động vua quyết định thắng thua.`,
  },
  {
    subcategory: 'queen_endgame',
    template: () =>
      `Tàn cuộc hậu: Hậu mạnh nhưng dễ bị chiếu vĩnh viễn. Tránh để hậu đối phương chiếu liên tục khi không có lý do. Dùng hậu để tấn công tốt yếu.`,
  },
];

function generateOpeningChunks() {
  return openings.map((opening) => {
    const moveList = opening.moves.map((m) => m.san).join(' ');
    const ideas = opening.mainIdeas.map((idea) => `- ${idea}`).join('\n');
    const mistakes = opening.commonMistakes.map((mistake) => `- ${mistake}`).join('\n');

    const chunk_text = `Khai cuộc: ${opening.vietnameseName} (${opening.name})
Side: ${opening.side === 'white' ? 'Trắng' : 'Đen'}
Level: ${opening.level}

Mô tả: ${opening.description}

Các nước chính: ${moveList}

Ý tưởng chính:
${ideas}

Lỗi thường gặp:
${mistakes}`;

    return {
      category: 'opening',
      subcategory: opening.id,
      chunk_text,
      metadata: {
        elo_range: opening.level === 'beginner' ? [400, 1000] : opening.level === 'intermediate' ? [1000, 1600] : [1600, 2400],
        color: opening.side,
        game_phase: 'opening',
      },
    };
  });
}

function generateLessonChunks() {
  return lessons.map((lesson) => ({
    category: 'principle',
    subcategory: lesson.id,
    chunk_text: `Bài học: ${lesson.title}

${lesson.content}

Ví dụ: ${lesson.example}`,
    metadata: {
      elo_range: [400, 2400],
      game_phase: 'all',
    },
  }));
}

function generateTacticChunks() {
  const chunks = [];
  for (const template of TACTIC_TEMPLATES) {
    for (const color of ['white', 'black']) {
      chunks.push({
        category: 'tactic',
        subcategory: template.subcategory,
        chunk_text: template.template(color),
        metadata: {
          elo_range: [800, 2400],
          color,
          game_phase: 'middlegame',
        },
      });
    }
  }
  return chunks;
}

function generatePrincipleChunks() {
  const chunks = [];
  for (const template of PRINCIPLE_TEMPLATES) {
    for (const level of ['noob', 'beginner', 'intermediate', 'advanced']) {
      chunks.push({
        category: 'principle',
        subcategory: template.subcategory,
        chunk_text: template.template(level),
        metadata: {
          elo_range: level === 'noob' ? [400, 800] : level === 'beginner' ? [800, 1200] : level === 'intermediate' ? [1200, 1800] : [1800, 2400],
          level,
          game_phase: 'all',
        },
      });
    }
  }
  return chunks;
}

function generateEndgameChunks() {
  return ENDGAME_TEMPLATES.map((template) => ({
    category: 'endgame',
    subcategory: template.subcategory,
    chunk_text: template.template(),
    metadata: {
      elo_range: [1200, 2400],
      game_phase: 'endgame',
    },
  }));
}

const chunks = [
  ...generateOpeningChunks(),
  ...generateLessonChunks(),
  ...generateTacticChunks(),
  ...generatePrincipleChunks(),
  ...generateEndgameChunks(),
];

writeFileSync('chunks.json', JSON.stringify(chunks, null, 2));
console.log(`Generated ${chunks.length} chunks:`);
console.log(`  - ${chunks.filter((c) => c.category === 'opening').length} openings`);
console.log(`  - ${chunks.filter((c) => c.category === 'principle').length} principles/lessons`);
console.log(`  - ${chunks.filter((c) => c.category === 'tactic').length} tactics`);
console.log(`  - ${chunks.filter((c) => c.category === 'endgame').length} endgames`);
