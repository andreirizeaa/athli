import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Nutrition',
};

export default function NutritionPage() {
  redirect('/library/nutrition/recipes');
}
