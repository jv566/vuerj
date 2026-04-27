<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import request from '@/utils/http'
import { useItsidStore } from '@/stores/itsid'

const useItsid = useItsidStore()

const POLL_INTERVAL = 3000
let pollTimer = null
let isPageActive = false

const clearPollTimer = () => {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

const scheduleNextPoll = () => {
  if (!isPageActive) return
  clearPollTimer()
  pollTimer = window.setTimeout(() => {
    getList()
  }, POLL_INTERVAL)
}

const comingList = ref([])
const pickupList = ref([])
const reset = () => {
  comingList.value = []
  pickupList.value = []
}
onMounted(() => {
  isPageActive = true
  getList()
})

onUnmounted(() => {
  isPageActive = false
  clearPollTimer()
})

const getList = async () => {
  if (!isPageActive) return
  clearPollTimer()
  try {
    const res = await request({
      url: `/jy/go/we.aspx?ituid=106&itjid=10615&itcid=10615&unitid=${localStorage.getItem('unitid')}`,
      method: 'GET',
    })
    reset()
    res.result.list.filter((item)=>{
      if(item.order_state === '4' || item.order_state === '1'){
        comingList.value.push(item.orderid.substring(item.orderid.length-4))
      }else if(item.order_state === '9'){
        pickupList.value.push(item.orderid.substring(item.orderid.length-4))
      }
    })
  } catch (err) {
  } finally {
    scheduleNextPoll()
  }
}
</script>

<template>
  <div class="all">
    <div class="screen-header">
      <div class="header-copy">
        <div class="brand">KADI COFFEE</div>
        <div class="headline">取餐提醒屏</div>
        <div class="subtitle">右侧优先展示可取餐号码，卡片尺寸已压缩以便同屏显示更多取餐码，过多时支持分栏纵向滚动。</div>
      </div>
      <div class="header-stats">
        <div class="stat-card stat-coming">
          <div class="stat-label">制作中</div>
          <div class="stat-value">{{ comingList.length }}</div>
        </div>
        <div class="stat-card stat-pickup">
          <div class="stat-label">请取餐</div>
          <div class="stat-value">{{ pickupList.length }}</div>
        </div>
      </div>
    </div>

    <div class="board-grid">
      <div class="coming comment">
        <div class="panel-head">
          <div class="panel-copy">
            <div class="panel-eyebrow">Coming</div>
            <div class="title">制作中</div>
          </div>
          <div class="panel-count">{{ comingList.length }}</div>
        </div>
        <div class="item-list" :class="{ 'item-list-empty': !comingList.length }">
          <div class="item" v-for="(i, index) in comingList" :key="`coming-${i}-${index}`">{{ i }}</div>
          <div class="empty-tip" v-if="!comingList.length">当前没有制作中的订单</div>
        </div>
      </div>

      <div class="pickup comment">
        <div class="panel-head">
          <div class="panel-copy">
            <div class="panel-eyebrow">Pickup</div>
            <div class="title">请取餐</div>
          </div>
          <div class="panel-count">{{ pickupList.length }}</div>
        </div>
        <div class="item-list pickup-list" :class="{ 'item-list-empty': !pickupList.length }">
          <div class="item" v-for="(i, index) in pickupList" :key="`pickup-${i}-${index}`">{{ i }}</div>
          <div class="empty-tip" v-if="!pickupList.length">饮品完成后会显示在这里</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.all {
  --coffee-950: #36241e;
  --coffee-900: #4e3429;
  --coffee-700: #704d3d;
  --coffee-500: #a67356;
  --mint-500: #4f8572;
  height: 960px;
  padding: 18px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.45), transparent 22%),
    radial-gradient(circle at bottom right, rgba(210, 177, 152, 0.22), transparent 16%),
    linear-gradient(135deg, #eadfd3 0%, #f7f2ec 40%, #eee4d8 100%);
  color: var(--coffee-950);
}

.screen-header {
  padding: 18px 22px;
  border-radius: 24px;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 16px;
  color: #fff;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.14), transparent 24%),
    linear-gradient(135deg, #4f3429 0%, #7a5341 48%, #b27f61 100%);
  box-shadow: 0 18px 34px rgba(80, 51, 39, 0.18);
}

.header-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.brand {
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
}

.headline {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.05;
}

.subtitle {
  max-width: 780px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.78);
}

.header-stats {
  display: flex;
  gap: 12px;
}

.stat-card {
  min-width: 140px;
  padding: 12px 14px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.76);
}

.stat-value {
  margin-top: 6px;
  font-size: 38px;
  font-weight: 700;
  line-height: 1;
}

.board-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 0;
}

.comment {
  min-width: 0;
  min-height: 0;
  padding: 16px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 18px 34px rgba(86, 58, 45, 0.08);
  border: 1px solid rgba(83, 57, 45, 0.08);
}

.coming {
  background:
    linear-gradient(180deg, rgba(255, 250, 245, 0.96) 0%, rgba(248, 242, 236, 0.98) 100%);
}

.pickup {
  background:
    radial-gradient(circle at top right, rgba(173, 219, 201, 0.2), transparent 24%),
    linear-gradient(180deg, rgba(244, 251, 248, 0.98) 0%, rgba(233, 245, 240, 0.98) 100%);
}

.panel-head {
  margin-bottom: 12px;
  padding: 4px 2px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-eyebrow {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(79, 53, 42, 0.58);
}

.title {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.06;
}

.panel-count {
  min-width: 70px;
  height: 70px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 12px 24px rgba(89, 61, 49, 0.14);
}

.coming .panel-count {
  background: linear-gradient(135deg, var(--coffee-700) 0%, var(--coffee-500) 100%);
}

.pickup .panel-count {
  background: linear-gradient(135deg, var(--mint-500) 0%, #78b39d 100%);
}

.item-list {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  grid-auto-rows: 82px;
  gap: 10px;
  align-content: start;
  overflow-y: auto;
  padding-right: 4px;
}

.pickup-list {
  grid-template-columns: repeat(auto-fill, minmax(102px, 1fr));
  grid-auto-rows: 74px;
  gap: 9px;
}

.item-list::-webkit-scrollbar {
  width: 8px;
}

.item-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(93, 63, 47, 0.16);
}

.item {
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.03em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.pickup .item {
  font-size: 26px;
}

.coming .item {
  color: var(--coffee-900);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.72), transparent 36%),
    linear-gradient(135deg, #fff7ef 0%, #f0dfcf 100%);
  border: 1px solid rgba(122, 83, 65, 0.1);
}

.pickup .item {
  color: #1f5f4e;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.72), transparent 36%),
    linear-gradient(135deg, #f5fffb 0%, #d7eee5 100%);
  border: 1px solid rgba(79, 133, 114, 0.14);
}

.item-list-empty {
  grid-template-columns: 1fr;
  grid-auto-rows: 1fr;
}

.empty-tip {
  height: 100%;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 22px;
  color: rgba(63, 49, 43, 0.46);
  background: rgba(255, 255, 255, 0.46);
  border: 2px dashed rgba(93, 63, 47, 0.12);
}

@media (max-width: 1500px) {
  .headline {
    font-size: 30px;
  }

  .title {
    font-size: 28px;
  }

  .item-list {
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    grid-auto-rows: 72px;
  }

  .pickup-list {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    grid-auto-rows: 66px;
  }

  .item {
    font-size: 26px;
  }

  .pickup .item {
    font-size: 24px;
  }
}
</style>
