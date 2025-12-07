// Unit conversion utilities for weights and heights
// All internal storage is in metric (kg for weight, cm for height)

import { WeightUnit } from '../types/Lifts.d';

export interface WeightData {
  value: number; // Always in kg
  unit: WeightUnit;
}

export interface HeightData {
  value: number; // Always in cm
  unit: 'cm' | 'ft-in';
}

// Weight conversions - preserve decimal precision for metric
export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

// Height conversions
export function cmToInches(cm: number): number {
  return Math.round(cm * 0.393701);
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54);
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return inchesToCm(totalInches);
}

// Parse weight string to metric value - preserve decimal precision
export function parseWeightToMetric(weightString: string): number {
  const weightMatch = weightString.match(/(\d+(?:\.\d+)?)\s*(kg|lbs)/);
  if (!weightMatch) return 70; // Default 70kg

  const [, number, unit] = weightMatch;
  const weight = parseFloat(number);

  return unit === 'kg' ? weight : lbsToKg(weight);
}

// Parse height string to metric value
export function parseHeightToMetric(heightString: string): number {
  // Handle metric format (e.g., "175 cm")
  const cmMatch = heightString.match(/(\d+(?:\.\d+)?)\s*cm/);
  if (cmMatch) {
    return Math.round(parseFloat(cmMatch[1]));
  }

  // Handle imperial format (e.g., "5' 7"")
  const feetMatch = heightString.match(/(\d+)'/);
  const inchesMatch = heightString.match(/(\d+)"/);
  if (feetMatch && inchesMatch) {
    const feet = parseInt(feetMatch[1]);
    const inches = parseInt(inchesMatch[1]);
    return feetInchesToCm(feet, inches);
  }

  return 170; // Default 170cm
}

// Format metric weight for display
export function formatWeightForDisplay(kg: number, unitSystem: 'metric' | 'imperial'): string {
  if (unitSystem === 'metric') {
    return `${Number(kg.toFixed(1))} kg`;
  } else {
    const lbs = kgToLbs(kg);
    return `${Math.round(lbs)} lbs`;
  }
}

// Format metric height for display
export function formatHeightForDisplay(cm: number, unitSystem: 'metric' | 'imperial'): string {
  if (unitSystem === 'metric') {
    return `${Math.round(cm)} cm`;
  } else {
    const { feet, inches } = cmToFeetInches(cm);
    return `${feet}' ${inches}"`;
  }
}

// Convert imperial weight input to metric for storage
export function convertImperialWeightToMetric(lbs: number): number {
  return lbsToKg(lbs);
}

// Convert imperial height input to metric for storage
export function convertImperialHeightToMetric(feet: number, inches: number): number {
  return feetInchesToCm(feet, inches);
}

// Convert metric weight to imperial for display/input
export function convertMetricWeightToImperial(kg: number): number {
  return kgToLbs(kg);
}

// Convert metric height to imperial for display/input
export function convertMetricHeightToImperial(cm: number): { feet: number; inches: number } {
  return cmToFeetInches(cm);
}
