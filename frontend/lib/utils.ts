import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const moodLabelFromScore = (score: number) => {
  if (score > 7) return 'happy';
  if (score >= 4) return 'neutral';
  if (score >= 2) return 'low';
  return 'distressed';
};

export const moodEmoji = (score: number) => {
  if (score > 7) return '😊';
  if (score >= 4) return '🙂';
  if (score >= 2) return '😕';
  return '😟';
};
