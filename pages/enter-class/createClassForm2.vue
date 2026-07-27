<template>
  <view class="growth-assessment">
    <u-sticky>
      <custom-nav :needBack="true" :needBar="false" :xcxName="'创建班级'"
        navCustomStyle="background: linear-gradient(135deg, #FFF2B8 0%, #FFD778 48%, #FFB8AC 100%);height: calc(100vh / 8);" />
    </u-sticky>
    <dopamine-flow-header eyebrow="CREATE A HAPPY CLASS" title="完善班级资料" subtitle="给新班级一个好记又可爱的名字" badge="02" tone="coral" :step="2" :total-steps="2" />
    <view class="form-container">
      <text class="form-description">您正在创建班级，请填写以下信息</text>
      <u--form
        :model="formData"
        :rules="rules"
        ref="uForm"
        errorType="message"
        :borderBottom="false"
      >
        <view class="form-content">
          <view class="input-group">
            <text class="input-label">所属班级</text>
            <u-form-item prop="className" :borderBottom="false">
              <u--input
                v-model="formData.className"
                placeholder="请选择所属班级"
                border="false"
                :custom-style="{
                  ...inputStyle,
                  backgroundColor: '#EEE9FF',
                  color: '#6F6880',
                }"
                disabled
              />
            </u-form-item>
          </view>

          <view class="input-group">
            <text class="input-label">班级昵称</text>
            <u-form-item prop="nickname" :borderBottom="false">
              <u--input
                v-model="formData.nickname"
                placeholder="输入班级昵称"
                border="false"
                :custom-style="inputStyle"
              />
            </u-form-item>
          </view>

          <view class="input-group">
            <text class="input-label">昵称</text>
            <u-form-item prop="teacherName" :borderBottom="false">
              <u--input
                v-model="formData.teacherName"
                placeholder="请先在个人资料中设置昵称"
                border="false"
                :custom-style="{
                  ...inputStyle,
                  backgroundColor: '#E2F8EE',
                  color: '#5E756B',
                }"
                disabled
              />
            </u-form-item>
          </view>

          <view class="input-group">
            <text class="input-label">备注</text>
            <u-form-item prop="remark" :borderBottom="false">
              <u--input
                v-model="formData.remark"
                placeholder="请输入"
                border="false"
                :custom-style="inputStyle"
              />
            </u-form-item>
          </view>

          <u-button @click="handleSubmit" :custom-style="buttonStyle"
            >创建新班级</u-button
          >

          <text class="help-link" @click="handleHelp">遇到问题？查看帮助</text>
        </view>
      </u--form>
    </view>
    <up-overlay :show="show" :opacity="0.52">
      <view class="warp">
        <modal-box
          v-if="show"
          :className="formData.className"
          :nickname="formData.nickname"
          :teacherName="formData.teacherName"
          :remark="formData.remark"
          confirmText="立即创建"
          @cancel="show = false"
          @create="handleConfirm"
        />
      </view>
    </up-overlay>
    <dopamine-loading :show="loading" text="正在创建新班级" subtext="小芽正在搭建成长空间" />
  </view>
</template>

<script>
  // 导入modlBox组件
  import modalBox from "../../components/modalBox/modalBox";
  import DopamineFlowHeader from "./components/dopamineFlowHeader.vue";
  import DopamineLoading from "../../components/dopamine-loading/index.vue";
  export default {
    components: {
      modalBox,
      DopamineFlowHeader,
      DopamineLoading,
    },
    // 在data中修正show定义位置
    data() {
      return {
        show: false, // 移动到顶层
        loading: false,
        formData: {
          className: "",
          nickname: "",
          teacherName: "",
        },
        rules: {
          className: [
            {
              required: true,
              message: "请选择所属班级",
              trigger: ["change", "blur"],
            },
          ],
          nickname: [
            {
              required: true,
              message: "请输入班级昵称",
              trigger: ["change", "blur"],
            },
            {
              min: 2,
              max: 20,
              message: "班级昵称长度在2-20个字符之间",
              trigger: ["change", "blur"],
            },
          ],
          teacherName: [
            {
              required: true,
              message: "请先设置昵称",
              trigger: ["change", "blur"],
            },
          ],
        },
        inputStyle: {
          backgroundColor: "#FFFDF8",
          borderRadius: "24rpx",
          border: "3rpx solid #2F2854",
          padding: "26rpx 28rpx",
          fontSize: "28rpx",
          color: "#2F2854",
        },
        buttonStyle: {
          backgroundColor: "#7657F6",
          color: "#FFFFFF",
          borderRadius: "26rpx",
          border: "4rpx solid #2F2854",
          boxShadow: "7rpx 8rpx 0 #2F2854",
          fontWeight: "800",
          fontSize: "32rpx",
          padding: "26rpx 0",
          height: "48px",
          marginTop: "40rpx",
        },
      };
    },
    // 修正handleSubmit中的逻辑
    methods: {
      getRequiredClassStructure(cacheData = {}) {
        const structure = {
          section: String(cacheData.section || "").trim(),
          grade: String(cacheData.grade || "").trim(),
          class: String(cacheData.class == null ? "" : cacheData.class).trim(),
        };
        return structure.section && structure.grade && structure.class ? structure : null;
      },
      showMissingClassStructure() {
        uni.showToast({
          title: "请先选择学段、年级和班级",
          icon: "none",
        });
      },
      async handleSubmit() {
        const cacheData = uni.getStorageSync("classFormData") || {};
        if (!this.getRequiredClassStructure(cacheData)) {
          this.showMissingClassStructure();
          return;
        }
        try {
          const valid = await this.$refs.uForm.validate();
          if (valid) {
            this.updateLocalStorage();
            // 添加强制更新确保DOM刷新
            this.$nextTick(() => {
              this.show = true;
            });
          }
        } catch (error) {
          // 处理数组类型的错误对象
          const errorMessages = error?.map((e) => e.message) || ["未知错误"];
          uni.showToast({
            title: `请完善以下信息：${errorMessages.join("，")}`,
            icon: "none",
          });
        }
      }, // 注意这里需要逗号分隔

      async handleConfirm() {
        if (this.loading) return;
        const cacheData = uni.getStorageSync("classFormData") || {};
        const structure = this.getRequiredClassStructure(cacheData);
        if (!structure) {
          this.show = false;
          this.showMissingClassStructure();
          return;
        }
        this.loading = true;
        try {
          const postData = {
            year: cacheData.year || String(new Date().getFullYear()),
            grade: structure.grade,
            class: structure.class,
            nickname: this.formData.nickname,
            teacherName: this.formData.teacherName,
            remark: this.formData.remark,
            section: structure.section,
            uniIdToken: uni.getStorageSync("uni_id_token"),
          };

          // 调用云函数
          const { result } = await uniCloud.callFunction({
            name: "wtdb-business-class-create",
            data: postData,
          });

          if (result.code === 200) {
            // 第一步：缓存完整班级信息
            uni.setStorageSync("currentClass", {
              id: result.data.classId,
              code: result.data.classCode,
              year: cacheData.year || String(new Date().getFullYear()),
              section: structure.section,
              grade: structure.grade,
              class: structure.class,
              nickname: this.formData.nickname,
			  memberNickname: result.data.nickname || this.formData.teacherName,
            });

            uni.showToast({
              title: `创建成功！班级码：${result.data.classCode}`,
              icon: "none",
              duration: 3000,
            });
            uni.removeStorageSync("classFormData");
            setTimeout(() => {
              uni.reLaunch({
                url: "/pages/dashboard/teacher/teacher",
              });
            }, 1500);
          } else {
            throw new Error(result.msg);
          }
        } catch (error) {
          uni.showToast({
            title: `创建失败: ${error.errMsg || error.message}`,
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      }, // 注意这里需要逗号分隔

      updateLocalStorage() {
        const cacheData = uni.getStorageSync("classFormData") || {};
        const newData = {
          ...cacheData,
          nickname: this.formData.nickname,
          teacherName: this.formData.teacherName,
        };
        uni.setStorageSync("classFormData", newData);
      },

      handleHelp() {
        uni.navigateTo({
          url: "/pages/help/index",
        });
      },
    }, // methods结束
    watch: {
      "formData.nickname"(newVal) {
        this.updateLocalStorage();
      },
      "formData.teacherName"(newVal) {
        this.updateLocalStorage();
      },
    },
    // 删除重复的methods声明块
    onShow() {
      const cacheData = uni.getStorageSync("classFormData") || {};
      const structure = this.getRequiredClassStructure(cacheData);
      if (!structure) {
        this.formData.className = "";
        this.showMissingClassStructure();
        return;
      }
	  const accountInfo = uni.getStorageSync("uni-id-pages-userInfo") || {};
      this.formData.className = `${structure.grade}${structure.class}班`;
      this.formData.nickname = this.formData.className;
	  this.formData.teacherName = accountInfo.nickname || "";
    },
  };
</script>

<style lang="scss" scoped>
  .form-container {
    background-color: #ffffff;
    border-radius: 48rpx 48rpx 0 0;
    min-height: 80vh;
    padding: 32rpx 40rpx;
    display: flex;
    flex-direction: column;
  }

  .form-description {
    color: #3d464a;
    font-size: 24rpx;
    line-height: 1;
    margin-bottom: 32rpx;
  }

  .form-content {
    display: flex;
    flex-direction: column;
    gap: 32rpx;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  .input-label {
    color: rgba(0, 33, 77, 1);
    font-size: 32rpx;
    font-weight: 600;
    font-family: PingFang SC;
  }

  .warp {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .help-link {
    color: rgba(111, 115, 116, 1);
    font-size: 28rpx;
    text-decoration: underline;
    text-align: center;
    margin-top: 32rpx;
  }

  @import "./dopamine-flow.scss";
</style>
