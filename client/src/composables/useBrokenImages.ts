import { reactive } from 'vue'

/** 全局共享的裂图集合，图片加载失败自动加入，同URL只记一次 */
export const brokenImages = reactive(new Set<string>())

/** 图片加载失败时调用，自动将URL加入裂图集 */
export function onImgError(url: string) {
  brokenImages.add(url)
}
