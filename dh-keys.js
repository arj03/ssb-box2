const na = require('sodium-native')

// this is for converting FeedKeys (ed25119 signing keys) into
// Diffie-Hellman keys (curve25519 based shared key encryption)

module.exports = class DHKeys {
  static scalarMult (a, b, result) {
    const sk = a instanceof DHKeys ? a.sk : bufferize(a.secret || a.private)
    const pk = b instanceof DHKeys ? b.pk : bufferize(b.public)

    result = result || Buffer.alloc(na.crypto_scalarmult_BYTES)
    na.crypto_scalarmult(result, sk, pk)

    return result
  }

  constructor (keys, opts = {}) {
    // feedKeys = { secret: Buffer, public: Buffer }
    this.type = 3 // dh-key
    this.format = 0 // curve25519

    if (keys === undefined) return // you are expected to use .generate() in this case

    const secret = keys.secret || keys.private

    if (opts.fromEd25519) {
      /* convert ed25519 to curve25519 key */
      this.pk = Buffer.alloc(na.crypto_scalarmult_BYTES)
      na.crypto_sign_ed25519_pk_to_curve25519(this.pk, bufferize(keys.public))

      if (secret) {
        this.sk = Buffer.alloc(na.crypto_scalarmult_SCALARBYTES)
        na.crypto_sign_ed25519_sk_to_curve25519(this.sk, bufferize(secret))
      }
    } else {
      /* already curve25519 */
      if (keys.public) this.pk = bufferize(keys.public)
      if (secret) this.sk = bufferize(secret)
    }

    if (this.pk && this.pk.length !== na.crypto_scalarmult_BYTES) {
      throw new Error(`public key must be ${na.crypto_scalarmult_BYTES} bytes, got ${this.pk.length}`)
    }
    if (this.sk && this.sk.length !== na.crypto_scalarmult_SCALARBYTES) {
      throw new Error(`secret key must be ${na.crypto_scalarmult_SCALARBYTES} bytes, got ${this.sk.length}`)
    }
  }

  generate () {
    this.sk = Buffer.alloc(na.crypto_scalarmult_SCALARBYTES)
    na.randombytes_buf(this.sk)

    this.pk = Buffer.alloc(na.crypto_scalarmult_BYTES)
    na.crypto_scalarmult_base(this.pk, this.sk)

    return this
  }

  toBuffer () {
    return {
      secret: this.sk,
      public: this.pk
    }
  }

  toBFE () {
    return {
      secret: this.sk && Buffer.concat([
        Buffer.from([this.type]),
        Buffer.from([this.format]),
        this.sk
      ]),
      public: Buffer.concat([
        Buffer.from([this.type]),
        Buffer.from([this.format]),
        this.pk
      ])
    }
  }

  toTFK () {
    console.log('toTFK deprecated, please use toBFE')
    return this.toBFE()
  }
}

function bufferize (key, length) {
  if (Buffer.isBuffer(key)) return key

  if (typeof (key) !== 'string') throw new Error(`unable to bufferize ${typeof key}`)

  return Buffer.from(key.replace('.ed25519', ''), 'base64')
}
