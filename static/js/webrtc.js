/**
 * WebRTC 管理模块
 * 处理多人视频通话的P2P连接
 */

class WebRTCManager {
    constructor() {
        this.socket = null;
        this.localStream = null;
        this.peers = new Map(); // 存储与其他用户的PeerConnection
        this.localVideoElement = null;
        this.userId = null;
        this.roomId = null;
        this.username = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
    }

    /**
     * 初始化Socket连接（使用聊天管理器的socket）
     */
    initSocket() {
        // 使用聊天管理器的socket，避免重复连接
        if (chatManager && chatManager.socket) {
            this.socket = chatManager.socket;
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const socketUrl = `${protocol}//${window.location.host}`;
            this.socket = io(socketUrl, {
                transports: ['websocket', 'polling']
            });
        }

        this.setupSocketHandlers();
    }

    /**
     * 设置Socket事件处理器
     */
    setupSocketHandlers() {
        this.socket.on('connect', () => {
            console.log('WebRTC: 已连接到信令服务器');
        });

        this.socket.on('connected', (data) => {
            console.log('WebRTC: 服务器确认连接:', data);
        });

        // 监听房间加入事件（从聊天管理器触发）
        this.socket.on('joined-room', async (data) => {
            console.log('WebRTC: 已加入房间:', data);
            this.userId = data.user_id;
            this.roomId = data.room_id;
            
            // 不自动显示视频面板，等待用户点击视频通话按钮
        });

        this.socket.on('user-joined', async (data) => {
            console.log('WebRTC: 新用户加入:', data);
            // 只有在视频通话开启时才建立连接
            if (document.getElementById('videoCallPanel').style.display !== 'none') {
                await this.createPeerConnection(data.user_id);
            }
        });

        this.socket.on('user-left', (data) => {
            console.log('WebRTC: 用户离开:', data);
            this.removePeer(data.user_id);
        });

        this.socket.on('offer', async (data) => {
            console.log('收到offer:', data);
            await this.handleOffer(data.offer, data.from_user);
        });

        this.socket.on('answer', async (data) => {
            console.log('收到answer:', data);
            await this.handleAnswer(data.answer, data.from_user);
        });

        this.socket.on('ice-candidate', async (data) => {
            console.log('收到ICE候选:', data);
            await this.handleIceCandidate(data.candidate, data.from_user);
        });

        this.socket.on('error', (data) => {
            console.error('服务器错误:', data);
            alert('错误: ' + data.message);
        });

        this.socket.on('disconnect', () => {
            console.log('与服务器断开连接');
        });
    }

    /**
     * 获取用户媒体（摄像头和麦克风）
     */
    async getUserMedia() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // 创建本地视频元素
            this.localVideoElement = this.createVideoElement('local', this.username || '我', true);
            this.localVideoElement.querySelector('video').srcObject = this.localStream;
            
            console.log('已获取本地媒体流');
        } catch (error) {
            console.error('获取媒体流失败:', error);
            alert('无法访问摄像头或麦克风，请检查权限设置');
        }
    }

    /**
     * 创建与另一个用户的PeerConnection
     */
    async createPeerConnection(userId) {
        if (this.peers.has(userId)) {
            console.log(`与用户 ${userId} 的连接已存在`);
            return;
        }

        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const peerConnection = new RTCPeerConnection(configuration);

        // 添加本地流到连接
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // 处理远程流
        peerConnection.ontrack = (event) => {
            console.log('收到远程流:', userId);
            const remoteStream = event.streams[0];
            const videoElement = this.createVideoElement(userId, `用户${userId.substring(0, 6)}`, false);
            videoElement.querySelector('video').srcObject = remoteStream;
        };

        // 处理ICE候选
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    target_user: userId,
                    candidate: event.candidate
                });
            }
        };

        // 处理连接状态变化
        peerConnection.onconnectionstatechange = () => {
            console.log(`与用户 ${userId} 的连接状态:`, peerConnection.connectionState);
            if (peerConnection.connectionState === 'failed' || 
                peerConnection.connectionState === 'disconnected') {
                // 可以在这里添加重连逻辑
            }
        };

        this.peers.set(userId, peerConnection);

        // 创建并发送offer
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            this.socket.emit('offer', {
                target_user: userId,
                offer: offer
            });
        } catch (error) {
            console.error('创建offer失败:', error);
        }
    }

    /**
     * 处理收到的offer
     */
    async handleOffer(offer, fromUserId) {
        let peerConnection = this.peers.get(fromUserId);
        
        if (!peerConnection) {
            await this.createPeerConnection(fromUserId);
            peerConnection = this.peers.get(fromUserId);
        }

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            this.socket.emit('answer', {
                target_user: fromUserId,
                answer: answer
            });
        } catch (error) {
            console.error('处理offer失败:', error);
        }
    }

    /**
     * 处理收到的answer
     */
    async handleAnswer(answer, fromUserId) {
        const peerConnection = this.peers.get(fromUserId);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (error) {
                console.error('处理answer失败:', error);
            }
        }
    }

    /**
     * 处理ICE候选
     */
    async handleIceCandidate(candidate, fromUserId) {
        const peerConnection = this.peers.get(fromUserId);
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('添加ICE候选失败:', error);
            }
        }
    }

    /**
     * 创建视频元素
     */
    createVideoElement(userId, label, isLocal) {
        const videoGrid = document.getElementById('videoGrid');
        
        const videoItem = document.createElement('div');
        videoItem.className = `video-item ${isLocal ? 'local' : ''}`;
        videoItem.id = `video-${userId}`;
        
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = isLocal; // 本地视频静音以避免回音
        
        const videoLabel = document.createElement('div');
        videoLabel.className = 'video-label';
        videoLabel.textContent = label;
        
        videoItem.appendChild(video);
        videoItem.appendChild(videoLabel);
        videoGrid.appendChild(videoItem);
        
        return videoItem;
    }

    /**
     * 移除对等连接
     */
    removePeer(userId) {
        const peerConnection = this.peers.get(userId);
        if (peerConnection) {
            peerConnection.close();
            this.peers.delete(userId);
        }

        const videoElement = document.getElementById(`video-${userId}`);
        if (videoElement) {
            videoElement.remove();
        }
    }


    /**
     * 切换视频
     */
    toggleVideo() {
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            this.isVideoEnabled = !this.isVideoEnabled;
            
            videoTracks.forEach(track => {
                track.enabled = this.isVideoEnabled;
            });

            const btn = document.getElementById('toggleVideo');
            btn.textContent = this.isVideoEnabled ? '📹 关闭视频' : '📹 开启视频';
            btn.classList.toggle('active', !this.isVideoEnabled);
        }
    }

    /**
     * 切换音频
     */
    toggleAudio() {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            this.isAudioEnabled = !this.isAudioEnabled;
            
            audioTracks.forEach(track => {
                track.enabled = this.isAudioEnabled;
            });

            const btn = document.getElementById('toggleAudio');
            btn.textContent = this.isAudioEnabled ? '🎤 静音' : '🎤 取消静音';
            btn.classList.toggle('active', !this.isAudioEnabled);
        }
    }

    /**
     * 开始视频通话
     */
    async startVideoCall() {
        if (!this.roomId) {
            console.error('未加入房间');
            return;
        }

        // 获取本地媒体流
        await this.getUserMedia();

        // 获取在线用户并建立连接
        if (chatManager && chatManager.onlineUsers) {
            for (const user of chatManager.onlineUsers) {
                if (user.user_id !== this.userId) {
                    await this.createPeerConnection(user.user_id);
                }
            }
        }
    }

    /**
     * 结束视频通话
     */
    endVideoCall() {
        // 关闭所有对等连接
        this.peers.forEach((peerConnection, userId) => {
            this.removePeer(userId);
        });

        // 停止本地流
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        // 清空视频网格
        document.getElementById('videoGrid').innerHTML = '';

        // 重置状态
        this.peers.clear();
        this.localStream = null;
        this.localVideoElement = null;
    }

    /**
     * 离开房间（保留，用于兼容）
     */
    leaveRoom() {
        this.endVideoCall();
    }
}

// 创建全局WebRTC管理器实例
const webrtcManager = new WebRTCManager();

// 延迟初始化，等待聊天管理器先初始化
setTimeout(() => {
    webrtcManager.initSocket();
}, 100);

/**
 * 生成随机房间ID
 */
function generateRoomId() {
    const roomId = cryptoManager.generateRandomString(8);
    document.getElementById('roomId').value = roomId;
}

/**
 * 加入房间
 */
function joinRoom() {
    const roomId = document.getElementById('roomId').value.trim();
    const username = document.getElementById('username').value.trim() || '匿名用户';

    if (!roomId) {
        alert('请输入房间ID');
        return;
    }

    webrtcManager.username = username;
    webrtcManager.socket.emit('join-room', {
        room_id: roomId,
        username: username
    });
}

/**
 * 切换视频
 */
function toggleVideo() {
    webrtcManager.toggleVideo();
}

/**
 * 切换音频
 */
function toggleAudio() {
    webrtcManager.toggleAudio();
}

// 这些函数现在在chat.js中定义

