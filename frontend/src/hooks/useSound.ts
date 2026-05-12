import { useEffect, useCallback, useRef } from 'react';
import { Howl, Howler } from 'howler';
import { useSoundStore } from '@/store/soundStore';

const SOUND_ASSETS = {
  gameOver: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg',
  countdown: 'https://actions.google.com/sounds/v1/ui/beep_short.ogg',
};

export const useSound = () => {
  const { isMuted, volume, toggleMute, setVolume } = useSoundStore();
  const soundsRef = useRef<Record<string, Howl>>({});

  useEffect(() => {
    soundsRef.current = {
      gameOver: new Howl({ src: [SOUND_ASSETS.gameOver], volume: volume, preload: true }),
      countdown: new Howl({ src: [SOUND_ASSETS.countdown], volume: volume, preload: true }),
    };

    return () => {
      Object.values(soundsRef.current).forEach(sound => sound.unload());
    };
  }, []);

  useEffect(() => {
    Object.values(soundsRef.current).forEach(sound => {
      sound.volume(isMuted ? 0 : volume);
    });
  }, [isMuted, volume]);

  const playSyntheticSound = useCallback((notes: { freq: number, time: number }[], type: 'sine' | 'square' | 'triangle' | 'sawtooth', duration: number) => {
    if (isMuted) return;
    
    try {
      const ctx = Howler.ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume * 0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
      gainNode.connect(ctx.destination);

      notes.forEach(note => {
        const oscillator = ctx.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(note.freq, now + note.time);
        oscillator.connect(gainNode);
        oscillator.start(now + note.time);
        oscillator.stop(now + note.time + 0.1);
      });
    } catch (e) {
      console.error('Failed to play synthetic sound:', e);
    }
  }, [isMuted, volume]);

  const playSound = useCallback((type: keyof typeof SOUND_ASSETS | 'correct' | 'wrong') => {
    if (type === 'correct') {
      // Pleasant rising arpeggio (C-major feeling)
      playSyntheticSound([
        { freq: 523.25, time: 0 },    // C5
        { freq: 659.25, time: 0.05 }, // E5
        { freq: 783.99, time: 0.1 }   // G5
      ], 'sine', 0.4);
      return;
    }
    if (type === 'wrong') {
      // Low falling "womp" sound
      playSyntheticSound([
        { freq: 220, time: 0 },       // A3
        { freq: 110, time: 0.1 }      // A2
      ], 'triangle', 0.4);
      return;
    }

    if (isMuted) return;
    if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();

    const sound = soundsRef.current[type as keyof typeof SOUND_ASSETS];
    if (sound) {
      if (sound.state() === 'unloaded') sound.load();
      sound.play();
    }
  }, [isMuted, playSyntheticSound]);

  return { playSound, isMuted, toggleMute, volume, setVolume };
};
