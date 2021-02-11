export type RegisterReq = {
  username: string;
  password: string;
  security_question: string;
  security_answer: string;
};

export type LoginReq = {
  username: string;
  password: string;
};

export type Hash = {
  hash: string;
  salt: string;
};
