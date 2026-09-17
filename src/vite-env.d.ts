/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 주소. `.env` 에서 온다. 비어 있으면 로컬 목록과 대본만 쓴다. */
  readonly VITE_BACKEND_BASE_URL?: string
  /** 인증 경로용 액세스 토큰. 데모 경로(`/api/demo/*`)에는 필요 없다. */
  readonly VITE_BACKEND_ACCESS_TOKEN?: string
}
