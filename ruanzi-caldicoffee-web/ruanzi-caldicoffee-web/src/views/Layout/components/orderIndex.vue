<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/http'
import { ElMessage, ElMessageBox } from 'element-plus'

// const BASERUL = 'https://www.caldicoffee.com'
const BASERUL = 'https://www.caldicoffee.com.cn'

const handleCount = (index, value) => {
  if(value < 1){
    orderList.value.splice(index, 1)
    localStorage.setItem('orderList', JSON.stringify(orderList.value))
    elMessage('success', '删除成功！')
    return
  }
}

const router = useRouter()
const index = ref(1)
const handleChange = (value) => {
  specList.value = []
  chooseSpecList.value = {}
  tempDetail.value = {}
  tempnum.value = 1
  isShowDetail.value = false
  isLoading.value = false
  index.value = value
  router.push({
    path: '/layout/order',
    query: {
      index: value
    }
  })
}
onMounted(() => {
  handleChange(Number(router.currentRoute.value.query.index) || 1)
  getCoffeeList()
})

const coffeeList = ref([])
const getCoffeeList = async () => {
  isLoading.value = true
  const res = await request({
    url: '/jy/go/we.aspx?ituid=106&itjid=5035&itcid=5035&id=01',
    method: 'GET'
  })
  isLoading.value = false
  coffeeList.value = res.result.goods
  // coffeeList.value = res.result.goods
  // tempList.value = res.result.goods
  // coffeeList.value[0].children = [...coffeeList.value[0].children , ...tempList.value[0].children]
  // coffeeList.value[0].children = [...coffeeList.value[0].children , ...tempList.value[0].children]
}

const isShowDetail = ref(false)
const tempDetail = ref({})
const specList = ref([])
const chooseSpecList = ref({})
const skuList = ref([])
const targetSku = ref({})
// SKU 组件逻辑
const handleShowDetail = async (i, img) => {
  isShowDetail.value = true
  isLoading.value = true
  targetSku.value = {}
  const res = await request.get(`/jy/go/we.aspx?ituid=106&itjid=10638&itcid=10638&keyvalue=${i}&itsid=${localStorage.getItem('itsid')}`)
  // 👇 新增：打印完整响应以便调试
  console.log('完整响应对象22222222222:', res);
  console.log('res.result 是否存在:3333333333333333', res.result);
   // 👇 核心修改：只打印解构的7个字段，格式清晰
  console.log('========== 商品详情核心字段 ==========');
  // 直接从res.result中打印指定字段
  console.log('id：', res.result.id);
  console.log('mainPictures（商品主图）：', res.result.mainPictures);
  console.log('specs（规格定义）：', res.result.specs);
  console.log('skus（SKU列表）：', res.result.skus);
  console.log('price（基础单价）：', res.result.price);
  console.log('oldPrice（划线原价）：', res.result.oldPrice);
  console.log('name（商品名称）：', res.result.name);
  // 👇 原有解构逻辑不变
  const {
    id,
    mainPictures,
    specs,
    skus,
    price,
    oldPrice,
    name
  } = res.result
  tempDetail.value = {
    id,
    name,
    image: mainPictures[0],
    price,
    oldPrice,
    img,
  }
  // SKU 组件逻辑
  specList.value = specs.map(spec => ({
    name: spec.name,
    list: spec.values.map(value => ({
      name: value.name,
    }))
  }))
  for (let i = 0; i < specs.length; i++) {
    chooseSpecList.value[`vm${i}`] = ''
  }
  skuList.value = skus.map(sku => {
    // 将 SKU 的规格转换为 {规格名: 值} 的映射
    const specMap = {};
    sku.specs.forEach(spec => {
      specMap[spec.name] = spec.valueName;
    })

    return {
      _id: sku.id,
      goods_id: res.result.id,
      image: sku.picture || mainPictures[0],
      price: Math.round(sku.price * 100),
      oldPrice: Math.round(sku.oldPrice * 100),
      skuCode: sku.skuCode,
      sku_name_arr: specs.map(spec => specMap[spec.name]), // 关键修改
      stock: sku.inventory,
      rawSpecs: sku.specs // 保留原始数据用于调试
    }
  })
  isLoading.value = false
}
const isSpecOptionDisabled = (specIndex, optionName) => {
  return !skuList.value.some(sku => {
    return sku.sku_name_arr.every((value, index) => {
      if (index === specIndex) {
        return value === optionName
      }

      const selectedValue = chooseSpecList.value[`vm${index}`]
      return !selectedValue || value === selectedValue
    })
  })
}

const handleChangeRadio = (e) => {
  // 匹配 SKU 列表中的 SKU
  const matchedSku = skuList.value.find(sku => {
    return sku.sku_name_arr.every((value, index) => {
      return value === chooseSpecList.value[`vm${index}`]
    })
  })
  targetSku.value = matchedSku
  if (matchedSku) {
    tempDetail.value = {
      ...tempDetail.value,
      price: matchedSku.price / 100 * tempnum.value,
      oldPrice: matchedSku.oldPrice / 100 * tempnum.value,
    }
  }
}


const tempnum = ref(1)
const handleTempCount = (value) => {
  handleChangeRadio()
  tempnum.value = value
}
const goBackList = () => {
  isShowDetail.value = false
  specList.value = []
  chooseSpecList.value = {}
  tempDetail.value = {}
  tempnum.value = 1
  targetSku.value = {}
}
const orderList = ref([])
orderList.value = JSON.parse(localStorage.getItem('orderList')) || []
const handleAddCart = () => {
  if ( Object.values(specList.value).filter((item) => item.name !== '').length !==
    Object.values(chooseSpecList.value).filter((item) => item!== '').length ) {
    elMessage('warning', '请选择商品规格')
    return
  }
  if (!targetSku.value?.skuCode) {
    elMessage('warning', '当前规格组合不可售，请重新选择')
    return
  }
  const obj = {
    // img: tempDetail.value.image,
    ...targetSku.value,
    name: tempDetail.value.name,
    img: tempDetail.value.img,
    num: tempnum.value,
  }
  let flag = true
  if(orderList.value.length > 0){
    orderList.value.forEach(item => {
      if(item.skuCode === obj.skuCode){
        item.num += obj.num
        flag = false
        return
      }
    })
  }
  if(flag){
    orderList.value.push(obj)
  }
  localStorage.setItem('orderList', JSON.stringify(orderList.value))
  goBackList()
  elMessage('success', '加入购物车成功')
}
const clearCart = () => {
  orderList.value = []
  localStorage.removeItem('orderList')
  elMessage('success', '清空购物车成功')
}

const sumPrice = computed(() => {
  let sum = 0
  orderList.value.forEach(item => {
    sum += item.num * item.price
  })
  return sum / 100
})

const goodsTotalCount = computed(() => {
  return orderList.value.reduce((total, item) => {
    return total + Number(item.num || 0)
  }, 0)
})

const discountValue = ref('')
const appliedDiscount = ref(100)

const finalPrice = computed(() => {
  const total = sumPrice.value
  return Number((total * appliedDiscount.value / 100).toFixed(2))
})

const handleDiscountConfirm = () => {
  if (orderList.value.length === 0) {
    elMessage('warning', '购物车为空，无法使用折扣')
    return
  }

  const val = Number(discountValue.value)

  if (!discountValue.value) {
    elMessage('warning', '请输入折扣百分比')
    return
  }

  if (Number.isNaN(val) || val <= 0 || val > 100) {
    elMessage('warning', '折扣百分比请输入 1 到 100 之间的数字，例如 70 表示 7 折')
    return
  }

  appliedDiscount.value = val
  elMessage('success', `已应用 ${val}% 折扣（${Number((val / 10).toFixed(1))}折）`)
}

const resetDiscount = () => {
  discountValue.value = ''
  appliedDiscount.value = 100
  elMessage('success', '已恢复原价')
}

const elMessage = (type, message) => {
  ElMessage({
    message,
    type,
  })
}

const isCalcLoading = ref(false)
const isJiesuanFlag = ref(false)
const handleCalc = async () => {
  if (orderList.value.length === 0) {
    elMessage('error', '购物车为空，无法进行结算！')
    return
  }
  // 清空购物车
  await request.post(`/jy/go/phone.aspx?mbid=10627&ituid=106&itsid=${localStorage.getItem('itsid')}`)
  isJiesuanFlag.value = true
  isCalcLoading.value = true
  let foreachOver = ref(0)
  orderList.value.forEach(async item => {
    const res = await request({
      url: `/jy/go/phone.aspx?mbid=10604&ituid=106&itsid=${localStorage.getItem('itsid')}`,
      method: 'POST',
      data: {
        MCODE: item.skuCode,
        NUM: item.num,
        SHOPID: Number(localStorage.getItem('unitid')),
        img: item.img,
        add: item.sku_name_arr.join(',')
      }
    })
    foreachOver.value ++
    if(foreachOver.value === orderList.value.length){
      isCalcLoading.value = false
      elMessage('success', '结算成功')
    }
  })
}
const zfAMT = ref()
const zfORDERID = ref()
const zfBRACODE = ref('')
const payDialogVisible = ref(false)
const isPaySubmitting = ref(false)
const inputRef = ref(null)

const normalizeBarcode = (value = '') => {
  return String(value).replace(/\s+/g, '').trim()
}

const resetPayDialogState = () => {
  zfBRACODE.value = ''
  isPaySubmitting.value = false
}

const focusBarcodeInput = () => {
  nextTick(() => {
    setTimeout(() => {
      const nativeInput = inputRef.value?.input || inputRef.value?.$el?.querySelector('input')
      if (nativeInput) {
        nativeInput.focus()
        nativeInput.select?.()
      }
    }, 80)
  })
}

const handleBarcodeInput = (value) => {
  zfBRACODE.value = normalizeBarcode(value)
}

const handlePay = async () => {
  if (orderList.value.length === 0) {
    elMessage('error', '购物车为空，无法进行支付！')
    return
  }
  if (!isJiesuanFlag.value) {
    elMessage('error', '请先结算！')
    return
  }

  isCalcLoading.value = true

  try {
    // 计算折扣后的总价（单位：分）
    const payAmount = Math.round(finalPrice.value * 100)

    // 清空本地购物车
    orderList.value = []

    // 调用支付接口，将折扣后的总价传给后端
    const res = await request({
      url: `/jy/go/phone.aspx?mbid=10650&ituid=106&itsid=${localStorage.getItem('itsid')}`,
      method: 'POST',
      data: {
        MCODE: '',
        OPID: '1000',
        UNITID: Number(localStorage.getItem('unitid')),
        NUM: '',
        USERID: '0',
        NOTE: '',
        AMT: payAmount, // ✅  折扣后的总价传给后端
        DISCOUNT: appliedDiscount.value,//折扣
      }
    })

    // 重置结算状态
    isJiesuanFlag.value = false
    isCalcLoading.value = false
    localStorage.removeItem('orderList')

    // 弹出支付弹窗，展示金额和订单号
    resetPayDialogState()
    zfAMT.value = payAmount
    zfORDERID.value = res.orderid
    payDialogVisible.value = true

  } catch (error) {
    isCalcLoading.value = false
    elMessage('error', '支付失败，请稍后重试！')
    console.error('支付接口异常：', error)
  }
}

const handleClose = (done) => {
  if (isPaySubmitting.value) {
    return
  }

  resetPayDialogState()
  done()
}

const handleDialogOpened = () => {
  resetPayDialogState()
  focusBarcodeInput()
}

const fetchQRCpay = async () => {
  const barcode = normalizeBarcode(zfBRACODE.value)
  zfBRACODE.value = barcode

  if (barcode === '') {
    elMessage('error', '请扫描收款码！')
    focusBarcodeInput()
    return
  }

  if (isPaySubmitting.value) {
    return
  }

  isPaySubmitting.value = true

  try {
    const res = await request({
      url: `/jy/go/phone.aspx?mbid=113&ituid=106&itsid=${localStorage.getItem('itsid')}`,
      method: 'POST',
      data: {
        XXSQ: "SQB",
        BARCODE: barcode,
        ORDERID: zfORDERID.value,
        // ORDERID: zfBRACODE.value,
        AMT: zfAMT.value,
      }
    })

    if (res.result === 'PAY_SUCCESS') {
      elMessage('success', '支付成功')
      resetPayDialogState()
      payDialogVisible.value = false
      return
    }

    elMessage('error', '支付失败，请检查收款码是否正确！')
    zfBRACODE.value = ''
    focusBarcodeInput()
  } catch (error) {
    elMessage('error', '支付失败，请稍后重试！')
    console.error('扫码支付接口异常：', error)
    zfBRACODE.value = ''
    focusBarcodeInput()
  } finally {
    isPaySubmitting.value = false
  }
}

const cancelPay = () => {
  if (isPaySubmitting.value) {
    return
  }

  ElMessage({
    type: 'success',
    message: '取消支付成功！',
  })
  resetPayDialogState()
  payDialogVisible.value = false
}


const isHidden = computed(() => {
  return orderList.value.length === 0
})

const isLoading = ref(false)
</script>

<template>
  <div class="order">
    <!-- 左边分类部分 -->
    <div class="left">
      <div class="title">分类</div>
      <div class="item-list">
        <div class="item"
          v-for="(item, idx) in coffeeList"
          @click="handleChange(idx + 1)"
          :class="index === (idx + 1) ? 'item-active' : '' "
        >
          {{ item.text }}
        </div>
      </div>
    </div>
    <!-- 中间商品部分 -->
    <div class="middle">
      <div class="head">{{ coffeeList[index-1]?.text }}</div>
      <el-divider style="width: 92%; margin: 0 auto;"/>
      <div class="search">
        <div class="icon">
          <img src="/src/assets/images/search.png" alt="">
        </div>
        <div class="inp">
          <input type="text"
            style="
              background-color: rgb(245, 245, 245);
              height: 50px; border: none;
              width: 800px;
              font-size: 20px;
              border: 0px;
              outline: none;
            "
            placeholder="请输入会员号"
          >
        </div>
      </div>
      <div class="goods-list" v-loading="isLoading" v-if="!isShowDetail">
        <div class="goods-item"
          v-for="i in coffeeList[index-1]?.children"
          @click="handleShowDetail(i.id, i.image)"
        >
          <div class="pic">
            <img :src="`${BASERUL}/jy/wxUserImg/106/${i.image}`" alt="">
          </div>
          <div class="txt">
            <div class="left-txt">{{ i.name }}</div>
            <div class="right-txt">￥{{ i.price }}</div>
          </div>
        </div>
      </div>
      <div class="goods-detail" v-loading="isLoading" v-else>
        <div class="goods-detail-btn">
          <el-button type="primary" @click="goBackList">返回</el-button>
        </div>
        <div class="goods-detail-body">
          <div class="goods-detail-left">
            <div class="image">
              <img :src="`${tempDetail.image}`" alt="">
            </div>
          </div>
          <div class="goods-detail-right">
            <div class="title">{{ tempDetail.name }}</div>
            <div class="goods-item" v-for="(item, index) in specList">
              <div class="txt">{{ item.name }}：</div>
              <div class="choose" v-for="i in item.list">
                <el-radio-group @change="handleChangeRadio" v-model="chooseSpecList[`vm${index}`]" size="default">
                  <el-radio-button
                    :label="i.name"
                    :value="i.name"
                    :disabled="isSpecOptionDisabled(index, i.name)"
                  />
                </el-radio-group>
              </div>
            </div>
            <div class="goods-item">
              <div class="txt">数量：</div>
              <div class="choose">
                <el-input-number
                  v-model="tempnum"
                  :min="1"
                  :max="100"
                  @change="handleTempCount"
                  size="default"
                  style="width: 140px;"
                />
              </div>
            </div>
            <div class="goods-item">
              <div class="txt">价格：</div>
              <div class="price">￥{{ tempDetail.price }}</div>
              <div class="old-price">￥{{ tempDetail.oldPrice }}</div>
            </div>
            <div class="btn">
              <el-button
                size="large"
                type="primary"
                @click="handleAddCart"
              >
                加入购物车
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 右边部分 -->
    <div class="right">
      <div class="right-top">
        <div class="head">
          <div class="head-left">当前购物车</div>
          <div class="head-right" @click="clearCart">
            全部清除
            <img src="/src/assets/images/delete.png" alt="">
          </div>
        </div>
        <el-divider style="width: 92%; margin: 0 auto;"/>
        <div class="body">
          <div class="empty" v-show="isHidden">
            <el-empty description="暂时没有商品" />
          </div>
          <div class="body-item" v-for="(i, index) in orderList">
            <div class="item-left">
              <img :src="`${i?.image}`" alt="">
            </div>
            <div class="item-middle">
              <div class="top">{{ i?.name }}</div>
              <div class="desc">规格：<text v-for="j in i?.sku_name_arr">{{ j }}；</text></div>
              <div class="bottom">
                <div class="price">￥{{i?.price / 100}}</div>
                <div class="old-price">￥{{i?.oldPrice / 100}}</div>
              </div>
            </div>
            <div class="item-right">
              <el-input-number
                v-model="i.num"
                :min="0"
                :max="100"
                @change="handleCount(index, i.num)"
                size="small"
                style="width: 75px;"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="right-middle">
        <div class="body">
          <div class="body-item">
            <div class="info-stat">
              <span class="item-left">商品类别</span>
              <span class="item-right">{{ orderList.length }}</span>
            </div>
            <div class="info-stat">
              <span class="item-left">商品数量</span>
              <span class="item-right">{{ goodsTotalCount }}</span>
            </div>
          </div>

          <el-divider style="width: 92%; margin: 10px auto;"/>
        </div>
        <div class="bottom">
          <div class="bottom-sum">
            <div class="sum-left">
              <span class="sum-label">合计</span>
              <div class="sum-price-box">
                <span class="sum-unit">￥</span>
                <span class="sum-right">{{ finalPrice }}</span>
              </div>
              <div v-if="appliedDiscount < 100" class="origin-price">
                原价：￥{{ sumPrice }}
              </div>
            </div>

            <div class="sum-operate">
              <div class="discount-label">折扣</div>
              <div class="discount-controls">
                <el-input
                  v-model="discountValue"
                  placeholder="如70=7折"
                  size="small"
                  class="discount-input"
                  @keyup.enter="handleDiscountConfirm"
                />
                <span class="discount-text">%</span>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="handleDiscountConfirm"
                >
                  确定
                </el-button>
                <el-button
                  size="small"
                  type="info"
                  plain
                  @click="resetDiscount"
                >
                  取消
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="right-bottom" v-loading="isCalcLoading">
        <div class="title">
          <div class="txt">收银操作流程</div>
        </div>
        <div class="pay-way">
          <div class="item">
            <img src="/src/assets/images/tijiao.png" alt="">
            <el-button class="step-button" type="primary" @click="handleCalc">
              <span class="step-number">1</span>
              提交订单
            </el-button>
          </div>
          <div class="item">
            <img src="/src/assets/images/saoma.png" alt="">
            <el-button class="step-button" type="primary" @click="handlePay">
              <span class="step-number">2</span>
              扫码支付
            </el-button>
            <!-- <el-button plain @click="payDialogVisible = true">Click to open Message Box</el-button> -->
          </div>
        </div>
      </div>
    </div>
    <el-dialog
      v-model="payDialogVisible"
      title="等待支付中"
      width="500"
      :before-close="handleClose"
      :close-on-click-modal="!isPaySubmitting"
      :close-on-press-escape="!isPaySubmitting"
      :show-close="!isPaySubmitting"
      @opened="handleDialogOpened"
    >
      订单金额：￥{{ zfAMT/100 }}<br><br>
      <el-input
        ref="inputRef"
        v-model="zfBRACODE"
        style="width: 360px"
        placeholder="请扫描付款码"
        :disabled="isPaySubmitting"
        autocomplete="off"
        @input="handleBarcodeInput"
        @keyup.enter="fetchQRCpay"
      />
      <template #footer>
        <div class="dialog-footer">
          <el-button :disabled="isPaySubmitting" @click="cancelPay">取消</el-button>
          <el-button type="primary" :loading="isPaySubmitting" @click="fetchQRCpay">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.order{
  position: absolute;
  width: 200px;
  height: 860px;
  border-radius: 10px;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
  // 左边分类部分
  .left{
    .title{
      margin: 20px 0;
      text-align: center;
      font-size: 26px;
      font-weight: 600;
    }
    .item-list{
      height: 780px;
      overflow-y: auto;
      .item{
        cursor: pointer;
        text-align: center;
        font-size: 24px;
        height: 70px;
        line-height: 70px;
        width: 100%;
        &:hover{
          background-color: rgb(245, 245, 245);
        }
        &.item-active{
          background-color: rgb(229, 229, 229);
        }
      }
    }
  }
  // 中间商品部分
  .middle{
    position: absolute;
    width: 1060px;
    height: 860px;
    left: 220px;
    top: 0;
    border-radius: 10px;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
    .head{
      height: 68px;
      text-align: center;
      font-size: 30px;
      font-weight: 600;
      line-height: 68px;
    }
    .search{
      display: flex;
      align-items: center;
      height: 50px;
      width: 92%;
      margin: 0 auto;
      margin-top: 18px;
      background-color: rgb(245, 245, 245);
      border-radius: 60px;
      margin-bottom: 20px;
      .icon{
        width: 40px;
        height: 40px;
        margin-left: 40px;
        img{
          width: 100%;
          height: 100%;
        }
      }
      .inp{
        margin-left: 20px;
      }
    }
    .goods-list{
      height: 680px;
      width: 970px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      align-content: flex-start;
      gap: 26px 24px;
      overflow-y: auto;
      .goods-item{
        width: 100%;
        height: 285px;
        box-sizing: border-box;
        padding: 0 6px;
        transition: transform 0.2s;
        .pic{
          width: 205px;
          height: 205px;
          margin: 0 auto;
          border-radius: 8px;
          overflow: hidden;
          img{
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }
        .txt{
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-top: 8px;
          line-height: 1.28;
          .left-txt{
            flex: 1;
            min-width: 0;
            font-size: 20px;
            font-weight: 600;
            display: -webkit-box;
            overflow: hidden;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          .right-txt{
            flex-shrink: 0;
            font-size: 22px;
            font-weight: 700;
            color: red;
          }
        }
        &:hover{
          cursor: pointer;
          transform: scale(0.98);
        }
      }
    }
    .goods-detail{
      .goods-detail-btn{
        margin: 30px 0 30px 50px;
        :deep(.el-button){
          font-size: 18px;
          font-weight: 600;
          padding: 12px 24px;
        }
      }
      .goods-detail-body{
        display: flex;
        .goods-detail-left{
          width: 400px;
          .image{
            margin: 0 auto;
            width: 360px;
            height: 360px;
            border-radius: 10px;
            overflow: hidden;
            img{
              width: 100%;
              height: 100%;
            }
          }
        }
        .goods-detail-right{
          width: 660px;
          img{
            max-width: 180px;
            max-height: 180px;
          }
          .title{
            margin-top: 20px;
            margin-left: 50px;
            font-size: 40px;
            font-weight: 600;
            line-height: 1.35;
          }
          .goods-item{
            margin-top: 30px;
            margin-left: 50px;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            .txt{
              font-size: 32px;
              line-height: 1.4;
            }
            .choose{
              :deep(.el-radio-button__inner){
                font-size: 22px;
                padding: 14px 24px;
              }
              :deep(.el-radio-button.is-disabled .el-radio-button__inner){
                color: #b6bcc6;
                background-color: #f1f3f5;
                border-color: #d8dde4;
                cursor: not-allowed;
              }
              :deep(.el-input__inner){
                font-size: 22px;
              }
              :deep(.el-input-number__increase),
              :deep(.el-input-number__decrease){
                font-size: 22px;
              }
            }
            .price{
              font-size: 38px;
              font-weight: 600;
              color: red;
            }
            .old-price{
              font-size: 24px;
              color: gray;
              text-decoration: line-through;
              margin-left: 10px;
            }
          }
          .btn{
            margin-top: 30px;
            margin-left: 50px;
            :deep(.el-button){
              font-size: 24px;
              font-weight: 600;
              padding: 18px 38px;
            }
          }
        }
      }
    }
  }
  // 右边部分
  .right{
    position: absolute;
    width: 420px;
    height: 860px;
    left: 1320px;
    top: 0;
    .right-top{
      width: 100%;
      height: 430px;
      border-radius: 10px;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
      margin-bottom: 20px;
      .head{
        display: flex;
        justify-content: space-between;
        align-items: center;
        .head-left{
          margin: 20px;
          font-size: 22px;
          font-weight: 600;
        }
        .head-right{
          cursor: pointer;
          margin: 20px;
          font-size: 16px;
          color: red;
          display: flex;
          align-items: center;
          img{
            margin-left: 5px;
            width: 20px;
            height: 20px;
          }
          &:hover{
            color: rgb(186, 0, 0);
          }
        }
      }
      .body{
        height: 340px;
        overflow-y: auto;
        .body-item{
          display: flex;
          width: 92%;
          margin: 10px auto;
          .item-left{
            margin-left: 5px;
            width: 80px;
            height: 80px;
            border-radius: 10px;
            overflow: hidden;
            img{
              width: 100%;
              height: 100%;
            }
          }
          .item-middle{
            width: 190px;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            margin-left: 10px;
            font-weight: 600;
            .top{
              font-style: 30px;
              margin-top: 5px;
            }
            .desc{
              font-size: 14px;
              font-weight: normal;
              color: gray;
            }
            .bottom{
              margin-bottom: 5px;
              display: flex;
              align-items: center;
              .price {
                font-size: 20px;
                font-weight: normal;
                color: red;
              }
              .old-price{
                margin-left: 10px;
                font-weight: normal;
                color: gray;
                text-decoration: line-through;
              }
            }
          }
          .item-right{
            margin: auto;
            margin-left: 10px;
          }
        }
      }
    }
    .right-middle {
      width: 100%;
      height: 200px;
      box-sizing: border-box;
      padding-top: 16px;
      border-radius: 10px;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
      margin-bottom: 20px;
      .body {
        .body-item {
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
          .info-stat {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .item-left {
            font-size: 22px;
          }
          .item-right {
            color: red;
            font-size: 24px;
            font-weight: 600;
          }
        }
      }
      .bottom {
        flex: 0 0 auto; // 固定底部高度
        padding: 0 0 10px; // 添加内边距
        .bottom-sum {
          display: flex;
          justify-content: space-between;
          align-items: flex-start; // 垂直对齐
          font-size: 28px;
          .sum-left {
            margin-left: 0;
          }
          .sum-right {
            margin-right: 0;
            color: red;
            font-weight: 700;
          }
        }
      }
    }
    .right-bottom{
      width: 100%;
      height: 190px;
      border-radius: 10px;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
      .title{
        border: 1px solid rgba(0, 0, 0, 0);
        height: 48px;
        display: flex;
        align-items: center;
        font-size: 24px;
        font-weight: 600;
        .txt{
          margin: 0 0 0 20px;
        }
      }
      .pay-way{
        display: flex;
        justify-content: space-around;
        align-items: center;
        width: 100%;
        height: 130px;
        .item{
          display: flex;
          flex-direction: column;
          align-items: center;
          img{
            margin-bottom: 12px;
            width: 64px;
            height: 64px;
          }
          .step-button{
            height: 40px;
            min-width: 142px;
            font-size: 18px;
            font-weight: 600;
          }
          .step-number{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            margin-right: 8px;
            border: 2px solid currentColor;
            border-radius: 50%;
            font-size: 15px;
            font-weight: 800;
            line-height: 1;
          }
        }
      }
    }
  }
}

.bottom-sum {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 0 18px;

  .sum-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex: 1;
    min-width: 0;
  }

  .sum-label {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 8px;
    border-radius: 4px;
    background-color: #f3f4f6;
    font-size: 18px;
    font-weight: 600;
    color: #4b5563;
    margin-bottom: 6px;
  }

  .sum-price-box {
    display: flex;
    align-items: baseline;
  }

  .sum-unit {
    font-size: 28px;
    color: red;
    font-weight: 700;
    margin-right: 2px;
  }

  .sum-right {
    color: red;
    font-weight: 700;
    font-size: 40px;
    line-height: 1;
  }

  .origin-price {
    font-size: 16px;
    color: gray;
    text-decoration: line-through;
    margin-top: 7px;
  }

  .sum-operate {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex-shrink: 0;
    width: 216px;
    gap: 6px;
  }

  .discount-label {
    font-size: 16px;
    font-weight: 600;
    color: #4b5563;
  }

  .discount-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
  }

  .discount-input {
    width: 84px;
    flex: 0 0 84px;

    :deep(.el-input__inner) {
      font-size: 16px;
    }
  }

  :deep(.el-button) {
    height: 30px;
    padding: 6px 7px;
    font-size: 15px;
    margin-left: 0;
  }

  .discount-text {
    font-size: 20px;
    font-weight: 600;
    color: #4b5563;
  }
}
</style>
