// Denied and missing resources look identical to callers so IDs cannot be probed.
export class NotFoundOrDenied extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundOrDenied";
  }
}

export class InvalidRequest extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequest";
  }
}

export function deny(): never {
  throw new NotFoundOrDenied();
}
