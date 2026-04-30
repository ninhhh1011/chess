export const BOT_ELO_LEVELS = [
  {
    elo: 400,
    label: "400 ELO",
    description: "Người mới",
    depth: 1,
    movetime: 100,
    skillLevel: 0,
    randomChance: 0.25
  },
  {
    elo: 800,
    label: "800 ELO",
    description: "Cơ bản",
    depth: 2,
    movetime: 200,
    skillLevel: 2,
    randomChance: 0.12
  },
  {
    elo: 1200,
    label: "1200 ELO",
    description: "Sơ cấp",
    depth: 4,
    movetime: 500,
    skillLevel: 5,
    randomChance: 0
  },
  {
    elo: 1600,
    label: "1600 ELO",
    description: "Trung cấp",
    depth: 7,
    movetime: 1000,
    skillLevel: 9,
    randomChance: 0
  },
  {
    elo: 2000,
    label: "2000 ELO",
    description: "Mạnh",
    depth: 10,
    movetime: 1500,
    skillLevel: 14,
    randomChance: 0
  },
  {
    elo: 2400,
    label: "2400 ELO",
    description: "Rất mạnh",
    depth: 14,
    movetime: 2500,
    skillLevel: 20,
    randomChance: 0
  }
];

export function getBotLevelByElo(elo) {
  return BOT_ELO_LEVELS.find(level => level.elo === Number(elo)) || BOT_ELO_LEVELS[2];
}
