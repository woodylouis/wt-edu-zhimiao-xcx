<!-- 用户资料页 -->
<template>
  <view class="uni-content">
    <view class="avatar">
      <uni-id-pages-avatar width="260rpx" height="260rpx"></uni-id-pages-avatar>
    </view>
    <uni-list>
      <uni-list-item
        class="item"
        @click="setNickname('')"
        title="昵称"
        :rightText="userInfo.nickname || '未设置'"
        link
      >
      </uni-list-item>
      <uni-list-item
        class="item"
        @click="editBusinessName"
        title="业务姓名"
        :rightText="businessNameLoading ? '加载中...' : businessDisplayName"
        note="用于班级、审批和评估报告"
        link
      >
      </uni-list-item>
      <uni-list-item
        class="item"
        @click="bindMobile"
        title="手机号"
        :rightText="userInfo.mobile || '未绑定'"
        link
      >
      </uni-list-item>
      <uni-list-item
        v-if="userInfo.email"
        class="item"
        title="电子邮箱"
        :rightText="userInfo.email"
      >
      </uni-list-item>
      <!-- #ifdef APP -->
      <!-- 如未开通实人认证服务，可以将实名认证入口注释 -->
      <uni-list-item
        class="item"
        @click="realNameVerify"
        title="实名认证"
        :rightText="realNameStatus !== 2 ? '未认证' : '已认证'"
        link
      >
      </uni-list-item>
      <!-- #endif -->
      <uni-list-item
        v-if="hasPwd"
        class="item"
        @click="changePassword"
        title="修改密码"
        link
      >
      </uni-list-item>
    </uni-list>
    <!-- #ifndef MP -->
    <uni-list class="mt10">
      <uni-list-item
        @click="deactivate"
        title="注销账号"
        link="navigateTo"
      ></uni-list-item>
    </uni-list>
    <!-- #endif -->
    <uni-popup ref="dialog" type="dialog">
      <uni-popup-dialog
        mode="input"
        :value="userInfo.nickname"
        @confirm="setNickname"
        :inputType="setNicknameIng ? 'nickname' : 'text'"
        title="设置昵称"
        placeholder="请输入要设置的昵称"
      >
      </uni-popup-dialog>
    </uni-popup>
    <uni-popup ref="businessNameDialog" type="dialog">
      <uni-popup-dialog
        mode="input"
        :value="businessProfile.displayName"
        @confirm="saveBusinessName"
        title="设置业务姓名"
        placeholder="请输入1-10个字的姓名"
        :maxlength="10"
      >
      </uni-popup-dialog>
    </uni-popup>
    <uni-id-pages-bind-mobile
      ref="bind-mobile-by-sms"
      @success="bindMobileSuccess"
    ></uni-id-pages-bind-mobile>
    <template v-if="showLoginManage">
      <button v-if="userInfo._id" @click="logout">退出登录</button>
      <button v-else @click="login">去登录</button>
    </template>
  </view>
</template>
<script>
  const uniIdCo = uniCloud.importObject("uni-id-co");
  import { store, mutations } from "@/uni_modules/uni-id-pages/common/store.js";
  export default {
    computed: {
      userInfo() {
        return store.userInfo;
      },
      realNameStatus() {
        if (!this.userInfo.realNameAuth) {
          return 0;
        }

        return this.userInfo.realNameAuth.authStatus;
      },
      businessDisplayName() {
        return (
          this.businessProfile.displayName ||
          this.userInfo.nickname ||
          this.userInfo.username ||
          "未设置"
        );
      },
    },
    data() {
      return {
        univerifyStyle: {
          authButton: {
            title: "本机号码一键绑定", // 授权按钮文案
          },
          otherLoginButton: {
            title: "其他号码绑定",
          },
        },
        // userInfo: {
        // 	mobile:'',
        // 	nickname:''
        // },
        hasPwd: false,
        showLoginManage: false, //通过页面传参隐藏登录&退出登录按钮
        setNicknameIng: false,
        businessProfile: {
          personId: "",
          displayName: "",
          nameConfirmed: false,
        },
        businessNameLoading: false,
        businessNameSaving: false,
      };
    },
    async onShow() {
      this.univerifyStyle.authButton.title = "本机号码一键绑定";
      this.univerifyStyle.otherLoginButton.title = "其他号码绑定";
      await this.loadBusinessProfile();
    },
    async onLoad(e) {
      if (e.showLoginManage) {
        this.showLoginManage = true; //通过页面传参隐藏登录&退出登录按钮
      }
      //判断当前用户是否有密码，否则就不显示密码修改功能
      let res = await uniIdCo.getAccountInfo();
      this.hasPwd = res.isPasswordSet;
    },
    methods: {
      async loadBusinessProfile() {
        const token = uni.getStorageSync("uni_id_token");
        if (!token || this.businessNameLoading) return;

        this.businessNameLoading = true;
        try {
          const { result } = await uniCloud.callFunction({
            name: "wtdb-business-person-profile",
            data: { action: "get", uniIdToken: token },
          });
          if (!result || result.code !== 200) {
            throw new Error(
              result && result.msg ? result.msg : "业务姓名加载失败"
            );
          }
          const data = result.data || {};
          this.businessProfile = {
            personId: data.personId || "",
            displayName: data.displayName || "",
            nameConfirmed: Boolean(data.nameConfirmed),
          };
          uni.setStorageSync("businessPersonProfile", this.businessProfile);
        } catch (error) {
          console.warn("业务姓名加载失败:", error);
        } finally {
          this.businessNameLoading = false;
        }
      },
      editBusinessName() {
        if (this.businessNameLoading || this.businessNameSaving) return;
        this.$refs.businessNameDialog.open();
      },
      async saveBusinessName(value) {
        const displayName = String(value || "").trim();
        if (!displayName || displayName.length > 10) {
          uni.showToast({
            title: "姓名长度需为1-10个字",
            icon: "none",
          });
          return;
        }
        if (/(老师|小朋友|儿童|学生)/.test(displayName)) {
          uni.showToast({
            title: "请填写姓名，不要包含身份称呼",
            icon: "none",
          });
          return;
        }

        const token = uni.getStorageSync("uni_id_token");
        if (!token || this.businessNameSaving) return;
        this.businessNameSaving = true;
        uni.showLoading({ title: "保存中...", mask: true });
        let toast = { title: "业务姓名已更新", icon: "success" };
        try {
          const { result } = await uniCloud.callFunction({
            name: "wtdb-business-person-profile",
            data: { action: "update", displayName, uniIdToken: token },
          });
          if (!result || result.code !== 200) {
            throw new Error(
              result && result.msg ? result.msg : "业务姓名保存失败"
            );
          }
          const data = result.data || {};
          this.businessProfile = {
            personId: data.personId || "",
            displayName: data.displayName || displayName,
            nameConfirmed: true,
          };
          uni.setStorageSync("businessPersonProfile", this.businessProfile);

          const currentClass = uni.getStorageSync("currentClass") || {};
          if (currentClass._id || currentClass.id || currentClass.code) {
            uni.setStorageSync("currentClass", {
              ...currentClass,
              memberPersonId: this.businessProfile.personId,
              memberDisplayName: this.businessProfile.displayName,
            });
          }
        } catch (error) {
          toast = { title: error.message || "保存失败", icon: "none" };
        } finally {
          uni.hideLoading();
          this.businessNameSaving = false;
        }
        uni.showToast(toast);
      },
      login() {
        uni.navigateTo({
          url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd",
          complete: (e) => {
            // console.log(e);
          },
        });
      },
      logout() {
        mutations.logout();
      },
      bindMobileSuccess() {
        mutations.updateUserInfo();
      },
      changePassword() {
        uni.navigateTo({
          url: "/uni_modules/uni-id-pages/pages/userinfo/change_pwd/change_pwd",
          complete: (e) => {
            // console.log(e);
          },
        });
      },
      bindMobile() {
        // #ifdef APP-PLUS
        uni.preLogin({
          provider: "univerify",
          success: this.univerify(), //预登录成功
          fail: (res) => {
            // 预登录失败
            // 不显示一键登录选项（或置灰）
            console.log(res);
            this.bindMobileBySmsCode();
          },
        });
        // #endif

        // #ifdef MP-WEIXIN
        this.$refs["bind-mobile-by-sms"].open();
        // #endif

        // #ifdef H5
        //...去用验证码绑定
        this.bindMobileBySmsCode();
        // #endif
      },
      univerify() {
        uni.login({
          provider: "univerify",
          univerifyStyle: this.univerifyStyle,
          success: async (e) => {
            uniIdCo
              .bindMobileByUniverify(e.authResult)
              .then((res) => {
                mutations.updateUserInfo();
              })
              .catch((e) => {
                console.log(e);
              })
              .finally((e) => {
                // console.log(e);
                uni.closeAuthView();
              });
          },
          fail: (err) => {
            console.log(err);
            if (err.code == "30002" || err.code == "30001") {
              this.bindMobileBySmsCode();
            }
          },
        });
      },
      bindMobileBySmsCode() {
        uni.navigateTo({
          url: "./bind-mobile/bind-mobile",
        });
      },
      setNickname(nickname) {
        if (nickname) {
          mutations.updateUserInfo({
            nickname,
          });
          this.setNicknameIng = false;
          this.$refs.dialog.close();
        } else {
          this.$refs.dialog.open();
        }
      },
      deactivate() {
        uni.navigateTo({
          url: "/uni_modules/uni-id-pages/pages/userinfo/deactivate/deactivate",
        });
      },
      async bindThirdAccount(provider) {
        const uniIdCo = uniCloud.importObject("uni-id-co");
        const bindField = {
          weixin: "wx_openid",
          alipay: "ali_openid",
          apple: "apple_openid",
          qq: "qq_openid",
        }[provider.toLowerCase()];

        if (this.userInfo[bindField]) {
          await uniIdCo["unbind" + provider]();
          await mutations.updateUserInfo();
        } else {
          uni.login({
            provider: provider.toLowerCase(),
            onlyAuthorize: true,
            success: async (e) => {
              const res = await uniIdCo["bind" + provider]({
                code: e.code,
              });
              if (res.errCode) {
                uni.showToast({
                  title: res.errMsg || "绑定失败",
                  duration: 3000,
                });
              }
              await mutations.updateUserInfo();
            },
            fail: async (err) => {
              console.log(err);
              uni.hideLoading();
            },
          });
        }
      },
      realNameVerify() {
        uni.navigateTo({
          url: "/uni_modules/uni-id-pages/pages/userinfo/realname-verify/realname-verify",
        });
      },
    },
  };
</script>
<style lang="scss" scoped>
  @import "@/uni_modules/uni-id-pages/common/login-page.scss";

  .uni-content {
    padding: 0;
  }

  /* #ifndef APP-NVUE */
  view {
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
  }

  @media screen and (min-width: 690px) {
    .uni-content {
      padding: 0;
      max-width: 690px;
      margin-left: calc(50% - 345px);
      border: none;
      max-height: none;
      border-radius: 0;
      box-shadow: none;
    }
  }

  /* #endif */
  .avatar {
    align-items: center;
    justify-content: center;
    margin: 22px 0;
    width: 100%;
  }

  .item {
    flex: 1;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  button {
    margin: 10%;
    margin-top: 40px;
    border-radius: 0;
    background-color: #ffffff;
    width: 80%;
  }

  .mt10 {
    margin-top: 10px;
  }
</style>
