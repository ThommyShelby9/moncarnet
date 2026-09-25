export type TelephoneBenin = `+229${string}`;

/**
 * Normalise un numéro béninois au format +22901XXXXXXXX.
 * Depuis le 30/11/2024, les numéros mobiles ont 10 chiffres et commencent par 01 ;
 * un ancien numéro à 8 chiffres reçoit le préfixe 01.
 */
export function normaliserTelephone(saisie: string): TelephoneBenin | null {
  let chiffres = saisie.replace(/\D/g, "");
  if (chiffres.startsWith("00229")) chiffres = chiffres.slice(5);
  else if (chiffres.startsWith("229") && (chiffres.length === 13 || chiffres.length === 11)) chiffres = chiffres.slice(3);
  if (chiffres.length === 8) chiffres = `01${chiffres}`;
  if (chiffres.length !== 10 || !chiffres.startsWith("01")) return null;
  return `+229${chiffres}`;
}

export function formaterTelephone(telephone: TelephoneBenin): string {
  const n = telephone.slice(4);
  return [0, 2, 4, 6, 8].map((i) => n.slice(i, i + 2)).join(" ");
}
