import { z } from "zod";

export const initialAdminSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "用户名至少 3 位")
      .max(24, "用户名最多 24 位")
      .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
    displayName: z
      .string()
      .trim()
      .min(2, "昵称至少 2 位")
      .max(20, "昵称最多 20 位"),
    password: z
      .string()
      .min(8, "密码至少 8 位")
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "密码最多 72 字节",
      )
      .refine((value) => value.trim() === value, "密码首尾不能有空白"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export type InitialAdminInput = z.infer<typeof initialAdminSchema>;
