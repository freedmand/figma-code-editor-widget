interface Token {
  i: number;
  x: number;
  y: number;
  text: string;
  style: Style;
}

interface Style {
  color: string;
  weight: string;
}

interface Message {
  type: "text";
  width: number;
  height: number;
  text: string;
  tokens: Token[];
  language: string;
}
