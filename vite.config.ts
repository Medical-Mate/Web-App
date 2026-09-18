import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  /* 백엔드. 앱은 언제나 같은 출처의 `/api` 를 부르고, 앞에 선 것이 이 주소로 넘긴다 —
     브라우저가 다른 출처로 직접 부르면 사전 요청에 403 이 온다. 배포에서는 `vercel.json` 의
     rewrites 가 같은 일을 한다.

     기본값을 여기 둔다. 원본 앱도 `build.gradle.kts` 에서 같은 주소를 기본값으로 들고
     `local.properties` 로만 덮어쓴다 — 받아서 바로 띄울 수 있어야 하고, 이 주소는 비밀이 아니다.
     `.env` 의 `VITE_BACKEND_BASE_URL` 로 바꿀 수 있다. */
  const DEFAULT_BACKEND = 'https://d3f36x6ccm838d.cloudfront.net'
  const backend = (loadEnv(mode, process.cwd()).VITE_BACKEND_BASE_URL || DEFAULT_BACKEND).replace(/\/+$/, '')
  const proxy = { '/api': { target: backend, changeOrigin: true } }

  return {
    plugins: [react()],
    /* 뿌리 기준으로 건다. 문서가 둘이라(`/` 와 `/app/`) 상대 경로를 쓰면 앱 문서가
       `./favicon.ico` 를 `/app/favicon.ico` 로 찾는다. 도메인 뿌리에 올리는 것이 전제다. */
    base: '/',
    server: { port: 5173, host: true, proxy },
    /* `vite preview` 는 배포 결과를 흉내 내는 자리다. 프록시가 없으면 배포와 다르게 돈다. */
    preview: { port: 4173, proxy },
    build: {
      outDir: 'dist',
      assetsInlineLimit: 0,
      rollupOptions: {
        /* 문서 둘. 뿌리는 진입 온보딩이고, 시연 앱은 그 아래 `/app/` 이다 —
           온보딩의 `직접 시연해보기` 가 가리키는 자리다(`DEMO_URL`). */
        input: {
          intro: resolve(__dirname, 'index.html'),
          app: resolve(__dirname, 'app/index.html'),
        },
      },
    },
  }
})
