# AstrBot 服务器上的每日新闻更新

将每日新闻抓取从 GitHub Actions 迁移到 AstrBot 服务器的 systemd timer。普通 GitHub deploy build 不再负责抓取新闻。

## 安装

在服务器上、仓库根目录执行：

```bash
sudo install -D -m 0755 ops/astrbot/update-blog-news.py /usr/local/libexec/blog-news-update.py
sudo install -m 0644 ops/astrbot/blog-news-update.service /etc/systemd/system/blog-news-update.service
sudo install -m 0644 ops/astrbot/blog-news-update.timer /etc/systemd/system/blog-news-update.timer
sudo systemctl daemon-reload
sudo systemctl enable --now blog-news-update.timer
```

timer 每天 03:00 UTC 执行，并通过 `Persistent=true` 补执行错过的任务。服务以 root 运行，默认写入 `/var/www/blog/news/today.json`。

所有 secrets 只放在服务器的 `/var/OPC/.env`，不要写入或提交仓库。可选地在该文件中设置 `OPC_BIN` 和 `NEWS_OUTPUT_FILE` 覆盖默认路径。

## 检查与手动执行

```bash
sudo systemctl enable blog-news-update.timer
sudo systemctl start blog-news-update.timer
sudo systemctl status blog-news-update.timer
sudo systemctl start blog-news-update.service
sudo systemctl status blog-news-update.service
```

手动启动 service 不会改变 timer 的计划；service 失败时会保留现有新闻文件。

## 查看日志

```bash
sudo journalctl -u blog-news-update.service -n 100 --no-pager
sudo journalctl -u blog-news-update.service -f
```
