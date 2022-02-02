const aesjs = require('aes-js');
const secret_key = process.env.SECRET_KEY;
const iv_token = process.env.IV_TOKEN;

class Decryptor {
    constructor() {
        this.key = Buffer.from(aesjs.utils.utf8.toBytes(secret_key));
        this.iv = Buffer.from(aesjs.utils.utf8.toBytes(iv_token));
        this.aesCbc = new aesjs.ModeOfOperation.cbc(this.key, this.iv);
    }

    decrypte(data) {
        let decryptedBytes = this.aesCbc.decrypt(data);
        // Convert our bytes back into text
        return aesjs.utils.utf8.fromBytes(decryptedBytes);
    }

    encrypt(text) {
        return this.aesCbc.encrypt(aesjs.utils.utf8.toBytes(text));
    }
}

module.exports = Decryptor;