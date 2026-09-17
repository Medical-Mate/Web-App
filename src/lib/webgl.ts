/** WebGL 을 쓸 수 있는가.
 *
 * 3D 인체도를 올릴지 이미지 인체도로 되돌릴지 여기서 갈린다. 이 판단만 하려고
 * three.js 를 통째로 불러오면 안 되므로 3D 모듈과 떼어 둔다.
 */
export function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    )
  } catch {
    return false
  }
}
