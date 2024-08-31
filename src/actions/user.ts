"use server";

export const createUser = async (name: string) => {
  return {
    name,
  };
};

export const loginUser = async (data: { email: string; password: string }) => {
  return data;
};
