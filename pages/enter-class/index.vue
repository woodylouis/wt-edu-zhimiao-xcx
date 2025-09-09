<template>
  <view class="enter-class">
    <!-- 导航 -->
    <view class="navigation">
      <view class="title" :style="xcxNameMarginTopStyle">
        {{ $t("xcxName") }}
      </view>
      <!-- banner -->
      <unicloud-db
        ref="bannerdb"
        v-slot:default="{ data, loading, error, options }"
        collection="opendb-banner"
        field="_id,bannerfile,open_url,title"
      >
        <!-- 当无banner数据时显示占位图 -->
        <image
          v-if="!(loading || data.length)"
          class="banner-image"
          src="/static/uni-center/headers.png"
          mode="aspectFill"
          :draggable="false"
        />

        <swiper
          v-else
          class="swiper-box"
          @change="changeSwiper"
          :current="current"
          indicator-dots
        >
          <swiper-item v-for="(item, index) in data" :key="item._id">
            <image
              class="banner-image"
              :src="item.bannerfile.url"
              mode="aspectFill"
              @click="clickBannerItem(item)"
              :draggable="false"
            />
            <view class="banner-mask"></view>
          </swiper-item>
        </swiper>
      </unicloud-db>
    </view>
    <view class="enter-class-option">
      <!-- <view class="option" @click="onClickButton(0)">
        <view class="title">{{ $t("enterClassMethod.create") }}</view>
        <image class="image" src="../../static/enter-class/create.svg" />
      </view> -->
      <view class="option" @click="onClickButton(1)">
        <view class="title"> {{ $t("enterClassMethod.apply") }}</view>
        <image class="image" src="../../static/enter-class/apply.svg" />
      </view>
      <view class="help-container" @click="onClickEnter">
        <text class="help-link">进入现有班级</text>
      </view>
    </view>

    <up-overlay :show="show">
      <view class="warp">
        <modal-box-mcq
          :tips="tips"
          :confirmText="confirmText"
          :list="modalOptionsList"
          @cancel="onInitModal"
          @create="onConfirm($event)"
        />
        <!-- 传递选中值 -->
      </view>
    </up-overlay>
  </view>
</template>

<script>
  // 导入modlBox组件
  import modalBoxMcq from "../../components/modalBox-MCQ";

  export default {
    components: {
      modalBoxMcq,
    },
    data() {
      return {
        current: 0,
        bannerData: [],
        bannerHeight: 0,
        titleHeight: 0,
        titleMarginTop: 0,
        menuButtonInfoStyle: "",
        sysconfigMap: {},
        xcxNameMarginTopStyle: "",
        show: false,
        modalOptionsList: ["我是老师"],
        tips: "创建班级",
        confirmText: "立即创建",
        isJoinClass: false,
      };
    },
    onLoad() {
      const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
      this.xcxNameMarginTopStyle = `top:${
        menuButtonInfo.top + menuButtonInfo.height / 2
      }px;`;
    },
    onShow() {
      // this.checkLoginStatus();
    },
    methods: {
      onClickEnter() {
        this.checkLoginStatus().then(async (valid) => {
          // 改为 async
          if (valid) {
            // 要先检查是否当前用户是否已经加入班级
            const res = await uniCloud.callFunction({
              name: "wtdb-business-member-class",
              data: {
                uniIdToken: uni.getStorageSync("uni_id_token"),
              },
            });
            if (res.result.code === 200) {
              if (res.result.data.length > 0) {
                console.log("是否有加入过任何班级", res.result.data.length > 0);
                uni.navigateTo({
                  url: "/pages/enter-class/switchClass",
                });
              } else {
                uni.showModal({
                  title: "提示",
                  content: "您还没有加入任何班级",
                  showConfirm: true,
                  showCancel: false,
                });
              }
            }
          }
        });
      },
      onInitModal() {
        this.show = false;
        this.tips = "创建班级";
        this.modalOptionsList = ["我是老师"];
        this.confirmText = "立即创建";
        this.isJoinClass = false;
      },
      async onConfirm(selectedRole) {
        const role = selectedRole === 0 ? "teacher" : "parent";
        console.log("role: ", role);
        if (selectedRole !== 0) {
          uni.showToast({
            title: "请家长敬请期待",
            duration: 2000,
            icon: "none",
          });
          return;
        }
        if (this.isJoinClass) {
          this.show = false;
          this.onInitModal();
          try {
            uni.navigateTo({
              url: `/pages/enter-class/applyClassForm1?role=${role}`,
            });
          } catch (e) {
            uni.showToast({ title: "跳转失败，请重试", icon: "none" });
          }
        } else {
          uni.navigateTo({
            url: "/pages/enter-class/createClassForm1",
          });
        }
      },
      async checkLoginStatus() {
        try {
          // 获取本地存储的登录信息
          const token = uni.getStorageSync("uni_id_token");
          const userInfo = uni.getStorageSync("uni-id-pages-userInfo");
          const tokenExpired = uni.getStorageSync("uni_id_token_expired");

          // 三重校验条件
          const isValid = token && userInfo?._id && tokenExpired > Date.now();

          if (!isValid) {
            uni.showModal({
              title: "提示",
              content: "登录才可以进入班级",
              showConfirm: true,
              confirmText: "去登录",
              showCancel: true,
              cancelText: "稍后再说",
              success: ({ confirm, cancel }) => {
                if (confirm) {
                  this.navigateToLogin();
                } else if (cancel) {
                  uni.showToast({
                    title: "您已取消登录",
                    icon: "none",
                  });
                }
              },
            });
            return false;
          }
          return true;
        } catch (e) {
          console.error("登录状态检查失败:", e);
          this.navigateToLogin();
          return false;
        }
      },
      navigateToLogin() {
        uni.navigateTo({
          url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd",
        });
      },
      onClickButton(item) {
        console.log(item);
        this.checkLoginStatus().then(async (valid) => {
          // 改为 async
          if (valid) {
            if (item === 0) {
              const res = await uniCloud.callFunction({
                name: "wt-fetch-admin-user",
              });

              if (res.result.code !== 200) {
                return uni.showModal({
                  title: "提示",
                  content: "您暂时没有权限创建班级",
                  showConfirm: true,
                  showCancel: false,
                });
              }
            }
            if (item === 1) {
              this.isJoinClass = true;
              this.tips = "加入班级";
              this.modalOptionsList = ["我是老师", "我是家长"];
              this.confirmText = "立即加入";
            }
            this.show = true;
          }
        });
      },
    },
  };
</script>

<style scoped lang="scss">
  .enter-class {
    background-color: #f2f7f6;
    height: 100vh;
  }

  .navigation {
    flex-direction: column;
    align-items: center;
    position: relative; // 新增相对定位容器
    height: calc(100vh / 3); // 添加与轮播图相同的高度

    .title {
      width: 100%;
      text-align: center;
      margin-bottom: 0; // 移除下边距
      position: absolute; // 新增绝对定位
      left: 50%; // 水平居中
      transform: translate(-50%, -50%); // 精确居中
      z-index: 1; // 确保标题在轮播图之上
    }

    .swiper-box {
      height: 100%;
      width: 100%;
      position: absolute; // 新增绝对定位
      top: 0;
      left: 0;

      .banner-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 0; // 移除圆角;
      }

      .banner-mask {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 100rpx;
        background: linear-gradient(
          to top,
          rgba(255, 255, 255, 1) 0%,
          rgba(255, 255, 255, 0) 100%
        );
        z-index: 1;
      }
    }
  }

  .enter-class-option {
    // 左右、上面分别空出40rpx
    margin: 40rpx 40rpx 0 40rpx;

    .option {
      width: calc(100vw - 80rpx);
      height: 118px;
      flex-shrink: 0;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0px 0px 1px 0px rgba(193, 197, 210, 0.2);
      margin-bottom: 32rpx;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .title {
        color: #100d40;
        font-family: "PingFang SC";
        font-size: 20px;
        font-style: normal;
        font-weight: 600;
        line-height: normal;
        margin-left: 80rpx;
        margin-right: 90rpx;
        // font-size: 28rpx;
      }

      .image {
        width: 170rpx;
        height: 170rpx;
        margin-right: 40rpx;
      }
    }
  }

  .warp {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .rect {
    width: 120px;
    height: 120px;
    background-color: #fff;
  }

  .help-container {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 58rpx;
  }

  .help-link {
    color: #6f7374;
    font-size: 32rpx;
    // text-decoration: underline;
  }
</style>
