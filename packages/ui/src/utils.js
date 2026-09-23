import { clsx } from 'clsx'
/** @typedef {import('clsx').ClassValue} ClassValue */
import { twMerge } from 'tailwind-merge'

/** @param {ClassValue[]} inputs */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
