export const skins = {
  azul: { name: "Azul", color: 0x345fa5, pants: 0x222d45, hair: 0x38251d },
  verde: { name: "Verde", color: 0x416d47, pants: 0x283d34, hair: 0x201e1d },
  terracota: { name: "Terracota", color: 0xa85c3c, pants: 0x3d342b, hair: 0x312018 },
  violeta: { name: "Violeta", color: 0x735895, pants: 0x34283e, hair: 0x291e25 },
} as const;

export type Skin = keyof typeof skins;
export const skinIds = Object.keys(skins) as Skin[];
