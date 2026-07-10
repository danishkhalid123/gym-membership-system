import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

export const generateToken = (email: string): string => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }

    const options: any = {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as SignOptions['expiresIn'],
    };

    const token = jwt.sign({ email }, secret, options);
    return token;
};