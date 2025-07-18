export interface RequestOptions {
    timeout?: number;
    headers?: Record<string, string>;
    params?: Record<string, | string | undefined>;
}