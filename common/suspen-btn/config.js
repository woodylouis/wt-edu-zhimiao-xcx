import { reactive } from "vue";

// 修改导出方式
export default {
    suspen: reactive({
        openType: 'LineLeft', //LineUp LineDown LineLeft LineRight SectorLeft SectorRight
        mainBtn: {
            size: 52,
            bgImg: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/cloudstorage/tools.png',
            icon: '✦',
            initX: 400,
            initY: 0,
        },
        childSize: 44,
        childBtns: [
            {
                bgImg: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/cloudstorage/exit-1.png',
                icon: '🧹',
                label: '清缓存'
            },
            {
                bgImg: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/cloudstorage/assessment.png',
                icon: '📝',
                label: '量表库'
            },
            {
                bgImg: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/cloudstorage/home.png',
                icon: '🏠',
                label: '回首页'
            }
        ],
        padding: 0,
    }),
    childClick: (i) => {
        console.log('点击了子按钮', i)
        if (i === 0) {
            uni.showModal({
                title: '确认操作',
                content: '确定要清除所有缓存并刷新页面吗？此操作将清除所有本地数据。',
                confirmText: '确定',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) {
                        uni.showLoading({
                            title: '清除缓存中...'
                        });

                        // 延迟执行，确保loading显示
                        setTimeout(() => {
                            uni.clearStorageSync();
                            uni.hideLoading();

                            uni.showToast({
                                title: '缓存已清除',
                                icon: 'success',
                                duration: 1500,
                                success: () => {
                                    // Toast显示完成后刷新页面
                                    setTimeout(() => {
                                        uni.reLaunch({
                                            url: '/pages/dashboard/teacher/teacher'
                                        })
                                    }, 1500);
                                }
                            });
                        }, 100);
                    }
                }
            });
        }
        else if (i === 1) {
            uni.navigateTo({
                url: '/pages/assessment/list'
            })
        } else if (i === 2) {
            uni.redirectTo({
                url: '/pages/enter-class/index'
            })
        }
    }
}
