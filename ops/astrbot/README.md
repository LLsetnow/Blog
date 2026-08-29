# AstrBot 服务器上的博客数据更新

新闻、项目和 B 站收藏数据由 AstrBot 服务器上的 systemd timer 管理。普通 GitHub deploy build 不再抓取这些数据，也不会覆盖服务器托管的数据。

## 数据所有权与时间

服务器托管以下文件：

- `/var/www/blog/news/today.json`：每天 03:00 UTC（北京时间 11:00）
- `/var/www/blog/projects-data/projects.json` 及 `images/`：每周日 03:30 UTC（北京时间 11:30）
- `/var/www/blog/bilibili-fav/favorites.json`：每周日 04:00 UTC（北京时间 12:00）

三个 timer 都使用 `Persistent=true`，服务器错过计划时间后会补执行。GitHub Actions 的 deploy 使用 rsync 排除上述文件，因此普通发布不会覆盖它们。

## 安装与首次准备

在服务器上、仓库根目录执行：

```bash
# 首次准备：服务器需要 Node.js/npm；依赖只需安装一次或在 package.json 变化后更新
cd /home/admin/Blog
npm ci

sudo install -D -m 0755 ops/astrbot/update-blog-news.py /usr/local/libexec/blog-news-update.py
sudo install -m 0644 ops/astrbot/blog-news-update.service /etc/systemd/system/blog-news-update.service
sudo install -m 0644 ops/astrbot/blog-news-update.timer /etc/systemd/system/blog-news-update.timer
sudo install -D -m 0755 ops/astrbot/update-blog-projects.py /usr/local/libexec/blog-projects-update.py
sudo install -m 0644 ops/astrbot/blog-projects-update.service /etc/systemd/system/blog-projects-update.service
sudo install -m 0644 ops/astrbot/blog-projects-update.timer /etc/systemd/system/blog-projects-update.timer
sudo install -D -m 0755 ops/astrbot/update-blog-favorites.py /usr/local/libexec/blog-favorites-update.py
sudo install -m 0644 ops/astrbot/blog-favorites-update.service /etc/systemd/system/blog-favorites-update.service
sudo install -m 0644 ops/astrbot/blog-favorites-update.timer /etc/systemd/system/blog-favorites-update.timer
sudo systemctl daemon-reload
sudo systemctl enable --now blog-news-update.timer
sudo systemctl enable --now blog-projects-update.timer
sudo systemctl enable --now blog-favorites-update.timer
```

服务以 root 运行，源代码固定为 `/home/admin/Blog`，网站目录固定为 `/var/www/blog`。每次执行会安全快进同步 `origin/main`，不会运行 `git clean` 删除 `node_modules/`；定时任务不会无条件重复执行 `npm ci`。如果 Node/npm 或依赖缺失，服务会失败并在日志中提示维护人员运行 `npm ci`。

所有 secrets 只放在服务器的 `/var/OPC/.env`，不要写入或提交仓库。收藏脚本优先读取其中的 `YT_DLP_COOKIES`，兼容 `BILIBILI_COOKIES`；变量值应是 Netscape cookie 文件的绝对路径，例如：

```dotenv
YT_DLP_COOKIES=/var/OPC/auth/www.bilibili.com_cookies.txt
```

cookie 文件应限制为 `600`。脚本不会打印 cookie 内容。新闻仍可通过 `OPC_BIN` 和 `NEWS_OUTPUT_FILE` 覆盖默认路径。

## 博客安全编辑 API

博客编辑权限由服务器端 API 提供，不再使用前端 `VITE_*` 密码或浏览器存储作为认证依据。API 运行在 `127.0.0.1:8787`，由 Nginx 将 `/api/blog/` 代理到该服务；文章保存在 `/var/lib/blog-editor/` 下的 Markdown 文件中。

首次安装或更新 API 时，在仓库根目录执行：

```bash
sudo install -D -m 0755 ops/blog-editor-api/server.py /opt/blog-editor-api/server.py
sudo install -m 0644 ops/blog-editor-api/seed_posts.json /opt/blog-editor-api/seed_posts.json
sudo install -m 0644 ops/astrbot/blog-editor-api.service /etc/systemd/system/blog-editor-api.service
sudo useradd --system --home-dir /var/lib/blog-editor --shell /usr/sbin/nologin blog-editor 2>/dev/null || true
sudo install -d -m 0750 -o blog-editor -g blog-editor /var/lib/blog-editor
sudo systemctl daemon-reload
sudo systemctl enable --now blog-editor-api.service
```

`/var/OPC/.env` 需要设置以下服务端变量：

```dotenv
BLOG_EDITOR_PASSWORD_HASH=<bcrypt hash, never store the plaintext password>
BLOG_EDITOR_SESSION_SECRET=<long random server-only value>
BLOG_EDITOR_DATA_DIR=/var/lib/blog-editor
BLOG_EDITOR_ALLOWED_ORIGINS=https://blog.akai.ink
```

密码哈希和会话密钥只保存在服务器，并将通过 `HttpOnly`、`Secure`、`SameSite=Strict` Cookie 建立会话。更新 Nginx 的 `blog.akai.ink` HTTPS server 时，将 `ops/astrbot/blog-editor-nginx-location.conf` 中的 location 加入配置，再执行：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

`blog-editor-api.service` 使用低权限 `blog-editor` 用户运行，不能写入网站静态目录；部署静态文件时不会覆盖 `/var/lib/blog-editor/`。

## 检查与手动执行

```bash
sudo systemctl list-timers --all 'blog-*-update.timer'
sudo systemctl status blog-news-update.timer blog-projects-update.timer blog-favorites-update.timer

sudo systemctl start blog-news-update.service
sudo systemctl start blog-projects-update.service
sudo systemctl start blog-favorites-update.service

sudo systemctl status blog-news-update.service
sudo systemctl status blog-projects-update.service
sudo systemctl status blog-favorites-update.service
```

手动启动 service 不会改变 timer 的计划。项目和收藏脚本只有在生成数据验证通过后才发布；失败时保留现有线上文件。

## 查看日志

```bash
sudo journalctl -u blog-news-update.service -n 100 --no-pager
sudo journalctl -u blog-news-update.service -f
sudo journalctl -u blog-projects-update.service -n 100 --no-pager
sudo journalctl -u blog-favorites-update.service -n 100 --no-pager
```
