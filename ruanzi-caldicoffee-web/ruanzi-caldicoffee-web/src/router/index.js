import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import Layout from '@/views/Layout/index.vue'
import Order from '@/views/Layout/components/orderIndex.vue'
import Home from '@/views/Layout/components/homeIndex.vue'
import Orders from '@/views/Layout/components/ordersIndex.vue'
import Vip from '@/views/Layout/components/vipIndex.vue'
import My from '@/views/Layout/components/myIndex.vue'
// import Pickup from '@/views/Pickup/index.vue'
import Making from '@/views/Making/index.vue'
import Picking from '@/views/Picking/index.vue'
import Login from '@/views/Login/index.vue'

let history
if (process.env.NODE_ENV === 'development') {
  history = createWebHistory(import.meta.env.BASE_URL)
} else if (process.env.NODE_ENV === 'production') {
  history = createWebHashHistory()
}

const router = createRouter({
  history,
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      meta: {
        title: '登录'
      },
      component: Login
    },
    {
      path: '/making',
      component: Making,
      meta: {
        title: '后台-制作中'
      }
    },
    {
      path: '/picking',
      component: Picking,
      meta: {
        title: '后台-待取餐'
      }
    },
    // 暂时停用取餐屏路由，页面文件先保留，后续需要时可直接恢复
    // {
    //   path: '/Pickup',
    //   component: Pickup,
    //   meta: {
    //     title: '后台-取餐屏'
    //   }
    // },
    {
      path: '/layout',
      component: Layout,
      meta: {
        title: '卡狄咖啡后台'
      },
      children: [
        {
          path: '',
          component: Home
        },
        {
          path: 'order',
          component: Order,
          meta: {
            title: '卡狄购买商品'
          }
        },
        {
          path: 'orders',
          component: Orders,
          meta: {
            title: '卡狄订单管理'
          }
        },
        {
          path: 'vip',
          component: Vip,
          meta: {
            title: '卡狄会员'
          }
        },
        {
          path: 'my',
          component: My
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
