"use server";

import { actionClient } from "@/lib/action-client";
import { loginSchema, registerSchema } from "@/schema/user";

export const createUser = actionClient.schema(registerSchema).action(async ({ parsedInput }) => {
  console.log("parsedInput[createUser] ====>", parsedInput);
  // return Promise.reject(new Error("Something went wrong"));
  // return { success: true };
  // TODO: check current user exists
  // TODO: create user
  // TODO: return user and token
});

export const loginUser = actionClient.schema(loginSchema).action(async ({ parsedInput }) => {
  console.log("parsedInput[loginUser] ====>", parsedInput);
  // TODO:
  // check user exists
  // check password
  // return user and token
  // return Promise.reject(new Error("Something went wrong"));
  // return { success: true };
});
