export const rialToToman = (v: number | string) => Math.round(Number(v) / 10);

export const formatFa = (v: number) => new Intl.NumberFormat("fa-IR").format(v);

export const formatToman = (v: number | string) =>
  `${formatFa(rialToToman(v))} تومان`;

export const formatRial = (v: number | string) => `${formatFa(Number(v))} ریال`;
