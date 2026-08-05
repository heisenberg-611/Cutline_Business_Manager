import {
  DollarSign,
  Euro,
  PoundSterling,
  IndianRupee,
  JapaneseYen,
  SwissFranc,
  RussianRuble,
  Banknote,
} from 'lucide-react';
import { currencySymbol } from '@/lib/hq-money';

/**
 * Icons carrying a currency must follow the configured one, or a BDT figure ends
 * up sitting next to a dollar sign.
 *
 * Lucide has icons for only a handful of currencies — there is no Taka glyph —
 * so this falls back to rendering the symbol itself, and to a neutral banknote
 * when even that cannot be derived. That keeps it correct for whatever code an
 * operator sets rather than only for the ones that happen to ship as icons.
 */
const ICONS: Record<string, typeof DollarSign> = {
  USD: DollarSign,
  CAD: DollarSign,
  AUD: DollarSign,
  EUR: Euro,
  GBP: PoundSterling,
  INR: IndianRupee,
  JPY: JapaneseYen,
  CNY: JapaneseYen, // same glyph (¥)
  CHF: SwissFranc,
  RUB: RussianRuble,
};

export function CurrencyIcon({
  currencyCode,
  className = 'w-6 h-6',
}: {
  currencyCode: string;
  className?: string;
}) {
  const Icon = ICONS[currencyCode.toUpperCase()];
  if (Icon) return <Icon className={className} />;

  const symbol = currencySymbol(currencyCode);
  if (symbol) {
    // Sized and centred to occupy the same box as the lucide icons it stands in
    // for, so the badge does not change shape with the currency.
    return (
      <span
        className={`${className} inline-flex items-center justify-center font-bold leading-none`}
        aria-hidden="true"
      >
        {symbol}
      </span>
    );
  }

  return <Banknote className={className} />;
}
