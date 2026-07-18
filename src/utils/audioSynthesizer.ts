/**
 * Programmatic audio synthesis library using Web Audio API
 */

export function playTypewriterClick(audioContext: AudioContext, destinationNode?: AudioNode, volume = 100) {
  if (!audioContext) return;
  if (audioContext.state === 'suspended') {
    // Avoid error, just try to resume or skip
    audioContext.resume().catch(() => {});
  }
  
  try {
    const dest = destinationNode || audioContext.destination;
    const time = audioContext.currentTime;
    
    const volFactor = volume / 100;
    
    // 1. Core high frequency contact tick
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gainNode = audioContext.createGain();

    osc.type = Math.random() > 0.4 ? 'sine' : 'triangle';
    // Organic pitch variation between 380Hz and 580Hz
    const startFreq = 380 + Math.random() * 200;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.035);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, time);
    filter.Q.setValueAtTime(6, time);

    // Boosted significantly for high audibility (gấp hơn 20 lần cho cực kỳ rõ nét)
    gainNode.gain.setValueAtTime(0.85 * volFactor, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);

    osc.start(time);
    osc.stop(time + 0.04);

    // 2. Deeper resonance "thud" body layer
    const thud = audioContext.createOscillator();
    const thudGain = audioContext.createGain();
    
    thud.type = 'sine';
    thud.frequency.setValueAtTime(180 + Math.random() * 50, time);
    thud.frequency.exponentialRampToValueAtTime(50, time + 0.05);

    // Boosted thud body layer significantly as well
    thudGain.gain.setValueAtTime(0.55 * volFactor, time);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    thud.connect(thudGain);
    thudGain.connect(dest);

    thud.start(time);
    thud.stop(time + 0.06);
  } catch (err) {
    console.warn("Failed to synthesize typewriter click:", err);
  }
}

export function playBackgroundNoise(type: string, audioContext: AudioContext, destinationNode?: AudioNode, volume = 50) {
  if (!audioContext) return;
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  
  try {
    const dest = destinationNode || audioContext.destination;
    const time = audioContext.currentTime;
    const volFactor = volume / 100;
    
    if (type === 'dog_bark') {
      // Two quick barks "woof woof" - doubled volume
      const playBark = (delay: number) => {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, time + delay);
        osc.frequency.exponentialRampToValueAtTime(120, time + delay + 0.15);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, time + delay);
        
        gainNode.gain.setValueAtTime(0.24 * volFactor, time + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + delay + 0.18);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(dest);
        
        osc.start(time + delay);
        osc.stop(time + delay + 0.2);
        
        // Add noise burst for bark texture - doubled volume
        const bufferSize = audioContext.sampleRate * 0.15;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 550;
        noiseFilter.Q.value = 2;
        const noiseGain = audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.12 * volFactor, time + delay);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + delay + 0.15);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(dest);
        noise.start(time + delay);
        noise.stop(time + delay + 0.15);
      };
      
      playBark(0);
      playBark(0.22);
    } 
    else if (type === 'door_close') {
      // Latches + heavy thud - doubled volumes
      const latch = audioContext.createOscillator();
      const latchGain = audioContext.createGain();
      latch.type = 'triangle';
      latch.frequency.setValueAtTime(1000, time);
      latch.frequency.setValueAtTime(250, time + 0.02);
      latchGain.gain.setValueAtTime(0.12 * volFactor, time);
      latchGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
      latch.connect(latchGain);
      latchGain.connect(dest);
      latch.start(time);
      latch.stop(time + 0.04);

      const bufferSize = audioContext.sampleRate * 0.4;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = audioContext.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(150, time);
      
      const noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.4 * volFactor, time + 0.01);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(time + 0.01);
      noise.stop(time + 0.4);

      const subThud = audioContext.createOscillator();
      const subGain = audioContext.createGain();
      subThud.type = 'sine';
      subThud.frequency.setValueAtTime(80, time + 0.01);
      subThud.frequency.exponentialRampToValueAtTime(30, time + 0.3);
      subGain.gain.setValueAtTime(0.44 * volFactor, time + 0.01);
      subGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.33);
      subThud.connect(subGain);
      subGain.connect(dest);
      subThud.start(time + 0.01);
      subThud.stop(time + 0.35);
    } 
    else if (type === 'wind') {
      const duration = 1.8;
      const bufferSize = audioContext.sampleRate * duration;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(4.0, time);
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.exponentialRampToValueAtTime(750, time + 0.5);
      filter.frequency.linearRampToValueAtTime(300, time + 1.1);
      filter.frequency.exponentialRampToValueAtTime(550, time + 1.5);
      
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.0001, time);
      gainNode.gain.linearRampToValueAtTime(0.2 * volFactor, time + 0.5);
      gainNode.gain.linearRampToValueAtTime(0.12 * volFactor, time + 1.3);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(dest);
      
      source.start(time);
      source.stop(time + duration);
    } 
    else if (type === 'car_horn') {
      const playHornElement = (freq: number, start: number, dur: number) => {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);
        
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        gainNode.gain.setValueAtTime(0.001, start);
        gainNode.gain.linearRampToValueAtTime(0.12 * volFactor, start + 0.03);
        gainNode.gain.setValueAtTime(0.12 * volFactor, start + dur - 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(dest);
        
        osc.start(start);
        osc.stop(start + dur);
      };
      playHornElement(380, time, 0.45);
      playHornElement(430, time, 0.45);
    } 
    else if (type === 'people_talk') {
      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      const osc3 = audioContext.createOscillator();
      
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(130, time);
      osc1.frequency.linearRampToValueAtTime(145, time + 0.5);
      osc1.frequency.linearRampToValueAtTime(125, time + 1.2);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(210, time);
      osc2.frequency.linearRampToValueAtTime(190, time + 0.6);
      osc2.frequency.linearRampToValueAtTime(230, time + 1.2);
      
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(310, time);
      osc3.frequency.linearRampToValueAtTime(330, time + 0.4);
      osc3.frequency.linearRampToValueAtTime(285, time + 1.2);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(550, time);
      filter.frequency.linearRampToValueAtTime(420, time + 0.7);
      filter.Q.value = 1.3;
      
      gainNode.gain.setValueAtTime(0.01, time);
      gainNode.gain.linearRampToValueAtTime(0.1 * volFactor, time + 0.3);
      gainNode.gain.linearRampToValueAtTime(0.08 * volFactor, time + 0.8);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);
      
      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      
      filter.connect(gainNode);
      gainNode.connect(dest);
      
      osc1.start(time);
      osc1.stop(time + 1.2);
      osc2.start(time);
      osc2.stop(time + 1.2);
      osc3.start(time);
      osc3.stop(time + 1.2);
    } 
    else if (type === 'mouse_click') {
      const osc = audioContext.createOscillator();
      const filter = audioContext.createBiquadFilter();
      const gainNode = audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2100, time);
      osc.frequency.exponentialRampToValueAtTime(450, time + 0.015);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, time);
      filter.Q.setValueAtTime(7, time);
      
      gainNode.gain.setValueAtTime(0.16 * volFactor, time);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.018);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(dest);
      
      osc.start(time);
      osc.stop(time + 0.02);
    } 
    else if (type === 'keyboard') {
      const playChalk = (delay: number) => {
        const osc = audioContext.createOscillator();
        const filter = audioContext.createBiquadFilter();
        const gainNode = audioContext.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400 + Math.random() * 150, time + delay);
        osc.frequency.setValueAtTime(90, time + delay + 0.03);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, time + delay);
        filter.Q.setValueAtTime(3.5, time + delay);
        
        // Boosted significantly for high audio feedback
        gainNode.gain.setValueAtTime(0.25 * volFactor, time + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + delay + 0.035);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(dest);
        
        osc.start(time + delay);
        osc.stop(time + delay + 0.04);
      };
      
      playChalk(0);
      playChalk(0.12);
      playChalk(0.25);
    } 
    else if (type === 'page_turn') {
      const duration = 0.6;
      const bufferSize = audioContext.sampleRate * duration;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const source = applicationSource(audioContext, buffer);
      
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3000, time);
      filter.frequency.linearRampToValueAtTime(1600, time + duration);
      filter.Q.value = 1.0;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.0001, time);
      gainNode.gain.linearRampToValueAtTime(0.14 * volFactor, time + 0.15);
      gainNode.gain.linearRampToValueAtTime(0.06 * volFactor, time + 0.35);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(dest);
      
      source.start(time);
      source.stop(time + duration);
    } 
    else if (type === 'cough') {
      const playCoughPulse = (delay: number, duration: number, volMultiplier: number) => {
        const bufferSize = audioContext.sampleRate * duration;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        
        const source = applicationSource(audioContext, buffer);
        
        const filter = audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, time + delay);
        filter.frequency.linearRampToValueAtTime(1300, time + delay + duration);
        filter.Q.value = 1.5;
        
        const osc = audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, time + delay);
        osc.frequency.linearRampToValueAtTime(100, time + delay + duration);
        const oscGain = audioContext.createGain();
        oscGain.gain.setValueAtTime(0.04 * volFactor * volMultiplier, time + delay);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, time + delay + duration);
        
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.2 * volFactor * volMultiplier, time + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + delay + duration);
        
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(dest);
        
        osc.connect(oscGain);
        oscGain.connect(dest);
        
        source.start(time + delay);
        source.stop(time + delay + duration);
        osc.start(time + delay);
        osc.stop(time + delay + duration);
      };
      
      playCoughPulse(0, 0.16, 1.0);
      playCoughPulse(0.2, 0.22, 0.85);
    } 
    else if (type === 'phone_ring') {
      const playRing = (delay: number, duration: number) => {
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(750, time + delay);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(900, time + delay);
        
        gainNode.gain.setValueAtTime(0.001, time + delay);
        gainNode.gain.linearRampToValueAtTime(0.1 * volFactor, time + delay + 0.05);
        gainNode.gain.setValueAtTime(0.1 * volFactor, time + delay + duration - 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + delay + duration);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(dest);
        
        osc1.start(time + delay);
        osc1.stop(time + delay + duration);
        osc2.start(time + delay);
        osc2.stop(time + delay + duration);
      };
      
      playRing(0, 0.12);
      playRing(0.18, 0.12);
      playRing(0.6, 0.12);
      playRing(0.78, 0.12);
    } 
    else if (type === 'applause') {
      const playClap = (delay: number, clapVol: number) => {
        const osc = audioContext.createOscillator();
        const filter = audioContext.createBiquadFilter();
        const gainNode = audioContext.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240 + Math.random() * 150, time + delay);
        osc.frequency.exponentialRampToValueAtTime(75, time + delay + 0.025);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1300, time + delay);
        filter.Q.setValueAtTime(3.2, time + delay);
        
        gainNode.gain.setValueAtTime(clapVol * volFactor, time + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + delay + 0.03);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(dest);
        
        osc.start(time + delay);
        osc.stop(time + delay + 0.03);
      };
      
      for (let i = 0; i < 20; i++) {
        const delay = Math.random() * 1.5;
        const clVol = 0.05 + Math.random() * 0.09;
        playClap(delay, clVol);
      }
    }
  } catch (err) {
    console.warn("Failed to synthesize background noise:", err);
  }
}

// Helper to make buffer source
function applicationSource(ctx: AudioContext, buffer: AudioBuffer) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

export function playRenderCompleteTick(audioContext?: AudioContext | null) {
  const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const playSingleTick = (time: number, freq: number, pitchDrop: number, duration: number, volume: number) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(pitchDrop, time + duration);
    
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(time);
    osc.stop(time + duration + 0.01);
  };

  try {
    const now = ctx.currentTime;
    // Tick 1: Crisp high frequency ping (2200Hz down to 1000Hz, lasting 0.05s)
    playSingleTick(now, 2200, 1000, 0.05, 0.25);
    
    // Tick 2: A second ping, slightly higher pitch (2600Hz down to 1400Hz, lasting 0.06s) after 120ms gap
    playSingleTick(now + 0.12, 2600, 1400, 0.06, 0.22);
  } catch (err) {
    console.warn("Failed to play render complete tick tone:", err);
  }
}
