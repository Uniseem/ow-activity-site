export type CopyField = {
  key: string;
  group: string;
  label: string;
  defaultValue: string;
  required: boolean;
};
export const copyFields: CopyField[] = [
  {
    key: "brand.name",
    group: "品牌信息",
    label: "站点名称",
    defaultValue: "先锋活动站",
    required: true,
  },
  {
    key: "brand.badge",
    group: "品牌信息",
    label: "名称旁标识",
    defaultValue: "SJTU",
    required: false,
  },
  {
    key: "brand.subtitle",
    group: "品牌信息",
    label: "英文副标题",
    defaultValue: "OVERWATCH COMMUNITY",
    required: false,
  },
  {
    key: "brand.metaDescription",
    group: "品牌信息",
    label: "站点简介",
    defaultValue: "非官方玩家活动报名与资料审核平台",
    required: false,
  },
  {
    key: "home.eyebrow",
    group: "首页介绍",
    label: "首页顶部标语",
    defaultValue: "SJTU · OVERWATCH COMMUNITY",
    required: false,
  },
  {
    key: "home.title1",
    group: "首页介绍",
    label: "首页主标题（第一行）",
    defaultValue: "今晚，",
    required: true,
  },
  {
    key: "home.title2",
    group: "首页介绍",
    label: "首页主标题（第二行）",
    defaultValue: "一起开一局。",
    required: false,
  },
  {
    key: "home.description",
    group: "首页介绍",
    label: "首页介绍文字",
    defaultValue:
      "找到合拍的队友，加入期待已久的内战。\n让每一次集结，都值得期待。",
    required: false,
  },
  {
    key: "footer.text",
    group: "页脚信息",
    label: "页脚标语",
    defaultValue: "先锋活动站 · 为每一次集结",
    required: false,
  },
  {
    key: "footer.note",
    group: "页脚信息",
    label: "页脚说明",
    defaultValue: "守望先锋玩家自发社区，与暴雪娱乐无隶属关系。",
    required: false,
  },
];
