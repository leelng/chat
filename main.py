#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
加密视频通话服务器
使用Flask和WebSocket实现多人加密实时通话的信令服务器
"""

from flask import Flask, render_template_string, send_from_directory, request, send_file
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 获取项目根目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# 初始化SocketIO，支持CORS
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# 存储房间和用户信息
rooms = {}
users = {}
friends = {}  # 好友关系 {user_id: set(friend_ids)}
pending_friends = {}  # 待处理的好友请求 {user_id: set(requesting_ids)}


@app.route('/')
def index():
    """主页面"""
    try:
        return send_from_directory(app.static_folder, 'index.html')
    except Exception as e:
        logger.error(f'加载 index.html 失败: {e}')
        return f'<h1>错误</h1><p>无法加载页面: {str(e)}</p><p>路径: {STATIC_DIR}</p>', 500


@socketio.on('connect')
def handle_connect():
    """客户端连接"""
    logger.info(f'客户端连接: {request.sid}')
    emit('connected', {'message': '已连接到服务器'})


@socketio.on('disconnect')
def handle_disconnect():
    """客户端断开连接"""
    logger.info(f'客户端断开连接: {request.sid}')
    # 清理用户信息
    if request.sid in users:
        user_info = users[request.sid]
        room_id = user_info.get('room_id')
        username = user_info.get('username')
        
        if room_id:
            leave_room(room_id)
            if room_id in rooms:
                rooms[room_id].discard(request.sid)
                if not rooms[room_id]:
                    del rooms[room_id]
            
            # 通知房间内其他用户
            socketio.emit('user-left', {
                'user_id': request.sid,
                'username': username
            }, room=room_id)
        
        del users[request.sid]


@socketio.on('join-room')
def handle_join_room(data):
    """加入房间"""
    room_id = data.get('room_id')
    username = data.get('username', '匿名用户')
    
    if not room_id:
        emit('error', {'message': '房间ID不能为空'})
        return
    
    # 加入房间
    join_room(room_id)
    
    # 初始化房间
    if room_id not in rooms:
        rooms[room_id] = set()
    rooms[room_id].add(request.sid)
    
    # 保存用户信息
    users[request.sid] = {
        'room_id': room_id,
        'username': username
    }
    
    logger.info(f'用户 {username} ({request.sid}) 加入房间 {room_id}')
    
    # 获取房间内其他用户
    other_users = [sid for sid in rooms[room_id] if sid != request.sid]
    
    # 通知当前用户加入成功
    emit('joined-room', {
        'room_id': room_id,
        'user_id': request.sid,
        'other_users': other_users
    })
    
    # 通知房间内其他用户有新用户加入
    socketio.emit('user-joined', {
        'user_id': request.sid,
        'username': username
    }, room=room_id, include_self=False)


@socketio.on('offer')
def handle_offer(data):
    """处理WebRTC offer"""
    target_user = data.get('target_user')
    offer = data.get('offer')
    
    logger.info(f'转发 offer 从 {request.sid} 到 {target_user}')
    
    # 转发offer到目标用户
    socketio.emit('offer', {
        'offer': offer,
        'from_user': request.sid
    }, room=target_user)


@socketio.on('answer')
def handle_answer(data):
    """处理WebRTC answer"""
    target_user = data.get('target_user')
    answer = data.get('answer')
    
    logger.info(f'转发 answer 从 {request.sid} 到 {target_user}')
    
    # 转发answer到目标用户
    socketio.emit('answer', {
        'answer': answer,
        'from_user': request.sid
    }, room=target_user)


@socketio.on('ice-candidate')
def handle_ice_candidate(data):
    """处理ICE候选"""
    target_user = data.get('target_user')
    candidate = data.get('candidate')
    
    # 转发ICE候选到目标用户
    socketio.emit('ice-candidate', {
        'candidate': candidate,
        'from_user': request.sid
    }, room=target_user)


@socketio.on('send-message')
def handle_send_message(data):
    """处理聊天消息"""
    room_id = data.get('room_id')
    message = data.get('message')
    message_type = data.get('type', 'text')  # text, emoji, voice
    
    if request.sid not in users:
        emit('error', {'message': '未加入房间'})
        return
    
    user_info = users[request.sid]
    username = user_info.get('username', '匿名用户')
    
    # 广播消息到房间
    socketio.emit('new-message', {
        'user_id': request.sid,
        'username': username,
        'message': message,
        'type': message_type,
        'timestamp': data.get('timestamp')
    }, room=room_id)


@socketio.on('add-friend')
def handle_add_friend(data):
    """添加好友请求"""
    target_username = data.get('username')
    
    if request.sid not in users:
        emit('error', {'message': '未登录'})
        return
    
    # 查找目标用户
    target_sid = None
    for sid, user_info in users.items():
        if user_info.get('username') == target_username:
            target_sid = sid
            break
    
    if not target_sid:
        emit('friend-error', {'message': '用户不存在或不在线'})
        return
    
    if target_sid == request.sid:
        emit('friend-error', {'message': '不能添加自己为好友'})
        return
    
    # 初始化好友列表
    if request.sid not in friends:
        friends[request.sid] = set()
    if target_sid not in friends:
        friends[target_sid] = set()
    
    # 检查是否已经是好友
    if target_sid in friends.get(request.sid, set()):
        emit('friend-error', {'message': '已经是好友了'})
        return
    
    # 添加待处理请求
    if target_sid not in pending_friends:
        pending_friends[target_sid] = set()
    pending_friends[target_sid].add(request.sid)
    
    # 通知目标用户
    socketio.emit('friend-request', {
        'from_user': request.sid,
        'from_username': users[request.sid].get('username')
    }, room=target_sid)
    
    emit('friend-request-sent', {'username': target_username})


@socketio.on('accept-friend')
def handle_accept_friend(data):
    """接受好友请求"""
    from_user = data.get('from_user')
    
    if from_user not in pending_friends.get(request.sid, set()):
        emit('friend-error', {'message': '无效的好友请求'})
        return
    
    # 添加好友关系
    if request.sid not in friends:
        friends[request.sid] = set()
    if from_user not in friends:
        friends[from_user] = set()
    
    friends[request.sid].add(from_user)
    friends[from_user].add(request.sid)
    
    # 移除待处理请求
    pending_friends[request.sid].discard(from_user)
    
    # 通知双方
    emit('friend-added', {
        'user_id': from_user,
        'username': users[from_user].get('username')
    })
    socketio.emit('friend-added', {
        'user_id': request.sid,
        'username': users[request.sid].get('username')
    }, room=from_user)


@socketio.on('get-friends')
def handle_get_friends():
    """获取好友列表"""
    if request.sid not in friends:
        emit('friends-list', {'friends': []})
        return
    
    friend_list = []
    for friend_id in friends[request.sid]:
        if friend_id in users:
            friend_list.append({
                'user_id': friend_id,
                'username': users[friend_id].get('username')
            })
    
    emit('friends-list', {'friends': friend_list})


@socketio.on('get-online-users')
def handle_get_online_users(data):
    """获取在线用户列表"""
    room_id = data.get('room_id')
    if not room_id or room_id not in rooms:
        emit('online-users', {'users': []})
        return
    
    online_users = []
    for sid in rooms[room_id]:
        if sid in users:
            online_users.append({
                'user_id': sid,
                'username': users[sid].get('username')
            })
    
    emit('online-users', {'users': online_users})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # 生产环境关闭debug模式
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    logger.info(f'服务器启动在端口 {port}')
    socketio.run(app, host='0.0.0.0', port=port, debug=debug_mode, allow_unsafe_werkzeug=True)

