export interface IRegisterUser {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface ILoginUser {
  email: string;
  password: string;
}

export interface IGoogleLogin {
  idToken?: string;
  googleId?: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export interface IAppleLogin {
  identityToken?: string;
  appleId: string;
  email?: string;
  name?: string;
}

export interface IForgotPassword {
  email: string;
}

export interface IResetPassword {
  email: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface IChangePassword {
  oldPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface IRefreshToken {
  token: string;
}

