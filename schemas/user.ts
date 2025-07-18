import { Document, Schema, model } from 'mongoose';

export interface IUser extends Document {
  role: string;
  email: string;
  password: string;
  fullname: string;
  internal_id: string
}

const userSchema = new Schema<IUser>({
  role: {
    type: String,
    // enum: ['admin', 'user'],
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullname: {
    type: String,
    required: true
  }, 
  internal_id: {
    type: String,
    required: true
  }
});

const User = model<IUser>('User', userSchema);

export default User;
