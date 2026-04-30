import { openings } from '../data/openings';
import { getUserProfile, updateOpeningStats } from './userProfileService';

const STORAGE_KEY = 'vuaCoOpeningProgress';

function nowIso(){ return new Date().toISOString(); }
function clamp(value){ return Math.max(0, Math.min(100, Math.round(value))); }

function read(){
  try{
    if(typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  }catch(error){
    console.warn('[openings] Cannot read progress:', error);
    return {};
  }
}

function write(progress){
  try{
    if(typeof window !== 'undefined' && window.localStorage){
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }catch(error){
    console.warn('[openings] Cannot save progress:', error);
  }
  return progress;
}

function defaultProgress(openingId){
  return { openingId, attempts:0, successCount:0, mistakeCount:0, lastPracticed:null, completedMovesBest:0, masteryPercent:0, mistakes:[] };
}

function normalize(item, openingId){
  return { ...defaultProgress(openingId), ...(item || {}), mistakes:Array.isArray(item?.mistakes) ? item.mistakes : [] };
}

export function getOpeningProgress(){
  const stored = read();
  const normalized = { ...stored };
  openings.forEach(opening => { normalized[opening.id] = normalize(normalized[opening.id], opening.id); });
  return normalized;
}

export function getOpeningProgressById(openingId){
  return normalize(read()[openingId], openingId);
}

export function calculateOpeningMastery(openingId){
  const progress = getOpeningProgressById(openingId);
  const opening = openings.find(o=>o.id===openingId);
  const totalMoves = opening?.moves?.length || 1;
  const moveScore = (progress.completedMovesBest / totalMoves) * 70;
  const successScore = Math.min(progress.successCount * 10, 25);
  const mistakePenalty = Math.min(progress.mistakeCount * 4, 35);
  return clamp(moveScore + successScore - mistakePenalty);
}

export function updateOpeningAttempt({ openingId, success=false, mistakes=[], completedMoves=0 }){
  const all = getOpeningProgress();
  const current = normalize(all[openingId], openingId);
  const nextMistakes = [...current.mistakes, ...(Array.isArray(mistakes) ? mistakes : [])];
  const next = {
    ...current,
    attempts: current.attempts + 1,
    successCount: current.successCount + (success ? 1 : 0),
    mistakeCount: current.mistakeCount + (Array.isArray(mistakes) ? mistakes.length : 0),
    lastPracticed: nowIso(),
    completedMovesBest: Math.max(current.completedMovesBest, completedMoves),
    mistakes: nextMistakes.slice(-30),
  };
  all[openingId] = next;
  all[openingId].masteryPercent = calculateMasteryFromProgress(openingId, all[openingId]);
  write(all);
  updateOpeningStats({ openingId, success, mistakeCount: Array.isArray(mistakes) ? mistakes.length : 0 });
  return all[openingId];
}

function calculateMasteryFromProgress(openingId, progress){
  const opening = openings.find(o=>o.id===openingId);
  const totalMoves = opening?.moves?.length || 1;
  return clamp((progress.completedMovesBest / totalMoves) * 70 + Math.min(progress.successCount * 10, 25) - Math.min(progress.mistakeCount * 4, 35));
}

export function resetOpeningProgress(openingId){
  const all = getOpeningProgress();
  all[openingId] = defaultProgress(openingId);
  return write(all)[openingId];
}
