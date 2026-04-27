<script setup>
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
import Order from '@/assets/images/order.png'
import Orders from '@/assets/images/orders.png'
import Zhizuozhong from '@/assets/images/zhizuozhong.png'
import Daiqucan from '@/assets/images/daiqucan.png'

const router = useRouter()

const navList = [
  { path: '/layout/order', img: Order, name: '购买', newTab: false },
  { path: '/layout/orders', img: Orders, name: '订单', newTab: false },
  { path: '/making', img: Zhizuozhong, name: '制作中', newTab: true },
  { path: '/picking', img: Daiqucan, name: '待取餐', newTab: true },
  // 暂时停用取餐屏入口，后续需要时可以直接恢复。
  // { path: '/pickup', img: Qucanping, name: '取餐屏', newTab: true },
]

const activeFlag = ref('/layout')
const username = ref(localStorage.getItem('username') || '')

onMounted(() => {
  setActiveFlag(router.currentRoute.value.path)
})

const setActiveFlag = (path, isNewTab) => {
  if (!isNewTab) {
    activeFlag.value = path
  }
}

const getFullPath = (path) => {
  if (process.env.NODE_ENV === 'development') {
    return window.location.origin + router.resolve(path).href
  }

  const currentPath = window.location.pathname
  const basePath = currentPath.endsWith('/')
    ? currentPath
    : currentPath.replace(/\/[^/]*$/, '/')

  return `${window.location.origin}${basePath}#${path}`
}
</script>

<template>
  <div class="left-nav">
    <div class="logo">
      <div class="logo-wrapper">
        <img src="/src/assets/images/caldi.gif" alt="">
      </div>
    </div>

    <div class="nav">
      <template v-for="item in navList" :key="item.path">
        <router-link
          v-if="!item.newTab"
          class="item"
          :to="item.path"
          :class="activeFlag === item.path ? 'item-active' : ''"
          @click="setActiveFlag(item.path, item.newTab)"
        >
          <div class="pic"><img :src="item.img" alt=""></div>
          <div class="title">{{ item.name }}</div>
        </router-link>

        <a
          v-else
          class="item"
          :href="getFullPath(item.path)"
          target="_blank"
          :class="activeFlag === item.path ? 'item-active' : ''"
          @click="setActiveFlag(item.path, item.newTab)"
        >
          <div class="pic"><img :src="item.img" alt=""></div>
          <div class="title">{{ item.name }}</div>
        </a>
      </template>
    </div>
  </div>

  <div class="right-nav">
    <div class="left-title">
      <div class="brand-mark">
        <span class="brand-mark-dot"></span>
        <span class="brand-mark-core"></span>
      </div>
      <div class="title-copy">
        <div class="eyebrow">CALDI COFFEE ADMIN</div>
        <div class="brand-title">卡狄咖啡后台</div>
      </div>
      <div class="title-chip">Store Console</div>
      <div class="txt">卡狄咖啡后台</div>
    </div>

    <div class="right-more">
      <img src="/src/assets/images/setting.png" alt="">
      <img src="/src/assets/images/message.png" alt="">
      <div class="userinfo">
        <img src="/src/assets/images/user.png" alt="">
        <div class="name">{{ username }}</div>
      </div>
    </div>
  </div>

  <div class="right-content">
    <RouterView />
  </div>
</template>

<style scoped lang="scss">
.left-nav {
  position: absolute;
  top: 50%;
  left: 0;
  display: flex;
  flex-direction: column;
  width: 120px;
  height: 100%;
  overflow: hidden;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);

  .logo {
    width: 100px;
    height: 100px;
    margin: 10px auto 30px;
    display: flex;
    align-items: center;
    justify-content: center;

    .logo-wrapper {
      width: 100px;
      height: 100px;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: #fff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

      img {
        width: calc(100% - 10px);
        height: calc(100% - 10px);
        object-fit: contain;
      }
    }
  }

  .nav {
    height: 820px;
    overflow-y: auto;

    .item {
      margin: 0 10px 20px;
      height: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.3s ease;

      &.item-active {
        border-radius: 12px;
        transform: scale(1.05);
        background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);

        .pic img {
          filter: brightness(0) invert(1);
        }

        .title {
          color: #fff;
        }
      }

      &:hover:not(.item-active) {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }

      .pic {
        width: 38px;
        height: 38px;
        margin-bottom: 6px;

        img {
          width: 100%;
          height: 100%;
          transition: filter 0.3s ease;
        }
      }

      .title {
        color: #333;
        font-size: 14px;
        font-weight: 500;
      }
    }
  }
}

.left-nav-collapse {
  width: 60px;
}

.right-nav {
  position: fixed;
  top: 0;
  left: 125px;
  right: 0;
  height: 80px;
  padding: 0 20px 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 50;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  transition: left 0.5s ease;

  .left-title {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 16px 10px 12px;
    border: 1px solid rgba(226, 232, 240, 0.95);
    border-radius: 22px;
    background:
      radial-gradient(circle at top left, rgba(251, 191, 36, 0.2), transparent 26%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.98) 100%);
    box-shadow:
      0 14px 30px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.85);

    .icon {
      width: 32px;
      height: 32px;

      .icon-rotate {
        cursor: pointer;
        color: rgb(121, 187, 255);
        transition: 0.5s;
        transform: rotate(0.5turn);

        &:hover {
          color: rgb(64, 158, 255);
        }
      }
    }

    > .txt {
      display: none;
    }

    .brand-mark {
      position: relative;
      width: 48px;
      height: 48px;
      flex: 0 0 48px;
      border-radius: 16px;
      background: linear-gradient(135deg, #7c2d12 0%, #b45309 55%, #f59e0b 100%);
      box-shadow:
        0 10px 24px rgba(180, 83, 9, 0.28),
        inset 0 1px 0 rgba(255, 255, 255, 0.35);
    }

    .brand-mark-dot {
      position: absolute;
      top: 9px;
      right: 9px;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: rgba(255, 251, 235, 0.95);
      box-shadow: 0 0 0 4px rgba(255, 251, 235, 0.14);
    }

    .brand-mark-core {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 20px;
      height: 20px;
      border-radius: 12px 12px 16px 16px;
      background: rgba(255, 251, 235, 0.96);
      transform: translate(-50%, -42%) rotate(45deg);
    }

    .title-copy {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
    }

    .eyebrow {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.18em;
      color: #b45309;
      text-transform: uppercase;
    }

    .brand-title {
      margin-top: 2px;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1.05;
      color: #111827;
      text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
    }

    .title-chip {
      margin-left: 6px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.12);
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
  }

  .right-more {
    display: flex;
    align-items: center;

    img {
      width: 32px;
      height: 32px;
      margin-left: 44px;
    }

    .userinfo {
      display: flex;
      align-items: center;

      img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }

      .name {
        margin-left: 5px;
        margin-right: 20px;
        font-size: 18px;
      }
    }
  }
}

.right-content {
  position: absolute;
  top: 80px;
  left: 140px;
  right: 0;
  bottom: 0;
  padding: 20px 20px 300px;
  overflow: auto;
  transition: left 0.5s ease;
}

.right-collapse {
  left: 100px;
}

.right-collapse-all {
  left: 0;
}
</style>
