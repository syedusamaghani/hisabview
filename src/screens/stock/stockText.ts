// Words for units and quantities. Built-in units and the usual packings have translated names; a packing the
// shopkeeper typed themselves is shown exactly as typed.
import type { BaseUnit, ProductUnit } from '../../data';
import type { TextKey } from '../../i18n/translations';
import { breakdown } from '../../lib/stock';

type T = (key: TextKey) => string;

const UNIT_KEYS: Record<string, TextKey> = {
  piece: 'unitPiece',
  dozen: 'unitDozen',
  gram: 'unitGram',
  kg: 'unitKg',
  ml: 'unitMl',
  litre: 'unitLitre',
  packet: 'unitPacket',
  box: 'unitBox',
  carton: 'unitCarton',
  bori: 'unitBori',
  tin: 'unitTin',
  bottle: 'unitBottle',
};

export const unitLabel = (t: T, name: string): string => (UNIT_KEYS[name] ? t(UNIT_KEYS[name]) : name);

export const BASE_TEXT: Record<BaseUnit, TextKey> = { piece: 'basePiece', gram: 'baseGram', ml: 'baseMl' };

// "2 carton 30 dana": the stock written with the biggest units first (a minus sign when below zero)
export function qtyText(t: T, qtyBase: number, product: { base_unit: BaseUnit; units: ProductUnit[] }): string {
  const parts = breakdown(qtyBase, product)
    .map((part) => `${part.count.toLocaleString('en')} ${unitLabel(t, part.unit)}`)
    .join(' ');
  return qtyBase < 0 ? `-${parts}` : parts;
}

export const fill = (text: string, values: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
