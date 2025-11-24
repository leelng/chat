/**
 * 聊天功能管理模块
 */

class ChatManager {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.username = null;
        this.userId = null;
        this.friends = [];
        this.onlineUsers = [];
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentTab = 'online';
        this.sidebarVisible = true;
    }

    /**
     * 初始化Socket连接
     */
    initSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = `${protocol}//${window.location.host}`;
        
        this.socket = io(socketUrl, {
            transports: ['websocket', 'polling']
        });

        this.setupSocketHandlers();
    }

    /**
     * 设置Socket事件处理器
     */
    setupSocketHandlers() {
        this.socket.on('connect', () => {
            console.log('已连接到服务器');
        });

        this.socket.on('connected', (data) => {
            console.log('服务器确认连接:', data);
        });

        this.socket.on('joined-room', (data) => {
            console.log('已加入房间:', data);
            this.userId = data.user_id;
            this.roomId = data.room_id;
            
            // 显示聊天界面
            document.getElementById('setupPanel').style.display = 'none';
            document.getElementById('chatContainer').style.display = 'flex';
            document.getElementById('currentRoomId').textContent = this.roomId;
            
            // 加载在线用户和好友列表
            this.loadOnlineUsers();
            this.loadFriends();
        });

        this.socket.on('new-message', (data) => {
            this.displayMessage(data);
        });

        this.socket.on('user-joined', (data) => {
            this.addSystemMessage(`${data.username} 加入了聊天室`);
            this.loadOnlineUsers();
        });

        this.socket.on('user-left', (data) => {
            this.addSystemMessage(`${data.username} 离开了聊天室`);
            this.loadOnlineUsers();
        });

        this.socket.on('online-users', (data) => {
            this.onlineUsers = data.users;
            this.updateOnlineUsersList();
            document.getElementById('userCount').textContent = data.users.length;
        });

        this.socket.on('friends-list', (data) => {
            this.friends = data.friends;
            this.updateFriendsList();
        });

        this.socket.on('friend-request', (data) => {
            if (confirm(`${data.from_username} 想要添加您为好友，是否接受？`)) {
                this.socket.emit('accept-friend', { from_user: data.from_user });
            }
        });

        this.socket.on('friend-added', (data) => {
            this.addSystemMessage(`已添加 ${data.username} 为好友`);
            this.loadFriends();
        });

        this.socket.on('friend-request-sent', (data) => {
            alert(`好友请求已发送给 ${data.username}`);
        });

        this.socket.on('friend-error', (data) => {
            alert('错误: ' + data.message);
        });

        this.socket.on('error', (data) => {
            alert('错误: ' + data.message);
        });
    }

    /**
     * 加入房间
     */
    joinRoom(roomId, username) {
        this.roomId = roomId;
        this.username = username;
        this.socket.emit('join-room', {
            room_id: roomId,
            username: username
        });
    }

    /**
     * 发送消息
     */
    sendMessage(message, type = 'text') {
        if (!message && type === 'text') return;
        
        const messageData = {
            room_id: this.roomId,
            message: message,
            type: type,
            timestamp: new Date().toISOString()
        };
        
        this.socket.emit('send-message', messageData);
        
        if (type === 'text') {
            document.getElementById('messageInput').value = '';
        }
    }

    /**
     * 显示消息
     */
    displayMessage(data) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${data.user_id === this.userId ? 'message-own' : 'message-other'}`;
        
        const time = new Date(data.timestamp).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        let messageContent = '';
        if (data.type === 'text' || data.type === 'emoji') {
            messageContent = `<div class="message-text">${this.escapeHtml(data.message)}</div>`;
        } else if (data.type === 'voice') {
            messageContent = `
                <div class="voice-message">
                    <audio controls src="${data.message}"></audio>
                    <span class="voice-duration">${data.duration || ''}</span>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-username">${this.escapeHtml(data.username)}</span>
                <span class="message-time">${time}</span>
            </div>
            ${messageContent}
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 添加系统消息
     */
    addSystemMessage(text) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-system';
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 加载在线用户
     */
    loadOnlineUsers() {
        this.socket.emit('get-online-users', { room_id: this.roomId });
    }

    /**
     * 更新在线用户列表
     */
    updateOnlineUsersList() {
        const list = document.getElementById('onlineUsersList');
        list.innerHTML = '';
        
        this.onlineUsers.forEach(user => {
            const item = document.createElement('div');
            item.className = 'user-item';
            item.innerHTML = `
                <span class="user-name">${this.escapeHtml(user.username)}</span>
                <span class="user-status online">●</span>
            `;
            list.appendChild(item);
        });
    }

    /**
     * 加载好友列表
     */
    loadFriends() {
        this.socket.emit('get-friends');
    }

    /**
     * 更新好友列表
     */
    updateFriendsList() {
        const list = document.getElementById('friendsList');
        list.innerHTML = '';
        
        if (this.friends.length === 0) {
            list.innerHTML = '<div class="empty-state">暂无好友</div>';
            return;
        }
        
        this.friends.forEach(friend => {
            const item = document.createElement('div');
            item.className = 'user-item';
            const isOnline = this.onlineUsers.some(u => u.user_id === friend.user_id);
            item.innerHTML = `
                <span class="user-name">${this.escapeHtml(friend.username)}</span>
                <span class="user-status ${isOnline ? 'online' : 'offline'}">●</span>
            `;
            list.appendChild(item);
        });
    }

    /**
     * 添加好友
     */
    addFriend(username) {
        if (!username) {
            alert('请输入用户名');
            return;
        }
        this.socket.emit('add-friend', { username: username });
        document.getElementById('friendUsername').value = '';
    }

    /**
     * 开始录音
     */
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // 将音频转换为base64发送
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    this.sendMessage(base64Audio, 'voice');
                };
                reader.readAsDataURL(audioBlob);
                
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            document.getElementById('voiceRecorder').style.display = 'block';
            document.getElementById('voiceBtn').textContent = '⏹';
        } catch (error) {
            console.error('录音失败:', error);
            alert('无法访问麦克风，请检查权限设置');
        }
    }

    /**
     * 停止录音
     */
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            document.getElementById('voiceRecorder').style.display = 'none';
            document.getElementById('voiceBtn').textContent = '🎤';
        }
    }

    /**
     * 切换录音
     */
    toggleVoiceRecord() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 离开房间
     */
    leaveRoom() {
        if (confirm('确定要离开聊天室吗？')) {
            if (this.socket) {
                this.socket.disconnect();
            }
            document.getElementById('setupPanel').style.display = 'block';
            document.getElementById('chatContainer').style.display = 'none';
            document.getElementById('chatMessages').innerHTML = '';
        }
    }
}

// 创建全局聊天管理器实例
const chatManager = new ChatManager();

// 初始化Socket连接
chatManager.initSocket();

// 表情列表
const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', 
                '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
                '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
                '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖',
                '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯',
                '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔',
                '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦',
                '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴',
                '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿',
                '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖'];

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

    chatManager.joinRoom(roomId, username);
}

/**
 * 发送消息
 */
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (message) {
        chatManager.sendMessage(message, 'text');
    }
}

/**
 * 处理回车键
 */
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

/**
 * 切换表情选择器
 */
function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    if (picker.style.display === 'none') {
        // 初始化表情选择器
        if (picker.innerHTML === '') {
            emojis.forEach(emoji => {
                const btn = document.createElement('button');
                btn.className = 'emoji-btn';
                btn.textContent = emoji;
                btn.onclick = () => {
                    const input = document.getElementById('messageInput');
                    input.value += emoji;
                    picker.style.display = 'none';
                    input.focus();
                };
                picker.appendChild(btn);
            });
        }
        picker.style.display = 'block';
    } else {
        picker.style.display = 'none';
    }
}

/**
 * 切换语音录音
 */
function toggleVoiceRecord() {
    chatManager.toggleVoiceRecord();
}

/**
 * 停止录音
 */
function stopRecording() {
    chatManager.stopRecording();
}

/**
 * 切换标签页
 */
function switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    if (tab === 'online') {
        document.querySelector('.tab-btn[onclick="switchTab(\'online\')"]').classList.add('active');
        document.getElementById('onlineTab').style.display = 'block';
        chatManager.loadOnlineUsers();
    } else {
        document.querySelector('.tab-btn[onclick="switchTab(\'friends\')"]').classList.add('active');
        document.getElementById('friendsTab').style.display = 'block';
        chatManager.loadFriends();
    }
}

/**
 * 添加好友
 */
function addFriend() {
    const username = document.getElementById('friendUsername').value.trim();
    chatManager.addFriend(username);
}

/**
 * 切换侧边栏
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.chat-sidebar');
    chatManager.sidebarVisible = !chatManager.sidebarVisible;
    sidebar.style.display = chatManager.sidebarVisible ? 'flex' : 'none';
}

/**
 * 切换视频通话
 */
function toggleVideoCall() {
    const panel = document.getElementById('videoCallPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        // 初始化WebRTC
        if (webrtcManager) {
            webrtcManager.roomId = chatManager.roomId;
            webrtcManager.username = chatManager.username;
            webrtcManager.userId = chatManager.userId;
            webrtcManager.startVideoCall();
        }
    } else {
        closeVideoCall();
    }
}

/**
 * 关闭视频通话
 */
function closeVideoCall() {
    document.getElementById('videoCallPanel').style.display = 'none';
    if (webrtcManager) {
        webrtcManager.endVideoCall();
    }
}

/**
 * 离开房间
 */
function leaveRoom() {
    chatManager.leaveRoom();
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    generateRoomId();
    
    // 为输入框添加回车键支持
    document.getElementById('roomId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    document.getElementById('username').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    document.getElementById('friendUsername').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addFriend();
    });
    
    // 点击外部关闭表情选择器
    document.addEventListener('click', (e) => {
        const picker = document.getElementById('emojiPicker');
        if (!picker.contains(e.target) && e.target.onclick !== toggleEmojiPicker) {
            picker.style.display = 'none';
        }
    });
});

