# CipherLab — Cryptanalysis Toolkit

> Started as a 15-line Python Caesar cipher script. Rebuilt as a full cryptanalysis toolkit implementing historical attack methods from 900 AD to 1863.

**[Live Demo](https://parthm200.github.io/CipherLab)**

---

## What It Does

Two modes running side by side: **encrypt/decrypt** using 6 historical ciphers, and **attack** those ciphers automatically using the same mathematical techniques real cryptanalysts used.

### Ciphers

| Cipher | Era | Type |
|---|---|---|
| Caesar | ~50 BC | Monoalphabetic substitution |
| Atbash | ~600 BC | Mirror substitution |
| ROT-13 | 1980s | Caesar shift of 13 |
| Vigenère | 1553 | Polyalphabetic substitution |
| Rail Fence | Ancient/Civil War | Transposition |
| Simple Substitution | General | Full alphabet scramble |

### Attack Engine

**Brute Force (Caesar)** — Tries all 25 keys, scores each decryption against English letter frequencies using a chi-squared test. Correct decryption floats to the top automatically.

**Kasiski Examination + IC Sweep (Vigenère)** — Finds repeated trigram sequences in the ciphertext, measures distances between them, and identifies the key length using both the Kasiski GCD method and an Index of Coincidence sweep. Then splits the ciphertext into columns and attacks each as a Caesar cipher. Reproduces the technique that broke the "unbreakable" Vigenère in 1863.

**Frequency Analysis (Substitution)** — Maps the most-frequent ciphertext letters to the most-frequent English letters (E=12.7%, T=9.1%, etc.). Implements the method Al-Kindi published in 900 AD. The message largely decodes itself.

**Rail Force (Rail Fence)** — Tries each possible rail count and scores for English likelihood.

### Visualizations

- **Cipher wheel** — Two concentric rings showing the plaintext/ciphertext mapping, updates live as you adjust the shift
- **Live frequency histogram** — Your text vs. English baseline, updates character by character
- **IC gauge** — Index of Coincidence reading, green when text is English-like (~0.065)
- **Entropy meter** — Shannon entropy in bits (random text ~4.7, English ~4.0)
- **Rail fence pattern** — Zigzag diagram showing exactly how your text is written across rails

---

## The Point

Every cipher above was considered unbreakable when invented. All were broken by the same two vulnerabilities: small key spaces (brute force) or surviving statistical patterns (frequency analysis). The Modern Cryptography section at the bottom shows why AES, RSA, and post-quantum lattice schemes are designed to defeat both.

---

## Tech

No frameworks. No build step. No backend.

- Pure HTML/CSS/JS
- Chart.js 4.4 (frequency histogram only)
- Raw Canvas API (cipher wheel, rail fence pattern)
- All cipher and attack algorithms written from scratch

---

## Origin

The original version: a Python script that looped `input()` → Caesar shift → `print()`. This keeps the same core algorithm but adds 5 more ciphers, automated cryptanalysis via 3 different attack methods, and a Modern Cryptography primer bridging classical to AES/RSA/post-quantum.
