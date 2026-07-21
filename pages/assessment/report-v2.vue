<template>
  <view class="assessment report-page">
    <view class="report-orb report-orb--coral"></view>
    <view class="report-orb report-orb--purple"></view>
    <view class="report-spark report-spark--one">✦</view>
    <view class="report-spark report-spark--two">+</view>
    <custom-nav
      :xcxName="'儿童成长评估'"
      :navCustomStyle="navCustomStyle"
      :needBar="false"
      :needBack="true"
      :backHandler="handleNavBack"
    />
    <view class="content">
      <view class="user-profile">
        <!-- 左侧内容容器 -->
        <view class="profile-left">
          <view class="avatar-frame">
            <image class="avatar-image" :src="avatarUrl" />
            <view class="avatar-star">★</view>
          </view>
          <view class="info">
            <view class="report-kicker">GROWTH REPORT</view>
            <view class="name">{{ displayName }}的评估报告</view>
            <view class="class report-meta">
              <view class="meta-chip meta-chip--class">
                <text class="meta-label">班级</text>
                <text class="meta-value">{{ classDisplay }}</text>
              </view>
              <view class="meta-chip meta-chip--age">
                <text class="meta-label">年龄</text>
                <text class="meta-value">{{ childAge }}</text>
              </view>
              <view class="meta-chip meta-chip--date">
                <text class="meta-label">报告日期</text>
                <text class="meta-value">{{ dateString }}</text>
              </view>
            </view>
          </view>
        </view>
        <view
          v-if="!isSharedView"
          class="profile-right"
          @click="handleClickHistory"
        >
          <view class="history-icon-wrap">
            <image class="report-list-image" :src="listIconUrl" />
          </view>
          <text class="history-title">历史报告</text>
          <text class="history-hint">点击切换</text>
        </view>
        <view v-else class="profile-right profile-right--shared">
          <view class="history-icon-wrap shared-icon-wrap">↗</view>
          <text class="history-title">好友分享</text>
          <text class="history-hint">仅当前报告</text>
        </view>
      </view>
      <view class="report-toolbox">
        <view class="toolbox-heading">
          <view>
            <view class="toolbox-kicker">SAVE & SHARE</view>
            <text class="toolbox-title">保存与分享</text>
          </view>
          <view
            class="toolbox-status"
            :class="{ 'toolbox-status--ready': pdfUrl }"
          >
            <view class="status-dot"></view>
            <text>{{ pdfStatusText }}</text>
          </view>
        </view>

        <view class="toolbox-actions">
          <button
            class="toolbox-action toolbox-action--pdf"
            :class="{ 'toolbox-action--busy': pdfBusy }"
            :disabled="pdfActionDisabled"
            hover-class="toolbox-action--pressed"
            :hover-stay-time="80"
            @click="handlePdfAction"
          >
            <view class="toolbox-action-icon pdf-icon">
              <view v-if="pdfBusy" class="action-spinner"></view>
              <text v-else>PDF</text>
            </view>
            <view class="toolbox-action-copy">
              <text class="toolbox-action-title">{{ pdfActionTitle }}</text>
              <text class="toolbox-action-hint">{{ pdfActionHint }}</text>
            </view>
            <text class="toolbox-action-arrow">›</text>
          </button>

          <button
            class="toolbox-action toolbox-action--share"
            open-type="share"
            :disabled="!canShareReport"
            hover-class="toolbox-action--pressed"
            :hover-stay-time="80"
          >
            <view class="toolbox-action-icon share-icon">
              <view class="share-node share-node--top"></view>
              <view class="share-node share-node--left"></view>
              <view class="share-node share-node--bottom"></view>
              <view class="share-line share-line--top"></view>
              <view class="share-line share-line--bottom"></view>
            </view>
            <view class="toolbox-action-copy">
              <text class="toolbox-action-title">分享给好友</text>
              <text class="toolbox-action-hint">发送当前这份成长报告</text>
            </view>
            <text class="toolbox-action-arrow">›</text>
          </button>
        </view>

        <view class="privacy-note">
          <view class="privacy-lock">✓</view>
          <text>{{ privacyHint }}</text>
        </view>
      </view>
      <div class="assessment-container">
        <div class="assessment-card">
          <view class="chart-heading">
            <view>
              <view class="chart-kicker">ABILITY MAP</view>
              <h1 class="assessment-title">ABLLS-R评估能力分布图</h1>
            </view>
            <view class="chart-badge">成长雷达</view>
          </view>
          <section class="chart-area">
            <l-echart ref="radarChartRef"></l-echart>
          </section>
          <view
            class="recommendation-section"
            :class="{ clickable: reportSummary }"
            @click="openReportSummaryPopup"
          >
            <view class="recommendation-marker"></view>
            <view class="recommendation-content">
              <view class="recommendation-label">AI分析</view>
              <view class="recommendation-text">
                {{ reportSummary || "暂无AI分析" }}
              </view>
            </view>
            <view class="recommendation-action" v-if="reportSummary">全文</view>
          </view>
        </div>
      </div>
      <view
        class="collapse"
        v-for="(section, index) in sectionSummaryList"
        :key="index"
      >
        <u-collapse
          @change="handleCollapseChange"
          @close="closeCollapse"
          @open="openCollapse"
          :border="false"
          :value="activeCollapse"
        >
          <u-collapse-item
            :title="section.sectionName"
            :name="`section_${index}`"
          >
            <template #title>
              <view class="collapse-title-row">
                <view class="collapse-index">{{ index + 1 }}</view>
                <view class="collapse-title-copy">
                  <text class="collapse-title-text">{{ section.sectionName }}</text>
                  <text class="collapse-title-hint">点击查看表现与成长建议</text>
                </view>
              </view>
            </template>
            <view class="collapse-content">
              <view class="sectionScore">
                <text class="score-label">本领域得分</text>
                <text class="score-value">{{
                  `${section.abllsSectionSummaryList.reduce(
                    (sum, item) => sum + (item.actualTotalScore || 0),
                    0
                  )}/${section.abllsSectionSummaryList.reduce(
                    (sum, item) => sum + (item.expectedTotalScore || 0),
                    0
                  )}`
                }}</text>
              </view>
              <view
                class="abllsSection"
                v-for="(item, index) in section.abllsSectionSummaryList"
                :key="index"
              >
                <view class="abllsItem">
                  <view class="abllsItemTitle">{{ item.sectioName }}</view>
                  <view class="abllsItemScore">
                    <u-line-progress
                      :percentage="
                        Math.round(
                          (item.actualTotalScore / item.expectedTotalScore) *
                            100
                        )
                      "
                      :activeColor="
                        getColorByAgeAndStage(
                          childAgeInt,
                          getScoreByAgeAndAlphabet(
                            item.alphabet,
                            item.actualTotalScore
                          )
                        )
                      "
                      :showText="false"
                      height="20"
                    >
                      <text class="u-percentage-slot">
                        {{
                          getScoreByAgeAndAlphabet(
                            item.alphabet,
                            item.actualTotalScore
                          )
                        }}
                        {{ item.actualTotalScore }}分
                      </text>
                    </u-line-progress>
                  </view>
                </view>
              </view>
              <view class="sectionAnalysis">
                <span>{{ section.analysis }}</span>
              </view>
            </view>
            <!-- 落后技能 -->
            <view
              class="collapse-skillBelowStandard"
              v-if="
                section.abllsSectionSummaryList &&
                section.abllsSectionSummaryList.some(
                  (abllsSection) =>
                    abllsSection.questions &&
                    abllsSection.questions.some((q) => !q.isStandard)
                )
              "
            >
              <view class="skill-header">
                <view class="skill-heading-row">
                  <text class="skill-icon">⚠️</text>
                  <text class="skill-title">需要关注的技能</text>
                </view>
                <text class="skill-title-desc">
                  虽然在某些方面已经达到总分的标准，根据评测时的选择，下面的技能仍需继续关注。
                </text>
              </view>

              <view
                class="skill-sections"
                v-for="(abllsSection, index) in section.abllsSectionSummaryList"
                :key="index"
              >
                <view v-if="abllsSection.questions.some((q) => !q.isStandard)">
                  <view class="section-divider">
                    <view class="section-name">{{
                      abllsSection.sectioName
                    }}</view>
                  </view>
                  <view class="skill-items">
                    <view
                      class="skill-item"
                      v-for="(item, index2) in abllsSection.questions.filter(
                        (q) => !q.isStandard
                      )"
                      :key="index2"
                    >
                      <view class="skill-badge">{{ index2 + 1 }}</view>
                      <view class="skill-content">
                        <view class="skill-name">{{ item.task_name }}</view>
                        <view class="skill-description">{{
                          item.task_object
                        }}</view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 干预计划部分 HTML 结构修改 -->
            <view
              class="collapse-skillImprovementPlan"
              v-if="
                section.abllsSectionSummaryList &&
                section.abllsSectionSummaryList.some(
                  (abllsSection) =>
                    abllsSection.questions &&
                    abllsSection.questions.some(
                      (item) =>
                        !item.isStandard &&
                        item.description &&
                        item.description.trim()
                    )
                )
              "
            >
              <view class="improvement-header">
                <view class="improvement-icon">🎯</view>
                <view class="improvement-title">干预建议计划</view>
              </view>

              <!-- 步骤条容器 -->
              <view class="steps-container">
                <view
                  v-for="(
                    abllsSection, sectionIndex
                  ) in section.abllsSectionSummaryList"
                  :key="sectionIndex"
                  class="section-step"
                >
                  <!-- 分区标题步骤 - 只有当该section有符合条件的items时才显示 -->
                  <view
                    class="section-step-item"
                    v-if="
                      abllsSection.questions &&
                      abllsSection.questions.some(
                        (item) =>
                          !item.isStandard &&
                          item.description &&
                          item.description.trim()
                      )
                    "
                  >
                    <view class="step-number">{{ sectionIndex + 1 }}</view>
                    <view class="step-content section-header">
                      <view class="step-title">{{
                        abllsSection.sectioName
                      }}</view>
                      <view class="step-subtitle">技能领域训练</view>
                    </view>
                    <view class="step-line"></view>
                  </view>

                  <!-- 具体任务步骤 - 只显示符合条件的项 -->
                  <template
                    v-for="(item, taskIndex) in abllsSection.questions.filter(
                      (q) =>
                        !q.isStandard && q.description && q.description.trim()
                    )"
                    :key="taskIndex"
                  >
                    <view class="task-step-item">
                      <view class="step-number sub-step"
                        >{{ sectionIndex + 1 }}.{{ taskIndex + 1 }}</view
                      >
                      <view class="step-content task-content">
                        <view class="step-title">{{ item.task_name }}</view>
                        <view class="step-description">{{
                          item.description
                        }}</view>
                      </view>
                      <view
                        class="step-line"
                        v-if="taskIndex < abllsSection.questions.length - 1"
                      ></view>
                    </view>
                  </template>
                </view>
              </view>
            </view>
          </u-collapse-item>
        </u-collapse>
      </view>
    </view>
    <view style="z-index: 9999">
      <popup
        :historyReports="historyReports"
        :show="showHistory"
        @update:show="(val) => (showHistory = val)"
        @onclickReportCard="onclickReportCard"
      />
    </view>
    <analysis-modal
      :show="showReportSummaryPopup"
      title="能力分布图AI分析"
      :subtitle="`${displayName} · ${dateString || '评估报告'}`"
      :content="reportSummary"
      @update:show="(val) => (showReportSummaryPopup = val)"
    />
    <DopamineLoading
      :show="loadingVisible"
      text="正在打开成长报告"
      subtext="小芽正在整理能力图和成长建议"
    />
  </view>
</template>

<script setup>
  const echarts = require("./static/echarts.min");
  import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
  import { ref, onUnmounted, onMounted, computed, watch, nextTick } from "vue";
  import common from "./common.js";
  import customNav from "@/components/customNav";
  import capabilityLevel from "./components/capability-level-v2";
  import popup from "./components/popup";
  import analysisModal from "@/components/analysis-modal/analysis-modal.vue";
  import DopamineLoading from "@/components/dopamine-loading/index.vue";
  import { getRadarOption } from "./charts";
  import { ALPHABET_AGE_MAP } from "@/lib/types/local_storage.js";
  let displayName = ref("可爱宝宝"); //
  let classDisplay = ref("小班3班");
  let avatarUrl = ref(
    "https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png"
  );

  const totalScore = ref(0);
  const sectionScores = ref({});
  const completionTime = ref("");
  const childAge = ref("");
  const childAgeInt = ref(0);
  const dateString = ref("");
  const reportSummary = ref("");
  const showReportSummaryPopup = ref(false);
  const showHistory = ref(false);
  const loadingVisible = ref(false);
  const currentReport = ref(null);
  const pdfUrl = ref("");
  const pdfStatus = ref("");
  const pdfGeneratedTime = ref(0);
  const pdfGenerating = ref(false);
  const pdfOpening = ref(false);
  const isSharedView = ref(false);
  const navCustomStyle =
    "background: linear-gradient(135deg, #FFF2B8 0%, #FFD778 48%, #FFB8AC 100%);height: calc(100vh / 8)";
  // 在setup中添加卸载生命周期
  const assessmentId = ref("");
  const analysisTextAI = ref("");
  const listIconUrl = "../../static/general/list.png";
  const historyReports = ref([]);
  const radarChartRef = ref(null);
  const sectionSummaryList = ref([]);
  const sectionScoreList = ref([]);

  // 添加折叠面板状态管理
  const activeCollapse = ref([]);

  const pdfBusy = computed(() => pdfGenerating.value || pdfOpening.value);
  const currentReportId = computed(
    () => currentReport.value?.reportId || currentReport.value?._id || ""
  );
  const canShareReport = computed(() => {
    const report = currentReport.value || {};
    return !!(
      report.reportId ||
      report._id ||
      report.recordId ||
      report.childId
    );
  });
  const pdfActionDisabled = computed(
    () =>
      pdfBusy.value ||
      !currentReportId.value ||
      (isSharedView.value && !pdfUrl.value)
  );
  const pdfActionTitle = computed(() => {
    if (pdfGenerating.value) return "正在生成PDF";
    if (pdfOpening.value) return "正在打开PDF";
    if (pdfUrl.value) return "查看PDF报告";
    if (isSharedView.value) return "暂未生成PDF";
    return "生成PDF报告";
  });
  const pdfActionHint = computed(() => {
    if (pdfGenerating.value) return "正在排版，请稍候片刻";
    if (pdfOpening.value) return "正在加载报告文件";
    if (pdfUrl.value) return "可预览、保存或转发";
    if (isSharedView.value) return "请联系报告管理者生成";
    return "生成后自动打开预览";
  });
  const pdfStatusText = computed(() => {
    if (pdfGenerating.value) return "生成中";
    if (pdfUrl.value) return "PDF已就绪";
    if (pdfStatus.value === "failed") return "可重新生成";
    return "报告工具";
  });
  const privacyHint = computed(() =>
    isSharedView.value
      ? "这份报告来自微信分享，请谨慎转发儿童成长信息"
      : "报告含儿童成长信息，分享前请确认接收人"
  );

  // 折叠面板事件处理函数
  const openCollapse = (e) => {
    console.log("openCollapse", e);
  };

  const handleCollapseChange = (value) => {
    console.log("handleCollapseChange", value);
  };

  const closeCollapse = (e) => {
    console.log("closeCollapse", e);
  };

  const handleNavBack = () => {
    if (isSharedView.value) {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        uni.reLaunch({ url: "/pages/enter-class/index" });
      }
      return;
    }
    uni.redirectTo({ url: "/pages/dashboard/teacher/teacher" });
  };

  const handleClickHistory = () => {
    showHistory.value = true;
  };

  const openReportSummaryPopup = () => {
    if (!reportSummary.value) return;
    showReportSummaryPopup.value = true;
  };

  const getColorByAgeAndStage = (age, stageStr) => {
    console.log("getColorByAgeAndStage", age, stageStr);
    const stage = parseInt(stageStr?.replace("阶", ""));
    console.log("getColorByAgeAndStage stage", stage);

    if (isNaN(stage)) {
      return "#CCCCCC"; // 错误处理色
    }

    if (stage === age) {
      return "#A2CF73"; // 正常
    } else if (stage > age) {
      return "#4BAE4F"; // 超前
    } else {
      return "#CF7274"; // 落后
    }
  };

  const getScoreByAgeAndAlphabet = (alphabet, actualTotalScore) => {
    const map = uni.getStorageSync(ALPHABET_AGE_MAP);

    if (!map || !map[alphabet]) {
      return `-阶 ${actualTotalScore}/-`;
    }

    const ageScoreMap = map[alphabet]; // 如 {2: 51, 3: 106, 4: 155}

    // 按阶段数字顺序排序
    const stages = Object.keys(ageScoreMap)
      .map(Number)
      .sort((a, b) => a - b);

    // 遍历查找第一个比 actualTotalScore 更大的分数
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const score = ageScoreMap[stage];
      if (actualTotalScore < score) {
        // 分数没达到这个阶段 → 属于上一个阶段
        const currentStage = i === 0 ? stage : stages[i - 1];
        return `${currentStage}阶`;
      }
    }

    // 如果比所有阶段都高，返回最后一阶
    const lastStage = stages[stages.length - 1];
    return `${lastStage}阶`;
  };

  const formatChildAge = (value) => {
    if (value === undefined || value === null || value === "") return "";
    const text = String(value);
    return text.includes("岁") ? text : `${text}岁`;
  };

  const applyReportData = (report, fallback = {}) => {
    if (!report) return;

    currentReport.value = report;
    displayName.value = report.childName || fallback.name || "未知姓名";
    classDisplay.value = report.className || fallback.className || "未知班级";
    avatarUrl.value = report.avatar || fallback.avatar || avatarUrl.value;
    childAge.value =
      formatChildAge(report.childAge) ||
      fallback.childAge ||
      common.ageDisplay(fallback.birthdate) ||
      "未知年龄";
    childAgeInt.value = report.ageInt || 0;
    sectionSummaryList.value = report.sectionSummaryList || [];
    reportSummary.value = report.reportSummary || "";
    dateString.value = report.date || common.formatDate(report.completionTime) || "";
    assessmentId.value = report.assessmentId || assessmentId.value;
    pdfUrl.value = report.pdfUrl || "";
    pdfStatus.value = report.pdfStatus || "";
    pdfGeneratedTime.value = report.pdfGeneratedTime || 0;
  };

  const onclickReportCard = (index) => {
    console.log("onclickReportCard received index:", index);
    console.log("Current report data:", historyReports.value[index]);
    const selectedReport = historyReports.value[index];
    // 收起所有折叠版 - 使用nextTick确保在DOM更新后执行
    nextTick(() => {
      activeCollapse.value = [];
    });

    applyReportData(selectedReport);

    // 关闭历史报告弹窗
    showHistory.value = false;
  };

  const fetchChildReportHistory = async ({
    childId = "",
    reportId = "",
    recordId = "",
    documentId = "",
  } = {}) => {
    loadingVisible.value = true;

    try {
      // 1. 查询学生报告数据
      const res = await uniCloud.callFunction({
        name: "wt-fetch-child-report-history",
        data: {
          childId,
          reportId,
          recordId,
          documentId,
          uniIdToken: uni.getStorageSync("uni_id_token"),
        },
      });

      if (res.result.code !== 200 || !res.result.data.length) {
        uni.showToast({
          title: "暂无该学生历史报告，请先进行评估",
          icon: "none",
        });
        return [];
      }

      // 2. 转换报告数据格式
      const assessmentList =
        uni.getStorageSync("teacher_assessment_list")?.list || [];
      return res.result.data.map((report) => {
        const assessment = assessmentList.find(
          (item) =>
            item.id === report.assessmentId || item._id === report.assessmentId
        );
        return {
          ...report,
          title:
            report.assessmentTitle?.trim() ||
            assessment?.title ||
            "评估报告",
          date: common.formatDate(report.completionTime),
        };
      });
    } finally {
      loadingVisible.value = false;
    }
  };

  const radarOption = ref({});

  watch(
    () => sectionSummaryList.value,
    (newVal) => {
      if (newVal && newVal.length > 0) {
        radarOption.value = getRadarOption(newVal);
        console.log("radarOption", radarOption.value);
        updateChart();
      }
    },
    { deep: true }
  );

  // 添加updateChart方法
  const updateChart = async () => {
    if (!radarChartRef.value || !radarOption.value.radar?.indicator?.length)
      return;
    try {
      const chart = await radarChartRef.value.init(echarts);
      chart.setOption(radarOption.value);
    } catch (e) {
      console.error("图表更新失败:", e);
    }
  };

  const updateCurrentReportPdf = (url) => {
    const report = currentReport.value;
    if (!report) return;

    const generatedTime = Date.now();
    report.pdfUrl = url;
    report.pdfStatus = "completed";
    report.pdfGeneratedTime = generatedTime;
    pdfUrl.value = url;
    pdfStatus.value = "completed";
    pdfGeneratedTime.value = generatedTime;

    const index = historyReports.value.findIndex((item) => {
      if (report.reportId && item.reportId) {
        return item.reportId === report.reportId;
      }
      return item._id && item._id === report._id;
    });
    if (index >= 0) {
      historyReports.value[index] = { ...report };
    }
  };

  const resolvePdfUrl = async (sourceUrl) => {
    if (!sourceUrl) throw new Error("PDF地址不存在");
    if (/^https?:\/\//i.test(sourceUrl)) return sourceUrl;

    const result = await uniCloud.getTempFileURL({ fileList: [sourceUrl] });
    return result?.fileList?.[0]?.tempFileURL || sourceUrl;
  };

  const downloadPdf = (url) =>
    new Promise((resolve, reject) => {
      uni.downloadFile({
        url,
        success: (result) => {
          if (result.statusCode === 200 && result.tempFilePath) {
            resolve(result.tempFilePath);
          } else {
            reject(new Error("PDF下载失败"));
          }
        },
        fail: reject,
      });
    });

  const openPdfFile = (filePath) =>
    new Promise((resolve, reject) => {
      uni.openDocument({
        filePath,
        fileType: "pdf",
        showMenu: true,
        success: resolve,
        fail: reject,
      });
    });

  const previewPdf = async (sourceUrl) => {
    if (pdfOpening.value) return;
    pdfOpening.value = true;

    try {
      const accessibleUrl = await resolvePdfUrl(sourceUrl);

      // #ifdef H5
      window.open(accessibleUrl, "_blank");
      return;
      // #endif

      // #ifndef H5
      const filePath = await downloadPdf(accessibleUrl);
      await openPdfFile(filePath);
      // #endif
    } catch (error) {
      console.error("PDF打开失败:", error);
      uni.showToast({
        title: "PDF打开失败，请稍后重试",
        icon: "none",
      });
    } finally {
      pdfOpening.value = false;
    }
  };

  const generatePdf = async () => {
    if (pdfGenerating.value || !currentReport.value) return "";
    pdfGenerating.value = true;
    pdfStatus.value = "generating";

    try {
      const report = currentReport.value;
      const response = await uniCloud.callFunction({
        name: "wtdb-generate-report-pdf",
        data: {
          reportId: report.reportId || report._id,
          childId: report.childId || "",
          forceRegenerate: false,
          uniIdToken: uni.getStorageSync("uni_id_token"),
        },
      });
      const result = response?.result || {};
      const generatedUrl = result?.data?.pdfUrl || "";

      if (result.code !== 200 || !generatedUrl) {
        const error = new Error(result.msg || "PDF生成失败");
        error.code = result.code;
        throw error;
      }

      updateCurrentReportPdf(generatedUrl);
      uni.showToast({
        title: result.data.cached ? "PDF已准备好" : "PDF生成成功",
        icon: "success",
      });
      return generatedUrl;
    } catch (error) {
      console.error("PDF生成失败:", error);
      pdfStatus.value = "failed";
      const errorMessage =
        error.code === 401
          ? "登录已过期，请重新登录"
          : error.code === 403
            ? "暂无生成该报告的权限"
            : error.message || "PDF生成失败，请稍后重试";
      uni.showToast({ title: errorMessage, icon: "none" });
      return "";
    } finally {
      pdfGenerating.value = false;
    }
  };

  const handlePdfAction = async () => {
    if (pdfBusy.value) return;
    if (!currentReportId.value) {
      uni.showToast({ title: "报告尚未加载完成", icon: "none" });
      return;
    }
    if (isSharedView.value && !pdfUrl.value) {
      uni.showToast({ title: "请联系报告管理者生成PDF", icon: "none" });
      return;
    }

    const targetUrl = pdfUrl.value || (await generatePdf());
    if (targetUrl) await previewPdf(targetUrl);
  };

  const buildReportSharePath = () => {
    const report = currentReport.value || {};
    const params = { isShare: "true" };

    if (report.reportId) {
      params.reportId = report.reportId;
    } else if (report._id) {
      params.documentId = report._id;
    } else if (report.recordId) {
      params.recordId = report.recordId;
    } else if (report.childId) {
      params.childId = report.childId;
    } else {
      return "/pages/enter-class/index";
    }

    const query = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `/pages/assessment/report-v2?${query}`;
  };

  onLoad(async function (options) {
    isSharedView.value = options.isShare === "true";

    // #ifdef MP-WEIXIN
    uni.showShareMenu({ menus: ["shareAppMessage"] });
    // #endif

    if (options.isHistory == "true") {
      const student = uni.getStorageSync("current_student") || {};
      const currentClass = uni.getStorageSync("currentClass") || {};

      historyReports.value = await fetchChildReportHistory({
        childId: options.childId || student._id || "",
        reportId: options.reportId || "",
        recordId: options.recordId || "",
		documentId: options.documentId || "",
      });

      if (historyReports.value.length > 0) {
        const currentReport = historyReports.value[0];
        applyReportData(currentReport, {
          name: student.name,
          className: currentClass.nickname,
          avatar: student.avatar,
          birthdate: student.birthdate,
          childAge: student.age,
        });
        console.log("currentReport", currentReport);
      }
    } else if (options.isShare === "true") {
      console.log("isShare", options);

      historyReports.value = await fetchChildReportHistory({
        childId: options.childId || options.studentId || "",
        reportId: options.reportId || "",
        recordId: options.recordId || "",
        documentId: options.documentId || "",
      });

      if (historyReports.value.length > 0) {
        const latestReport = historyReports.value[0];
        historyReports.value = [latestReport];
        applyReportData(latestReport, {
          name: options.name,
          className: options.nickname,
          avatar: options.avatar,
          birthdate: Number(options.birthdate),
        });
        console.log("latestReport", latestReport);
      }
    } else {
      console.log(options);
      assessmentId.value = options.assessmentId;
      const cacheKey = `assessment_${assessmentId.value}`;
      const cachedData = uni.getStorageSync(cacheKey);
      // 初始化数据绑定
      if (cachedData) {
        displayName.value = cachedData.childName || "未知姓名";
        classDisplay.value = cachedData.className || "未知班级";
        childAge.value = cachedData.childAge || "未知年龄";
        totalScore.value = cachedData.totalScore || 0;
        sectionScores.value = cachedData.sectionScores || {};
        dateString.value = common.formatDate(cachedData.completionTime) || "";
        completionTime.value = new Date(
          cachedData.completionTime
        ).toLocaleString();
      }
      historyReports.value = await fetchChildReportHistory({
        childId: options.childId,
      });
      if (historyReports.value.length > 0) {
        const matchingReport =
          historyReports.value.find(
            (report) => report.assessmentId === assessmentId.value
          ) || historyReports.value[0];
        applyReportData(matchingReport, cachedData || {});
        analysisTextAI.value = matchingReport.aiResponse || "";
      }
    }
  });

  onMounted(async () => {
    await updateChart();
  });

  onUnmounted(() => {
    // 清除当前量表的缓存
    const cacheKey = `assessment_${assessmentId.value}`;
    uni.removeStorageSync(cacheKey);
    console.log("已清除评估缓存:", cacheKey);
  });

  onShareAppMessage((res) => {
    console.log("onShareAppMessage", res);
    return {
      title: `${displayName.value}的成长评估报告｜知苗成长`,
      path: buildReportSharePath(),
    };
  });
</script>

<style lang="scss" scoped>
  .assessment {
    .content {
      background-color: linear-gradient(to right, #f5fdf8, #f1fcf5, #f9fcef);
      height: calc(100vh - 100vh / 8);

      .user-profile {
        // height: calc(100vh / 8);
        background: linear-gradient(to right, #f5fdf8, #f1fcf5, #f9fcef);
        display: flex;
        justify-content: space-between;
        align-items: center; // 新增这行实现垂直居中
        padding: 0 40rpx 20rpx 40rpx;
        box-shadow: inset 0 -20rpx 30rpx rgba(255, 255, 255, 0.8);

        .profile-left {
          display: flex;
          gap: 24rpx;
          height: 60%;
          align-items: center;
        }

        .profile-right {
          height: 60%;
          align-items: center;

          .report-list-image {
            width: 90rpx;
            height: 90rpx;
          }
        }

        .avatar-image {
          width: 120rpx;
          height: 120rpx;
        }

        .info {
          display: flex;
          flex-direction: column;
          gap: 8rpx;

          .name {
            color: #00214d;
            font-family: "PingFang SC";
            font-size: 18px;
            font-style: normal;
            font-weight: 600;
            line-height: 24px;
          }

          .class {
            gap: 8rpx;
            color: #3d464a;
            font-family: "PingFang SC";
            font-size: 14px;
            font-style: normal;
            font-weight: 400;
            line-height: 20px;
            align-items: center;
          }
        }
      }

      .assessment-container {
        width: 100%;
        margin: 0 auto;
        display: flex;
        justify-content: center;
        align-items: center;
        // min-height: 100vh;
        padding: 40rpx;
        box-sizing: border-box;

        .assessment-card {
          width: 670rpx;
          height: 722rpx;
          position: relative;
          border-radius: 16rpx;
          border: 1px solid #e9e9e9;
          box-shadow: 0 8rpx 8rpx 0 rgba(0, 0, 0, 0.25);
          flex-shrink: 0;
          background-color: #fff;

          .assessment-title {
            position: absolute;
            left: 172rpx;
            top: 32rpx;
            width: 322rpx;
            height: 40rpx;
            color: #000;
            font-family: "PingFang SC", -apple-system, Roboto, Helvetica,
              sans-serif;
            font-size: 28rpx;
            font-weight: 500;
            margin: 0;
          }

          .chart-area {
            position: absolute;
            left: 0;
            top: 100rpx;
            width: 670rpx;
            height: 512rpx;
            background-color: #fff;
          }

          .recommendation-section {
            // 永远保持在底部
            bottom: 0;
            position: absolute;
            left: 0;
            top: 612rpx;
            width: 670rpx;
            height: 110rpx;
            color: #00214d;
            font-family: "PingFang SC", -apple-system, Roboto, Helvetica,
              sans-serif;
            font-size: 22rpx;
            font-weight: 400;
            line-height: 28rpx;
            border-radius: 0 0 16rpx 16rpx;
            box-shadow: 0 8rpx 8rpx 0 rgba(0, 0, 0, 0.25);
            background-color: rgba(110, 221, 138, 0.12);
            display: flex;
            align-items: center;
            gap: 16rpx;
            padding: 12rpx 20rpx;
            box-sizing: border-box;
            overflow: hidden;

            &.clickable {
              cursor: pointer;
            }

            .recommendation-marker {
              width: 8rpx;
              height: 70rpx;
              border-radius: 999rpx;
              background: linear-gradient(180deg, #6edd8a 0%, #ffb45c 100%);
              flex-shrink: 0;
            }

            .recommendation-content {
              flex: 1;
              min-width: 0;
            }

            .recommendation-label {
              color: #50636b;
              font-size: 20rpx;
              font-weight: 500;
              line-height: 26rpx;
              margin-bottom: 4rpx;
            }

            .recommendation-text {
              width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              word-break: break-word;
            }

            .recommendation-action {
              min-width: 64rpx;
              height: 40rpx;
              border-radius: 999rpx;
              background: #ffffff;
              border: 1px solid rgba(0, 33, 77, 0.12);
              color: #00214d;
              font-size: 20rpx;
              font-weight: 500;
              line-height: 40rpx;
              text-align: center;
              flex-shrink: 0;
            }
          }
        }
      }

      .collapse {
        // padding: 0 40rpx;
        border-radius: 8px;
        border: 1px solid #e9e9e9;
        background: #fff;
        box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
        margin: 22rpx 40rpx;

        .collapse-content {
          // margin-left: 10rpx;

          .sectionScore {
            margin-bottom: 30rpx;
          }

          .abllsSection {
            width: 100%;

            .abllsItem {
              display: flex;
              margin-bottom: 20rpx;

              .abllsItemTitle {
                width: 25%;
              }

              .abllsItemScore {
                width: 75%;
              }
            }
          }

          .sectionAnalysis {
            background: linear-gradient(
              135deg,
              #f0fdf4 0%,
              #f7fee7 50%,
              #fefce8 100%
            );
            border: 2rpx solid #a2cf73;
            border-radius: 12rpx;
            padding: 24rpx;
            margin-bottom: 40rpx;
            position: relative;
            box-shadow: 0 4rpx 16rpx rgba(162, 207, 115, 0.15);
            margin-top: 40rpx;
            line-height: 1.4rem;
            text-align: justify;
            text-justify: inter-character;
            hyphens: auto;

            span {
              text-align: justify;
              text-justify: inter-character;
              hyphens: auto;
            }

            &:before {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 3rpx;
              background: linear-gradient(90deg, #a2cf73, #84cc16, #65a30d);
              border-radius: 12rpx 12rpx 0 0;
            }

            > text:first-child {
              font-size: 26rpx;
              font-weight: 600;
              color: #365314;
              display: block;
              margin-bottom: 16rpx;

              &:before {
                content: "📊";
                margin-right: 8rpx;
                font-size: 22rpx;
              }
            }

            span {
              font-size: 24rpx;
              color: #1f2937;
              line-height: 1.5;
              font-family: "PingFang SC", -apple-system, BlinkMacSystemFont,
                sans-serif;
              background: rgba(255, 255, 255, 0.8);
              padding: 12rpx 16rpx;
              border-radius: 8rpx;
              border: 1rpx solid #d9f99d;
              display: block;
              box-shadow: 0 2rpx 8rpx rgba(162, 207, 115, 0.1);

              // 文本压缩技巧
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 4;
              -webkit-box-orient: vertical;

              // 悬停展开
              transition: all 0.3s ease;
              cursor: pointer;

              &:hover {
                -webkit-line-clamp: unset;
                box-shadow: 0 4rpx 12rpx rgba(162, 207, 115, 0.2);
                background: rgba(255, 255, 255, 0.95);
              }
            }
          }
        }

        .collapse-skillBelowStandard {
          background: linear-gradient(
            135deg,
            #fff5f5 0%,
            #fef2f2 50%,
            #ffeaea 100%
          );
          border: 2rpx solid #feb2b2;
          border-radius: 16rpx;
          padding: 32rpx 24rpx;
          margin: 24rpx 0 42rpx 0;
          box-shadow: 0 8rpx 24rpx rgba(254, 178, 178, 0.3);

          .skill-header {
            // display: flex;
            align-items: center;
            margin-bottom: 32rpx;
            padding-bottom: 20rpx;
            border-bottom: 2rpx dashed #feb2b2;

            .skill-icon {
              font-size: 32rpx;
              margin-right: 16rpx;
            }

            .skill-title {
              font-size: 32rpx;
              font-weight: 600;
              color: #dc2626;
              font-family: "PingFang SC", -apple-system, BlinkMacSystemFont,
                sans-serif;
              letter-spacing: 1rpx;
            }

            .skill-title-desc {
              font-size: 26rpx;
              color: #6b7280;
              font-family: "PingFang SC", -apple-system, BlinkMacSystemFont,
                sans-serif;
              line-height: 1.5;
              // margin-top: 16rpx;
              letter-spacing: 0.5rpx;
            }
          }

          .skill-sections {
            margin-bottom: 40rpx;

            &:last-child {
              margin-bottom: 0;
            }
          }

          .section-divider {
            position: relative;
            text-align: center;
            margin: 32rpx 0 24rpx 0;

            &:before {
              content: "";
              position: absolute;
              top: 50%;
              left: 0;
              right: 0;
              height: 2rpx;
              background: linear-gradient(
                90deg,
                transparent 0%,
                #fca5a5 20%,
                #f87171 50%,
                #fca5a5 80%,
                transparent 100%
              );
              z-index: 1;
            }

            .section-name {
              display: inline-block;
              background: #ffffff;
              padding: 8rpx 20rpx;
              border: 2rpx solid #feb2b2;
              border-radius: 20rpx;
              font-size: 26rpx;
              font-weight: 500;
              color: #b91c1c;
              position: relative;
              z-index: 2;
              box-shadow: 0 4rpx 12rpx rgba(254, 178, 178, 0.4);
            }
          }

          .skill-items {
            display: flex;
            flex-direction: column;
            gap: 20rpx;
          }

          .skill-item {
            display: flex;
            align-items: flex-start;
            background: rgba(255, 255, 255, 0.8);
            border: 1rpx solid #fca5a5;
            border-radius: 12rpx;
            padding: 20rpx;
            transition: all 0.3s ease;
            box-shadow: 0 4rpx 12rpx rgba(254, 178, 178, 0.2);

            &:hover {
              transform: translateY(-2rpx);
              box-shadow: 0 8rpx 20rpx rgba(254, 178, 178, 0.3);
            }
          }

          .skill-badge {
            min-width: 40rpx;
            height: 40rpx;
            background: linear-gradient(135deg, #f87171, #ef4444);
            color: #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20rpx;
            font-weight: 600;
            margin-right: 20rpx;
            margin-top: 4rpx;
            box-shadow: 0 4rpx 8rpx rgba(239, 68, 68, 0.3);
          }

          .skill-content {
            flex: 1;

            .skill-name {
              font-size: 28rpx;
              font-weight: 600;
              color: #991b1b;
              margin-bottom: 8rpx;
              line-height: 1.4;
              font-family: "PingFang SC", -apple-system, BlinkMacSystemFont,
                sans-serif;
            }

            .skill-description {
              font-size: 24rpx;
              color: #7c2d12;
              line-height: 1.5;
              text-align: justify;
              font-family: "PingFang SC", -apple-system, BlinkMacSystemFont,
                sans-serif;
            }
          }
        }

        /* 步骤条样式 */
        .collapse-skillImprovementPlan {
          position: relative;
          background: #fed9b4;
          border-radius: 20rpx;
          padding: 40rpx 32rpx;
          margin-bottom: 20rpx;
          box-shadow: 0 8rpx 32rpx rgba(254, 217, 180, 0.3);
          position: relative;
          overflow: hidden;
          border: 2rpx solid #f4b266;

          &:before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            // height: 8rpx;
            background: #f4b266;
          }

          &:after {
            content: "💡";
            position: absolute;
            top: 24rpx;
            right: 32rpx;
            font-size: 48rpx;
            opacity: 0.6;
            animation: bounce 2s ease-in-out infinite;
          }

          .improvement-header {
            display: flex;
            align-items: center;
            margin-bottom: 40rpx;
            padding-bottom: 24rpx;
            border-bottom: 2rpx dashed #f4b266;
            position: relative;
            z-index: 2;

            .improvement-icon {
              font-size: 36rpx;
              margin-right: 16rpx;
              animation: bounce 2s ease-in-out infinite;
            }

            .improvement-title {
              font-size: 32rpx;
              font-weight: 600;
              color: #b85c38;
              font-family: "PingFang SC", -apple-system, BlinkMacSystemFont,
                sans-serif;
              letter-spacing: 1rpx;
            }
          }

          .steps-container {
            position: relative;
          }

          // 为每个 section-step 添加上下 margin
          .section-step {
            margin: 24rpx 0;

            &:first-child {
              margin-top: 0;
            }

            &:last-child {
              margin-bottom: 0;
            }
          }

          // 通用步骤样式
          .section-step-item,
          .task-step-item,
          .completion-step {
            position: relative;
            display: flex;
            align-items: flex-start;
            margin-bottom: 32rpx;

            &:last-child {
              margin-bottom: 0;
            }
          }

          // 步骤编号样式
          .step-number {
            min-width: 60rpx;
            height: 60rpx;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 24rpx;
            margin-right: 24rpx;
            position: relative;
            z-index: 2;

            // 主步骤编号（分区）
            &:not(.sub-step):not(.final-step) {
              background: #f4b266;
              color: #ffffff;
              box-shadow: 0 4rpx 16rpx rgba(244, 178, 102, 0.4);

              &:before {
                content: "";
                position: absolute;
                top: -4rpx;
                left: -4rpx;
                right: -4rpx;
                bottom: -4rpx;
                border: 2rpx solid #fed9b4;
                border-radius: 50%;
                opacity: 0.6;
              }
            }

            // 子步骤编号（具体任务）
            &.sub-step {
              background: #ffffff;
              border: 2rpx solid #f4b266;
              color: #b85c38;
              font-size: 20rpx;
              min-width: 54rpx;
              height: 54rpx;
              box-shadow: 0 2rpx 8rpx rgba(244, 178, 102, 0.2);
            }

            // 最终步骤
            &.final-step {
              background: #d2691e;
              color: #ffffff;
              font-size: 32rpx;
              min-width: 68rpx;
              height: 68rpx;
              box-shadow: 0 6rpx 20rpx rgba(210, 105, 30, 0.4);
              animation: pulse 2s ease-in-out infinite;
            }
          }

          // 步骤内容样式
          .step-content {
            flex: 1;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 12rpx;
            padding: 24rpx;
            border: 1rpx solid #f4b266;
            box-shadow: 0 4rpx 12rpx rgba(244, 178, 102, 0.2);
            transition: all 0.3s ease;

            &:hover {
              transform: translateX(8rpx);
              box-shadow: 0 6rpx 16rpx rgba(244, 178, 102, 0.3);
            }

            // 分区标题样式
            &.section-header {
              background: #fef0e1;
              border-left: 4rpx solid #f4b266;

              .step-title {
                font-size: 28rpx;
                font-weight: 600;
                color: #b85c38;
                margin-bottom: 8rpx;

                &:before {
                  content: "📋";
                  margin-right: 8rpx;
                  font-size: 24rpx;
                }
              }

              .step-subtitle {
                font-size: 22rpx;
                color: #d2691e;
                opacity: 0.8;
              }
            }

            // 任务内容样式
            &.task-content {
              margin-left: 20rpx;

              .step-title {
                font-size: 26rpx;
                font-weight: 500;
                color: #b85c38;
                margin-bottom: 12rpx;

                &:before {
                  content: "✓";
                  margin-right: 8rpx;
                  font-size: 20rpx;
                  color: #f4b266;
                }
              }

              .step-description {
                font-size: 24rpx;
                color: #d2691e;
                line-height: 1.6;
                text-align: justify;
                margin-bottom: 12rpx;
                background: #fef8f3;
                padding: 12rpx;
                border-radius: 6rpx;
              }
            }

            // 最终目标样式
            &.final-content {
              background: #fed9b4;
              border-left: 4rpx solid #d2691e;

              .step-title {
                font-size: 28rpx;
                font-weight: 600;
                color: #8b4513;
                margin-bottom: 8rpx;

                &:before {
                  content: "🎉";
                  margin-right: 8rpx;
                  font-size: 24rpx;
                }
              }

              .step-description {
                font-size: 24rpx;
                color: #b85c38;
                line-height: 1.6;
              }
            }
          }

          // 连接线样式
          .step-line {
            position: absolute;
            left: 30rpx;
            top: 60rpx;
            bottom: -32rpx;
            // width: 2rpx;
            background: #f4b266;
            z-index: 1;

            // 虚线效果
            &:after {
              content: "";
              position: absolute;
              top: 0;
              left: -1rpx;
              width: 4rpx;
              height: 100%;
              background: repeating-linear-gradient(
                180deg,
                #f4b266 0%,
                #f4b266 10%,
                transparent 10%,
                transparent 20%
              );
              animation: flowDown 3s ease-in-out infinite;
            }
          }

          // 动画效果
          @keyframes flowDown {
            0% {
              transform: translateY(-20rpx);
              opacity: 0.5;
            }

            50% {
              opacity: 1;
            }

            100% {
              transform: translateY(20rpx);
              opacity: 0.5;
            }
          }

          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
            }

            50% {
              transform: scale(1.05);
            }
          }

          @keyframes bounce {
            0%,
            20%,
            50%,
            80%,
            100% {
              transform: translateY(0);
            }

            40% {
              transform: translateY(-8rpx);
            }

            60% {
              transform: translateY(-4rpx);
            }
          }
        }

        // 动画效果
        @keyframes flowDown {
          0% {
            transform: translateY(-20rpx);
            opacity: 0.5;
          }

          50% {
            opacity: 1;
          }

          100% {
            transform: translateY(20rpx);
            opacity: 0.5;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.05);
          }
        }

        @keyframes bounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0);
          }

          40% {
            transform: translateY(-8rpx);
          }

          60% {
            transform: translateY(-4rpx);
          }
        }
      }
    }
  }

  .u-collapse-content {
    color: $u-tips-color;
    font-size: 14px;
  }

  .u-percentage-slot {
    padding: 1px 5px;
    background-color: $u-warning;
    color: #fff;
    border-radius: 100px;
    font-size: 10px;
    // margin-right: -5px;
  }
</style>

<style lang="scss" scoped>
.assessment.report-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  color: #31284f;
  background: #fff8df;
}

.report-page .content {
  position: relative;
  z-index: 1;
  height: auto;
  min-height: calc(100vh - 100vh / 8);
  padding-bottom: 90rpx;
  background:
    radial-gradient(circle at 7% 24%, rgba(255, 212, 71, 0.28) 0 84rpx, transparent 86rpx),
    radial-gradient(circle at 96% 58%, rgba(165, 139, 255, 0.18) 0 126rpx, transparent 128rpx),
    linear-gradient(180deg, #fff7d9 0%, #fff4ed 43%, #f4efff 100%);
}

.report-orb {
  position: fixed;
  z-index: 0;
  pointer-events: none;
  border: 4rpx solid #392f59;
}

.report-orb--coral {
  top: 32%;
  left: -48rpx;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: #ff8f82;
  box-shadow: 10rpx 10rpx 0 #ffd447;
}

.report-orb--purple {
  right: -42rpx;
  bottom: 18%;
  width: 90rpx;
  height: 136rpx;
  border-radius: 48rpx;
  background: #a58bff;
  transform: rotate(-13deg);
}

.report-spark {
  position: fixed;
  z-index: 0;
  pointer-events: none;
  color: #ff765f;
  font-weight: 900;
}

.report-spark--one {
  top: 48%;
  left: 18rpx;
  font-size: 48rpx;
  transform: rotate(15deg);
}

.report-spark--two {
  top: 70%;
  right: 18rpx;
  color: #7c63e8;
  font-size: 54rpx;
  transform: rotate(-16deg);
}

.report-page .content .user-profile {
  position: relative;
  overflow: hidden;
  margin: 0 26rpx 18rpx;
  padding: 24rpx;
  border: 4rpx solid #392f59;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #fff 0%, #fff1ac 100%);
  box-shadow: 9rpx 9rpx 0 #ff8f82;

  &::after {
    content: '';
    position: absolute;
    right: 126rpx;
    bottom: -44rpx;
    width: 116rpx;
    height: 116rpx;
    border: 3rpx solid #392f59;
    border-radius: 50%;
    background: #79dfc2;
    opacity: 0.7;
  }
}

.report-page .content .user-profile .profile-left {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  height: auto;
  gap: 20rpx;
}

.avatar-frame {
  position: relative;
  flex-shrink: 0;
  width: 104rpx;
  height: 104rpx;
  border: 4rpx solid #392f59;
  border-radius: 50%;
  background: #a58bff;
  box-shadow: 5rpx 5rpx 0 #ff8f82;
}

.report-page .content .user-profile .avatar-image {
  width: 100%;
  height: 100%;
  border: 5rpx solid #fff;
  border-radius: 50%;
  box-sizing: border-box;
}

.avatar-star {
  position: absolute;
  right: -9rpx;
  bottom: -7rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38rpx;
  height: 38rpx;
  color: #392f59;
  border: 3rpx solid #392f59;
  border-radius: 50%;
  background: #79dfc2;
  font-size: 19rpx;
}

.report-page .content .user-profile .info {
  min-width: 0;
  gap: 6rpx;
}

.report-kicker,
.chart-kicker {
  align-self: flex-start;
  padding: 5rpx 11rpx;
  color: #392f59;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #ffd447;
  font-size: 16rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
  line-height: 1;
}

.report-page .content .user-profile .info .name {
  overflow: hidden;
  color: #31284f;
  font-size: 31rpx;
  font-weight: 900;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-page .content .user-profile .info .class.report-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
  color: #615878;
  font-size: 20rpx;
  line-height: 1.2;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34rpx;
  padding: 3rpx 10rpx;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #fff;
  box-sizing: border-box;
}

.meta-chip--age {
  background: #c9f4e6;
}

.meta-chip--date {
  background: #eee9ff;
}

.meta-label {
  margin-right: 5rpx;
  color: #7a728d;
  font-size: 17rpx;
  font-weight: 700;
}

.meta-value {
  color: #392f59;
  font-size: 18rpx;
  font-weight: 900;
}

.report-page .content .user-profile .profile-right {
  position: relative;
  z-index: 2;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 124rpx;
  height: 132rpx;
  margin-left: 16rpx;
  border: 3rpx solid #392f59;
  border-radius: 26rpx;
  background: #a58bff;
  box-shadow: 5rpx 5rpx 0 #ffd447;

  &:active {
    transform: translate(3rpx, 3rpx);
    box-shadow: 2rpx 2rpx 0 #ffd447;
  }
}

.report-page .content .user-profile .profile-right--shared {
  background: #79dfc2;
  box-shadow: 5rpx 5rpx 0 #a58bff;
  pointer-events: none;
}

.history-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46rpx;
  height: 46rpx;
  margin-bottom: 5rpx;
  border: 2rpx solid #392f59;
  border-radius: 15rpx;
  background: #fff;
}

.shared-icon-wrap {
  color: #7c63e8;
  font-size: 28rpx;
  font-weight: 900;
}

.report-page .content .user-profile .profile-right .report-list-image {
  width: 30rpx;
  height: 30rpx;
}

.history-title {
  color: #fff;
  font-size: 21rpx;
  font-weight: 900;
  line-height: 1.1;
}

.history-hint {
  margin-top: 5rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 16rpx;
  font-weight: 700;
}

.report-toolbox {
  position: relative;
  overflow: hidden;
  margin: 30rpx 28rpx 8rpx;
  padding: 24rpx;
  border: 4rpx solid #392f59;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #fff 0%, #f4efff 100%);
  box-shadow: 9rpx 9rpx 0 #79dfc2;
  box-sizing: border-box;

  &::after {
    content: '';
    position: absolute;
    top: -44rpx;
    right: -38rpx;
    width: 112rpx;
    height: 112rpx;
    border: 3rpx solid #392f59;
    border-radius: 50%;
    background: #ffd447;
    opacity: 0.72;
  }
}

.toolbox-heading {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.toolbox-kicker {
  display: inline-flex;
  margin-bottom: 6rpx;
  padding: 5rpx 10rpx;
  color: #392f59;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #ffb6ad;
  font-size: 16rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
  line-height: 1;
}

.toolbox-title {
  display: block;
  color: #31284f;
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1.2;
}

.toolbox-status {
  display: flex;
  align-items: center;
  margin-right: 58rpx;
  padding: 7rpx 13rpx;
  color: #615878;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #fff;
  font-size: 18rpx;
  font-weight: 800;
  line-height: 1;
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  margin-right: 7rpx;
  border: 2rpx solid #392f59;
  border-radius: 50%;
  background: #ffd447;
}

.toolbox-status--ready .status-dot {
  background: #79dfc2;
}

.toolbox-actions {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.toolbox-action {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 124rpx;
  margin: 0;
  padding: 16rpx;
  color: #392f59;
  border: 3rpx solid #392f59;
  border-radius: 24rpx;
  box-shadow: 5rpx 5rpx 0 rgba(57, 47, 89, 0.18);
  line-height: 1;
  text-align: left;
  box-sizing: border-box;

  &::after {
    border: 0;
  }

  &[disabled] {
    color: #837c92;
    background: #f2f0f4;
    opacity: 0.66;
  }
}

.toolbox-action--pdf {
  background: #fff1ac;
}

.toolbox-action--share {
  background: #d8f7eb;
}

.toolbox-action--pressed {
  transform: translate(3rpx, 3rpx);
  box-shadow: 2rpx 2rpx 0 rgba(57, 47, 89, 0.18);
}

.toolbox-action-icon {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 58rpx;
  height: 64rpx;
  margin-right: 13rpx;
  border: 3rpx solid #392f59;
  border-radius: 16rpx;
  box-sizing: border-box;
}

.pdf-icon {
  color: #fff;
  background: #ff765f;
  box-shadow: 3rpx 3rpx 0 #ffd447;

  text {
    font-size: 17rpx;
    font-weight: 900;
  }
}

.share-icon {
  background: #7c63e8;
  box-shadow: 3rpx 3rpx 0 #79dfc2;
}

.share-node {
  position: absolute;
  z-index: 2;
  width: 12rpx;
  height: 12rpx;
  border: 2rpx solid #392f59;
  border-radius: 50%;
  background: #fff;
}

.share-node--top {
  top: 9rpx;
  right: 9rpx;
}

.share-node--left {
  top: 25rpx;
  left: 9rpx;
}

.share-node--bottom {
  right: 9rpx;
  bottom: 9rpx;
}

.share-line {
  position: absolute;
  left: 18rpx;
  width: 24rpx;
  height: 3rpx;
  border-radius: 999rpx;
  background: #fff;
  transform-origin: left center;
}

.share-line--top {
  top: 28rpx;
  transform: rotate(-30deg);
}

.share-line--bottom {
  bottom: 27rpx;
  transform: rotate(30deg);
}

.toolbox-action-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
}

.toolbox-action-title {
  overflow: hidden;
  color: #392f59;
  font-size: 23rpx;
  font-weight: 900;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbox-action-hint {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 8rpx;
  color: #6f6880;
  font-size: 17rpx;
  font-weight: 650;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.toolbox-action-arrow {
  flex-shrink: 0;
  margin-left: 6rpx;
  color: #392f59;
  font-size: 36rpx;
  font-weight: 900;
}

.action-spinner {
  width: 25rpx;
  height: 25rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: toolboxSpin 0.8s linear infinite;
  box-sizing: border-box;
}

.privacy-note {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  margin-top: 18rpx;
  color: #716980;
  font-size: 19rpx;
  font-weight: 650;
  line-height: 1.35;
}

.privacy-lock {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 28rpx;
  margin-right: 9rpx;
  color: #fff;
  border: 2rpx solid #392f59;
  border-radius: 50%;
  background: #7c63e8;
  font-size: 15rpx;
  font-weight: 900;
}

@keyframes toolboxSpin {
  to {
    transform: rotate(360deg);
  }
}

.report-page .content .assessment-container {
  padding: 26rpx 28rpx 22rpx;
}

.report-page .content .assessment-container .assessment-card {
  width: 100%;
  height: 760rpx;
  overflow: hidden;
  border: 4rpx solid #392f59;
  border-radius: 36rpx;
  background: #fffdf6;
  box-shadow: 10rpx 10rpx 0 #ffd447;
  box-sizing: border-box;
}

.chart-heading {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 116rpx;
  padding: 22rpx 24rpx;
  border-bottom: 3rpx dashed rgba(57, 47, 89, 0.22);
  background: linear-gradient(135deg, #fff 0%, #fff5cb 100%);
  box-sizing: border-box;
}

.chart-kicker {
  display: inline-flex;
  margin-bottom: 7rpx;
  background: #79dfc2;
}

.report-page .content .assessment-container .assessment-card .assessment-title {
  position: static;
  width: auto;
  height: auto;
  color: #31284f;
  font-size: 27rpx;
  font-weight: 900;
  line-height: 1.15;
}

.chart-badge {
  flex-shrink: 0;
  padding: 9rpx 14rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 999rpx;
  background: #7c63e8;
  box-shadow: 3rpx 3rpx 0 #ff8f82;
  font-size: 19rpx;
  font-weight: 900;
}

.report-page .content .assessment-container .assessment-card .chart-area {
  top: 116rpx;
  width: 100%;
  height: 508rpx;
  background: transparent;
}

.report-page .content .assessment-container .assessment-card .recommendation-section {
  top: auto;
  bottom: 0;
  width: 100%;
  height: 136rpx;
  padding: 18rpx 20rpx;
  color: #392f59;
  border-top: 3rpx solid #392f59;
  border-radius: 0;
  background: linear-gradient(135deg, #eee9ff 0%, #d8f7eb 100%);
  box-shadow: none;
}

.report-page .content .assessment-container .assessment-card .recommendation-section .recommendation-marker {
  width: 12rpx;
  height: 82rpx;
  border: 2rpx solid #392f59;
  background: #ff8f82;
}

.report-page .content .assessment-container .assessment-card .recommendation-section .recommendation-label {
  color: #7c63e8;
  font-size: 20rpx;
  font-weight: 900;
}

.report-page .content .assessment-container .assessment-card .recommendation-section .recommendation-text {
  color: #392f59;
  font-size: 22rpx;
  font-weight: 650;
  line-height: 1.35;
}

.report-page .content .assessment-container .assessment-card .recommendation-section .recommendation-action {
  min-width: 72rpx;
  height: 44rpx;
  color: #fff;
  border: 2rpx solid #392f59;
  background: #7c63e8;
  box-shadow: 3rpx 3rpx 0 #ffd447;
  font-weight: 900;
  line-height: 44rpx;
}

.report-page .content .collapse {
  overflow: hidden;
  margin: 28rpx;
  border: 4rpx solid #392f59;
  border-radius: 32rpx;
  background: #fffdf7;
  box-shadow: 8rpx 8rpx 0 #a58bff;
}

.report-page .content .collapse :deep(.u-cell) {
  background: linear-gradient(135deg, #fff 0%, #fff1ac 100%);
}

.report-page .content .collapse :deep(.u-cell__body) {
  min-height: 110rpx;
  padding: 18rpx 22rpx;
}

.report-page .content .collapse :deep(.u-cell__right-icon-wrap) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin-left: 14rpx;
  border: 3rpx solid #392f59;
  border-radius: 50%;
  background: #fff;
  box-shadow: 3rpx 3rpx 0 #79dfc2;
}

.report-page .content .collapse :deep(.u-collapse-item__content__text) {
  padding: 22rpx;
  color: #392f59;
  font-size: 25rpx;
  line-height: 1.5;
}

.collapse-title-row {
  display: flex;
  align-items: center;
}

.collapse-index {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  margin-right: 16rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 18rpx;
  background: #7c63e8;
  box-shadow: 3rpx 3rpx 0 #ff8f82;
  font-size: 24rpx;
  font-weight: 900;
}

.collapse-title-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.collapse-title-text {
  overflow: hidden;
  color: #31284f;
  font-size: 29rpx;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collapse-title-hint {
  margin-top: 6rpx;
  color: #746d88;
  font-size: 19rpx;
  font-weight: 650;
}

.report-page .content .collapse .collapse-content .sectionScore {
  display: inline-flex;
  align-items: baseline;
  margin-bottom: 28rpx;
  padding: 10rpx 16rpx;
  border: 3rpx solid #392f59;
  border-radius: 999rpx;
  background: #c9f4e6;
  box-shadow: 4rpx 4rpx 0 #ffd447;
}

.score-label {
  margin-right: 10rpx;
  color: #615878;
  font-size: 21rpx;
  font-weight: 750;
}

.score-value {
  color: #7c63e8;
  font-size: 30rpx;
  font-weight: 900;
}

.report-page .content .collapse .collapse-content .abllsSection .abllsItem {
  align-items: center;
  margin-bottom: 22rpx;
  padding: 16rpx;
  border: 2rpx solid #392f59;
  border-radius: 20rpx;
  background: #fff;
}

.report-page .content .collapse .collapse-content .abllsSection .abllsItem .abllsItemTitle {
  width: 29%;
  padding-right: 12rpx;
  color: #392f59;
  font-size: 22rpx;
  font-weight: 800;
  box-sizing: border-box;
}

.report-page .content .collapse .collapse-content .abllsSection .abllsItem .abllsItemScore {
  width: 71%;
}

.report-page .content .collapse .collapse-content .sectionAnalysis {
  margin: 30rpx 0 36rpx;
  padding: 22rpx;
  border: 3rpx solid #392f59;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #d8f7eb 0%, #fff5cb 100%);
  box-shadow: 6rpx 6rpx 0 #a58bff;
}

.report-page .content .collapse .collapse-content .sectionAnalysis::before {
  height: 0;
}

.report-page .content .collapse .collapse-content .sectionAnalysis span {
  padding: 16rpx 18rpx;
  color: #392f59;
  border: 2rpx dashed rgba(57, 47, 89, 0.42);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: none;
  font-size: 24rpx;
  line-height: 1.6;
}

.report-page .content .collapse .collapse-skillBelowStandard {
  margin: 24rpx 0 38rpx;
  padding: 28rpx 22rpx;
  border: 3rpx solid #392f59;
  border-radius: 26rpx;
  background: linear-gradient(135deg, #fff0ed 0%, #ffdcd7 100%);
  box-shadow: 6rpx 6rpx 0 #ff8f82;
}

.skill-heading-row {
  display: flex;
  align-items: center;
  margin-bottom: 14rpx;
}

.report-page .content .collapse .collapse-skillBelowStandard .skill-header {
  margin-bottom: 26rpx;
  padding-bottom: 18rpx;
  border-bottom: 2rpx dashed #392f59;
}

.report-page .content .collapse .collapse-skillBelowStandard .skill-header .skill-title {
  color: #b33e4a;
  font-size: 30rpx;
  font-weight: 900;
}

.report-page .content .collapse .collapse-skillBelowStandard .skill-header .skill-title-desc {
  color: #6d6077;
  font-size: 24rpx;
  font-weight: 650;
}

.report-page .content .collapse .collapse-skillBelowStandard .section-divider .section-name {
  color: #392f59;
  border: 2rpx solid #392f59;
  background: #fff;
  box-shadow: 4rpx 4rpx 0 #ffd447;
  font-weight: 850;
}

.report-page .content .collapse .collapse-skillBelowStandard .skill-item {
  border: 2rpx solid #392f59;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 4rpx 4rpx 0 rgba(57, 47, 89, 0.14);
}

.report-page .content .collapse .collapse-skillBelowStandard .skill-badge {
  color: #fff;
  border: 2rpx solid #392f59;
  background: #ff765f;
  box-shadow: 3rpx 3rpx 0 #ffd447;
}

.report-page .content .collapse .collapse-skillBelowStandard .skill-content .skill-name {
  color: #392f59;
  font-weight: 900;
}

.report-page .content .collapse .collapse-skillBelowStandard .skill-content .skill-description {
  color: #6d6077;
}

.report-page .content .collapse .collapse-skillImprovementPlan {
  margin-bottom: 22rpx;
  padding: 34rpx 26rpx;
  border: 3rpx solid #392f59;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #fff1ac 0%, #ffdca3 100%);
  box-shadow: 7rpx 7rpx 0 #79dfc2;
}

.report-page .content .collapse .collapse-skillImprovementPlan .improvement-header {
  margin-bottom: 32rpx;
  padding-bottom: 20rpx;
  border-bottom: 2rpx dashed #392f59;
}

.report-page .content .collapse .collapse-skillImprovementPlan .improvement-header .improvement-title {
  color: #392f59;
  font-size: 30rpx;
  font-weight: 900;
}

.report-page .content .collapse .collapse-skillImprovementPlan .step-number:not(.sub-step):not(.final-step) {
  color: #fff;
  border: 2rpx solid #392f59;
  background: #7c63e8;
  box-shadow: 4rpx 4rpx 0 #ff8f82;
}

.report-page .content .collapse .collapse-skillImprovementPlan .step-number.sub-step {
  color: #392f59;
  border: 2rpx solid #392f59;
  background: #fff;
  box-shadow: 3rpx 3rpx 0 #79dfc2;
}

.report-page .content .collapse .collapse-skillImprovementPlan .step-content {
  border: 2rpx solid #392f59;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 4rpx 4rpx 0 rgba(57, 47, 89, 0.15);
}

.report-page .content .collapse .collapse-skillImprovementPlan .step-content.section-header {
  border-left: 6rpx solid #7c63e8;
  background: #eee9ff;
}

.report-page .content .collapse .collapse-skillImprovementPlan .step-content.section-header .step-title,
.report-page .content .collapse .collapse-skillImprovementPlan .step-content.task-content .step-title {
  color: #392f59;
  font-weight: 900;
}

.report-page .content .collapse .collapse-skillImprovementPlan .step-content.task-content .step-description {
  color: #615878;
  background: #fffaf0;
}

.report-page .content .collapse .collapse-skillImprovementPlan .step-line::after {
  background: repeating-linear-gradient(
    180deg,
    #7c63e8 0%,
    #7c63e8 10%,
    transparent 10%,
    transparent 20%
  );
}

.report-page .u-percentage-slot {
  padding: 3rpx 9rpx;
  color: #fff;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #7c63e8;
  font-size: 18rpx;
  font-weight: 850;
}
</style>
