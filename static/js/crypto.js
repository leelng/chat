/**
 * 加密工具模块
 * 提供端到端加密功能
 */

class CryptoManager {
    constructor() {
        this.keyPair = null;
        this.sharedKeys = new Map(); // 存储与其他用户的共享密钥
    }

    /**
     * 生成密钥对
     */
    async generateKeyPair() {
        try {
            this.keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "ECDH",
                    namedCurve: "P-256"
                },
                true,
                ["deriveKey", "deriveBits"]
            );
            console.log('密钥对生成成功');
            return this.keyPair;
        } catch (error) {
            console.error('生成密钥对失败:', error);
            throw error;
        }
    }

    /**
     * 导出公钥
     */
    async exportPublicKey() {
        if (!this.keyPair) {
            await this.generateKeyPair();
        }
        try {
            const publicKey = await window.crypto.subtle.exportKey(
                "raw",
                this.keyPair.publicKey
            );
            return this.arrayBufferToBase64(publicKey);
        } catch (error) {
            console.error('导出公钥失败:', error);
            throw error;
        }
    }

    /**
     * 导入公钥
     */
    async importPublicKey(base64Key) {
        try {
            const keyData = this.base64ToArrayBuffer(base64Key);
            const publicKey = await window.crypto.subtle.importKey(
                "raw",
                keyData,
                {
                    name: "ECDH",
                    namedCurve: "P-256"
                },
                true,
                []
            );
            return publicKey;
        } catch (error) {
            console.error('导入公钥失败:', error);
            throw error;
        }
    }

    /**
     * 派生共享密钥
     */
    async deriveSharedKey(remotePublicKey, userId) {
        try {
            if (!this.keyPair) {
                await this.generateKeyPair();
            }

            const sharedKey = await window.crypto.subtle.deriveKey(
                {
                    name: "ECDH",
                    public: remotePublicKey
                },
                this.keyPair.privateKey,
                {
                    name: "AES-GCM",
                    length: 256
                },
                true,
                ["encrypt", "decrypt"]
            );

            this.sharedKeys.set(userId, sharedKey);
            console.log(`与用户 ${userId} 的共享密钥已生成`);
            return sharedKey;
        } catch (error) {
            console.error('派生共享密钥失败:', error);
            throw error;
        }
    }

    /**
     * 加密数据
     */
    async encryptData(data, userId) {
        try {
            const sharedKey = this.sharedKeys.get(userId);
            if (!sharedKey) {
                throw new Error(`未找到与用户 ${userId} 的共享密钥`);
            }

            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));

            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                sharedKey,
                dataBuffer
            );

            return {
                encrypted: this.arrayBufferToBase64(encrypted),
                iv: this.arrayBufferToBase64(iv)
            };
        } catch (error) {
            console.error('加密数据失败:', error);
            throw error;
        }
    }

    /**
     * 解密数据
     */
    async decryptData(encryptedData, userId) {
        try {
            const sharedKey = this.sharedKeys.get(userId);
            if (!sharedKey) {
                throw new Error(`未找到与用户 ${userId} 的共享密钥`);
            }

            const encryptedBuffer = this.base64ToArrayBuffer(encryptedData.encrypted);
            const iv = this.base64ToArrayBuffer(encryptedData.iv);

            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                sharedKey,
                encryptedBuffer
            );

            const decoder = new TextDecoder();
            const decryptedText = decoder.decode(decrypted);
            return JSON.parse(decryptedText);
        } catch (error) {
            console.error('解密数据失败:', error);
            throw error;
        }
    }

    /**
     * 工具函数：ArrayBuffer转Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * 工具函数：Base64转ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * 生成随机字符串（用于房间ID等）
     */
    generateRandomString(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const randomValues = new Uint8Array(length);
        window.crypto.getRandomValues(randomValues);
        for (let i = 0; i < length; i++) {
            result += chars[randomValues[i] % chars.length];
        }
        return result;
    }
}

// 创建全局加密管理器实例
const cryptoManager = new CryptoManager();

// 初始化加密管理器
cryptoManager.generateKeyPair().catch(err => {
    console.error('初始化加密管理器失败:', err);
});

