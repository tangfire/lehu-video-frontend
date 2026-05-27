# Lehu Video Frontend

## 本地 Docker 启动

启动前先打开 Docker Desktop，并建议先启动后端：

```bash
cd /Users/firetang/Documents/lehu/lehu-video
docker compose up -d
```

再启动前端：

```bash
cd /Users/firetang/Documents/lehu/lehu-video-frontend
docker compose up -d
```

前端默认访问地址：

```text
http://localhost:15173
```

后端默认访问地址：

```text
http://localhost:18080
```

如果修改了前端代码或 Docker 配置，需要重新构建：

```bash
docker compose up -d --build
```

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

停止前端：

```bash
docker compose down
```

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
