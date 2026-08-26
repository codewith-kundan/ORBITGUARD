class VoiceService {
  private isMuted: boolean = false;
  private synth: SpeechSynthesis | null = null;
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.synth.cancel();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public speakAlert(text: string) {
    if (this.isMuted || !this.synth) return;

    // Prevent spamming the same alert within 30 seconds
    const now = Date.now();
    if (this.lastSpokenText === text && now - this.lastSpokenTime < 30000) {
      return;
    }

    this.lastSpokenText = text;
    this.lastSpokenTime = now;

    try {
      this.synth.cancel(); // Clear queue for immediate tactical alerts
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      utterance.volume = 0.9;

      const voices = this.synth.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      this.synth.speak(utterance);
    } catch (e) {
      console.debug('Speech synthesis unavailable or blocked by browser:', e);
    }
  }
}

export const voiceService = new VoiceService();
