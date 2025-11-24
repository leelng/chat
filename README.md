# 🔒 加密聊天室

一个基于WebRTC和端到端加密技术的实时聊天与视频通话系统。

## ✨ 功能特性

- 💬 **实时文字聊天** - 支持多人实时文字聊天，主要功能
- 😊 **表情支持** - 丰富的表情选择器，让聊天更生动
- 🎤 **语音消息** - 支持录制和发送语音消息
- 📎 **图片/视频/文件** - 上传分享图片、视频及任意附件
- 👥 **好友系统** - 添加好友，查看好友在线状态
- 🎥 **视频通话（可选）** - 支持多人视频通话，按需开启
- 🔒 **端到端加密** - 使用Web Crypto API实现端到端加密，保护隐私
- 🚀 **实时通信** - 基于WebRTC的P2P连接，低延迟高质量
- 💻 **跨平台支持** - 支持桌面和移动设备
- 🎨 **现代化UI** - 美观的用户界面，易于使用

## 📋 技术栈

### 后端
- **Flask** - Python Web框架
- **Flask-SocketIO** - WebSocket支持，用于信令服务器
- **Eventlet** - 异步网络库

### 前端
- **WebRTC** - 实时音视频通信
- **Socket.IO** - WebSocket客户端
- **Web Crypto API** - 端到端加密
- **原生JavaScript** - 无框架依赖

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 运行服务器

```bash
python main.py
```

服务器将在 `http://localhost:5000` 启动。

### 3. 访问应用

在浏览器中打开 `http://localhost:5000`

## 📁 项目结构

```
encrypted-video-call/
├── netlify.toml          # Netlify部署配置
├── requirements.txt       # Python依赖
├── main.py               # Flask服务器主文件
├── static/
│   ├── index.html        # 主页面
│   ├── css/
│   │   └── style.css     # 样式文件
│   └── js/
│       ├── webrtc.js     # WebRTC逻辑
│       └── crypto.js     # 加密功能
└── README.md             # 项目文档
```

## 🔧 配置说明

### 环境变量

- `PORT` - 服务器端口（默认：5000）
- `SECRET_KEY` - Flask密钥（生产环境请更改）

### STUN服务器

默认使用Google的公共STUN服务器。如需更好的连接质量，可以配置自己的TURN服务器。

## 🔐 安全特性

1. **端到端加密** - 使用ECDH密钥交换和AES-GCM加密
2. **安全密钥管理** - 每个会话生成唯一的密钥对
3. **P2P连接** - 媒体流直接在用户之间传输，不经过服务器

## 🌐 部署

**重要提示**：Netlify 不支持 Python 后端和 WebSocket，无法直接部署。请使用支持 Python 的平台。

### 推荐平台

#### Render（推荐，免费）

1. 访问 [https://render.com](https://render.com) 注册账号
2. 连接 GitHub 仓库
3. 创建新的 Web Service
4. 配置：
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python main.py`
   - 添加环境变量 `SECRET_KEY`（随机生成）
5. 部署完成

详细步骤请查看 [DEPLOY.md](DEPLOY.md)

#### Railway

1. 访问 [https://railway.app](https://railway.app)
2. 连接 GitHub 仓库
3. 自动检测并部署
4. 设置环境变量

#### 其他平台

- Heroku（需要付费）
- PythonAnywhere
- DigitalOcean App Platform

详细部署指南请查看 [DEPLOY.md](DEPLOY.md)

## 📝 使用说明

1. **创建/加入房间**
   - 输入或生成房间ID
   - 输入您的昵称
   - 点击"加入聊天室"

2. **文字聊天**
   - 在输入框输入消息，按回车或点击发送
   - 点击😊按钮选择表情
   - 点击📎按钮上传图片/视频/文件
   - 点击🎤按钮录制语音消息

3. **好友功能**
   - 在侧边栏切换到"好友"标签
   - 输入用户名添加好友
   - 查看好友在线状态

4. **视频通话（可选）**
   - 点击右上角📹按钮开启视频通话
   - 允许浏览器访问摄像头和麦克风
   - 可以随时关闭视频通话，继续文字聊天

5. **文件与媒体**
   - 支持图片、视频、音频、文档、压缩包等格式（单个文件≤50MB）
   - 上传的文件会生成链接，可在聊天记录中预览或下载

5. **控制功能**
   - 📹 切换视频开关
   - 🎤 切换音频静音
   - 离开房间

## ⚠️ 注意事项

1. **HTTPS要求** - 生产环境需要使用HTTPS，因为：
   - WebRTC需要安全上下文
   - 加密API需要安全上下文

2. **浏览器兼容性** - 需要支持以下特性的现代浏览器：
   - WebRTC
   - Web Crypto API
   - WebSocket

3. **网络要求** - 需要良好的网络连接，建议使用TURN服务器处理NAT穿透

## 🐛 故障排除

### 无法访问摄像头/麦克风
- 检查浏览器权限设置
- 确保使用HTTPS（生产环境）

### 无法建立连接
- 检查防火墙设置
- 尝试配置TURN服务器
- 检查STUN服务器是否可访问

### 加密功能不工作
- 确保使用HTTPS
- 检查浏览器是否支持Web Crypto API

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📧 联系方式

如有问题或建议，请提交Issue。

"# chat" 
