import { gamelan } from './gamelan';

/**
 * Narasi suara makna motif memakai Web Speech API (suara bawaan browser/OS).
 * Memilih suara Bahasa Indonesia bila tersedia; musik gamelan dikecilkan selama narasi.
 */

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'id-ID') ?? voices.find((v) => v.lang.toLowerCase().startsWith('id')) ?? null;
}

// beberapa browser baru memuat daftar suara setelah event ini
if (canSpeak()) window.speechSynthesis.onvoiceschanged = () => pickVoice();

export function speak(text: string, onEnd?: () => void) {
  if (!canSpeak()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'id-ID';
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 0.95;
  u.pitch = 1;
  gamelan.setDuck(true);
  const done = () => {
    gamelan.setDuck(false);
    onEnd?.();
  };
  u.onend = done;
  u.onerror = done;
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  gamelan.setDuck(false);
}
