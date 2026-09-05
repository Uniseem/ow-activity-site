import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit, TableCell, TableHeader } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "@tiptap/markdown";
import { safeArticleUrl } from "@/lib/article-input";

const SafeImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) =>
          safeArticleUrl(element.getAttribute("src") || "", true),
        renderHTML: (attributes) => ({
          src: safeArticleUrl(String(attributes.src || ""), true) || undefined,
        }),
      },
    };
  },
});
export const articleEditorExtensions = [
  StarterKit.configure({
    underline: false,
    trailingNode: false,
    link: {
      openOnClick: false,
      isAllowedUri: (url) => !!safeArticleUrl(url),
      HTMLAttributes: { rel: "noopener noreferrer" },
    },
  }),
  SafeImage.configure({ allowBase64: false }),
  TableKit.configure({
    table: { resizable: false },
    tableCell: false,
    tableHeader: false,
  }),
  // Markdown 表格只能表示每格一个段落，从编辑时限制结构以免保存丢失内容。
  TableCell.extend({ content: "paragraph" }),
  TableHeader.extend({ content: "paragraph" }),
  TaskList,
  TaskItem.configure({
    nested: true,
    a11y: { checkboxLabel: (node) => `任务：${node.textContent || "未填写"}` },
  }),
  Markdown,
];
