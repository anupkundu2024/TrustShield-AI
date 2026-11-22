export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'user';
  createdAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  fullName: string;
}
