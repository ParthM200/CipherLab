window.CipherLab = window.CipherLab || {};

CipherLab.attacks = (() => {
  const { caesar, vigenere, getLetterFrequencies, EN_FREQ, ALPHA } = CipherLab.ciphers;

  function chiSquared(text) {
    const { freq, total } = getLetterFrequencies(text);
    if (total === 0) return Infinity;
    return Object.entries(EN_FREQ).reduce((sum, [c, expected]) => {
      const observed = freq[c] || 0;
      return sum + Math.pow(observed - expected, 2) / expected;
    }, 0);
  }

  // IC = Σ n_i(n_i-1) / N(N-1)  — English ~0.0667, random ~0.0385
  function indexOfCoincidence(text) {
    const up = text.toUpperCase().replace(/[^A-Z]/g, '');
    const n = up.length;
    if (n < 2) return 0;
    const counts = {};
    for (const c of ALPHA) counts[c] = 0;
    for (const c of up) counts[c]++;
    const num = Object.values(counts).reduce((s, c) => s + c * (c - 1), 0);
    return num / (n * (n - 1));
  }

  // Shannon entropy in bits
  function entropy(text) {
    const up = text.toUpperCase().replace(/[^A-Z]/g, '');
    if (!up.length) return 0;
    const counts = {};
    for (const c of up) counts[c] = (counts[c] || 0) + 1;
    const n = up.length;
    return -Object.values(counts).reduce((s, c) => {
      const p = c / n;
      return s + p * Math.log2(p);
    }, 0);
  }

  function bruteForceCaesar(ciphertext) {
    return Array.from({ length: 26 }, (_, shift) => {
      const decrypted = caesar(ciphertext, shift, true);
      return { shift, decrypted, score: chiSquared(decrypted) };
    }).sort((a, b) => a.score - b.score);
  }

  // Map top-frequency ciphertext letters → top-frequency English letters
  function frequencyMap(text) {
    const { freq } = getLetterFrequencies(text);
    const sortedCipher = ALPHA.split('').sort((a, b) => (freq[b] || 0) - (freq[a] || 0));
    const sortedEnglish = Object.entries(EN_FREQ)
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);
    const mapping = {};
    sortedCipher.forEach((c, i) => { mapping[c] = sortedEnglish[i] || '?'; });
    return mapping;
  }

  function applyMapping(text, mapping) {
    return text.toUpperCase().split('').map(c => {
      if (ALPHA.includes(c)) return mapping[c] || c;
      return c;
    }).join('');
  }

  // Find all repeated trigrams and record distances between occurrences
  function findRepeatedNgrams(text, n = 3) {
    const up = text.toUpperCase().replace(/[^A-Z]/g, '');
    const positions = {};
    for (let i = 0; i <= up.length - n; i++) {
      const gram = up.slice(i, i + n);
      if (!positions[gram]) positions[gram] = [];
      positions[gram].push(i);
    }
    return Object.entries(positions)
      .filter(([, pos]) => pos.length > 1)
      .map(([gram, pos]) => ({
        gram,
        positions: pos,
        distances: pos.slice(1).map((p, i) => p - pos[i])
      }))
      .sort((a, b) => b.positions.length - a.positions.length);
  }

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  // Kasiski: score each candidate key length by how many trigram distances it divides
  function kasiskiKeyLength(ciphertext, maxLen = 20) {
    const ngrams = findRepeatedNgrams(ciphertext, 3);
    if (!ngrams.length) return { keyLengths: [], ngrams: [] };
    const allDist = ngrams.flatMap(g => g.distances);
    if (!allDist.length) return { keyLengths: [], ngrams };
    const scores = {};
    for (let L = 2; L <= maxLen; L++) {
      scores[L] = allDist.filter(d => d % L === 0).length;
    }
    const keyLengths = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([L, count]) => ({ length: parseInt(L), count }));
    return { keyLengths, ngrams: ngrams.slice(0, 8) };
  }

  // Average IC across L groups — spikes near 0.065 when L = true key length
  function icForKeyLength(text, L) {
    const up = text.toUpperCase().replace(/[^A-Z]/g, '');
    let total = 0;
    for (let i = 0; i < L; i++) {
      const group = up.split('').filter((_, idx) => idx % L === i).join('');
      total += indexOfCoincidence(group);
    }
    return total / L;
  }

  // IC sweep: rank key lengths by how close their avg IC is to English (~0.065)
  function icKeyLengths(text, maxLen = 14) {
    const up = text.toUpperCase().replace(/[^A-Z]/g, '');
    const EN_IC = 0.0667;
    return Array.from({ length: maxLen - 1 }, (_, i) => i + 2)
      .map(L => ({ length: L, ic: icForKeyLength(up, L) }))
      .sort((a, b) => Math.abs(a.ic - EN_IC) - Math.abs(b.ic - EN_IC));
  }

  // Break Vigenère: for each column, find the Caesar shift that makes IC highest
  function breakVigenere(ciphertext, keyLength) {
    const up = ciphertext.toUpperCase().replace(/[^A-Z]/g, '');
    let key = '';
    for (let i = 0; i < keyLength; i++) {
      const group = up.split('').filter((_, idx) => idx % keyLength === i).join('');
      const best = bruteForceCaesar(group)[0];
      // best.shift IS the key letter index (caesar decrypt shift = key index in vigenere)
      key += ALPHA[best.shift];
    }
    return { key, decrypted: vigenere(ciphertext, key, true) };
  }

  return {
    chiSquared, indexOfCoincidence, entropy,
    bruteForceCaesar, frequencyMap, applyMapping,
    findRepeatedNgrams, kasiskiKeyLength, icForKeyLength, icKeyLengths, breakVigenere
  };
})();
