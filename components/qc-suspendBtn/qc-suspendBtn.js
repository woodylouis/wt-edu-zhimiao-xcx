export const suspendBtnProps = {
  /**
   * 菜单类型
   * - LineUp :     竖向向上弹出菜单
   * - LineDown :   竖向向向下弹出菜单
   * - LineLeft :   横向向左弹出菜单
   * - LineRight :  横向向右弹出菜单
   * - SectorLeft:  向左弹出扇形菜单
   * - SectorRight: 向右弹出扇形菜单
   */
  openType: {
    type: String,
    default: 'LineUp',
  },
  // 主按钮
  mainBtn: {
    type: Object,
    default() {
      return {
        size: 60, // 按钮宽和高 单位px
        bgImg: '', // 按钮背景图
        initX: 30, // 初始水平位置
        initY: 300, // 初始垂直位置
        textBg: {
          content: '', //文字内容
          textStyle: '', //文字样式
          bgColor: '', // 背景色
        },
      }
    },
  },
  // 子按钮宽和高
  childSize: {
    type: Number, // 单位px
    default: 52,
  },
  // 子按钮
  childBtns: {
    type: Array,
    default() {
      return [
        {
          bgImg: '', // 按钮背景图 建议使用背景图 如使用文字 请使用text
          textBg: {
            content: '', //文字内容
            textStyle: '', //文字样式
            bgColor: '', // 背景色
          },
        },
      ]
    },
  },
  // 主按钮 到 子按钮 距离
  mainToChildMargin: {
    type: Number, // 单位px
    default: 50,
  },
  // 相邻子按钮 距离 * - LineUp LineDown LineLeft LineRight 有效
  childMargin: {
    type: Number, // 单位px
    default: 20,
  },
  // 可拖拽区域距离屏幕的最小距离 超过该距离后不能拖动
  padding: {
    type: Number, // 单位px
    default: 30,
  },
  // 是否可拖拽
  moveable: {
    type: Boolean, // 单位px
    default: true,
  },
  // tabbar高度  如果不是tabbar页面 请将高度设置为0
  tabbarHeight: {
    type: Number, // 单位px
    default: 0,
  },
}
