import { useEffect, useRef } from 'react';
import useActivityStore from '@/stores/activityStore';
import useAuthStore from '@/stores/authStore';
import { toast } from '@/stores/uiStore';

/** Plays a double chime sound on handoff using Web Audio API (no external assets needed) */
function playHandoffChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playNote = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    playNote(587.33, now, 0.45);       // D5
    playNote(880.00, now + 0.15, 0.6); // A5
  } catch (e) {
    console.error("Audio chime failed", e);
  }
}

/**
 * SSE hook — connects to backend event stream.
 * Falls back gracefully when backend is not available (demo mode).
 */
export function useSSE() {
  const esRef = useRef(null);
  const { isAuthenticated } = useAuthStore();
  const { push, setConnected } = useActivityStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Enable SSE for live backend operation
    const isDemoMode = false;
    if (isDemoMode) {
      setConnected(false);
      return;
    }

    const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
    const es = new EventSource(`${apiBaseUrl}/events`, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        push({ type, ...data });

        // Trigger chime & toast when a hot lead / handoff stage is detected
        if (type === 'hot_lead' || (type === 'agent_replied' && data?.stage === 'handoff')) {
          playHandoffChime();
          const name = data?.leadName || 'Customer';
          toast.error(`⚠️ Action Required: Human takeover handoff triggered for ${name}!`, {
            title: 'Handoff Alert',
            duration: 15000,
          });
        }
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Retry after 5 seconds
      setTimeout(() => {
        if (esRef.current === es) {
          esRef.current = null;
        }
      }, 5000);
    };

    return () => {
      es.close();
      setConnected(false);
      esRef.current = null;
    };
  }, [isAuthenticated, push, setConnected]);
}
