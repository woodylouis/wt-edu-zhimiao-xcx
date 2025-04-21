import { reactive } from "vue";

// 修改导出方式
export default {
    suspen: reactive({
        openType: 'LineLeft', //LineUp LineDown LineLeft LineRight SectorLeft SectorRight
        mainBtn: {
            size: 52,
            bgImg: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/cloudstorage/tools.png',
            initX: 400,
            initY: 100,
        },
        childSize: 44,
        childBtns: [
            {
                bgImg: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/cloudstorage/assessment.png',
            },
            {
                bgImg: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/cloudstorage/home.png',
            },
        ],
        padding: 0,
    }),
    childClick: (i) => {
        console.log('点击了子按钮', i)
        if (i === 0) {
            uni.navigateTo({
                url: '/pages/assessment/list'
            })
        } else if (i === 1) {
            uni.redirectTo({
                url: '/pages/enter-class/index'
            })
        }
    }
}