export type Options = {
  [key: string]: string;
};

export class YourAction {
  constructor(private options: Options) {}
  doSomething() {
    console.log("do something with the options", this.options);
  }
}
