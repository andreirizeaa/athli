declare module 'color' {
  interface ColorInstance {
    alpha(value: number): ColorInstance;
    hex(): string;
    rgb(): ColorInstance;
    string(): string;
  }

  function Color(color: string): ColorInstance;
  export default Color;
}
