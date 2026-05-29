# 校园 e站运营后台

这是校园 e站的运营后台前端。默认入口是 `/admin`，旧短视频站、聊天、好友、群组等用户侧页面不再进入默认路由。

## 本地 Docker 启动

先启动后端：

```bash
cd /Users/firetang/Documents/lehu/lehu-video
docker compose up -d --build
```

再启动运营后台：

```bash
cd /Users/firetang/Documents/lehu/lehu-video-frontend
docker compose up -d --build
```

访问地址：

```text
http://localhost:15173/admin
```

后端默认：

```text
http://localhost:18080/v1
```
