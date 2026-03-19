/**
 * 合并 Tailwind CSS 类名
 * @param inputs 类名数组
 * @returns 合并后的类名字符串
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
