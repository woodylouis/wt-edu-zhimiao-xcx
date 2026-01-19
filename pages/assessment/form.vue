<template>
  <!-- // abc 量表报告 -->
  <view class="assessment">
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
              :key="index"
              class="step-item"
              :class="{ active: index === stepCurrentIndex }"
              @click="handleStepClick(item, index)"
            >
              {{ item.sectionName }}
            </view>
          </view>
        </scroll-view>
      </view>
      <!-- 题目 -->
      <view class="question-container">
        <view
          style="
            display: flex;
            width: 100%;
            padding-top: 40rpx;
            align-items: center;
          "
        >
          <p>第{{ current }}题/共{{ count }}题</p>
          <u-tag
            :text="section"
            plain
            type="warning"
            borderColor="#6EDD8A"
            bgColor="#6EDD8A"
            color="#00214D"
            shape="circle"
            style="padding-left: 22rpx"
          ></u-tag>
        </view>
        <view class="" style="padding-top: 42rpx">
          <view class="section">
            <p
              style="
                color: #3d464a;
                font-size: 22px;
                font-style: normal;
                font-weight: 600;
                line-height: normal;
              "
            >
              {{ taskName }}
            </p>
          </view>
          <view class="" style="padding-top: 18rpx">
            <p
              style="
                color: #3d464a;
                font-size: 13px;
                font-style: normal;
                font-weight: 400;
                line-height: 20px; /* 153.846% */
              "
            >
              {{ task_sample ? task_sample : taskObject }}
            </p>
          </view>
        </view>

        <u-divider></u-divider>

        <view class="question-part">
          <view style="padding-top: 6rpx">
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
          <view style="display: flex; width: 100%">
            <u-button
              v-if="currentIndex > 0"
              @click="backToPrevious"
              :custom-style="{
                ...buttonStyle2,
                position: 'fixed',
                bottom: '60rpx',
                width: '300rpx',
              }"
              >上一题</u-button
            >
            <u-button
              @click="goToNext"
              :custom-style="{
                ...buttonStyle1,
                position: 'fixed',
                bottom: '60rpx',
                right: '40rpx',
                width: '300rpx',
              }"
              >下一题</u-button
            >
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
          :cancelText="'不生成报告'"
          @create="handleConfirm"
        />
      </view>
    </up-overlay>
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

  const navCustomStyle = "background: #F2F7F6;height: calc(100vh / 8)";

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

  const handleConfirm = () => {
    const checkModuleStatus = true;
    const confirmToGenerateReport = true;
    prepareAllRecords(checkModuleStatus, confirmToGenerateReport);
    uni.redirectTo({ url: "/pages/assessment/afterAssess" });
    // TO-DO: 更改状态
    if (confirmToGenerateReport) {
      changeStatus();
    }
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

  const uploadRecord = async (childId) => {
    try {
      const result = await uniCloud.callFunction({
        name: "wt-fetch-assess-id",
        data: { childId },
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
      return;
    }
    const all = {
      ...assessmentMeta,
      assessmentRecords: allAbllsSectionsRecordForm.value,
    };
    console.log("all:", all);
    // 调用云函数上传评估记录
    uniCloud
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
          data: all,
        },
      })
      .then((res) => {
        console.log("评估记录上传成功:", res);

        if (checkModuleStatus && !isToGenerateReport) {
          uni.showLoading({ title: "分析完成状态...", mask: true });
          generateReport(
            assessmentMeta.recordId,
            assessmentMeta.assessmentId,
            assessmentMeta.assessorId,
            assessmentMeta.childId
          );
        } else if (checkModuleStatus && isToGenerateReport) {
          generateReport(
            assessmentMeta.recordId,
            assessmentMeta.assessmentId,
            assessmentMeta.assessorId,
            assessmentMeta.childId,
            isToGenerateReport
          );

          console.log("确定生成报告");
        } else {
          if (isClickNavBack.value) {
            uni.showModal({
              title: "提示",
              content: "进度保存成功。是否返回到上一页？",
              success: (res) => {
                if (res.confirm) {
                  uni.redirectTo({ url: "/pages/assessment/listMoudules" });
                  isClickNavBack.value = false;
                } else if (res.cancel) {
                  console.log("用户取消返回");
                  isClickNavBack.value = false;
                }
              },
            });
          }
        }
      })
      .catch((err) => {
        console.error("评估记录上传失败:", err);
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
        },
        timeout: 30000, // 10秒超时
      });
      console.log("res:", res.result.data);
      console.log("res code:", res.result.code);

      if (res.result.code == 200 && res.result.data) {
        inProgressSection.value = res.result.data.inProgress;
        notStartedSection.value = res.result.data.notStarted;
        completedSection.value = res.result.data.completed;
        console.log("inProgressSection:", inProgressSection.value);
        console.log("notStartedSection:", notStartedSection.value);
        console.log("completedSection:", completedSection.value);
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
    } catch (error) {
      console.error("生成报告失败:", error);
      uni.hideLoading(); // 错误时隐藏loading
    } finally {
      uni.hideLoading(); // 无论成功失败都隐藏loading
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
          uni.showModal({
            title: "提示",
            content: `还有未完成的子模块: ${uncompleted
              .map((u) => u.sectionName)
              .join(", ")}`,
            confirmText: "前往完成",
            success: (res) => {
              if (res.confirm) {
                // 切换到第一个未完成的子模块
                const firstUncompleted = currentAbllsNameList.findIndex(
                  (item) =>
                    item.abllsSectionAlphabet ===
                    uncompleted[0].abllsSectionAlphabet
                );
                handleStepClick(uncompleted[0], firstUncompleted);
              }
            },
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

    uni.showLoading({ title: "加载题目...", mask: true });
    setTimeout(() => {
      uni.hideLoading();
    }, 3000);
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
      currentIndex.value = 0;
      // console.log('singleAbllsSectionsForm:', singleAbllsSectionsForm.value)
      updateAllAbllsSectionsRecord();
    } catch (e) {
      console.log(e);
      uni.showToast({ title: "加载失败", icon: "none" });
    } finally {
      uni.hideLoading();
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
    uni.showLoading({
      title: options.currentAbllsSection + "题目",
      mask: true,
    });

    try {
      await loadQuestions(
        currentSectionId,
        currentAbllsSectionAlphabet,
        childAgeInt
      );
    } catch (e) {
      uni.showToast({ title: "加载失败，请返回重试", icon: "none" });
    } finally {
      uni.hideLoading(); // 无论成功失败都关闭加载
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
  }

  .step-item.active {
    color: rgba(0, 33, 77, 1);
    border-bottom-color: rgba(110, 221, 138, 1);
    font-weight: bold;
  }
</style>
