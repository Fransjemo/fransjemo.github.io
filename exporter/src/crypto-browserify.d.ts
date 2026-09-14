declare module "crypto-browserify" {
  const cryptoBrowserify: {
    randomBytes: (size: number, callback?: (err: Error | null, buf: Uint8Array) => void) => Uint8Array;
    [key: string]: unknown;
  };
  export default cryptoBrowserify;
}
