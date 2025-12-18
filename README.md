# Item-management-platform

Item-management-platform 是一个基于 Python Flask 和 React 的全栈物品管理与交流系统。该系统支持动态物品类型定义、图片上传与裁剪、用户权限管理（管理员/普通用户）以及基于心跳机制的自动关闭功能，既可以作为 Web 服务运行，也可以打包为单文件桌面应用程序（.exe）使用。

## 目录

1. [项目简介](#项目简介)
2. [环境要求](#环境要求)
3. [项目结构](#项目结构)
4. [安装与配置](#安装与配置)
5. [运行模式](#运行模式)
   - [开发模式 (Development)](#开发模式-development)
   - [生产模式 (Production)](#生产模式-production)
6. [打包指南 (Executable)](#打包指南-executable)
7. [功能说明与使用指南](#功能说明与使用指南)
8. [注意事项](#注意事项)

## 项目简介

本项目旨在提供一个灵活的物品管理平台。后端采用 Flask 框架，使用 SQLite 作为数据库；前端采用 React (TypeScript) 构建，使用 Vite 进行打包。

主要特点包括：

- **双 Token 认证**：基于 `flask_jwt_extended` 实现 Access Token 和 Refresh Token 机制。
- **动态属性系统**：管理员可以自定义物品类型（如“书籍”、“食品”）及其属性（文本、数字、日期、下拉选项），发布的物品会根据类型动态渲染表单。
- **图片处理**：前端集成 `react-easy-crop` 实现图片上传前的裁剪功能。
- **智能心跳监控**：后端包含心跳监测线程，当检测到前端页面关闭或浏览器退出时，服务端可自动终止进程（主要用于单机应用场景）。
- **SPA 托管**：后端配置了对 React 静态资源 (`dist`) 的托管支持。

## 环境要求

请确保您的开发环境满足以下版本要求：

- **Python**: 3.10.19
- **Node.js Package Manager (Yarn)**: 4.9.4
- **Pip**: 25.2

## 项目结构

建议的项目目录结构如下：

```text
Item-management-platform/
├── backend/                # 后端代码目录
│   ├── app.py              # Flask 主程序
│   ├── db.sqlite           # 数据库文件 (自动生成)
│   ├── static/             # 静态资源与上传图片
│   └── .env                # 环境变量配置文件
├── frontend/               # 前端代码目录
│   ├── src/                # React 源代码
│   ├── public/             # 公共资源 (icon.ico 等)
│   ├── dist/               # 前端构建输出目录 (yarn build 生成)
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 安装与配置

### 1. 后端依赖安装

在 `backend` 目录下创建虚拟环境并安装依赖。建议使用 pip 安装以下核心库（具体版本请参考您的实际环境）：

```bash
# 进入后端目录
cd backend

# 创建虚拟环境 (可选但推荐)
python -m venv venv

# 激活虚拟环境 (Windows)
venv\Scripts\activate
# 激活虚拟环境 (Linux/Mac)
source venv/bin/activate

# 安装依赖
pip install flask flask-sqlalchemy flask-cors flask-jwt-extended python-dotenv werkzeug pyinstaller
```

### 2. 前端依赖安装

在 `frontend` 目录下安装 Node.js 依赖：

```bash
# 进入前端目录
cd frontend

# 安装依赖
yarn install
```

### 3. 环境变量配置

在 `backend` 目录下创建一个 `.env` 文件，用于控制运行模式。

**内容示例：**

```ini
# 设置运行环境: development 或 production
FLASK_ENV=development
```

## 运行模式

本项目支持两种运行模式：前后端分离的**开发模式**和前后端整合的**生产模式**。

### 开发模式 (Development)

在此模式下，后端 API 服务和前端开发服务器分别运行，支持热更新。

1. **修改配置**：确保 `backend/.env` 中 `FLASK_ENV=development`。

2. **启动后端**：

   ```bash
   # 在 backend 目录下
   python app.py
   # 后端将运行在 http://127.0.0.1:5000
   ```

3. **启动前端**：

   ```bash
   # 在 frontend 目录下
   yarn dev
   # 前端通常运行在 http://127.0.0.1:5173
   ```

4. **访问**：在浏览器中访问前端地址（如 `http://127.0.0.1:5173`）。

### 生产模式 (Production)

在此模式下，前端代码被编译为静态文件，由 Flask 后端统一托管服务。

1. **构建前端**：

   ```bash
   # 在 frontend 目录下
   yarn build
   ```

   构建完成后，生成的静态文件将位于 `frontend/dist` 目录。

2. **修改配置**：确保 `backend/.env` 中 `FLASK_ENV=production`。

3. **启动后端**：

   ```bash
   # 在 backend 目录下，确保代码中 dist_path 指向正确的前端构建目录
   python app.py
   ```

   程序启动后会自动打开默认浏览器访问 `http://127.0.0.1:5000`。

## 打包指南 (Executable)

您可以将项目打包为独立的 `.exe` 可执行文件，方便在没有 Python 环境的 Windows 机器上运行。

### 1. 前置准备

确保前端已经构建完毕（`yarn build`），并且 `frontend/dist` 目录存在。
确保 `frontend/public/icon.ico` 图标文件存在。

### 2. 执行打包命令

在 `backend` 目录下（确保虚拟环境已激活），运行以下 PyInstaller 命令：

```bash
pyinstaller --onefile --windowed --add-data "../frontend/dist;dist" --icon="../frontend/public/icon.ico" --name Item-management-platform app.py
```

**参数说明：**

- `--onefile`: 打包成单个 exe 文件。
- `--windowed`: 运行时不显示命令行窗口（控制台）。
- `--add-data "../frontend/dist;dist"`: 将前端构建产物打包进 exe 内部。
- `--icon`: 指定应用程序图标。

打包完成后，可执行文件将生成在 `backend/dist/Item-management-platform.exe`。

## 功能说明与使用指南

### 1. 用户认证与权限

- **注册**：新用户注册后状态默认为 `pending`（待审核）。
- **登录**：仅状态为 `approved` 的用户可登录。
- **默认管理员**：系统初始化时会自动创建超级管理员。
  - 用户名：`admin`
  - 密码：`admin123`
- **自动注销**：系统实现了 Access Token (5分钟) 和 Refresh Token (7天) 机制，前端会自动处理 Token 刷新。

### 2. 物品管理 (User)

- **浏览**：仪表盘支持按分类、关键词、状态（待领取/已领走）筛选物品。
- **发布**：用户需选择物品类型，填写基础信息及该类型特定的动态属性。
- **图片上传**：支持拖拽上传，并在前端进行 4:3 比例的裁剪。
- **状态管理**：发布者可在“编辑”页面将物品标记为“已领走”。
- **删除**：用户仅可删除自己发布的物品。

### 3. 管理员后台 (Admin)

访问路径：`/admin` (仅限管理员角色的用户访问)。

- **用户审核**：通过或拒绝新注册用户的申请。
- **用户管理**：查看所有用户，支持删除用户、提升为管理员或降级为普通用户。
- **类型管理 (Type Management)**：
  - **创建**：定义新的物品类型（如“电子产品”），并添加自定义属性（支持文本、数字、日期、下拉选项）。
  - **编辑**：修改现有类型的名称和属性定义。
  - **注意**：类型属性的 `key` 为自动生成的唯一标识，通常不需要修改。
- **系统维护**：
  - **重置数据库**：提供“危险区域”功能，允许 admin 重置整个数据库（清空所有数据并重建表结构）。需二次确认并输入 `RESET`。

### 4. 自动关闭机制 (Heartbeat)

为了适应单机应用场景，`app.py` 内置了监控线程：

- 前端会定期（每2秒）向 `/heartbeat` 发送请求。
- 当页面关闭或刷新时，会触发 `beforeunload` 发送 `/shutdown` 信号。
- 后端若在一定时间内（默认20秒软超时或300秒硬超时）未收到新的心跳，将自动结束 Flask 进程。

## API 接口说明

核心 API 路由如下：

| 方法 | 路径           | 描述                                | 权限             |
| :--- | :------------- | :---------------------------------- | :--------------- |
| POST | `/login`       | 用户登录，返回 Access/Refresh Token | 公开             |
| POST | `/register`    | 用户注册                            | 公开             |
| POST | `/refresh`     | 刷新 Access Token                   | 需 Refresh Token |
| GET  | `/items`       | 获取物品列表 (支持筛选)             | 公开             |
| POST | `/items`       | 发布新物品                          | 登录用户         |
| GET  | `/types`       | 获取所有物品类型定义                | 公开             |
| POST | `/types`       | 新增物品类型                        | 管理员           |
| POST | `/upload`      | 上传图片                            | 登录用户         |
| GET  | `/admin/users` | 获取用户列表                        | 管理员           |

## 注意事项

1.  **初始密码**：首次部署后，建议登录 `admin` 账号并修改密码，或创建新的管理员账号。
2.  **数据重置**：管理员后台的“重置数据库”功能是不可逆的，会删除所有上传的图片和用户数据，请谨慎操作。
3.  **刷新与关闭**：由于存在心跳检测机制，在开发模式下如果长时间挂起后端而关闭了前端页面，后端进程可能会自动退出，需重新启动。
4.  **图片存储**：在开发模式下，图片存储在 `backend/static/images`；在打包后的 exe 环境中，图片存储在临时解压目录中（注意：如果 exe 重启，临时目录的数据可能会丢失，除非修改代码将 `UPLOAD_FOLDER` 指向外部持久化路径）。对于生产使用的单机版，建议修改 `UPLOAD_FOLDER` 为用户文档目录或当前运行目录。