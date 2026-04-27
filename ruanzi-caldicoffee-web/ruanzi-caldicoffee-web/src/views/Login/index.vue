<script setup>
import '@/styles/common.scss'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import request from '@/utils/http'

// 1. 准备表单对象
const form = ref({
  account: '',
  password: '',
})
// 2. 准备规则对象
const rules = {
  account: [
    { required: true, message: '用户名不能为空', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { min: 6, max: 14, message: '密码长度为6-14个字符', trigger: 'blur' },
  ],
}
// 3. 获取form实例做统一校验
const router = useRouter()
const isLoading = ref(false)
const formRef = ref(null)
const doLogin = () => {
  isLoading.value = true
  const { account, password } = form.value
  // 调用实例方法
  formRef.value.validate(async (valid) => {
    if (valid) {
      const res = await request({
        url: '/jy/go/phone.aspx?mbid=10625&ituid=106',
        method: 'POST',
        data: { name: account, pwd: password }
      })
      if(res.code === '0'){
        console.log('登录成功返回数据：', res)
        ElMessage({ type: 'success', message: '登录成功' })
        localStorage.setItem('username',res.username)
        localStorage.setItem('itsid',res.data)
        localStorage.setItem('unitid',res.unitid)
        router.replace({ path: '/layout/order' })
        isLoading.value = false
      } else {
        ElMessage({ type: 'error', message: res.desc })
        isLoading.value = false
      }
    }
    else {
      ElMessage({ type: 'error', message: '请输入正确的账号密码' })
      isLoading.value = false
      return
    }
  })
}

</script>

<template>
  <div class="all">
    <div class="login-form">
      <div class="login-form-container" v-loading="isLoading">
        <div class="title">登录</div>
        <el-form class="form" ref="formRef" :model="form" :rules="rules" label-position="right" label-width="60px" status-icon>
          <el-form-item prop="account" label="账号" label-position="top">
            <el-input v-model="form.account" />
          </el-form-item>
          <el-form-item prop="password" label="密码" label-position="top">
            <el-input v-model="form.password" type="password" />
          </el-form-item>
          <el-button type="primary" @click="doLogin" size="large" style="width: 358px; margin-top: 30px;">点击登录</el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.all{
  width: 100%;
  height: 100%;
  background-image: linear-gradient(to right, #fbc2d3, #a6eedc);
  // background-color: rgb(245, 245, 245);
  .login-form{
    padding: 15px;
    width: 458px;
    height: 558px;
    background-color: #fff;
    border-radius: 15px;
    position: relative;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    .login-form-container{
      width: 100%;
      height: 100%;
      .title{
        margin-bottom: 20px;
        font-size: 38px;
        font-weight: bold;
        line-height: 160px;
        text-align: center;
      }
      .form{
        width: 358px;
        margin: 0 auto;
      }
    }
  }
}
</style>
