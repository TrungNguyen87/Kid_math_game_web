/**
 * QR code encoder (byte mode only) - trimmed and adapted for this app from
 * "QR Code Generator for JavaScript", Copyright (c) 2009 Kazuhiko Arase,
 * MIT licensed (http://www.opensource.org/licenses/mit-license.php),
 * https://github.com/kazuhikoarase/qrcode-generator. "QR Code" is a
 * registered trademark of DENSO WAVE INCORPORATED.
 *
 * Why vendor this rather than hand-roll it like the rest of the app's SVG
 * (`visuals.js`): a QR code is a precise spec (ISO/IEC 18004) with several
 * large tables (Reed-Solomon block sizes and alignment-pattern positions
 * per version, the BCH generator polynomials for the format/version info)
 * that are easy to get subtly wrong from memory and hard to notice broken -
 * a slightly-off table still draws *a* grid of squares, just one no camera
 * can read. Kazuhiko Arase's implementation is the most widely mirrored
 * pure-JS encoder there is; the numbers below are copied from it verbatim,
 * not retyped from memory. What changed for this app: only byte mode is
 * kept (numeric/alphanumeric/kanji modes, the table/canvas/GIF renderers,
 * and the Shift-JIS machinery are all unused here and removed), it is a
 * native ES module instead of a UMD global, and the SVG it builds uses a
 * CSS class instead of inline fill/stroke so it matches the rest of this
 * app's stylesheet-driven theming.
 *
 * tests/web/test_logic.mjs round-trips this: it decodes the matrix this
 * module produces (format info, unmasking, the same zig-zag module order,
 * a Reed-Solomon syndrome check) independently of the encoder's own
 * internal state, which is the part actually worth testing here - the
 * tables are copied, but the wiring between them is this file's own.
 */

// ---------------------------------------------------------------------------
// QRMath - GF(256) log/antilog tables for the Reed-Solomon arithmetic below.
// ---------------------------------------------------------------------------

const QRMath = (function () {
  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);

  for (let i = 0; i < 8; i += 1) EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i += 1) {
    EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i += 1) LOG_TABLE[EXP_TABLE[i]] = i;

  return {
    glog(n) {
      if (n < 1) throw new Error(`glog(${n})`);
      return LOG_TABLE[n];
    },
    gexp(n) {
      while (n < 0) n += 255;
      while (n >= 256) n -= 255;
      return EXP_TABLE[n];
    },
  };
})();

function qrPolynomial(num, shift) {
  let offset = 0;
  while (offset < num.length && num[offset] === 0) offset += 1;
  const _num = new Array(num.length - offset + shift).fill(0);
  for (let i = 0; i < num.length - offset; i += 1) _num[i] = num[i + offset];

  return {
    getAt: (index) => _num[index],
    getLength: () => _num.length,
    multiply(e) {
      const out = new Array(this.getLength() + e.getLength() - 1).fill(0);
      for (let i = 0; i < this.getLength(); i += 1) {
        for (let j = 0; j < e.getLength(); j += 1) {
          out[i + j] ^= QRMath.gexp(QRMath.glog(this.getAt(i)) + QRMath.glog(e.getAt(j)));
        }
      }
      return qrPolynomial(out, 0);
    },
    mod(e) {
      if (this.getLength() - e.getLength() < 0) return this;
      const ratio = QRMath.glog(this.getAt(0)) - QRMath.glog(e.getAt(0));
      const out = new Array(this.getLength());
      for (let i = 0; i < this.getLength(); i += 1) out[i] = this.getAt(i);
      for (let i = 0; i < e.getLength(); i += 1) out[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
      return qrPolynomial(out, 0).mod(e);
    },
  };
}

// ---------------------------------------------------------------------------
// QRUtil - alignment-pattern positions, format/version BCH codes, masking,
// the mask-selection penalty score.
// ---------------------------------------------------------------------------

export const EC_LEVELS = { L: 1, M: 0, Q: 3, H: 2 };

const PATTERN_POSITION_TABLE = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

function bchDigit(data) {
  let digit = 0;
  while (data !== 0) {
    digit += 1;
    data >>>= 1;
  }
  return digit;
}

export function bchTypeInfo(data) {
  let d = data << 10;
  while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15));
  return ((data << 10) | d) ^ G15_MASK;
}

export function bchTypeNumber(data) {
  let d = data << 12;
  while (bchDigit(d) - bchDigit(G18) >= 0) d ^= G18 << (bchDigit(d) - bchDigit(G18));
  return (data << 12) | d;
}

function patternPosition(typeNumber) {
  return PATTERN_POSITION_TABLE[typeNumber - 1];
}

// The 8 standard mask patterns (ISO/IEC 18004 table 10); `getBestMaskPattern`
// below tries all of them and keeps whichever has the lowest penalty score.
const MASK_FUNCTIONS = [
  (i, j) => (i + j) % 2 === 0,
  (i, j) => i % 2 === 0,
  (i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0,
];

function errorCorrectPolynomial(ecLength) {
  let a = qrPolynomial([1], 0);
  for (let i = 0; i < ecLength; i += 1) a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
  return a;
}

// Byte mode's length field is 8 bits for versions 1-9 and 16 bits from
// version 10 up (ISO/IEC 18004 table 3) - the only two cases this app needs,
// since numeric/alphanumeric/kanji mode were dropped along with everything
// that used them.
function lengthInBits(typeNumber) {
  return typeNumber < 10 ? 8 : 16;
}

function getLostPoint(getModuleCount, isDark) {
  const moduleCount = getModuleCount();
  let lostPoint = 0;

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      let sameCount = 0;
      const dark = isDark(row, col);
      for (let r = -1; r <= 1; r += 1) {
        if (row + r < 0 || moduleCount <= row + r) continue;
        for (let c = -1; c <= 1; c += 1) {
          if (col + c < 0 || moduleCount <= col + c) continue;
          if (r === 0 && c === 0) continue;
          if (dark === isDark(row + r, col + c)) sameCount += 1;
        }
      }
      if (sameCount > 5) lostPoint += 3 + sameCount - 5;
    }
  }

  for (let row = 0; row < moduleCount - 1; row += 1) {
    for (let col = 0; col < moduleCount - 1; col += 1) {
      let count = 0;
      if (isDark(row, col)) count += 1;
      if (isDark(row + 1, col)) count += 1;
      if (isDark(row, col + 1)) count += 1;
      if (isDark(row + 1, col + 1)) count += 1;
      if (count === 0 || count === 4) lostPoint += 3;
    }
  }

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount - 6; col += 1) {
      if (
        isDark(row, col) &&
        !isDark(row, col + 1) &&
        isDark(row, col + 2) &&
        isDark(row, col + 3) &&
        isDark(row, col + 4) &&
        !isDark(row, col + 5) &&
        isDark(row, col + 6)
      ) {
        lostPoint += 40;
      }
    }
  }
  for (let col = 0; col < moduleCount; col += 1) {
    for (let row = 0; row < moduleCount - 6; row += 1) {
      if (
        isDark(row, col) &&
        !isDark(row + 1, col) &&
        isDark(row + 2, col) &&
        isDark(row + 3, col) &&
        isDark(row + 4, col) &&
        !isDark(row + 5, col) &&
        isDark(row + 6, col)
      ) {
        lostPoint += 40;
      }
    }
  }

  let darkCount = 0;
  for (let col = 0; col < moduleCount; col += 1) {
    for (let row = 0; row < moduleCount; row += 1) {
      if (isDark(row, col)) darkCount += 1;
    }
  }
  const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
  lostPoint += ratio * 10;

  return lostPoint;
}

// ---------------------------------------------------------------------------
// QRRSBlock - Reed-Solomon block layout per version x error-correction level
// (ISO/IEC 18004 table 9): [count, totalCodewords, dataCodewords] triples,
// repeated when a version splits into more than one block group.
// ---------------------------------------------------------------------------

// prettier-ignore
const RS_BLOCK_TABLE = [
  [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
  [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
  [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
  [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
  [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
  [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
  [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
  [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
  [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
  [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
  [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
  [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
  [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
  [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
  [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13],
  [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
  [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
  [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
  [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
  [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
  [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
  [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
  [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
  [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
  [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
  [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
  [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
  [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
  [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
  [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
  [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
  [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
  [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
  [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
  [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
  [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
  [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
  [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
  [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
  [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16],
];

function ecLevelIndex(ecLevel) {
  // RS_BLOCK_TABLE (and QRErrorCorrectionLevel's numeric codes below) list
  // L, M, Q, H in that order for every version.
  return { L: 0, M: 1, Q: 2, H: 3 }[ecLevel];
}

function getRSBlocks(typeNumber, ecLevel) {
  const row = RS_BLOCK_TABLE[(typeNumber - 1) * 4 + ecLevelIndex(ecLevel)];
  const list = [];
  for (let i = 0; i < row.length / 3; i += 1) {
    const count = row[i * 3];
    const totalCount = row[i * 3 + 1];
    const dataCount = row[i * 3 + 2];
    for (let j = 0; j < count; j += 1) list.push({ totalCount, dataCount });
  }
  return list;
}

// ---------------------------------------------------------------------------
// Bit buffer + byte-mode data segment
// ---------------------------------------------------------------------------

function qrBitBuffer() {
  const buffer = [];
  let length = 0;
  return {
    getBuffer: () => buffer,
    getLengthInBits: () => length,
    putBit(bit) {
      const bufIndex = Math.floor(length / 8);
      if (buffer.length <= bufIndex) buffer.push(0);
      if (bit) buffer[bufIndex] |= 0x80 >>> length % 8;
      length += 1;
    },
    put(num, bitLength) {
      for (let i = 0; i < bitLength; i += 1) this.putBit(((num >>> (bitLength - i - 1)) & 1) === 1);
    },
  };
}

/** UTF-8 encode, same behaviour as TextEncoder - written out so this module
 *  has no runtime dependency on it (Node's `--test` runs this file directly,
 *  and older browsers are exactly the crowd `prefers-reduced-motion`-style
 *  degradation in the rest of this app is written for). */
function toUtf8Bytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i += 1) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i += 1;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// The encoder itself
// ---------------------------------------------------------------------------

const PAD0 = 0xec;
const PAD1 = 0x11;
const MODE_8BIT_BYTE = 1 << 2;

function createData(typeNumber, ecLevel, bytes) {
  const rsBlocks = getRSBlocks(typeNumber, ecLevel);
  const buffer = qrBitBuffer();

  buffer.put(MODE_8BIT_BYTE, 4);
  buffer.put(bytes.length, lengthInBits(typeNumber));
  for (let i = 0; i < bytes.length; i += 1) buffer.put(bytes[i], 8);

  let totalDataCount = 0;
  for (const block of rsBlocks) totalDataCount += block.dataCount;

  if (buffer.getLengthInBits() > totalDataCount * 8) {
    throw new RangeError(`too much data for this QR version (${buffer.getLengthInBits()} > ${totalDataCount * 8} bits)`);
  }
  if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
  while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
  while (buffer.getLengthInBits() < totalDataCount * 8) {
    buffer.put(PAD0, 8);
    if (buffer.getLengthInBits() >= totalDataCount * 8) break;
    buffer.put(PAD1, 8);
  }

  return createCodewords(buffer, rsBlocks);
}

function createCodewords(buffer, rsBlocks) {
  let offset = 0;
  let maxDcCount = 0;
  let maxEcCount = 0;
  const dcdata = new Array(rsBlocks.length);
  const ecdata = new Array(rsBlocks.length);

  rsBlocks.forEach((block, r) => {
    const dcCount = block.dataCount;
    const ecCount = block.totalCount - dcCount;
    maxDcCount = Math.max(maxDcCount, dcCount);
    maxEcCount = Math.max(maxEcCount, ecCount);

    dcdata[r] = new Array(dcCount);
    for (let i = 0; i < dcCount; i += 1) dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
    offset += dcCount;

    const rsPoly = errorCorrectPolynomial(ecCount);
    const rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
    const modPoly = rawPoly.mod(rsPoly);
    ecdata[r] = new Array(rsPoly.getLength() - 1);
    for (let i = 0; i < ecdata[r].length; i += 1) {
      const modIndex = i + modPoly.getLength() - ecdata[r].length;
      ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
    }
  });

  let totalCodeCount = 0;
  for (const block of rsBlocks) totalCodeCount += block.totalCount;

  const data = new Array(totalCodeCount);
  let index = 0;
  for (let i = 0; i < maxDcCount; i += 1) {
    for (let r = 0; r < rsBlocks.length; r += 1) {
      if (i < dcdata[r].length) data[index++] = dcdata[r][i];
    }
  }
  for (let i = 0; i < maxEcCount; i += 1) {
    for (let r = 0; r < rsBlocks.length; r += 1) {
      if (i < ecdata[r].length) data[index++] = ecdata[r][i];
    }
  }
  return data;
}

/**
 * Encode `text` (UTF-8 byte mode) into a QR module matrix.
 * @param {string} text
 * @param {{ecLevel?: 'L'|'M'|'Q'|'H'}} [opts] - defaults to 'L' (7% error
 *   correction, the most capacity), since this app's payloads are shown on
 *   one screen and scanned close up rather than printed and weathered.
 * @returns {{size: number, typeNumber: number, ecLevel: string, isDark: (row: number, col: number) => boolean}}
 */
export function encodeQr(text, opts = {}) {
  const ecLevel = opts.ecLevel || "L";
  if (!(ecLevel in EC_LEVELS)) throw new RangeError(`unknown EC level: ${ecLevel}`);
  const bytes = toUtf8Bytes(String(text));

  let typeNumber = null;
  for (let t = 1; t <= 40; t += 1) {
    const rsBlocks = getRSBlocks(t, ecLevel);
    let totalDataCount = 0;
    for (const block of rsBlocks) totalDataCount += block.dataCount;
    const headerBits = 4 + lengthInBits(t);
    if (headerBits + bytes.length * 8 <= totalDataCount * 8) {
      typeNumber = t;
      break;
    }
  }
  if (typeNumber === null) {
    throw new RangeError(`too much data for a QR code at EC level ${ecLevel} (${bytes.length} bytes)`);
  }

  const moduleCount = typeNumber * 4 + 17;
  const dataCache = createData(typeNumber, ecLevel, bytes);

  function build(maskPattern, applyMask) {
    const modules = Array.from({ length: moduleCount }, () => new Array(moduleCount).fill(null));

    const setupFinder = (row, col) => {
      for (let r = -1; r <= 7; r += 1) {
        if (row + r <= -1 || moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c += 1) {
          if (col + c <= -1 || moduleCount <= col + c) continue;
          const isRing = (0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6));
          const isCore = 2 <= r && r <= 4 && 2 <= c && c <= 4;
          modules[row + r][col + c] = isRing || isCore;
        }
      }
    };
    setupFinder(0, 0);
    setupFinder(moduleCount - 7, 0);
    setupFinder(0, moduleCount - 7);

    const pos = patternPosition(typeNumber);
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = 0; j < pos.length; j += 1) {
        const row = pos[i];
        const col = pos[j];
        if (modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            modules[row + r][col + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          }
        }
      }
    }

    for (let r = 8; r < moduleCount - 8; r += 1) {
      if (modules[r][6] === null) modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < moduleCount - 8; c += 1) {
      if (modules[6][c] === null) modules[6][c] = c % 2 === 0;
    }

    const infoData = (EC_LEVELS[ecLevel] << 3) | maskPattern;
    const infoBits = bchTypeInfo(infoData);
    for (let i = 0; i < 15; i += 1) {
      const bit = ((infoBits >> i) & 1) === 1;
      if (i < 6) modules[i][8] = bit;
      else if (i < 8) modules[i + 1][8] = bit;
      else modules[moduleCount - 15 + i][8] = bit;
    }
    for (let i = 0; i < 15; i += 1) {
      const bit = ((infoBits >> i) & 1) === 1;
      if (i < 8) modules[8][moduleCount - i - 1] = bit;
      else if (i < 9) modules[8][15 - i - 1 + 1] = bit;
      else modules[8][15 - i - 1] = bit;
    }
    modules[moduleCount - 8][8] = true; // the dark module, always on

    if (typeNumber >= 7) {
      const numberBits = bchTypeNumber(typeNumber);
      for (let i = 0; i < 18; i += 1) {
        const bit = ((numberBits >> i) & 1) === 1;
        modules[Math.floor(i / 3)][(i % 3) + moduleCount - 8 - 3] = bit;
        modules[(i % 3) + moduleCount - 8 - 3][Math.floor(i / 3)] = bit;
      }
    }

    const maskFn = MASK_FUNCTIONS[maskPattern];
    let inc = -1;
    let row = moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        for (let c = 0; c < 2; c += 1) {
          if (modules[row][col - c] === null) {
            let dark = false;
            if (applyMask && byteIndex < dataCache.length) {
              dark = ((dataCache[byteIndex] >>> bitIndex) & 1) === 1;
            }
            if (applyMask && maskFn(row, col - c)) dark = !dark;
            modules[row][col - c] = dark;
            bitIndex -= 1;
            if (bitIndex === -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }

    return modules;
  }

  const isDarkOf = (modules) => (row, col) => modules[row][col];

  let bestPattern = 0;
  let bestScore = Infinity;
  for (let pattern = 0; pattern < 8; pattern += 1) {
    const modules = build(pattern, true);
    const score = getLostPoint(() => moduleCount, isDarkOf(modules));
    if (score < bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  const finalModules = build(bestPattern, true);
  return {
    size: moduleCount,
    typeNumber,
    ecLevel,
    maskPattern: bestPattern,
    isDark: isDarkOf(finalModules),
  };
}

/**
 * Render `text` as a self-contained SVG string: a white quiet zone and a
 * single path of dark modules (one path, not one `<rect>` per module, so a
 * high-version code stays a handful of DOM bytes instead of thousands of
 * elements). `className` is applied to the dark-module path so CSS can set
 * its colour; the quiet zone is always plain white, regardless of the
 * site's theme, because a QR code's contrast is what makes it scannable -
 * unlike everything else in this app, it deliberately ignores dark mode.
 */
export function qrSvg(text, opts = {}) {
  const cellSize = opts.cellSize ?? 4;
  const margin = opts.margin ?? cellSize * 4;
  const className = opts.className ?? "kmg-qr-modules";
  const { size, isDark } = encodeQr(text, opts);
  const pixels = size * cellSize + margin * 2;

  let path = "";
  for (let r = 0; r < size; r += 1) {
    const y = r * cellSize + margin;
    for (let c = 0; c < size; c += 1) {
      if (!isDark(r, c)) continue;
      const x = c * cellSize + margin;
      path += `M${x},${y}h${cellSize}v${cellSize}h${-cellSize}z`;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pixels} ${pixels}" width="${pixels}" height="${pixels}" role="img" aria-label="QR code">` +
    `<rect width="${pixels}" height="${pixels}" fill="#ffffff"/>` +
    `<path d="${path}" class="${className}" fill="#000000"/>` +
    `</svg>`
  );
}

// Exposed for the round-trip test in tests/web/test_logic.mjs - not needed
// by any page in web/js/pages, so it isn't part of the public "how to draw a
// QR code" surface above.
export const _internal = {
  getRSBlocks,
  lengthInBits,
  MASK_FUNCTIONS,
  MODE_8BIT_BYTE,
  toUtf8Bytes,
  patternPosition,
  QRMath,
};
