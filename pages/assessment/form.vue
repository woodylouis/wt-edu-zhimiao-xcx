<template>
  <!-- // abc 量表报告 -->
  <view class="assessment">
    <view class="form-orb form-orb--yellow"></view>
    <view class="form-orb form-orb--purple"></view>
    <view class="form-spark form-spark--one">✦</view>
    <view class="form-spark form-spark--two">+</view>
    <custom-nav
      :xcxName="currentSection"
      :navCustomStyle="navCustomStyle"
      :needBar="false"
      :needBack="true"
      :backHandler="handleNavBack"
    />
    <view class="content">
      <view class="steps-container">
        <scroll-view scroll-x class="steps-scroll" show-scrollbar="false">
          <view class="steps-wrapper">
            <view
              v-for="(item, index) in currentAbllsNameList"
              :key="item.abllsSectionAlphabet"
              class="step-item"
              :class="{
                active: index === stepCurrentIndex,
                completed: isStepCompleted(item),
              }"
              @click="handleStepClick(item, index)"
            >
              <view class="step-number">{{ index + 1 }}</view>
              <text class="step-name">{{ item.sectionName }}</text>
              <text v-if="isStepCompleted(item)" class="step-completed-mark">✓</text>
            </view>
          </view>
        </scroll-view>
      </view>
      <!-- 题目 -->
      <view class="question-container">
        <view class="question-meta">
          <view class="question-counter">
            <text class="counter-current">{{ current }}</text>
            <text class="counter-total">/ {{ count }} 题</text>
          </view>
          <view class="section-chip">
            <text class="section-chip-dot"></text>
            <text>{{ section || '成长任务' }}</text>
          </view>
        </view>
        <view class="question-progress-track">
          <view class="question-progress-value" :style="{ width: `${progressPercent}%` }"></view>
        </view>

        <view class="task-card">
          <view class="task-card-kicker">
            <text class="task-card-icon">🎯</text>
            <text>本题观察任务</text>
          </view>
          <text class="task-title">{{ taskName }}</text>
          <text class="task-description">{{ taskSample || taskObject }}</text>
        </view>

        <view class="playful-divider">
          <view></view><text>✦</text><view></view>
        </view>

        <view class="question-part">
          <view class="answer-card">
            <wt-radio
              :content="question"
              :options="questions[currentIndex]?.options"
              @change="handleOptionChange"
            />
          </view>
        </view>
      </view>

      <view class="bottom">
        <view class="nav-buttons">
          <view
            v-if="currentIndex > 0"
            class="assessment-action assessment-action--secondary"
            @click="backToPrevious"
          >
            <text class="action-arrow">←</text>
            <text>上一题</text>
          </view>
          <view
            class="assessment-action assessment-action--primary"
            :class="{ 'assessment-action--full': currentIndex === 0 }"
            @click="goToNext"
          >
            <text>下一题</text>
            <text class="action-arrow">→</text>
          </view>
        </view>
      </view>
    </view>
    <up-overlay :show="show">
      <view class="warp">
        <modal-box
          v-if="show"
          :tips="tips"
          :tips2="tips2"
          :items="confirmInfo"
          confirmText="生成报告"
          @cancel="show = false"
          cancelText="检查一下"
          extraText="返回单元列表"
          @extra="handleBackToModuleList"
          @create="handleConfirm"
        />
      </view>
    </up-overlay>
    <DopamineModal
      :show="promptModal.show"
      :eyebrow="promptModal.eyebrow"
      :title="promptModal.title"
      :content="promptModal.content"
      :confirm-text="promptModal.confirmText"
      :cancel-text="promptModal.cancelText"
      @confirm="handlePromptConfirm"
      @cancel="handlePromptCancel"
    />
    <DopamineLoading
      :show="loadingVisible"
      :text="loadingText"
      :subtext="loadingSubtext"
    />
  </view>
</template>

<script setup>
  import customNav from "@/components/customNav";
  import { onLoad, onUnload } from "@dcloudio/uni-app";
  import { ref, reactive, onMounted, computed, watch } from "vue";
  import wtRadio from "@/components/radio";
  import {
    ASSESS_STUDENT,
    CURRENT_ASSESSMENT_MODULE_STATUS,
  } from "@/lib/types/local_storage.js";
  import modalBox from "../../components/modalBox-v3/modalBox";
  import DopamineModal from "@/components/dopamine-modal/index.vue";
  import DopamineLoading from "@/components/dopamine-loading/index.vue";
  let classId = ref(""); // 通过班级idwatch
  const accessStudentInfo = uni.getStorageSync(ASSESS_STUDENT);
  const childId = accessStudentInfo.childId; // 通过childId获取儿童名字以及年龄
  const allAssessmentSections = accessStudentInfo.allAssessmentSections;
  const childAgeInt = accessStudentInfo.ageInt;
  const currentSectionId =
    accessStudentInfo.section.currentSection.currentSectionId;
  const currentSection =
    accessStudentInfo.section.currentSection.currentSection;
  let currentAbllsSectionAlphabet =
    accessStudentInfo.section.currentAbllsSection.abllsSectionAlphabet;
  let currentAbllsSectionName =
    accessStudentInfo.section.currentAbllsSection.sectionName;
  const sections = Object.values(allAssessmentSections).map((section) => ({
    sectionId: section.section_id,
    sectionName: section.abllsSections.map((item) => item.sectionName),
  }));
  const currentAbllsNameList = accessStudentInfo.section.abllsSectionsObj;
  const stepCurrentIndex = ref(
    currentAbllsNameList.findIndex(
      (item) => item.abllsSectionAlphabet === currentAbllsSectionAlphabet
    )
  );

  const currentAssessmentModuleStatus = uni.getStorageSync(
    CURRENT_ASSESSMENT_MODULE_STATUS
  );
  const recordId = currentAssessmentModuleStatus?.recordId;
  // 新增状态管理
  const questions = ref([]); // 题目列表
  const currentIndex = ref(0); // 当前题目索引
  const answers = ref([]);
  const selectedAnswer = ref("在10秒钟之内，能模仿5个音"); // 所有答案
  const current = computed(() => currentIndex.value + 1);
  const count = computed(() => questions.value.length);
  const progressPercent = computed(() => {
    if (!count.value) return 0;
    return Math.min(100, Math.round((current.value / count.value) * 100));
  });
  const section = computed(
    () => questions.value[currentIndex.value]?.ablls_r_section || ""
  );
  const question = computed(
    () => questions.value[currentIndex.value]?.content || ""
  );
  const options = reactive(() => questions[currentIndex]?.options || []);
  const expectedScore = computed(
    () => questions.value[currentIndex.value]?.expected_score || 0
  );
  const taskName = computed(
    () => questions.value[currentIndex.value]?.task_name || ""
  );
  const taskSample = computed(
    () => questions.value[currentIndex.value]?.task_sample || ""
  );
  const taskObject = computed(
    () => questions.value[currentIndex.value]?.task_object || ""
  );
  const assessmentRecords = ref({}); // 每个ablls section的缓存，存储所有已加载的题目记录，例如：{ LANG_1_E: [] }
  const assessmentRecordForm = ref({}); // 组织提交的表单数据
  const history = ref([]); // 记录每个ablls section的历史记录
  const singleAbllsSectionsForm = ref({}); // 当前ablls section的表单数据
  const allAbllsSectionsRecordForm = ref([]); // 所有ablls section的表单数据
  const show = ref(false);
  const notStartedSection = ref([]);
  const completedSection = ref([]);
  const inProgressSection = ref([]);
  const tips = ref("当前模块题目已完成。以下是小结：");
  const tips2 = ref("");
  const isClickNavBack = ref(false);
  const allAssessmentModulesCompleted = ref(
    Boolean(currentAssessmentModuleStatus?.isCompleted)
  );
  const loadingVisible = ref(false);
  const loadingText = ref("正在准备评估题目");
  const loadingSubtext = ref("小芽在把任务卡片放整齐");

  const showDopamineLoading = (text, subtext) => {
    loadingText.value = text;
    loadingSubtext.value = subtext;
    loadingVisible.value = true;
  };

  const hideDopamineLoading = () => {
    loadingVisible.value = false;
  };
  const promptModal = reactive({
    show: false,
    type: "",
    eyebrow: "温馨提示",
    title: "确认继续吗？",
    content: "",
    confirmText: "确定",
    cancelText: "取消",
  });
  const firstUncompletedSection = ref(null);

  const openPromptModal = (options) => {
    Object.assign(promptModal, {
      show: true,
      type: "",
      eyebrow: "温馨提示",
      title: "确认继续吗？",
      content: "",
      confirmText: "确定",
      cancelText: "取消",
      ...options,
    });
  };

  const closePromptModal = () => {
    promptModal.show = false;
    promptModal.type = "";
    firstUncompletedSection.value = null;
  };

  const handlePromptConfirm = () => {
    const modalType = promptModal.type;
    const pendingSection = firstUncompletedSection.value;
    closePromptModal();

    if (modalType === "uncompleted" && pendingSection) {
      handleStepClick(pendingSection.item, pendingSection.index);
      return;
    }

    if (modalType === "back-after-save") {
      isClickNavBack.value = false;
      uni.redirectTo({
        url: allAssessmentModulesCompleted.value
          ? "/pages/assessment/listMoudules?reviewCompleted=1"
          : "/pages/assessment/listMoudules",
      });
    }
  };

  const handlePromptCancel = () => {
    if (promptModal.type === "back-after-save") {
      isClickNavBack.value = false;
    }
    closePromptModal();
  };
  // const tips2 = ref('本评测还有模块未完成。');

  // 监听selectedAnswer变化
  watch(selectedAnswer, (newValue, oldValue) => {
    console.log("selectedAnswer changed:", newValue, "from:", oldValue);
  });

  let buttonStyle1 = {
    backgroundColor: "rgba(110, 221, 138, 1)",
    color: "rgba(0, 33, 77, 1)",
    borderRadius: "48rpx",
    fontWeight: "500",
    fontSize: "32rpx",
    padding: "26rpx 0",
    height: "48px",
    marginTop: "40rpx",
  };
  let buttonStyle2 = {
    backgroundColor: "#FFFFFF",
    color: "#6EDD8A",
    border: "2px solid #6EDD8A",
    borderRadius: "48rpx",
    fontWeight: "500",
    fontSize: "32rpx",
    padding: "26rpx 0",
    height: "48px",
    marginTop: "40rpx",
    fontWeight: "500",
  };

  const navCustomStyle =
    "background: linear-gradient(135deg, #FFD86F 0%, #FFB3A8 52%, #C5B5FF 100%);height: calc(100vh / 8)";

  const assessmentMeta = {
    recordId: recordId,
    assessmentId: accessStudentInfo.assessmentId,
    assessorId: uni.getStorageSync("uni-id-pages-userInfo")._id,
    assessorName: uni.getStorageSync("uni-id-pages-userInfo").nickname,
    ...accessStudentInfo,
    startTimestamp: Date.now(),
    completionTime: 0,
    duration: 0,
    hasCompleted: false, // 该部分是否已完成
    sectionId: currentSectionId,
  };

  const confirmInfo = ref([
    // {
    //     label: "本次评估的大类：",
    //     name: currentSection,
    // },
    // {
    //     label: "已完成的大类：",
    //     name: `${completedSection.value.map(u => u.sectionName).join(', ')}`,
    // },
    // {
    //     label: "正在进行的大类：",
    //     name: `${inProgressSection.value.map(u => u.sectionName).join(', ')}`,
    // },
    // {
    //     label: "未开始的大类：",
    //     name: `${notStartedSection.value.map(u => u.sectionName).join(', ')}`,
    // }
  ]);

  // console.log('assessmentMeta:', assessmentMeta)

  const handleNavBack = () => {
    const checkModuleStatus = false;
    const confirmToGenerateReport = false;
    prepareAllRecords(checkModuleStatus, confirmToGenerateReport);
    // 删除当前页面page stack
    const pages = getCurrentPages();
    isClickNavBack.value = true;
    console.log(pages);
  };

  const handleConfirm = async () => {
    const checkModuleStatus = true;
    const confirmToGenerateReport = true;
    showDopamineLoading("正在提交成长评估", "小芽正在整理答题记录和成长线索");
    try {
      const result = await prepareAllRecords(
        checkModuleStatus,
        confirmToGenerateReport
      );
      if (result?.skipped) return;
      if (confirmToGenerateReport) {
        changeStatus();
      }
      const params = [
        result?.taskId ? `taskId=${encodeURIComponent(result.taskId)}` : '',
        `recordId=${encodeURIComponent(assessmentMeta.recordId)}`,
        `childId=${encodeURIComponent(assessmentMeta.childId)}`
      ].filter(Boolean).join('&');
      uni.redirectTo({ url: `/pages/assessment/afterAssess?${params}` });
    } catch (error) {
      console.error("提交评测失败:", error);
      uni.showToast({
        title: error.message || "提交失败",
        icon: "none",
      });
    } finally {
      hideDopamineLoading();
    }
  };

  const handleBackToModuleList = () => {
    show.value = false;
    uni.redirectTo({
      url: allAssessmentModulesCompleted.value
        ? "/pages/assessment/listMoudules?reviewCompleted=1"
        : "/pages/assessment/listMoudules",
    });
  };

  const changeStatus = (sectionName, status) => {
    // 把在wtdb-business-assess-history和wtdb-business-assess-record的相关状态字段改成true
  };

  const isAllCompleted = computed(() => {
    return (
      questions.value.length > 0 &&
      answers.value.length === questions.value.length &&
      !answers.value.some((a) => !a || !a.text)
    );
  });

  const isStepCompleted = (item) => {
    return allAbllsSectionsRecordForm.value.some(
      (record) =>
        record.alphabet === item.abllsSectionAlphabet &&
        record.allQuestionsCompleted
    );
  };

  const restoreQuestionProgress = () => {
    let lastAnsweredIndex = -1;
    questions.value.forEach((item, index) => {
      if (item.options?.some((option) => option.selected)) {
        lastAnsweredIndex = index;
      }
    });
    currentIndex.value = Math.max(lastAnsweredIndex, 0);
  };

  const uploadRecord = async (childId) => {
    try {
      const result = await uniCloud.callFunction({
        name: "wt-fetch-assess-id",
        data: {
          childId,
          uniIdToken: uni.getStorageSync("uni_id_token"),
        },
      });
      // console.log('上传成功:', result);
    } catch (error) {
      console.error("上传失败:", error);
    }
  };

  const checkIfAllCompleted = (allAbllsSectionsRecordForm) => {
    // 计算本ablls section一共有多少个子模块
    const totalSubModules = currentAbllsNameList.length;
    // console.log('totalSubModules:', totalSubModules)
    // 计算已完成的子模块数量
    const completedSubModules =
      allAbllsSectionsRecordForm.filter(
        (section) => section.allQuestionsCompleted
      ).length || 0;

    console.log("completedSubModules:", completedSubModules);
    if (totalSubModules === completedSubModules) {
      // 所有子模块都已完成
      console.log("所有子模块都已完成");
      assessmentMeta.hasCompleted = true;

      // 所有模块完成了可以提交生成本section的报告了
    } else {
      // 还有未完成的子模块
      console.log("还有未完成的子模块");
      assessmentMeta.hasCompleted = false;
      // 与currentAbllsNameList对比，找出没完成的子模块，并找出对应的abllsSectionAlphabet的第几道题目没完成
      const uncompletedSubModules = currentAbllsNameList.filter(
        (section) => !section.allQuestionsCompleted
      );
      console.log("uncompletedSubModules:", uncompletedSubModules);
      const uncompletedAbllsSectionName = uncompletedSubModules.map(
        (section) => section.sectionName
      );
      console.log("uncompletedAbllsSectionName:", uncompletedAbllsSectionName);
      // 提示用户未完成的子模块
      // uni.showToast({
      //     title: `还有未完成的子模块: ${uncompletedAbllsSectionName.join(', ')}`,
      //     icon: 'none'
      // });
    }
  };
  const prepareAllRecords = (checkModuleStatus, isToGenerateReport) => {
    console.log("prepareAllRecords:", checkModuleStatus);
    console.log("isToGenerateReport:", isToGenerateReport);
    // 检查allAbllsSectionsRecordForm是否为空
    if (
      !allAbllsSectionsRecordForm.value ||
      allAbllsSectionsRecordForm.value.length === 0
    ) {
      console.log("allAbllsSectionsRecordForm为空，不上传");
      uni.redirectTo({ url: "/pages/assessment/listMoudules" });
      return Promise.resolve({ skipped: true });
    }
    const all = {
      ...assessmentMeta,
      assessmentRecords: allAbllsSectionsRecordForm.value,
    };
    console.log("all:", all);
    // 调用云函数上传评估记录
    return uniCloud
      .callFunction({
        name: "wtdb-upload-assess-history",
        data: {
          recordId: assessmentMeta.recordId,
          assessmentId: assessmentMeta.assessmentId,
          assessorId: assessmentMeta.assessorId,
          childId: assessmentMeta.childId,
          sectionId: assessmentMeta.sectionId,
          // 传递当前子模块信息
          currentSubSectionId: currentAbllsSectionAlphabet,
          currentSubSectionName: currentAbllsSectionName,
          currentSubSectionIndex: stepCurrentIndex.value,
          uniIdToken: uni.getStorageSync("uni_id_token"),
          data: all,
        },
      })
      .then((res) => {
        console.log("评估记录上传成功:", res);

        if (checkModuleStatus && !isToGenerateReport) {
          showDopamineLoading("正在检查完成进度", "每一颗成长小星星都会被认真记下");
          return generateReport(
            assessmentMeta.recordId,
            assessmentMeta.assessmentId,
            assessmentMeta.assessorId,
            assessmentMeta.childId
          );
        } else if (checkModuleStatus && isToGenerateReport) {
          return generateReport(
            assessmentMeta.recordId,
            assessmentMeta.assessmentId,
            assessmentMeta.assessorId,
            assessmentMeta.childId,
            isToGenerateReport
          );

          console.log("确定生成报告");
        } else {
          if (isClickNavBack.value) {
            openPromptModal({
              type: "back-after-save",
              eyebrow: "进度已保存",
              title: "要返回单元列表吗？",
              content: "刚才的答题进度已经安全保存，下次可以继续完成。",
              confirmText: "返回列表",
              cancelText: "继续答题",
            });
          }
        }
      })
      .catch((err) => {
        console.error("评估记录上传失败:", err);
        throw err;
      });
  };

  const generateReport = async (
    recordId,
    assessmentId,
    assessorId,
    childId,
    confirmToGenerateReport
  ) => {
    // 生成报告
    console.log("生成报告");
    try {
      const res = await uniCloud.callFunction({
        name: "wt-business-report-gen-v2",
        data: {
          recordId,
          assessmentId,
          assessorId,
          childId,
          confirmToGenerateReport,
          uniIdToken: uni.getStorageSync("uni_id_token"),
        },
        timeout: 30000,
      });
      console.log("res:", res.result.data);
      console.log("res code:", res.result.code);

      if (res.result.code !== 200) {
        throw new Error(res.result.message || "报告任务创建失败");
      }

      if (res.result.code == 200 && res.result.data) {
        inProgressSection.value = res.result.data.inProgress;
        notStartedSection.value = res.result.data.notStarted;
        completedSection.value = res.result.data.completed;
        allAssessmentModulesCompleted.value =
          sections.length > 0 &&
          completedSection.value.length === sections.length &&
          inProgressSection.value.length === 0 &&
          notStartedSection.value.length === 0;
        const latestModules = [
          ...completedSection.value,
          ...inProgressSection.value,
          ...notStartedSection.value,
        ];
        const latestModulesMap = new Map(
          latestModules.map((item) => [item.sectionId, item])
        );
        const cachedModules = currentAssessmentModuleStatus?.modulesStatus || [];
        const modulesStatus = cachedModules.length
          ? cachedModules.map(
              (item) => latestModulesMap.get(item.sectionId) || item
            )
          : latestModules;
        const now = Date.now();
        uni.setStorageSync(CURRENT_ASSESSMENT_MODULE_STATUS, {
          ...currentAssessmentModuleStatus,
          modulesStatus,
          lastSectionId: currentSectionId,
          lastSectionIndex: sections.findIndex(
            (item) => item.sectionId === currentSectionId
          ),
          isCompleted: allAssessmentModulesCompleted.value,
          lastSaveTime: now,
          lastCompletedTime: allAssessmentModulesCompleted.value
            ? currentAssessmentModuleStatus?.lastCompletedTime || now
            : currentAssessmentModuleStatus?.lastCompletedTime,
        });
        console.log("inProgressSection:", inProgressSection.value);
        console.log("notStartedSection:", notStartedSection.value);
        console.log("completedSection:", completedSection.value);
        if (!confirmToGenerateReport) {
          tips.value = `以下是本次评测完成情况：`;
          confirmInfo.value = [
            {
              label: "已完成的模块：",
              name:
                completedSection.value
                  .map(
                    (u) =>
                      u.sectionName +
                      (u.sectionName === currentSection ? "(当前)" : "")
                  )
                  .join("\n") || "无",
            },
            {
              label: "正在进行模块：",
              name:
                inProgressSection.value.map((u) => u.sectionName).join("\n") ||
                "无",
            },
            {
              label: "未开始的模块：",
              name:
                notStartedSection.value.map((u) => u.sectionName).join("\n") ||
                "无",
            },
          ];
          show.value = true;
          tips2.value =
            notStartedSection.value.length > 0 ||
            inProgressSection.value.length > 0
              ? "本评测还有模块未完成。如果继续，则只生成已完成的部分，其余将作废或忽略。"
              : "";
        }
        return res.result.data;
      }
      return res.result.data;
    } catch (error) {
      console.error("生成报告失败:", error);
      throw error;
    } finally {
      hideDopamineLoading();
    }
  };

  const handleOptionChange = async (item) => {
    try {
      const result = await updateSingleAbllsSectionsForm();
      if (result) {
        updateAllAbllsSectionsRecord();
      }
    } catch (error) {
      console.error("更新表单数据失败:", error);
    }
  };
  // 加载题目

  // 更新所有ablls section的表单数据
  const updateAllAbllsSectionsRecord = () => {
    // 如果singleAbllsSectionsForm里面没有数据，不更新allAbllsSectionsRecordForm
    if (
      !singleAbllsSectionsForm.value ||
      Object.keys(singleAbllsSectionsForm.value).length === 0
    ) {
      return;
    }

    if (singleAbllsSectionsForm.value) {
      const index = allAbllsSectionsRecordForm.value.findIndex(
        // 需要先判断列表里有没有这个abllsSectionAlphabet，有的话删掉再加入，没有的话直接加入
        (item) => item.alphabet === singleAbllsSectionsForm.value.alphabet
      );
      if (index > -1) {
        allAbllsSectionsRecordForm.value.splice(index, 1);
      }
      allAbllsSectionsRecordForm.value.push({
        ...singleAbllsSectionsForm.value,
      });
      // 最后把allAbllsSectionsRecordForm里面的所有数据都更新到assessmentRecordForm里面
      assessmentRecordForm.value = {
        sectionId: currentSectionId,
        sectionName: currentSection,
        assessmentRecords: allAbllsSectionsRecordForm.value,
      };
      console.log("assessmentRecordForm:", assessmentRecordForm.value);
    }
  };

  // 当前ablls section的表单数据
  const updateSingleAbllsSectionsForm = () => {
    return new Promise((resolve) => {
      singleAbllsSectionsForm.value = {
        totalQuestions: questions.value.length,
        alphabet: currentAbllsSectionAlphabet,
        sectioName: currentAbllsSectionName,
        questions: questions.value.map((q) => {
          const selectedOption = q.options?.find((opt) => opt.selected);
          if (selectedOption) {
            return {
              ...q,
              score: selectedOption.score,
              isStandard:
                selectedOption.score >= q.expected_score ? true : false,
            };
          }
          return q;
        }),
        expectedTotalScore: questions.value.reduce((total, question) => {
          return total + question.expected_score;
        }, 0),
        actualTotalScore: questions.value.reduce((total, question) => {
          const selectedOption = question.options.find(
            (option) => option.selected
          );
          return total + (selectedOption ? selectedOption.score : 0);
        }, 0),
        // 每次更新都需要检查本子模块是否所有题目都已完成
        allQuestionsCompleted:
          questions.value.length > 0 &&
          questions.value.every((q) => q.options.some((opt) => opt.selected)),
      };
      console.log("singleAbllsSectionsForm:", singleAbllsSectionsForm.value);
      resolve(true);
    });
  };

  // 在handleSubmit后添加返回上一题逻辑
  const backToPrevious = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--;
      // console.log('questions:', questions.value)
    }
  };

  const goToNext = () => {
    // 检查当前题目是否已填写
    const currentQuestion = questions.value[currentIndex.value];
    const hasSelectedOption = currentQuestion?.options?.some(
      (opt) => opt.selected
    );

    if (!hasSelectedOption) {
      uni.showToast({
        title: "请先填写当前题目",
        icon: "none",
        duration: 2000,
      });
      return;
    }
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++;
      checkIfAllCompleted(allAbllsSectionsRecordForm.value);
      prepareAllRecords(false, false);
    } else {
      // 当前标签下所有题目已完成
      checkIfAllCompleted(allAbllsSectionsRecordForm.value);

      // 自动切换到下一个标签
      const nextIndex = stepCurrentIndex.value + 1;
      if (nextIndex < currentAbllsNameList.length) {
        handleStepClick(currentAbllsNameList[nextIndex], nextIndex);
      } else {
        // 检查是否有未完成的子模块
        const uncompleted = currentAbllsNameList.filter(
          (item) =>
            !allAbllsSectionsRecordForm.value.some(
              (record) =>
                record.alphabet === item.abllsSectionAlphabet &&
                record.allQuestionsCompleted
            )
        );

        if (uncompleted.length > 0) {
          const firstUncompleted = currentAbllsNameList.findIndex(
            (item) =>
              item.abllsSectionAlphabet ===
              uncompleted[0].abllsSectionAlphabet
          );
          firstUncompletedSection.value = {
            item: uncompleted[0],
            index: firstUncompleted,
          };
          openPromptModal({
            type: "uncompleted",
            eyebrow: "还有成长任务",
            title: "先完成剩余子模块吧",
            content: `还未完成：${uncompleted
              .map((item) => item.sectionName)
              .join("、")}`,
            confirmText: "前往完成",
            cancelText: "稍后再说",
          });
        } else {
          console.log("allAssessmentSections", allAssessmentSections);
          const checkModuleStatus = true;
          const confirmToGenerateReport = false;
          prepareAllRecords(checkModuleStatus, confirmToGenerateReport);
        }
      }
    }
  };

  const handleStepClick = async (item, index) => {
    if (stepCurrentIndex.value === index) return;

    showDopamineLoading("正在切换成长任务", "新题目卡片马上就位");
    try {
      // 更新当前section信息
      // console.log('item:', item)

      currentAbllsSectionAlphabet = item.abllsSectionAlphabet;
      currentAbllsSectionName = item.sectionName;
      // 需要更新本地缓存
      accessStudentInfo.section.currentAbllsSection.abllsSectionAlphabet =
        currentAbllsSectionAlphabet;
      // accessStudentInfo.section.currentAbllsSection.sectionName = currentAbllsSectionName;
      // 1. currentAbllsSectionIdx在currentAbllsNameList里面通过currentAbllsSectionAlphabet找到对应的index，
      const currentAbllsSectionIdx = currentAbllsNameList.findIndex(
        (item) => item.abllsSectionAlphabet === currentAbllsSectionAlphabet
      );
      // 2. 找到后把对象全部复制到accessStudentInfo.section.currentAbllsSection里面
      if (currentAbllsSectionIdx > -1) {
        accessStudentInfo.section.currentAbllsSection = {
          ...currentAbllsNameList[currentAbllsSectionIdx],
        };
      }
      // 3. 然后赋值给accessStudentInfo.section.currentAbllsSection.currentAbllsSectionIdx
      accessStudentInfo.section.currentAbllsSection.currentAbllsSectionIdx =
        currentAbllsSectionIdx;
      // 4. 然后拿到currentAbllsNameList的长度赋值给accessStudentInfo.section.currentAbllsSection.currentAbllsSectionLength
      accessStudentInfo.section.currentAbllsSection.currentAbllsSectionLength =
        currentAbllsNameList.length;
      // 5. 最后更新localstorage
      // console.log('accessStudentInfo:', accessStudentInfo)
      uni.setStorageSync(ASSESS_STUDENT, accessStudentInfo);

      uni.setStorageSync(ASSESS_STUDENT, accessStudentInfo);
      await loadQuestions(
        currentSectionId,
        item.abllsSectionAlphabet,
        childAgeInt
      );
      stepCurrentIndex.value = index;
      restoreQuestionProgress();
      // console.log('singleAbllsSectionsForm:', singleAbllsSectionsForm.value)
      updateAllAbllsSectionsRecord();
    } catch (e) {
      console.log(e);
      uni.showToast({ title: "加载失败", icon: "none" });
    } finally {
      hideDopamineLoading();
    }
  };

  const fetchHistory = async (recordId, sectionId, assessorId, childId) => {
    try {
      const res = await uniCloud.callFunction({
        name: "wtdb-fetch-assess-history",
        data: {
          recordId,
          sectionId,
          assessorId,
          childId,
          uniIdToken: uni.getStorageSync("uni_id_token"),
        },
      });

      if (res.result.code == 200) {
        // 查询到有该section的历史记录
        if (res.result.data && res.result.data.length > 0) {
          const history = res.result.data[0];
          // TODO: 只出现一次，后续需要优化，先注释掉
          // if (history.hasCompleted) {
          //     uni.showModal({
          //         title: '提示',
          //         content: '该部分已完成，是否修改？修改后报告将重新生成。',
          //         confirmText: '去修改',
          //         cancelText: '返回',
          //         showCancel: true,
          //         success: (res) => {
          //             if (res.confirm) {
          //                 console.log('用户点击确定')
          //             } else if (res.cancel) {
          //                 console.log('用户点击取消')
          //                 // 返回上一页
          //                 uni.navigateBack();
          //             }
          //         }
          //     })
          // }
          console.log("history:", history.hasCompleted);
          allAbllsSectionsRecordForm.value = history.assessmentRecords; // 直接将所有记录赋值给allAbllsSectionsRecordForm
          const questions = mergeQuestions(
            history.assessmentRecords,
            currentAbllsSectionAlphabet
          );
          console.log("historyQuestions from mergeQuestions:", questions);
          return questions; // 返回合并后的题目列
        } else {
          console.log("没有查询到有该section的历史记录");
        }
      }
      return [];
      // console.log('res:', res)
    } catch (e) {
      console.log(e);
      uni.showToast({ title: "拉取加载失败", icon: "none" });
    }
  };

  const mergeQuestions = (historyQuestionsList, currentAlphabet) => {
    // 根据currentAlphabet找到historyQuestionsList里面对应的题目
    const historyQuestions =
      historyQuestionsList.find((item) => item.alphabet === currentAlphabet) ||
      [];
    console.log("mergeQuestions", historyQuestions);
    return historyQuestions.questions || [];
  };

  const loadQuestions = async (sectionId, abllsSectionAlphabet, age) => {
    // 检查是否已有缓存
    const cacheKey = `${sectionId}_${abllsSectionAlphabet}`;
    if (assessmentRecords.value[cacheKey]) {
      console.log("使用缓存的题目:", assessmentRecords.value);
      questions.value = assessmentRecords.value[cacheKey];
      return;
    }

    const historyQuestions = await fetchHistory(
      recordId,
      sectionId,
      assessmentMeta.assessorId,
      assessmentMeta.childId
    );
    console.log("historyQuestions:", historyQuestions);
    try {
      if (historyQuestions.length > 0) {
        questions.value = historyQuestions;
        assessmentRecords.value[cacheKey] = historyQuestions;
      } else {
        const res = await uniCloud.callFunction({
          name: "wt-fetch-assessment-v2",
          data: { sectionId, abllsSectionAlphabet, age },
        });

        if (res.result && res.result.data) {
          questions.value = res.result.data.questions;
          // console.log('正常拉取的题目:', questions.value)
          // 缓存题目数据
          assessmentRecords.value[cacheKey] = res.result.data.questions;
          // console.log('assessmentRecords:', assessmentRecords.value)
        }
      }
    } catch (e) {
      // console.log(e)
      uni.showToast({ title: "题目加载失败", icon: "none" });
    }
  };

  onLoad(async (options) => {
    // 初始化questions为tempQuestions的questions数组
    // console.log("options", options)
    // 新增加载提示
    showDopamineLoading(
      `正在准备${options.currentAbllsSection || "成长"}题目`,
      "小芽在把任务卡片放整齐"
    );

    try {
      await loadQuestions(
        currentSectionId,
        currentAbllsSectionAlphabet,
        childAgeInt
      );
      restoreQuestionProgress();
    } catch (e) {
      uni.showToast({ title: "加载失败，请返回重试", icon: "none" });
    } finally {
      hideDopamineLoading();
    }
  });

  onUnload(() => {
    prepareAllRecords(false, false);
  });
</script>

<style lang="scss" scoped>
  .assessment {
    .warp {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .content {
      // padding: 0 40rpx;
      background-color: #f2f7f6;
      height: calc(100vh - 100vh / 8);

      .steps-container {
        height: 4vh;
      }

      .button-group {
        position: fixed;
        top: 50%; // 固定在屏幕中间位置
        left: 40rpx;
        right: 40rpx;
        // gap: 32rpx; // 新增按钮间距
        display: flex;
        flex-direction: column;
      }

      .bottom {
        background-color: #ffffff;
        height: calc(100vh - calc(100vh / 8) - 4vh - 70vh - 30rpx);
        box-shadow: 0px -4px 12px 0px rgba(0, 0, 0, 0.08);

        .nav-buttons {
          position: fixed;
          bottom: 40rpx; // 调整底部导航位置
          left: 40rpx;
          right: 40rpx;
        }
      }

      .question-container {
        border-radius: 24px 24px 0px 0px;
        background: #fff;
        height: 70vh;
        margin-top: 30rpx;
        padding: 0 34rpx;
        // 底部内阴影
      }

      .question-part {
        margin-bottom: 0; // 移除原有底部间距
        min-height: 40vh; // 确保题目区域最小高度
      }

      .progress {
        margin-bottom: 36rpx;

        .title {
          color: #00214d;
          font-size: 16px;
          font-style: normal;
          font-weight: 500;
          line-height: 24px;
          justify-content: space-between;
          display: flex;
          margin-bottom: 30rpx;
        }

        .progress-bar {
          margin-bottom: 24rpx;
        }

        .current {
          color: #459c5c;
          font-feature-settings: "dlig" on;
          font-family: "Plus Jakarta Sans";
          font-size: 14px;
          font-style: normal;
          font-weight: 400;
          line-height: 21px;
          /* 150% */
        }
      }

      .question-part {
        margin-bottom: 280rpx;

        .section {
          color: #00214d;
          font-size: 24px;
          font-style: normal;
          font-weight: 700;
          line-height: 30px;
          margin-bottom: 24rpx;
          /* 125% */
        }

        .question {
          color: #0d1c12;
          font-size: 16px;
          font-style: normal;
          font-weight: 400;
          line-height: 24px;
          /* 150% */
        }
      }
    }
  }

  .steps-scroll {
    white-space: nowrap;
    width: 100%;
  }

  .steps-wrapper {
    display: flex;
    flex-direction: row;
    padding: 0 16rpx;
  }

  .step-item {
    flex-shrink: 0;
    padding: 16rpx 24rpx;
    border-bottom: 4rpx solid transparent;
    font-size: 26rpx;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  .step-item.completed {
    color: #287a43;
  }

  .step-completed-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30rpx;
    height: 30rpx;
    border-radius: 50%;
    background: #459c5c;
    color: #fff;
    font-size: 20rpx;
    font-weight: 600;
    line-height: 30rpx;
  }

  .step-item.active {
    color: rgba(0, 33, 77, 1);
    border-bottom-color: rgba(110, 221, 138, 1);
    font-weight: bold;
  }
</style>

<style lang="scss" scoped>
.assessment {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 7% 27%, rgba(255, 211, 66, 0.24), transparent 23%),
    radial-gradient(circle at 93% 54%, rgba(139, 105, 238, 0.17), transparent 27%),
    linear-gradient(180deg, #fff1b7 0%, #fff8e8 20%, #f7f3ff 62%, #edfaf5 100%);
}

.form-orb,
.form-spark {
  position: fixed;
  z-index: 0;
  pointer-events: none;
}

.form-orb {
  border-radius: 50%;
}

.form-orb--yellow {
  width: 170rpx;
  height: 170rpx;
  top: 30vh;
  left: -90rpx;
  background: rgba(255, 204, 59, 0.22);
}

.form-orb--purple {
  width: 190rpx;
  height: 190rpx;
  right: -105rpx;
  bottom: 16vh;
  background: rgba(133, 98, 232, 0.15);
}

.form-spark {
  color: #ff7e91;
  font-size: 38rpx;
  font-weight: 900;
}

.form-spark--one {
  top: 34vh;
  right: 18rpx;
  transform: rotate(14deg);
}

.form-spark--two {
  left: 22rpx;
  bottom: 22vh;
  color: #8065dd;
  font-size: 46rpx;
  transform: rotate(-18deg);
}

.assessment .content {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 100vh / 8);
  height: auto;
  box-sizing: border-box;
  padding: 18rpx 0 190rpx;
  background: transparent;
}

.assessment .content .steps-container {
  width: calc(100% - 48rpx);
  height: auto;
  margin: 0 24rpx;
  padding: 10rpx 0 14rpx;
  overflow: hidden;
  border: 3rpx solid #44365f;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 5rpx 6rpx 0 rgba(68, 54, 95, 0.13);
}

.steps-wrapper {
  display: inline-flex;
  min-width: 100%;
  gap: 8rpx;
  box-sizing: border-box;
  padding: 0 22rpx 0 10rpx;
}

.step-item {
  min-height: 54rpx;
  box-sizing: border-box;
  gap: 6rpx;
  padding: 7rpx 10rpx 7rpx 7rpx;
  border: 2rpx solid #d9d0e1;
  border-radius: 21rpx;
  color: #74677f;
  background: #fbf9fc;
  font-size: 21rpx;
  font-weight: 700;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  box-sizing: border-box;
  border: 2rpx solid #77688a;
  border-radius: 13rpx;
  color: #77688a;
  background: #ffffff;
  font-size: 18rpx;
  font-weight: 900;
}

.step-name {
  max-width: 190rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-item.active {
  border-color: #44365f;
  color: #44365f;
  background: #fff0a8;
  box-shadow: 3rpx 4rpx 0 #ff8f82;
  font-weight: 900;
}

.step-item.active .step-number {
  border-color: #44365f;
  color: #ffffff;
  background: #7c63e8;
}

.step-item.completed {
  border-color: #65c7a5;
  color: #25775d;
  background: #e1f8ef;
}

.step-item.completed .step-number {
  border-color: #398f72;
  color: #28755e;
  background: #ffffff;
}

.step-completed-mark {
  width: 30rpx;
  height: 30rpx;
  border: 2rpx solid #44365f;
  color: #ffffff;
  background: #4dc39b;
  font-size: 18rpx;
  font-weight: 900;
}

.assessment .content .question-container {
  position: relative;
  height: auto;
  min-height: 650rpx;
  box-sizing: border-box;
  margin: 24rpx 24rpx 0;
  padding: 27rpx 26rpx 34rpx;
  overflow: hidden;
  border: 3rpx solid #44365f;
  border-radius: 34rpx;
  background: #fffef9;
  box-shadow: 8rpx 9rpx 0 rgba(68, 54, 95, 0.14);
}

.assessment .content .question-container::before {
  content: '';
  position: absolute;
  width: 118rpx;
  height: 118rpx;
  top: -64rpx;
  right: -42rpx;
  border-radius: 50%;
  background: rgba(255, 210, 68, 0.34);
}

.question-meta {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.question-counter {
  display: flex;
  align-items: baseline;
  color: #44365f;
}

.counter-current {
  font-size: 48rpx;
  font-weight: 950;
  line-height: 1;
}

.counter-total {
  margin-left: 6rpx;
  color: #83768f;
  font-size: 22rpx;
  font-weight: 750;
}

.section-chip {
  display: flex;
  align-items: center;
  max-width: 360rpx;
  box-sizing: border-box;
  gap: 8rpx;
  padding: 10rpx 15rpx;
  overflow: hidden;
  border: 2rpx solid #44365f;
  border-radius: 19rpx;
  color: #44365f;
  background: #a7ebd4;
  font-size: 21rpx;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-chip-dot {
  width: 12rpx;
  height: 12rpx;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #ff6f88;
  box-shadow: 0 0 0 4rpx rgba(255, 111, 136, 0.16);
}

.question-progress-track {
  width: 100%;
  height: 16rpx;
  box-sizing: border-box;
  margin-top: 18rpx;
  overflow: hidden;
  border: 2rpx solid #44365f;
  border-radius: 10rpx;
  background: #eee9f2;
}

.question-progress-value {
  min-width: 12rpx;
  height: 100%;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #ff758e 0%, #ffd447 48%, #66d3b1 100%);
  transition: width 0.28s ease;
}

.task-card {
  display: flex;
  flex-direction: column;
  margin-top: 25rpx;
  padding: 22rpx 22rpx 24rpx;
  border: 3rpx solid #44365f;
  border-radius: 27rpx;
  background: linear-gradient(135deg, #fff0aa 0%, #ffd9ae 100%);
  box-shadow: 5rpx 5rpx 0 #ff9d91;
}

.task-card-kicker {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #8f5d20;
  font-size: 20rpx;
  font-weight: 850;
  letter-spacing: 1rpx;
}

.task-card-icon {
  font-size: 25rpx;
}

.task-title {
  margin-top: 11rpx;
  color: #392e52;
  font-size: 32rpx;
  font-weight: 950;
  line-height: 1.38;
}

.task-description {
  margin-top: 11rpx;
  color: #65566d;
  font-size: 23rpx;
  font-weight: 620;
  line-height: 1.58;
}

.playful-divider {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 26rpx 4rpx 20rpx;
  color: #8c6be8;
  font-size: 25rpx;
}

.playful-divider view {
  height: 2rpx;
  flex: 1;
  background: repeating-linear-gradient(90deg, #b8acc4 0 10rpx, transparent 10rpx 18rpx);
}

.assessment .content .question-part {
  min-height: 0;
  margin: 0;
}

.answer-card {
  padding-top: 2rpx;
}

.assessment .content .bottom {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  height: auto;
  box-sizing: border-box;
  padding: 19rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top: 3rpx solid #44365f;
  background: rgba(255, 254, 249, 0.96);
  box-shadow: 0 -9rpx 24rpx rgba(68, 54, 95, 0.15);
}

.assessment .content .bottom .nav-buttons {
  position: static;
  display: flex;
  gap: 18rpx;
}

.assessment-action {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 84rpx;
  box-sizing: border-box;
  flex: 1;
  gap: 13rpx;
  border: 3rpx solid #44365f;
  border-radius: 27rpx;
  font-size: 28rpx;
  font-weight: 900;
}

.assessment-action:active {
  transform: translateY(3rpx);
  box-shadow: none;
}

.assessment-action--secondary {
  color: #5d4f6b;
  background: #ffffff;
  box-shadow: 5rpx 6rpx 0 #c7b8d5;
}

.assessment-action--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #ff728b 0%, #8a68e9 100%);
  box-shadow: 5rpx 6rpx 0 #ffd447;
}

.assessment-action--full {
  width: 100%;
  flex-basis: 100%;
}

.action-arrow {
  font-size: 32rpx;
  font-weight: 950;
}

.assessment .warp {
  padding: 30rpx;
  box-sizing: border-box;
}
</style>
