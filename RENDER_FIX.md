# 🔧 Render 部署修复指南

## 问题

如果遇到以下错误：
```
bash: line 1: Python: command not found
```

## 原因

Render 使用 Linux 环境，Python 命令是 `python3` 而不是 `python` 或 `Python`。

## 解决方案

### 方法1：在 Render 控制台修改

1. 进入你的 Render 服务页面
2. 点击 "Settings" 标签
3. 找到 "Start Command" 字段
4. 将 `python main.py` 改为 `python3 main.py`
5. 点击 "Save Changes"
6. 等待自动重新部署

### 方法2：使用 render.yaml（推荐）

如果使用 `render.yaml` 文件，确保 Start Command 是：
```yaml
startCommand: python3 main.py
```

### 方法3：使用 Procfile

如果使用 `Procfile`，确保内容是：
```
web: python3 main.py
```

## 验证

部署成功后，你应该看到：
- ✅ Build successful
- ✅ 服务运行中
- 可以访问你的应用 URL

## 其他常见问题

### 如果仍然失败

1. **检查 Python 版本**
   - Render 默认使用 Python 3.10+
   - 确保 `runtime.txt` 指定了正确的版本（如果使用）

2. **检查依赖**
   - 确保 `requirements.txt` 包含所有依赖
   - 检查构建日志是否有依赖安装错误

3. **检查端口**
   - 确保代码使用 `os.environ.get('PORT', 5000)`
   - Render 会自动设置 PORT 环境变量

4. **查看日志**
   - 在 Render 控制台查看 "Logs" 标签
   - 查看详细的错误信息

