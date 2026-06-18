window.CipherLab = window.CipherLab || {};

CipherLab.ciphers = (() => {
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const EN_FREQ = {
    A:8.167,B:1.492,C:2.782,D:4.253,E:12.702,F:2.228,G:2.015,
    H:6.094,I:6.966,J:0.153,K:0.772,L:4.025,M:2.406,N:6.749,
    O:7.507,P:1.929,Q:0.095,R:5.987,S:6.327,T:9.056,U:2.758,
    V:0.978,W:2.360,X:0.150,Y:1.974,Z:0.074
  };

  function caesar(text, shift, decrypt = false) {
    if (decrypt) shift = (26 - ((shift % 26 + 26) % 26)) % 26;
    shift = ((shift % 26) + 26) % 26;
    return text.split('').map(c => {
      const up = c.toUpperCase();
      if (!ALPHA.includes(up)) return c;
      const idx = (ALPHA.indexOf(up) + shift) % 26;
      return c === up ? ALPHA[idx] : ALPHA[idx].toLowerCase();
    }).join('');
  }

  function atbash(text) {
    return text.split('').map(c => {
      const up = c.toUpperCase();
      if (!ALPHA.includes(up)) return c;
      const idx = 25 - ALPHA.indexOf(up);
      return c === up ? ALPHA[idx] : ALPHA[idx].toLowerCase();
    }).join('');
  }

  function rot13(text) { return caesar(text, 13); }

  function vigenere(text, key, decrypt = false) {
    const k = key.toUpperCase().replace(/[^A-Z]/g, '');
    if (!k) return text;
    let ki = 0;
    return text.split('').map(c => {
      const up = c.toUpperCase();
      if (!ALPHA.includes(up)) return c;
      const shift = ALPHA.indexOf(k[ki % k.length]);
      const idx = decrypt
        ? (ALPHA.indexOf(up) - shift + 26) % 26
        : (ALPHA.indexOf(up) + shift) % 26;
      ki++;
      return c === up ? ALPHA[idx] : ALPHA[idx].toLowerCase();
    }).join('');
  }

  function railFenceEncrypt(text, rails) {
    rails = Math.max(2, Math.min(rails, text.length || 2));
    const fence = Array.from({ length: rails }, () => []);
    let rail = 0, dir = 1;
    for (const c of text) {
      fence[rail].push(c);
      if (rail === 0) dir = 1;
      else if (rail === rails - 1) dir = -1;
      rail += dir;
    }
    return fence.map(r => r.join('')).join('');
  }

  function railFenceDecrypt(text, rails) {
    rails = Math.max(2, rails);
    const n = text.length;
    if (n === 0) return text;
    const pattern = [];
    let rail = 0, dir = 1;
    for (let i = 0; i < n; i++) {
      pattern.push(rail);
      if (rail === 0) dir = 1;
      else if (rail === rails - 1) dir = -1;
      rail += dir;
    }
    const lens = new Array(rails).fill(0);
    pattern.forEach(r => lens[r]++);
    const segs = [];
    let pos = 0;
    for (let r = 0; r < rails; r++) {
      segs.push(text.slice(pos, pos + lens[r]).split(''));
      pos += lens[r];
    }
    const idxs = new Array(rails).fill(0);
    return pattern.map(r => segs[r][idxs[r]++]).join('');
  }

  function generateSubKey() {
    const arr = ALPHA.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  function substitution(text, key, decrypt = false) {
    const k = key.toUpperCase();
    return text.split('').map(c => {
      const up = c.toUpperCase();
      if (!ALPHA.includes(up)) return c;
      let idx;
      if (decrypt) {
        idx = k.indexOf(up);
        return idx === -1 ? c : (c === up ? ALPHA[idx] : ALPHA[idx].toLowerCase());
      }
      idx = ALPHA.indexOf(up);
      return c === up ? k[idx] : k[idx].toLowerCase();
    }).join('');
  }

  function getLetterFrequencies(text) {
    const up = text.toUpperCase().replace(/[^A-Z]/g, '');
    const counts = {};
    for (const c of ALPHA) counts[c] = 0;
    for (const c of up) counts[c]++;
    const total = up.length || 1;
    const freq = {};
    for (const [c, n] of Object.entries(counts)) freq[c] = (n / total) * 100;
    return { freq, total: up.length };
  }

  return { caesar, atbash, rot13, vigenere, railFenceEncrypt, railFenceDecrypt, generateSubKey, substitution, getLetterFrequencies, EN_FREQ, ALPHA };
})();
