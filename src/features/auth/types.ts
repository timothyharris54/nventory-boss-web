export type AuthIdentity = {
  userId: string;
  accountId: string;
  email: string;
};

export type LoginResponse = {
  accessToken: string;
  identity: AuthIdentity;
};

export type LoginRequest = {
  email: string;
  password: string;
};