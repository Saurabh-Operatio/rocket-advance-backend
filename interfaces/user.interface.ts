export interface UserLogin {
    email: string;
    password: string;
    role: string;
}

export interface UserRegister extends UserLogin {
    role: string;
    fullname : string;
}