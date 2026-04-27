<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/http'
import { useItsidStore } from '@/stores/itsid'

const BASERUL = 'https://www.caldicoffee.com.cn'

const useItsid = useItsidStore()

const POLL_INTERVAL = 5000
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
    getMakingList({ silent: true })
  }, POLL_INTERVAL)
}

onMounted(()=>{
  isPageActive = true
  getMakingList()
})

onUnmounted(() => {
  isPageActive = false
  clearPollTimer()
})

const makingList = ref([])
const isLoading = ref(false)
const pendingOrderIds = ref([])

const isOrderPending = (orderId) => {
  return pendingOrderIds.value.includes(String(orderId))
}

const addPendingOrder = (orderId) => {
  const normalizedId = String(orderId)
  if (!pendingOrderIds.value.includes(normalizedId)) {
    pendingOrderIds.value = [...pendingOrderIds.value, normalizedId]
  }
}

const removePendingOrder = (orderId) => {
  const normalizedId = String(orderId)
  pendingOrderIds.value = pendingOrderIds.value.filter((id) => id !== normalizedId)
}
const getMakingList = async ({ silent = false } = {}) => {
  if (!isPageActive) return
  clearPollTimer()
  if (!silent) {
    isLoading.value = true
  }
  try {
    const res = await request({
      url: `/jy/go/we.aspx?ituid=106&itjid=10613&itcid=10613&unitid=${localStorage.getItem('unitid')}`,
      method: 'GET'
    })
    makingList.value = res.result.list
  } catch (err) {
    makingList.value = []
  } finally {
    if (!silent) {
      isLoading.value = false
    }
    scheduleNextPoll()
  }
}

const handleConfirm = async (orderId) => {
  if (isOrderPending(orderId)) {
    return
  }

  addPendingOrder(orderId)

  try {
    await request({
      url: `/jy/go/phone.aspx?mbid=10606&ituid=106&itsid=${localStorage.getItem('itsid')}`,
      method: 'POST',
      data: {
        orderid: Number(orderId)
      }
    })
    await getMakingList({ silent: true })
    ElMessage.success('已上报制作完成')
  } catch (err) {
    if (err?.__authExpired) {
      return
    }
    ElMessage.error('上报制作完成失败，请稍后重试')
  } finally {
    removePendingOrder(orderId)
  }
}

const handleDetail = (e) => {
  if(e[0] === '鏉' || e[0] === '椋' || e[0] === '绋'){
    return e.split(";").map(item => item.split(":")[1].trim()).join("銆")
  } else {
    return e
  }
}
</script>

<template>
  <div class="all" v-loading="isLoading">
    <div class="page-header">
      <div class="header-copy">
        <div class="eyebrow">Production Queue</div>
        <div class="title-row">
          <div class="title">制作中订单</div>
          <div class="count-pill">{{ makingList.length }} 单</div>
        </div>
        <div class="subtitle">按订单逐条制作，整页支持纵向滚动；单条订单商品过多时可横向查看。</div>
      </div>
      <div class="header-metrics">
        <div class="metric-card">
          <div class="metric-label">当前制作中</div>
          <div class="metric-value">{{ makingList.length }}</div>
        </div>
      </div>
    </div>

    <div class="order-list" v-if="makingList.length">
      <div class="item" v-for="item in makingList" :key="item.order_id">
        <div class="head">
          <div class="head-main">
            <div class="order-badge">制作中</div>
            <div class="code-block">
              <div class="label">取餐码</div>
              <div class="code">{{ item.order_id.substring(item.order_id.length - 4) }}</div>
            </div>
          </div>
          <div class="meta-list">
            <div class="meta-card">
              <div class="meta-label">下单时间</div>
              <div class="meta-value">{{ item.order_date }}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">总杯数</div>
              <div class="meta-value accent">{{ item.order_sum }}</div>
            </div>
          </div>
          <div class="btn">
            <el-button
              type="primary"
              :loading="isOrderPending(item.order_id)"
              :disabled="isOrderPending(item.order_id)"
              @click="handleConfirm(item.order_id)"
            >上报制作完成</el-button>
          </div>
        </div>

        <div class="body-shell">
          <div class="body">
            <div
              class="goods-item"
              v-for="(i, index) in item.order_items"
              :key="`${item.order_id}-${i.item_name}-${index}`"
            >
              <div class="image">
                <img :src="`${BASERUL}/jy/wxUserImg/106/${i.item_image}`" alt="">
              </div>
              <div class="txtbox">
                <div class="txt">{{ i.item_name }}</div>
                <div class="desc">{{ handleDetail(i.item_detail) }}</div>
              </div>
              <div class="num">x{{ i.item_num }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="empty" v-else>
      <el-empty description="暂时没有待制作订单" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.all {
  --bg-top: #f5efe4;
  --bg-bottom: #faf7f1;
  --panel-border: rgba(91, 65, 41, 0.1);
  --panel-shadow: 0 20px 40px rgba(91, 65, 41, 0.1);
  --coffee-950: #3c291f;
  --coffee-900: #4d3428;
  --coffee-800: #634333;
  --coffee-700: #77503d;
  --coffee-500: #a36f52;
  --coffee-100: #f3e7db;
  --text-main: #3d2f2a;
  --text-muted: #8c786b;
  height: 100%;
  padding: 18px;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background:
    radial-gradient(circle at top left, rgba(224, 192, 144, 0.22), transparent 24%),
    linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 26px;
  color: #fff;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 26%),
    linear-gradient(135deg, #57372b 0%, #8a5c42 52%, #c08c62 100%);
  box-shadow: 0 20px 40px rgba(87, 55, 43, 0.22);
}

.header-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.title {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.08;
}

.count-pill {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  font-size: 16px;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.subtitle {
  max-width: 900px;
  font-size: 14px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.8);
}

.header-metrics {
  display: flex;
  align-items: stretch;
}

.metric-card {
  min-width: 180px;
  padding: 16px 18px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(12px);
}

.metric-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.metric-value {
  margin-top: 8px;
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
}

.order-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
}

.order-list::-webkit-scrollbar {
  width: 8px;
}

.order-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(99, 67, 51, 0.24);
}

.item {
  margin-bottom: 14px;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--panel-border);
  box-shadow: var(--panel-shadow);
}

.head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: linear-gradient(180deg, rgba(250, 246, 240, 0.95) 0%, rgba(255, 255, 255, 0.92) 100%);
  border-bottom: 1px solid rgba(91, 65, 41, 0.08);
}

.head-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.order-badge {
  padding: 10px 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--coffee-800) 0%, var(--coffee-500) 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.05em;
  box-shadow: 0 10px 22px rgba(99, 67, 51, 0.2);
}

.code-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.label {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.code {
  font-size: 34px;
  line-height: 1;
  font-weight: 700;
  color: var(--coffee-950);
}

.meta-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.meta-card {
  min-width: 140px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(91, 65, 41, 0.08);
}

.meta-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.meta-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  word-break: break-all;
}

.meta-value.accent {
  font-size: 24px;
  color: var(--coffee-900);
}

.btn {
  display: flex;
  justify-content: flex-end;
}

.btn :deep(.el-button) {
  height: 42px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #6e4937 0%, #ad7859 100%);
  box-shadow: 0 12px 20px rgba(110, 73, 55, 0.18);
}

.body-shell {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 14px 20px 16px;
}

.body-shell::-webkit-scrollbar {
  height: 8px;
}

.body-shell::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(99, 67, 51, 0.18);
}

.body {
  display: inline-flex;
  min-width: 100%;
  gap: 12px;
}

.goods-item {
  width: 320px;
  min-width: 320px;
  min-height: 126px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #faf6f1 100%);
  border: 1px solid rgba(91, 65, 41, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.image {
  width: 74px;
  height: 74px;
  flex: 0 0 74px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--coffee-100);
  box-shadow: inset 0 0 0 1px rgba(91, 65, 41, 0.08);
}

.image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.txtbox {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.txt {
  width: 100%;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 700;
  color: var(--text-main);
  word-break: break-word;
}

.desc {
  width: 100%;
  max-height: 58px;
  overflow-y: auto;
  padding-right: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
  word-break: break-word;
}

.desc::-webkit-scrollbar {
  width: 6px;
}

.desc::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(99, 67, 51, 0.14);
}

.num {
  min-width: 58px;
  height: 58px;
  padding: 0 10px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(119, 80, 61, 0.14), rgba(181, 131, 95, 0.24));
  color: var(--coffee-900);
  font-size: 22px;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(119, 80, 61, 0.08);
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px dashed rgba(91, 65, 41, 0.16);
}

.empty :deep(.el-empty__description p) {
  color: var(--text-muted);
  font-size: 15px;
}

@media (max-width: 1560px) {
  .page-header {
    padding: 18px 20px;
  }

  .head {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .meta-list,
  .btn {
    justify-content: flex-start;
  }
}
</style>
