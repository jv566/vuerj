// axios基础的封装
import axios from 'axios'
import { ElMessageBox } from 'element-plus'

let isAuthExpiredHandling = false

const hasItsidInRequest = (config) => {
  return String(config?.url || '').includes('itsid=')
}

const isAuthExpiredResponse = (data, config) => {
  if (!data || !hasItsidInRequest(config)) {
    return false
  }

  const code = data.code === undefined || data.code === null ? '' : String(data.code)
  if (['401', '403'].includes(code)) {
    return true
  }

  const result = data.result === undefined || data.result === null ? '' : String(data.result).toLowerCase()
  if (['login_timeout', 'auth_expired', 'invalid_itsid'].includes(result)) {
    return true
  }

  const message = [
    data.desc,
    data.msg,
    data.message,
    data.errmsg
  ].filter(Boolean).join(' ').toLowerCase()

  if (code === '-1' && message.includes('无此用户')) {
    return true
  }

  if (message.includes('itsid') || message.includes('session') || message.includes('token')) {
    return true
  }

  if (message.includes('请重新登录') || message.includes('未登录')) {
    return true
  }

  const loginExpiredWords = ['失效', '过期', '超时', '重新']
  if (message.includes('登录') && loginExpiredWords.some(word => message.includes(word))) {
    return true
  }

  const credentialWords = ['凭证', '会话']
  const invalidWords = ['失效', '无效', '过期']
  return credentialWords.some(word => message.includes(word)) &&
    invalidWords.some(word => message.includes(word))
}

const getLoginUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return `${window.location.origin}${window.location.pathname}#/login`
  }

  return `${window.location.origin}/login`
}

const handleAuthExpired = () => {
  if (isAuthExpiredHandling) {
    return
  }

  isAuthExpiredHandling = true
  localStorage.removeItem('username')
  localStorage.removeItem('itsid')
  localStorage.removeItem('unitid')
  localStorage.removeItem('orderList')

  ElMessageBox.alert('登录状态已失效，需要重新登录', '提示', {
    confirmButtonText: '重新登录',
    type: 'warning',
    customClass: 'auth-expired-message-box',
    closeOnClickModal: false,
    closeOnPressEscape: false
  }).finally(() => {
    window.location.replace(getLoginUrl())
  })
}

// 环境判断
let baseURL
if(process.env.NODE_ENV === 'development') {
  baseURL = '/api'
} else if(process.env.NODE_ENV === 'production') {
  baseURL = 'https://www.caldicoffee.com.cn'
}

const httpInstance = axios.create({
  // baseURL,
  // baseURL: 'https://www.caldicoffee.com.cn',
  baseURL: '/api',
  timeout: 50000,
  withCredentials: true,
  // headers: {
  //   'Access-Control-Allow-Origin': '*',
  //   'Content-Type': 'application/json;charset=utf-8'
  // }
})

// axios请求拦截器
httpInstance.interceptors.request.use(
  (config) => {
    return config
  },
  (e) => {
    return Promise.reject(e)
  }
)

// axios响应式拦截器
httpInstance.interceptors.response.use(
  (res) => {
    if (isAuthExpiredResponse(res.data, res.config)) {
      handleAuthExpired()
      return Promise.reject({
        ...(res.data || {}),
        __authExpired: true
      })
    }

    return res.data
  },
  (e) => {
    return Promise.reject(e)
  }
)

export default httpInstance
