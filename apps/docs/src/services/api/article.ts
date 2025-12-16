import { http } from "../http"

/**
 * 文章相关 API
 */
export class ArticleApiService {
  /**
   * 获取文章列表
   */
  static async getArticles(category?: string, page = 1, limit = 10) {
    const response = await http.get('/articles', {
      params: { category, page, limit },
    })
    return response.data.data
  }

  /**
   * 获取文章详情
   */
  static async getArticle(id: string) {
    const response = await http.get(`/articles/${id}`)
    return response.data.data
  }

  /**
   * 创建文章
   */
  static async createArticle(articleData: any) {
    const response = await http.post('/articles', articleData)
    return response.data.data
  }

  /**
   * 更新文章
   */
  static async updateArticle(id: string, articleData: any) {
    const response = await http.put(`/articles/${id}`, articleData)
    return response.data.data
  }

  /**
   * 删除文章
   */
  static async deleteArticle(id: string) {
    const response = await http.delete(`/articles/${id}`)
    return response.data
  }
}