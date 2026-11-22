import { Schema, type Connection, type HydratedDocument } from 'mongoose';

interface User {
  fullName: string;
  email: string;
  passwordHash: string;
  role: 'user';
  createdAt: Date;
  updatedAt: Date;
}

function removeCredential(_document: unknown, raw: Record<string, unknown>) {
  delete raw.passwordHash;
  return raw;
}

const schema = new Schema<User>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxLength: 254,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
      maxLength: 512,
      select: false,
    },
    role: { type: String, enum: ['user'], required: true, default: 'user' },
  },
  {
    timestamps: true,
    bufferCommands: false,
    autoIndex: false,
    toJSON: { transform: removeCredential },
    toObject: { transform: removeCredential },
  },
);

export function createUserModel(connection: Connection) {
  return connection.model<User>('User', schema);
}

export function publicUser(user: HydratedDocument<User>) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
