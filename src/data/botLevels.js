/**
 * Bot ELO Levels Configuration
 *
 * Difficulty labels: Dễ, Vừa, Khó, Thử thách
 * Maps to internal ELO values for engine configuration.
 * Uses direct config values - no computed skill level.
 */

export const BOT_ELO_LEVELS = [
  {
    elo: 400,
    label: "Dễ",
    description: "Người mới",
    depth: 4,
    movetime: 500,
    skillLevel: 0,
    useSkillLevelOnly: true,
    randomChance: 0
  },
  {
    elo: 800,
    label: "Vừa",
    description: "Cơ bản",
    depth: 6,
    movetime: 600,
    skillLevel: 3,
    useSkillLevelOnly: true,
    randomChance: 0
  },
  {
    elo: 1200,
    label: "Khó",
    description: "Sơ cấp",
    depth: 8,
    movetime: 800,
    skillLevel: 6,
    useSkillLevelOnly: false,
    randomChance: 0
  },
  {
    elo: 1600,
    label: "Thử thách",
    description: "Trung cấp",
    depth: 10,
    movetime: 1200,
    skillLevel: 10,
    useSkillLevelOnly: false,
    randomChance: 0
  }
];

/**
 * Get bot level configuration by ELO
 * @param {number} elo
 * @returns {BotLevel}
 */
export function getBotLevelByElo(elo) {
  const level = BOT_ELO_LEVELS.find(level => level.elo === Number(elo));
  if (level) return level;

  // Fallback to closest level
  const sorted = [...BOT_ELO_LEVELS].sort((a, b) => a.elo - b.elo);
  const closest = sorted.reduce((prev, curr) =>
    Math.abs(curr.elo - elo) < Math.abs(prev.elo - elo) ? curr : prev
  );
  return closest;
}

/**
 * @typedef {Object} BotLevel
 * @property {number} elo
 * @property {string} label
 * @property {string} description
 * @property {number} depth
 * @property {number} movetime
 * @property {number} skillLevel
 * @property {boolean} useSkillLevelOnly
 * @property {number} randomChance
 */
