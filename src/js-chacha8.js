/*
MIT License


Copyright (c) 2023 Project Hako

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


Modifications under same license.

Simon Y. Blackwell, AnyWhichWay, LLC 2023
*/

/*
import JSChaCha8 from "js-chacha8";

const key = Buffer.alloc(32); // 32 bytes key
const nonce = Buffer.alloc(12); // 12 bytes nonce
const message = Buffer.allloc(64); // some data as bytes array

// Encrypt //
const encrypt = new JSChaCha8(key, nonce).encrypt(message);
 */
/**
 *
 * @param {Buffer} bufKey
 * @param {Buffer} bufNonce
 * @param {number} counter
 * @throws {Error}
 *
 * @constructor
 */
const JSChaCha8 = function (bufKey, bufNonce, counter) {
    if (typeof counter === 'undefined') {
        counter = 0
    }

    if (!(bufKey instanceof Uint8Array) || bufKey.length !== 32) {
        throw new Error('Key should be 32 byte buffer!')
    }

    if (!(bufNonce instanceof Uint8Array) || bufNonce.length !== 12) {
        throw new Error('Nonce should be 12 byte buffer!')
    }

    const key = new Uint8Array(bufKey)
    const nonce = new Uint8Array(bufNonce)

    this._rounds = 8
    // Constants
    this._sigma = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574] // expand 32-byte k

    // param construction
    this._param = [
        this._sigma[0],
        this._sigma[1],
        this._sigma[2],
        this._sigma[3],
        // key
        this._get32(key, 0),
        this._get32(key, 4),
        this._get32(key, 8),
        this._get32(key, 12),
        this._get32(key, 16),
        this._get32(key, 20),
        this._get32(key, 24),
        this._get32(key, 28),
        // counter
        counter,
        // nonce
        this._get32(nonce, 0),
        this._get32(nonce, 4),
        this._get32(nonce, 8)
    ]

    // init 64 byte keystream block //
    this._keystream = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]

    // internal byte counter //
    this._byteCounter = 0
}

JSChaCha8.prototype._chacha = function () {
    const mix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    let b = 0

    // copy param array to mix //
    for (let i = 0; i < 16; i++) {
        mix[i] = this._param[i]
    }

    // mix rounds //
    for (let i = 0; i < this._rounds; i += 2) {
        this._quarterround(mix, 0, 4, 8, 12)
        this._quarterround(mix, 1, 5, 9, 13)
        this._quarterround(mix, 2, 6, 10, 14)
        this._quarterround(mix, 3, 7, 11, 15)

        this._quarterround(mix, 0, 5, 10, 15)
        this._quarterround(mix, 1, 6, 11, 12)
        this._quarterround(mix, 2, 7, 8, 13)
        this._quarterround(mix, 3, 4, 9, 14)
    }

    for (let i = 0; i < 16; i++) {
        // add
        mix[i] += this._param[i]

        // store keystream
        this._keystream[b++] = mix[i] & 0xFF
        this._keystream[b++] = (mix[i] >>> 8) & 0xFF
        this._keystream[b++] = (mix[i] >>> 16) & 0xFF
        this._keystream[b++] = (mix[i] >>> 24) & 0xFF
    }
}

/**
 * The basic operation of the ChaCha algorithm is the quarter round.
 * It operates on four 32-bit unsigned integers, denoted a, b, c, and d.
 *
 * @param {Array} output
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 * @private
 */
JSChaCha8.prototype._quarterround = function (output, a, b, c, d) {
    output[d] = this._rotl(output[d] ^ (output[a] += output[b]), 16)
    output[b] = this._rotl(output[b] ^ (output[c] += output[d]), 12)
    output[d] = this._rotl(output[d] ^ (output[a] += output[b]), 8)
    output[b] = this._rotl(output[b] ^ (output[c] += output[d]), 7)

    // JavaScript hack to make UINT32 :) //
    output[a] >>>= 0
    output[b] >>>= 0
    output[c] >>>= 0
    output[d] >>>= 0
}

/**
 * Little-endian to uint 32 bytes
 *
 * @param {Uint8Array|[number]} data
 * @param {number} index
 * @return {number}
 * @private
 */
JSChaCha8.prototype._get32 = function (data, index) {
    return data[index++] ^ (data[index++] << 8) ^ (data[index++] << 16) ^ (data[index] << 24)
}

/**
 * Cyclic left rotation
 *
 * @param {number} data
 * @param {number} shift
 * @return {number}
 * @private
 */
JSChaCha8.prototype._rotl = function (data, shift) {
    return ((data << shift) | (data >>> (32 - shift)))
}

/**
 *  Encrypt data with key and nonce
 *
 * @param {String} data
 * @return {String}
 */
JSChaCha8.prototype.encrypt = function (data) {
    return new TextDecoder().decode(this._update(new Uint8Array(data)))
}

/**
 *  Decrypt data with key and nonce
 *
 * @param {Buffer} data
 * @return {Buffer}
 */
JSChaCha8.prototype.decrypt = function (data) {
    return  new TextDecoder().decode(this._update(new Uint8Array(data)))
}

/**
 *  Encrypt or Decrypt data with key and nonce
 *
 * @param {Uint8Array} data
 * @return {Uint8Array}
 * @private
 */
JSChaCha8.prototype._update = function (data) {
    if (!(data instanceof Uint8Array) || data.length === 0) {
        throw new Error('Data should be type of bytes (Uint8Array) and not empty!')
    }

    var output = new Uint8Array(data.length)

    // core function, build block and xor with input data //
    for (var i = 0; i < data.length; i++) {
        if (this._byteCounter === 0 || this._byteCounter === 64) {
            // generate new block //

            this._chacha()
            // counter increment //
            this._param[12]++

            // reset internal counter //
            this._byteCounter = 0
        }

        output[i] = data[i] ^ this._keystream[this._byteCounter++]
    }

    return output
}

export {JSChaCha8, JSChaCha8 as default}