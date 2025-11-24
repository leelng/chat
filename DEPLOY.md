# 🚀 部署指南

本应用需要 Python 后端支持 WebSocket，因此无法直接部署到 Netlify（Netlify 只支持静态网站）。

## 📋 推荐部署平台

### 方案1：Render（推荐，免费）

Render 提供免费的 Python 应用托管，非常适合这个项目。

#### 部署步骤：

1. **注册 Render 账号**
   - 访问 [https://render.com](https://render.com)
   - 使用 GitHub 账号登录

2. **准备代码仓库**
   - 将代码推送到 GitHub
   - 确保包含所有必要文件

3. **创建 Web Service**
   - 点击 "New +" → "Web Service"
   - 连接你的 GitHub 仓库
   - 选择 `encrypted-video-call` 目录

4. **配置设置**
   - **Name**: `encrypted-chat` (或你喜欢的名字)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python3 main.py` ⚠️ 注意：必须使用 `python3` 而不是 `python`
   - **Plan**: 选择 Free

5. **环境变量**
   - 点击 "Environment" 标签
   - 添加环境变量：
     - `PORT`: `5000` (Render 会自动设置，但可以显式指定)
     - `SECRET_KEY`: 生成一个随机密钥（可以使用 `python -c "import secrets; print(secrets.token_hex(32))"`）

6. **部署**
   - 点击 "Create Web Service"
   - 等待构建和部署完成
   - 你的应用将在 `https://your-app-name.onrender.com` 运行

#### 使用 render.yaml（可选）

如果你有 `render.yaml` 文件，可以直接导入：
- 点击 "New +" → "Blueprint"
- 连接仓库并选择 `render.yaml`
- Render 会自动配置

---

### 方案2：Railway

Railway 也提供 Python 应用托管，有免费额度。

#### 部署步骤：

1. **注册 Railway 账号**
   - 访问 [https://railway.app](https://railway.app)
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库

3. **配置服务**
   - Railway 会自动检测 Python 项目
   - 确保 `requirements.txt` 存在
   - Railway 会自动运行 `python main.py`

4. **环境变量**
   - 在项目设置中添加：
     - `PORT`: Railway 会自动提供，但确保代码使用 `os.environ.get('PORT', 5000)`
     - `SECRET_KEY`: 生成随机密钥

5. **部署**
   - Railway 会自动部署
   - 点击 "Settings" → "Generate Domain" 获取访问地址

---

### 方案3：Heroku（需要信用卡）

Heroku 是传统的 PaaS 平台，但免费层已取消。

#### 部署步骤：

1. **安装 Heroku CLI**
   ```bash
   # Windows
   # 下载并安装 https://devcenter.heroku.com/articles/heroku-cli
   
   # 或使用包管理器
   choco install heroku-cli
   ```

2. **登录 Heroku**
   ```bash
   heroku login
   ```

3. **创建应用**
   ```bash
   cd encrypted-video-call
   heroku create your-app-name
   ```

4. **设置环境变量**
   ```bash
   heroku config:set SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
   ```

5. **部署**
   ```bash
   git push heroku main
   ```

---

## 🔧 部署前检查清单

- [ ] 确保 `requirements.txt` 包含所有依赖
- [ ] 确保 `main.py` 使用环境变量 `PORT`
- [ ] 设置强随机 `SECRET_KEY`
- [ ] 测试本地运行正常
- [ ] 代码已推送到 GitHub

---

## 🌐 前端静态文件部署（可选）

如果你想将前端静态文件部署到 Netlify（仅前端，需要修改代码）：

1. **修改前端代码**
   - 将 Socket.IO 连接地址改为后端 API 地址
   - 需要配置 CORS

2. **部署到 Netlify**
   - 将 `static` 目录内容部署
   - 配置重定向规则

**注意**：这种方式需要后端和前端分离部署，需要处理跨域问题。

---

## ⚠️ 重要提示

1. **HTTPS 要求**
   - WebRTC 和加密功能需要 HTTPS
   - 所有推荐的平台都提供 HTTPS

2. **WebSocket 支持**
   - 确保平台支持 WebSocket
   - Render 和 Railway 都支持

3. **免费额度限制**
   - Render 免费版：应用在 15 分钟无活动后会休眠
   - Railway 免费版：有使用额度限制
   - 生产环境建议使用付费计划

4. **环境变量安全**
   - 不要将 `SECRET_KEY` 提交到代码仓库
   - 使用平台的环境变量功能

5. **文件存储**
    - 上传的图片/视频/文件保存在服务器 `uploads/` 目录
    - Render 免费层为临时磁盘，重启或部署后文件会被清空
    - 若需持久存储，请接入对象存储（如 S3、OSS）并修改上传逻辑

---

## 🐛 常见问题

### 应用无法启动
- 检查 `requirements.txt` 是否正确
- 查看平台日志
- 确保 `PORT` 环境变量正确

### WebSocket 连接失败
- 确保平台支持 WebSocket
- 检查 CORS 设置
- 查看浏览器控制台错误

### 应用休眠（Render 免费版）
- 免费版会在 15 分钟无活动后休眠
- 首次访问需要等待几秒唤醒
- 考虑升级到付费计划

---

## 📝 推荐配置

**最佳实践**：
- 使用 **Render** 进行部署（最简单，免费）
- 设置强随机 `SECRET_KEY`
- 使用 HTTPS（平台自动提供）
- 监控应用日志

