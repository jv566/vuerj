<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/http'

const BASERUL = 'https://www.caldicoffee.com.cn'
const REFUND_SUBMIT_URL = ''

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: '4', label: '制作中' },
  { value: '9', label: '制作完成' },
  { value: '99', label: '订单完成' },
  { value: '1', label: '未付款' },
]

const statusLabelMap = {
  1: '未付款',
  4: '制作中',
  9: '制作完成',
  99: '订单完成',
}

const statusClassMap = {
  1: 'status-unpaid',
  4: 'status-making',
  9: 'status-ready',
  99: 'status-done',
}

const refundStatusLabelMap = {
  0: '无退款',
  '-1': '退款中',
  '-2': '退款失败',
  '-3': '部分退款',
  '-9': '已退款',
}

const refundStatusClassMap = {
  0: 'refund-status-none',
  '-1': 'refund-status-pending',
  '-2': 'refund-status-failed',
  '-3': 'refund-status-partial',
  '-9': 'refund-status-done',
}

const selectedStatus = ref('')
const pickupCodeInput = ref('')
const accountInput = ref('')
const appliedStatus = ref('')
const appliedPickupCode = ref('')
const appliedOrderId = ref('')

const isLoading = ref(false)
const orderGroups = ref([])
const refundDialogVisible = ref(false)
const refundHistoryLoading = ref(false)
const refundSubmitting = ref(false)
const activeRefundOrder = ref(null)
const refundRecords = ref([])
const refundForm = ref({
  amount: '',
  remark: '',
})

const POLL_INTERVAL = 8000
let pollTimer = null
let isPageActive = false

const clearPollTimer = () => {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

const scheduleNextPoll = () => {
  if (!isPageActive) {
    return
  }

  clearPollTimer()
  pollTimer = window.setTimeout(() => {
    if (refundDialogVisible.value || refundSubmitting.value || refundHistoryLoading.value) {
      scheduleNextPoll()
      return
    }

    getCoffeeOrderList({ silent: true })
  }, POLL_INTERVAL)
}

const normalizeOrderGroups = (goods = []) => {
  if (!Array.isArray(goods)) {
    return []
  }

  return goods.map((group) => ({
    ...group,
    children: Array.isArray(group?.children) ? group.children : [],
  }))
}

const getStatusLabel = (status) => {
  return statusLabelMap[String(status)] || `未知状态(${status})`
}

const getStatusClass = (status) => {
  return statusClassMap[String(status)] || 'status-default'
}

const getGroupFirstChild = (group) => {
  return group?.children?.[0] || {}
}

const getPickupCode = (order) => {
  if (String(order?.order_status) === '1') {
    return ''
  }
  return String(order?.order_id || '').slice(-4)
}

const getOrderStatus = (group) => {
  return String(getGroupFirstChild(group).order_status || '')
}

const getOrderTime = (group) => {
  return getGroupFirstChild(group).date || group?.time || ''
}

const getOrderPickupCode = (group) => {
  return getPickupCode(getGroupFirstChild(group))
}

const getOrderPayMethod = (group) => {
  const firstChild = getGroupFirstChild(group)
  return getFirstNonEmptyValue(
    group?.pay_method,
    group?.payMethod,
    firstChild?.pay_method,
    firstChild?.payMethod,
  )
}

const getOrderId = (group) => {
  return String(group?.id || getGroupFirstChild(group)?.order_id || '')
}

const canManageRefund = (group) => {
  return getOrderStatus(group) !== '1'
}

const getOrderItemCount = (group) => {
  return Array.isArray(group?.children) ? group.children.length : 0
}

const getOrderCupCount = (group) => {
  return (group?.children || []).reduce((total, item) => total + Number(item.num || 0), 0)
}

const formatAmount = (value) => {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) {
    return '0'
  }

  return amount.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

const getNumberValue = (value, fallback = 0) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : fallback
}

const getOrderTotal = (group) => {
  const total = (group?.children || []).reduce((sum, item) => sum + Number(item.total || 0), 0)
  return formatAmount(total)
}

const getFirstNonEmptyValue = (...values) => {
  const matchedValue = values.find((value) => {
    if (value === null || value === undefined) {
      return false
    }
    return String(value).trim() !== ''
  })

  if (matchedValue === null || matchedValue === undefined) {
    return ''
  }

  return String(matchedValue).trim()
}

const getRefundStatus = (group) => {
  const firstChild = getGroupFirstChild(group)
  return getFirstNonEmptyValue(
    group?.refundStatus,
    group?.refund_status,
    group?.refundstatus,
    firstChild?.refundStatus,
    firstChild?.refund_status,
    firstChild?.refundstatus,
    '0',
  )
}

const getRefundStatusLabel = (status) => {
  return refundStatusLabelMap[String(status)] || '无退款'
}

const getRefundStatusClass = (status) => {
  return refundStatusClassMap[String(status)] || 'refund-status-none'
}

const getOrderPaidAmount = (group) => {
  if (!group) {
    return 0
  }

  return getNumberValue(
    getFirstNonEmptyValue(
      group?.payAmount,
      group?.pay_amount,
      getOrderTotal(group),
    ),
  )
}

const getOrderRefundedAmount = (group) => {
  if (!group) {
    return 0
  }

  return getNumberValue(
    getFirstNonEmptyValue(
      group?.refundedAmount,
      group?.refunded_amount,
      group?.refundAmount,
      group?.refund_amount,
      '0',
    ),
  )
}

const getOrderCanRefundAmount = (group) => {
  return Math.max(getOrderPaidAmount(group) - getOrderRefundedAmount(group), 0)
}

const normalizeRefundRecords = (records = []) => {
  if (!Array.isArray(records)) {
    return []
  }

  return records.map((record, index) => ({
    id: getFirstNonEmptyValue(
      record?.refund_id,
      record?.refundId,
      record?.id,
      `${activeRefundOrder.value?.id || 'refund'}-${index}`,
    ),
    amount: getFirstNonEmptyValue(
      record?.refund_amount,
      record?.refundAmount,
      record?.amount,
      '0',
    ),
    remark: getFirstNonEmptyValue(
      record?.refund_remark,
      record?.refundRemark,
      record?.remark,
      record?.memo,
    ),
    status: getFirstNonEmptyValue(
      record?.refund_status,
      record?.refundStatus,
      record?.status,
      '-3',
    ),
    time: getFirstNonEmptyValue(
      record?.refund_time,
      record?.refundTime,
      record?.create_time,
      record?.createTime,
      record?.time,
    ),
    operator: getFirstNonEmptyValue(
      record?.operator,
      record?.operator_name,
      record?.operatorName,
      record?.user_name,
      record?.userName,
    ),
  }))
}

const currentRefundableAmount = computed(() => {
  return formatAmount(getOrderCanRefundAmount(activeRefundOrder.value))
})

const currentRefundedAmount = computed(() => {
  return formatAmount(getOrderRefundedAmount(activeRefundOrder.value))
})

const currentPaidAmount = computed(() => {
  return formatAmount(getOrderPaidAmount(activeRefundOrder.value))
})

const getOrderRemark = (group) => {
  const firstChild = getGroupFirstChild(group)
  return getFirstNonEmptyValue(
    group?.orderRemark,
    group?.order_remark,
    group?.remark,
    group?.note,
    group?.memo,
    group?.bz,
    firstChild?.orderRemark,
    firstChild?.order_remark,
    firstChild?.remark,
    firstChild?.note,
    firstChild?.memo,
    firstChild?.bz,
  )
}

const handleSearch = () => {
  appliedStatus.value = selectedStatus.value
  appliedPickupCode.value = pickupCodeInput.value.trim()
  appliedOrderId.value = accountInput.value.trim()
}

const handleReset = () => {
  selectedStatus.value = ''
  pickupCodeInput.value = ''
  accountInput.value = ''
  appliedStatus.value = ''
  appliedPickupCode.value = ''
  appliedOrderId.value = ''
}

const filteredOrderGroups = computed(() => {
  return normalizeOrderGroups(orderGroups.value).filter((group) => {
    if (appliedOrderId.value && !getOrderId(group).includes(appliedOrderId.value)) {
      return false
    }

    if (appliedStatus.value && getOrderStatus(group) !== appliedStatus.value) {
      return false
    }

    if (appliedPickupCode.value) {
      const pickupCode = getOrderPickupCode(group)
      if (!pickupCode || !pickupCode.includes(appliedPickupCode.value)) {
        return false
      }
    }

    return true
  })
})

const statusSummary = computed(() => {
  const summary = {
    total: orderGroups.value.length,
    1: 0,
    4: 0,
    9: 0,
    99: 0,
  }

  orderGroups.value.forEach((group) => {
    const key = getOrderStatus(group)
    if (Object.prototype.hasOwnProperty.call(summary, key)) {
      summary[key] += 1
    }
  })

  return summary
})

const loadRefundDetailData = async (group) => {
  refundHistoryLoading.value = true
  try {
    const detailSource = (
      group?.refundDetails
      || group?.refund_details
      || group?.refundLogs
      || group?.refund_logs
      || []
    )

    refundRecords.value = normalizeRefundRecords(detailSource)
  } finally {
    refundHistoryLoading.value = false
  }
}

const resetRefundDialogState = () => {
  refundForm.value = {
    amount: '',
    remark: '',
  }
  refundRecords.value = []
}

const handleRefundAction = async (group) => {
  activeRefundOrder.value = group
  resetRefundDialogState()
  refundDialogVisible.value = true
  loadRefundDetailData(group)
}

const handleRefundDialogClose = () => {
  refundDialogVisible.value = false
  activeRefundOrder.value = null
  resetRefundDialogState()
}

const handleRefundSubmit = async () => {
  const currentOrder = activeRefundOrder.value
  const refundAmount = getNumberValue(refundForm.value.amount, NaN)
  const canRefundAmount = getOrderCanRefundAmount(currentOrder)
  const refundRemark = refundForm.value.remark.trim()

  if (!currentOrder) {
    ElMessage.warning('请先选择需要退款的订单')
    return
  }

  if (!REFUND_SUBMIT_URL) {
    ElMessage.warning('请先配置退款接口地址')
    return
  }

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    ElMessage.warning('请输入有效的退款金额')
    return
  }

  if (refundAmount > canRefundAmount) {
    ElMessage.warning(`退款金额不能大于可退金额 ￥${formatAmount(canRefundAmount)}`)
    return
  }

  if (!refundRemark) {
    ElMessage.warning('请输入退款备注')
    return
  }

  refundSubmitting.value = true
  try {
    const res = await request({
      url: REFUND_SUBMIT_URL,
      method: 'POST',
      data: {
        orderid: getOrderId(currentOrder),
        refund_amount: refundAmount,
        refund_remark: refundRemark,
        opid: 3000,
      },
    })

    const responseCode = res?.code === undefined ? '' : String(res.code)
    if (responseCode && !['0', '1'].includes(responseCode)) {
      ElMessage.error(res?.msg || res?.desc || '退款失败')
      return
    }

    ElMessage.success(res?.msg || '退款成功')
  } catch (err) {
    ElMessage.error('退款失败，请稍后重试')
  } finally {
    refundSubmitting.value = false
  }
}

const getCoffeeOrderList = async ({ silent = false } = {}) => {
  if (!isPageActive) {
    return
  }

  clearPollTimer()

  if (!silent) {
    isLoading.value = true
  }

  try {
    const res = await request({
      url: `/jy/go/we.aspx?ituid=106&itjid=0107&itcid=10636&unitid=${localStorage.getItem('unitid')}`,
      method: 'GET',
    })
    if (!isPageActive) {
      return
    }

    orderGroups.value = normalizeOrderGroups(res?.result?.goods)
  } finally {
    if (!silent) {
      isLoading.value = false
    }

    scheduleNextPoll()
  }
}

onMounted(() => {
  isPageActive = true
  getCoffeeOrderList()
})

onUnmounted(() => {
  isPageActive = false
  clearPollTimer()
})



const printbtn =()=>{
  print({
    id:'printContent'
  })
}


</script>

<template>
  <div class="all">
    <div class="toolbar-panel">
      <div class="summary-grid">
        <div class="summary-card summary-total">
          <div class="summary-label">订单总数</div>
          <div class="summary-value">{{ statusSummary.total }}</div>
        </div>
        <div class="summary-card summary-unpaid">
          <div class="summary-label">未付款</div>
          <div class="summary-value">{{ statusSummary['1'] }}</div>
        </div>
        <div class="summary-card summary-making">
          <div class="summary-label">制作中</div>
          <div class="summary-value">{{ statusSummary['4'] }}</div>
        </div>
        <div class="summary-card summary-ready">
          <div class="summary-label">制作完成</div>
          <div class="summary-value">{{ statusSummary['9'] }}</div>
        </div>
        <div class="summary-card summary-done">
          <div class="summary-label">订单完成</div>
          <div class="summary-value">{{ statusSummary['99'] }}</div>
        </div>
      </div>

      <div class="filters">
        <div class="filter-item">
          <div class="filter-label">订单状态</div>
          <el-select v-model="selectedStatus" placeholder="请选择状态" style="width: 180px">
            <el-option
              v-for="item in statusOptions"
              :key="item.value || 'all'"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>

        <div class="filter-item filter-item-order-id">
          <div class="filter-label">订单编号</div>
          <el-input
            v-model="accountInput"
            style="width: 220px"
            placeholder="请输入订单编号"
            @keyup.enter="handleSearch"
          />
        </div>

        <div class="filter-item">
          <div class="filter-label">账号筛选</div>
          <el-input
            v-model="accountInput"
            @keyup.enter="handleSearch"
            style="width: 220px"
            placeholder="账号筛选暂未启用"
          />
        </div>

        <div class="filter-item">
          <div class="filter-label">取餐码筛选</div>
          <el-input
            v-model="pickupCodeInput"
            style="width: 220px"
            placeholder="请输入取餐码"
            @keyup.enter="handleSearch"
          />
        </div>

        <div class="filter-actions">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <div class="form-shell">
      <div class="form-header">
        <div class="form-title">订单列表</div>
      </div>

      <div class="form-list" v-loading="isLoading">
        <template v-if="filteredOrderGroups.length">
          <article class="order-card" v-for="group in filteredOrderGroups" :key="group.id">
            <header class="order-card-head">
              <div class="head-primary">
                <div class="head-top">
                  <div class="order-title-block">
                    <div class="order-no">订单号 #{{ group.id }}</div>
                    <div class="order-time">下单时间：{{ getOrderTime(group) }}</div>
                  </div>

                  <div class="head-top-right">
                    <div
                      class="pay-method-box"
                      :title="`支付方式：${getOrderPayMethod(group)}`"
                    >
                      <span class="pay-method-value">
                        {{ `支付方式：${getOrderPayMethod(group)}` }}
                      </span>
                    </div>
                    <div class="pickup-box">
                      <span class="pickup-label">取餐码</span>
                      <span class="pickup-value" :class="{ 'code-empty': !getOrderPickupCode(group) }">
                        {{ getOrderPickupCode(group) || '--' }}
                      </span>
                    </div>
                    <div class="compact-overview">
                      <div class="compact-overview-item" @click="printbtn">
                        <span class="compact-overview-label">商品款数</span>
                        <span class="compact-overview-value">{{ getOrderItemCount(group) }}</span>
                      </div>
                      <div class="compact-overview-item">
                        <span class="compact-overview-label">商品杯数</span>
                        <span class="compact-overview-value">{{ getOrderCupCount(group) }}</span>
                      </div>
                      <div class="compact-overview-item compact-overview-item-amount">
                        <span class="compact-overview-label">订单总额</span>
                        <span class="compact-overview-value">￥{{ getOrderTotal(group) }}</span>
                      </div>
                    </div>
                    <div class="status-meta order-status-meta">
                      <span class="status-meta-label">订单状态</span>
                      <span class="status-badge status-badge-large" :class="getStatusClass(getOrderStatus(group))">
                        {{ getStatusLabel(getOrderStatus(group)) }}
                      </span>
                    </div>
                    <div class="status-cluster" v-if="canManageRefund(group)">
                      <div class="status-meta" v-if="canManageRefund(group)">
                        <span class="status-meta-label">订单状态</span>
                        <span class="status-badge status-badge-large" :class="getStatusClass(getOrderStatus(group))">
                          {{ getStatusLabel(getOrderStatus(group)) }}
                        </span>
                      </div>
                      <div class="status-meta">
                        <span class="status-meta-label">退款状态</span>
                        <span class="status-badge status-badge-large" :class="getRefundStatusClass(getRefundStatus(group))">
                          {{ getRefundStatusLabel(getRefundStatus(group)) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  class="order-remark-panel"
                  :class="{ 'order-remark-panel-empty': !getOrderRemark(group) }"
                >
                  <div class="remark-panel-label">订单备注</div>
                  <div
                    class="remark-panel-value"
                    :class="{ 'remark-panel-value-empty': !getOrderRemark(group) }"
                  >
                    {{ getOrderRemark(group) }}
                  </div>
                </div>
              </div>

              <div class="head-actions option" v-if="canManageRefund(group)">
                <el-button
                  class="refund-action-btn"
                  plain
                  type="danger"
                  @click="handleRefundAction(group)"
                >
                  退款操作
                </el-button>
                <div class="edit">编辑</div>
                <div class="divider">/</div>
                <div class="del">删除</div>
              </div>
            </header>

            <section class="order-card-body">
              <div class="goods-section-title">商品明细</div>

              <div class="goods-list" v-if="group.children.length">
                <div class="goods-row" v-for="(item, index) in group.children" :key="`${group.id}-${index}`">
                  <div class="item-info">
                    <div class="item-seq">{{ index + 1 }}</div>
                    <div class="item-image">
                      <img :src="`${BASERUL}/jy/wxUserImg/106/${item.imageUrl}`" alt="">
                    </div>
                    <div class="item-text">
                      <div class="item-name">{{ item.productName }}</div>
                      <div class="item-spec">{{ item.add || '无加料信息' }}</div>
                    </div>
                  </div>

                  <div class="item-metrics">
                    <div class="metric-card">
                      <div class="metric-label">单价</div>
                      <div class="metric-value">￥{{ formatAmount(item.price) }}</div>
                    </div>
                    <div class="metric-card">
                      <div class="metric-label">数量</div>
                      <div class="metric-value">{{ item.num }} 杯</div>
                    </div>
                    <div class="metric-card metric-card-total">
                      <div class="metric-label">小计</div>
                      <div class="metric-value">￥{{ formatAmount(item.total) }}</div>
                    </div>
                    <div class="metric-card metric-card-status">
                      <div class="metric-label">状态</div>
                      <span class="status-badge" :class="getStatusClass(getOrderStatus(group))">
                        {{ getStatusLabel(getOrderStatus(group)) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="empty-inline" v-else>这笔订单暂时没有商品明细</div>
            </section>
          </article>
        </template>

        <div class="empty" v-else>
          <el-empty description="暂无符合条件的订单" />
        </div>
      </div>
    </div>
    <el-dialog
      v-model="refundDialogVisible"
      class="refund-dialog"
      width="760px"
      destroy-on-close
      :close-on-click-modal="false"
      @close="handleRefundDialogClose"
    >
      <template #header>
        <div class="refund-dialog-title">
          <div class="refund-dialog-heading">退款操作</div>
          <div class="refund-dialog-order">订单号：{{ activeRefundOrder && activeRefundOrder.id || '--' }}</div>
        </div>
      </template>

      <div class="refund-dialog-content">
        <section class="refund-summary-card">
          <div class="refund-summary-item">
            <div class="refund-summary-label">订单金额</div>
            <div class="refund-summary-value">￥{{ currentPaidAmount }}</div>
          </div>
          <div class="refund-summary-item">
            <div class="refund-summary-label">已退款金额</div>
            <div class="refund-summary-value">￥{{ currentRefundedAmount }}</div>
          </div>
          <div class="refund-summary-item">
            <div class="refund-summary-label">可退款金额</div>
            <div class="refund-summary-value refund-summary-value-danger">￥{{ currentRefundableAmount }}</div>
          </div>
        </section>

        <section class="refund-form-card">
          <div class="refund-card-title">本次退款</div>
          <div class="refund-form-grid">
            <div class="refund-form-item">
              <div class="refund-form-label">退款金额</div>
              <el-input
                v-model="refundForm.amount"
                type="number"
                placeholder="请输入退款金额"
              >
                <template #prepend>￥</template>
              </el-input>
            </div>

            <div class="refund-form-item refund-form-item-remark">
              <div class="refund-form-label">退款备注</div>
              <el-input
                v-model="refundForm.remark"
                type="textarea"
                :rows="3"
                resize="none"
                maxlength="200"
                show-word-limit
                placeholder="请输入本次退款备注"
              />
            </div>
          </div>
        </section>

        <section class="refund-history-card">
          <div class="refund-history-head">
            <div class="refund-card-title">退款详情</div>
            <div class="refund-history-tip">进入弹框后单独加载，不影响填写退款信息</div>
          </div>

          <div class="refund-history-body" v-loading="refundHistoryLoading">
            <template v-if="refundRecords.length">
              <article class="refund-record" v-for="record in refundRecords" :key="record.id">
                <div class="refund-record-top">
                  <div class="refund-record-amount">￥{{ formatAmount(record.amount) }}</div>
                  <span class="status-badge" :class="getRefundStatusClass(record.status)">
                    {{ getRefundStatusLabel(record.status) }}
                  </span>
                </div>
                <div class="refund-record-meta">
                  <span>{{ record.operator || '客服操作' }}</span>
                  <span v-if="record.time">{{ record.time }}</span>
                </div>
                <div class="refund-record-remark">{{ record.remark || '未填写退款备注' }}</div>
              </article>
            </template>

            <div v-else class="empty-inline refund-history-empty">
              {{ refundHistoryLoading ? '正在加载退款详情...' : '暂无退款详情' }}
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="refund-dialog-footer">
          <el-button @click="handleRefundDialogClose">取消</el-button>
          <el-button
            type="danger"
            :loading="refundSubmitting"
            @click="handleRefundSubmit"
          >
            确认退款
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
  
</template>

<style scoped lang="scss">
.all {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.toolbar-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 14px 16px;
  border-radius: 18px;
  color: #fff;
  box-shadow: 0 12px 24px rgba(44, 62, 80, 0.12);
}

.summary-label {
  font-size: 14px;
  opacity: 0.86;
}

.summary-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.summary-total {
  background: linear-gradient(135deg, #475569 0%, #1e293b 100%);
}

.summary-unpaid {
  background: linear-gradient(135deg, #a16207 0%, #d97706 100%);
}

.summary-making {
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
}

.summary-ready {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
}

.summary-done {
  background: linear-gradient(135deg, #166534 0%, #22c55e 100%);
}

.filters {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.filters > .filter-item:nth-of-type(3) {
  display: none;
}

.form-shell {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.form-header {
  padding: 18px 24px;
  color: #fff;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.14), transparent 24%),
    linear-gradient(135deg, #334155 0%, #475569 100%);
}

.form-title {
  font-size: 24px;
  font-weight: 700;
}

.form-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: clamp(360px, calc(100vh - 50px), 850px);
  overflow-y: auto;
  padding: 16px;
  background:
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.order-card {
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid #dbe4ef;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.order-card-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #e2e8f0;
  background:
    radial-gradient(circle at top left, rgba(148, 163, 184, 0.12), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.head-primary {
  min-width: 0;
}

.head-top {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.order-title-block {
  min-width: 0;
}

.order-no {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-all;
}

.order-time {
  margin-top: 8px;
  font-size: 14px;
  color: #64748b;
}

.head-top-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pay-method-box {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  max-width: 280px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fed7aa;
}

.pay-method-value {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pickup-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1e3a8a;
}

.pickup-label {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.8;
}

.pickup-value {
  font-size: 16px;
  font-weight: 700;
}

.compact-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.compact-overview-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid #dbe4ef;
  border-radius: 999px;
  background: #fff;
  white-space: nowrap;
}

.compact-overview-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.compact-overview-value {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.compact-overview-item-amount .compact-overview-value {
  color: #dc2626;
}

.status-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.status-cluster .status-meta:first-child {
  display: none;
}

.status-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid #dbe4ef;
  border-radius: 999px;
  background: #fff;
}

.status-meta-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
}

.order-remark-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
}

.remark-panel-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.03em;
}

.remark-panel-value {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.7;
  color: #0f172a;
  white-space: pre-wrap;
  word-break: break-word;
}

.remark-empty {
  color: #94a3b8;
}

.head-actions {
  justify-content: flex-end;
  align-self: flex-start;
  padding-top: 6px;
}

.order-card-body {
  padding: 18px 20px 20px;
}

.goods-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.03em;
}

.goods-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.goods-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.95fr);
  gap: 16px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.item-info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.item-seq {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 14px;
  font-weight: 700;
}

.item-image {
  overflow: hidden;
  width: 88px;
  height: 88px;
  flex: 0 0 88px;
  border-radius: 18px;
  background: #e2e8f0;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-text {
  min-width: 0;
}

.item-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}

.item-spec {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.55;
  color: #64748b;
  word-break: break-word;
}

.item-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-height: 88px;
  padding: 12px 14px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.metric-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  color: #0f172a;
}

.metric-card-total .metric-value {
  color: #dc2626;
}

.metric-card-status {
  align-items: flex-start;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.status-badge-large {
  min-width: 110px;
}

.status-unpaid {
  color: #92400e;
  background: #fef3c7;
}

.status-making {
  color: #1d4ed8;
  background: #dbeafe;
}

.status-ready {
  color: #0f766e;
  background: #ccfbf1;
}

.status-done {
  color: #166534;
  background: #dcfce7;
}

.status-default {
  color: #475569;
  background: #e2e8f0;
}

.refund-status-none {
  color: #475569;
  background: #e2e8f0;
}

.refund-status-pending {
  color: #92400e;
  background: #fef3c7;
}

.refund-status-failed {
  color: #b91c1c;
  background: #fee2e2;
}

.refund-status-partial {
  color: #7c3aed;
  background: #ede9fe;
}

.refund-status-done {
  color: #166534;
  background: #dcfce7;
}

.code-empty {
  color: #94a3b8;
}

.option {
  display: flex;
  align-items: center;
}

.refund-action-btn {
  border-radius: 999px;
  font-weight: 700;
  padding-left: 18px;
  padding-right: 18px;
}

.refund-dialog-title {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.refund-dialog-heading {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.refund-dialog-order {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  word-break: break-all;
}

.refund-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.refund-summary-card,
.refund-form-card,
.refund-history-card {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
}

.refund-summary-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.refund-summary-item {
  padding: 14px 16px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.refund-summary-label,
.refund-form-label {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
}

.refund-summary-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.refund-summary-value-danger {
  color: #dc2626;
}

.refund-form-card,
.refund-history-card {
  padding: 18px;
}

.refund-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.refund-form-grid {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  gap: 16px;
  margin-top: 14px;
}

.refund-form-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.refund-form-item-remark {
  min-width: 0;
}

.refund-history-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.refund-history-tip {
  font-size: 12px;
  color: #64748b;
}

.refund-history-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 140px;
  margin-top: 14px;
}

.refund-record {
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
}

.refund-record-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.refund-record-amount {
  font-size: 20px;
  font-weight: 700;
  color: #dc2626;
}

.refund-record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.refund-record-remark {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: #0f172a;
  white-space: pre-wrap;
  word-break: break-word;
}

.refund-history-empty {
  margin-top: 0;
}

.refund-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.refund-dialog .el-dialog) {
  border-radius: 24px;
  overflow: hidden;
}

:deep(.refund-dialog .el-dialog__body) {
  padding-top: 6px;
}

.head-actions .edit,
.head-actions .divider,
.head-actions .del {
  display: none;
}

.empty-inline {
  margin-top: 12px;
  padding: 18px 20px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  font-size: 14px;
}

.empty {
  padding: 72px 0;
  background: #fff;
}

@media (max-width: 1600px) {
  .goods-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1280px) {
  .order-card-head {
    grid-template-columns: 1fr;
  }

  .head-actions {
    justify-content: flex-start;
    padding-top: 0;
  }

  .compact-overview {
    justify-content: flex-start;
  }

  .status-cluster {
    justify-content: flex-start;
  }

  .item-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-list {
    height: clamp(340px, calc(100vh - 120px), 700px);
  }
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-panel {
    padding: 16px;
  }

  .form-header,
  .order-card-head,
  .order-card-body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .form-list {
    height: clamp(300px, calc(100vh), 800px);
  }

  .head-top {
    flex-direction: column;
  }

  .head-top-right {
    justify-content: flex-start;
  }

  .compact-overview {
    width: 100%;
  }

  .status-cluster {
    width: 100%;
    justify-content: flex-start;
  }

  .item-info {
    align-items: flex-start;
  }

  .item-metrics {
    grid-template-columns: 1fr;
  }

  .item-image {
    width: 76px;
    height: 76px;
    flex-basis: 76px;
  }

  .refund-summary-card,
  .refund-form-grid {
    grid-template-columns: 1fr;
  }

  .refund-form-card,
  .refund-history-card {
    padding: 14px;
  }

  .refund-history-head,
  .refund-record-top {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-height: 900px) and (min-width: 769px) {
  .all {
    gap: 14px;
  }

  .toolbar-panel {
    gap: 10px;
    padding: 14px 16px;
  }

  .summary-grid {
    gap: 10px;
  }

  .summary-card {
    padding: 12px 14px;
  }

  .summary-label {
    font-size: 13px;
  }

  .summary-value {
    margin-top: 6px;
    font-size: 24px;
  }

  .filters {
    gap: 10px;
  }

  .form-header {
    padding: 14px 18px;
  }

  .form-title {
    font-size: 20px;
  }

  .form-list {
    height: clamp(340px, calc(100vh - 0px), 880px);
  }

  .order-card-head {
    padding: 18px 20px 14px;
  }

  .order-no {
    font-size: 22px;
  }

  .order-time {
    margin-top: 6px;
  }

  .order-remark-panel {
    gap: 10px;
    margin-top: 14px;
  }

  .compact-overview-item,
  .order-remark-panel {
    padding: 12px 14px;
  }

  .compact-overview-value {
    font-size: 14px;
  }

  .remark-panel-value {
    margin-top: 6px;
    font-size: 13px;
  }

  .order-card-body {
    padding: 16px 18px 18px;
  }
}

@media (max-height: 780px) and (min-width: 769px) {
  .all {
    gap: 12px;
  }

  .toolbar-panel {
    gap: 8px;
    padding: 12px 14px;
  }

  .summary-grid {
    gap: 8px;
  }

  .summary-card {
    padding: 10px 12px;
    border-radius: 14px;
  }

  .summary-label {
    font-size: 12px;
  }

  .summary-value {
    margin-top: 5px;
    font-size: 22px;
  }

  .filter-item {
    gap: 6px;
  }

  .filter-label {
    font-size: 12px;
  }

  .form-header {
    padding: 12px 16px;
  }

  .form-title {
    font-size: 18px;
  }

  .form-list {
    height: clamp(300px, calc(100vh - 150px), 560px);
    padding: 12px;
  }

  .order-card {
    border-radius: 18px;
  }

  .order-card-head {
    gap: 14px;
    padding: 14px 16px 12px;
  }

  .order-no {
    font-size: 20px;
  }

  .order-time {
    font-size: 13px;
  }

  .pickup-box {
    padding: 6px 12px;
  }

  .pickup-value {
    font-size: 15px;
  }

  .order-remark-panel {
    gap: 8px;
    margin-top: 12px;
  }

  .compact-overview-item,
  .order-remark-panel {
    padding: 10px 12px;
    border-radius: 14px;
  }

  .compact-overview-value {
    font-size: 13px;
  }

  .remark-panel-value {
    margin-top: 5px;
    font-size: 12px;
  }

  .order-card-body {
    padding: 14px 16px 16px;
  }

  .goods-list {
    gap: 10px;
    margin-top: 10px;
  }

  .goods-row {
    gap: 12px;
    padding: 12px;
    border-radius: 16px;
  }

  .item-image {
    width: 72px;
    height: 72px;
    flex-basis: 72px;
  }

  .item-name {
    font-size: 16px;
  }

  .item-spec {
    margin-top: 6px;
    font-size: 12px;
  }

  .item-metrics {
    gap: 8px;
  }

  .metric-card {
    min-height: 72px;
    padding: 10px 12px;
    border-radius: 14px;
  }

  .metric-value {
    font-size: 16px;
  }
}

/* 笔记本高度适配：这里调整订单列表高度 */
@media (min-width: 769px) and (max-height: 900px) {
  .form-list {
    height: clamp(460px, calc(100vh - 82px), 820px);
  }
}

.order-remark-panel.order-remark-panel-empty {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}

.order-remark-panel.order-remark-panel-empty .remark-panel-label {
  flex: 0 0 auto;
}

.order-remark-panel.order-remark-panel-empty .remark-panel-value {
  flex: 1 1 auto;
  min-height: 1.4em;
  margin-top: 0;
  line-height: 1.4;
}
</style>
