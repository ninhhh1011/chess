export const BOT_ELO_LEVELS = [
  {
    elo: 400,
    label: "400 ELO",
    description: "Người mới",
    depth: 4,
    movetime: 500,
    skillLevel: 0,
    useSkillLevelOnly: true,
    randomChance: 0
  },
  {
    elo: 800,
    label: "800 ELO",
    description: "Cơ bản",
    depth: 6,
    movetime: 600,
    skillLevel: 3,
    useSkillLevelOnly: true,
    randomChance: 0
  },
  {
    elo: 1200,
    label: "1200 ELO",
    description: "Sơ cấp",
    depth: 8,
    movetime: 800,
    skillLevel: 6,
    useSkillLevelOnly: false,
    randomChance: 0
  },
  {
    elo: 1600,
    label: "1600 ELO",
    description: "Trung cấp",
    depth: 10,
    movetime: 1200,
    skillLevel: 10,
    useSkillLevelOnly: false,
    randomChance: 0
  },
  {
    elo: 2000,
    label: "2000 ELO",
    description: "Mạnh",
    depth: 13,
    movetime: 1800,
    skillLevel: 15,
    useSkillLevelOnly: false,
    randomChance: 0
  },
  {
    elo: 2400,
    label: "2400 ELO",
    description: "Rất mạnh",
    depth: 16,
    movetime: 2500,
    skillLevel: 20,
    useSkillLevelOnly: false,
    randomChance: 0
  }
];

export function getBotLevelByElo(elo) {
  return BOT_ELO_LEVELS.find(level => level.elo === Number(elo)) || BOT_ELO_LEVELS[2];
}
