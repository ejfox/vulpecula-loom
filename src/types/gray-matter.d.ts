declare module "gray-matter" {
  interface GrayMatterFile<T = any> {
    data: T;
    content: string;
    excerpt?: string;
    orig: string;
    language?: string;
    matter?: string;
    stringify(): string;
  }

  interface Options {
    excerpt?: boolean | ((input: string) => string);
    excerpt_separator?: string;
    engines?: Record<string, any>;
    language?: string;
    delimiters?: string | [string, string];
  }

  function matter<T = any>(
    input: string | Buffer,
    options?: Options
  ): GrayMatterFile<T>;

  export = matter;
}
